import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  const signature = request.headers.get("x-agentflow-signature");
  const raw = await request.text();
  if (!secret || !signature) return NextResponse.json({ error: "Webhook authentication is not configured" }, { status: 503 });
  const expected = createHash("sha256").update(`${secret}.${raw}`).digest("hex");
  if (signature !== expected) return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  const event = JSON.parse(raw);
  if (event.status !== "success" || !event.external_event_id || !Number.isFinite(Number(event.amount))) {
    return NextResponse.json({ error: "Only verified successful payment events are accepted" }, { status: 400 });
  }
  // Persistence is intentionally server-side. Revenue must only be recorded from verified events.
  return NextResponse.json({ accepted: true, recorded: false, message: "Signature verified. Connect this handler to the revenue ledger/payment provider adapter before recording funds." });
}
