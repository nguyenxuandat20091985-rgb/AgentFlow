import type { Metadata } from "next";
import { getWebsiteCatalog } from "@/lib/website-catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Nhà Bếp Thông Minh | Deal & Sản phẩm chọn lọc",
  description: "Khám phá sản phẩm và ưu đãi được AgentFlow chọn lọc từ các nguồn affiliate.",
};

const money = new Intl.NumberFormat("vi-VN");

export default async function WebsitePage() {
  const products = await getWebsiteCatalog();

  return (
    <main className="min-h-screen bg-[#070a12] text-white">
      <section className="mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-8">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-400">AgentFlow Commerce</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-4xl">Nhà Bếp Thông Minh</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              Deal và sản phẩm được hệ thống tự động chọn lọc, xếp hạng và cập nhật. Mỗi liên kết mua hàng có thể là liên kết tiếp thị.
            </p>
          </div>
          <span className="hidden rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300 sm:inline-flex">● LIVE</span>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-widest text-slate-500">Nguồn</p>
            <p className="mt-2 text-lg font-semibold">Shopee · Lazada · AccessTrade</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-widest text-slate-500">Catalog</p>
            <p className="mt-2 text-lg font-semibold">{products.length} cơ hội</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-widest text-slate-500">Automation</p>
            <p className="mt-2 text-lg font-semibold text-emerald-300">AI chọn lọc · cập nhật tự động</p>
          </div>
        </div>

        <div className="mt-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-400">Đề xuất hôm nay</p>
            <h2 className="mt-1 text-2xl font-bold">Deal đáng chú ý</h2>
          </div>
          <p className="text-xs text-slate-500">Catalog tự làm mới tối đa mỗi 30 phút</p>
        </div>

        {products.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-white/15 bg-white/[0.025] p-12 text-center">
            <p className="text-lg font-semibold">Chưa có sản phẩm khả dụng</p>
            <p className="mt-2 text-sm text-slate-500">Kiểm tra cấu hình AccessTrade và nguồn deal trong AgentFlow.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <article key={product.id} className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:border-indigo-400/40">
                <div className="aspect-[4/3] overflow-hidden bg-slate-900">
                  {product.image ? <img src={product.image} alt={product.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-sm text-slate-600">Không có ảnh</div>}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wider text-slate-500">
                    <span>{product.category}</span>
                    <span>{product.source === "accesstrade" ? "Affiliate" : "Deal"}</span>
                  </div>
                  <h3 className="mt-2 line-clamp-2 min-h-12 font-semibold leading-6">{product.title}</h3>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      {product.price ? <p className="text-lg font-bold">{money.format(product.price)} ₫</p> : <p className="text-sm text-slate-500">Xem giá</p>}
                      {product.discountRate > 0 && <p className="text-xs font-semibold text-emerald-400">Giảm {product.discountRate}%</p>}
                    </div>
                    <a href={product.url!} target="_blank" rel="nofollow sponsored noopener" className="rounded-xl bg-indigo-500 px-3 py-2 text-sm font-semibold transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300">Xem deal</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
