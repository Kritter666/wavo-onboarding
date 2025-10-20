// src/app/api/chat/route.ts
export const runtime = "edge"; // fast, cheap

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  try {
    const { messages = [] } = (await req.json().catch(() => ({}))) as {
      messages: Msg[];
    };

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Never 500 in MVP—return a helpful placeholder
      const last = (messages as Msg[]).at(-1)?.content ?? "";
      return Response.json({
        reply:
          `Dev note: OPENAI_API_KEY not set on server. ` +
          `Echo: “${last.slice(0, 200)}”`,
      });
    }

    // Call OpenAI (chat)
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: (messages as Msg[]).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json(
        { reply: `Chat API error (${res.status}). ${text.slice(0, 180)}` },
        { status: 200 }
      );
    }

    const json = await res.json();
    const reply =
      json?.choices?.[0]?.message?.content ?? "Okay — noted.";
    return Response.json({ reply }, { status: 200 });
  } catch (e: any) {
    return Response.json(
      { reply: "Server error handling chat. (MVP fallback)" },
      { status: 200 }
    );
  }
}

export async function GET() {
  return Response.json({ ok: true });
}