import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DbError = { message?: string; details?: string; hint?: string; code?: string };

function logDbError(step: string, error: unknown) {
  const dbError = (error ?? {}) as DbError;
  console.error("[PayOS webhook] Supabase error", {
    step,
    message: dbError.message ?? "unknown",
    details: dbError.details ?? null,
    hint: dbError.hint ?? null,
    code: dbError.code ?? null,
  });
}

function stableValue(value: unknown): string {
  if (value === null || value === undefined || value === "null" || value === "undefined") return "";
  if (Array.isArray(value)) return JSON.stringify(value.map((item) => item && typeof item === "object" ? sortObject(item as Record<string, unknown>) : item));
  return String(value);
}

function sortObject(input: Record<string, unknown>) {
  return Object.keys(input).sort().reduce<Record<string, unknown>>((out, key) => {
    out[key] = input[key];
    return out;
  }, {});
}

function verifyPayOSSignature(data: Record<string, unknown>, signature: string, checksumKey: string) {
  const sorted = sortObject(data);
  const query = Object.keys(sorted).map((key) => `${key}=${stableValue(sorted[key])}`).join("&");
  const expected = createHmac("sha256", checksumKey).update(query).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

function resolveAgentId(payload: Record<string, unknown>, data: Record<string, unknown>): "salesbot" | "marketing" | null {
  const metadata = data.metadata && typeof data.metadata === "object" ? data.metadata as Record<string, unknown> : null;
  const candidates = [
    payload.agentId,
    data.agentId,
    payload.agent_id,
    data.agent_id,
    metadata?.agentId,
    metadata?.agent_id,
  ];
  const value = candidates.map((v) => String(v ?? "").trim().toLowerCase()).find(Boolean);
  return value === "salesbot" || value === "marketing" ? value : null;
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "AgentFlow PayOS webhook", method: "POST" });
}

export async function POST(request: Request) {
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
  if (!checksumKey) return NextResponse.json({ error: "PAYOS_CHECKSUM_KEY is not configured" }, { status: 503 });

  const raw = await request.text();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data = payload.data as Record<string, unknown> | undefined;
  const signature = String(payload.signature || "");
  if (!data || !signature || !verifyPayOSSignature(data, signature, checksumKey)) {
    return NextResponse.json({ error: "Invalid PayOS signature" }, { status: 401 });
  }

  const success = payload.success === true && String(payload.code || "") === "00" && String(data.code || "") === "00";
  const externalEventId = String(data.reference || data.orderCode || "").trim();
  const amount = Number(data.amount);
  const agentId = resolveAgentId(payload, data);

  if (!success || !externalEventId || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ accepted: true, recorded: false, reason: "Payment is not a verified success event" });
  }

  const query = "provider=eq.payos&external_event_id=eq." + encodeURIComponent(externalEventId) + "&select=id,external_event_id&limit=1";

  let existing: Array<{ id: string }> | null = null;
  try {
    existing = await supabaseAdmin<Array<{ id: string }>>(`payment_events?${query}`);
  } catch (error) {
    logDbError("payment_events lookup", error);
    return NextResponse.json({ error: "Database lookup failed" }, { status: 503 });
  }

  if (existing?.length) {
    const paymentEventId = existing[0].id;
    let ledgerExists: Array<{ id: string; agent_id?: string | null }> | null = null;
    try {
      ledgerExists = await supabaseAdmin<Array<{ id: string; agent_id?: string | null }>>(`revenue_ledger?event_id=eq.${encodeURIComponent(paymentEventId)}&select=id,agent_id&limit=1`);
    } catch (error) {
      logDbError("revenue_ledger duplicate lookup", error);
      return NextResponse.json({ error: "Ledger lookup failed", payment_event_id: paymentEventId }, { status: 503 });
    }
    return NextResponse.json({ accepted: true, duplicate: true, recorded: Boolean(ledgerExists?.length), payment_event_id: paymentEventId, ledger_id: ledgerExists?.[0]?.id, agent_id: ledgerExists?.[0]?.agent_id ?? agentId });
  }

  let paymentEvent: { id: string } | undefined;
  try {
    const inserted = await supabaseAdmin<Array<{ id: string }>>("payment_events", {
      method: "POST",
      headers: { Prefer: "return=representation,resolution=ignore-duplicates" },
      body: JSON.stringify({
        provider: "payos",
        external_event_id: externalEventId,
        status: "success",
        amount,
        payload,
        created_at: new Date().toISOString(),
      }),
    });
    paymentEvent = inserted?.[0];
  } catch (error) {
    logDbError("payment_events insert", error);
  }

  if (!paymentEvent) {
    try {
      const concurrent = await supabaseAdmin<Array<{ id: string }>>(`payment_events?${query}`);
      paymentEvent = concurrent?.[0];
    } catch (error) {
      logDbError("payment_events concurrent lookup", error);
    }
  }

  if (!paymentEvent) {
    return NextResponse.json({ error: "Could not persist verified payment event" }, { status: 500 });
  }

  try {
    const existingLedger = await supabaseAdmin<Array<{ id: string; agent_id?: string | null }>>(`revenue_ledger?event_id=eq.${encodeURIComponent(paymentEvent.id)}&select=id,agent_id&limit=1`);
    if (existingLedger?.length) {
      return NextResponse.json({ accepted: true, duplicate: true, recorded: true, payment_event_id: paymentEvent.id, ledger_id: existingLedger[0].id, agent_id: existingLedger[0].agent_id ?? agentId });
    }
  } catch (error) {
    logDbError("revenue_ledger pre-insert lookup", error);
    return NextResponse.json({ error: "Ledger lookup failed", payment_event_id: paymentEvent.id }, { status: 503 });
  }

  try {
    const ledger = await supabaseAdmin<Array<{ id: string }>>("revenue_ledger", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ event_id: paymentEvent.id, amount, ...(agentId ? { agent_id: agentId } : {}) }),
    });
    return NextResponse.json({ accepted: true, duplicate: false, recorded: true, payment_event_id: paymentEvent.id, ledger_id: ledger?.[0]?.id, agent_id: agentId });
  } catch (error) {
    logDbError("revenue_ledger insert", error);
    return NextResponse.json({ error: "Payment event persisted; ledger write failed and can be retried safely", payment_event_id: paymentEvent.id }, { status: 500 });
  }
}
