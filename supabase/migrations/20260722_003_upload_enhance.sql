-- v2.2: carry the "boost distant audio" choice through the cloud upload inbox.
-- The Mac's sync watcher reads this and sets recordings.enhance_audio locally,
-- so a phone upload can request the far-field enhancement at upload time.
alter table fs_upload_queue
  add column if not exists enhance_audio boolean not null default false;
