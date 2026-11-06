-- pgTAP tests for the trigger that clears a password set before an address was confirmed.
-- Run with `pnpm db:test` against the local stack. Everything rolls back. Fake accounts only.

begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

insert into auth.users (id, email, encrypted_password, email_confirmed_at) values
  ('7e570000-0000-4000-8000-0000000000a1', 'pgtap-planted@example.test', 'planted-hash', null),
  ('7e570000-0000-4000-8000-0000000000a2', 'pgtap-admin@example.test', 'old-hash', null),
  ('7e570000-0000-4000-8000-0000000000a3', 'pgtap-owner@example.test', 'own-hash', now());

select is(
  (select encrypted_password from auth.users where email = 'pgtap-planted@example.test'),
  'planted-hash',
  'an unconfirmed account holds the password it was made with'
);

update auth.users set email_confirmed_at = now() where email = 'pgtap-planted@example.test';
select is(
  (select encrypted_password from auth.users where email = 'pgtap-planted@example.test'),
  '',
  'confirming the address clears it'
);

update auth.users set encrypted_password = 'chosen-after'
 where email = 'pgtap-planted@example.test';
select is(
  (select encrypted_password from auth.users where email = 'pgtap-planted@example.test'),
  'chosen-after',
  'a password set after the confirmation stays'
);

update auth.users set email_confirmed_at = now(), encrypted_password = 'set-together'
 where email = 'pgtap-admin@example.test';
select is(
  (select encrypted_password from auth.users where email = 'pgtap-admin@example.test'),
  'set-together',
  'a password set in the same write as the confirmation stays'
);

update auth.users set email_confirmed_at = now() where email = 'pgtap-owner@example.test';
select is(
  (select encrypted_password from auth.users where email = 'pgtap-owner@example.test'),
  'own-hash',
  'an account already confirmed keeps its password'
);

select * from finish();
rollback;
