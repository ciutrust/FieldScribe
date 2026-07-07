-- FieldScribe cloud mirror: fs_-prefixed tables on the shared FieldNotes
-- Supabase project. One-way sync from the Mac Studio (scripts/sync.mjs).
-- RLS follows FieldNotes' owner pattern (AGENTS.md / migration 20260708_007):
-- owner_id defaults to auth.uid(); app code never sets it; policy owner_all.

create table fs_recordings (
  id uuid primary key,
  title text not null,
  original_filename text not null,
  duration_sec double precision,
  language text,
  recorded_at timestamptz not null,
  updated_at timestamptz not null,
  synced_at timestamptz not null default now(),
  owner_id uuid not null default auth.uid()
);
alter table fs_recordings enable row level security;
create policy owner_all on fs_recordings for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create index fs_recordings_owner_idx on fs_recordings (owner_id, recorded_at desc);

create table fs_utterances (
  id bigint generated always as identity primary key,
  recording_id uuid not null references fs_recordings(id) on delete cascade,
  speaker_label text not null,
  start_sec double precision not null,
  end_sec double precision not null,
  text text not null,
  search tsvector generated always as (to_tsvector('simple', text)) stored,
  owner_id uuid not null default auth.uid()
);
alter table fs_utterances enable row level security;
create policy owner_all on fs_utterances for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create index fs_utterances_owner_idx on fs_utterances (owner_id);
create index fs_utterances_recording_idx on fs_utterances (recording_id, start_sec);
create index fs_utterances_search_idx on fs_utterances using gin (search);

create table fs_speakers (
  recording_id uuid not null references fs_recordings(id) on delete cascade,
  speaker_label text not null,
  display_name text,
  position int not null,
  owner_id uuid not null default auth.uid(),
  primary key (recording_id, speaker_label)
);
alter table fs_speakers enable row level security;
create policy owner_all on fs_speakers for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create index fs_speakers_owner_idx on fs_speakers (owner_id);

create table fs_summaries (
  recording_id uuid primary key references fs_recordings(id) on delete cascade,
  summary_md text not null,
  actions jsonb not null default '[]'::jsonb,
  model text not null,
  created_at timestamptz not null,
  owner_id uuid not null default auth.uid()
);
alter table fs_summaries enable row level security;
create policy owner_all on fs_summaries for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create index fs_summaries_owner_idx on fs_summaries (owner_id);

-- Full-text search over utterances. SECURITY INVOKER (default) so RLS applies
-- to the caller. ⟦ ⟧ markers match the app's client-side highlight protocol.
create or replace function fs_search(q text)
returns table (
  recording_id uuid,
  title text,
  recorded_at timestamptz,
  utterance_id bigint,
  start_sec double precision,
  speaker_label text,
  snippet text
)
language sql stable
set search_path = public
as $$
  select r.id, r.title, r.recorded_at, u.id, u.start_sec, u.speaker_label,
         ts_headline(
           'simple', u.text, websearch_to_tsquery('simple', q),
           'StartSel=⟦, StopSel=⟧, MaxWords=18, MinWords=8'
         )
  from fs_utterances u
  join fs_recordings r on r.id = u.recording_id
  where u.search @@ websearch_to_tsquery('simple', q)
  order by r.recorded_at desc, u.start_sec
  limit 60
$$;
