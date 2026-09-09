import { NextResponse } from "next/server";
import { listPublishedPosts } from "@/lib/publishers/owned-cms";

export const dynamic = "force-dynamic";

/** Public list of Tier A published posts (owned CMS only). */
export async function GET() {
  try {
    const posts = await listPublishedPosts(40);
    return NextResponse.json(
      {
        ok: true,
        count: posts.length,
        posts: posts.map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          excerpt: String(p.body || "").slice(0, 180),
          productName: p.product_name ?? null,
          affiliateLink: p.affiliate_link ?? null,
          publishedAt: p.published_at ?? null,
          url: p.published_url ?? `/website/posts/${p.slug}`,
        })),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("[website-posts] list failed", error);
    return NextResponse.json(
      {
        ok: true,
        count: 0,
        posts: [],
        note: "website_published_posts table may not exist yet — run schema in docs",
      },
      { headers: { "cache-control": "no-store" } },
    );
  }
}
