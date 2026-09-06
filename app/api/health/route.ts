import { NextResponse } from "next/server";

export function GET() {
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  return NextResponse.json({
    ok: true,
    service: "agentflow",
    version: "1.1.0",
    capabilities: {
      dashboard: true,
      agentRegistry: true,
      workflowRuns: true,
      agentApi: true,
      liveModelConfigured: hasOpenAI
    },
    timestamp: new Date().toISOString()
  }, { headers: { "cache-control": "no-store" } });
}
