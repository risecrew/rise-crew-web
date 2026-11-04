-- Unfinished sign-ups are deleted 7 days after the account was made.
--
-- Signing in makes an account (Auth stores the email, and for Google the basic
-- profile Google shares). The person agrees to the privacy policy only when
-- they finish the sign-up form, which sets profiles.onboarded_at. An account
-- that never gets that far holds data nobody consented to keep, so a daily job
-- deletes it once it is 7 days old. Deleting the Auth account takes its
-- profile, role and consent rows with it (on delete cascade), and its
-- identities and sessions in the auth schema.
--
-- 7 days is a draft value for the operators and the ANCHOR Division to confirm
-- together with the privacy policy, which states it.
--
-- Written so that running it twice gives the same result: the extension is
-- created only if missing, the function is replaced, and cron.schedule with a
-- job name replaces the job of that name instead of adding a second one.

-- ---------------------------------------------------------------------------
-- pg_cron (as Supabase documents it: https://supabase.com/docs/guides/cron/install)
-- ---------------------------------------------------------------------------

-- Supabase's install page also runs `grant usage on schema cron to postgres`
-- and `grant all privileges on all tables in schema cron to postgres`. They
-- are left out on purpose: creating the extension already gives postgres those
-- rights (with grant option, from supabase_admin), so run as postgres the two
-- grants only add postgres-to-postgres copies, and those copies make the
-- extension's own setup fail ("dependent privileges exist") the next time
-- `create extension if not exists pg_cron` runs. The cron.schedule call below
-- fails loudly if postgres ever lacks the rights.
create extension if not exists pg_cron with schema pg_catalog;

-- ---------------------------------------------------------------------------
-- The clean-up
-- ---------------------------------------------------------------------------

-- Deletes every Auth account whose profile has no finished sign-up and that
-- was made more than 7 days ago, and returns how many it deleted. Runs with
-- its owner's rights (postgres), because nobody else may delete Auth accounts;
-- no API role can call it, only the job below.
create or replace function private.delete_unfinished_signups()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted integer;
begin
  delete from auth.users as u
   using public.profiles as p
   where p.id = u.id
     and p.onboarded_at is null
     and u.created_at < now() - interval '7 days';
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;

comment on function private.delete_unfinished_signups() is
  'Deletes accounts that never finished sign-up, 7 days after they were made. Run daily by pg_cron (job delete-unfinished-signups).';

revoke execute on function private.delete_unfinished_signups()
  from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- The daily job: 18:00 UTC, which is 03:00 in Korea
-- ---------------------------------------------------------------------------

select cron.schedule(
  'delete-unfinished-signups',
  '0 18 * * *',
  'select private.delete_unfinished_signups()'
);
