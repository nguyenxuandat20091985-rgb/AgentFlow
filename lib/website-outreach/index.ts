import {
  fetchAccessTradeDatafeeds,
  rankAffiliateOpportunities,
  type AccessTradeFeedItem,
} from "@/lib/accesstrade";
import { discoverWebsiteSignals, type WebsiteSignal } from "@/lib/website-hunter";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { loadDestinations, OUTREACH_RULES, type OutreachDestination } from "./policy";
import { buildOutreachDrafts, type OutreachDraft } from "./draft-writer";

export type WebsiteOutreachResult = {
  ok: true;
  agent: "salesbot";
  channel: "website";
  mode: "outreach-draft-only";
  destinations: Array<Pick<OutreachDestination, "id" | "name" | "kind" | "enabled" | "maxDraftsPerCycle">>;
  signalsUsed: number;
  productsUsed: number;
  draftsBuilt: number;
  persistedQueueCount: number;
  drafts: OutreachDraft[];
  rules: readonly string[];
  persistError?: string | null;
};

function dayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function persistOutreachQueue(drafts: OutreachDraft[]): Promise<{ count: number; error?: string }> {
  if (!drafts.length) return { count: 0 };
  const day = dayKey();
  const rows = drafts.map((d) => ({
    agent_id: "salesbot",
    action_type: d.type,
    channel: "website",
    status: "pending" as const,
    priority: d.priority,
    source_type: d.sourceType,
    source_id: d.sourceId,
    // day bucket so each day can re-queue; upsert refreshes payload
    dedupe_key: `salesbot:${d.type}:${d.destinationId}:${d.sourceId}:${day}`,
    payload: d,
  }));

  try {
    // Upsert: insert or merge on dedupe_key so status returns to pending with fresh payload
    const result = await supabaseAdmin<unknown[]>("agent_action_queue?on_conflict=dedupe_key", {
      method: "POST",
      headers: { Prefer: "return=representation,resolution=merge-duplicates" },
      body: JSON.stringify(rows),
    });
    if (Array.isArray(result) && result.length) {
      return { count: result.length };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[website-outreach] upsert failed", { error: msg });
    // fallback: try plain insert ignore-duplicates
    try {
      const result = await supabaseAdmin<unknown[]>("agent_action_queue?on_conflict=dedupe_key", {
        method: "POST",
        headers: { Prefer: "return=representation,resolution=ignore-duplicates" },
        body: JSON.stringify(rows),
      });
      if (Array.isArray(result) && result.length) return { count: result.length };
    } catch (error2) {
      return { count: 0, error: error2 instanceof Error ? error2.message : String(error2) };
    }
    return { count: 0, error: msg };
  }

  // If merge returned empty, force pending for today's keys
  let forced = 0;
  for (const row of rows) {
    try {
      await supabaseAdmin(`agent_action_queue?dedupe_key=eq.${encodeURIComponent(row.dedupe_key)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          status: "pending",
          priority: row.priority,
          payload: row.payload,
        }),
      });
      forced += 1;
    } catch {
      // continue
    }
  }
  return { count: forced };
}

export async function runWebsiteOutreachPlanner(options?: {
  signals?: WebsiteSignal[];
  persist?: boolean;
}): Promise<WebsiteOutreachResult> {
  const destinations = loadDestinations();
  let signals = options?.signals ?? [];
  if (!signals.length) {
    try {
      signals = (await discoverWebsiteSignals()).signals;
    } catch (error) {
      console.warn("[website-outreach] signal discovery failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      signals = [];
    }
  }

  let products: AccessTradeFeedItem[] = [];
  try {
    products = rankAffiliateOpportunities(await fetchAccessTradeDatafeeds({ limit: 40 })).slice(0, 20);
  } catch (error) {
    console.warn("[website-outreach] AccessTrade unavailable", {
      error: error instanceof Error ? error.message : String(error),
    });
    products = [];
  }

  const drafts = buildOutreachDrafts({ destinations, signals, products });
  const persist = options?.persist !== false;
  let persistedQueueCount = 0;
  let persistError: string | null = null;
  if (persist) {
    const r = await persistOutreachQueue(drafts);
    persistedQueueCount = r.count;
    persistError = r.error ?? null;
  }

  return {
    ok: true,
    agent: "salesbot",
    channel: "website",
    mode: "outreach-draft-only",
    destinations: destinations.map(({ id, name, kind, enabled, maxDraftsPerCycle }) => ({
      id,
      name,
      kind,
      enabled,
      maxDraftsPerCycle,
    })),
    signalsUsed: signals.length,
    productsUsed: products.length,
    draftsBuilt: drafts.length,
    persistedQueueCount,
    drafts: drafts.slice(0, 30),
    rules: OUTREACH_RULES,
    persistError,
  };
}

export { loadDestinations, OUTREACH_RULES, buildOutreachDrafts };
export type { OutreachDraft, OutreachDestination };
