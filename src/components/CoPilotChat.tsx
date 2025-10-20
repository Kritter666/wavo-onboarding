
"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type Msg = { role: "user" | "assistant"; content: string };

export default function CoPilotChat() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: "Welcome to Wavo. I’ll get you to value in minutes. Skips are safe; I’ll fill gaps as you go." },
  ]);
  const [pending, setPending] = useState(false);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, pending]);

  async function sendMessage(prompt?: string) {
    const content = (prompt ?? text).trim();
    if (!content) return;
    setText("");
    const next = [...msgs, { role: "user", content }];
    setMsgs(next);
    setPending(true);
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setMsgs((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e: any) {
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: "Hmm, I had trouble reaching the assistant. Try again." },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="h-[520px] flex flex-col">
      <CardContent className="p-3 flex-1 overflow-auto space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Button size="sm" variant="secondary" onClick={() => sendMessage("Can I skip some fields?")}>
            Skip-friendly
          </Button>
          <span>Ask me for a nudge or type below.</span>
        </div>

        {msgs.map((m, i) => (
          <div
            key={i}
            className={`text-sm leading-relaxed ${m.role === "user" ? "text-foreground" : "text-muted-foreground"}`}
          >
            <span className="font-medium">{m.role === "user" ? "You: " : "Co-Pilot: "}</span>
            {m.content}
          </div>
        ))}

        {pending && <div className="text-xs text-muted-foreground">Thinking…</div>}
        <div ref={endRef} />
      </CardContent>

      <div className="p-3 border-t grid grid-cols-[1fr_auto] gap-2">
        <Input
          placeholder="Ask anything (e.g., 'Why do you need org name?')"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <Button onClick={() => sendMessage()} disabled={pending}>
          Send
        </Button>
      </div>
    </Card>
  );
}
