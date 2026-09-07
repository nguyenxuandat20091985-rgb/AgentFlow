import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function stableValue(value: unknown): string {
  if (value === null || value === undefined || value === "null" || value === "undefined") return "";
  if (Array.isArray(value)) return JSON.stringify(value.map((item) => item && typeof item === "object" ? sortObject(item as Record<string, unknown>) : item));
  return String(value);
}
function sortObject(input: Record<string, unknown>) {
  return Object.keys(input).sort().reduce<Record<string, unknown>>((out, key) => { out[key] = input[key]; return out; }, {});
}
function verifyPayOSSignature(data: Record<string, unknown>, signature: string, checksumKey: string) {
  const sorted = sortObject(data);
  const query = Object.keys(sorted).map((key) => `${key}=${stableValue(sorted[key])}`).join("&");
  const expected = createHmac("sha256", checksumKey).update(query).digest("hex");
  const a = Buffer.from(expected, "utf8"); const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
  if (!checksumKey) return NextResponse.json({ error: "PAYOS_CHECKSUM_KEY is not configured" }, { status: 503 });
  const raw = await request.text();
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const data = payload.data as Record<string, unknown> | undefined;
  const signature = String(payload.signature || "");
  if (!data || !signature || !verifyPayOSSignature(data, signature, checksumKey)) return NextResponse.json({ error: "Invalid PayOS signature" }, { status: 401 });

  const success = payload.success === true && String(payload.code || "") === "00" && String(data.code || "") === "00";
  const externalEventId = String(data.reference || data.orderCode || "").trim();
  const amount = Number(data.amount);
  const currency = String(data.currency || "VND").toUpperCase();
  if (!success || !externalEventId || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ accepted: true, recorded: false, reason: "Payment is not a verified success event" });

  const rawHash = createHash("sha256").update(raw).digest("hex");
  const query = "provider=eq.payos&external_event_id=eq." + encodeURIComponent(externalEventId) + "&select=id,external_event_id&limit=1";
  const existing = await supabaseAdmin<Array<{id:string}>>(`payment_events?${query}`);
  if (existing?.length) return NextResponse.json({ accepted: true, duplicate: true, recorded: true, payment_event_id: existing[0].id });

  let paymentEvent: {id:string} | undefined;
  try {
    const inserted = await supabaseAdmin<Array<{id:string}>>("payment_events", { method: "POST", headers: { Prefer: "return=representation,resolution=ignore-duplicates" }, body: JSON.stringify({ provider: "payos", external_event_id: externalEventId, status: "success", amount, currency, raw_hash: rawHash, verified_at: new Date().toISOString() }) });
    paymentEvent = inserted?.[0];
  } catch { /* concurrent delivery: fetch the row below */ }
  if (!paymentEvent) {
    const concurrent = await supabaseAdmin<Array<{id:string}>>(`payment_events?${query}`);
    paymentEvent = concurrent?.[0];
  }
  if (!paymentEvent) return NextResponse.json({ error: "Could not persist verified payment event" }, { status: 500 });

  try {
    const ledger = await supabaseAdmin<Array<{id:string}>>("revenue_ledger", { method: "POST", headers: { Prefer: "return=representation,resolution=ignore-duplicates" }, body: JSON.stringify({ source: "payos", payment_event_id: paymentEvent.id, amount, currency }) });
    return NextResponse.json({ accepted: true, duplicate: false, recorded: true, payment_event_id: paymentEvent.id, ledger_id: ledger?.[0]?.id });
  } catch {
    return NextResponse.json({ error: "Payment event persisted; ledger write failed and can be retried safely", payment_event_id: paymentEvent.id }, { status: 500 });
  }
}
