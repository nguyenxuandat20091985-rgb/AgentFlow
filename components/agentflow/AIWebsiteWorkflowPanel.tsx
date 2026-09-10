"use client";

import { useEffect, useState } from "react";
import styles from "./AIWebsiteWorkflowPanel.module.css";

type Agent = { id?: string; status?: string; runtimeEnabled?: boolean; lastSeenAt?: string };
type Catalog = { products?: unknown[] };

const sources = ["Reddit", "Quora", "Medium", "Blogger", "WordPress.com", "Web / Q&A / Forum"];
const providers = ["ACCESSTRADE", "Shopee", "Lazada"];

export default function AIWebsiteWorkflowPanel() {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [products, setProducts] = useState<number | null>(null);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [agentsRes, catalogRes] = await Promise.all([
          fetch("/api/agents", { cache: "no-store" }),
          fetch("/api/website/catalog", { cache: "no-store" }),
        ]);
        const payload = agentsRes.ok ? await agentsRes.json() : [];
        const list: Agent[] = Array.isArray(payload) ? payload : payload?.agents || [];
        const salesbot = list.find((item) => item.id === "salesbot");
        const catalog: Catalog = catalogRes.ok ? await catalogRes.json() : {};
        if (alive) {
          setAgent(salesbot || null);
          setProducts(Array.isArray(catalog.products) ? catalog.products.length : null);
          setSynced(true);
        }
      } catch {
        if (alive) setSynced(true);
      }
    };
    load();
    const timer = window.setInterval(load, 15000);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);

  const online = agent?.status === "running" && agent.runtimeEnabled !== false;

  return (
    <section className={styles.panel} aria-label="Workflow AI Website">
      <div className={styles.header}>
        <div>
          <span className={styles.kicker}>WORKFLOW · AI #1</span>
          <h2>AI Website · Signal Hunter</h2>
          <p>Tất cả vận hành AI Website được theo dõi tại đây; storefront chỉ là nơi xuất bản nội dung.</p>
        </div>
        <span className={online ? styles.live : styles.check}>{synced ? (online ? "● Đang chạy" : "● Cần kiểm tra") : "● Đồng bộ…"}</span>
      </div>

      <div className={styles.pipeline}>
        <div className={styles.node}><b>01</b><strong>Săn tín hiệu</strong><span>Public web / Q&A</span><div className={styles.tags}>{sources.map((s) => <em key={s}>{s}</em>)}</div></div>
        <i className={styles.arrow}>→</i>
        <div className={styles.node}><b>02</b><strong>Phân tích nhu cầu</strong><span>Intent · chủ đề · sản phẩm</span></div>
        <i className={styles.arrow}>→</i>
        <div className={styles.node}><b>03</b><strong>Tạo nội dung</strong><span>Giá trị trước · affiliate sau</span></div>
        <i className={styles.arrow}>→</i>
        <div className={styles.node}><b>04</b><strong>Website</strong><span>{products == null ? "Đang kiểm tra catalog" : `${products} sản phẩm trong catalog`}</span></div>
        <i className={styles.arrow}>→</i>
        <div className={styles.node}><b>05</b><strong>Affiliate</strong><span>Click → Order → Commission</span><div className={styles.tags}>{providers.map((s) => <em key={s}>{s}</em>)}</div></div>
      </div>

      <div className={styles.footer}>
        <span><b>ISOLATED</b> salesbot · không chạm AI khác</span>
        <span>Doanh thu chỉ từ dữ liệu xác minh</span>
        <a href="/">← Trung tâm điều hành</a>
        <a href="/website" target="_blank" rel="noopener noreferrer">Storefront ↗</a>
      </div>
    </section>
  );
}
