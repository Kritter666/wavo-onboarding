"use client";

import { useState } from "react";

// Strict message type
type Msg = { role: "user" | "assistant"; content: string };

export default function CopilotPage() {
  // ✅ Type the state as Msg[]
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Welcome to Wavo. Ask me anything about onboarding." },
  ]);
  const [input, setInput] = useState("");

  async function send(userText: string) {
    if (!userText.trim()) return;

    // ✅ Ensure the new array is Msg[]
    const next: Msg[] = [...messages, { role: "user", content: userText }];
    setMessages(next);

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      const data = await res.json().catch(() => ({}));
      const replyText: string =
        data?.reply ??
        data?.choices?.[0]?.message?.content ??
        "Sorry — I couldn’t generate a response.";

      setMessages((m) => [...m, { role: "assistant", content: replyText }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Network error talking to /api/copilot." },
      ]);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = input;
    setInput("");
    void send(v);
  }

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Co-Pilot</h1>

      <div className="space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-2xl p-3 ${
              m.role === "assistant"
                ? "bg-muted text-foreground"
                : "bg-primary text-primary-foreground ml-8"
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          className="flex-1 rounded-xl border px-3 py-2 bg-background"
          placeholder="Ask anything…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="rounded-xl border px-3 py-2" type="submit">
          Send
        </button>
      </form>
    </main>
  );
}
