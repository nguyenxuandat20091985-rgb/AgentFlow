import { supabaseAdmin } from "@/lib/supabase-admin";

export type OwnedPublishInput = {
  title: string;
  body: string;
  destinationId: string;
  queueActionId: string;
  affiliateLink?: string | null;
  productId?: string | null;
  productName?: string | null;
  sourceUrl?: string | null;
  priority?: string | null;
};

export type OwnedPublishResult = {
  ok: true;
  publisher: "owned-cms";
  tier: "A";
  slug: string;
  publishedUrl: string;
  publishedAt: string;
  providerResponseId: string;
  postId: string;
};

function slugify(input: string) {
  const base = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const suffix = Date.now().toString(36);
  return `${base || "bai-viet"}-${suffix}`;
}

function appBaseUrl() {
  return (
    process.env.AGENTFLOW_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://agentflow-khaki-rho.vercel.app"
  ).replace(/\/$/, "");
}

/**
 * Tier A publisher: write to owned CMS table and expose at /website/posts/[slug].
 * Never claims success without provider_response_id + published_url.
 */
export async function publishOwnedCms(input: OwnedPublishInput): Promise<OwnedPublishResult> {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || body.length < 40) {
    throw new Error("owned-cms requires non-empty title and useful body");
  }

  const slug = slugify(title);
  const publishedAt = new Date().toISOString();
  const publishedUrl = `${appBaseUrl()}/website/posts/${slug}`;
  const providerResponseId = `owned-${input.queueActionId}-${slug}`;

  const row = {
    slug,
    title,
    body,
    destination_id: input.destinationId,
    affiliate_link: input.affiliateLink ?? null,
    product_id: input.productId ?? null,
    product_name: input.productName ?? null,
    queue_action_id: input.queueActionId,
    agent_id: "salesbot",
    channel: "website",
    tier: "A",
    status: "published",
    published_at: publishedAt,
    published_url: publishedUrl,
    provider_response_id: providerResponseId,
    metadata: {
      sourceUrl: input.sourceUrl ?? null,
      priority: input.priority ?? null,
      publisher: "owned-cms",
    },
  };

  const inserted = await supabaseAdmin<Array<{ id: string; slug: string }>>("website_published_posts", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row),
  });

  const post = Array.isArray(inserted) && inserted[0] ? inserted[0] : null;
  if (!post?.id) {
    throw new Error("owned-cms insert returned no id — check website_published_posts table");
  }

  return {
    ok: true,
    publisher: "owned-cms",
    tier: "A",
    slug: post.slug || slug,
    publishedUrl,
    publishedAt,
    providerResponseId,
    postId: post.id,
  };
}

export type PublishedPost = {
  id: string;
  slug: string;
  title: string;
  body: string;
  destination_id?: string | null;
  affiliate_link?: string | null;
  product_name?: string | null;
  published_at?: string | null;
  published_url?: string | null;
  status?: string | null;
};

export async function listPublishedPosts(limit = 30): Promise<PublishedPost[]> {
  const rows = await supabaseAdmin<PublishedPost[]>(
    `website_published_posts?select=id,slug,title,body,destination_id,affiliate_link,product_name,published_at,published_url,status&status=eq.published&order=published_at.desc&limit=${limit}`,
  );
  return Array.isArray(rows) ? rows : [];
}

export async function getPublishedPostBySlug(slug: string): Promise<PublishedPost | null> {
  const rows = await supabaseAdmin<PublishedPost[]>(
    `website_published_posts?select=id,slug,title,body,destination_id,affiliate_link,product_name,published_at,published_url,status&slug=eq.${encodeURIComponent(slug)}&limit=1`,
  );
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}
