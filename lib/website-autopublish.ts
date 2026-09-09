import { supabaseAdmin } from "@/lib/supabase-admin";
import { publishOwnedCms } from "@/lib/publishers/owned-cms";

const TIER_A_DESTINATIONS = new Set(["owned_storefront", "owned_blog"]);

export type QueueActionRow = {
  id: string;
  agent_id: string;
  action_type: string;
  channel: string;
  status: string;
  priority?: string;
  payload?: Record<string, unknown> | null;
};

export type AutopublishItemResult = {
  queueActionId: string;
  status: "published" | "skipped" | "failed";
  reason: string;
  publishedUrl?: string;
  providerResponseId?: string;
};

export type AutopublishReport = {
  ok: true;
  mode: "tier-a-owned-only";
  scanned: number;
  published: number;
  skipped: number;
  failed: number;
  items: AutopublishItemResult[];
  generatedAt: string;
};

async function loadCeoApprovedTierA(limit = 15): Promise<QueueActionRow[]> {
  const path =
    "agent_action_queue?select=id,agent_id,action_type,channel,status,priority,payload" +
    "&action_type=eq.website_outreach_post_draft&status=eq.ceo_approved&agent_id=eq.salesbot&order=created_at.desc&limit=" +
    String(limit);
  const rows = await supabaseAdmin<QueueActionRow[]>(path);
  return Array.isArray(rows) ? rows : [];
}

function isTierA(payload: Record<string, unknown>): boolean {
  const destinationId = String(payload.destinationId ?? "");
  return TIER_A_DESTINATIONS.has(destinationId);
}

async function markPublished(row: QueueActionRow, result: {
  publishedUrl: string;
  publishedAt: string;
  providerResponseId: string;
  postId: string;
  slug: string;
}) {
  const payload = {
    ...(row.payload ?? {}),
    publish: {
      status: "published",
      tier: "A",
      publisher: "owned-cms",
      publishedUrl: result.publishedUrl,
      publishedAt: result.publishedAt,
      providerResponseId: result.providerResponseId,
      postId: result.postId,
      slug: result.slug,
    },
  };
  await supabaseAdmin(`agent_action_queue?id=eq.${encodeURIComponent(row.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: "published", payload }),
  });
}

/**
 * Auto-publish CEO-approved Tier A (owned storefront/blog) drafts only.
 * Never publishes Tier B/C or blocked hosts.
 */
export async function runWebsiteAutopublish(options?: { limit?: number }): Promise<AutopublishReport> {
  const limit = Math.min(Math.max(options?.limit ?? 15, 1), 30);
  const rows = await loadCeoApprovedTierA(limit);
  const items: AutopublishItemResult[] = [];
  let published = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    if (!isTierA(payload)) {
      skipped += 1;
      items.push({
        queueActionId: row.id,
        status: "skipped",
        reason: `Not Tier A (destinationId=${String(payload.destinationId ?? "")}) — manual/API connector required`,
      });
      continue;
    }

    try {
      const result = await publishOwnedCms({
        title: String(payload.title ?? "Bai viet AI Website"),
        body: String(payload.body ?? ""),
        destinationId: String(payload.destinationId),
        queueActionId: row.id,
        affiliateLink: payload.affiliateLink == null ? null : String(payload.affiliateLink),
        productId: payload.productId == null ? null : String(payload.productId),
        productName: payload.productName == null ? null : String(payload.productName),
        sourceUrl: payload.sourceUrl == null ? null : String(payload.sourceUrl),
        priority: row.priority ?? null,
      });
      await markPublished(row, result);
      published += 1;
      items.push({
        queueActionId: row.id,
        status: "published",
        reason: "Tier A owned-cms publish confirmed",
        publishedUrl: result.publishedUrl,
        providerResponseId: result.providerResponseId,
      });
    } catch (error) {
      failed += 1;
      items.push({
        queueActionId: row.id,
        status: "failed",
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  try {
    await supabaseAdmin("agent_task_runs", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        agent_id: "salesbot",
        task_type: "website_tier_a_autopublish",
        status: failed && !published ? "failed" : "completed",
        input_snapshot: { limit, scanned: rows.length },
        output: { published, skipped, failed, items },
      }),
    });
  } catch {
    // non-fatal
  }

  return {
    ok: true,
    mode: "tier-a-owned-only",
    scanned: rows.length,
    published,
    skipped,
    failed,
    items,
    generatedAt: new Date().toISOString(),
  };
}
