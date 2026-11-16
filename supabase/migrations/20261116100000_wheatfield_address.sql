-- The team Unbland renamed itself Wheatfield (2026-11-16). An operator changed the
-- name on the admin screen; the address, which the screen does not edit, follows
-- it here. It keeps its ending, as every team address made by the site does.
--
-- The guard on teams lets only a signed-in operator change an address, and a
-- migration runs signed in as nobody, so the guard is set aside for this one
-- statement. Matching on the old address too makes it change nothing where the
-- team does not exist (the local and development databases).

alter table public.teams disable trigger teams_guard_update;

update public.teams
set slug = 'wheatfield-c94459'
where id = '81c91546-619a-4606-93d0-0cdfa855e70c'
  and slug = 'unbland-c94459';

alter table public.teams enable trigger teams_guard_update;
