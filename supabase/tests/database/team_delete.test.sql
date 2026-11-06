-- pgTAP tests for deleting a team. Run with `pnpm db:test`. Everything rolls back.
-- Fake accounts only (example.test).
--   member in the team  7e5e0000-0000-4000-8000-000000000001
--   operator            7e5e0000-0000-4000-8000-000000000002
--   blocked operator    7e5e0000-0000-4000-8000-000000000003

begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

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
grant execute on function public._t_rows(text) to anon, authenticated;

insert into auth.users (id, email) values
  ('7e5e0000-0000-4000-8000-000000000001', 'pgtap-teamdel-member@example.test'),
  ('7e5e0000-0000-4000-8000-000000000002', 'pgtap-teamdel-operator@example.test'),
  ('7e5e0000-0000-4000-8000-000000000003', 'pgtap-teamdel-blocked@example.test');
update public.user_roles set role = 'member'
 where user_id = '7e5e0000-0000-4000-8000-000000000001';
update public.user_roles set role = 'operator'
 where user_id in ('7e5e0000-0000-4000-8000-000000000002', '7e5e0000-0000-4000-8000-000000000003');
update public.user_roles set blocked_at = now()
 where user_id = '7e5e0000-0000-4000-8000-000000000003';

insert into public.teams (id, slug, name, field, cohort, is_published) values
  ('7e5e0000-0000-4000-8000-000000000a01', 'pgtap-teamdel', '지울 팀', 'other', 1, true);
insert into public.team_members (team_id, user_id) values
  ('7e5e0000-0000-4000-8000-000000000a01', '7e5e0000-0000-4000-8000-000000000001');
insert into public.team_posts (team_id, author_id, title, visibility) values
  ('7e5e0000-0000-4000-8000-000000000a01', '7e5e0000-0000-4000-8000-000000000001', '글', 'public');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok(
  'delete from public.teams', '42501', null, 'anon cannot delete a team');

set local role authenticated;
set local request.jwt.claims = '{"sub":"7e5e0000-0000-4000-8000-000000000001","role":"authenticated"}';
select is(public._t_rows('delete from public.teams'), 0, 'a member of the team cannot delete it');

set local request.jwt.claims = '{"sub":"7e5e0000-0000-4000-8000-000000000003","role":"authenticated","app_role":"operator"}';
select is(public._t_rows('delete from public.teams'), 0, 'a blocked operator cannot delete it');

set local request.jwt.claims = '{"sub":"7e5e0000-0000-4000-8000-000000000002","role":"authenticated"}';
select is(
  public._t_rows($$delete from public.teams where id = '7e5e0000-0000-4000-8000-000000000a01'$$),
  1, 'an operator can delete it');

reset role;
select is(
  (select count(*)::integer from public.teams where slug = 'pgtap-teamdel'), 0, 'the team is gone');
select is(
  (select count(*)::integer from public.team_members
    where team_id = '7e5e0000-0000-4000-8000-000000000a01'),
  0, 'its memberships went with it');
select is(
  (select count(*)::integer from public.team_posts
    where team_id = '7e5e0000-0000-4000-8000-000000000a01'),
  0, 'its posts went with it');
select is(
  (select count(*)::integer from public.profiles
    where id = '7e5e0000-0000-4000-8000-000000000001'),
  1, 'the member keeps their account');
select is(
  (select role::text from public.user_roles
    where user_id = '7e5e0000-0000-4000-8000-000000000001'),
  'member', 'and their role');

select * from finish();
rollback;
