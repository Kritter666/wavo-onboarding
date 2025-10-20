export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { ok: false, error: "OPENAI_API_KEY missing on server" },
      { status: 500 }
    );
  }
  const body = await req.json().catch(() => ({}));
  const last = Array.isArray(body?.messages) ? body.messages.at(-1)?.content : "…";
  return NextResponse.json({ ok: true, reply: `You said: ${last}` });
}
