import { NextResponse } from "next/server";
import { executeAgent } from "@/lib/agent-engine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body.goal !== "string") {
      return NextResponse.json({ error: "goal must be a string" }, { status: 400 });
    }
    return NextResponse.json(executeAgent({ goal: body.goal, context: body.context, agent: body.agent }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to execute agent";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
