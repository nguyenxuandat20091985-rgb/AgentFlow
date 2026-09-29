/**
 * Opportunity engine — discovers hypotheses. Never books revenue.
 */
import { validateOpportunity, type Opportunity } from "@/lib/ceo/schemas/opportunity";
import { validateBusinessCase, projectFromAssumptions, type BusinessCase } from "@/lib/ceo/schemas/business-case";

export function buildOpportunityFromSignal(input: {
  id?: string;
  title: string;
  summary: string;
  domain: string;
  sourceUrl?: string | null;
  provider?: string;
  confidence?: number;
  region?: string | null;
}): { ok: true; opportunity: Opportunity } | { ok: false; errors: string[] } {
  const now = new Date().toISOString();
  const id = input.id ?? `opp_${Date.now().toString(36)}`;
  const candidate = {
    id,
    title: input.title,
    summary: input.summary,
    domain: input.domain,
    status: "discovered" as const,
    source: {
      url: input.sourceUrl ?? null,
      provider: input.provider ?? "manual_or_public_signal",
      capturedAt: now,
      region: input.region ?? null,
      termsOfUse: "public_or_provider_approved",
      confidence: input.confidence ?? 0.4,
    },
    assumptions: [
      "Hypothesis only — not verified demand",
      "No revenue booked until provider payment confirmation",
    ],
    estimatedMonthlyRevenueVnd: null,
    estimatedMonthlyCostVnd: null,
    isRealizedRevenue: false as const,
    createdAt: now,
    updatedAt: now,
    decidedBy: null,
    decisionNotes: null,
  };
  const validated = validateOpportunity(candidate);
  if (!validated.ok) return validated;
  return { ok: true, opportunity: validated.value };
}

export function buildDraftBusinessCase(input: {
  id?: string;
  opportunityId?: string | null;
  title: string;
  monthlyTraffic?: number;
  conversionRate?: number;
  averageOrderValueVnd?: number;
  infrastructureCostVnd?: number;
  aiCostVnd?: number;
}): { ok: true; businessCase: BusinessCase } | { ok: false; errors: string[] } {
  const now = new Date().toISOString();
  const assumptions = {
    conversionRate: input.conversionRate ?? 0.01,
    averageOrderValueVnd: input.averageOrderValueVnd ?? 100_000,
    monthlyTraffic: input.monthlyTraffic ?? 1000,
    refundRate: 0.05,
    infrastructureCostVnd: input.infrastructureCostVnd ?? 500_000,
    aiCostVnd: input.aiCostVnd ?? 200_000,
    otherCostVnd: 0,
    notes: ["Conservative defaults — replace with measured data before approval"],
  };
  const projection = projectFromAssumptions(assumptions);
  const candidate = {
    id: input.id ?? `bc_${Date.now().toString(36)}`,
    opportunityId: input.opportunityId ?? null,
    title: input.title,
    status: "draft" as const,
    assumptions,
    ...projection,
    classification: "forecast_only" as const,
    isRealizedRevenue: false as const,
    createdAt: now,
    updatedAt: now,
    reviewedBy: null,
  };
  const v = validateBusinessCase(candidate);
  if (!v.ok) return v;
  return { ok: true, businessCase: v.value };
}

export function recommendContinueOrStop(bc: BusinessCase): {
  recommendation: "continue" | "stop" | "review";
  reason: string;
} {
  if (bc.projectedNetMonthlyVnd < 0) {
    return { recommendation: "stop", reason: "Projected net monthly is negative under stated assumptions" };
  }
  if (bc.confidenceIntervalLowVnd < 0) {
    return { recommendation: "review", reason: "Low end of confidence interval is negative" };
  }
  return { recommendation: "continue", reason: "Projected net positive within stated assumptions (still forecast only)" };
}
