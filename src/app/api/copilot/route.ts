import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { messages } = (await req.json()) as {
      messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
    };

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    // Keep context small
    const trimmed = messages.slice(-12);

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You are Wavo Co-Pilot. Be concise and helpful. If the user is onboarding, ask for any missing fields and explain 'why' when asked.",
          },
          ...trimmed,
        ],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content ?? "Sorry, I couldn’t generate a reply.";
    return NextResponse.json({ reply: content });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
