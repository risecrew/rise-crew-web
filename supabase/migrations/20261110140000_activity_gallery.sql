-- An activity's own page shows more than its one cover photo: a gallery of up to 40 more
-- (wireframe v1.1, §12 E5). The cover stays the photo the cards and captions use.
--
-- - gallery is the files in the order the page shows them. They live in the activity-photos bucket
--   under the same rules as the cover (operators write, the bucket is public), so no new policy is
--   needed. Only uploaded files go here; the photos that ship with the site are covers only.
-- - Who may write it is the same as for the other columns: operators, checked by the policies.

create function private.valid_activity_gallery(paths text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(paths) <= 40
     and array_position(paths, null) is null
     and not exists (
       select 1 from unnest(paths) as p where p !~ '^[0-9a-f-]{36}\.(jpg|png|webp)$'
     )
     and cardinality(paths) = (select count(distinct p) from unnest(paths) as p);
$$;

revoke execute on function private.valid_activity_gallery(text[])
  from public, anon, authenticated, service_role;
grant execute on function private.valid_activity_gallery(text[]) to authenticated, service_role;

alter table public.activities
  add column gallery text[] not null default '{}',
  add constraint activities_gallery_valid check (private.valid_activity_gallery(gallery));

grant insert (gallery), update (gallery) on table public.activities to authenticated;
