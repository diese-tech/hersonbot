import OpenAI from "openai";

function apiKeyFor(prefix: "CHAT" | "EMBEDDING") {
  return (
    process.env[`${prefix}_API_KEY`] ||
    process.env.OPENAI_API_KEY ||
    "not-needed-for-local"
  );
}

export function chatClient() {
  return new OpenAI({
    apiKey: apiKeyFor("CHAT"),
    baseURL: process.env.CHAT_BASE_URL || undefined,
  });
}

export function embeddingClient() {
  return new OpenAI({
    apiKey: apiKeyFor("EMBEDDING"),
    baseURL: process.env.EMBEDDING_BASE_URL || undefined,
  });
}

export async function embedText(input: string) {
  const response = await embeddingClient().embeddings.create({
    model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
    input,
  });

  return response.data[0]?.embedding ?? [];
}

export async function answerWithContext(question: string, context: string) {
  const response = await chatClient().chat.completions.create({
    model: process.env.CHAT_MODEL || "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You are a Civ 6 multiplayer strategy assistant. Give practical advice grounded only in the provided transcript chunks. Do not imitate any creator. If the evidence is weak, say so. Include citations using the citation ids provided. Each source is labelled with a type: 'canon' means reviewed strategic advice, 'speculation' means unconfirmed, 'joke' or 'meme' means humor not advice — clearly note in your answer when a source is speculative or humorous rather than canon guidance.",
      },
      {
        role: "user",
        content: `Question:\n${question}\n\nTranscript chunks:\n${context}`,
      },
    ],
  });

  return response.choices[0]?.message.content?.trim() || "No answer generated.";
}
