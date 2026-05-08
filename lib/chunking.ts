export type TranscriptLine = {
  text: string;
  offset: number;
  duration: number;
};

export type TranscriptChunk = {
  timestampStart: number;
  timestampEnd: number;
  rawText: string;
  cleanedText: string;
};

export function cleanTranscriptText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function chunkTranscript(
  lines: TranscriptLine[],
  targetSeconds = 60,
): TranscriptChunk[] {
  const chunks: TranscriptChunk[] = [];
  let bucket: TranscriptLine[] = [];
  let bucketStart = 0;

  for (const line of lines) {
    if (bucket.length === 0) {
      bucketStart = Math.floor(line.offset / 1000);
    }

    bucket.push(line);
    const lineEnd = Math.ceil((line.offset + line.duration) / 1000);

    if (lineEnd - bucketStart >= targetSeconds) {
      chunks.push(toChunk(bucket, bucketStart, lineEnd));
      bucket = [];
    }
  }

  if (bucket.length > 0) {
    const last = bucket[bucket.length - 1];
    chunks.push(toChunk(bucket, bucketStart, Math.ceil((last.offset + last.duration) / 1000)));
  }

  return chunks.filter((chunk) => chunk.cleanedText.length > 0);
}

function toChunk(
  lines: TranscriptLine[],
  timestampStart: number,
  timestampEnd: number,
): TranscriptChunk {
  const rawText = lines.map((line) => line.text).join(" ");

  return {
    timestampStart,
    timestampEnd,
    rawText,
    cleanedText: cleanTranscriptText(rawText),
  };
}
