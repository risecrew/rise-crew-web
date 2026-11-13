-- Teams no longer have a field (분야). The club has few teams, so a field filter
-- and label added nothing; the organizers dropped them (2026-11-13).
--
-- The guard on teams keeps the same rule without the field: team members write
-- the intro and the cover; the name, the address, the cohort and publishing are
-- the operators' to decide. It is replaced first, since it reads the column.

create or replace function private.guard_team_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_at_least('operator')
     and (new.slug, new.name, new.cohort, new.is_published)
         is distinct from (old.slug, old.name, old.cohort, old.is_published) then
    raise exception 'only operators can change the name, address, cohort or publishing of a team'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- The column's check constraint and its column grants go with it.
alter table public.teams drop column field;
