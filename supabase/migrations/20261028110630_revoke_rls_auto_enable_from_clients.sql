-- Close the Security Advisor warnings on public.rls_auto_enable().
--
-- The dashboard setting "Enable automatic RLS" creates this function: a
-- SECURITY DEFINER event-trigger function that turns row level security on for
-- every new table (event trigger ensure_rls). Postgres lets every role execute
-- a new function by default, so the advisor flags it as callable by anon and
-- by signed-in users through the Data API.
--
-- - Nobody calls it directly; only the event trigger runs it, and an event
--   trigger fires without checking EXECUTE, so taking EXECUTE away from the
--   client roles leaves automatic RLS working.
-- - The function exists only on hosted projects with that setting on, not on
--   the local stack, so the revoke runs only where the function is.

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;
