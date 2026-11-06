-- Two small corrections to 20261106100000 and 20261106110000.
--
-- - A null in notices.photo_paths passed its check, because `null !~ pattern` is not true. Only an
--   operator could write one and the site never does, but the check should say what it means.
-- - The secret key could not write a dated activity, though it was granted the table so that scripts
--   can set rows up: the date check runs as the writer.

create or replace function private.valid_notice_photos(paths text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(cardinality(paths), 0) <= 4
    and not exists (
      select 1 from unnest(paths) as path
      where path is null or path !~ '^[0-9a-f-]{36}\.(jpg|png|webp)$'
    );
$$;

grant execute on function private.valid_activity_date(text) to service_role;
