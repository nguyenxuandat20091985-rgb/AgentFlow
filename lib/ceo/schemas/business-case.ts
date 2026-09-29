/** Business case — forecast_only, never booked as cash. */
export const BUSINESS_CASE_STATUSES = ["draft","review","approved","rejected","superseded"] as const;
export type BusinessCaseStatus = (typeof BUSINESS_CASE_STATUSES)[number];

export type BusinessCaseAssumptions = {
  conversionRate: number; averageOrderValueVnd: number; monthlyTraffic: number; refundRate: number;
  infrastructureCostVnd: number; aiCostVnd: number; otherCostVnd: number; notes: string[];
};
export type BusinessCase = {
  id: string; opportunityId: string | null; title: string; status: BusinessCaseStatus;
  assumptions: BusinessCaseAssumptions;
  projectedGrossMonthlyVnd: number; projectedNetMonthlyVnd: number;
  confidenceIntervalLowVnd: number; confidenceIntervalHighVnd: number;
  classification: "forecast_only"; isRealizedRevenue: false;
  createdAt: string; updatedAt: string; reviewedBy: string | null;
};
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

function isObject(v: unknown): v is Record<string, unknown> { return typeof v === "object" && v !== null && !Array.isArray(v); }
function asString(v: unknown): string | null { return typeof v === "string" ? v : null; }
function asNumber(v: unknown): number | null { return typeof v === "number" && Number.isFinite(v) ? v : null; }
function asStringArray(v: unknown): string[] | null {
  if (!Array.isArray(v) || !v.every((i) => typeof i === "string")) return null;
  return v as string[];
}

function validateAssumptions(input: unknown): ValidationResult<BusinessCaseAssumptions> {
  if (!isObject(input)) return { ok: false, errors: ["assumptions must be an object"] };
  const errors: string[] = [];
  const conversionRate = asNumber(input.conversionRate);
  const averageOrderValueVnd = asNumber(input.averageOrderValueVnd);
  const monthlyTraffic = asNumber(input.monthlyTraffic);
  const refundRate = asNumber(input.refundRate);
  const infrastructureCostVnd = asNumber(input.infrastructureCostVnd);
  const aiCostVnd = asNumber(input.aiCostVnd);
  const otherCostVnd = asNumber(input.otherCostVnd);
  const notes = asStringArray(input.notes);
  if (conversionRate === null || conversionRate < 0 || conversionRate > 1) errors.push("conversionRate 0..1");
  if (averageOrderValueVnd === null || averageOrderValueVnd < 0) errors.push("averageOrderValueVnd non-negative");
  if (monthlyTraffic === null || monthlyTraffic < 0) errors.push("monthlyTraffic non-negative");
  if (refundRate === null || refundRate < 0 || refundRate > 1) errors.push("refundRate 0..1");
  if (infrastructureCostVnd === null || infrastructureCostVnd < 0) errors.push("infrastructureCostVnd non-negative");
  if (aiCostVnd === null || aiCostVnd < 0) errors.push("aiCostVnd non-negative");
  if (otherCostVnd === null || otherCostVnd < 0) errors.push("otherCostVnd non-negative");
  if (notes === null) errors.push("notes must be string array");
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { conversionRate: conversionRate!, averageOrderValueVnd: averageOrderValueVnd!, monthlyTraffic: Math.floor(monthlyTraffic!), refundRate: refundRate!, infrastructureCostVnd: infrastructureCostVnd!, aiCostVnd: aiCostVnd!, otherCostVnd: otherCostVnd!, notes: notes ?? [] } };
}

export function projectFromAssumptions(a: BusinessCaseAssumptions) {
  const gross = a.monthlyTraffic * a.conversionRate * a.averageOrderValueVnd * (1 - a.refundRate);
  const costs = a.infrastructureCostVnd + a.aiCostVnd + a.otherCostVnd;
  const net = gross - costs;
  return { projectedGrossMonthlyVnd: Math.round(gross), projectedNetMonthlyVnd: Math.round(net), confidenceIntervalLowVnd: Math.round(net * 0.4), confidenceIntervalHighVnd: Math.round(net * 1.6) };
}

export function validateBusinessCase(input: unknown): ValidationResult<BusinessCase> {
  const errors: string[] = [];
  if (!isObject(input)) return { ok: false, errors: ["businessCase must be an object"] };
  const id = asString(input.id)?.trim() ?? "";
  const opportunityId = input.opportunityId == null ? null : asString(input.opportunityId);
  const title = asString(input.title)?.trim() ?? "";
  const status = asString(input.status)?.trim().toLowerCase() ?? "";
  const createdAt = asString(input.createdAt) ?? "";
  const updatedAt = asString(input.updatedAt) ?? "";
  const reviewedBy = input.reviewedBy == null ? null : asString(input.reviewedBy);
  if (!id) errors.push("id required");
  if (!title || title.length > 200) errors.push("title required");
  if (!(BUSINESS_CASE_STATUSES as readonly string[]).includes(status)) errors.push(`status invalid`);
  if (!createdAt || Number.isNaN(Date.parse(createdAt))) errors.push("createdAt ISO");
  if (!updatedAt || Number.isNaN(Date.parse(updatedAt))) errors.push("updatedAt ISO");
  if (input.isRealizedRevenue === true) errors.push("isRealizedRevenue must be false");
  if (input.classification !== undefined && input.classification !== "forecast_only") errors.push('classification must be "forecast_only"');
  const assResult = validateAssumptions(input.assumptions);
  if (!assResult.ok) errors.push(...assResult.errors);
  if (errors.length || !assResult.ok) return { ok: false, errors };
  const assumptions = assResult.value;
  const projection = projectFromAssumptions(assumptions);
  return {
    ok: true,
    value: {
      id, opportunityId: opportunityId == null ? null : String(opportunityId), title,
      status: status as BusinessCaseStatus, assumptions,
      projectedGrossMonthlyVnd: asNumber(input.projectedGrossMonthlyVnd) ?? projection.projectedGrossMonthlyVnd,
      projectedNetMonthlyVnd: asNumber(input.projectedNetMonthlyVnd) ?? projection.projectedNetMonthlyVnd,
      confidenceIntervalLowVnd: asNumber(input.confidenceIntervalLowVnd) ?? projection.confidenceIntervalLowVnd,
      confidenceIntervalHighVnd: asNumber(input.confidenceIntervalHighVnd) ?? projection.confidenceIntervalHighVnd,
      classification: "forecast_only", isRealizedRevenue: false, createdAt, updatedAt,
      reviewedBy: reviewedBy == null ? null : String(reviewedBy),
    },
  };
}
