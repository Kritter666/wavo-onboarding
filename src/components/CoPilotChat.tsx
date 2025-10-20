"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Msg = { role: "user" | "assistant"; content: string };

export default function CoPilotChat() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi — I’m your onboarding co-pilot. Ask me anything." },
  ]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    setErr(null);
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setText("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Request failed");
      setMessages([...next, { role: "assistant", content: data.content }]);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-2 overflow-auto pr-1">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-2xl p-3 shadow ${
              m.role === "assistant"
                ? "bg-card text-foreground"
                : "bg-primary text-primary-foreground ml-8"
            }`}
          >
            <div className="text-[0.95rem] leading-6 font-medium">{m.content}</div>
          </div>
        ))}
        {err && (
          <div className="text-sm text-red-600 font-semibold">
            {err}
          </div>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your message…"
          className="text-foreground"
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
        />
        <Button onClick={send} disabled={busy}>
          {busy ? "…" : "Send"}
        </Button>
      </div>
    </div>
  );
}
