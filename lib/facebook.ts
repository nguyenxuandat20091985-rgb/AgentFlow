const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v24.0";

function getPageToken() {
  return (
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN ||
    process.env.META_PAGE_ACCESS_TOKEN ||
    process.env.FACEBOOK_ACCESS_TOKEN ||
    ""
  ).trim();
}

export function facebookPublishingConfigured() {
  return Boolean(getPageToken());
}

export async function publishFacebookPagePost(message: string, link?: string | null) {
  const accessToken = getPageToken();
  if (!accessToken) throw new Error("FACEBOOK_PAGE_ACCESS_TOKEN is not configured");

  const meResponse = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`, { cache: "no-store" });
  const me = await meResponse.json().catch(() => ({}));
  if (!meResponse.ok || !me.id) {
    throw new Error(`Facebook token validation failed: ${me?.error?.message || `HTTP ${meResponse.status}`}`);
  }

  const body = new URLSearchParams({ message, access_token: accessToken });
  if (link) body.set("link", link);

  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(String(me.id))}/feed`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    throw new Error(`Facebook publish failed: ${data?.error?.message || `HTTP ${response.status}`}`);
  }

  return { id: data.id ?? null, pageId: String(me.id), pageName: me.name ?? null };
}
