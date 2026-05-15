# HersonBot

Private prototype for a Civ 6 multiplayer strategy assistant powered by curated transcript retrieval and timestamped citations.

## What is included

- Next.js App Router with TypeScript and Tailwind
- PostgreSQL + pgvector for vector similarity search
- Local Docker Postgres option via `docker compose up -d`
- Tiered trust pipeline: content must be reviewed and approved before the bot can answer from it
- YouTube transcript ingestion with chunking and timestamp tracking
- Human review queue at `/admin/review` — approve, reject, or classify each chunk
- Embedding trigger script — embeds approved chunks and publishes them to the bot
- Automated migration runner (`npm run migrate`)
- OpenAI-compatible chat and embedding clients (local Ollama by default, OpenAI fallback)
- `/api/chat` endpoint with source-grounded answers and timestamped citations
- Citations include content type (canon, speculation, joke, etc.) surfaced in bot answers
- `/admin/chunks` debug table and `/admin/review` review queue

## Setup

**1. Install dependencies**

```bash
npm install
```

**2. Start Postgres**

```bash
docker compose up -d
```

**3. Copy and configure `.env`**

```bash
cp .env.example .env
```

Set `DATABASE_URL` to point at your Postgres instance. Configure Ollama endpoints:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hersonbot

CHAT_BASE_URL=http://localhost:11434/v1
CHAT_MODEL=llama3
CHAT_API_KEY=ollama

EMBEDDING_BASE_URL=http://localhost:11434/v1
EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_API_KEY=ollama
```

**4. Run migrations**

```bash
npm run migrate
```

This applies all files in `db/migrations/` in order and tracks what has been applied. Safe to re-run — already-applied migrations are skipped.

**5. Pull required Ollama models**

```bash
ollama pull nomic-embed-text   # embeddings
ollama pull llama3             # chat / reasoning
```

**6. Start the app**

```bash
npm run dev
```

## Ingest a video

```bash
npm run ingest -- --url "https://www.youtube.com/watch?v=..." --title "Video title" --upload-date 2026-05-01
```

This fetches the transcript, chunks it into ~60-second segments, stores them as `needs_review`, and prints guidance to the review queue. **Chunks are not embedded or visible to the bot until approved.**

## Review and publish

1. Open `http://localhost:3000/admin/review`
2. For each chunk: set the content type (canon, speculation, joke, etc.), add optional notes, and approve or reject
3. After reviewing, embed and publish approved chunks:

```bash
npm run ingest:rag
```

This embeds all approved chunks and marks them `indexed`. Only indexed chunks are queryable by the bot.

## Content trust tiers

Every chunk must pass through these states before the bot can use it:

```
needs_review → approved → indexed
```

Rejected chunks are permanently excluded. The bot's retrieval query hard-filters `WHERE status = 'indexed'`.

## Scripts

| Command | Description |
|---|---|
| `npm run migrate` | Apply all pending migrations from `db/migrations/` |
| `npm run ingest` | Ingest a YouTube video — queues chunks for review |
| `npm run ingest:rag` | Embed approved chunks and publish them to the bot |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |

## What works

- YouTube transcript ingestion with `--url`, `--title`, `--upload-date` flags
- Human review queue with approve / reject / content type classification
- Embedding trigger that only processes approved content
- Retrieval filtered to indexed chunks only — unreviewed content is invisible to the bot
- Semantic search via pgvector with freshness boost and full-text fallback
- Source-grounded answers with timestamped YouTube citation links
- Content type (canon / speculation / joke) passed through to the LLM and citations
- Automated migration runner with applied-migration tracking

## What is stubbed

- Metadata fields (civ, leader, topic, advice type, BBG version) are stored but not auto-classified — they remain `null` until an agent fills them
- `knowledge_claims` table exists but has no write path yet
- Agent pipeline (Entity Extractor, Curator, Canon Judge, Orchestrator) is designed but not yet implemented — see `docs/RAG_ROADMAP.md`
- No auth on admin routes
- No playlist ingestion yet
- Discord, live stream ingestion, billing, and creator branding are future phases

## Next priorities

Issues 6–9 from `docs/RAG_ROADMAP.md`:

1. Entity Extractor agent — auto-tag civ, leader, characters, inside jokes from chunks
2. Knowledge Curator agent — extract discrete claims from chunks into `knowledge_claims`
3. Canon Judge agent — auto-classify content type and detect contradictions
4. Orchestrator agent — run the full pipeline from a single CLI command

## Architecture

See [`docs/RAG_ROADMAP.md`](./docs/RAG_ROADMAP.md) for the full multi-agent knowledge ingestion and RAG architecture, agent roles, data schemas, phased implementation plan, and GitHub issues backlog.

## Required AI Workflow Review

Before beginning AI-assisted implementation, debugging, refactoring, migration, or production fix work in this repository, review [docs/AI_WORKFLOW_GUARDRAILS.md](./docs/AI_WORKFLOW_GUARDRAILS.md).

Default behavior: smallest safe change, lowest blast radius, no unrelated file edits, no speculative rewrites, and explicit consideration of scale, queues, caching, indexes, retries, idempotency, rollback, and operational safety.
