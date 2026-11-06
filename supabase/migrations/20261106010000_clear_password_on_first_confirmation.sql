-- A password set before an address is confirmed does not survive its confirmation.
--
-- Anyone can call Auth's sign-up with another person's address and a password of their own. Auth
-- keeps that password on the unconfirmed account, and confirming the address (from any mail: sign-up,
-- reset, sign-in link) does not touch it. The mail proves who owns the address, and nothing about who
-- chose the password, so without this the person who planted it could sign in once the owner confirms.
-- The site asks for the password after the confirmation, so nobody's real password is lost.
--
-- It runs here, not in the site, because the planted password never passes through the site.
--
-- One cost: an account made in the dashboard or the admin API with a password and "auto confirm" loses
-- that password too, because Auth confirms it in a write of its own. Its owner sets one through
-- "forgot password", or the admin sets it again after creating the account.

create or replace function private.clear_unconfirmed_password()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.encrypted_password := '';
  return new;
end;
$$;

comment on function private.clear_unconfirmed_password() is
  'Clears a password set before the address was confirmed, at the moment it is confirmed.';

revoke execute on function private.clear_unconfirmed_password()
  from public, anon, authenticated, service_role;

-- A write that sets the password in the same statement as the confirmation chose that password
-- knowing the address is confirmed (the admin API), so it stands.
create trigger on_auth_user_first_confirmed
  before update of email_confirmed_at on auth.users
  for each row
  when (
    old.email_confirmed_at is null
    and new.email_confirmed_at is not null
    and new.encrypted_password is not distinct from old.encrypted_password
  )
  execute function private.clear_unconfirmed_password();
