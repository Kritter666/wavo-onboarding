"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user"|"assistant"; content: string };

export default function CopilotPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi — I’m Wavo Co-Pilot. Ask me something or use a quick action below." }
  ]);
  const [input, setInput] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => { boxRef.current?.scrollTo(0, boxRef.current.scrollHeight); }, [messages]);

  async function send(userText: string) {
    const next = [...messages, { role: "user", content: userText }];
    setMessages(next);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: next }),
    });

    // read SSE-ish stream and append text
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let assistant = "";
    while (reader) {
      const { value, done } = await reader.read();
      if (done) break;
      assistant += decoder.decode(value);
      setMessages(prev => {
        const base = prev.filter((_, i) => i < next.length);
        return [...base, { role: "assistant", content: assistant }];
      });
    }
  }

  async function runTool(name: "create_task"|"send_email"|"subscribe_weekly", args: any) {
    // ping chat route with "tool" payload; it executes server-side and returns result
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages, tool: { name, args } }),
    });
    const data = await res.json();
    const summary = data?.tool_result ? JSON.stringify(data.tool_result) : data?.error || "Done";
    setMessages(m => [...m, { role: "assistant", content: `✅ ${name} → ${summary}` }]);
  }

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto grid gap-4">
      <div className="text-2xl font-semibold">Co-Pilot</div>

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap">
        <button className="rounded-lg border px-3 py-2 text-sm"
          onClick={() => runTool("create_task", { title: "Follow up with Atlantic A&R" })}
        >Create task</button>

        <button className="rounded-lg border px-3 py-2 text-sm"
          onClick={() => runTool("send_email", {
            to: "you@example.com",
            subject: "Hello from Wavo",
            text: "Checking in. – Co-Pilot"
          })}
        >Send email</button>

        <button className="rounded-lg border px-3 py-2 text-sm"
          onClick={() => runTool("subscribe_weekly", { email: "you@example.com" })}
        >Subscribe weekly</button>
      </div>

      {/* Chat window */}
      <div ref={boxRef} className="rounded-xl border p-3 h-[55vh] overflow-y-auto bg-card">
        {messages.map((m, i) => (
          <div key={i} className="mb-3">
            <div className="text-xs mb-1 opacity-60">{m.role === "user" ? "You" : "Assistant"}</div>
            <div className="whitespace-pre-wrap">{m.content}</div>
          </div>
        ))}
      </div>

      {/* Composer */}
      <form className="flex gap-2" onSubmit={(e)=>{e.preventDefault(); if(input.trim()) { send(input.trim()); setInput(""); }}}>
        <input
          className="flex-1 rounded-lg border px-3 py-2"
          placeholder="Ask about onboarding…"
          value={input}
          onChange={(e)=>setInput(e.target.value)}
        />
        <button className="rounded-lg bg-black text-white px-4 py-2">Send</button>
      </form>
    </main>
  );
}
