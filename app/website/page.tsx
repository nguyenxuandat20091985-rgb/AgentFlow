import type { Metadata } from "next";
import { getWebsiteCatalog } from "@/lib/website-catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Nhà Bếp Thông Minh | Ưu đãi chọn lọc",
  description: "Khám phá sản phẩm gia dụng và ưu đãi được AI AgentFlow chọn lọc.",
};

const money = new Intl.NumberFormat("vi-VN");

function Icon({ name }: { name: "spark" | "arrow" | "shield" | "truck" | "search" }) {
  const common = "h-5 w-5";
  if (name === "arrow") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 12h13M13 6l6 6-6 6" /></svg>;
  if (name === "shield") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>;
  if (name === "truck") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>;
  if (name === "search") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 5 5"/></svg>;
  return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z"/><path d="m19 3 .6 2.4L22 6l-2.4.6L19 9l-.6-2.4L16 6l2.4-.6L19 3Z"/></svg>;
}

export default async function WebsitePage() {
  const products = await getWebsiteCatalog();
  const featured = products.slice(0, 8);

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-slate-900">
      <div className="bg-slate-950 text-slate-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-[11px] sm:px-6 sm:text-xs">
          <p>Ưu đãi được AI chọn lọc mỗi ngày</p>
          <p className="hidden sm:block">Shopee · Lazada · AccessTrade</p>
        </div>
      </div>

      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6">
          <a href="/website" className="shrink-0" aria-label="Nhà Bếp Thông Minh">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm"><Icon name="spark" /></span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600">AgentFlow</p>
                <p className="text-base font-extrabold tracking-tight sm:text-lg">Nhà Bếp Thông Minh</p>
              </div>
            </div>
          </a>
          <div className="hidden flex-1 justify-center md:flex">
            <nav className="flex items-center gap-7 text-sm font-semibold text-slate-600" aria-label="Điều hướng">
              <a href="#deals" className="transition hover:text-slate-950">Deal hôm nay</a>
              <a href="#catalog" className="transition hover:text-slate-950">Sản phẩm</a>
              <a href="#why" className="transition hover:text-slate-950">Vì sao chọn chúng tôi</a>
            </nav>
          </div>
          <a href="#catalog" className="ml-auto flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"><Icon name="search"/><span className="hidden sm:inline">Khám phá</span></a>
        </div>
      </header>

      <section id="deals" className="relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.18),transparent_30%),radial-gradient(circle_at_85%_30%,rgba(99,102,241,0.2),transparent_32%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/> ĐANG CẬP NHẬT</span>
            <h1 className="mt-5 max-w-2xl text-4xl font-black tracking-[-0.04em] text-white sm:text-6xl">Mua thông minh.<br/><span className="text-emerald-400">Chọn đúng deal.</span></h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">Những sản phẩm nhà bếp đáng mua được hệ thống AI chọn lọc từ các nguồn thương mại uy tín — gọn, rõ và dễ quyết định.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#catalog" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-extrabold text-slate-950 transition hover:bg-emerald-50">Xem deal nổi bật <Icon name="arrow"/></a>
              <a href="#why" className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-white/5">Tìm hiểu thêm</a>
            </div>
          </div>
          <div className="relative min-h-[300px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] p-3 shadow-2xl shadow-black/30 sm:min-h-[390px]">
            {featured[0]?.image ? <img src={featured[0].image} alt={featured[0].title} className="h-full min-h-[294px] w-full rounded-[1.5rem] object-cover opacity-90 sm:min-h-[384px]"/> : <div className="flex h-full min-h-[294px] items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-emerald-500/20 via-slate-900 to-indigo-500/20 sm:min-h-[384px]"><Icon name="spark"/></div>}
            <div className="absolute bottom-7 left-7 right-7 rounded-2xl border border-white/15 bg-slate-950/80 p-4 backdrop-blur-xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">AI PICK</p>
              <p className="mt-1 line-clamp-2 text-sm font-bold text-white">{featured[0]?.title ?? "Deal nhà bếp đang được chọn lọc"}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="why" className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-slate-200 px-4 py-3 sm:px-6 md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="flex items-center gap-3 px-2 py-4 md:px-5"><span className="text-emerald-600"><Icon name="spark"/></span><div><p className="text-sm font-extrabold">AI chọn lọc</p><p className="text-xs text-slate-500">Ưu tiên deal đáng chú ý</p></div></div>
          <div className="flex items-center gap-3 px-2 py-4 md:px-5"><span className="text-emerald-600"><Icon name="shield"/></span><div><p className="text-sm font-extrabold">Nguồn rõ ràng</p><p className="text-xs text-slate-500">Shopee · Lazada · AccessTrade</p></div></div>
          <div className="flex items-center gap-3 px-2 py-4 md:px-5"><span className="text-emerald-600"><Icon name="truck"/></span><div><p className="text-sm font-extrabold">Đi thẳng tới nơi bán</p><p className="text-xs text-slate-500">Xem deal từ nguồn chính</p></div></div>
        </div>
      </section>

      <section id="catalog" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Hôm nay</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Deal đáng chú ý</h2><p className="mt-2 text-sm text-slate-500">Các sản phẩm đang được AgentFlow đưa vào catalog.</p></div>
          <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">{products.length} sản phẩm</span>
        </div>

        {products.length === 0 ? (
          <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Icon name="spark"/></div><p className="mt-4 text-lg font-extrabold">Catalog đang cập nhật</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Hệ thống chưa nhận được sản phẩm khả dụng từ nguồn affiliate. Khi dữ liệu thật về, sản phẩm sẽ xuất hiện tại đây.</p></div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            {products.map((product) => (
              <article key={product.id} className="group overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70">
                <a href={product.url!} target="_blank" rel="nofollow sponsored noopener" className="block">
                  <div className="relative aspect-square overflow-hidden bg-slate-100">
                    {product.image ? <img src={product.image} alt={product.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/> : <div className="flex h-full items-center justify-center text-slate-400"><Icon name="spark"/></div>}
                    {product.discountRate > 0 && <span className="absolute left-2 top-2 rounded-full bg-rose-500 px-2 py-1 text-[10px] font-black text-white">-{product.discountRate}%</span>}
                    <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-700 backdrop-blur">{product.source === "accesstrade" ? "Affiliate" : "Deal"}</span>
                  </div>
                  <div className="p-3.5 sm:p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">{product.category}</p>
                    <h3 className="mt-1.5 line-clamp-2 min-h-[2.75rem] text-sm font-extrabold leading-5 text-slate-900 sm:text-[15px]">{product.title}</h3>
                    <div className="mt-4 flex items-end justify-between gap-2"><div>{product.price ? <p className="text-lg font-black tracking-tight text-slate-950">{money.format(product.price)} ₫</p> : <p className="text-sm font-bold text-slate-400">Xem giá</p>}{product.discountRate > 0 && <p className="mt-0.5 text-[11px] font-bold text-emerald-600">Ưu đãi đang có</p>}</div><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white transition group-hover:bg-emerald-600"><Icon name="arrow"/></span></div>
                  </div>
                </a>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-center">
            <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">AgentFlow Commerce</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Một nơi để tìm.<br/>Một cú chạm để mua.</h2></div>
            <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-2xl font-black">AI</p><p className="mt-1 text-xs leading-5 text-slate-400">Tự động chọn lọc và cập nhật catalog.</p></div><div className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-2xl font-black">3 nguồn</p><p className="mt-1 text-xs leading-5 text-slate-400">Shopee, Lazada và AccessTrade.</p></div><div className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-2xl font-black">Live</p><p className="mt-1 text-xs leading-5 text-slate-400">Catalog được làm mới theo hệ thống.</p></div></div>
          </div>
        </div>
      </section>

      <footer className="bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6"><p>© {new Date().getFullYear()} Nhà Bếp Thông Minh · Powered by AgentFlow</p><p>Liên kết trên website có thể là liên kết tiếp thị.</p></div>
      </footer>
    </main>
  );
}
