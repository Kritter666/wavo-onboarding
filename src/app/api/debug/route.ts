export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({
    hasKey: !!process.env.OPENAI_API_KEY,
    nodeVersion: process.version,
    env: process.env.VERCEL_ENV ?? "unknown",
  });
}
