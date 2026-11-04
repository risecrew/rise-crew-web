-- Operators and admins see only finished sign-ups.
--
-- An account exists from its first sign-in, but the person has agreed to
-- nothing until they finish the sign-up form (onboarded_at is set only with
-- the privacy and age14 consents recorded, see private.guard_onboarding). Until
-- then the staff have no reason to read what the account holds, so:
--
-- - profiles: everyone still reads their own row (the sign-up form needs it),
--   and operators and admins read the rows of finished accounts only. The
--   previous policy let them read every row.
-- - member_list: lists finished accounts only. The view already follows the
--   profiles policy (security_invoker), so this is a second lock: the members
--   screen never shows an unfinished account, not even to the account itself.
--
-- Unfinished accounts are deleted after 7 days (the next migration).
--
-- Written so that running it twice gives the same result.

-- ---------------------------------------------------------------------------
-- profiles: read policy
-- ---------------------------------------------------------------------------

drop policy if exists profiles_select_own_or_operator on public.profiles;
drop policy if exists profiles_select_own_or_finished_for_operator on public.profiles;

create policy profiles_select_own_or_finished_for_operator on public.profiles
  for select
  to authenticated
  using (
    (select auth.uid()) = id
    or (onboarded_at is not null and (select private.is_at_least('operator')))
  );

comment on policy profiles_select_own_or_finished_for_operator on public.profiles is
  'Own row always; operators and admins (not blocked) also read finished sign-ups.';

-- ---------------------------------------------------------------------------
-- member_list: finished accounts only
-- ---------------------------------------------------------------------------

-- Same columns, in the same order, as 20261028093000_member_list.sql, so the
-- view is replaced in place and keeps its grants (authenticated: select).
create or replace view public.member_list
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
  -- English, in both orders, then the email.
  lower(concat_ws(' ',
    nullif(coalesce(p.last_name, '') || coalesce(p.first_name, ''), ''),
    nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''),
    nullif(trim(coalesce(p.last_name, '') || ' ' || coalesce(p.first_name, '')), ''),
    p.email
  )) as search_text
from public.profiles as p
join public.user_roles as r on r.user_id = p.id
where p.onboarded_at is not null;

comment on view public.member_list is
  'Profile and role of every finished sign-up, for the members screen. Visible rows also follow the RLS of profiles and user_roles.';
