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
};

async function persistOutreachQueue(drafts: OutreachDraft[]) {
  if (!drafts.length) return 0;
  const rows = drafts.map((d) => ({
    agent_id: "salesbot",
    action_type: d.type,
    channel: "website",
    status: "pending" as const,
    priority: d.priority,
    source_type: d.sourceType,
    source_id: d.sourceId,
    dedupe_key: `salesbot:${d.type}:${d.destinationId}:${d.sourceId}:${d.productId ?? ""}`,
    payload: d,
  }));
  try {
    const result = await supabaseAdmin<unknown[]>("agent_action_queue?on_conflict=dedupe_key", {
      method: "POST",
      headers: { Prefer: "return=representation,resolution=ignore-duplicates" },
      body: JSON.stringify(rows),
    });
    return Array.isArray(result) ? result.length : 0;
  } catch (error) {
    console.error("[website-outreach] persist queue failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
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
  const persistedQueueCount = persist ? await persistOutreachQueue(drafts) : 0;

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
  };
}

export { loadDestinations, OUTREACH_RULES, buildOutreachDrafts };
export type { OutreachDraft, OutreachDestination };
