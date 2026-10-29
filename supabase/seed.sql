-- Local development accounts, one per role. Fake data only: example.test
-- addresses and made-up names. `pnpm db:reset` loads this file into the local
-- stack. Never load it into a cloud project (`supabase db push` skips it
-- unless given `--include-seed`; do not pass that flag).
--
-- Sign in with a magic link: request it on the login page (or through the
-- Auth API) and open it from Mailpit at http://127.0.0.1:54324.
--
--   guest@example.test     guest     (가입자)
--   member@example.test    member    (회원)
--   operator@example.test  operator  (운영진)
--   admin@example.test     admin     (관리자)

-- Auth accounts, shaped like the rows Supabase Auth writes for an email
-- sign-up (confirmed email, empty token columns, an `email` identity).
-- No password: these accounts sign in by email link only.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000', a.id, 'authenticated', 'authenticated', a.email, '', now(),
  '', '', '', '',
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  jsonb_build_object('sub', a.id::text, 'email', a.email, 'email_verified', true, 'phone_verified', false),
  now(), now()
from (values
  ('5eed0000-0000-4000-8000-000000000001'::uuid, 'guest@example.test'),
  ('5eed0000-0000-4000-8000-000000000002'::uuid, 'member@example.test'),
  ('5eed0000-0000-4000-8000-000000000003'::uuid, 'operator@example.test'),
  ('5eed0000-0000-4000-8000-000000000004'::uuid, 'admin@example.test')
) as a (id, email);

insert into auth.identities (
  user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
)
select
  u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
  now(), now(), now()
from auth.users as u
where u.id::text like '5eed0000-%';

-- The sign-up trigger already created a profile and a guest role for each
-- account. Record the consents the sign-up form records first: sign-up
-- cannot finish without granted privacy and age14 consents, and the recruit
-- consent sets profiles.recruit_opt_in.
insert into public.consents (user_id, kind, granted, policy_version)
select s.user_id, k.kind, case when k.kind = 'recruit' then s.recruit else true end, '2026-10-27'
from (values
  ('5eed0000-0000-4000-8000-000000000001'::uuid, true),
  ('5eed0000-0000-4000-8000-000000000002'::uuid, false),
  ('5eed0000-0000-4000-8000-000000000003'::uuid, true),
  ('5eed0000-0000-4000-8000-000000000004'::uuid, false)
) as s (user_id, recruit)
cross join (values ('privacy'), ('age14'), ('recruit')) as k (kind);

-- Then fill in the sign-up form for all four.
update public.profiles as p
set
  last_name = s.last_name,
  first_name = s.first_name,
  occupation = s.occupation::public.occupation,
  school = s.school,
  major = s.major,
  affiliation = s.affiliation,
  onboarded_at = now()
from (values
  ('5eed0000-0000-4000-8000-000000000001'::uuid, '김', '가입', 'undergrad', '성균관대학교', '경영학', null),
  ('5eed0000-0000-4000-8000-000000000002'::uuid, '이', '회원', 'grad', '성균관대학교', '컴퓨터공학', null),
  ('5eed0000-0000-4000-8000-000000000003'::uuid, '박', '운영', 'alumni', null, null, '예시 스튜디오'),
  ('5eed0000-0000-4000-8000-000000000004'::uuid, '최', '관리', 'founder', null, null, null)
) as s (id, last_name, first_name, occupation, school, major, affiliation)
where p.id = s.id;

update public.user_roles as r
set role = s.role::public.app_role
from (values
  ('5eed0000-0000-4000-8000-000000000002'::uuid, 'member'),
  ('5eed0000-0000-4000-8000-000000000003'::uuid, 'operator'),
  ('5eed0000-0000-4000-8000-000000000004'::uuid, 'admin')
) as s (user_id, role)
where r.user_id = s.user_id;
