/** Opportunity research — hypothesis only, never booked revenue. */
export const OPPORTUNITY_STATUSES = ["discovered","researching","evaluated","accepted","rejected","archived"] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

export type OpportunitySource = {
  url: string | null; provider: string; capturedAt: string; region: string | null; termsOfUse: string | null; confidence: number;
};
export type Opportunity = {
  id: string; title: string; summary: string; domain: string; status: OpportunityStatus;
  source: OpportunitySource; assumptions: string[];
  estimatedMonthlyRevenueVnd: number | null; estimatedMonthlyCostVnd: number | null;
  isRealizedRevenue: false; createdAt: string; updatedAt: string;
  decidedBy: string | null; decisionNotes: string | null;
};
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

function isObject(v: unknown): v is Record<string, unknown> { return typeof v === "object" && v !== null && !Array.isArray(v); }
function asString(v: unknown): string | null { return typeof v === "string" ? v : null; }
function asNumber(v: unknown): number | null { return typeof v === "number" && Number.isFinite(v) ? v : null; }
function asStringArray(v: unknown): string[] | null {
  if (!Array.isArray(v) || !v.every((i) => typeof i === "string")) return null;
  return v as string[];
}

export function validateOpportunity(input: unknown): ValidationResult<Opportunity> {
  const errors: string[] = [];
  if (!isObject(input)) return { ok: false, errors: ["opportunity must be an object"] };
  const id = asString(input.id)?.trim() ?? "";
  const title = asString(input.title)?.trim() ?? "";
  const summary = asString(input.summary)?.trim() ?? "";
  const domain = asString(input.domain)?.trim().toLowerCase() ?? "";
  const status = asString(input.status)?.trim().toLowerCase() ?? "";
  const assumptions = asStringArray(input.assumptions);
  const estimatedMonthlyRevenueVnd = input.estimatedMonthlyRevenueVnd == null ? null : asNumber(input.estimatedMonthlyRevenueVnd);
  const estimatedMonthlyCostVnd = input.estimatedMonthlyCostVnd == null ? null : asNumber(input.estimatedMonthlyCostVnd);
  const createdAt = asString(input.createdAt) ?? "";
  const updatedAt = asString(input.updatedAt) ?? "";
  const decidedBy = input.decidedBy == null ? null : asString(input.decidedBy);
  const decisionNotes = input.decisionNotes == null ? null : asString(input.decisionNotes);

  if (!id) errors.push("id is required");
  if (!title || title.length > 200) errors.push("title is required (max 200)");
  if (!summary) errors.push("summary is required");
  if (!domain) errors.push("domain is required");
  if (!(OPPORTUNITY_STATUSES as readonly string[]).includes(status)) errors.push(`status must be one of: ${OPPORTUNITY_STATUSES.join(", ")}`);
  if (assumptions === null) errors.push("assumptions must be a string array");
  if (estimatedMonthlyRevenueVnd !== null && estimatedMonthlyRevenueVnd < 0) errors.push("estimatedMonthlyRevenueVnd must be non-negative");
  if (estimatedMonthlyCostVnd !== null && estimatedMonthlyCostVnd < 0) errors.push("estimatedMonthlyCostVnd must be non-negative");
  if (!createdAt || Number.isNaN(Date.parse(createdAt))) errors.push("createdAt must be ISO");
  if (!updatedAt || Number.isNaN(Date.parse(updatedAt))) errors.push("updatedAt must be ISO");
  if (input.isRealizedRevenue === true) errors.push("isRealizedRevenue must always be false");
  if (!isObject(input.source)) errors.push("source must be an object");
  else {
    if (!asString(input.source.provider)?.trim()) errors.push("source.provider required");
    if (!asString(input.source.capturedAt) || Number.isNaN(Date.parse(String(input.source.capturedAt)))) errors.push("source.capturedAt must be ISO");
    const conf = asNumber(input.source.confidence);
    if (conf === null || conf < 0 || conf > 1) errors.push("source.confidence must be 0..1");
  }
  if (errors.length) return { ok: false, errors };
  const src = input.source as Record<string, unknown>;
  return {
    ok: true,
    value: {
      id, title, summary, domain, status: status as OpportunityStatus,
      source: {
        url: src.url == null ? null : String(src.url),
        provider: String(src.provider),
        capturedAt: String(src.capturedAt),
        region: src.region == null ? null : String(src.region),
        termsOfUse: src.termsOfUse == null ? null : String(src.termsOfUse),
        confidence: Number(src.confidence),
      },
      assumptions: assumptions ?? [],
      estimatedMonthlyRevenueVnd, estimatedMonthlyCostVnd,
      isRealizedRevenue: false, createdAt, updatedAt,
      decidedBy: decidedBy == null ? null : String(decidedBy),
      decisionNotes: decisionNotes == null ? null : String(decisionNotes),
    },
  };
}
