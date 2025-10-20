import { NextRequest } from "next/server";

// Simple health check so you can open it in the browser.
export async function GET() {
  return new Response(JSON.stringify({ ok: true, env: !!process.env.OPENAI_API_KEY }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

// Minimal POST handler your UI can call.
// It just echos the last user message for now (no OpenAI dependency).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const lastUser =
      Array.isArray(body?.messages)
        ? [...body.messages].reverse().find((m) => m?.role === "user")?.content ?? ""
        : "";

    const reply = lastUser
      ? `You said: "${lastUser}". Co-Pilot is online.`
      : "Co-Pilot is online. Say something!";

    return new Response(JSON.stringify({ ok: true, reply }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    console.error("COPILOT_ERROR", err?.message || err);
    return new Response(JSON.stringify({ ok: false, error: "handler_failed" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
