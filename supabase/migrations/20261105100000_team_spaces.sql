-- Team spaces: teams, the people in them, and the posts they write.
--
-- Authorization model
-- - The table in section 4 of docs/superpowers/specs/2026-11-05-phase2-team-spaces-design.md
--   is written out here as grants, policies and guard triggers, so a direct
--   Data API call gets the same answers as the site. The site never uses the
--   secret key for these tables, and the secret key has no grants on them.
-- - Like the accounts tables, permission comes from user_roles and
--   team_members on every statement, so demoting, blocking or removing someone
--   takes effect on their next request, not when their token expires.
-- - This is the first time anon can read anything: published teams, and the
--   public posts that are not hidden on those teams. Nothing that identifies a
--   person is in either: who wrote a post (author_id) is not readable by anon
--   or by signed-in accounts, and team_members stays closed to anon.
-- - Grants cannot tell a team member from an operator, because both are the
--   authenticated role, so the guard triggers split the columns between them.
--   Columns nobody may change from the API (ids, author_id, team_id, edited_at,
--   the timestamps) simply have no update grant. author_id must stay out of the
--   guards: deleting an account sets it to null through the foreign key.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.team_post_visibility as enum ('public', 'signed_in');
comment on type public.team_post_visibility is
  'Who can read a post: public is everyone, signed_in is accounts that finished signing up.';

-- ---------------------------------------------------------------------------
-- Checks used by constraints (immutable, and they read no table)
-- ---------------------------------------------------------------------------

-- A list of at most 5 links, each exactly a known kind and an http(s) address.
-- The address check is what keeps a javascript: link out of the team page.
create function private.valid_team_links(links jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(links) is distinct from 'array' then false
    when jsonb_array_length(links) > 5 then false
    else not exists (
      select 1
      from jsonb_array_elements(links) as link
      where jsonb_typeof(link) <> 'object'
         or (link - 'kind' - 'url') <> '{}'::jsonb
         or coalesce(link ->> 'kind', '') not in ('homepage', 'instagram', 'linkedin', 'other')
         or coalesce(link ->> 'url', '') !~ '^https?://[^[:space:]]+$'
         or char_length(link ->> 'url') > 500
    )
  end;
$$;

-- Every photo of a post lives under that post's own folder, so a post cannot
-- point at someone else's file, and deleting a post removes only its own files.
create function private.valid_post_photo_paths(team uuid, post uuid, paths text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select not exists (
    select 1
    from unnest(paths) as path
    where path is null
       or path !~ ('^' || team::text || '/' || post::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$')
  );
$$;

-- A constraint's function runs with the rights of whoever writes the row.
revoke execute on function private.valid_team_links(jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function private.valid_post_photo_paths(uuid, uuid, text[])
  from public, anon, authenticated, service_role;
grant execute on function private.valid_team_links(jsonb) to authenticated;
grant execute on function private.valid_post_photo_paths(uuid, uuid, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  field text not null,
  cohort integer not null,
  tagline text not null default '',
  intro text not null default '',
  logo_path text,
  links jsonb not null default '[]'::jsonb,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  constraint teams_name_length check (name ~ '\S' and char_length(name) <= 50),
  constraint teams_field_format check (field ~ '^[a-z0-9-]+$' and char_length(field) <= 40),
  constraint teams_cohort_positive check (cohort >= 1),
  constraint teams_tagline_length check (char_length(tagline) <= 80),
  constraint teams_intro_length check (char_length(intro) <= 2000),
  -- The logo lives in this team's own folder (team-logos, see the storage migration).
  constraint teams_logo_path_format
    check (logo_path ~ ('^' || id::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$')),
  constraint teams_links_valid check (private.valid_team_links(links))
);
comment on table public.teams is
  'A startup team. Operators create it unpublished; team members write the intro.';

create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
comment on table public.team_members is
  'Who is in which team. All members of a team have the same rights. Never shown on a public page.';

create index team_members_user_id_idx on public.team_members (user_id);

create table public.team_posts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  title text not null,
  body text not null default '',
  visibility public.team_post_visibility not null default 'public',
  photo_paths text[] not null default '{}',
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  constraint team_posts_title_length check (title ~ '\S' and char_length(title) <= 100),
  constraint team_posts_body_length check (char_length(body) <= 5000),
  constraint team_posts_photo_count check (cardinality(photo_paths) <= 4),
  constraint team_posts_photo_paths_valid
    check (private.valid_post_photo_paths(team_id, id, photo_paths))
);
comment on table public.team_posts is
  'A post on a team page. Shown under the team name; author_id is a record, not for display.';

create index team_posts_team_created_idx on public.team_posts (team_id, created_at desc);
-- Deleting an account looks up its posts to clear author_id.
create index team_posts_author_id_idx on public.team_posts (author_id) where author_id is not null;

-- ---------------------------------------------------------------------------
-- Helpers for policies
-- ---------------------------------------------------------------------------

-- Whether the signed-in user is in the team and currently at least a member.
-- A blocked or demoted account is not, even with a team_members row.
create function private.is_team_member(team uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_at_least('member')
     and exists (
       select 1
       from public.team_members as tm
       where tm.team_id = is_team_member.team
         and tm.user_id = (select auth.uid())
     );
$$;

-- Whether the signed-in user finished signing up and is not blocked.
create function private.is_onboarded()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.app_role_of((select auth.uid())) is not null
     and exists (
       select 1
       from public.profiles as p
       where p.id = (select auth.uid())
         and p.onboarded_at is not null
     );
$$;

revoke execute on function private.is_team_member(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function private.is_onboarded()
  from public, anon, authenticated, service_role;
grant execute on function private.is_team_member(uuid) to authenticated;
grant execute on function private.is_onboarded() to authenticated;

-- How many signed_in posts a published team has, so a signed-out visitor can
-- be told there is more to read. A number and nothing else: it runs with the
-- owner's rights only to count rows the caller cannot see.
create function public.team_signed_in_post_count(team uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.team_posts as p
  join public.teams as t on t.id = p.team_id
  where t.id = team_signed_in_post_count.team
    and t.is_published
    and p.hidden_at is null
    and p.visibility = 'signed_in';
$$;

revoke execute on function public.team_signed_in_post_count(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.team_signed_in_post_count(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Guards: what grants and policies cannot tell apart
-- ---------------------------------------------------------------------------

-- Team members write the intro. The name, the address, the field, the cohort
-- and publishing are the operators' to decide.
create function private.guard_team_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_at_least('operator')
     and (new.slug, new.name, new.field, new.cohort, new.is_published)
         is distinct from (old.slug, old.name, old.field, old.cohort, old.is_published) then
    raise exception 'only operators can change the name, address, field, cohort or publishing of a team'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Operators hide and bring back posts. The words belong to the team: an
-- operator who wants to write joins the team first.
create function private.guard_team_post_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.hidden_at is distinct from old.hidden_at
     and not private.is_at_least('operator') then
    raise exception 'only operators can hide a post'
      using errcode = '42501';
  end if;
  if (new.title, new.body, new.visibility, new.photo_paths)
     is distinct from (old.title, old.body, old.visibility, old.photo_paths)
     and not private.is_team_member(old.team_id) then
    raise exception 'only team members can change a post'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Writing starts at member (spec section 4), and a blocked account is no
-- member. The message is what the admin screen recognizes. A trigger runs
-- before row level security, so anyone but an operator is turned away first:
-- otherwise the two different refusals would tell them someone's role.
create function private.guard_team_member_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not private.is_at_least('operator') then
    raise exception 'only operators can add team members'
      using errcode = '42501';
  end if;
  if coalesce(private.app_role_of(new.user_id) < 'member', true) then
    raise exception 'team members must be at least member'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- The edited time shows when the words changed, not when the post was hidden
-- or its visibility changed.
create function private.set_post_edited_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.title, new.body) is distinct from (old.title, old.body) then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

revoke execute on function private.guard_team_update()
  from public, anon, authenticated, service_role;
revoke execute on function private.guard_team_post_update()
  from public, anon, authenticated, service_role;
revoke execute on function private.guard_team_member_insert()
  from public, anon, authenticated, service_role;
revoke execute on function private.set_post_edited_at()
  from public, anon, authenticated, service_role;

create trigger teams_guard_update
  before update on public.teams
  for each row execute function private.guard_team_update();

create trigger teams_set_updated_at
  before update on public.teams
  for each row execute function private.set_updated_at();

create trigger team_members_guard_insert
  before insert on public.team_members
  for each row execute function private.guard_team_member_insert();

create trigger team_posts_guard_update
  before update on public.team_posts
  for each row execute function private.guard_team_post_update();

create trigger team_posts_set_edited_at
  before update on public.team_posts
  for each row execute function private.set_post_edited_at();

create trigger team_posts_set_updated_at
  before update on public.team_posts
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Grants (the local stack hands out defaults to new tables: take them all back)
-- ---------------------------------------------------------------------------

revoke all on table public.teams, public.team_members, public.team_posts
  from public, anon, authenticated, service_role;

grant select on table public.teams to anon, authenticated;
grant insert (slug, name, field, cohort, tagline, intro, logo_path, links, is_published)
  on table public.teams to authenticated;
grant update (slug, name, field, cohort, tagline, intro, logo_path, links, is_published)
  on table public.teams to authenticated;

grant select on table public.team_members to authenticated;
grant insert (team_id, user_id), delete on table public.team_members to authenticated;

-- author_id is not in the select grant: who wrote a post is a record, not
-- something the site or the Data API shows.
grant select (id, team_id, title, body, visibility, photo_paths, hidden_at, created_at, updated_at, edited_at)
  on table public.team_posts to anon, authenticated;
grant insert (id, team_id, author_id, title, body, visibility, photo_paths)
  on table public.team_posts to authenticated;
grant update (title, body, visibility, photo_paths, hidden_at)
  on table public.team_posts to authenticated;
grant delete on table public.team_posts to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_posts enable row level security;

create policy teams_select_published on public.teams
  for select
  to anon
  using (is_published);

create policy teams_select_visible on public.teams
  for select
  to authenticated
  using (
    is_published
    or private.is_team_member(id)
    or (select private.is_at_least('operator'))
  );

create policy teams_insert_operator on public.teams
  for insert
  to authenticated
  with check ((select private.is_at_least('operator')));

create policy teams_update_member_or_operator on public.teams
  for update
  to authenticated
  using (private.is_team_member(id) or (select private.is_at_least('operator')))
  with check (private.is_team_member(id) or (select private.is_at_least('operator')));

create policy team_members_select_own_or_operator on public.team_members
  for select
  to authenticated
  using ((select auth.uid()) = user_id or (select private.is_at_least('operator')));

create policy team_members_insert_operator on public.team_members
  for insert
  to authenticated
  with check ((select private.is_at_least('operator')));

create policy team_members_delete_operator on public.team_members
  for delete
  to authenticated
  using ((select private.is_at_least('operator')));

-- The team's own check reads public.teams through its policies, so a post of an
-- unpublished team stays out of sight here without saying so twice.
create policy team_posts_select_public on public.team_posts
  for select
  to anon
  using (
    visibility = 'public'
    and hidden_at is null
    and exists (
      select 1 from public.teams as t
      where t.id = team_id and t.is_published
    )
  );

create policy team_posts_select_visible on public.team_posts
  for select
  to authenticated
  using (
    private.is_team_member(team_id)
    or (select private.is_at_least('operator'))
    or (
      hidden_at is null
      and exists (
        select 1 from public.teams as t
        where t.id = team_id and t.is_published
      )
      and (visibility = 'public' or (select private.is_onboarded()))
    )
  );

create policy team_posts_insert_member on public.team_posts
  for insert
  to authenticated
  with check (
    private.is_team_member(team_id)
    and author_id = (select auth.uid())
    and hidden_at is null
  );

create policy team_posts_update_member_or_operator on public.team_posts
  for update
  to authenticated
  using (private.is_team_member(team_id) or (select private.is_at_least('operator')))
  with check (private.is_team_member(team_id) or (select private.is_at_least('operator')));

create policy team_posts_delete_member_or_operator on public.team_posts
  for delete
  to authenticated
  using (private.is_team_member(team_id) or (select private.is_at_least('operator')));
