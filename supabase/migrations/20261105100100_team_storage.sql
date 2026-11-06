-- Team storage: logos and post photos.
--
-- - team-logos is public: a logo is on a public page anyway. The bucket setting
--   lets anyone open a logo by address; only team members and operators write.
-- - team-post-photos is private: a photo opens only through a short-lived
--   signed URL, and Storage issues one only to someone who can read the row in
--   storage.objects. The read policy asks public.team_posts as the caller, so a
--   photo follows its post: hidden, signed_in or on an unpublished team, the
--   same people see both, and changing a post's visibility closes its photos on
--   the next request.
-- - The size and type limits are bucket settings because photos go straight
--   from the browser to Storage: no server code of ours runs on the way. A copy
--   inside Storage does not pass through those settings, so the write policies
--   hold the same limits (private.storage_file_allowed).
-- - A signed URL opens its file until it expires, whatever happens to the post
--   meanwhile. The site asks for 10 minutes. Someone who could read a photo may
--   have kept it anyway, so closing a post stops new readers, not past ones.
-- - The secret key is not used for any of this.
--
-- Paths: team-logos   {team_id}/{uuid}.{ext}
--        team-post-photos   {team_id}/{post_id}/{uuid}.{ext}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('team-logos', 'team-logos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('team-post-photos', 'team-post-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

-- The uuid in one folder of a path, or null when that folder is not a uuid. A
-- policy runs on every row, and a failed cast would break the whole request.
create function private.path_uuid(path text, part integer)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(path, '/', part) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then split_part(path, '/', part)::uuid
  end;
$$;

revoke execute on function private.path_uuid(text, integer)
  from public, anon, authenticated, service_role;
grant execute on function private.path_uuid(text, integer) to anon, authenticated;

-- Whether a file row is one the buckets would have taken. Storage fills in
-- metadata after an upload (null until then, when the bucket has already checked
-- the file), and a copy brings what its caller says.
create function private.storage_file_allowed(metadata jsonb, max_bytes bigint)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select metadata is null
    or (
      coalesce(metadata ->> 'mimetype' in ('image/jpeg', 'image/png', 'image/webp'), false)
      and case
        when metadata ->> 'size' ~ '^[0-9]{1,18}$' then (metadata ->> 'size')::bigint <= max_bytes
        else not (metadata ? 'size')
      end
    );
$$;

revoke execute on function private.storage_file_allowed(jsonb, bigint)
  from public, anon, authenticated, service_role;
grant execute on function private.storage_file_allowed(jsonb, bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- Post photos
-- ---------------------------------------------------------------------------

create policy team_post_photos_select_anon on storage.objects
  for select
  to anon
  using (
    bucket_id = 'team-post-photos'
    and exists (
      select 1 from public.team_posts as p
      where p.id = private.path_uuid(name, 2)
        and p.team_id = private.path_uuid(name, 1)
    )
  );

-- Team members also see files with no post row yet, and operators see every
-- file, so a failed upload or a deleted post's files can still be removed.
create policy team_post_photos_select_authenticated on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'team-post-photos'
    and (
      exists (
        select 1 from public.team_posts as p
        where p.id = private.path_uuid(name, 2)
          and p.team_id = private.path_uuid(name, 1)
      )
      or private.is_team_member(private.path_uuid(name, 1))
      or (select private.is_at_least('operator'))
    )
  );

create policy team_post_photos_insert_member on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'team-post-photos'
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
    and private.path_uuid(name, 2) is not null
    and private.storage_file_allowed(metadata, 5242880)
    and private.is_team_member(private.path_uuid(name, 1))
  );

create policy team_post_photos_delete_member_or_operator on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'team-post-photos'
    and (
      private.is_team_member(private.path_uuid(name, 1))
      or (select private.is_at_least('operator'))
    )
  );

-- ---------------------------------------------------------------------------
-- Logos
-- ---------------------------------------------------------------------------

-- Anyone can open a logo by address through the public bucket. This policy is
-- what lets a writer see the row while replacing or removing it.
create policy team_logos_select_member_or_operator on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'team-logos'
    and (
      private.is_team_member(private.path_uuid(name, 1))
      or (select private.is_at_least('operator'))
    )
  );

create policy team_logos_insert_member_or_operator on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'team-logos'
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
    and private.storage_file_allowed(metadata, 2097152)
    and (
      private.is_team_member(private.path_uuid(name, 1))
      or (select private.is_at_least('operator'))
    )
  );

create policy team_logos_update_member_or_operator on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'team-logos'
    and (
      private.is_team_member(private.path_uuid(name, 1))
      or (select private.is_at_least('operator'))
    )
  )
  with check (
    bucket_id = 'team-logos'
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
    and private.storage_file_allowed(metadata, 2097152)
    and (
      private.is_team_member(private.path_uuid(name, 1))
      or (select private.is_at_least('operator'))
    )
  );

create policy team_logos_delete_member_or_operator on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'team-logos'
    and (
      private.is_team_member(private.path_uuid(name, 1))
      or (select private.is_at_least('operator'))
    )
  );
