import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  // Bank details must be supplied only through server-side environment variables.
  const bankCode = process.env.OWNER_BANK_CODE;
  const accountNo = process.env.OWNER_BANK_ACCOUNT;
  const accountName = process.env.OWNER_BANK_NAME;
  if (!bankCode || !accountNo || !accountName) return NextResponse.json({ error: "Payment destination is not configured" }, { status: 503 });
  const addInfo = String(body.orderRef || `AGENTFLOW-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 50);
  const qrUrl = `https://img.vietqr.io/image/${encodeURIComponent(bankCode)}-${encodeURIComponent(accountNo)}-compact2.png?amount=${Math.round(amount)}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(accountName)}`;
  return NextResponse.json({ provider: "vietqr", qrUrl, orderRef: addInfo, amount, currency: "VND" });
}
