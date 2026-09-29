/**
 * Revenue ledger classification — verified cash vs pending/forecast.
 * Pending/forecast MUST NEVER become realized revenue.
 */
export const LEDGER_STATUSES = ["pending", "confirmed", "refunded", "disputed", "failed"] as const;
export type LedgerStatus = (typeof LEDGER_STATUSES)[number];

export type LedgerEventInput = {
  status: string;
  amount: number;
  source?: string | null;
  eventId?: string | null;
  provider?: string | null;
};

export type ClassifiedLedger = {
  status: LedgerStatus;
  amount: number;
  countsTowardRealized: boolean;
  classification: "realized" | "pending" | "refund" | "disputed" | "failed" | "ignored";
  reason: string;
};

export function classifyLedgerEvent(input: LedgerEventInput): ClassifiedLedger {
  const raw = String(input.status ?? "").trim().toLowerCase();
  const amount = Number(input.amount);
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  if (raw === "confirmed" || raw === "success" || raw === "paid" || raw === "completed") {
    if (safeAmount > 0) {
      return { status: "confirmed", amount: safeAmount, countsTowardRealized: true, classification: "realized", reason: "provider-confirmed positive amount" };
    }
    return { status: "confirmed", amount: safeAmount, countsTowardRealized: false, classification: "ignored", reason: "confirmed but non-positive amount" };
  }
  if (raw === "pending" || raw === "processing" || raw === "awaiting") {
    return { status: "pending", amount: safeAmount, countsTowardRealized: false, classification: "pending", reason: "pending is not realized cash" };
  }
  if (raw === "refunded" || raw === "refund" || raw === "reversed") {
    return { status: "refunded", amount: safeAmount, countsTowardRealized: false, classification: "refund", reason: "refund never inflates revenue" };
  }
  if (raw === "disputed" || raw === "chargeback") {
    return { status: "disputed", amount: safeAmount, countsTowardRealized: false, classification: "disputed", reason: "disputed funds are not realized" };
  }
  if (raw === "failed" || raw === "cancelled" || raw === "canceled" || raw === "expired") {
    return { status: "failed", amount: safeAmount, countsTowardRealized: false, classification: "failed", reason: "failed payment is not revenue" };
  }
  return { status: "failed", amount: safeAmount, countsTowardRealized: false, classification: "ignored", reason: `unknown status "${raw}" treated as non-realized` };
}

export function sumRealizedRevenue(events: ClassifiedLedger[]): number {
  return events.reduce((sum, e) => (e.countsTowardRealized ? sum + e.amount : sum), 0);
}

export function isForecastOnly(source: string | null | undefined): boolean {
  const s = String(source ?? "").toLowerCase();
  return s.includes("forecast") || s.includes("opportunity") || s.includes("business_case") || s.includes("projection") || s.includes("estimate");
}
