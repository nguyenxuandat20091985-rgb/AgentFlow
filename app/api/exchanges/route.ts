import { NextResponse } from "next/server";

const supported = ["binance", "bybit", "okx"] as const;

type Exchange = typeof supported[number];

export function GET() {
  const result = Object.fromEntries(supported.map((exchange) => [exchange, {
    configured: Boolean(process.env[`${exchange.toUpperCase()}_READONLY_KEY`]),
    mode: "read-only",
    withdrawals: false,
    trading: false,
  }])) as Record<Exchange, unknown>;
  return NextResponse.json({ exchanges: result, policy: "AgentFlow never requests withdrawal, transfer, trading, or private-key permissions." }, { headers: { "cache-control": "no-store" } });
}
