
export const runtime = "nodejs";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/debug",
    runtime: "nodejs",
    hasKey: !!process.env.OPENAI_API_KEY,
    node: process.version,
  });
}
