-- Accounts: profiles, roles and consents, the sign-up trigger, the role
-- helpers that RLS uses, and the custom access token hook.
--
-- Authorization model
-- - Roles live in public.user_roles. Signed-in users can only read it; writes
--   go through the server's secret key (service_role).
-- - RLS reads user_roles through private.is_at_least(), not the JWT, so
--   blocking and demotion take effect on the next query instead of when the
--   access token expires (up to an hour later).
-- - The token hook copies the role into the token as `app_role` and `blocked`
--   for display only. Never authorize on those claims.
-- - Nothing here reads user_metadata.
-- - New tables are not exposed to the Data API automatically. Every grant
--   below is deliberate; anon gets nothing.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

-- Declaration order is the rank order: private.is_at_least compares them.
create type public.app_role as enum ('guest', 'member', 'operator', 'admin');
comment on type public.app_role is
  'Account role, lowest first. Everyone starts as guest.';

create type public.occupation as enum ('undergrad', 'grad', 'alumni', 'founder', 'other');

-- ---------------------------------------------------------------------------
-- Private schema for helpers (not exposed to the Data API)
-- ---------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  last_name text,
  first_name text,
  occupation public.occupation,
  school text,
  major text,
  affiliation text,
  recruit_opt_in boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_last_name_length check (char_length(last_name) <= 50),
  constraint profiles_first_name_length check (char_length(first_name) <= 50),
  constraint profiles_school_length check (char_length(school) <= 100),
  constraint profiles_major_length check (char_length(major) <= 100),
  constraint profiles_affiliation_length check (char_length(affiliation) <= 100),
  -- Once the sign-up form is done, names and occupation are filled in, and
  -- students also give school and major. '\S' means "has a non-space
  -- character", so blank strings do not count.
  constraint profiles_onboarded_complete check (
    onboarded_at is null
    or (
      coalesce(last_name ~ '\S', false)
      and coalesce(first_name ~ '\S', false)
      and occupation is not null
      and (
        occupation not in ('undergrad', 'grad')
        or (coalesce(school ~ '\S', false) and coalesce(major ~ '\S', false))
      )
    )
  )
);
comment on table public.profiles is
  'One row per account, created by the sign-up trigger. Email comes from the auth account.';

create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'guest',
  blocked_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
comment on table public.user_roles is
  'Role and block state per account. Written only with the secret key.';

create index user_roles_role_idx on public.user_roles (role);

create table public.consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('privacy', 'age14', 'recruit')),
  granted boolean not null,
  policy_version text not null check (char_length(policy_version) between 1 and 32),
  created_at timestamptz not null default now()
);
comment on table public.consents is
  'Consent log: what was agreed to, under which policy version, and when.';

create index consents_user_id_idx on public.consents (user_id);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function private.set_updated_at() from public, anon, authenticated, service_role;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create trigger user_roles_set_updated_at
  before update on public.user_roles
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Sign-up: every new auth user gets a profile and a guest role
-- ---------------------------------------------------------------------------

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''));

  insert into public.user_roles (user_id)
  values (new.id);

  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated, service_role;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Accounts that existed before this migration.
insert into public.profiles (id, email)
select u.id, coalesce(u.email, '')
from auth.users as u
on conflict (id) do nothing;

insert into public.user_roles (user_id)
select u.id
from auth.users as u
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Role helpers for RLS
-- ---------------------------------------------------------------------------

-- Current role of an account, or null when the account is blocked or has no
-- role row. Not callable by API roles: it would reveal other people's roles.
create function private.app_role_of(uid uuid)
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select ur.role
  from public.user_roles as ur
  where ur.user_id = app_role_of.uid
    and ur.blocked_at is null;
$$;

-- Whether the signed-in user (auth.uid()) currently holds at least `min`.
-- False when signed out, blocked, or below `min`.
create function private.is_at_least(min public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.app_role_of((select auth.uid())) >= is_at_least.min, false);
$$;

revoke execute on function private.app_role_of(uuid) from public, anon, authenticated, service_role;
revoke execute on function private.is_at_least(public.app_role) from public, anon, authenticated, service_role;
-- Policies run as the signed-in user, so authenticated needs this one.
grant execute on function private.is_at_least(public.app_role) to authenticated;

-- ---------------------------------------------------------------------------
-- Grants (tables are not auto-exposed; anon gets nothing)
-- ---------------------------------------------------------------------------

revoke all on table public.profiles, public.user_roles, public.consents
  from public, anon, authenticated, service_role;
revoke all on sequence public.consents_id_seq
  from public, anon, authenticated, service_role;

-- Signed-in users: read (rows limited by RLS), edit their own form fields,
-- record their own consents. id, email, created_at and updated_at are not
-- writable.
grant select on table public.profiles to authenticated;
grant update (
  last_name, first_name, occupation, school, major, affiliation, recruit_opt_in, onboarded_at
) on table public.profiles to authenticated;
grant select on table public.user_roles to authenticated;
grant select on table public.consents to authenticated;
grant insert (user_id, kind, granted, policy_version) on table public.consents to authenticated;

-- The server's secret key: read for member management and checks, and the
-- only writer of roles and block state.
grant select on table public.profiles to service_role;
grant select, update on table public.user_roles to service_role;
grant select on table public.consents to service_role;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.consents enable row level security;

create policy profiles_select_own_or_operator on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id or (select private.is_at_least('operator')));

create policy profiles_update_own on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy user_roles_select_own_or_operator on public.user_roles
  for select
  to authenticated
  using ((select auth.uid()) = user_id or (select private.is_at_least('operator')));

create policy consents_select_own on public.consents
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy consents_insert_own on public.consents
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Custom access token hook
-- ---------------------------------------------------------------------------

-- Adds `app_role` (text) and `blocked` (boolean) to every access token, for
-- display (for example the header menu). Authorization reads user_roles.
-- Runs as supabase_auth_admin (security invoker), which may only read
-- user_roles.
create function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  claims jsonb;
  user_role public.app_role;
  user_blocked_at timestamptz;
begin
  select ur.role, ur.blocked_at
    into user_role, user_blocked_at
    from public.user_roles as ur
   where ur.user_id = (event ->> 'user_id')::uuid;

  claims := coalesce(event -> 'claims', '{}'::jsonb);
  claims := jsonb_set(claims, '{app_role}', to_jsonb(coalesce(user_role, 'guest')::text));
  claims := jsonb_set(claims, '{blocked}', to_jsonb(user_blocked_at is not null));

  return jsonb_set(event, '{claims}', claims);
end;
$$;

revoke execute on function public.custom_access_token_hook(jsonb)
  from public, anon, authenticated, service_role;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;

grant select on table public.user_roles to supabase_auth_admin;

create policy user_roles_select_auth_admin on public.user_roles
  for select
  to supabase_auth_admin
  using (true);
