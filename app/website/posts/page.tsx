import type { Metadata } from "next";
import Link from "next/link";
import { listPublishedPosts } from "@/lib/publishers/owned-cms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bài viết AI Website | Nhà Bếp Thông Minh",
  description: "Nội dung buyer-first do AI Website soạn và tự đăng trên kênh sở hữu.",
};

export default async function WebsitePostsPage() {
  let posts: Awaited<ReturnType<typeof listPublishedPosts>> = [];
  try {
    posts = await listPublishedPosts(40);
  } catch {
    posts = [];
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px", fontFamily: "system-ui, sans-serif" }}>
      <p style={{ marginBottom: 8 }}>
        <Link href="/website">← Storefront</Link>
      </p>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Bài viết AI Website</h1>
      <p style={{ color: "#555", marginBottom: 24 }}>
        Nội dung Tier A (kênh sở hữu) — AI soạn, AI CEO duyệt, hệ thống tự đăng. Không đăng hộ lên Facebook/Zalo group.
      </p>
      {!posts.length ? (
        <p>Chưa có bài đăng. Sau khi automation chạy (outreach → CEO → autopublish) bài sẽ xuất hiện tại đây.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {posts.map((post) => (
            <li key={post.id} style={{ borderBottom: "1px solid #eee", padding: "16px 0" }}>
              <Link href={`/website/posts/${post.slug}`} style={{ fontWeight: 600, fontSize: 18 }}>
                {post.title}
              </Link>
              <div style={{ color: "#777", fontSize: 13, marginTop: 4 }}>
                {post.published_at ? new Date(post.published_at).toLocaleString("vi-VN") : ""}
                {post.product_name ? ` · ${post.product_name}` : ""}
              </div>
              <p style={{ marginTop: 8, color: "#333" }}>{String(post.body || "").slice(0, 160)}…</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
