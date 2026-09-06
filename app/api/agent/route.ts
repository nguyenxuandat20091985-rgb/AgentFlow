import { NextResponse } from "next/server";
import { executeAgent } from "@/lib/agent-engine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body.goal !== "string") return NextResponse.json({ error:"goal must be a string" }, { status:400 });
    const result = await executeAgent({ goal:body.goal, context:body.context, agent:body.agent });
    return NextResponse.json(result, { status:result.status === "failed" ? 502 : 200 });
  } catch (error) {
    return NextResponse.json({ error:error instanceof Error ? error.message : "Unable to execute agent" }, { status:400 });
  }
}
