"use client";

import { useEffect, useMemo, useState } from "react";
import type { WebsiteProduct } from "@/lib/website-catalog";
import styles from "./page.module.css";

const money = new Intl.NumberFormat("vi-VN");

type Props = { products: WebsiteProduct[] };

export default function StorefrontClient({ products }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "discount" | "price">("all");
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

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = products.filter((item) => !q || `${item.title} ${item.category} ${item.source}`.toLowerCase().includes(q));
    if (filter === "discount") list = list.filter((item) => item.discountRate > 0);
    if (filter === "price") list = [...list].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    return list;
  }, [products, query, filter]);

  async function installApp() {
    if (!installEvent) {
      alert("Trên iPhone: Safari → Chia sẻ → Thêm vào Màn hình chính. Trên Android: mở bằng Chrome rồi chọn Cài ứng dụng.");
      return;
    }
    await installEvent.prompt();
    setInstallEvent(null);
  }

  function toggleSaved(id: string) {
    setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <div className={styles.page}>
      <header className={styles.appHeader}>
        <div className={styles.appHeaderInner}>
          <a href="/website" className={styles.brand} aria-label="Nhà Bếp Thông Minh - Trang chủ">
            <span className={styles.brandIcon}>NB</span>
            <span><small>NHÀ BẾP</small><strong>THÔNG MINH</strong></span>
          </a>
          <div className={styles.headerActions}>
            <button className={styles.iconButton} onClick={installApp} aria-label="Cài ứng dụng">⌄</button>
            <button className={styles.iconButton} aria-label="Sản phẩm đã lưu">♡<b>{saved.length}</b></button>
          </div>
        </div>
      </header>

      <main className={styles.shopPage}>
        <section className={styles.heroShop}>
          <div className={styles.heroBadge}><span /> AI đang chọn deal mới</div>
          <h1>Đồ bếp hay.<br /><em>Giá đáng mua.</em></h1>
          <p>Những sản phẩm đáng chú ý được AI sàng lọc từ Shopee, Lazada và AccessTrade.</p>
          <div className={styles.heroButtons}>
            <a href="#products" className={styles.heroPrimary}>Khám phá deal <span>→</span></a>
            <button onClick={installApp} className={styles.heroInstall}>📲 Cài app</button>
          </div>
        </section>

        <section className={styles.searchSection} aria-label="Tìm kiếm sản phẩm">
          <div className={styles.searchBox}>
            <span aria-hidden="true">⌕</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm nồi, chảo, máy xay, đồ gia dụng..." aria-label="Tìm sản phẩm" />
            {query && <button onClick={() => setQuery("")} aria-label="Xóa tìm kiếm">×</button>}
          </div>
          <div className={styles.quickChips}>
            <button className={filter === "all" ? styles.chipActive : styles.chip} onClick={() => { setFilter("all"); setQuery(""); }}>Tất cả</button>
            <button className={styles.chip} onClick={() => { setFilter("all"); setQuery("nồi"); }}>🍳 Nồi & chảo</button>
            <button className={styles.chip} onClick={() => { setFilter("all"); setQuery("máy"); }}>⚡ Điện gia dụng</button>
            <button className={filter === "discount" ? styles.chipActive : styles.chip} onClick={() => { setFilter("discount"); setQuery(""); }}>🔥 Đang giảm</button>
            <button className={filter === "price" ? styles.chipActive : styles.chip} onClick={() => { setFilter("price"); setQuery(""); }}>Giá tốt</button>
          </div>
        </section>

        <section id="products" className={styles.productsSection}>
          <div className={styles.sectionHeading}>
            <div><span>AI CURATED</span><h2>Deal hôm nay</h2></div>
            <small>{visibleProducts.length} sản phẩm</small>
          </div>
          {visibleProducts.length === 0 ? (
            <div className={styles.emptyShop}><div>⌕</div><h3>Chưa tìm thấy sản phẩm</h3><p>Thử từ khóa khác hoặc xem toàn bộ deal đang có.</p><button onClick={() => { setQuery(""); setFilter("all"); }}>Xem tất cả</button></div>
          ) : (
            <div className={styles.shopGrid}>
              {visibleProducts.map((product) => (
                <article className={styles.shopCard} key={product.id}>
                  <a href={product.url || "#"} target="_blank" rel="nofollow sponsored noopener" className={styles.productLink}>
                    <div className={styles.productImage}>
                      {product.image ? <img src={product.image} alt={product.title} loading="lazy" /> : <div className={styles.noImage}>NB</div>}
                      {product.discountRate > 0 && <span className={styles.saleBadge}>-{product.discountRate}%</span>}
                      <span className={styles.sourceBadge}>{product.source === "accesstrade" ? "AFFILIATE" : product.source.toUpperCase()}</span>
                    </div>
                    <div className={styles.productInfo}>
                      <div className={styles.productCategory}>{product.category || "Đồ gia dụng"}</div>
                      <h3>{product.title}</h3>
                      <div className={styles.productBottom}><strong>{product.price ? `${money.format(product.price)} ₫` : "Xem giá"}</strong><span>→</span></div>
                    </div>
                  </a>
                  <button className={styles.saveButton} onClick={() => toggleSaved(product.id)} aria-label={saved.includes(product.id) ? "Bỏ lưu sản phẩm" : "Lưu sản phẩm"}>{saved.includes(product.id) ? "♥" : "♡"}</button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={styles.trustSection}>
          <div><span className={styles.trustIcon}>✦</span><strong>AI chọn lọc</strong><p>Ưu tiên deal đáng chú ý.</p></div>
          <div><span className={styles.trustIcon}>↗</span><strong>Link chính hãng</strong><p>Đi tới nơi bán qua affiliate.</p></div>
          <div><span className={styles.trustIcon}>✓</span><strong>Minh bạch</strong><p>Không tạo giá hay đơn hàng ảo.</p></div>
        </section>
      </main>

      <nav className={styles.bottomNav} aria-label="Điều hướng cửa hàng">
        <a className={styles.bottomActive} href="/website"><span>⌂</span>Trang chủ</a>
        <a href="#products"><span>◈</span>Deal</a>
        <button onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}><span>♡</span>Đã lưu</button>
        <button onClick={installApp}><span>▣</span>Cài app</button>
      </nav>
    </div>
  );
}
