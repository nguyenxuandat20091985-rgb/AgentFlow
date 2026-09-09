export type FacebookSignal = {
  source: string;
  source_url: string;
  external_id: string;
  title: string;
  body: string;
  intent_score: number;
  matched_terms: string[];
};

const DEFAULT_FEEDS = [
  "https://www.reddit.com/search.rss?q=n%C3%AAn%20mua%20%C4%91%E1%BB%93%20gia%20d%E1%BB%A5ng&sort=new",
  "https://www.reddit.com/search.rss?q=xin%20review%20%C4%91%E1%BB%93%20gia%20d%E1%BB%A5ng&sort=new",
  "https://www.reddit.com/search.rss?q=t%C6%B0%20v%E1%BA%A5n%20mua%20m%C3%A1y%20s%E1%BA%A5y%20t%C3%B3c&sort=new",
  "https://www.reddit.com/search.rss?q=t%C6%B0%20v%E1%BA%A5n%20mua%20n%E1%BB%93i%20ch%E1%BA%A3o&sort=new",
];

const INTENT_TERMS = [
  "nên mua", "xin review", "tư vấn mua", "mua ở đâu", "giá bao nhiêu",
  "đáng mua", "nên chọn", "so sánh", "review", "recommend", "buy", "price",
];

function clean(value: string) {
  return value.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">" ).replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
}

function tag(item: string, name: string) {
  const match = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return match ? clean(match[1]) : "";
}

function score(title: string, body: string) {
  const haystack = `${title} ${body}`.toLowerCase();
  const matched = INTENT_TERMS.filter((term) => haystack.includes(term));
  return { score: Math.min(100, matched.length * 18 + (haystack.includes("mua") ? 15 : 0)), matched };
}

function extractItems(xml: string, sourceUrl: string): FacebookSignal[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  return items.map((item, index) => {
    const title = tag(item, "title") || "Facebook/community buying signal";
    const body = tag(item, "description") || tag(item, "content:encoded") || title;
    const url = tag(item, "link") || sourceUrl;
    const guid = tag(item, "guid") || url || `${sourceUrl}:${index}`;
    const intent = score(title, body);
    return { source: "public_rss", source_url: url, external_id: guid, title, body: body.slice(0, 4000), intent_score: intent.score, matched_terms: intent.matched };
  }).filter((signal) => signal.intent_score >= 25);
}

export function facebookSignalFeeds() {
  return (process.env.FACEBOOK_SIGNAL_FEEDS || "").split(",").map((value) => value.trim()).filter(Boolean).slice(0, 10).concat(DEFAULT_FEEDS.filter((feed) => !(process.env.FACEBOOK_SIGNAL_FEEDS || "").includes(feed)));
}

export async function discoverFacebookSignals(limit = 40) {
  const results: FacebookSignal[] = [];
  for (const feed of facebookSignalFeeds()) {
    try {
      const response = await fetch(feed, { headers: { "user-agent": "AgentFlow-Facebook-Agent/1.0" }, cache: "no-store" });
      if (!response.ok) continue;
      const xml = await response.text();
      results.push(...extractItems(xml, feed));
    } catch (error) {
      console.warn("[facebook-hunter] feed unavailable", { feed, message: error instanceof Error ? error.message : String(error) });
    }
  }
  const seen = new Set<string>();
  return results.filter((signal) => !seen.has(signal.external_id) && seen.add(signal.external_id)).sort((a, b) => b.intent_score - a.intent_score).slice(0, limit);
}
