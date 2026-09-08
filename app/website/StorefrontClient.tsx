"use client";

import { useEffect, useMemo, useState } from "react";
import type { WebsiteProduct } from "@/lib/website-catalog";
import styles from "./page.module.css";

const money = new Intl.NumberFormat("vi-VN");
type Tab = "home" | "deals" | "saved" | "install";
type Props = { products: WebsiteProduct[] };

const externalSites = [
  ["Facebook", "https://www.facebook.com/", "f"],
  ["Shopee", "https://shopee.vn/", "S"],
  ["Lazada", "https://www.lazada.vn/", "L"],
  ["AccessTrade", "https://pub2.accesstrade.vn/", "A"],
];

export default function StorefrontClient({ products }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "discount" | "price">("all");
  const [tab, setTab] = useState<Tab>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [installEvent, setInstallEvent] = useState<any>(null);
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = products.filter((item) => !q || `${item.title} ${item.category} ${item.source}`.toLowerCase().includes(q));
    if (filter === "discount") list = list.filter((item) => item.discountRate > 0);
    if (filter === "price") list = [...list].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    return list;
  }, [products, query, filter]);

  const savedProducts = useMemo(() => products.filter((p) => saved.includes(p.id)), [products, saved]);

  function selectTab(next: Tab) {
    setTab(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function installApp() {
    if (installEvent) {
      await installEvent.prompt();
      setInstallEvent(null);
      return;
    }
    // Browser-specific install UI is intentionally not faked. Give customers the real PWA steps.
    alert("Nhà Bếp Thông Minh: trên Android mở bằng Chrome → menu ⋮ → Cài ứng dụng. Trên iPhone dùng Safari → Chia sẻ → Thêm vào Màn hình chính.");
  }

  function toggleSaved(id: string) {
    setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  const activeProducts = tab === "saved" ? savedProducts : filteredProducts;

  return (
    <div className={styles.page}>
      <header className={styles.appHeader}>
        <div className={styles.appHeaderInner}>
          <button className={styles.menuButton} onClick={() => setMenuOpen(true)} aria-label="Mở menu website khác"><span /><span /><span /></button>
          <button className={styles.brand} onClick={() => selectTab("home")} aria-label="Nhà Bếp Thông Minh - Trang chủ">
            <span className={styles.brandIcon}>NB</span>
            <span><small>NHÀ BẾP</small><strong>THÔNG MINH</strong></span>
          </button>
          <div className={styles.headerActions}>
            <button className={styles.iconButton} onClick={() => selectTab("install")} aria-label="Mở trang cài app">⌄</button>
            <button className={styles.iconButton} onClick={() => selectTab("saved")} aria-label="Sản phẩm đã lưu">♡<b>{saved.length}</b></button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className={styles.menuBackdrop} role="presentation" onClick={() => setMenuOpen(false)}>
          <aside className={styles.siteMenu} role="dialog" aria-modal="true" aria-label="Website và nền tảng">
            <div className={styles.menuTop}><div><span>HỆ SINH THÁI</span><h2>Website khác</h2></div><button className={styles.closeButton} onClick={() => setMenuOpen(false)} aria-label="Đóng">×</button></div>
            <a className={styles.menuHome} href="/website" onClick={() => setMenuOpen(false)}><span>NB</span><div><strong>Nhà Bếp Thông Minh</strong><small>Storefront chính</small></div><b>→</b></a>
            <div className={styles.menuList}>
              {externalSites.map(([name, url, mark]) => <a key={name} href={url} target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}><span>{mark}</span><strong>{name}</strong><b>↗</b></a>)}
            </div>
            <p className={styles.menuNote}>Các kênh phân phối được mở ở tab riêng, không làm rối trải nghiệm mua sắm.</p>
          </aside>
        </div>
      )}

      <main className={styles.shopPage}>
        {tab === "install" ? (
          <section className={styles.installPage}>
            <div className={styles.installMark}>NB</div>
            <span className={styles.installEyebrow}>NHÀ BẾP THÔNG MINH</span>
            <h1>Cài <em>Nhà Bếp Thông Minh</em><br />vào điện thoại</h1>
            <p>Một chạm từ màn hình chính để xem deal mới, lưu sản phẩm và đi thẳng tới nơi bán.</p>
            <div className={styles.installSteps}>
              <div><b>01</b><span>Android</span><strong>Chrome → ⋮ → Cài ứng dụng</strong></div>
              <div><b>02</b><span>iPhone</span><strong>Safari → Chia sẻ → Thêm vào Màn hình chính</strong></div>
            </div>
            <button className={styles.installCta} onClick={installApp}>{installEvent ? "Cài ứng dụng ngay" : "Hiện hướng dẫn cài app"} <span>→</span></button>
            <div className={styles.installTrust}><span>✓</span><div><strong>Ứng dụng chính thức</strong><small>Tên hiển thị khi cài: Nhà Bếp Thông Minh</small></div></div>
          </section>
        ) : (
          <>
            {tab === "home" && <section className={styles.heroShop}><div className={styles.heroGlow} /><div className={styles.heroBadge}><span /> AI đang chọn deal mới</div><h1>Đồ bếp hay.<br /><em>Giá đáng mua.</em></h1><p>Deal được AI sàng lọc từ Shopee, Lazada và AccessTrade, đưa thẳng tới nơi bán.</p><div className={styles.heroButtons}><button onClick={() => selectTab("deals")} className={styles.heroPrimary}>Khám phá deal <span>→</span></button><button onClick={() => selectTab("install")} className={styles.heroInstall}>▣ Cài app</button></div></section>}

            <section className={styles.searchSection} aria-label="Tìm kiếm sản phẩm">
              <div className={styles.searchBox}><span aria-hidden="true">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm nồi, chảo, máy xay, đồ gia dụng..." aria-label="Tìm sản phẩm" />{query && <button onClick={() => setQuery("")} aria-label="Xóa tìm kiếm">×</button>}</div>
              <div className={styles.quickChips}><button className={filter === "all" ? styles.chipActive : styles.chip} onClick={() => { setFilter("all"); setQuery(""); }}>Tất cả</button><button className={styles.chip} onClick={() => { setFilter("all"); setQuery("nồi"); }}>🍳 Nồi & chảo</button><button className={styles.chip} onClick={() => { setFilter("all"); setQuery("máy"); }}>⚡ Điện gia dụng</button><button className={filter === "discount" ? styles.chipActive : styles.chip} onClick={() => { setFilter("discount"); setQuery(""); }}>🔥 Đang giảm</button><button className={filter === "price" ? styles.chipActive : styles.chip} onClick={() => { setFilter("price"); setQuery(""); }}>Giá tốt</button></div>
            </section>

            <section className={styles.productsSection}>
              <div className={styles.sectionHeading}><div><span>{tab === "saved" ? "ĐÃ LƯU" : "AI CURATED"}</span><h2>{tab === "saved" ? "Sản phẩm yêu thích" : "Deal hôm nay"}</h2></div><small>{activeProducts.length} sản phẩm</small></div>
              {activeProducts.length === 0 ? <div className={styles.emptyShop}><div>♡</div><h3>{tab === "saved" ? "Chưa có sản phẩm đã lưu" : "Chưa tìm thấy sản phẩm"}</h3><p>{tab === "saved" ? "Chạm trái tim trên một sản phẩm để lưu lại." : "Thử từ khóa khác hoặc xem toàn bộ deal."}</p><button onClick={() => { setQuery(""); setFilter("all"); selectTab("deals"); }}>Xem deal</button></div> : <div className={styles.shopGrid}>{activeProducts.map((product) => <article className={styles.shopCard} key={product.id}><a href={product.url || "#"} target="_blank" rel="nofollow sponsored noopener" className={styles.productLink}><div className={styles.productImage}>{product.image ? <img src={`/api/website/image?url=${encodeURIComponent(product.image)}`} alt={product.title} loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : <div className={styles.noImage}>NB</div>}<span className={styles.imageShine} />{product.discountRate > 0 && <span className={styles.saleBadge}>-{product.discountRate}%</span>}<span className={styles.sourceBadge}>{product.source === "accesstrade" ? "AFFILIATE" : product.source.toUpperCase()}</span></div><div className={styles.productInfo}><div className={styles.productCategory}>{product.category || "Đồ gia dụng"}</div><h3>{product.title}</h3><div className={styles.productBottom}><strong>{product.price ? `${money.format(product.price)} ₫` : "Xem giá"}</strong><span>→</span></div></div></a><button className={styles.saveButton} onClick={() => toggleSaved(product.id)} aria-label={saved.includes(product.id) ? "Bỏ lưu sản phẩm" : "Lưu sản phẩm"}>{saved.includes(product.id) ? "♥" : "♡"}</button></article>)}</div>}
            </section>

            <section className={styles.trustSection}><div><span className={styles.trustIcon}>✦</span><strong>AI chọn lọc</strong><p>Ưu tiên deal đáng chú ý.</p></div><div><span className={styles.trustIcon}>↗</span><strong>Link chính hãng</strong><p>Đi tới nơi bán qua affiliate.</p></div><div><span className={styles.trustIcon}>✓</span><strong>Minh bạch</strong><p>Không tạo giá hay đơn hàng ảo.</p></div></section>
          </>
        )}
      </main>

      <nav className={styles.bottomNav} aria-label="Điều hướng cửa hàng">
        <button className={tab === "home" ? styles.bottomActive : ""} onClick={() => selectTab("home")}><span>⌂</span>Trang chủ</button>
        <button className={tab === "deals" ? styles.bottomActive : ""} onClick={() => selectTab("deals")}><span>◈</span>Deal</button>
        <button className={tab === "saved" ? styles.bottomActive : ""} onClick={() => selectTab("saved")}><span>♡</span>Đã lưu</button>
        <button className={tab === "install" ? styles.bottomActive : ""} onClick={() => selectTab("install")}><span>▣</span>Cài app</button>
      </nav>
    </div>
  );
}
