"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Msg = { role: "assistant" | "user"; content: string };

export default function CoPilotChat() {
  const [msgs, setMsgs] = React.useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Welcome to Wavo. I’ll get you to value in minutes. Skips are safe; I’ll fill gaps as you go.",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [...msgs, { role: "user", content: text }] }),
      });
      const data = (await res.json()) as { ok: boolean; reply?: string; error?: string };
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: data.ok ? data.reply || "" : data.error || "Error" },
      ]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "Network error." }]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={listRef} className="flex-1 space-y-2 overflow-auto pr-1">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`rounded-2xl p-3 text-sm shadow ${
              m.role === "assistant" ? "bg-gray-50" : "bg-primary text-primary-foreground ml-10"
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="rounded-2xl p-3 text-sm bg-gray-50 shadow">Thinking…</div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask anything (e.g., 'Why do you need org name?')"
        />
        <Button onClick={send} disabled={loading || !input.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}
