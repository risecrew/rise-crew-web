-- The club decided against a notice board (2026-11-10), so it goes from the database too: the table,
-- the functions its checks used, the notice-files bucket and the policies on it. Activities stay.
--
-- Storage refuses deleting its rows with SQL, because the files behind them would stay behind with
-- nothing pointing at them. So the bucket is removed only when it holds no file; a project that still
-- has notice files keeps the bucket (now with no policy, so nobody but the secret key reaches it) until
-- someone empties it in the dashboard.

drop policy if exists notice_files_select_approved on storage.objects;
drop policy if exists notice_files_select_operator on storage.objects;
drop policy if exists notice_files_insert_operator on storage.objects;
drop policy if exists notice_files_delete_operator on storage.objects;

do $$
begin
  if not exists (select 1 from storage.objects where bucket_id = 'notice-files') then
    perform set_config('storage.allow_delete_query', 'true', true);
    delete from storage.buckets where id = 'notice-files';
  end if;
end;
$$;

drop table if exists public.notices;

drop function if exists private.valid_notice_photos(text[]);
drop function if exists private.valid_notice_attachments(jsonb);
drop function if exists private.notice_file_allowed(jsonb);
