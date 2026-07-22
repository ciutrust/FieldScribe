-- v2.2: carry the "boost distant audio" + forced-language choices through the
-- cloud upload inbox. The Mac's sync watcher reads these and sets
-- recordings.enhance_audio / forced_language locally, so a phone upload can
-- request the far-field enhancement and pin the language at upload time.
alter table fs_upload_queue
  add column if not exists enhance_audio boolean not null default false;
alter table fs_upload_queue
  add column if not exists forced_language text;
