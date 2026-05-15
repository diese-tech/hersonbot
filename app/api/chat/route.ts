import { NextResponse } from "next/server";
import { z } from "zod";
import { answerWithContext } from "@/lib/ai";
import { formatCitation } from "@/lib/citations";
import { retrieveChunks } from "@/lib/retrieval";

const requestSchema = z.object({
  question: z.string().trim().min(3).max(1000),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Question is required." }, { status: 400 });
  }

  try {
    const chunks = await retrieveChunks(parsed.data.question);
    const citations = chunks.map(formatCitation);

    if (chunks.length === 0) {
      return NextResponse.json({
        answer:
          "I do not have any transcript chunks indexed yet, so I cannot give source-grounded advice.",
        citations,
      });
    }

    const context = chunks
      .map((chunk, index) => {
        const citation = citations[index];
        return `[${citation.id}] ${chunk.videoTitle} ${citation.timestamp} [type: ${chunk.contentType}]\n${chunk.cleanedText}`;
      })
      .join("\n\n");

    const answer = await answerWithContext(parsed.data.question, context);

    return NextResponse.json({ answer, citations });
  } catch {
    return NextResponse.json(
      {
        error:
          "Chat is not ready. Set DATABASE_URL, apply db/schema.sql, and configure embedding/chat providers.",
      },
      { status: 503 },
    );
  }
}
