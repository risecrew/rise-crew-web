-- Three gaps in accounts, closed in the database now that sign-up is open (2026-11-11).
--
-- 1. A blocked account could still edit its own profile and add consent rows until its token ran
--    out: those two policies only asked whose row it was. They now also ask that the account is not
--    blocked, as every other write does (private.is_at_least is false for a blocked account).
--
-- 2. "Never leave the site without an admin" was kept only by the site, which reads the admins and
--    then writes. Two admins stepping down at the same moment could each see the other still there.
--    The database now refuses any change that leaves no admin who can sign in, and takes a lock first
--    so two such changes are counted one after the other.
--
-- 3. The site offers no way to change an account's email address, but Auth's own API does: a
--    confirmed account could ask to move to someone else's address, and if that person followed the
--    confirmation mail, the account (with its old password) would be theirs to sign in to under their
--    address. Requests to change the address are refused here. An admin who must fix an address does
--    it in the dashboard, which writes the address directly.

-- 1 ------------------------------------------------------------------------------------------------

drop policy profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id and (select private.is_at_least('applicant')))
  with check ((select auth.uid()) = id and (select private.is_at_least('applicant')));

drop policy consents_insert_own on public.consents;
create policy consents_insert_own on public.consents
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id and (select private.is_at_least('applicant')));

-- 2 ------------------------------------------------------------------------------------------------

create function private.keep_an_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- One change at a time past this point, so each one counts what the other left.
  perform pg_advisory_xact_lock(hashtext('rise-crew:last-admin'));
  if not exists (
    select 1 from public.user_roles where role = 'admin' and blocked_at is null
  ) then
    raise exception 'the site must keep an admin who can sign in'
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

comment on function private.keep_an_admin() is
  'Refuses a change to user_roles that leaves no admin who is not blocked.';

revoke execute on function private.keep_an_admin()
  from public, anon, authenticated, service_role;

-- Only a change to someone who was an admin able to sign in can leave none.
create trigger user_roles_keep_an_admin
  after update of role, blocked_at or delete on public.user_roles
  for each row
  when (old.role = 'admin' and old.blocked_at is null)
  execute function private.keep_an_admin();

-- 3 ------------------------------------------------------------------------------------------------

create function private.refuse_email_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'changing the email address is not offered'
    using errcode = 'insufficient_privilege';
end;
$$;

comment on function private.refuse_email_change() is
  'Refuses a request to move an account to another email address.';

revoke execute on function private.refuse_email_change()
  from public, anon, authenticated, service_role;

-- Auth records a request to change the address in email_change and clears it once done; only a new,
-- non-empty request is refused.
create trigger on_auth_user_email_change_requested
  before update of email_change on auth.users
  for each row
  when (
    new.email_change is distinct from old.email_change
    and coalesce(new.email_change, '') <> ''
  )
  execute function private.refuse_email_change();
