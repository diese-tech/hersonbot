"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type Citation = {
  id: string;
  title: string;
  url: string;
  timestamp: string;
  text: string;
};

type ChatResponse = {
  answer: string;
  citations: Citation[];
};

export default function Home() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!result.ok) {
        throw new Error(await result.text());
      }

      setResponse(await result.json());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f5ef]">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between border-b border-[#d8d1c3] pb-4">
          <h1 className="text-2xl font-semibold text-[#1d2328]">HersonBot</h1>
          <Link className="text-sm font-medium text-[#355f8a]" href="/admin/chunks">
            Chunks
          </Link>
        </header>

        <section className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <form className="flex min-h-[420px] flex-col gap-4" onSubmit={onSubmit}>
            <textarea
              className="min-h-[180px] flex-1 resize-none rounded border border-[#c9c0b0] bg-white p-4 text-base leading-7 text-[#1d2328] outline-none focus:border-[#5d7f5a]"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="I am Germany on online speed, turn 15. What should I build next?"
              required
            />
            <button
              className="h-11 rounded bg-[#315c72] px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading || question.trim().length === 0}
              type="submit"
            >
              {isLoading ? "Thinking" : "Ask"}
            </button>
            {error ? <p className="text-sm text-[#9f2d2d]">{error}</p> : null}
          </form>

          <aside className="rounded border border-[#d8d1c3] bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#5d625f]">
              Citations
            </h2>
            <div className="space-y-3">
              {response?.citations.map((citation) => (
                <a
                  className="block rounded border border-[#e1dace] p-3 text-sm hover:border-[#88a081]"
                  href={citation.url}
                  key={citation.id}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="font-semibold text-[#315c72]">
                    {citation.id} {citation.timestamp}
                  </span>
                  <span className="mt-1 block text-[#1d2328]">{citation.title}</span>
                  <span className="mt-2 line-clamp-4 block text-[#5d625f]">
                    {citation.text}
                  </span>
                </a>
              ))}
            </div>
          </aside>
        </section>

        <section className="min-h-[220px] whitespace-pre-wrap rounded border border-[#d8d1c3] bg-white p-5 leading-7">
          {response?.answer || ""}
        </section>
      </div>
    </main>
  );
}
