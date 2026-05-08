import "dotenv/config";
import { YoutubeTranscript } from "youtube-transcript";
import { embedText } from "@/lib/ai";
import { chunkTranscript, type TranscriptLine } from "@/lib/chunking";
import { closePool, query } from "@/lib/db";

type Args = {
  url: string;
  title: string;
  creator: string;
  uploadDate?: string;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const transcript = await YoutubeTranscript.fetchTranscript(args.url);
  const lines = transcript.map((line) => ({
    text: line.text,
    offset: line.offset,
    duration: line.duration,
  })) satisfies TranscriptLine[];

  const chunks = chunkTranscript(lines);
  const video = await upsertVideo(args, chunks.length);
  await query("delete from transcript_chunks where video_id = $1", [video.id]);

  for (const chunk of chunks) {
    const embedding = await embedText(chunk.cleanedText);
    await query(
      `
        insert into transcript_chunks (
          video_id,
          timestamp_start,
          timestamp_end,
          raw_text,
          cleaned_text,
          embedding,
          metadata_json,
          confidence,
          freshness_score
        )
        values ($1, $2, $3, $4, $5, $6::vector, $7::jsonb, $8, $9)
      `,
      [
        video.id,
        chunk.timestampStart,
        chunk.timestampEnd,
        chunk.rawText,
        chunk.cleanedText,
        embedding.length > 0 ? `[${embedding.join(",")}]` : null,
        JSON.stringify(baseMetadata(args, chunk.timestampStart, chunk.timestampEnd)),
        0.6,
        freshnessScore(args.uploadDate),
      ],
    );
  }

  console.log(`Ingested ${chunks.length} chunks for ${args.title}.`);
  await closePool();
}

async function upsertVideo(args: Args, chunkCount: number) {
  const result = await query<{ id: number }>(
    `
      insert into videos (creator, title, url, upload_date, transcript_status)
      values ($1, $2, $3, $4, $5)
      on conflict (url)
      do update set
        creator = excluded.creator,
        title = excluded.title,
        upload_date = excluded.upload_date,
        transcript_status = excluded.transcript_status
      returning id
    `,
    [
      args.creator,
      args.title,
      args.url,
      args.uploadDate ?? null,
      chunkCount > 0 ? "ready" : "empty",
    ],
  );

  return result.rows[0];
}

function baseMetadata(args: Args, timestampStart: number, timestampEnd: number) {
  return {
    game: "Civilization VI",
    source_creator: args.creator,
    video_date: args.uploadDate ?? null,
    video_url: args.url,
    timestamp_start: timestampStart,
    timestamp_end: timestampEnd,
    topic: null,
    civ: null,
    leader: null,
    era: null,
    turn_range: null,
    map_context: null,
    speed: null,
    ruleset: null,
    advice_type: null,
    confidence: 0.6,
    freshness_score: freshnessScore(args.uploadDate),
  };
}

function freshnessScore(uploadDate?: string) {
  if (!uploadDate) {
    return 0.5;
  }

  const ageDays = Math.max(
    0,
    (Date.now() - new Date(uploadDate).getTime()) / 1000 / 60 / 60 / 24,
  );

  return Math.max(0.1, Math.min(1, 1 - ageDays / 1460));
}

function parseArgs(argv: string[]): Args {
  const values = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]?.replace(/^--/, "");
    const value = argv[index + 1];

    if (key && value) {
      values.set(key, value);
    }
  }

  const url = values.get("url");
  const title = values.get("title") || url;

  if (!url || !title) {
    throw new Error(
      "Usage: npm run ingest -- --url <youtube-url> --title <title> [--creator Herson] [--upload-date YYYY-MM-DD]",
    );
  }

  return {
    url,
    title,
    creator: values.get("creator") || "Herson",
    uploadDate: values.get("upload-date"),
  };
}

main().catch(async (error) => {
  console.error(error);
  await closePool();
  process.exit(1);
});
