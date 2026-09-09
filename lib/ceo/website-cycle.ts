/**
 * Deterministic AI Website cycle under AI CEO — no OpenAI required for core path.
 * Heartbeat → outreach drafts → CEO review → Tier A autopublish.
 */
import { supabaseAdmin } from "@/lib/supabase-admin";
import { runWebsiteOutreachPlanner } from "@/lib/website-outreach";
import { runCeoOutreachReview } from "@/lib/ceo-outreach-review";
import { runWebsiteAutopublish } from "@/lib/website-autopublish";

export type WebsiteCycleReport = {
  ok: boolean;
  generatedAt: string;
  heartbeat?: { ok: boolean; error?: string };
  outreach?: {
    draftsBuilt: number;
    persistedQueueCount: number;
    productsUsed: number;
    signalsUsed: number;
    persistError?: string | null;
  };
  review?: {
    scanned: number;
    approved: number;
    rejected: number;
    autoPublished: number;
  };
  autopublish?: {
    scanned: number;
    published: number;
    failed: number;
    skipped: number;
  };
  errors: string[];
};

async function touchHeartbeat(agentId: "salesbot" | "marketing") {
  await supabaseAdmin("agent_heartbeats", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      agent_id: agentId,
      status: "running",
      last_seen_at: new Date().toISOString(),
      meta: { source: "ceo-website-cycle" },
    }),
  }).catch(async () => {
    // table shape may differ — try agents update
    await supabaseAdmin(`agents?id=eq.${agentId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        status: "running",
        last_seen_at: new Date().toISOString(),
        current_task: agentId === "salesbot" ? "Đang chạy chu kỳ Website (CEO)" : "Đang chạy chu kỳ Marketing (CEO)",
      }),
    }).catch(() => undefined);
  });
}

export async function runCeoWebsiteCycle(): Promise<WebsiteCycleReport> {
  const errors: string[] = [];
  const report: WebsiteCycleReport = {
    ok: true,
    generatedAt: new Date().toISOString(),
    errors,
  };

  try {
    await touchHeartbeat("salesbot");
    await touchHeartbeat("marketing");
    report.heartbeat = { ok: true };
  } catch (e) {
    report.heartbeat = { ok: false, error: e instanceof Error ? e.message : String(e) };
    errors.push(`heartbeat: ${report.heartbeat.error}`);
  }

  try {
    const outreach = await runWebsiteOutreachPlanner({ persist: true });
    report.outreach = {
      draftsBuilt: outreach.draftsBuilt,
      persistedQueueCount: outreach.persistedQueueCount,
      productsUsed: outreach.productsUsed,
      signalsUsed: outreach.signalsUsed,
      persistError: outreach.persistError ?? null,
    };
    if (outreach.persistError) errors.push(`outreach.persist: ${outreach.persistError}`);
  } catch (e) {
    errors.push(`outreach: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const review = await runCeoOutreachReview({ persist: true, autopublish: true });
    report.review = {
      scanned: review.scanned,
      approved: review.approved,
      rejected: review.rejected,
      autoPublished: review.autoPublished,
    };
  } catch (e) {
    errors.push(`review: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const pub = await runWebsiteAutopublish({ limit: 15 });
    report.autopublish = {
      scanned: pub.scanned,
      published: pub.published,
      failed: pub.failed,
      skipped: pub.skipped,
    };
  } catch (e) {
    errors.push(`autopublish: ${e instanceof Error ? e.message : String(e)}`);
  }

  report.ok = errors.length === 0 || Boolean(report.review?.approved || report.autopublish?.published);
  return report;
}
