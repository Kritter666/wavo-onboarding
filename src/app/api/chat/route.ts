
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages } = (await req.json()) as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
    };

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "OPENAI_API_KEY not set on server" },
        { status: 500 }
      );
    }

    // Minimal, non-streaming chat call
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages?.length ? messages : [{ role: "user", content: "Say hello." }],
        temperature: 0.4,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: `OpenAI error (${resp.status}): ${text}` },
        { status: 500 }
      );
    }

    const data = await resp.json();
    const content =
      data?.choices?.[0]?.message?.content ??
      "Hmm, I couldn’t generate a reply.";

    return NextResponse.json({ ok: true, content });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // simple ping
  return NextResponse.json({ ok: true, route: "/api/chat", runtime: "nodejs" });
}
