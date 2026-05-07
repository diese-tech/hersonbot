# HersonBot

Private MVP for a Civ 6 multiplayer strategy assistant powered by transcript retrieval and timestamped citations.

## Goals
- Ingest YouTube transcripts
- Chunk + embed strategy advice
- Retrieve relevant multiplayer guidance
- Prefer newer meta-aware advice
- Return timestamped citations

## Stack
- Next.js
- TypeScript
- Supabase + pgvector
- OpenAI embeddings/chat

## Planned structure

```text
/app
/components
/lib
/scripts
/supabase
/docs
```

## MVP status
Initial scaffold only.

## Next steps
1. Initialize Next.js app
2. Add Supabase schema
3. Build ingestion pipeline
4. Add embeddings
5. Add retrieval endpoint
6. Add minimal chat UI
