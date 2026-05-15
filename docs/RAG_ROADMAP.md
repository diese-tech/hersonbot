# HersonBot — Multi-Agent Knowledge Ingestion & RAG Roadmap

> **Status:** Architecture plan only. No code has been changed. This document is the design artifact.
>
> **Author:** Claude Code (claude-sonnet-4-6) · **Date:** 2026-05-15

---

## Executive Summary

HersonBot already has a working RAG foundation: YouTube transcripts are ingested, chunked, embedded via pgvector, and served through a Next.js chat API. The schema even has a stubbed `knowledge_claims` table waiting for a review workflow.

What it does not yet have is:

- A pipeline for non-YouTube sources (audio, notes, lore docs, live streams)
- Automated metadata enrichment (entities, topics, game fields)
- A content classification layer (canon vs. joke vs. speculation)
- Human-in-the-loop approval before content enters the RAG index
- A structured multi-agent ingestion workflow
- Monetization-ready architectural boundaries (multi-tenancy, auth, usage limits)

This roadmap designs all of that in three phased increments. The architecture is deliberately conservative in MVP and deliberately extensible in v1+. Everything is grounded in what the codebase currently contains — no new tech is introduced speculatively.

---

## 1. Current Repo Assessment

### 1.1 Tech Stack

| Layer | Current Choice | Notes |
|---|---|---|
| Frontend | Next.js 16 (App Router) | Chat UI + admin debug page |
| API | Next.js route handlers | `/api/chat` POST |
| Database | PostgreSQL 16 + pgvector | Vector similarity + FTS fallback |
| ORM | Raw SQL (parameterized) | `pg` driver |
| Embeddings | OpenAI-compatible (local or remote) | `nomic-embed-text` default |
| LLM | OpenAI-compatible (local or remote) | `llama3` local / `gpt-4o-mini` fallback |
| Ingestion | `scripts/ingest-youtube.ts` (CLI) | Manual, single-video |
| Chunking | `lib/chunking.ts` | ~60-second target segments |
| Retrieval | `lib/retrieval.ts` | Cosine similarity + freshness boost |
| Citations | `lib/citations.ts` | YouTube `?t=` timestamp URLs |

### 1.2 What Is Working

- Single-video YouTube transcript ingestion with timestamped chunks
- Vector search via pgvector with cosine similarity
- Freshness score decay (linear, 4-year window)
- Full-text search fallback when embeddings fail
- Citation-linked answers with source `[S1]`, `[S2]` markers
- Local-first AI (Ollama) with OpenAI fallback
- Debug admin page at `/admin/chunks`

### 1.3 What Is Stubbed But Incomplete

- `knowledge_claims` table: schema exists, no write path
- Metadata fields (civ, leader, topic, advice_type, era, etc.): stored as `NULL`; no auto-tagger
- `confidence` field: hardcoded `0.6` everywhere
- `freshness_score`: computed but not surfaced to reviewers

### 1.4 What Is Missing Entirely

- Audio/video transcription from non-YouTube sources
- Content classification (canon / joke / speculation / meme)
- Human review queue and approval gate
- Entity extraction (characters, games, recurring topics, inside jokes)
- Timeline construction
- Multi-source citation (not just YouTube timestamps)
- Lore documents / notes ingestion
- Quote and clip indexing
- Agent orchestration layer
- Any kind of auth or user management
- Monetization hooks (rate limits, API keys, subscriptions)

### 1.5 Key Strength to Preserve

The `metadata_json` JSONB column on `transcript_chunks` is a flexible extensibility point. Any agent enrichment can write into it without schema migrations. The formal schema migration path (adding typed columns) can follow once fields stabilize.

---

## 2. Recommended Architecture

### 2.1 Core Principle: Tiered Trust Pipeline

Content moves through trust tiers. It cannot jump tiers without explicit promotion:

```
RAW → PROCESSED → CURATED → APPROVED → INDEXED
```

- **RAW**: Unprocessed source (audio file, YouTube URL, notes file)
- **PROCESSED**: Transcribed and cleaned but not reviewed
- **CURATED**: Enriched with metadata, entities, classification
- **APPROVED**: A human (or Canon Judge with human fallback) has signed off
- **INDEXED**: Embedded and live in the RAG index; bot can answer from this

Only APPROVED content ever reaches the embedding step. This is the hard gate.

### 2.2 Ingestion Pipeline vs. Bot Layer

Two logical services share the same Postgres database but have different deployment cadences:

| Service | Role | Deployed As |
|---|---|---|
| **Ingestion Pipeline** | Source collection → processing → curation → approval queue | Background workers / CLI scripts / cron jobs |
| **Bot Layer** | Query → retrieval → answer → citations | Next.js app (existing) |

In MVP and v1, both live in the same repo as a monorepo. The ingestion workers run as CLI scripts or lightweight Node processes — not as part of the Next.js server. In a future phase, the ingestion pipeline can be extracted to a separate service.

### 2.3 Monorepo Folder Layout (Proposed)

```
hersonbot/
├── app/                          # Next.js frontend (existing)
│   ├── api/chat/route.ts
│   ├── admin/
│   │   ├── chunks/page.tsx
│   │   └── review/page.tsx       # NEW: human review queue UI
│   └── page.tsx
├── lib/                          # Shared library (existing + new)
│   ├── ai.ts
│   ├── db.ts
│   ├── retrieval.ts
│   ├── chunking.ts
│   ├── citations.ts
│   └── types.ts                  # NEW: shared TypeScript interfaces
├── agents/                       # NEW: agent implementations
│   ├── orchestrator.ts
│   ├── source-collector.ts
│   ├── transcription.ts
│   ├── cleaner.ts
│   ├── curator.ts
│   ├── canon-judge.ts
│   ├── entity-extractor.ts
│   ├── timeline-builder.ts
│   ├── quote-indexer.ts
│   ├── rag-ingestion.ts
│   └── evaluator.ts
├── scripts/                      # CLI entry points
│   ├── ingest-youtube.ts         # Existing (refactor to use agent pipeline)
│   ├── ingest-audio.ts           # NEW: audio file → Whisper → pipeline
│   ├── ingest-document.ts        # NEW: notes/lore markdown → pipeline
│   ├── run-review-queue.ts       # NEW: print pending review items
│   └── evaluate-rag.ts           # NEW: run evaluation set
├── db/
│   ├── schema.sql                # Existing (extend with new tables)
│   └── migrations/               # NEW: numbered migration files
│       ├── 001_initial.sql
│       ├── 002_content_items.sql
│       ├── 003_knowledge_claims.sql
│       └── 004_evaluation.sql
├── docs/
│   ├── MVP.md
│   ├── NORTH_STAR.md
│   ├── AI_WORKFLOW_GUARDRAILS.md
│   └── RAG_ROADMAP.md            # This file
├── eval/                         # NEW: evaluation dataset
│   ├── questions.jsonl
│   └── expected-citations.jsonl
├── docker-compose.yml
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 3. Text Architecture Diagram

```
╔══════════════════════════════════════════════════════════════════════╗
║                        INGESTION PIPELINE                           ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  [Source Collector Agent]                                            ║
║    │  Accepts: YouTube URL, audio file, transcript file, notes.md   ║
║    │  Validates: no credentials, no DMs, approved creators only     ║
║    ▼                                                                 ║
║  content_items table (status: 'queued')                              ║
║    │                                                                 ║
║    ▼                                                                 ║
║  [Transcription Agent]                                               ║
║    │  YouTube → youtube-transcript library                           ║
║    │  Audio → Whisper (local or API)                                 ║
║    │  Text/Markdown → passthrough                                    ║
║    ▼                                                                 ║
║  content_items (status: 'transcribed') + raw_transcript stored      ║
║    │                                                                 ║
║    ▼                                                                 ║
║  [Transcript Cleaner Agent]                                          ║
║    │  Removes filler words, auto-corrects known names               ║
║    │  Splits into candidate chunks (~60s or ~500 tokens)            ║
║    ▼                                                                 ║
║  transcript_chunks (cleaned_text, status: 'needs_review')           ║
║    │                                                                 ║
║    ├──────────────────────────────────────────────────────────┐      ║
║    ▼                                                          ▼      ║
║  [Entity Extractor Agent]                    [Quote/Clip Indexer]   ║
║    │  Characters, games, references            Notable quotes,       ║
║    │  Inside jokes, recurring topics           clip timestamps,      ║
║    │  Writes to: entities + metadata_json      quotable moments      ║
║    │                                                    │            ║
║    └──────────────────────────────────────────────────┘            ║
║    ▼                                                                 ║
║  [Knowledge Curator Agent]                                           ║
║    │  Extracts discrete claims from chunks                           ║
║    │  Tags: topic, advice_type, game, characters, era               ║
║    │  Sets initial confidence score                                  ║
║    ▼                                                                 ║
║  knowledge_claims (status: 'needs_review')                          ║
║    │                                                                 ║
║    ▼                                                                 ║
║  [Canon Judge Agent]                                                 ║
║    │  Classifies: canon | speculation | joke | meme | uncertain     ║
║    │  Detects contradictions with existing approved claims          ║
║    │  Flags for human review if: confidence < threshold OR          ║
║    │    content_type = 'uncertain' OR contradicts prior claim       ║
║    ▼                                                                 ║
║  ┌─────────────────────────────┐                                     ║
║  │     HUMAN REVIEW QUEUE      │ ← /admin/review UI                 ║
║  │  Reviewer approves/rejects  │                                     ║
║  │  edits claim text           │                                     ║
║  │  overrides classification   │                                     ║
║  └─────────────────────────────┘                                     ║
║    │                                                                 ║
║    ▼ (status: 'approved')                                            ║
║  [RAG Ingestion Agent]                                               ║
║    │  Embeds approved chunks                                         ║
║    │  Writes to transcript_chunks.embedding                         ║
║    │  Updates transcript_chunks.status → 'indexed'                  ║
║    ▼                                                                 ║
║  pgvector index (live, queryable)                                   ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
                              │
                   (Postgres shared DB)
                              │
╔══════════════════════════════════════════════════════════════════════╗
║                          BOT QUERY LAYER                            ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  User Question → /api/chat                                           ║
║    │                                                                 ║
║    ▼                                                                 ║
║  [Retrieval] pgvector similarity + freshness boost + FTS fallback   ║
║    │  Only queries chunks with status = 'indexed'                   ║
║    ▼                                                                 ║
║  Top-K chunks with citations (source URL + timestamp)               ║
║    │                                                                 ║
║    ▼                                                                 ║
║  [LLM Answer Generation]                                             ║
║    │  System prompt: ground in sources, admit uncertainty,          ║
║    │    distinguish canon from speculation                           ║
║    ▼                                                                 ║
║  Answer + [S1], [S2]... citations → User                            ║
║                                                                      ║
╠══════════════════════════════════════════════════════════════════════╣
║                    [Evaluation Agent] (offline)                     ║
║    Runs eval/questions.jsonl against live index                     ║
║    Checks: retrieval recall, citation accuracy, answer quality      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 4. Agent Roles

| Agent | Trigger | Inputs | Outputs | Human Gate? |
|---|---|---|---|---|
| **Orchestrator** | Manual CLI or cron | Source URL or file path | Queued pipeline run | No (entry point) |
| **Source Collector** | Orchestrator | URL or file path | `content_items` record (status: queued) | Optional allowlist check |
| **Transcription** | Source Collector done | `content_item` (video/audio/text) | Raw transcript text + timestamps | No |
| **Transcript Cleaner** | Transcription done | Raw transcript | Cleaned chunks in `transcript_chunks` | No |
| **Entity Extractor** | Cleaner done | Chunks | Entities + metadata tags in `entities` + `metadata_json` | No |
| **Quote/Clip Indexer** | Cleaner done | Chunks | Notable quote records in `quotes` table | Optional |
| **Knowledge Curator** | Entity Extractor done | Chunks + entities | `knowledge_claims` records (status: needs_review) | No |
| **Canon Judge** | Curator done | Claims | Content type classification + contradiction flags | **Yes — flags for human review** |
| **RAG Ingestion** | Human approval | Approved chunks | Embeddings + `status = 'indexed'` | **Requires approved status** |
| **Evaluation** | Manual or CI | `eval/questions.jsonl` + live index | Recall, precision, citation accuracy scores | No (automated) |

---

## 5. Extended Data Schemas

### 5.1 `content_items` (new table — replaces ad-hoc video tracking)

```sql
CREATE TABLE content_items (
  id              bigserial PRIMARY KEY,
  source_type     text NOT NULL CHECK (source_type IN ('youtube', 'audio', 'document', 'notes', 'livestream')),
  source_url      text,                       -- YouTube URL, file path, or external link
  source_title    text,
  creator         text NOT NULL DEFAULT 'Herson',
  upload_date     date,
  language        text DEFAULT 'en',
  status          text NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued','transcribing','transcribed','cleaning','cleaned',
                                    'curating','curated','reviewing','approved','rejected','indexed')),
  raw_transcript  text,                       -- stored before cleaning, never exposed to RAG
  error_message   text,                       -- last pipeline error if any
  ingested_by     text,                       -- which agent or user triggered
  metadata_json   jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```

### 5.2 `transcript_chunks` (extended — existing table)

New columns to add via migration:

```sql
ALTER TABLE transcript_chunks
  ADD COLUMN content_item_id bigint REFERENCES content_items(id) ON DELETE CASCADE,
  ADD COLUMN status text NOT NULL DEFAULT 'needs_review'
             CHECK (status IN ('needs_review','approved','rejected','indexed','superseded')),
  ADD COLUMN content_type text DEFAULT 'unknown'
             CHECK (content_type IN ('canon','speculation','joke','meme','uncertain','unknown')),
  ADD COLUMN reviewed_by text,               -- 'human:<name>' or 'agent:canon-judge'
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN review_notes text;
```

### 5.3 `knowledge_claims` (extended — existing table, currently unused)

```sql
-- Extend existing table
ALTER TABLE knowledge_claims
  ADD COLUMN content_type text DEFAULT 'unknown'
             CHECK (content_type IN ('canon','speculation','joke','meme','uncertain','unknown')),
  ADD COLUMN confidence numeric DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
  ADD COLUMN source_timestamp_start integer,  -- seconds into source video/audio
  ADD COLUMN source_timestamp_end   integer,
  ADD COLUMN source_url text,
  ADD COLUMN reviewed_by text,
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN review_notes text,
  ADD COLUMN tags text[] DEFAULT '{}';        -- free-form topic tags
```

### 5.4 `entities` (new table)

```sql
CREATE TABLE entities (
  id          bigserial PRIMARY KEY,
  name        text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('character','game','creator','location',
                                                    'meme','joke','event','series','other')),
  aliases     text[] DEFAULT '{}',
  description text,
  metadata_json jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE chunk_entities (
  chunk_id   bigint REFERENCES transcript_chunks(id) ON DELETE CASCADE,
  entity_id  bigint REFERENCES entities(id) ON DELETE CASCADE,
  confidence numeric DEFAULT 0.8,
  PRIMARY KEY (chunk_id, entity_id)
);
```

### 5.5 `quotes` (new table)

```sql
CREATE TABLE quotes (
  id              bigserial PRIMARY KEY,
  chunk_id        bigint REFERENCES transcript_chunks(id) ON DELETE CASCADE,
  quote_text      text NOT NULL,
  speaker         text,
  timestamp_start integer,
  timestamp_end   integer,
  source_url      text,
  tags            text[] DEFAULT '{}',
  content_type    text DEFAULT 'canon',
  status          text DEFAULT 'needs_review'
                  CHECK (status IN ('needs_review','approved','rejected')),
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

### 5.6 `timelines` (new table — future phase)

```sql
CREATE TABLE timeline_events (
  id          bigserial PRIMARY KEY,
  entity_id   bigint REFERENCES entities(id),
  event_date  text,           -- free-form; can be "Season 3 Episode 4" or "2024-03"
  event_text  text NOT NULL,
  source_chunk_id bigint REFERENCES transcript_chunks(id),
  confidence  numeric DEFAULT 0.7,
  status      text DEFAULT 'needs_review',
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

### 5.7 `evaluation_runs` (new table)

```sql
CREATE TABLE evaluation_runs (
  id              bigserial PRIMARY KEY,
  run_at          timestamptz NOT NULL DEFAULT now(),
  question        text NOT NULL,
  expected_chunks text[],         -- chunk IDs or source URLs expected in results
  retrieved_chunks text[],
  recall          numeric,
  precision_score numeric,
  answer          text,
  notes           text
);
```

### 5.8 Metadata JSON Schema (canonical shape)

All `metadata_json` columns follow this shape (extended from existing):

```json
{
  "source_creator":     "Herson",
  "source_type":        "youtube",
  "video_url":          "https://youtube.com/watch?v=...",
  "video_date":         "2026-01-15",
  "timestamp_start":    120,
  "timestamp_end":      180,
  "content_type":       "canon",
  "topic":              "opening-strategy",
  "game":               "Civilization VI",
  "characters":         ["Herson", "GuestName"],
  "inside_jokes":       ["the incident"],
  "confidence":         0.85,
  "freshness_score":    0.92,
  "pipeline_version":   "1.0.0",
  "agent_flags":        []
}
```

---

## 6. RAG Ingestion Workflow (Step-by-Step)

```
1. TRIGGER
   operator runs: npx tsx scripts/ingest-youtube.ts --url <url> --title <title>
   OR: Orchestrator agent receives a queued content_item

2. SOURCE COLLECTOR
   - Validate URL is from an allowed creator
   - Check content_items for duplicate URL (idempotent)
   - Insert content_item (status: queued)

3. TRANSCRIPTION
   - YouTube: call youtube-transcript library → array of {text, offset, duration}
   - Audio: call Whisper API/local → SRT or VTT with timestamps
   - Document: read file as raw text (no timestamps)
   - Update content_item (status: transcribed, raw_transcript: <text>)
   - raw_transcript is NEVER embedded directly — stored only for audit

4. CLEANING
   - Split into ~60-second or ~500-token chunks
   - Remove filler words, fix known name misspellings
   - Normalize whitespace and punctuation
   - Insert transcript_chunks (status: needs_review, cleaned_text set)

5. ENTITY EXTRACTION
   - For each chunk, call LLM with structured prompt:
     "Extract all named entities from this transcript segment: ..."
   - Parse JSON response: [{name, type, confidence}]
   - Upsert entities table
   - Insert chunk_entities associations
   - Update chunk metadata_json with characters, games, inside_jokes arrays

6. QUOTE INDEXING
   - For each chunk, call LLM with structured prompt:
     "Identify any quotable or memorable moments..."
   - Insert quotes records (status: needs_review)

7. KNOWLEDGE CURATION
   - For each chunk, call LLM with structured prompt:
     "Extract discrete factual claims or pieces of advice..."
   - Insert knowledge_claims (status: needs_review)

8. CANON JUDGMENT
   - For each claim, call LLM + rule-based checks:
     - Is this a joke or meme? (keyword list + LLM)
     - Does it contradict an existing approved claim?
     - Confidence score above threshold (0.75)?
   - Assign content_type: canon | speculation | joke | meme | uncertain
   - If AUTO-APPROVE criteria met: mark as approved, set reviewed_by = 'agent:canon-judge'
   - Otherwise: leave status = needs_review → enters human queue

   AUTO-APPROVE criteria (conservative for MVP):
   - confidence >= 0.85
   - content_type = 'canon'
   - No contradictions detected
   - chunk is from a known-good creator

9. HUMAN REVIEW (for anything not auto-approved)
   - Reviewer opens /admin/review
   - Sees pending chunks + claims with metadata, content_type, confidence
   - Can: approve, reject, edit claim text, override content_type, add notes
   - On approve: status → 'approved', reviewed_by → 'human:<name>', reviewed_at set

10. RAG INGESTION (triggered after approval)
    - Query: SELECT all transcript_chunks WHERE status = 'approved' AND embedding IS NULL
    - Embed cleaned_text via embedding client
    - Store embedding in transcript_chunks.embedding
    - Update status → 'indexed'
    - Log to evaluation_runs baseline

11. LIVE IN BOT
    - Retrieval query filters: WHERE status = 'indexed'
    - All other statuses are invisible to the bot
```

---

## 7. Bot Query Workflow

```
User submits question via /api/chat
  │
  ▼
1. VALIDATE
   - Zod: 3–1000 chars (existing)
   - Optional: rate limit check (by IP or API key — future)

2. EMBED QUESTION
   - Call embedding client with question text
   - If embedding fails: fall through to FTS

3. RETRIEVE
   - pgvector cosine similarity: embedding <=> chunk.embedding
   - Filter: chunk.status = 'indexed'
   - Apply freshness boost: distance - (freshness_score * 0.03)
   - Return top-K (default: 6)
   - Fallback: English FTS if no vectors available

4. CLASSIFY RETRIEVED CONTENT
   - Include content_type in context to LLM
   - Prompt: "Some sources are marked as [joke] or [speculation] —
              distinguish these clearly in your answer"

5. BUILD CONTEXT
   - For each chunk: "[S{n}] {title} @ {timestamp}\n{cleaned_text}\n[type: {content_type}]"

6. GENERATE ANSWER
   - System prompt (existing + augmented):
     "You are HersonBot... ground answers only in provided sources...
      Clearly note when a source is speculation or humor rather than canon...
      Include [S1], [S2]... citations..."
   - Temperature: 0.2
   - Model: local LLM or OpenAI fallback

7. FORMAT CITATIONS
   - Map chunk → timestamped source URL
   - For non-video sources: link to document with section reference

8. RETURN
   { answer: string, citations: Citation[], content_types: string[] }
```

---

## 8. Human Review Workflow

The human review queue lives at `/admin/review`. Access is unauthed in MVP (local-only), gated by simple token in v1.

### Review Item Display

Each review card shows:
- Source video/doc title + link
- Timestamp range (with click-to-seek link)
- Raw vs. cleaned text (diff view)
- Proposed content_type (canon/speculation/joke/meme/uncertain)
- Confidence score
- Any extracted claims
- Any detected contradictions with existing approved content
- Entity tags

### Reviewer Actions

| Action | Effect |
|---|---|
| **Approve** | `status → approved`, `reviewed_by = human:X`, `reviewed_at = now()` |
| **Reject** | `status → rejected`, item never indexed |
| **Edit & Approve** | Reviewer edits `cleaned_text` or `claim_text`, then approves |
| **Override Type** | Change content_type before approving |
| **Flag** | Add review note, leave status = needs_review for second opinion |
| **Supersede** | Mark as superseding an older claim (updates `superseded_by_claim_id`) |

### Approval Triggers RAG Indexing

After a human approves a chunk, a background process (or the next manual run of `scripts/ingest-rag.ts`) picks up all `status = approved, embedding IS NULL` chunks and embeds them.

---

## 9. Source & Timestamp Citation Strategy

All citations must preserve the chain: **source → timestamp → chunk → claim**.

### Citation Record Shape

```typescript
interface Citation {
  id: string;              // "S1", "S2", etc.
  title: string;           // video/doc title
  url: string;             // deep-link with timestamp
  timestamp: string;       // "mm:ss" display
  timestampSeconds: number;// raw seconds for programmatic use
  contentType: string;     // "canon" | "speculation" | "joke" | etc.
  text: string;            // chunk excerpt shown to user
  sourceType: string;      // "youtube" | "audio" | "document"
}
```

### URL Construction per Source Type

| Source Type | URL Format |
|---|---|
| YouTube | `{video_url}?t={timestamp_start}s` |
| Audio file | `{source_url}#t={timestamp_start}` (if hosted) |
| Document | `{source_url}#{anchor}` or line reference |
| Notes | Internal admin link to chunk ID |

### What Must Always Be Cited

- Any factual claim → [S{n}] inline
- Any speculative claim → "[S{n}] (speculation)"
- Any joke/meme reference → "[S{n}] (humor)"

---

## 10. MVP Phase

> **Goal:** Get a human-reviewed RAG pipeline working for YouTube content only. No agents yet — just the pipeline structure and review UI.

### Scope

- [x] YouTube ingestion (already done)
- [ ] `content_items` table migration
- [ ] Extend `transcript_chunks` with `status`, `content_type`, `reviewed_by` columns
- [ ] Admin review UI at `/admin/review` (list pending chunks, approve/reject actions)
- [ ] Filter retrieval to `status = 'indexed'` only
- [ ] Manual embedding trigger after approval
- [ ] Basic content_type display in bot answers ("note: this is marked as speculation")
- [ ] Seed 10–20 videos, manually review, mark as indexed

### Not in MVP

- No audio ingestion
- No entity extraction
- No agent orchestration
- No auth
- No evaluation runner

### Success Criteria

- At least 10 videos ingested and reviewed
- Bot answers grounded in approved content only
- Citations link to correct timestamps
- Reviewer can approve/reject from UI without touching the database directly

---

## 11. v1 Phase

> **Goal:** Automated multi-source ingestion with agent-assisted curation and entity extraction. Human review queue becomes the exception, not the rule.

### New Capabilities

- Audio file ingestion via Whisper
- Markdown/notes document ingestion
- Entity Extractor agent (LLM-based, structured output)
- Knowledge Curator agent (claim extraction)
- Canon Judge agent (auto-approve high-confidence canon content)
- Quote/Clip Indexer agent
- Orchestrator agent (CLI + optional cron)
- `/admin/review` shows: chunks, claims, entities, quotes
- Simple token-based auth for admin routes
- Evaluation runner with baseline JSONL dataset
- Source type display in citations

### Agent Implementation Approach (v1)

Agents are TypeScript functions/classes in `agents/`. They are called sequentially by the orchestrator. No message queue yet — the orchestrator is a CLI process that awaits each step.

```typescript
// agents/orchestrator.ts
async function runPipeline(contentItemId: bigint) {
  await transcriptionAgent.run(contentItemId);
  await cleanerAgent.run(contentItemId);
  await entityExtractorAgent.run(contentItemId);
  await quoteIndexerAgent.run(contentItemId);
  await knowledgeCuratorAgent.run(contentItemId);
  await canonJudgeAgent.run(contentItemId);
  // RAG ingestion runs separately after human review
}
```

### v1 Success Criteria

- 50+ sources ingested across YouTube + audio + documents
- Auto-approval rate >60% (Canon Judge handles most)
- Human review queue stays manageable (<20 pending items at any time)
- Evaluation recall @6 >0.7 on a 50-question test set
- Entity extraction identifies characters and games correctly >80% of the time

---

## 12. Future Phase

> **Goal:** Scalable, monetization-ready, multi-creator knowledge platform.

### Features

- **Timeline Builder agent**: constructs event timelines from approved claims
- **Conflict Resolver agent**: detects and surfaces contradictions between claims over time
- **Live stream ingestion**: real-time transcript capture and queued ingestion
- **Multi-creator support**: content_items.creator field gates per-creator knowledge bases
- **User auth**: NextAuth.js or Clerk for reviewer accounts
- **API key system**: rate-limited API access for bot integrations (Discord, Telegram, etc.)
- **Subscription tier**: public bot (limited queries) vs. supporter bot (unlimited + source links)
- **Webhook ingestion**: creator submits a URL and pipeline auto-runs
- **Message queue**: BullMQ or pg_boss for async agent orchestration (replace sync CLI)
- **Separate ingestion service**: extract `agents/` into a standalone worker process
- **Discord/Telegram bot**: thin adapter calling `/api/chat` with API key
- **Clip/highlight export**: retrieve quote records and export timestamped clips

### Monetization-Relevant Architecture Concerns

1. **Data ownership**: Creator content must stay segregated. Per-creator knowledge base isolation (via `creator` column filter on all queries) is cheap to add and critical for trust.
2. **Rate limiting**: Add per-IP or per-API-key limits on `/api/chat` before any public exposure. Redis or pg-based token bucket.
3. **Cost control**: Embedding calls are the main cost driver. Batch embed on approval (already the design), never on query. Cache embeddings — never recompute for identical text.
4. **Content liability**: The human review gate is your legal protection. Never auto-index content without either human approval or explicit creator opt-in policy.
5. **Source attribution**: Timestamped citations are a competitive differentiator. Preserve them at all costs — they make answers verifiable and build trust.
6. **Model portability**: The OpenAI-compatible abstraction is already in place. Do not hardcode OpenAI — local LLM support is a cost lever and a privacy lever.

---

## 13. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Transcription quality degrades on noisy audio | Medium | Human review gate catches errors; confidence scoring |
| Canon Judge auto-approves something incorrect | High | Set auto-approve threshold conservatively (0.85+); spot-check regularly |
| Duplicate content inflates retrieval results | Medium | Deduplication by source URL + timestamp range |
| Old advice contradicts new (game patches) | High | `freshness_score` decay + supersede mechanism in knowledge_claims |
| Embedding model changes invalidate index | High | Version-tag embeddings in metadata; re-embed on model change |
| Raw transcripts contain private information | Critical | `raw_transcript` column never embedded; review policy; gitignore any local transcript files |
| Review queue grows faster than reviewer can handle | Medium | Auto-approve high-confidence items; prioritize queue by recency |
| LLM hallucination in curation agents | High | Agents use structured output with validation; human review is the final gate |
| YouTube transcript availability varies | Medium | `transcript_status = 'empty'` already handled; add Whisper fallback for empty videos |

---

## 14. GitHub Issues for Future Implementation

The following issues should be created and assigned to Codex for implementation after this roadmap is reviewed and approved:

```
Issue 1: [Schema] Add content_items table and migrate videos table
  - Create db/migrations/002_content_items.sql
  - Add status, content_type, reviewed_by, reviewed_at columns to transcript_chunks
  - Update ingest-youtube.ts to use content_items

Issue 2: [Admin] Build /admin/review human review queue UI
  - List chunks with status = 'needs_review'
  - Approve / reject / edit actions
  - Show content_type, confidence, source link

Issue 3: [Retrieval] Filter retrieval to status = 'indexed' only
  - Update lib/retrieval.ts query to add WHERE status = 'indexed'
  - Add migration to mark all existing chunks as 'indexed' (backfill)

Issue 4: [Ingestion] Manual RAG embedding trigger script
  - scripts/ingest-rag.ts: embed all approved, un-embedded chunks
  - Called by reviewer after approving items

Issue 5: [API] Expose content_type in /api/chat response
  - Include chunk.content_type in retrieval result
  - Include in citation object
  - Update system prompt to distinguish canon/speculation/joke

Issue 6: [Agent] Implement Entity Extractor agent
  - agents/entity-extractor.ts
  - Structured LLM prompt → JSON entity list
  - Upsert entities table + chunk_entities

Issue 7: [Agent] Implement Knowledge Curator agent
  - agents/curator.ts
  - Structured LLM prompt → claim list
  - Insert knowledge_claims (status: needs_review)

Issue 8: [Agent] Implement Canon Judge agent
  - agents/canon-judge.ts
  - Classify content_type, detect contradictions
  - Auto-approve if confidence >= 0.85 and no contradictions

Issue 9: [Agent] Implement Orchestrator agent
  - agents/orchestrator.ts
  - Sequential pipeline runner
  - CLI entry: scripts/run-pipeline.ts --content-item-id <id>

Issue 10: [Ingestion] Audio file ingestion via Whisper
  - scripts/ingest-audio.ts
  - Accepts local .mp3/.wav path
  - Calls Whisper API or local Whisper binary
  - Outputs transcript with timestamps

Issue 11: [Ingestion] Markdown/notes document ingestion
  - scripts/ingest-document.ts
  - Parses markdown into chunks (by heading or paragraph)
  - No timestamps; uses document section as citation anchor

Issue 12: [Eval] Evaluation runner and baseline dataset
  - eval/questions.jsonl with 50 test questions
  - scripts/evaluate-rag.ts: runs questions, computes recall@6
  - Writes results to evaluation_runs table

Issue 13: [Schema] Add entities and quotes tables
  - db/migrations/003_entities_quotes.sql
  - entities, chunk_entities, quotes tables

Issue 14: [Admin] Add quote browser to admin UI
  - /admin/quotes: list pending quotes, approve/reject

Issue 15: [Auth] Token-based admin route protection
  - Middleware: check ADMIN_TOKEN header/cookie
  - Applies to all /admin/* routes
```

---

## 15. Clear Next Action

**Before writing any code**, complete this checklist in order:

1. **Review this document** — confirm the agent roles, schema design, and tiered trust pipeline match your vision for HersonBot's content scope (Civ VI only vs. broader creator content)
2. **Clarify content scope** — is the knowledge base Civ VI strategy only, or does it include lore, jokes, characters, and general creator content across games/shows?
3. **Decide on auto-approve policy** — confirm the 0.85 confidence threshold for Canon Judge auto-approval feels right (can be tuned later, but set expectations now)
4. **Seed review queue** — run the existing `ingest-youtube.ts` on 5–10 videos to populate `transcript_chunks`, then begin GitHub Issue 2 (the review UI) so you can see what you're working with
5. **Create GitHub Issues 1–5** — these are the MVP issues; they unlock the human review workflow and retrieval filtering without any agents yet

The first code change should be **Issue 1 (schema migration)** followed by **Issue 2 (review UI)**. Everything else builds on those.
