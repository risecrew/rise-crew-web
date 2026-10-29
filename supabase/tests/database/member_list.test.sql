-- pgTAP tests for public.member_list, the view behind the members screen: a
-- profile and its role in one row, with the text the search box looks through.
-- Run with `pnpm db:test` against the local stack. Everything rolls back.
--
-- The point of these tests: a view runs with its owner's rights unless it is
-- told otherwise, which would show every profile to every signed-in user. The
-- view must show each person exactly what the tables under it show them.
--
-- Fake accounts only (example.test). The ids do not collide with seed.sql.
--   guest     7e580000-0000-4000-8000-000000000001  (has not finished signing up)
--   member    7e580000-0000-4000-8000-000000000002  (name 이 + 회원)
--   operator  7e580000-0000-4000-8000-000000000003
--   blocked   7e580000-0000-4000-8000-000000000004  (operator, blocked)
--   admin     7e580000-0000-4000-8000-000000000005
-- Everyone but the guest has finished signing up.

begin;

create extension if not exists pgtap with schema extensions;

select plan(23);

-- ---------------------------------------------------------------------------
-- Setup (as postgres)
-- ---------------------------------------------------------------------------

insert into auth.users (id, email) values
  ('7e580000-0000-4000-8000-000000000001', 'Pgtap-List-Guest@example.test'),
  ('7e580000-0000-4000-8000-000000000002', 'pgtap-list-member@example.test'),
  ('7e580000-0000-4000-8000-000000000003', 'pgtap-list-operator@example.test'),
  ('7e580000-0000-4000-8000-000000000004', 'pgtap-list-blocked@example.test'),
  ('7e580000-0000-4000-8000-000000000005', 'pgtap-list-admin@example.test');

update public.user_roles set role = 'member'
 where user_id = '7e580000-0000-4000-8000-000000000002';
update public.user_roles set role = 'operator'
 where user_id in ('7e580000-0000-4000-8000-000000000003',
                   '7e580000-0000-4000-8000-000000000004');
update public.user_roles set blocked_at = now()
 where user_id = '7e580000-0000-4000-8000-000000000004';
update public.user_roles set role = 'admin'
 where user_id = '7e580000-0000-4000-8000-000000000005';

-- Everyone but the guest finishes signing up, the way the sign-up form does:
-- consents first, then the form.
insert into public.consents (user_id, kind, granted, policy_version)
select u.id, k.kind, true, 'pgtap'
from (values
  ('7e580000-0000-4000-8000-000000000002'::uuid),
  ('7e580000-0000-4000-8000-000000000003'::uuid),
  ('7e580000-0000-4000-8000-000000000004'::uuid),
  ('7e580000-0000-4000-8000-000000000005'::uuid)
) as u (id)
cross join (values ('privacy'), ('age14')) as k (kind);

update public.profiles
   set last_name = '시', first_name = '험', occupation = 'founder', onboarded_at = now()
 where id in ('7e580000-0000-4000-8000-000000000003',
              '7e580000-0000-4000-8000-000000000004',
              '7e580000-0000-4000-8000-000000000005');
update public.profiles
   set last_name = '이', first_name = '회원', occupation = 'founder', recruit_opt_in = true,
       onboarded_at = now()
 where id = '7e580000-0000-4000-8000-000000000002';
-- The guest gave a name but never finished.
update public.profiles
   set last_name = '김', first_name = '미완'
 where id = '7e580000-0000-4000-8000-000000000001';

-- How many finished sign-ups there are, as postgres sees them (seed rows
-- included).
do $$
begin
  perform set_config('tests.finished_count',
    (select count(*)::text from public.profiles where onboarded_at is not null), true);
end
$$;

-- ---------------------------------------------------------------------------
-- Structure
-- ---------------------------------------------------------------------------

select has_view('public', 'member_list', 'the member list view exists');
select ok(
  coalesce((select 'security_invoker=true' = any (c.reloptions)
              from pg_class as c where c.oid = 'public.member_list'::regclass), false),
  'the view runs with the rights of whoever reads it (security_invoker)'
);
select columns_are('public', 'member_list',
  array['id', 'email', 'last_name', 'first_name', 'occupation', 'school', 'major',
        'affiliation', 'recruit_opt_in', 'onboarded_at', 'created_at', 'role',
        'blocked_at', 'search_text'],
  'the view has exactly the columns the screen reads'
);
select table_privs_are('public', 'member_list', 'anon', array[]::text[],
  'anon has no privilege on the member list');
select table_privs_are('public', 'member_list', 'authenticated', array['SELECT'],
  'authenticated can only read the member list');
select table_privs_are('public', 'member_list', 'service_role', array[]::text[],
  'the secret key does not need the member list');

-- ---------------------------------------------------------------------------
-- What each role sees
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"7e580000-0000-4000-8000-000000000001","role":"authenticated"}';

select is_empty(
  'select id from public.member_list',
  'an account that has not finished signing up sees no row in the list, not even its own'
);

set local request.jwt.claims = '{"sub":"7e580000-0000-4000-8000-000000000002","role":"authenticated"}';

select results_eq(
  'select id from public.member_list',
  $$values ('7e580000-0000-4000-8000-000000000002'::uuid)$$,
  'a member sees one row in the list, their own'
);

-- A stale operator claim must not matter: the database decides.
set local request.jwt.claims = '{"sub":"7e580000-0000-4000-8000-000000000004","role":"authenticated","app_role":"operator","blocked":false}';

select results_eq(
  'select id from public.member_list',
  $$values ('7e580000-0000-4000-8000-000000000004'::uuid)$$,
  'a blocked operator sees one row in the list, their own, despite an operator claim'
);

set local request.jwt.claims = '{"sub":"7e580000-0000-4000-8000-000000000003","role":"authenticated","app_role":"operator"}';

select is(
  (select count(*) from public.member_list),
  current_setting('tests.finished_count')::bigint,
  'an operator sees a row for every finished sign-up'
);
select results_eq(
  $$select role::text, blocked_at is not null from public.member_list
     where id = '7e580000-0000-4000-8000-000000000004'$$,
  $$values ('operator'::text, true)$$,
  'a row carries the role and whether the account is blocked'
);
select results_eq(
  $$select role::text, recruit_opt_in, last_name, first_name from public.member_list
     where id = '7e580000-0000-4000-8000-000000000002'$$,
  $$values ('member'::text, true, '이'::text, '회원'::text)$$,
  'a row carries the profile fields'
);
select is(
  (select count(*) from public.member_list
    where id in (select id from public.profiles where onboarded_at is not null)),
  current_setting('tests.finished_count')::bigint,
  'every finished profile has exactly one row in the list'
);

set local request.jwt.claims = '{"sub":"7e580000-0000-4000-8000-000000000005","role":"authenticated","app_role":"admin"}';

select is(
  (select count(*) from public.member_list),
  current_setting('tests.finished_count')::bigint,
  'an admin sees a row for every finished sign-up'
);

-- ---------------------------------------------------------------------------
-- Search text: the name in both orders, and the email, in lower case
-- ---------------------------------------------------------------------------

select is(
  (select search_text from public.member_list
    where id = '7e580000-0000-4000-8000-000000000002'),
  '이회원 회원 이 이 회원 pgtap-list-member@example.test',
  'search text holds the Korean name, the given name, the family name and the email'
);
select ok(
  (select search_text like '%이회원%' from public.member_list
    where id = '7e580000-0000-4000-8000-000000000002'),
  'the whole Korean name (family name first, no space) can be searched'
);
select ok(
  (select search_text like '%회원 이%' from public.member_list
    where id = '7e580000-0000-4000-8000-000000000002'),
  'the name in the English order (given name first) can be searched'
);
select is_empty(
  $$select id from public.member_list
     where search_text like '%pgtap-list-guest%' or search_text like '%김미완%'$$,
  'an account that has not finished signing up is found neither by its email nor its name'
);

-- ---------------------------------------------------------------------------
-- Read only (a view over a join cannot be written to; the grants above also
-- give nobody the right)
-- ---------------------------------------------------------------------------

select throws_ok(
  $$update public.member_list set role = 'admin' where id = '7e580000-0000-4000-8000-000000000002'$$,
  '55000', null,
  'the list cannot be used to change a role'
);
select throws_ok(
  $$delete from public.member_list where id = '7e580000-0000-4000-8000-000000000002'$$,
  '55000', null,
  'the list cannot be used to delete an account'
);
select throws_ok(
  $$insert into public.member_list (id, email) values (gen_random_uuid(), 'x@example.test')$$,
  '55000', null,
  'the list cannot be used to add an account'
);

-- ---------------------------------------------------------------------------
-- anon
-- ---------------------------------------------------------------------------

reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok('select * from public.member_list', '42501', null,
  'anon cannot read the member list');

reset role;

-- The secret key reads profiles and roles directly, not through the list.
set local role service_role;
select throws_ok('select * from public.member_list', '42501', null,
  'the secret key does not read the list either');
reset role;

select * from finish();
rollback;
