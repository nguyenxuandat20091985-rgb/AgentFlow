import { supabaseAdmin } from "@/lib/supabase-admin";

export type WebsiteSignal = {
  source: string;
  source_url: string;
  external_id: string;
  title: string;
  body: string;
  author: string | null;
  published_at: string | null;
  intent_score: number;
  matched_terms: string[];
  metadata: Record<string, unknown>;
};

const DEFAULT_TERMS = [
  "nên mua", "nên chọn", "tư vấn mua", "mua ở đâu", "giá bao nhiêu",
  "đáng mua", "so sánh", "review", "máy xay", "nồi chiên", "nồi chảo",
  "máy sấy", "đồ gia dụng", "bếp", "gia dụng",
];

const FEED_TERMS = (process.env.WEBSITE_SIGNAL_TERMS || DEFAULT_TERMS.join(","))
  .split(",").map((v) => v.trim()).filter(Boolean).slice(0, 12);

function decodeEntities(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function stripHtml(value: string) {
  return decodeEntities(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function tag(xml: string, name: string) {
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return match ? stripHtml(match[1]) : "";
}

function extractItems(xml: string) {
  const chunks = xml.match(/<(?:item|entry)(?:\s[^>]*)?>[\s\S]*?<\/(?:item|entry)>/gi) || [];
  return chunks.slice(0, 40).map((chunk) => {
    const linkMatch = chunk.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || chunk.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?\s*>/i);
    return {
      title: tag(chunk, "title"),
      body: tag(chunk, "description") || tag(chunk, "summary") || tag(chunk, "content"),
      id: tag(chunk, "guid") || tag(chunk, "id") || (linkMatch?.[1] || ""),
      link: stripHtml(linkMatch?.[1] || ""),
      author: tag(chunk, "author") || tag(chunk, "dc:creator"),
      published: tag(chunk, "pubDate") || tag(chunk, "published") || tag(chunk, "updated"),
    };
  }).filter((item) => item.title && item.link);
}

function scoreSignal(title: string, body: string) {
  const haystack = `${title} ${body}`.toLowerCase();
  const matched = FEED_TERMS.filter((term) => haystack.includes(term.toLowerCase()));
  let score = matched.length * 12;
  if (/(nên mua|tư vấn mua|mua ở đâu|giá bao nhiêu|đáng mua|so sánh)/i.test(haystack)) score += 35;
  if (/(review|recommend|which one|buy)/i.test(haystack)) score += 10;
  return { score: Math.min(100, score), matched };
}

function safeIsoDate(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function configuredFeeds() {
  const custom = (process.env.WEBSITE_SIGNAL_FEEDS || "").split("\n").map((v) => v.trim()).filter(Boolean);
  if (custom.length) return custom.slice(0, 8);
  return FEED_TERMS.slice(0, 6).map((term) => `https://www.reddit.com/search.rss?q=${encodeURIComponent(term)}&sort=new&limit=15`);
}

export async function discoverWebsiteSignals() {
  const signals: WebsiteSignal[] = [];
  for (const feedUrl of configuredFeeds()) {
    try {
      const response = await fetch(feedUrl, {
        headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml", "User-Agent": "AgentFlow-AI-Website/1.0" },
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      });
      if (!response.ok) continue;
      const xml = await response.text();
      const source = new URL(feedUrl).hostname.replace(/^www\./, "");
      for (const item of extractItems(xml)) {
        const scored = scoreSignal(item.title, item.body);
        if (scored.score < 25) continue;
        signals.push({
          source,
          source_url: item.link,
          external_id: item.id || item.link,
          title: item.title.slice(0, 500),
          body: item.body.slice(0, 5000),
          author: item.author ? item.author.slice(0, 160) : null,
          published_at: safeIsoDate(item.published),
          intent_score: scored.score,
          matched_terms: scored.matched,
          metadata: { feedUrl },
        });
      }
    } catch (error) {
      console.warn("[website-hunter] feed unavailable", { feedUrl, error: error instanceof Error ? error.message : String(error) });
    }
  }

  const unique = Array.from(new Map(signals.map((signal) => [`${signal.source}:${signal.external_id}`, signal])).values())
    .sort((a, b) => b.intent_score - a.intent_score)
    .slice(0, 50);

  if (!unique.length) return { discovered: 0, persisted: 0, signals: [] as WebsiteSignal[] };

  // Persist one signal at a time so an already-known signal is a normal no-op.
  // This makes the hunter idempotent even when the database has a unique constraint
  // on (source, external_id) and the RSS feed returns the same item again.
  let persistedCount = 0;
  for (const signal of unique) {
    try {
      const inserted = await supabaseAdmin<WebsiteSignal[]>("website_signals", {
        method: "POST",
        headers: { Prefer: "return=representation,resolution=ignore-duplicates" },
        body: JSON.stringify([signal]),
      });
      if (Array.isArray(inserted) && inserted.length > 0) persistedCount += inserted.length;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/duplicate key|unique constraint|already exists/i.test(message)) {
        continue;
      }
      console.error("[website-hunter] signal persistence failed", {
        source: signal.source,
        external_id: signal.external_id,
        message,
      });
    }
  }

  return { discovered: unique.length, persisted: persistedCount, signals: unique };
}
