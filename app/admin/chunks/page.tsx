import { query } from "@/lib/db";
import Link from "next/link";

type ChunkRow = {
  id: number;
  videoTitle: string;
  timestampStart: number;
  timestampEnd: number;
  cleanedText: string;
  confidence: number;
  freshnessScore: number;
  createdAt: string;
};

export const dynamic = "force-dynamic";

export default async function ChunksPage() {
  const result = await loadChunks();

  return (
    <main className="min-h-screen bg-[#f7f5ef] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 flex items-center justify-between border-b border-[#d8d1c3] pb-4">
          <h1 className="text-2xl font-semibold">Transcript chunks</h1>
          <div className="flex gap-4 text-sm font-medium text-[#355f8a]">
            <Link href="/admin/review">Review queue</Link>
            <Link href="/">Chat</Link>
          </div>
        </header>

        {"error" in result ? (
          <div className="rounded border border-[#d8d1c3] bg-white p-5 text-sm leading-6 text-[#5d625f]">
            {result.error}
          </div>
        ) : (
        <div className="overflow-x-auto rounded border border-[#d8d1c3] bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-[#ece6da] text-[#4a504d]">
              <tr>
                <th className="p-3">Video</th>
                <th className="p-3">Time</th>
                <th className="p-3">Confidence</th>
                <th className="p-3">Freshness</th>
                <th className="p-3">Text</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((chunk) => (
                <tr className="border-t border-[#eee7dc]" key={chunk.id}>
                  <td className="min-w-48 p-3 font-medium">{chunk.videoTitle}</td>
                  <td className="p-3">
                    {chunk.timestampStart}s-{chunk.timestampEnd}s
                  </td>
                  <td className="p-3">{chunk.confidence.toFixed(2)}</td>
                  <td className="p-3">{chunk.freshnessScore.toFixed(2)}</td>
                  <td className="min-w-[360px] p-3 leading-6">{chunk.cleanedText}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </main>
  );
}

async function loadChunks() {
  try {
    const result = await query<ChunkRow>(`
      select
        c.id,
        v.title as "videoTitle",
        c.timestamp_start as "timestampStart",
        c.timestamp_end as "timestampEnd",
        c.cleaned_text as "cleanedText",
        c.confidence::float as confidence,
        c.freshness_score::float as "freshnessScore",
        c.created_at::text as "createdAt"
      from transcript_chunks c
      join videos v on v.id = c.video_id
      order by c.created_at desc
      limit 100
    `);

    return { rows: result.rows };
  } catch {
    return {
      error:
        "Set DATABASE_URL and apply db/schema.sql to inspect transcript chunks.",
    };
  }
}
