export const runtime = "nodejs";
import { NextResponse } from "next/server";
export async function GET() {
  const hasKey = !!process.env.OPENAI_API_KEY;
  const partial = hasKey ? process.env.OPENAI_API_KEY!.slice(0, 6) + "..." : null;
  return NextResponse.json({ hasKey, partial });
}
