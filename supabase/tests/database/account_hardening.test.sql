-- pgTAP tests for 20261111100000_account_hardening.sql. Run with `pnpm db:test`. Everything rolls
-- back. Fake accounts only (example.test).
--   a  7e600000-0000-4000-8000-000000000001  admin
--   b  7e600000-0000-4000-8000-000000000002  admin, added later
--   x  7e600000-0000-4000-8000-000000000003  guest, blocked
--   y  7e600000-0000-4000-8000-000000000004  guest

begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

create function public._t_rows(statement text)
returns integer
language plpgsql
as $$
declare
  touched integer;
begin
  execute statement;
  get diagnostics touched = row_count;
  return touched;
end;
$$;
grant execute on function public._t_rows(text) to authenticated;

insert into auth.users (id, email) values
  ('7e600000-0000-4000-8000-000000000001', 'pgtap-harden-a@example.test'),
  ('7e600000-0000-4000-8000-000000000003', 'pgtap-harden-x@example.test'),
  ('7e600000-0000-4000-8000-000000000004', 'pgtap-harden-y@example.test');

update public.user_roles set role = 'admin'
 where user_id = '7e600000-0000-4000-8000-000000000001';
-- Whoever else is an admin on this stack steps aside, in one statement, so a is the only one left.
update public.user_roles set role = 'member'
 where role = 'admin' and user_id <> '7e600000-0000-4000-8000-000000000001';
update public.user_roles set role = 'guest', blocked_at = now()
 where user_id = '7e600000-0000-4000-8000-000000000003';
update public.user_roles set role = 'guest'
 where user_id = '7e600000-0000-4000-8000-000000000004';

-- 1. A blocked account writes nothing of its own.
set local role authenticated;
set local request.jwt.claims = '{"sub":"7e600000-0000-4000-8000-000000000003","role":"authenticated"}';
select is(
  public._t_rows($$update public.profiles set school = '학교' where id = '7e600000-0000-4000-8000-000000000003'$$),
  0, 'a blocked account cannot edit its profile');
select throws_ok(
  $$insert into public.consents (user_id, kind, granted, policy_version)
    values ('7e600000-0000-4000-8000-000000000003', 'recruit', true, '2026-11-11')$$,
  '42501', null, 'a blocked account cannot add a consent');

set local request.jwt.claims = '{"sub":"7e600000-0000-4000-8000-000000000004","role":"authenticated"}';
select is(
  public._t_rows($$update public.profiles set school = '학교' where id = '7e600000-0000-4000-8000-000000000004'$$),
  1, 'an account that is not blocked still edits its profile');
select lives_ok(
  $$insert into public.consents (user_id, kind, granted, policy_version)
    values ('7e600000-0000-4000-8000-000000000004', 'recruit', true, '2026-11-11')$$,
  'an account that is not blocked still adds a consent');
reset role;

-- 2. The last admin who can sign in stays, whoever asks.
select throws_ok(
  $$update public.user_roles set role = 'operator' where user_id = '7e600000-0000-4000-8000-000000000001'$$,
  '23514', null, 'the last admin cannot be demoted');
select throws_ok(
  $$update public.user_roles set blocked_at = now() where user_id = '7e600000-0000-4000-8000-000000000001'$$,
  '23514', null, 'the last admin cannot be blocked');
select throws_ok(
  $$delete from auth.users where id = '7e600000-0000-4000-8000-000000000001'$$,
  '23514', null, 'the last admin cannot be deleted');
select lives_ok(
  $$update public.user_roles set role = 'member' where user_id = '7e600000-0000-4000-8000-000000000004'$$,
  'other roles change as before');

insert into auth.users (id, email) values
  ('7e600000-0000-4000-8000-000000000002', 'pgtap-harden-b@example.test');
update public.user_roles set role = 'admin'
 where user_id = '7e600000-0000-4000-8000-000000000002';
select lives_ok(
  $$update public.user_roles set role = 'operator' where user_id = '7e600000-0000-4000-8000-000000000001'$$,
  'an admin can step down while another remains');

-- 3. Nobody moves an account to another address through Auth's API.
select throws_ok(
  $$update auth.users set email_change = 'someone-else@example.test'
     where id = '7e600000-0000-4000-8000-000000000004'$$,
  '42501', null, 'a request to change the address is refused');
select lives_ok(
  $$update auth.users set email_change = '' where id = '7e600000-0000-4000-8000-000000000004'$$,
  'clearing a request still works');
select lives_ok(
  $$update auth.users set email = 'pgtap-harden-y2@example.test'
     where id = '7e600000-0000-4000-8000-000000000004'$$,
  'an admin can still set an address directly');

select * from finish();
rollback;
