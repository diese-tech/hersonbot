# HersonBot MVP

## Working name
HersonBot / Civ 6 Multiplayer Build Order Assistant

## Product thesis
Players do not need another generic Civ 6 wiki. They need fast, context-aware multiplayer advice grounded in expert commentary, patch-aware meta, and timestamped source references.

The MVP should prove one thing:

> Can we turn expert Civ 6 multiplayer commentary into reliable, searchable build-order guidance with citations?

## MVP goal
Create a small, private prototype that ingests a limited set of Herson videos, extracts timestamped transcript chunks, stores them with useful Civ metadata, and answers early-game build-order questions with cited sources.

## AI/model direction
This project should be local-first for reasoning.

Default reasoning model:
- local Llama 3 or Llama 3-compatible model hosted from the user's homelab / local AI setup

Expected local model setup:
- model files may live under `C:\AI`
- the app should not depend on that path directly
- the model should be exposed through an API layer such as Ollama, LM Studio, text-generation-webui, or another OpenAI-compatible local endpoint

Recommended provider abstraction:

```env
CHAT_PROVIDER=local
CHAT_BASE_URL=http://localhost:11434/v1
CHAT_MODEL=llama3

EMBEDDING_PROVIDER=local
EMBEDDING_BASE_URL=http://localhost:11434
EMBEDDING_MODEL=nomic-embed-text

OPENAI_API_KEY=
DATABASE_URL=postgresql://...
```

OpenAI should be optional fallback only, not a hard dependency.

Important:
- use a dedicated embedding model for transcript search when possible
- do not assume the chat model can generate embeddings
- keep chat/reasoning provider and embedding provider separate

## Non-goals
- Do not clone Herson's voice or persona.
- Do not fine-tune a model on his content.
- Do not ingest the entire channel first.
- Do not build a public paid product before creator approval.
- Do not attempt perfect live-stream analysis in V1.

## MVP source scope
Start with 5-10 videos only.

Suggested source mix:
- 2 beginner/multiplayer guide videos
- 2 full multiplayer games with detailed commentary
- 1-2 recent BBG/meta update videos
- 1 civ-specific example video
- 1 early-war or tempo-focused video

## Core user questions
The assistant should handle questions like:

- "I am Germany on online speed, turn 15. What should I build next?"
- "When is double scout recommended?"
- "What changed in newer BBG advice about early settlers?"
- "What should I prioritize if I have close neighbors?"
- "What is the reasoning behind early monument vs builder?"

## Required capabilities

### 1. Transcript ingestion
Input a YouTube URL or small playlist and extract transcript text with timestamps.

Each transcript record should preserve:
- video title
- video URL
- upload date
- transcript timestamp start/end
- raw transcript text
- cleaned transcript text

### 2. Chunking
Split transcripts into useful knowledge chunks, not arbitrary giant blobs.

Preferred chunk size:
- 30-90 seconds of transcript, or
- one coherent advice segment

Each chunk should include source timestamp links.

### 3. Metadata tagging
Each chunk should support metadata fields:

- game: Civilization VI
- source_creator
- video_date
- video_url
- timestamp_start
- timestamp_end
- topic
- civ
- leader
- era
- turn_range
- map_context
- speed
- ruleset / patch / BBG version when known
- advice_type: opener, build_order, district_priority, war_timing, scouting, settling, economy, diplomacy, meta_update
- confidence
- freshness_score

### 4. Retrieval
Given a user question, retrieve relevant chunks by:
- semantic similarity
- topic metadata
- civ/leader metadata
- recency
- patch relevance

### 5. Answer generation
Answers must:
- use the local Llama 3 reasoning provider by default
- give a practical recommendation
- explain the reasoning briefly
- cite timestamped sources
- distinguish older advice from newer advice when relevant
- admit uncertainty when the retrieved evidence is weak

### 6. Contradiction handling
If two chunks conflict, prefer:
1. current patch / current BBG version
2. newer video date
3. repeated advice across multiple videos
4. more specific context match
5. higher-confidence reviewed chunk

## MVP UI
Keep it basic.

Option A: Discord bot
- `/ask` command
- returns recommendation + source links

Option B: Web app
- search/chat page
- citation cards
- simple admin review page

Recommended V1: web app first if building the knowledge engine; Discord can come after.

## Minimal database model

### videos
- id
- creator
- title
- url
- upload_date
- transcript_status
- created_at

### transcript_chunks
- id
- video_id
- timestamp_start
- timestamp_end
- raw_text
- cleaned_text
- embedding
- metadata_json
- confidence
- freshness_score
- created_at

### knowledge_claims
Optional but valuable after MVP.

- id
- chunk_id
- claim_text
- topic
- context
- status: active, outdated, contradicted, needs_review
- superseded_by_claim_id

## Success criteria
MVP is successful if:

- 5-10 videos are ingested successfully.
- User can ask at least 20 realistic early-game Civ 6 questions.
- Answers include timestamped citations.
- Newer relevant advice is preferred over older advice.
- The assistant refuses or hedges when evidence is weak.
- A reviewer can inspect and correct chunk metadata.
- Reasoning works through the local Llama 3 provider path.

## First build sequence
1. Create repo structure.
2. Build transcript ingestion script.
3. Store transcript chunks locally first.
4. Add local embeddings and vector search.
5. Add local Llama 3 chat/reasoning provider.
6. Add simple chat endpoint.
7. Add citation formatting.
8. Add metadata tagging pass.
9. Add admin review page.
10. Test against 20 seed questions.
11. Decide whether to pitch, pause, or productize.
