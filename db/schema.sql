create extension if not exists vector;

create table if not exists videos (
  id bigserial primary key,
  creator text not null default 'Herson',
  title text not null,
  url text not null unique,
  upload_date date,
  transcript_status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists transcript_chunks (
  id bigserial primary key,
  video_id bigint not null references videos(id) on delete cascade,
  timestamp_start integer not null,
  timestamp_end integer not null,
  raw_text text not null,
  cleaned_text text not null,
  embedding vector,
  metadata_json jsonb not null default '{}'::jsonb,
  confidence numeric not null default 0.6,
  freshness_score numeric not null default 0.5,
  created_at timestamptz not null default now()
);

create table if not exists knowledge_claims (
  id bigserial primary key,
  chunk_id bigint not null references transcript_chunks(id) on delete cascade,
  claim_text text not null,
  topic text,
  context jsonb not null default '{}'::jsonb,
  status text not null default 'needs_review',
  superseded_by_claim_id bigint references knowledge_claims(id),
  created_at timestamptz not null default now()
);

create index if not exists transcript_chunks_video_id_idx on transcript_chunks(video_id);
create index if not exists transcript_chunks_metadata_idx on transcript_chunks using gin (metadata_json);
create index if not exists transcript_chunks_cleaned_text_idx on transcript_chunks using gin (to_tsvector('english', cleaned_text));
create index if not exists videos_upload_date_idx on videos(upload_date desc nulls last);
