-- Signing up is an application: an account starts as an applicant, and an operator approves it to
-- guest (the club's "가입자"). Decided at the club's meeting, 2026-11-06.
--
-- - An applicant can sign in, but reads only what a signed-out visitor can.
-- - Accounts that already finished signing up stay as they are; they count as approved.
-- - Notices are now for approved accounts only, including the files attached to them. notice-files
--   stops being public, so a file opens only through a short-lived signed URL, which Storage issues
--   only to someone this policy lets read the file.

alter table public.user_roles alter column role set default 'applicant';

comment on type public.app_role is
  'Account role, lowest first. Everyone starts as applicant until an operator approves them.';

-- Sign-ups nobody has finished have not applied yet either.
update public.user_roles as r
   set role = 'applicant'
  from public.profiles as p
 where p.id = r.user_id
   and p.onboarded_at is null
   and r.role = 'guest';

-- Whether the signed-in user finished signing up, was approved and is not blocked. This is what
-- team posts for signed-in readers ask, and their photos follow them.
create or replace function private.is_onboarded()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_at_least('guest')
     and exists (
       select 1
       from public.profiles as p
       where p.id = (select auth.uid())
         and p.onboarded_at is not null
     );
$$;

drop policy notices_select_everyone on public.notices;
revoke select on table public.notices from anon;

create policy notices_select_approved on public.notices
  for select to authenticated
  using ((select private.is_at_least('guest')));

update storage.buckets set public = false where id = 'notice-files';

drop policy notice_files_select_operator on storage.objects;

create policy notice_files_select_approved on storage.objects
  for select to authenticated
  using (bucket_id = 'notice-files' and (select private.is_at_least('guest')));
