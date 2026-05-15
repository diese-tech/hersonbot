import { query } from "@/lib/db";
import Link from "next/link";
import { approveChunk, rejectChunk } from "./actions";
import { timestampUrl } from "@/lib/citations";

type PendingChunk = {
  id: number;
  videoTitle: string;
  videoUrl: string;
  timestampStart: number;
  timestampEnd: number;
  cleanedText: string;
  confidence: number;
  freshnessScore: number;
  createdAt: string;
};

export const dynamic = "force-dynamic";

const CONTENT_TYPES = [
  { value: "unknown", label: "Unknown" },
  { value: "canon", label: "Canon" },
  { value: "speculation", label: "Speculation" },
  { value: "joke", label: "Joke" },
  { value: "meme", label: "Meme" },
  { value: "uncertain", label: "Uncertain" },
];

export default async function ReviewPage() {
  const result = await loadPending();

  return (
    <main className="min-h-screen bg-[#f7f5ef] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 flex items-center justify-between border-b border-[#d8d1c3] pb-4">
          <div>
            <h1 className="text-2xl font-semibold">Review queue</h1>
            {"count" in result && (
              <p className="mt-1 text-sm text-[#5d625f]">
                {result.count} chunk{result.count !== 1 ? "s" : ""} pending review
              </p>
            )}
          </div>
          <div className="flex gap-4 text-sm font-medium text-[#355f8a]">
            <Link href="/admin/chunks">Chunks</Link>
            <Link href="/">Chat</Link>
          </div>
        </header>

        {"error" in result ? (
          <div className="rounded border border-[#d8d1c3] bg-white p-5 text-sm leading-6 text-[#5d625f]">
            {result.error}
          </div>
        ) : result.rows.length === 0 ? (
          <div className="rounded border border-[#d8d1c3] bg-white p-8 text-center text-sm text-[#5d625f]">
            <p className="font-medium">Queue is empty.</p>
            <p className="mt-1">
              Run <code className="rounded bg-[#ece6da] px-1 py-0.5">npm run ingest</code> to add
              chunks, then return here to approve them.
            </p>
            <p className="mt-2">
              After approving, run{" "}
              <code className="rounded bg-[#ece6da] px-1 py-0.5">npm run ingest:rag</code> to embed
              and publish approved chunks to the bot.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {result.rows.map((chunk) => (
              <ChunkCard key={chunk.id} chunk={chunk} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ChunkCard({ chunk }: { chunk: PendingChunk }) {
  const sourceUrl = timestampUrl(chunk.videoUrl, chunk.timestampStart);
  const minutes = Math.floor(chunk.timestampStart / 60);
  const seconds = chunk.timestampStart % 60;
  const timestamp = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="rounded border border-[#d8d1c3] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eee7dc] px-4 py-3">
        <div className="min-w-0">
          <span className="font-medium text-[#2e3330]">{chunk.videoTitle}</span>
          <a
            className="ml-2 text-sm text-[#355f8a] hover:underline"
            href={sourceUrl}
            rel="noreferrer"
            target="_blank"
          >
            {timestamp} ↗
          </a>
        </div>
        <div className="flex gap-3 text-xs text-[#888]">
          <span>confidence {chunk.confidence.toFixed(2)}</span>
          <span>freshness {chunk.freshnessScore.toFixed(2)}</span>
        </div>
      </div>

      <p className="px-4 py-3 text-sm leading-6 text-[#2e3330]">{chunk.cleanedText}</p>

      <div className="flex flex-wrap items-end gap-3 border-t border-[#eee7dc] px-4 py-3">
        {/* Approve form */}
        <form action={approveChunk} className="flex flex-wrap items-end gap-2">
          <input name="chunkId" type="hidden" value={chunk.id} />

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#888]" htmlFor={`type-${chunk.id}`}>
              Content type
            </label>
            <select
              className="rounded border border-[#d8d1c3] bg-[#f7f5ef] px-2 py-1.5 text-sm"
              defaultValue="unknown"
              id={`type-${chunk.id}`}
              name="contentType"
            >
              {CONTENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#888]" htmlFor={`notes-${chunk.id}`}>
              Notes (optional)
            </label>
            <input
              className="rounded border border-[#d8d1c3] bg-[#f7f5ef] px-2 py-1.5 text-sm placeholder:text-[#aaa]"
              id={`notes-${chunk.id}`}
              name="reviewNotes"
              placeholder="e.g. patch-specific, BBG 4.x only"
              type="text"
            />
          </div>

          <button
            className="rounded bg-[#3a6e47] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#2e5939]"
            type="submit"
          >
            Approve
          </button>
        </form>

        {/* Reject form */}
        <form action={rejectChunk}>
          <input name="chunkId" type="hidden" value={chunk.id} />
          <button
            className="rounded border border-[#d8d1c3] px-4 py-1.5 text-sm font-medium text-[#5d625f] hover:bg-[#f0ece3]"
            type="submit"
          >
            Reject
          </button>
        </form>
      </div>
    </div>
  );
}

async function loadPending() {
  try {
    const result = await query<PendingChunk>(`
      select
        c.id,
        v.title as "videoTitle",
        v.url as "videoUrl",
        c.timestamp_start as "timestampStart",
        c.timestamp_end as "timestampEnd",
        c.cleaned_text as "cleanedText",
        c.confidence::float as confidence,
        c.freshness_score::float as "freshnessScore",
        c.created_at::text as "createdAt"
      from transcript_chunks c
      join videos v on v.id = c.video_id
      where c.status = 'needs_review'
      order by v.upload_date desc nulls last, c.timestamp_start asc
      limit 100
    `);

    return { rows: result.rows, count: result.rows.length };
  } catch {
    return {
      error:
        "Set DATABASE_URL and apply db/migrations/002_content_items.sql to use the review queue.",
    };
  }
}
