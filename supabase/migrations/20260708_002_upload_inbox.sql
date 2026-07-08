-- v2.1 remote upload inbox: audio uploaded from the cloud app lands in a
-- private bucket + a queue row; the Mac's sync watcher downloads it, hands it
-- to the worker, and deletes the object immediately after a safe local write —
-- cloud storage holds audio for ~a minute, so hosting never balloons.

create table fs_upload_queue (
  id uuid primary key,                    -- minted client-side = the future recording id
  object_path text not null,              -- <user-id>/<recording-id>.<ext> in fs-inbox
  original_filename text not null,
  title text not null,
  status text not null default 'queued',  -- queued | downloaded | error
  error text,
  created_at timestamptz not null default now(),
  owner_id uuid not null default auth.uid()
);
alter table fs_upload_queue enable row level security;
create policy owner_all on fs_upload_queue for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create index fs_upload_queue_owner_idx on fs_upload_queue (owner_id, status);

-- Private inbox bucket, 50 MB per object (Supabase free-plan per-file cap).
insert into storage.buckets (id, name, public, file_size_limit)
values ('fs-inbox', 'fs-inbox', false, 52428800)
on conflict (id) do nothing;

-- Per-user folder policies: users touch only objects under their own uid/ prefix.
create policy fs_inbox_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'fs-inbox' and (storage.foldername(name))[1] = auth.uid()::text);
create policy fs_inbox_select on storage.objects for select to authenticated
  using (bucket_id = 'fs-inbox' and (storage.foldername(name))[1] = auth.uid()::text);
create policy fs_inbox_delete on storage.objects for delete to authenticated
  using (bucket_id = 'fs-inbox' and (storage.foldername(name))[1] = auth.uid()::text);
