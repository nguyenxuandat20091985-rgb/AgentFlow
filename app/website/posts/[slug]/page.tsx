import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedPostBySlug } from "@/lib/publishers/owned-cms";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await getPublishedPostBySlug(slug);
    if (!post) return { title: "Không tìm thấy bài viết" };
    return {
      title: `${post.title} | Nhà Bếp Thông Minh`,
      description: String(post.body || "").slice(0, 150),
    };
  } catch {
    return { title: "Bài viết" };
  }
}

export default async function WebsitePostPage({ params }: Props) {
  const { slug } = await params;
  let post = null;
  try {
    post = await getPublishedPostBySlug(slug);
  } catch {
    post = null;
  }
  if (!post) notFound();

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px", fontFamily: "system-ui, sans-serif" }}>
      <p style={{ marginBottom: 16 }}>
        <Link href="/website/posts">← Tất cả bài viết</Link>
        {" · "}
        <Link href="/website">Storefront</Link>
      </p>
      <article>
        <h1 style={{ fontSize: 30, lineHeight: 1.25 }}>{post.title}</h1>
        <p style={{ color: "#777", fontSize: 13, marginBottom: 24 }}>
          {post.published_at ? new Date(post.published_at).toLocaleString("vi-VN") : ""}
          {post.product_name ? ` · ${post.product_name}` : ""}
        </p>
        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 16 }}>{post.body}</div>
        {post.affiliate_link ? (
          <p style={{ marginTop: 28 }}>
            <a href={post.affiliate_link} rel="nofollow sponsored noopener" target="_blank">
              Xem deal / mua qua link affiliate →
            </a>
          </p>
        ) : null}
      </article>
    </main>
  );
}
