import { embedText } from "./ai";
import { query } from "./db";

export type RetrievedChunk = {
  id: number;
  videoTitle: string;
  videoUrl: string;
  uploadDate: string | null;
  timestampStart: number;
  timestampEnd: number;
  cleanedText: string;
  metadata: Record<string, unknown>;
  confidence: number;
  freshnessScore: number;
  similarity: number | null;
};

export async function retrieveChunks(question: string, limit = 6) {
  const embedding = await embedText(question);

  if (embedding.length === 0) {
    return retrieveByText(question, limit);
  }

  const vector = `[${embedding.join(",")}]`;
  const result = await query<RetrievedChunk>(
    `
      select
        c.id,
        v.title as "videoTitle",
        v.url as "videoUrl",
        v.upload_date::text as "uploadDate",
        c.timestamp_start as "timestampStart",
        c.timestamp_end as "timestampEnd",
        c.cleaned_text as "cleanedText",
        c.metadata_json as metadata,
        c.confidence::float as confidence,
        c.freshness_score::float as "freshnessScore",
        (1 - (c.embedding <=> $1::vector))::float as similarity
      from transcript_chunks c
      join videos v on v.id = c.video_id
      where c.embedding is not null
      order by (c.embedding <=> $1::vector) - (c.freshness_score::float * 0.03) asc
      limit $2
    `,
    [vector, limit],
  );

  return result.rows;
}

async function retrieveByText(question: string, limit: number) {
  const result = await query<RetrievedChunk>(
    `
      select
        c.id,
        v.title as "videoTitle",
        v.url as "videoUrl",
        v.upload_date::text as "uploadDate",
        c.timestamp_start as "timestampStart",
        c.timestamp_end as "timestampEnd",
        c.cleaned_text as "cleanedText",
        c.metadata_json as metadata,
        c.confidence::float as confidence,
        c.freshness_score::float as "freshnessScore",
        null::float as similarity
      from transcript_chunks c
      join videos v on v.id = c.video_id
      order by ts_rank(to_tsvector('english', c.cleaned_text), plainto_tsquery('english', $1)) desc,
        c.freshness_score desc
      limit $2
    `,
    [question, limit],
  );

  return result.rows;
}
