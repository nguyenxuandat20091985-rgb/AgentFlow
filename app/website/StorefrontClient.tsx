"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { WebsiteProduct, WebsiteNetwork } from "@/lib/website-catalog";
import styles from "./page.module.css";

const money = new Intl.NumberFormat("vi-VN");
type Tab = "deals" | "saved" | "install";
type Props = { products: WebsiteProduct[] };

function networkLabel(network: WebsiteNetwork) {
  if (network === "shopee") return "SHOPEE";
  if (network === "lazada") return "LAZADA";
  return "AFFILIATE";
}

export default function StorefrontClient({ products }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "discount" | "price">("all");
  const [tab, setTab] = useState<Tab>("deals");
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
    let list = products.filter((item) => !q || `${item.title} ${item.category} ${item.source} ${item.network}`.toLowerCase().includes(q));
    if (filter === "discount") list = list.filter((item) => item.discountRate > 0);
    if (filter === "price") list = [...list].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    return list;
  }, [products, query, filter]);

  const savedProducts = useMemo(() => products.filter((p) => saved.includes(p.id)), [products, saved]);
  const activeProducts = tab === "saved" ? savedProducts : filteredProducts;

  function go(path: string) {
    setMenuOpen(false);
    router.push(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectTab(next: Tab) {
    setTab(next);
    setMenuOpen(false);
    if (next === "deals") go("/website");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function installApp() {
    if (installEvent) {
      await installEvent.prompt();
      setInstallEvent(null);
      return;
    }
    alert("Nhà Bếp Thông Minh: Android dùng Chrome → menu ⋮ → Cài ứng dụng. iPhone dùng Safari → Chia sẻ → Thêm vào Màn hình chính.");
  }

  function toggleSaved(id: string) {
    setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <div className={styles.page}>
      <header className={styles.appHeader}>
        <div className={styles.appHeaderInner}>
          <button className={styles.menuButton} onClick={() => setMenuOpen(true)} aria-label="Mở menu Nhà Bếp Thông Minh"><span /><span /><span /></button>
          <button className={styles.brand} onClick={() => go("/website")} aria-label="Nhà Bếp Thông Minh - Trang chủ">
            <span className={styles.brandIcon}>NB</span>
            <span><small>NHÀ BẾP</small><strong>THÔNG MINH</strong></span>
          </button>
          <div className={styles.headerActions}>
            <button className={styles.headerAction} onClick={() => selectTab("install")} aria-label="Cài ứng dụng"><span>▣</span><strong>Cài app</strong></button>
            <button className={styles.headerAction} onClick={() => selectTab("saved")} aria-label="Sản phẩm đã lưu"><span>♡</span><strong>Đã lưu</strong><b>{saved.length}</b></button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className={styles.menuBackdrop} onClick={() => setMenuOpen(false)}>
          <aside className={styles.siteMenu} role="dialog" aria-modal="true" aria-label="Khám phá Nhà Bếp Thông Minh" onClick={(e) => e.stopPropagation()}>
            <div className={styles.menuTop}>
              <div><span>NHÀ BẾP THÔNG MINH</span><h2>Khám phá</h2><p>Mọi thứ khách cần đều ở ngay đây.</p></div>
              <button className={styles.closeButton} onClick={() => setMenuOpen(false)} aria-label="Đóng">×</button>
            </div>
            <div className={styles.menuList}>
              <button className={`${styles.menuItem} ${tab === "deals" ? styles.menuSelected : ""}`} onClick={() => selectTab("deals")}>
                <span className={styles.menuIcon}>NB</span><div><strong>Trang chủ</strong><small>Deal được AI chọn lọc mỗi ngày</small></div><b>→</b>
              </button>
              <button className={`${styles.menuItem} ${tab === "saved" ? styles.menuSelected : ""}`} onClick={() => selectTab("saved")}>
                <span className={styles.menuIcon}>♡</span><div><strong>Sản phẩm đã lưu</strong><small>Danh sách yêu thích của anh</small></div><b>→</b>
              </button>
              <button className={`${styles.menuItem} ${tab === "install" ? styles.menuSelected : ""}`} onClick={() => selectTab("install")}>
                <span className={styles.menuIcon}>▣</span><div><strong>Cài Nhà Bếp Thông Minh</strong><small>Đưa website lên màn hình điện thoại</small></div><b>→</b>
              </button>
            </div>
            <div className={styles.menuFooter}><span>✦</span><div><strong>AI đang vận hành</strong><small>Website và nội dung được hệ thống tự động cập nhật.</small></div></div>
          </aside>
        </div>
      )}

      <main className={styles.shopPage}>
        {tab === "install" ? (
          <section className={styles.installPage}>
            <div className={styles.installOrb}><span>NB</span></div>
            <span className={styles.installEyebrow}>NHÀ BẾP THÔNG MINH</span>
            <h1>Cài <em>Nhà Bếp Thông Minh</em><br />vào điện thoại</h1>
            <p>Trải nghiệm như một app mua sắm: mở nhanh, xem deal, lưu sản phẩm và quay lại bất cứ lúc nào.</p>
            <div className={styles.installSteps}>
              <div><b>01</b><span>Android</span><strong>Chrome → ⋮ → Cài ứng dụng</strong></div>
              <div><b>02</b><span>iPhone</span><strong>Safari → Chia sẻ → Thêm vào Màn hình chính</strong></div>
            </div>
            <button className={styles.installCta} onClick={installApp}>{installEvent ? "Cài ứng dụng ngay" : "Cài / xem hướng dẫn"}<span>→</span></button>
            <div className={styles.installTrust}><span>✓</span><div><strong>Tên ứng dụng: Nhà Bếp Thông Minh</strong><small>Không hiển thị tên miền AgentFlow trong giao diện.</small></div></div>
          </section>
        ) : (
          <>
            <section className={styles.heroShop}>
              <div className={styles.heroGlow} />
              <div className={styles.heroBadge}><span /> AI đang chọn deal mới</div>
              <h1>Đồ bếp hay.<br /><em>Giá đáng mua.</em></h1>
              <p>Nhà Bếp Thông Minh gom và sàng lọc deal từ hệ sinh thái affiliate, để khách tìm đúng sản phẩm ngay trên website.</p>
              <div className={styles.heroButtons}><button onClick={() => selectTab("deals")} className={styles.heroPrimary}>Xem deal <span>→</span></button><button onClick={() => selectTab("install")} className={styles.heroInstall}>▣ Cài app</button></div>
            </section>

            <section className={styles.searchSection} aria-label="Tìm kiếm sản phẩm">
              <div className={styles.searchBox}><span aria-hidden="true">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm nồi, chảo, máy xay, đồ gia dụng..." aria-label="Tìm sản phẩm" />{query && <button onClick={() => setQuery("")} aria-label="Xóa tìm kiếm">×</button>}</div>
              <div className={styles.quickChips}><button className={filter === "all" ? styles.chipActive : styles.chip} onClick={() => { setFilter("all"); setQuery(""); }}>Tất cả</button><button className={styles.chip} onClick={() => { setFilter("all"); setQuery("nồi"); }}>🍳 Nồi & chảo</button><button className={styles.chip} onClick={() => { setFilter("all"); setQuery("máy"); }}>⚡ Điện gia dụng</button><button className={filter === "discount" ? styles.chipActive : styles.chip} onClick={() => { setFilter("discount"); setQuery(""); }}>🔥 Đang giảm</button><button className={filter === "price" ? styles.chipActive : styles.chip} onClick={() => { setFilter("price"); setQuery(""); }}>Giá tốt</button></div>
            </section>

            <section className={styles.productsSection}>
              <div className={styles.sectionHeading}><div><span>{tab === "saved" ? "ĐÃ LƯU" : "AI CURATED"}</span><h2>{tab === "saved" ? "Sản phẩm yêu thích" : "Deal hôm nay"}</h2></div><small>{activeProducts.length} sản phẩm</small></div>
              {activeProducts.length === 0 ? <div className={styles.emptyShop}><div>♡</div><h3>Chưa có sản phẩm</h3><p>Hãy quay lại Deal hôm nay để xem các sản phẩm AI đã chọn.</p><button onClick={() => selectTab("deals")}>Xem deal</button></div> : <div className={styles.shopGrid}>{activeProducts.map((product) => <article className={styles.shopCard} key={product.id}><a href={product.url || "#"} target="_blank" rel="nofollow sponsored noopener" className={styles.productLink}><div className={styles.productImage}>{product.image ? <img src={`/api/website/image?url=${encodeURIComponent(product.image)}`} alt={product.title} loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : <div className={styles.noImage}>NB</div>}<span className={styles.imageShine} />{product.discountRate > 0 && <span className={styles.saleBadge}>-{product.discountRate}%</span>}<span className={styles.sourceBadge}>{networkLabel(product.network)}</span></div><div className={styles.productInfo}><div className={styles.productCategory}>{product.category || "Đồ gia dụng"}</div><h3>{product.title}</h3><div className={styles.productBottom}><strong>{product.price ? `${money.format(product.price)} ₫` : "Xem giá"}</strong><span>→</span></div></div></a><button className={styles.saveButton} onClick={() => toggleSaved(product.id)} aria-label={saved.includes(product.id) ? "Bỏ lưu sản phẩm" : "Lưu sản phẩm"}>{saved.includes(product.id) ? "♥" : "♡"}</button></article>)}</div>}
            </section>

            <section className={styles.trustSection}><div><span className={styles.trustIcon}>✦</span><strong>AI chọn lọc</strong><p>Ưu tiên deal đáng chú ý.</p></div><div><span className={styles.trustIcon}>↗</span><strong>Link affiliate</strong><p>Chỉ rời website khi khách chọn mua.</p></div><div><span className={styles.trustIcon}>✓</span><strong>An toàn</strong><p>Không lộ khóa API hay secret ra trình duyệt.</p></div></section>
          </>
        )}
      </main>
    </div>
  );
}
