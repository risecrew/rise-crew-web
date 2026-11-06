-- Operators and admins can delete a team, which until now only the dashboard could do.
--
-- A team's memberships and posts go with it (both reference it with on delete cascade). The accounts
-- of its members stay. Files in Storage have no reference to cascade through, so the site removes
-- them; the storage policies already let an operator do that.

grant delete on table public.teams to authenticated;

create policy teams_delete_operator on public.teams
  for delete to authenticated
  using ((select private.is_at_least('operator')));
