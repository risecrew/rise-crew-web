-- pgTAP tests for accounts that signed in but never finished the sign-up form
-- (no onboarded_at): operators and admins do not see them, the member list
-- leaves them out, and a daily job deletes them 7 days after they were made.
-- Run with `pnpm db:test` against the local stack. Everything rolls back.
--
-- Fake accounts only (example.test). The ids do not collide with seed.sql.
--   fresh     7e590000-0000-4000-8000-000000000001  unfinished, made just now
--   stale     7e590000-0000-4000-8000-000000000002  unfinished, made 8 days ago
--   finished  7e590000-0000-4000-8000-000000000003  finished, made 30 days ago
--   operator  7e590000-0000-4000-8000-000000000004  finished operator, made 30 days ago
--   admin     7e590000-0000-4000-8000-000000000005  finished admin
--   almost    7e590000-0000-4000-8000-000000000006  unfinished, made 6 days 23 hours ago

begin;

create extension if not exists pgtap with schema extensions;

select plan(31);

-- ---------------------------------------------------------------------------
-- Setup (as postgres)
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, created_at) values
  ('7e590000-0000-4000-8000-000000000001', 'pgtap-fresh@example.test', now()),
  ('7e590000-0000-4000-8000-000000000002', 'pgtap-stale@example.test', now() - interval '8 days'),
  ('7e590000-0000-4000-8000-000000000003', 'pgtap-finished@example.test', now() - interval '30 days'),
  ('7e590000-0000-4000-8000-000000000004', 'pgtap-operator@example.test', now() - interval '30 days'),
  ('7e590000-0000-4000-8000-000000000005', 'pgtap-admin@example.test', now()),
  ('7e590000-0000-4000-8000-000000000006', 'pgtap-almost@example.test', now() - interval '6 days 23 hours');

-- The finished three record their consents and fill in the form, as the
-- sign-up form does. The stale one got as far as one consent row.
insert into public.consents (user_id, kind, granted, policy_version)
select u.id, k.kind, true, 'pgtap'
from (values
  ('7e590000-0000-4000-8000-000000000003'::uuid),
  ('7e590000-0000-4000-8000-000000000004'::uuid),
  ('7e590000-0000-4000-8000-000000000005'::uuid)
) as u (id)
cross join (values ('privacy'), ('age14')) as k (kind);
insert into public.consents (user_id, kind, granted, policy_version) values
  ('7e590000-0000-4000-8000-000000000002', 'privacy', true, 'pgtap');

update public.profiles
   set last_name = '가', first_name = '나', occupation = 'founder', onboarded_at = now()
 where id in ('7e590000-0000-4000-8000-000000000003',
              '7e590000-0000-4000-8000-000000000004',
              '7e590000-0000-4000-8000-000000000005');

update public.user_roles set role = 'operator'
 where user_id = '7e590000-0000-4000-8000-000000000004';
update public.user_roles set role = 'admin'
 where user_id = '7e590000-0000-4000-8000-000000000005';

-- How many finished accounts there are, as postgres sees them (seed rows
-- included).
do $$
begin
  perform set_config('tests.finished_count',
    (select count(*)::text from public.profiles where onboarded_at is not null), true);
end
$$;

-- ---------------------------------------------------------------------------
-- Operators and admins see finished accounts only
-- ---------------------------------------------------------------------------

select policies_are('public', 'profiles',
  array['profiles_select_own_or_finished_for_operator', 'profiles_update_own'],
  'profiles has the narrowed read policy and the update policy, nothing else');

set local role authenticated;
set local request.jwt.claims = '{"sub":"7e590000-0000-4000-8000-000000000004","role":"authenticated","app_role":"operator"}';

select is(
  (select count(*) from public.profiles),
  current_setting('tests.finished_count')::bigint,
  'an operator sees every finished profile'
);
select is_empty(
  'select id from public.profiles where onboarded_at is null',
  'an operator sees no unfinished profile'
);
select is_empty(
  $$select id from public.profiles
     where id in ('7e590000-0000-4000-8000-000000000001',
                  '7e590000-0000-4000-8000-000000000002',
                  '7e590000-0000-4000-8000-000000000006')$$,
  'an operator cannot read an unfinished account by its id either'
);
select is(
  (select count(*) from public.member_list),
  current_setting('tests.finished_count')::bigint,
  'the member list shows an operator every finished account'
);
select is_empty(
  'select id from public.member_list where onboarded_at is null or email is null',
  'the member list has no unfinished account and no row without a profile'
);
select is_empty(
  $$select id from public.member_list where search_text like '%pgtap-fresh%'$$,
  'an unfinished account cannot be found in the list by its email'
);

set local request.jwt.claims = '{"sub":"7e590000-0000-4000-8000-000000000005","role":"authenticated","app_role":"admin"}';

select is(
  (select count(*) from public.profiles),
  current_setting('tests.finished_count')::bigint,
  'an admin sees every finished profile'
);
select is_empty(
  'select id from public.profiles where onboarded_at is null',
  'an admin sees no unfinished profile'
);
select is(
  (select count(*) from public.member_list),
  current_setting('tests.finished_count')::bigint,
  'the member list shows an admin every finished account'
);

set local request.jwt.claims = '{"sub":"7e590000-0000-4000-8000-000000000001","role":"authenticated"}';

select results_eq(
  'select id from public.profiles',
  $$values ('7e590000-0000-4000-8000-000000000001'::uuid)$$,
  'an unfinished account still reads its own profile (the sign-up form needs it)'
);
select is_empty(
  'select id from public.member_list',
  'an unfinished account is not on the member list, not even for itself'
);

set local request.jwt.claims = '{"sub":"7e590000-0000-4000-8000-000000000003","role":"authenticated"}';

select results_eq(
  'select id from public.profiles',
  $$values ('7e590000-0000-4000-8000-000000000003'::uuid)$$,
  'a finished guest still sees only their own profile'
);

reset role;

-- ---------------------------------------------------------------------------
-- The clean-up function
-- ---------------------------------------------------------------------------

select has_function('private', 'delete_unfinished_signups', array[]::text[],
  'the clean-up function exists in the private schema');
select ok(
  (select prosecdef from pg_proc where oid = 'private.delete_unfinished_signups()'::regprocedure),
  'it runs with its owner''s rights (security definer), so it can delete Auth accounts'
);
select is(
  (select proconfig from pg_proc where oid = 'private.delete_unfinished_signups()'::regprocedure),
  array['search_path=""'],
  'it runs with an empty search_path'
);
select ok(
  (select proacl is not null
          and not exists (
            select 1 from aclexplode(proacl) as a
             where a.grantee = 0 and a.privilege_type = 'EXECUTE')
     from pg_proc where oid = 'private.delete_unfinished_signups()'::regprocedure),
  'PUBLIC cannot run it'
);
select is_empty(
  $$select r from unnest(array['anon', 'authenticated', 'service_role']) as r
     where has_function_privilege(r, 'private.delete_unfinished_signups()', 'EXECUTE')$$,
  'anon, authenticated and the secret key cannot run it'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"7e590000-0000-4000-8000-000000000005","role":"authenticated","app_role":"admin"}';
select throws_ok(
  'select private.delete_unfinished_signups()',
  '42501', null,
  'a signed-in admin cannot call it either'
);
reset role;

select ok(
  private.delete_unfinished_signups() >= 1,
  'it says how many accounts it deleted'
);
select is_empty(
  $$select id from auth.users where id = '7e590000-0000-4000-8000-000000000002'$$,
  'an unfinished account older than 7 days is deleted'
);
select is_empty(
  $$select 1 from public.profiles where id = '7e590000-0000-4000-8000-000000000002'
    union all
    select 1 from public.user_roles where user_id = '7e590000-0000-4000-8000-000000000002'
    union all
    select 1 from public.consents where user_id = '7e590000-0000-4000-8000-000000000002'$$,
  'its profile, its role and its consent rows go with it'
);
select results_eq(
  $$select id from auth.users
     where id in ('7e590000-0000-4000-8000-000000000001',
                  '7e590000-0000-4000-8000-000000000006')
     order by id$$,
  $$values ('7e590000-0000-4000-8000-000000000001'::uuid),
           ('7e590000-0000-4000-8000-000000000006'::uuid)$$,
  'unfinished accounts younger than 7 days are kept'
);
select results_eq(
  $$select id from public.profiles
     where id in ('7e590000-0000-4000-8000-000000000001',
                  '7e590000-0000-4000-8000-000000000006')
     order by id$$,
  $$values ('7e590000-0000-4000-8000-000000000001'::uuid),
           ('7e590000-0000-4000-8000-000000000006'::uuid)$$,
  'and so are their profiles'
);
select results_eq(
  $$select id from auth.users
     where id in ('7e590000-0000-4000-8000-000000000003',
                  '7e590000-0000-4000-8000-000000000004',
                  '7e590000-0000-4000-8000-000000000005')
     order by id$$,
  $$values ('7e590000-0000-4000-8000-000000000003'::uuid),
           ('7e590000-0000-4000-8000-000000000004'::uuid),
           ('7e590000-0000-4000-8000-000000000005'::uuid)$$,
  'finished accounts are kept, however old'
);
select is(
  (select count(*) from public.profiles where onboarded_at is not null),
  current_setting('tests.finished_count')::bigint,
  'no finished account was touched'
);
select is(
  private.delete_unfinished_signups(),
  0,
  'run again, it finds nothing more to delete'
);

-- ---------------------------------------------------------------------------
-- The daily job
-- ---------------------------------------------------------------------------

select has_extension('pg_cron', 'pg_cron is installed');
select results_eq(
  $$select schedule, command, username, active from cron.job
     where jobname = 'delete-unfinished-signups'$$,
  $$values ('0 18 * * *'::text, 'select private.delete_unfinished_signups()'::text,
            'postgres'::text, true)$$,
  'one job runs the clean-up every day at 18:00 UTC (03:00 in Korea), as postgres'
);

-- Scheduling under the same name again (re-running the migration) replaces
-- the job instead of adding a second one.
select lives_ok(
  $$select cron.schedule('delete-unfinished-signups', '0 18 * * *',
                         'select private.delete_unfinished_signups()')$$,
  'the job can be scheduled again under its name'
);
select is(
  (select count(*) from cron.job where jobname = 'delete-unfinished-signups'),
  1::bigint,
  'and there is still exactly one such job'
);

select * from finish();
rollback;
