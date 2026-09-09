import { NextResponse } from "next/server";
import { llmStatus } from "@/lib/llm/router";

export const dynamic = "force-dynamic";

/** Public-ish health: which LLM keys are configured (never returns key values). */
export async function GET() {
  return NextResponse.json({
    ok: true,
    llm: llmStatus(),
    note: "Add keys in Vercel → Settings → Environment Variables, then redeploy.",
  });
}
