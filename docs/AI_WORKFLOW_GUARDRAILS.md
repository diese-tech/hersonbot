# AI Workflow Guardrails

Review this document before implementation, debugging, refactoring, migrations, or production fixes in this repository.

## Core Rule

Move fast, but move surgically. Prefer the smallest safe change that solves the measured problem. Avoid broad rewrites, speculative refactors, or unrelated cleanup.

## Repo-Specific Focus

- Scale transcript ingestion deliberately.
- Prefer queue-based processing for parsing and embedding jobs.
- Make parsing, embedding, and import jobs retry-safe.
- Deduplicate transcripts, chunks, embeddings, and source records.
- Prefer append-only ingestion patterns before derived projections.
- Cache and project reads where retrieval paths can become hot.
- Avoid synchronous fan-out and token/compute waste.
- Keep large transcript imports operationally safe and observable.

## Required Before Changing Code

- Identify the specific problem and files likely involved.
- Name the expected impact and rollback path.
- Check whether the change affects ingestion, embeddings, retrieval, model calls, user data, data integrity, or production operations.
- Avoid touching unrelated files.

## Architecture Defaults

- Prefer queue-based async processing over synchronous fan-out.
- Prefer append-only raw ingestion records before derived embeddings or summaries.
- Prefer stable dedupe keys and indexed lookups.
- Prefer bounded concurrency, batching, and backoff.
- Prefer idempotent and retry-safe jobs.

## Change Review Checklist

Before finalizing a change, answer what changed, why it is safe, what could break, how to roll back, and what validation proves the change.
