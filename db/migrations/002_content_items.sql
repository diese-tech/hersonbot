-- Tracks every source fed into the ingestion pipeline.
-- Replaces ad-hoc video tracking and provides status visibility across all source types.
create table if not exists content_items (
  id             bigserial primary key,
  source_type    text not null check (source_type in ('youtube', 'audio', 'document', 'notes', 'livestream')),
  source_url     text unique,
  source_title   text,
  creator        text not null default 'Herson',
  upload_date    date,
  language       text not null default 'en',
  status         text not null default 'queued'
                 check (status in (
                   'queued', 'transcribing', 'transcribed', 'cleaning', 'cleaned',
                   'curating', 'curated', 'reviewing', 'approved', 'rejected', 'indexed'
                 )),
  raw_transcript text,
  error_message  text,
  ingested_by    text,
  metadata_json  jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists content_items_status_idx on content_items(status);
create index if not exists content_items_creator_idx on content_items(creator);

-- Link chunks to their source content_item.
-- Nullable so existing chunks (pre-migration) remain valid.
alter table transcript_chunks
  add column if not exists content_item_id bigint references content_items(id) on delete set null;

-- Pipeline state for each chunk.
-- Existing rows default to 'indexed' — they are already embedded and live in the bot.
alter table transcript_chunks
  add column if not exists status text not null default 'indexed';

alter table transcript_chunks
  add column if not exists content_type text not null default 'unknown';

alter table transcript_chunks
  add column if not exists reviewed_by text;

alter table transcript_chunks
  add column if not exists reviewed_at timestamptz;

alter table transcript_chunks
  add column if not exists review_notes text;

-- Add check constraints separately so they can be named and are idempotent via do/nothing.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'transcript_chunks_status_check'
      and conrelid = 'transcript_chunks'::regclass
  ) then
    alter table transcript_chunks
      add constraint transcript_chunks_status_check
      check (status in ('needs_review', 'approved', 'rejected', 'indexed', 'superseded'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'transcript_chunks_content_type_check'
      and conrelid = 'transcript_chunks'::regclass
  ) then
    alter table transcript_chunks
      add constraint transcript_chunks_content_type_check
      check (content_type in ('canon', 'speculation', 'joke', 'meme', 'uncertain', 'unknown'));
  end if;
end$$;

create index if not exists transcript_chunks_status_idx on transcript_chunks(status);
create index if not exists transcript_chunks_content_item_idx on transcript_chunks(content_item_id);
