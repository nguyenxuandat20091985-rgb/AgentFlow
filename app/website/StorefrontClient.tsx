"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { WebsiteProduct, WebsiteNetwork } from "@/lib/website-catalog";
import styles from "./page.module.css";

const money = new Intl.NumberFormat("vi-VN");
type Tab = "deals" | "saved" | "install";
type Channel = "home" | "facebook" | "shopee" | "lazada" | "accesstrade";
type Props = { products: WebsiteProduct[] };

const channelItems: Array<{ id: Exclude<Channel, "home">; label: string; mark: string; description: string }> = [
  { id: "facebook", label: "Facebook", mark: "f", description: "Nội dung & deal do AI Facebook vận hành" },
  { id: "shopee", label: "Deal Shopee", mark: "S", description: "Deal Shopee được lọc ngay trên Nhà Bếp" },
  { id: "lazada", label: "Deal Lazada", mark: "L", description: "Deal Lazada được lọc ngay trên Nhà Bếp" },
  { id: "accesstrade", label: "AccessTrade", mark: "A", description: "Nguồn affiliate và chiến dịch đang hoạt động" },
];

function networkLabel(network: WebsiteNetwork) {
  if (network === "shopee") return "SHOPEE";
  if (network === "lazada") return "LAZADA";
  return "AFFILIATE";
}

export default function StorefrontClient({ products }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const channelParam = searchParams.get("channel") as Channel | null;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "discount" | "price">("all");
  const [tab, setTab] = useState<Tab>("deals");
  const [menuOpen, setMenuOpen] = useState(false);
  const [installEvent, setInstallEvent] = useState<any>(null);
  const [saved, setSaved] = useState<string[]>([]);

  const channel: Channel = channelParam === "facebook" || channelParam === "shopee" || channelParam === "lazada" || channelParam === "accesstrade" ? channelParam : "home";

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const channelProducts = useMemo(() => {
    if (channel === "shopee" || channel === "lazada") return products.filter((item) => item.network === channel);
    return products;
  }, [products, channel]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = channelProducts.filter((item) => !q || `${item.title} ${item.category} ${item.source} ${item.network}`.toLowerCase().includes(q));
    if (filter === "discount") list = list.filter((item) => item.discountRate > 0);
    if (filter === "price") list = [...list].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    return list;
  }, [channelProducts, query, filter]);

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
    if (next === "deals") router.push("/website");
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
            <button className={styles.iconButton} onClick={() => selectTab("install")} aria-label="Cài ứng dụng">▣</button>
            <button className={styles.iconButton} onClick={() => selectTab("saved")} aria-label="Sản phẩm đã lưu">♡<b>{saved.length}</b></button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className={styles.menuBackdrop} onClick={() => setMenuOpen(false)}>
          <aside className={styles.siteMenu} role="dialog" aria-modal="true" aria-label="Điều hướng Nhà Bếp Thông Minh" onClick={(e) => e.stopPropagation()}>
            <div className={styles.menuTop}>
              <div><span>NHÀ BẾP THÔNG MINH</span><h2>Khám phá</h2></div>
              <button className={styles.closeButton} onClick={() => setMenuOpen(false)} aria-label="Đóng">×</button>
            </div>
            <button className={`${styles.menuHome} ${channel === "home" ? styles.menuSelected : ""}`} onClick={() => go("/website")}>
              <span>NB</span><div><strong>Trang chủ</strong><small>Deal được AI chọn lọc</small></div><b>→</b>
            </button>
            <div className={styles.menuList}>
              {channelItems.map((item) => (
                <button key={item.id} className={`${styles.menuChannel} ${channel === item.id ? styles.menuSelected : ""}`} onClick={() => go(`/website?channel=${item.id}`)}>
                  <span>{item.mark}</span><div><strong>{item.label}</strong><small>{item.description}</small></div><b>→</b>
                </button>
              ))}
              <button className={styles.menuChannel} onClick={() => selectTab("install")}><span>▣</span><div><strong>Cài Nhà Bếp Thông Minh</strong><small>Đưa website lên màn hình điện thoại</small></div><b>→</b></button>
            </div>
            <p className={styles.menuNote}>Các mục trong menu đều mở trên chính website Nhà Bếp Thông Minh. Chỉ khi khách chọn một sản phẩm mới đi tới link affiliate của nhà bán.</p>
          </aside>
        </div>
      )}

      <main className={styles.shopPage}>
        {tab === "install" ? (
          <section className={styles.installPage}>
            <div className={styles.installMark}>NB</div>
            <span className={styles.installEyebrow}>NHÀ BẾP THÔNG MINH</span>
            <h1>Cài <em>Nhà Bếp Thông Minh</em><br />vào điện thoại</h1>
            <p>Biến storefront thành trải nghiệm giống một app mua sắm: mở nhanh, xem deal, lưu sản phẩm và quay lại bất cứ lúc nào.</p>
            <div className={styles.installSteps}>
              <div><b>01</b><span>Android</span><strong>Chrome → ⋮ → Cài ứng dụng</strong></div>
              <div><b>02</b><span>iPhone</span><strong>Safari → Chia sẻ → Thêm vào Màn hình chính</strong></div>
            </div>
            <button className={styles.installCta} onClick={installApp}>{installEvent ? "Cài ứng dụng ngay" : "Cài / xem hướng dẫn"} <span>→</span></button>
            <div className={styles.installTrust}><span>✓</span><div><strong>Tên ứng dụng: Nhà Bếp Thông Minh</strong><small>Không hiển thị tên miền AgentFlow trong giao diện cài đặt.</small></div></div>
          </section>
        ) : (
          <>
            <section className={styles.heroShop}>
              <div className={styles.heroGlow} />
              <div className={styles.heroBadge}><span /> AI đang chọn deal mới</div>
              {channel === "home" ? <><h1>Đồ bếp hay.<br /><em>Giá đáng mua.</em></h1><p>Nhà Bếp Thông Minh gom và sàng lọc deal từ hệ sinh thái affiliate, giúp khách xem sản phẩm ngay trên website.</p></> : <><h1>{channel === "facebook" ? <>Kênh <em>Facebook</em></> : channel === "shopee" ? <>Deal <em>Shopee</em></> : channel === "lazada" ? <>Deal <em>Lazada</em></> : <>Nguồn <em>AccessTrade</em></>}</h1><p>{channel === "facebook" ? "Nội dung Facebook được AI phụ trách sẽ được trình bày thành các bộ sưu tập deal ngay trên website." : channel === "accesstrade" ? "Nguồn affiliate được AI lọc trước khi xuất hiện trong storefront." : "Khách vẫn ở trong Nhà Bếp Thông Minh; không bị đẩy sang trang chủ hay màn hình đăng nhập của nền tảng."}</p></>}
              <div className={styles.heroButtons}><button onClick={() => selectTab("deals")} className={styles.heroPrimary}>Xem deal <span>→</span></button><button onClick={() => selectTab("install")} className={styles.heroInstall}>▣ Cài app</button></div>
            </section>

            <section className={styles.searchSection} aria-label="Tìm kiếm sản phẩm">
              <div className={styles.searchBox}><span aria-hidden="true">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm nồi, chảo, máy xay, đồ gia dụng..." aria-label="Tìm sản phẩm" />{query && <button onClick={() => setQuery("")} aria-label="Xóa tìm kiếm">×</button>}</div>
              <div className={styles.quickChips}><button className={filter === "all" ? styles.chipActive : styles.chip} onClick={() => { setFilter("all"); setQuery(""); }}>Tất cả</button><button className={styles.chip} onClick={() => { setFilter("all"); setQuery("nồi"); }}>🍳 Nồi & chảo</button><button className={styles.chip} onClick={() => { setFilter("all"); setQuery("máy"); }}>⚡ Điện gia dụng</button><button className={filter === "discount" ? styles.chipActive : styles.chip} onClick={() => { setFilter("discount"); setQuery(""); }}>🔥 Đang giảm</button><button className={filter === "price" ? styles.chipActive : styles.chip} onClick={() => { setFilter("price"); setQuery(""); }}>Giá tốt</button></div>
            </section>

            <section className={styles.productsSection}>
              <div className={styles.sectionHeading}><div><span>{tab === "saved" ? "ĐÃ LƯU" : channel === "home" ? "AI CURATED" : channel.toUpperCase()}</span><h2>{tab === "saved" ? "Sản phẩm yêu thích" : channel === "facebook" ? "Deal từ nội dung Facebook" : channel === "shopee" ? "Deal Shopee" : channel === "lazada" ? "Deal Lazada" : channel === "accesstrade" ? "Nguồn affiliate" : "Deal hôm nay"}</h2></div><small>{activeProducts.length} sản phẩm</small></div>
              {activeProducts.length === 0 ? <div className={styles.emptyShop}><div>⌁</div><h3>Chưa có sản phẩm cho mục này</h3><p>Hãy quay lại Deal hôm nay để xem toàn bộ sản phẩm AI đã chọn.</p><button onClick={() => go("/website")}>Về trang chủ</button></div> : <div className={styles.shopGrid}>{activeProducts.map((product) => <article className={styles.shopCard} key={product.id}><a href={product.url || "#"} target="_blank" rel="nofollow sponsored noopener" className={styles.productLink}><div className={styles.productImage}>{product.image ? <img src={`/api/website/image?url=${encodeURIComponent(product.image)}`} alt={product.title} loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : <div className={styles.noImage}>NB</div>}<span className={styles.imageShine} />{product.discountRate > 0 && <span className={styles.saleBadge}>-{product.discountRate}%</span>}<span className={styles.sourceBadge}>{networkLabel(product.network)}</span></div><div className={styles.productInfo}><div className={styles.productCategory}>{product.category || "Đồ gia dụng"}</div><h3>{product.title}</h3><div className={styles.productBottom}><strong>{product.price ? `${money.format(product.price)} ₫` : "Xem giá"}</strong><span>→</span></div></div></a><button className={styles.saveButton} onClick={() => toggleSaved(product.id)} aria-label={saved.includes(product.id) ? "Bỏ lưu sản phẩm" : "Lưu sản phẩm"}>{saved.includes(product.id) ? "♥" : "♡"}</button></article>)}</div>}
            </section>

            <section className={styles.trustSection}><div><span className={styles.trustIcon}>✦</span><strong>AI chọn lọc</strong><p>Ưu tiên deal đáng chú ý.</p></div><div><span className={styles.trustIcon}>↗</span><strong>Link affiliate</strong><p>Chỉ rời website khi khách chọn mua.</p></div><div><span className={styles.trustIcon}>✓</span><strong>An toàn</strong><p>Không lộ khóa API hay secret ra trình duyệt.</p></div></section>
          </>
        )}
      </main>

      <nav className={styles.bottomNav} aria-label="Điều hướng cửa hàng">
        <button className={tab === "deals" && channel === "home" ? styles.bottomActive : ""} onClick={() => selectTab("deals")}><span>◈</span>Deal</button>
        <button className={tab === "saved" ? styles.bottomActive : ""} onClick={() => selectTab("saved")}><span>♡</span>Đã lưu</button>
        <button className={tab === "install" ? styles.bottomActive : ""} onClick={() => selectTab("install")}><span>▣</span>Cài app</button>
      </nav>
    </div>
  );
}
