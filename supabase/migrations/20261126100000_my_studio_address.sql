-- M&Y Studio's page was made at /startups/kyot-527048, an address taken from
-- another team's name. It moves to an address made from its own name, keeping
-- its ending, as every team address made by the site does (2026-11-26).
--
-- The guard on teams lets only a signed-in operator change an address, and a
-- migration runs signed in as nobody, so the guard is set aside for this one
-- statement. Matching on the old address too makes it change nothing where the
-- team does not exist (the local and development databases).

alter table public.teams disable trigger teams_guard_update;

update public.teams
set slug = 'm-y-studio-527048'
where id = '2450bd66-1c22-4f10-b653-afd5e5871f05'
  and slug = 'kyot-527048';

alter table public.teams enable trigger teams_guard_update;
