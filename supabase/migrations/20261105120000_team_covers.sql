-- A team can choose the photo that opens its page.
--
-- - teams.cover_path holds it. Team members may change it: the guard on teams
--   only keeps the name, address, field, cohort and publishing from them.
-- - A cover is shown to everyone, whatever its team's posts say, so it lives in
--   a public bucket like a logo, with the size limit and types of a post photo.
-- - The write policies hold the same limits as the bucket, because a copy inside
--   Storage does not pass through the bucket's settings.

alter table public.teams
  add column cover_path text,
  -- The cover lives in this team's own folder.
  add constraint teams_cover_path_format
    check (cover_path ~ ('^' || id::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$'));

grant update (cover_path) on table public.teams to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('team-covers', 'team-covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

-- Anyone can open a cover by address through the public bucket. This policy is
-- what lets a writer see the row while removing it.
create policy team_covers_select_member_or_operator on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'team-covers'
    and (
      private.is_team_member(private.path_uuid(name, 1))
      or (select private.is_at_least('operator'))
    )
  );

create policy team_covers_insert_member_or_operator on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'team-covers'
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
    and private.storage_file_allowed(metadata, 5242880)
    and (
      private.is_team_member(private.path_uuid(name, 1))
      or (select private.is_at_least('operator'))
    )
  );

create policy team_covers_delete_member_or_operator on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'team-covers'
    and (
      private.is_team_member(private.path_uuid(name, 1))
      or (select private.is_at_least('operator'))
    )
  );
