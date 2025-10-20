import { NextRequest } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { messages } = (await req.json()) as {
      messages: { role: "user" | "assistant"; content: string }[];
    };

    // ---- Replace this stub with your real OpenAI call when ready ----
    const last = messages?.slice(-1)[0]?.content ?? "";
    const reply =
      last.trim() === ""
        ? "Ask me anything about onboarding. I can nudge you step-by-step."
        : `You said: “${last}”. For onboarding, I can help fill Org, Team, User, Connectors, and more.`;

    return new Response(JSON.stringify({ ok: true, reply }), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: e?.message || "Bad request" }),
      { headers: { "content-type": "application/json" }, status: 400 },
    );
  }
}
