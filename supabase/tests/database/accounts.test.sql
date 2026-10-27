-- pgTAP tests for the accounts schema: profiles, user_roles, consents, the
-- sign-up trigger, the role helpers and the access token hook.
-- Run with `pnpm db:test` against the local stack. Everything rolls back.
--
-- Fake accounts only (example.test). The ids do not collide with seed.sql.
--   guest     7e570000-0000-4000-8000-000000000001
--   member    7e570000-0000-4000-8000-000000000002
--   operator  7e570000-0000-4000-8000-000000000003
--   blocked   7e570000-0000-4000-8000-000000000004  (operator, blocked)
--   demoted   7e570000-0000-4000-8000-000000000005  (was operator, now member)
--   admin     7e570000-0000-4000-8000-000000000006

begin;

create extension if not exists pgtap with schema extensions;

select plan(81);

-- ---------------------------------------------------------------------------
-- Setup (as postgres)
-- ---------------------------------------------------------------------------

insert into auth.users (id, email) values
  ('7e570000-0000-4000-8000-000000000001', 'pgtap-guest@example.test'),
  ('7e570000-0000-4000-8000-000000000002', 'pgtap-member@example.test'),
  ('7e570000-0000-4000-8000-000000000003', 'pgtap-operator@example.test'),
  ('7e570000-0000-4000-8000-000000000004', 'pgtap-blocked@example.test'),
  ('7e570000-0000-4000-8000-000000000005', 'pgtap-demoted@example.test'),
  ('7e570000-0000-4000-8000-000000000006', 'pgtap-admin@example.test');

-- ---------------------------------------------------------------------------
-- Structure: RLS, grants, policies
-- ---------------------------------------------------------------------------

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS is enabled on profiles'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.user_roles'::regclass),
  'RLS is enabled on user_roles'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.consents'::regclass),
  'RLS is enabled on consents'
);

select table_privs_are('public', 'profiles', 'anon', array[]::text[],
  'anon has no privilege on profiles');
select table_privs_are('public', 'user_roles', 'anon', array[]::text[],
  'anon has no privilege on user_roles');
select table_privs_are('public', 'consents', 'anon', array[]::text[],
  'anon has no privilege on consents');

select table_privs_are('public', 'profiles', 'authenticated', array['SELECT'],
  'authenticated has only table-level SELECT on profiles');
select table_privs_are('public', 'user_roles', 'authenticated', array['SELECT'],
  'authenticated has only SELECT on user_roles (no write)');
select table_privs_are('public', 'consents', 'authenticated', array['SELECT'],
  'authenticated has only table-level SELECT on consents');

select is(
  (select array_agg(attname::text order by attname)
     from pg_attribute
    where attrelid = 'public.profiles'::regclass and attnum > 0 and not attisdropped
      and has_column_privilege('authenticated', attrelid, attnum, 'UPDATE')),
  array['affiliation', 'first_name', 'last_name', 'major', 'occupation',
        'onboarded_at', 'school'],
  'authenticated can update exactly the editable profile columns (not recruit_opt_in)'
);
select is(
  (select array_agg(attname::text order by attname)
     from pg_attribute
    where attrelid = 'public.consents'::regclass and attnum > 0 and not attisdropped
      and has_column_privilege('authenticated', attrelid, attnum, 'INSERT')),
  array['granted', 'kind', 'policy_version', 'user_id'],
  'authenticated can insert consents but not set id or created_at'
);

select table_privs_are('public', 'profiles', 'service_role', array['SELECT'],
  'the secret key reads profiles');
select table_privs_are('public', 'user_roles', 'service_role', array['SELECT', 'UPDATE'],
  'the secret key reads and updates user_roles');
select table_privs_are('public', 'consents', 'service_role', array['SELECT'],
  'the secret key reads consents');
select table_privs_are('public', 'user_roles', 'supabase_auth_admin', array['SELECT'],
  'the auth server reads user_roles for the token hook');

select policies_are('public', 'profiles',
  array['profiles_select_own_or_operator', 'profiles_update_own'],
  'profiles has exactly the expected policies');
select policies_are('public', 'user_roles',
  array['user_roles_select_own_or_operator', 'user_roles_select_auth_admin'],
  'user_roles has exactly the expected policies');
select policies_are('public', 'consents',
  array['consents_select_own', 'consents_insert_own'],
  'consents has exactly the expected policies');
select policy_roles_are('public', 'user_roles', 'user_roles_select_auth_admin',
  array['supabase_auth_admin'],
  'the token hook policy applies only to the auth server');

select ok(
  has_function_privilege('supabase_auth_admin', 'public.custom_access_token_hook(jsonb)', 'EXECUTE'),
  'the auth server can run the token hook'
);
select ok(
  not has_function_privilege('anon', 'public.custom_access_token_hook(jsonb)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.custom_access_token_hook(jsonb)', 'EXECUTE')
  and not has_function_privilege('service_role', 'public.custom_access_token_hook(jsonb)', 'EXECUTE'),
  'no API role can run the token hook'
);
select ok(
  not has_function_privilege('anon', 'private.app_role_of(uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.app_role_of(uuid)', 'EXECUTE')
  and not has_function_privilege('service_role', 'private.app_role_of(uuid)', 'EXECUTE'),
  'no API role can call app_role_of for an arbitrary user'
);
select is_empty(
  $$select r, f
      from unnest(array['anon', 'authenticated', 'service_role']) as r,
           unnest(array['private.guard_onboarding()', 'private.sync_recruit_opt_in()',
                        'private.handle_new_user()', 'private.set_updated_at()']) as f
     where has_function_privilege(r, f, 'EXECUTE')$$,
  'no API role can call the trigger functions'
);
select ok(
  has_function_privilege('authenticated', 'private.is_at_least(public.app_role)', 'EXECUTE')
  and not has_function_privilege('anon', 'private.is_at_least(public.app_role)', 'EXECUTE'),
  'only authenticated can call is_at_least (the policies need it)'
);

-- ---------------------------------------------------------------------------
-- Sign-up trigger
-- ---------------------------------------------------------------------------

select results_eq(
  $$select email from public.profiles where id = '7e570000-0000-4000-8000-000000000001'$$,
  $$values ('pgtap-guest@example.test'::text)$$,
  'a new auth user gets one profile with the account email'
);
select results_eq(
  $$select role::text from public.user_roles where user_id = '7e570000-0000-4000-8000-000000000001'$$,
  $$values ('guest'::text)$$,
  'a new auth user gets one user_roles row with role guest'
);

-- Roles for the rest of the file.
update public.user_roles set role = 'member'
 where user_id = '7e570000-0000-4000-8000-000000000002';

-- The member finished sign-up earlier. Set directly with the guard off, so
-- the "never changes" checks below compare against a time other than now().
alter table public.profiles disable trigger profiles_guard_onboarding;
update public.profiles
   set last_name = '이', first_name = '회원', occupation = 'founder',
       onboarded_at = '2026-01-01 00:00:00+00'
 where id = '7e570000-0000-4000-8000-000000000002';
alter table public.profiles enable trigger profiles_guard_onboarding;
update public.user_roles set role = 'operator'
 where user_id in ('7e570000-0000-4000-8000-000000000003',
                   '7e570000-0000-4000-8000-000000000004');
update public.user_roles set blocked_at = now()
 where user_id = '7e570000-0000-4000-8000-000000000004';
update public.user_roles set role = 'member'
 where user_id = '7e570000-0000-4000-8000-000000000005';
update public.user_roles set role = 'admin'
 where user_id = '7e570000-0000-4000-8000-000000000006';

-- Totals as seen by postgres (seed rows included), for the operator checks.
do $$
begin
  perform set_config('tests.profile_count', (select count(*)::text from public.profiles), true);
  perform set_config('tests.role_count', (select count(*)::text from public.user_roles), true);
end
$$;

-- ---------------------------------------------------------------------------
-- Token hook (called as postgres: the test runner cannot become
-- supabase_auth_admin; its grants and policy are pinned above)
-- ---------------------------------------------------------------------------

select is(
  public.custom_access_token_hook(jsonb_build_object(
    'user_id', '7e570000-0000-4000-8000-000000000003',
    'claims', jsonb_build_object('sub', '7e570000-0000-4000-8000-000000000003', 'role', 'authenticated'),
    'authentication_method', 'otp'
  )) -> 'claims' ->> 'app_role',
  'operator',
  'the hook adds app_role = operator for an operator'
);
select is(
  public.custom_access_token_hook(jsonb_build_object(
    'user_id', '7e570000-0000-4000-8000-000000000003',
    'claims', jsonb_build_object('sub', '7e570000-0000-4000-8000-000000000003', 'role', 'authenticated'),
    'authentication_method', 'otp'
  )) -> 'claims' -> 'blocked',
  'false'::jsonb,
  'the hook adds blocked = false for an active account'
);
select is(
  public.custom_access_token_hook(jsonb_build_object(
    'user_id', '7e570000-0000-4000-8000-000000000004',
    'claims', jsonb_build_object('sub', '7e570000-0000-4000-8000-000000000004', 'role', 'authenticated'),
    'authentication_method', 'otp'
  )) -> 'claims' -> 'blocked',
  'true'::jsonb,
  'the hook adds blocked = true for a blocked account'
);
select is(
  public.custom_access_token_hook(jsonb_build_object(
    'user_id', '7e570000-0000-4000-8000-000000000001',
    'claims', jsonb_build_object('sub', '7e570000-0000-4000-8000-000000000001', 'role', 'authenticated'),
    'authentication_method', 'magiclink'
  )) -> 'claims' ->> 'sub',
  '7e570000-0000-4000-8000-000000000001',
  'the hook keeps the existing claims'
);

-- ---------------------------------------------------------------------------
-- Guest
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"7e570000-0000-4000-8000-000000000001","role":"authenticated"}';

select results_eq(
  'select id from public.profiles',
  $$values ('7e570000-0000-4000-8000-000000000001'::uuid)$$,
  'a guest sees exactly one profile, their own'
);
select results_eq(
  'select user_id from public.user_roles',
  $$values ('7e570000-0000-4000-8000-000000000001'::uuid)$$,
  'a guest sees only their own role row'
);
select throws_ok(
  $$update public.user_roles set role = 'admin' where user_id = '7e570000-0000-4000-8000-000000000001'$$,
  '42501', null,
  'a guest cannot change their role'
);
select throws_ok(
  $$update public.user_roles set blocked_at = null where user_id = '7e570000-0000-4000-8000-000000000001'$$,
  '42501', null,
  'a guest cannot change their block state'
);
select throws_ok(
  $$insert into public.user_roles (user_id, role) values ('7e570000-0000-4000-8000-000000000001', 'admin')$$,
  '42501', null,
  'a guest cannot insert a role row'
);
select throws_ok(
  $$update public.profiles set email = 'evil@example.test' where id = '7e570000-0000-4000-8000-000000000001'$$,
  '42501', null,
  'a guest cannot change the email on their profile'
);
select throws_ok(
  $$delete from public.profiles where id = '7e570000-0000-4000-8000-000000000001'$$,
  '42501', null,
  'a guest cannot delete their profile through the API'
);
select is_empty(
  $$update public.profiles set first_name = 'Hacked'
     where id = '7e570000-0000-4000-8000-000000000002' returning id$$,
  'a guest cannot update another user''s profile (0 rows)'
);
select lives_ok(
  $$update public.profiles set last_name = '가', first_name = '입자'
     where id = '7e570000-0000-4000-8000-000000000001'$$,
  'a guest can update the editable columns of their own profile'
);

-- Consent before sign-up completes
select throws_ok(
  $$update public.profiles set occupation = 'other', onboarded_at = now()
     where id = '7e570000-0000-4000-8000-000000000001'$$,
  'P0001', 'sign-up cannot finish before the privacy and age14 consents are recorded',
  'sign-up cannot finish without any consent'
);
select lives_ok(
  $$insert into public.consents (user_id, kind, granted, policy_version)
    values ('7e570000-0000-4000-8000-000000000001', 'privacy', true, '2026-10-27')$$,
  'a user can record their own consent'
);
select throws_ok(
  $$update public.profiles set occupation = 'other', onboarded_at = now()
     where id = '7e570000-0000-4000-8000-000000000001'$$,
  'P0001', 'sign-up cannot finish before the privacy and age14 consents are recorded',
  'sign-up cannot finish with privacy but no age14 consent'
);
select lives_ok(
  $$insert into public.consents (user_id, kind, granted, policy_version)
    values ('7e570000-0000-4000-8000-000000000001', 'age14', false, '2026-10-27')$$,
  'a declined consent is recorded too'
);
select throws_ok(
  $$update public.profiles set occupation = 'other', onboarded_at = now()
     where id = '7e570000-0000-4000-8000-000000000001'$$,
  'P0001', 'sign-up cannot finish before the privacy and age14 consents are recorded',
  'a declined age14 consent does not let sign-up finish'
);
select lives_ok(
  $$insert into public.consents (user_id, kind, granted, policy_version)
    values ('7e570000-0000-4000-8000-000000000001', 'age14', true, '2026-10-27')$$,
  'a user can record the age14 consent'
);
select throws_ok(
  $$insert into public.consents (user_id, kind, granted, policy_version)
    values ('7e570000-0000-4000-8000-000000000002', 'privacy', true, '2026-10-27')$$,
  '42501', null,
  'a user cannot insert a consent for another user'
);
select throws_ok(
  $$insert into public.consents (user_id, kind, granted, policy_version, created_at)
    values ('7e570000-0000-4000-8000-000000000001', 'privacy', true, '2026-10-27', '2000-01-01')$$,
  '42501', null,
  'a user cannot backdate a consent'
);
select throws_ok(
  $$insert into public.consents (user_id, kind, granted, policy_version)
    values ('7e570000-0000-4000-8000-000000000001', 'marketing', true, '2026-10-27')$$,
  '23514', null,
  'consent kind must be privacy, age14 or recruit'
);
select results_eq(
  'select distinct user_id from public.consents',
  $$values ('7e570000-0000-4000-8000-000000000001'::uuid)$$,
  'a user sees only their own consents'
);

-- Recruit opt-in follows the consent log
select throws_ok(
  $$update public.profiles set recruit_opt_in = true where id = '7e570000-0000-4000-8000-000000000001'$$,
  '42501', null,
  'a user cannot set recruit_opt_in directly'
);
select lives_ok(
  $$insert into public.consents (user_id, kind, granted, policy_version)
    values ('7e570000-0000-4000-8000-000000000001', 'recruit', true, '2026-10-27')$$,
  'a user can opt in to recruitment email'
);
select is(
  (select recruit_opt_in from public.profiles where id = '7e570000-0000-4000-8000-000000000001'),
  true,
  'a granted recruit consent sets recruit_opt_in'
);
select lives_ok(
  $$insert into public.consents (user_id, kind, granted, policy_version)
    values ('7e570000-0000-4000-8000-000000000001', 'recruit', false, '2026-10-27')$$,
  'a user can opt out of recruitment email'
);
select is(
  (select recruit_opt_in from public.profiles where id = '7e570000-0000-4000-8000-000000000001'),
  false,
  'a declined recruit consent clears recruit_opt_in'
);

-- Onboarding check constraint (the consents are in place, so the check decides)
select throws_ok(
  $$update public.profiles set last_name = null, first_name = null, onboarded_at = now()
     where id = '7e570000-0000-4000-8000-000000000001'$$,
  '23514', null,
  'onboarded_at cannot be set without names'
);
select throws_ok(
  $$update public.profiles set last_name = ' ', first_name = '입자', occupation = 'other', onboarded_at = now()
     where id = '7e570000-0000-4000-8000-000000000001'$$,
  '23514', null,
  'a blank last name does not count as a name'
);
select throws_ok(
  $$update public.profiles set occupation = null, onboarded_at = now()
     where id = '7e570000-0000-4000-8000-000000000001'$$,
  '23514', null,
  'onboarded_at cannot be set without an occupation'
);
select throws_ok(
  $$update public.profiles set occupation = 'grad', school = '예시대학교', major = null, onboarded_at = now()
     where id = '7e570000-0000-4000-8000-000000000001'$$,
  '23514', null,
  'a grad without a major fails the check'
);
select throws_ok(
  $$update public.profiles set occupation = 'undergrad', school = '', major = '경영학', onboarded_at = now()
     where id = '7e570000-0000-4000-8000-000000000001'$$,
  '23514', null,
  'an undergrad with an empty school fails the check'
);
select throws_ok(
  $$update public.profiles set first_name = repeat('가', 51)
     where id = '7e570000-0000-4000-8000-000000000001'$$,
  '23514', null,
  'names are capped at 50 characters'
);
select throws_ok(
  $$update public.profiles set affiliation = repeat('a', 101)
     where id = '7e570000-0000-4000-8000-000000000001'$$,
  '23514', null,
  'affiliation is capped at 100 characters'
);
select lives_ok(
  $$update public.profiles
       set occupation = 'grad', school = '예시대학교', major = '경영학', onboarded_at = '2000-01-01'
     where id = '7e570000-0000-4000-8000-000000000001'$$,
  'with privacy and age14 consents, a complete grad profile finishes sign-up'
);
select is(
  (select onboarded_at from public.profiles where id = '7e570000-0000-4000-8000-000000000001'),
  now(),
  'onboarded_at is stamped with the server time, not the value sent'
);
select lives_ok(
  $$update public.profiles set occupation = 'alumni', school = null, major = null, affiliation = null
     where id = '7e570000-0000-4000-8000-000000000001'$$,
  'alumni need no school, major or affiliation'
);

-- ---------------------------------------------------------------------------
-- Member
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"7e570000-0000-4000-8000-000000000002","role":"authenticated"}';

select results_eq(
  'select id from public.profiles',
  $$values ('7e570000-0000-4000-8000-000000000002'::uuid)$$,
  'a member sees only their own profile'
);
select lives_ok(
  $$update public.profiles set onboarded_at = null where id = '7e570000-0000-4000-8000-000000000002'$$,
  'an update that clears onboarded_at runs'
);
select is(
  (select onboarded_at from public.profiles where id = '7e570000-0000-4000-8000-000000000002'),
  '2026-01-01 00:00:00+00'::timestamptz,
  'onboarded_at cannot be cleared once set'
);
select lives_ok(
  $$update public.profiles set onboarded_at = '2030-01-01' where id = '7e570000-0000-4000-8000-000000000002'$$,
  'an update that changes onboarded_at runs'
);
select is(
  (select onboarded_at from public.profiles where id = '7e570000-0000-4000-8000-000000000002'),
  '2026-01-01 00:00:00+00'::timestamptz,
  'onboarded_at cannot be changed once set'
);

-- ---------------------------------------------------------------------------
-- Operator and admin
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"7e570000-0000-4000-8000-000000000003","role":"authenticated","app_role":"operator"}';

select is(
  (select count(*) from public.profiles),
  current_setting('tests.profile_count')::bigint,
  'an operator sees every profile'
);
select is(
  (select count(*) from public.user_roles),
  current_setting('tests.role_count')::bigint,
  'an operator sees every role row'
);
select throws_ok(
  $$update public.user_roles set role = 'member' where user_id = '7e570000-0000-4000-8000-000000000001'$$,
  '42501', null,
  'an operator cannot write user_roles through the API'
);
select is_empty(
  $$update public.profiles set first_name = 'Hacked'
     where id = '7e570000-0000-4000-8000-000000000001' returning id$$,
  'an operator can read but not update another user''s profile (0 rows)'
);

set local request.jwt.claims = '{"sub":"7e570000-0000-4000-8000-000000000006","role":"authenticated","app_role":"admin"}';

select is(
  (select count(*) from public.profiles),
  current_setting('tests.profile_count')::bigint,
  'an admin sees every profile'
);

-- ---------------------------------------------------------------------------
-- Blocked and demoted operators with a stale operator claim
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"7e570000-0000-4000-8000-000000000004","role":"authenticated","app_role":"operator","blocked":false}';

select results_eq(
  'select id from public.profiles',
  $$values ('7e570000-0000-4000-8000-000000000004'::uuid)$$,
  'a blocked operator sees only their own profile, despite a stale operator claim'
);

set local request.jwt.claims = '{"sub":"7e570000-0000-4000-8000-000000000005","role":"authenticated","app_role":"operator","blocked":false}';

select results_eq(
  'select id from public.profiles',
  $$values ('7e570000-0000-4000-8000-000000000005'::uuid)$$,
  'a demoted operator sees only their own profile, despite a stale operator claim'
);
select results_eq(
  'select user_id from public.user_roles',
  $$values ('7e570000-0000-4000-8000-000000000005'::uuid)$$,
  'a demoted operator sees only their own role row'
);

-- ---------------------------------------------------------------------------
-- Helpers are not callable directly
-- ---------------------------------------------------------------------------

select throws_ok(
  $$select private.app_role_of('7e570000-0000-4000-8000-000000000006')$$,
  '42501', null,
  'authenticated cannot look up another user''s role'
);

-- ---------------------------------------------------------------------------
-- anon
-- ---------------------------------------------------------------------------

reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok('select * from public.profiles', '42501', null,
  'anon cannot read profiles');
select throws_ok('select * from public.user_roles', '42501', null,
  'anon cannot read user_roles');
select throws_ok('select * from public.consents', '42501', null,
  'anon cannot read consents');

reset role;

select * from finish();
rollback;
