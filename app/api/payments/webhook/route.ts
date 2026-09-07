import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function validSignature(raw: string, signature: string, secret: string) {
  const expected = createHash("sha256").update(`${secret}.${raw}`).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  const signature = request.headers.get("x-agentflow-signature");
  const raw = await request.text();
  if (!secret || !signature) return NextResponse.json({ error: "Webhook authentication is not configured" }, { status: 503 });
  if (!validSignature(raw, signature, secret)) return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });

  let event: Record<string, unknown>;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const externalEventId = String(event.external_event_id || event.reference || "").trim();
  const status = String(event.status || "").toLowerCase();
  const amount = Number(event.amount);
  const currency = String(event.currency || "VND").toUpperCase();
  if (status !== "success" || !externalEventId || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Only verified successful payment events are accepted" }, { status: 400 });
  }

  const eventHash = createHash("sha256").update(raw).digest("hex");
  const existing = await supabaseAdmin("payment_events?select=id,external_event_id&provider=eq.payos&external_event_id=eq." + encodeURIComponent(externalEventId) + "&limit=1");
  if (Array.isArray(existing) && existing.length) {
    return NextResponse.json({ accepted: true, duplicate: true, recorded: true, payment_event_id: existing[0].id });
  }

  const inserted = await supabaseAdmin("payment_events", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ provider: "payos", external_event_id: externalEventId, status: "success", amount, currency, raw_hash: eventHash, verified_at: new Date().toISOString() }),
  });
  const paymentEvent = Array.isArray(inserted) ? inserted[0] : inserted;
  if (!paymentEvent?.id) return NextResponse.json({ error: "Payment event could not be persisted" }, { status: 500 });

  try {
    const ledger = await supabaseAdmin("revenue_ledger", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ source: "payos", payment_event_id: paymentEvent.id, amount, currency }),
    });
    return NextResponse.json({ accepted: true, duplicate: false, recorded: true, payment_event_id: paymentEvent.id, ledger_id: Array.isArray(ledger) ? ledger[0]?.id : ledger?.id });
  } catch (error) {
    return NextResponse.json({ error: "Payment event saved but revenue ledger write failed; retry webhook safely", payment_event_id: paymentEvent.id }, { status: 500 });
  }
}
