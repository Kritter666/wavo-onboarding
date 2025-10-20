
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Msg = { role: "user" | "assistant"; content: string };

export default function CoPilotChat() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I’m your onboarding copilot. How can I help?" },
  ]);
  const [text, setText] = useState("");

  async function send(userText: string) {
    if (!userText.trim()) return;
    const next: Msg[] = [...messages, { role: "user", content: userText }];
    setMessages(next);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { reply: string };
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Hmm, I couldn’t reach the chat API." },
      ]);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = text;
    setText("");
    void send(val);
  }

  return (
    <div className="copilot-chat flex flex-col gap-3">
      {/* Messages */}
      <div className="space-y-2 max-h-[50vh] overflow-auto pr-1">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-2xl p-3 text-[15px] leading-relaxed ${
              m.role === "assistant"
                ? "chat-bubble-assistant"
                : "chat-bubble-user ml-8"
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>

      {/* Composer */}
      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask onboarding to prefill, connect, or explain…"
          className="flex-1 bg-background text-foreground placeholder:text-muted-foreground/90 focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
        <Button type="submit">Send</Button>
      </form>
    </div>
  );
}
