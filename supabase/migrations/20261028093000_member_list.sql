-- The member list: what the members screen (operators and admins) reads. One
-- row per account with its profile and its role together, so the screen can
-- search, filter by role and page through the list in the database instead of
-- joining two tables in the server.
--
-- Authorization
-- - security_invoker makes the view read the tables as whoever asks, so the
--   row level security of profiles and user_roles decides what they see: an
--   operator or an admin sees everyone, everyone else sees only their own
--   row, a blocked account sees only its own row, anon sees nothing. Without
--   it a view reads with its owner's rights and shows every profile to every
--   signed-in user. The pgTAP tests pin this.
-- - Read only: signed-in users can select from it and nothing else. It has
--   no grants for anon or for the secret key (the server reads and writes
--   user_roles directly when it changes a role).
-- - Nothing in it is new data: every column is one that profiles or
--   user_roles already show to the same people.

create view public.member_list
with (security_invoker = true)
as
select
  p.id,
  p.email,
  p.last_name,
  p.first_name,
  p.occupation,
  p.school,
  p.major,
  p.affiliation,
  p.recruit_opt_in,
  p.onboarded_at,
  p.created_at,
  r.role,
  r.blocked_at,
  -- What the search box looks through, in lower case: the name as it is
  -- written in Korean (family name first, no space), then as it is written in
  -- English, in both orders, then the email. An account that has not given a
  -- name yet is found by its email alone.
  lower(concat_ws(' ',
    nullif(coalesce(p.last_name, '') || coalesce(p.first_name, ''), ''),
    nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''),
    nullif(trim(coalesce(p.last_name, '') || ' ' || coalesce(p.first_name, '')), ''),
    p.email
  )) as search_text
from public.profiles as p
join public.user_roles as r on r.user_id = p.id;

comment on view public.member_list is
  'Profile and role of every account, for the members screen. Visible rows follow the RLS of profiles and user_roles.';

-- Tables are not exposed to the Data API automatically, and neither are
-- views: grant on purpose. (The local stack still hands out default grants to
-- new objects, so take them all back first.)
revoke all on table public.member_list from public, anon, authenticated, service_role;
grant select on table public.member_list to authenticated;
