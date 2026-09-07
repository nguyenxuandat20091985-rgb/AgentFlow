import { NextResponse } from "next/server";

const AGENTS = [
  "SalesBot", "SupportAI", "DataAnalyzer", "ContentWriter", "ChatBot",
  "LeadGen", "EmailAI", "SocialMedia", "Analytics", "CRM", "Billing",
  "Inventory", "Research", "Design", "Code", "QA", "HR", "Finance",
  "Marketing", "CustomerService",
] as const;

function buildPlan(request: string, selected: string[]) {
  const text = request.toLowerCase();
  const inferred = selected.length ? selected : [
    text.includes("khách") || text.includes("lead") ? "LeadGen" : "Research",
    text.includes("nội dung") || text.includes("marketing") ? "ContentWriter" : "DataAnalyzer",
    text.includes("email") ? "EmailAI" : "Analytics",
  ];
  const agents = [...new Set(inferred)].filter((name) => AGENTS.includes(name as (typeof AGENTS)[number]));
  return agents.map((agent, index) => ({
    id: `task-${Date.now()}-${index}`,
    agent,
    title: index === 0 ? "Phân tích & lập kế hoạch" : index === 1 ? "Thực thi nhiệm vụ" : "Kiểm tra & báo cáo kết quả",
    status: index === 0 ? "assigned" : "queued",
  }));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const task = typeof body.task === "string" ? body.task.trim() : "";
    const selected = Array.isArray(body.agents) ? body.agents.filter((a: unknown): a is string => typeof a === "string") : [];
    const priority = typeof body.priority === "string" ? body.priority : "normal";

    if (!task) {
      return NextResponse.json({ error: "Vui lòng nhập yêu cầu giao việc cho AI CEO." }, { status: 400 });
    }

    const assignments = buildPlan(task, selected);
    return NextResponse.json({
      ok: true,
      ceo: "AI CEO",
      priority,
      task,
      assignments,
      message: `AI CEO đã tiếp nhận yêu cầu và phân công ${assignments.length} AI Agent.`,
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[CEO_DISPATCH]", error);
    return NextResponse.json({ error: "Không thể tạo kế hoạch giao việc." }, { status: 500 });
  }
}
