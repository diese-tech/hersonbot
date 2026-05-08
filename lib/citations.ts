import type { RetrievedChunk } from "./retrieval";

export function timestampUrl(videoUrl: string, seconds: number) {
  const separator = videoUrl.includes("?") ? "&" : "?";
  return `${videoUrl}${separator}t=${Math.max(0, Math.floor(seconds))}s`;
}

export function formatCitation(chunk: RetrievedChunk, index: number) {
  return {
    id: `S${index + 1}`,
    title: chunk.videoTitle,
    url: timestampUrl(chunk.videoUrl, chunk.timestampStart),
    timestamp: formatTimestamp(chunk.timestampStart),
    text: chunk.cleanedText,
  };
}

function formatTimestamp(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
