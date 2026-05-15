"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";

export async function approveChunk(formData: FormData) {
  const chunkId = Number(formData.get("chunkId"));
  const contentType = String(formData.get("contentType") || "unknown");
  const reviewNotes = String(formData.get("reviewNotes") || "");

  if (!chunkId) return;

  await query(
    `update transcript_chunks
     set status = 'approved',
         content_type = $2,
         reviewed_by = 'human',
         reviewed_at = now(),
         review_notes = nullif($3, '')
     where id = $1`,
    [chunkId, contentType, reviewNotes],
  );

  revalidatePath("/admin/review");
}

export async function rejectChunk(formData: FormData) {
  const chunkId = Number(formData.get("chunkId"));

  if (!chunkId) return;

  await query(
    `update transcript_chunks
     set status = 'rejected',
         reviewed_by = 'human',
         reviewed_at = now()
     where id = $1`,
    [chunkId],
  );

  revalidatePath("/admin/review");
}
