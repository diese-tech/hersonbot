import "dotenv/config";
import { embedText } from "@/lib/ai";
import { closePool, query } from "@/lib/db";

type PendingChunk = {
  id: number;
  cleanedText: string;
};

async function main() {
  const pending = await query<PendingChunk>(
    `select id, cleaned_text as "cleanedText"
     from transcript_chunks
     where status = 'approved' and embedding is null
     order by id asc`,
  );

  const total = pending.rows.length;

  if (total === 0) {
    console.log("No approved chunks awaiting embedding. Approve chunks at /admin/review first.");
    await closePool();
    return;
  }

  console.log(`Embedding ${total} approved chunk(s)...`);

  let indexed = 0;
  let failed = 0;

  for (const chunk of pending.rows) {
    try {
      const embedding = await embedText(chunk.cleanedText);

      if (embedding.length === 0) {
        throw new Error("Embedding returned empty array — check EMBEDDING_BASE_URL and EMBEDDING_MODEL.");
      }

      await query(
        `update transcript_chunks
         set embedding = $2::vector, status = 'indexed'
         where id = $1`,
        [chunk.id, `[${embedding.join(",")}]`],
      );

      indexed++;
      process.stdout.write(`\r  ${indexed}/${total} indexed`);
    } catch (err) {
      failed++;
      console.error(`\n  Failed chunk ${chunk.id}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\nDone. ${indexed} indexed, ${failed} failed.`);

  if (failed > 0) {
    console.log("Re-run this script to retry failed chunks.");
  }

  await closePool();
}

main().catch(async (error) => {
  console.error(error);
  await closePool();
  process.exit(1);
});
