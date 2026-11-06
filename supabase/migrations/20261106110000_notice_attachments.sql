-- Photos and files attached to a notice.
--
-- - notice-files is public, like the notices themselves: anyone with the address can open a file, and
--   there is no way to take back a copy someone already saved. The form says so.
-- - Only document types an operator would hand out are allowed. Nothing a browser would run as a page
--   (HTML, SVG), and no archives, whose contents nobody can see before opening them.
-- - The site sends these with a download header, so a file saves under the name it was uploaded with.
--   That name lives in notices.attachments because a Storage path cannot hold Korean.
-- - The size and type limits are bucket settings because files go straight from the browser to
--   Storage. A copy inside Storage does not pass through those settings, so the write policy holds
--   the same limits (see 20261105100100_team_storage.sql).

create function private.valid_notice_photos(paths text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(cardinality(paths), 0) <= 4
    and not exists (
      select 1 from unnest(paths) as path
      where path !~ '^[0-9a-f-]{36}\.(jpg|png|webp)$'
    );
$$;

create function private.valid_notice_attachments(files jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(files) = 'array'
    and jsonb_array_length(files) <= 5
    and not exists (
      select 1 from jsonb_array_elements(files) as file
      where jsonb_typeof(file) <> 'object'
        or coalesce(file ->> 'path', '') !~ '^[0-9a-f-]{36}\.(pdf|hwp|hwpx|doc|docx|xls|xlsx|ppt|pptx)$'
        or char_length(coalesce(file ->> 'name', '')) not between 1 and 200
        or coalesce(file ->> 'size', '') !~ '^[0-9]{1,9}$'
    );
$$;

create function private.notice_file_allowed(metadata jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select metadata is null
    or (
      coalesce(metadata ->> 'mimetype' in (
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
        'application/x-hwp',
        'application/hwp+zip',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ), false)
      and case
        when metadata ->> 'size' ~ '^[0-9]{1,18}$' then (metadata ->> 'size')::bigint <= 10485760
        else not (metadata ? 'size')
      end
    );
$$;

revoke execute on function private.valid_notice_photos(text[])
  from public, anon, authenticated, service_role;
revoke execute on function private.valid_notice_attachments(jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function private.notice_file_allowed(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function private.valid_notice_photos(text[]) to authenticated, service_role;
grant execute on function private.valid_notice_attachments(jsonb) to authenticated, service_role;
grant execute on function private.notice_file_allowed(jsonb) to authenticated;

alter table public.notices
  add column photo_paths text[] not null default '{}',
  add column attachments jsonb not null default '[]',
  add constraint notices_photo_paths_valid check (private.valid_notice_photos(photo_paths)),
  add constraint notices_attachments_valid check (private.valid_notice_attachments(attachments));

grant insert (photo_paths, attachments), update (photo_paths, attachments)
  on table public.notices to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('notice-files', 'notice-files', true, 10485760, array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/x-hwp',
    'application/hwp+zip',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]);

-- Anyone can open a file by address through the public bucket. This policy is what lets an operator
-- see the row while removing it.
create policy notice_files_select_operator on storage.objects
  for select to authenticated
  using (bucket_id = 'notice-files' and (select private.is_at_least('operator')));

create policy notice_files_insert_operator on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'notice-files'
    and name ~ '^[0-9a-f-]{36}\.(jpg|png|webp|pdf|hwp|hwpx|doc|docx|xls|xlsx|ppt|pptx)$'
    and private.notice_file_allowed(metadata)
    and (select private.is_at_least('operator'))
  );

create policy notice_files_delete_operator on storage.objects
  for delete to authenticated
  using (bucket_id = 'notice-files' and (select private.is_at_least('operator')));
