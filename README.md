# HersonBot

Private MVP for a Civ 6 multiplayer strategy assistant powered by transcript retrieval and timestamped citations.

## What is included

- Next.js App Router scaffold with TypeScript and Tailwind
- Railway-ready Postgres connection through `DATABASE_URL`
- Local Docker Postgres option using `pgvector/pgvector`
- Plain SQL schema for `videos`, `transcript_chunks`, and optional `knowledge_claims`
- pgvector similarity retrieval with a small freshness boost
- YouTube transcript ingestion script
- Transcript chunking utilities
- OpenAI-compatible chat and embedding clients
- Minimal `/api/chat` endpoint
- Citation formatting with timestamped YouTube links
- Basic chat page and `/admin/chunks` debug table

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and set `DATABASE_URL`.

3. Start local Postgres if Railway is unavailable:

```bash
docker compose up -d
```

4. Apply the schema:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

5. Configure local model endpoints or OpenAI fallback:

```env
CHAT_BASE_URL=http://localhost:11434/v1
CHAT_MODEL=llama3
EMBEDDING_BASE_URL=http://localhost:11434/v1
EMBEDDING_MODEL=nomic-embed-text
```

6. Run the app:

```bash
npm run dev
```

## Ingest a video

```bash
npm run ingest -- --url "https://www.youtube.com/watch?v=..." --title "Video title" --creator Herson --upload-date 2026-05-01
```

The ingestion script fetches the transcript, chunks it into roughly 60-second segments, embeds each chunk, and stores timestamp metadata for citations.

## What works

- Manual ingestion of individual YouTube videos with transcript availability
- Timestamped chunk storage in Postgres
- Semantic retrieval over `transcript_chunks.embedding`
- Recency weighting when relevance is similar
- Source-grounded chat responses with citations
- Debug browsing of stored chunks

## What is stubbed

- Metadata fields such as civ, leader, topic, BBG version, and advice type are stored but not auto-classified yet
- `knowledge_claims` exists for later review workflows but is not populated
- The UI is intentionally minimal and has no auth
- Discord, billing, live stream ingestion, creator branding, and agents are not included

## Next priorities

1. Add a metadata tagging pass for civ, leader, topic, advice type, ruleset, and patch/BBG hints.
2. Seed 5-10 videos and test against realistic early-game Civ 6 questions.
3. Add reviewer edits for chunk metadata.
4. Add better conflict handling for old versus new advice.
5. Add a tiny evaluation set for retrieval and citation quality.

## Required AI Workflow Review

Before beginning AI-assisted implementation, debugging, refactoring, migration, or production fix work in this repository, review [docs/AI_WORKFLOW_GUARDRAILS.md](./docs/AI_WORKFLOW_GUARDRAILS.md).

Default behavior: smallest safe change, lowest blast radius, no unrelated file edits, no speculative rewrites, and explicit consideration of scale, queues, caching, indexes, retries, idempotency, rollback, and operational safety.
