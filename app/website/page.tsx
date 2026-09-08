import type { Metadata } from "next";
import { getWebsiteCatalog } from "@/lib/website-catalog";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Nhà Bếp Thông Minh | Deal được AI chọn lọc",
  description: "Khám phá sản phẩm và ưu đãi được AgentFlow chọn lọc từ các nguồn affiliate.",
};

const money = new Intl.NumberFormat("vi-VN");

function Arrow() { return <span aria-hidden="true">→</span>; }

export default async function WebsitePage() {
  const products = await getWebsiteCatalog();
  const featured = products[0];

  return (
    <main className={styles.page}>
      <div className={styles.topbar}><div className={styles.topbarInner}><span>AI chọn lọc deal mỗi ngày</span><span>Shopee · Lazada · AccessTrade</span></div></div>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a className={styles.logo} href="/website" aria-label="Nhà Bếp Thông Minh">
            <span className={styles.logoMark}>N</span>
            <span className={styles.logoText}><small>AgentFlow Commerce</small><strong>Nhà Bếp Thông Minh</strong></span>
          </a>
          <nav className={styles.nav} aria-label="Điều hướng website"><a href="#deals">Deal nổi bật</a><a href="#catalog">Sản phẩm</a><a href="#about">Về chúng tôi</a></nav>
          <a className={styles.explore} href="#catalog">Khám phá <Arrow /></a>
        </div>
      </header>

      <section id="deals" className={styles.hero}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}><i className={styles.dot} /> Live selection</span>
            <h1>Mua thông minh.<br /><em>Chọn đúng deal.</em></h1>
            <p className={styles.heroText}>AgentFlow liên tục sàng lọc sản phẩm từ các nguồn thương mại và đưa những lựa chọn đáng chú ý lên đây — rõ ràng, gọn gàng, không làm bạn mất thời gian tìm kiếm.</p>
            <div className={styles.heroActions}><a className={styles.primary} href="#catalog">Xem deal hôm nay <Arrow /></a><a className={styles.secondary} href="#about">Cách hoạt động</a></div>
          </div>
          <div className={styles.heroVisual}>
            {featured?.image ? <img src={featured.image} alt={featured.title} /> : <div aria-hidden="true" style={{width:"100%",height:"100%",background:"linear-gradient(135deg,#dfe9c8,#c8d4ad)"}} />}
            <div className={styles.visualShade} />
            <div className={styles.visualCard}><small>AI PICK · Hôm nay</small><strong>{featured?.title ?? "Đang cập nhật lựa chọn mới"}</strong><span>{featured?.price ? `${money.format(featured.price)} ₫` : "Xem thông tin sản phẩm"}</span></div>
          </div>
        </div>
      </section>

      <section className={styles.benefits} aria-label="Điểm nổi bật"><div className={styles.benefitGrid}>
        <div className={styles.benefit}><span className={styles.benefitIcon}>✦</span><div><strong>AI chọn lọc</strong><span>Ưu tiên sản phẩm đáng chú ý</span></div></div>
        <div className={styles.benefit}><span className={styles.benefitIcon}>✓</span><div><strong>Nguồn minh bạch</strong><span>Shopee · Lazada · AccessTrade</span></div></div>
        <div className={styles.benefit}><span className={styles.benefitIcon}>↗</span><div><strong>Đi thẳng tới nơi bán</strong><span>Link affiliate theo nguồn</span></div></div>
      </div></section>

      <section id="catalog" className={styles.catalog}>
        <div className={styles.sectionTop}><div><div className={styles.sectionKicker}>Cập nhật liên tục</div><h2>Deal đáng chú ý</h2><p>Những lựa chọn mới nhất đang có trong catalog.</p></div><span className={styles.count}>{products.length} sản phẩm</span></div>
        <div className={styles.filterBar} aria-label="Bộ lọc sản phẩm"><span className={`${styles.filter} ${styles.filterActive}`}>Tất cả</span><span className={styles.filter}>Đang ưu đãi</span><span className={styles.filter}>Giá tốt</span><span className={styles.filter}>Mới cập nhật</span></div>
        {products.length === 0 ? <div className={styles.empty}><strong>Catalog đang cập nhật</strong><p>Hệ thống chưa nhận được sản phẩm khả dụng từ nguồn affiliate. Khi dữ liệu thật về, sản phẩm sẽ tự xuất hiện tại đây.</p></div> :
          <div className={styles.grid}>{products.map((product) => <article className={styles.product} key={product.id}>
            <a href={product.url || "#"} target="_blank" rel="nofollow sponsored noopener" aria-label={`Xem ${product.title}`}>
              <div className={styles.imageWrap}>{product.image ? <img src={product.image} alt={product.title} loading="lazy" /> : null}{product.discountRate > 0 && <span className={styles.discount}>-{product.discountRate}%</span>}<span className={styles.source}>{product.source === "accesstrade" ? "Affiliate" : product.source}</span></div>
              <div className={styles.body}><div className={styles.category}>{product.category || "Sản phẩm chọn lọc"}</div><h3 className={styles.title}>{product.title}</h3><div className={styles.bottom}><div className={styles.price}>{product.price ? `${money.format(product.price)} ₫` : "Xem giá"}</div><span className={styles.deal}><Arrow /></span></div></div>
            </a>
          </article>)}</div>}
      </section>

      <section id="about" className={styles.story}><div className={styles.storyInner}><div><div className={styles.sectionKicker}>AgentFlow Commerce</div><h2>Ít tìm kiếm hơn.<br />Quyết định tốt hơn.</h2></div><div><p>Website là điểm đến đầu ra cho hệ thống affiliate. AI tìm và sàng lọc cơ hội; website trình bày sản phẩm; khách hàng tự quyết định và đi tới nơi bán qua liên kết tương ứng.</p><div className={styles.storyStats}><div className={styles.stat}><strong>AI</strong><span>Chọn lọc và cập nhật catalog</span></div><div className={styles.stat}><strong>3</strong><span>Nguồn thương mại đang kết nối</span></div><div className={styles.stat}><strong>Live</strong><span>Catalog được làm mới tự động</span></div></div></div></div></section>

      <footer className={styles.footer}><span>© 2026 <strong>Nhà Bếp Thông Minh</strong> · Powered by AgentFlow</span><span>Liên kết trên website có thể là liên kết tiếp thị.</span></footer>
    </main>
  );
}
