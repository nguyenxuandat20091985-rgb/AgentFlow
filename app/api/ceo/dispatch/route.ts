import { NextResponse } from "next/server";
import { buildCeoDispatchPlan } from "@/lib/ceo/router";
import { CEO_ISOLATION_RULES } from "@/lib/ceo/fleet";

export const dynamic = "force-dynamic";

/**
 * AI CEO dispatch — allow-list only (runtimeEnabled + dispatchEnabled).
 * Does not execute agent runtimes; returns a safe plan.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const task = typeof body.task === "string" ? body.task.trim() : "";
    const selected = Array.isArray(body.agents)
      ? body.agents.filter((a: unknown): a is string => typeof a === "string")
      : [];
    const priority = typeof body.priority === "string" ? body.priority : "normal";

    if (!task) {
      return NextResponse.json({ error: "Vui lòng nhập yêu cầu giao việc cho AI CEO." }, { status: 400 });
    }

    const plan = buildCeoDispatchPlan({ task, agents: selected, priority });
    return NextResponse.json(
      {
        ...plan,
        rules: CEO_ISOLATION_RULES,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("[CEO_DISPATCH]", error);
    return NextResponse.json({ error: "Không thể tạo kế hoạch giao việc." }, { status: 500 });
  }
}
