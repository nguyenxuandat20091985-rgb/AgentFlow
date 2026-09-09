/**
 * AI Website Outreach — safety policy (salesbot only).
 * Draft-only by default. No auto-post outside allow-list destinations.
 */

export type OutreachDestinationKind =
  | "owned_storefront"
  | "owned_blog"
  | "public_rss_reply_draft"
  | "publisher_program"
  | "manual_only";

export type OutreachDestination = {
  id: string;
  name: string;
  kind: OutreachDestinationKind;
  /** Hostname patterns allowed for this destination (lowercase). Empty = owned only. */
  hostAllow: string[];
  /** If false, never auto-suggest publish — always manual. */
  enabled: boolean;
  /** Max drafts per runtime cycle for this destination. */
  maxDraftsPerCycle: number;
  notes: string;
};

/** Hard-blocked hosts — never suggest posting here (private, login-walled, or high abuse risk). */
export const BLOCKED_HOST_SUFFIXES = [
  "facebook.com",
  "fb.com",
  "instagram.com",
  "tiktok.com",
  "zalo.me",
  "messenger.com",
  "whatsapp.com",
  "telegram.org",
  "t.me",
  "linkedin.com",
  "shopee.vn",
  "lazada.vn",
  "tiki.vn",
] as const;

export const DEFAULT_DESTINATIONS: OutreachDestination[] = [
  {
    id: "owned_storefront",
    name: "Nhà Bếp Thông Minh storefront",
    kind: "owned_storefront",
    hostAllow: [],
    enabled: true,
    maxDraftsPerCycle: 5,
    notes: "On-site merchandising / SEO / product page drafts only.",
  },
  {
    id: "owned_blog",
    name: "Owned blog / content pages",
    kind: "owned_blog",
    hostAllow: [],
    enabled: true,
    maxDraftsPerCycle: 3,
    notes: "Buyer-first comparison and FAQ drafts for owned content.",
  },
  {
    id: "public_signal_reply",
    name: "Public buyer-intent reply draft",
    kind: "public_rss_reply_draft",
    hostAllow: ["reddit.com"],
    enabled: true,
    maxDraftsPerCycle: 5,
    notes:
      "Draft helpful replies to public RSS signals only. Never auto-submit. Operator must verify community rules before posting.",
  },
  {
    id: "manual_external",
    name: "Manual external channels",
    kind: "manual_only",
    hostAllow: [],
    enabled: true,
    maxDraftsPerCycle: 3,
    notes:
      "Generic draft for forums/apps the operator explicitly allows. Auto-post is disabled.",
  },
];

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function isBlockedHost(urlOrHost: string): boolean {
  const host = urlOrHost.includes("://") ? hostOf(urlOrHost) : urlOrHost.toLowerCase();
  if (!host) return true;
  return BLOCKED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

/** Parse optional env WEBSITE_OUTREACH_DESTINATIONS as JSON array of partial overrides. */
export function loadDestinations(): OutreachDestination[] {
  const raw = process.env.WEBSITE_OUTREACH_DESTINATIONS?.trim();
  if (!raw) return DEFAULT_DESTINATIONS.map((d) => ({ ...d }));
  try {
    const parsed = JSON.parse(raw) as Array<Partial<OutreachDestination> & { id: string }>;
    if (!Array.isArray(parsed)) return DEFAULT_DESTINATIONS.map((d) => ({ ...d }));
    return DEFAULT_DESTINATIONS.map((base) => {
      const override = parsed.find((p) => p.id === base.id);
      if (!override) return { ...base };
      return {
        ...base,
        ...override,
        hostAllow: Array.isArray(override.hostAllow) ? override.hostAllow.map(String) : base.hostAllow,
        enabled: override.enabled ?? base.enabled,
        maxDraftsPerCycle: Number(override.maxDraftsPerCycle ?? base.maxDraftsPerCycle) || base.maxDraftsPerCycle,
      };
    });
  } catch {
    console.warn("[website-outreach] invalid WEBSITE_OUTREACH_DESTINATIONS JSON — using defaults");
    return DEFAULT_DESTINATIONS.map((d) => ({ ...d }));
  }
}

export function destinationAllowsHost(destination: OutreachDestination, url: string): boolean {
  if (!destination.enabled) return false;
  if (isBlockedHost(url)) return false;
  if (destination.kind === "owned_storefront" || destination.kind === "owned_blog" || destination.kind === "manual_only") {
    return true; // not tied to external host
  }
  if (!destination.hostAllow.length) return false;
  const host = hostOf(url);
  return destination.hostAllow.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export const OUTREACH_RULES = [
  "Draft-only: never claim a post was published unless an authorized connector confirms it.",
  "Public feeds only for discovery; do not log in, bypass access controls, or scrape private areas.",
  "Affiliate links must be provider-generated (AccessTrade aff_link); never fabricate tracking params.",
  "Helpful answer first, product mention second. No spam, no mass-comment, no impersonation.",
  "Blocked hosts (Facebook, Instagram, TikTok, Zalo, Shopee, Lazada, Tiki, etc.) are never auto-targeted.",
  "Operator must verify each external community's rules before manually posting a draft.",
  "salesbot channel only — do not write Facebook/marketing queues from this module.",
] as const;
