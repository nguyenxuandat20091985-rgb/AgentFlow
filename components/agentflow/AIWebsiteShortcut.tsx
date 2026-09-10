"use client";

import { useEffect, useState } from "react";
import styles from "./AIWebsiteShortcut.module.css";

type Agent = { id?: string; name?: string; status?: string; runtimeEnabled?: boolean; lastSeenAt?: string };
type CatalogResponse = { products?: unknown[] };

const CONTROL_CENTER = "/";
const WEBSITE_URL = "/website";
const SOURCES = ["Reddit", "Quora", "Medium", "Blogger", "WordPress.com", "Web / Q&A / Forum"];
const AFFILIATES = ["ACCESSTRADE", "Shopee", "Lazada"];

export default function AIWebsiteShortcut() {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [agentsResponse, catalogResponse] = await Promise.all([
          fetch("/api/agents", { cache: "no-store" }),
          fetch("/api/website/catalog", { cache: "no-store" }),
        ]);
        const agentsPayload = agentsResponse.ok ? await agentsResponse.json() : [];
        const agents: Agent[] = Array.isArray(agentsPayload)
          ? agentsPayload
          : Array.isArray(agentsPayload?.agents)
            ? agentsPayload.agents
            : [];
        const salesbot = agents.find((item) => item.id === "salesbot" || item.name?.toLowerCase().includes("website"));
        const catalogPayload: CatalogResponse = catalogResponse.ok ? await catalogResponse.json() : {};
        if (alive) {
          setAgent(salesbot || null);
          setProductCount(Array.isArray(catalogPayload.products) ? catalogPayload.products.length : null);
          setBusy(false);
        }
      } catch {
        if (alive) setBusy(false);
      }
    };
    load();
    const timer = window.setInterval(load, 15000);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);

  const online = agent?.status === "running" && agent.runtimeEnabled !== false;
  const state = busy ? "Đang đồng bộ…" : online ? "Đang chạy" : "Cần kiểm tra";

  return (
    <section className={styles.card} aria-label="Theo dõi AI Website trong Workflow">
      <div className={styles.top}>
        <span className={`${styles.icon} ${online ? styles.iconOnline : ""}`}>W</span>
        <div className={styles.copy}>
          <small>WORKFLOW · AI #1</small>
          <strong>AI Website & Hosting</strong>
          <span><i className={online ? styles.dotOnline : styles.dotWarn} />{state}</span>
        </div>
        <a className={styles.open} href={CONTROL_CENTER} aria-label="Về Trung tâm điều hành">⌂</a>
      </div>

      <div className={styles.pipeline}>
        <div className={styles.step}><b>01</b><strong>Săn tín hiệu</strong><small>Public web / Q&A</small><div>{SOURCES.map((item) => <em key={item}>{item}</em>)}</div></div>
        <span className={styles.arrow}>→</span>
        <div className={styles.step}><b>02</b><strong>Phân tích nhu cầu</strong><small>Intent → sản phẩm</small></div>
        <span className={styles.arrow}>→</span>
        <div className={styles.step}><b>03</b><strong>Tạo nội dung</strong><small>Giá trị trước · bán sau</small></div>
        <span className={styles.arrow}>→</span>
        <div className={styles.step}><b>04</b><strong>Website</strong><small>{productCount == null ? "Đang kiểm tra catalog" : `${productCount} sản phẩm`}</small></div>
        <span className={styles.arrow}>→</span>
        <div className={styles.step}><b>05</b><strong>Affiliate</strong><small>Click → Order → Commission</small><div>{AFFILIATES.map((item) => <em key={item}>{item}</em>)}</div></div>
      </div>

      <div className={styles.metrics}>
        <span><b>{productCount ?? "—"}</b><small>Sản phẩm</small></span>
        <span><b>24/7</b><small>Chu kỳ AI</small></span>
        <span><b>Isolated</b><small>salesbot độc lập</small></span>
        <span><b>0</b><small>Quyền di chuyển tiền</small></span>
      </div>

      <div className={styles.actions}>
        <a href={CONTROL_CENTER}>← Trung tâm điều hành</a>
        <a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer">Xem storefront ↗</a>
      </div>
    </section>
  );
}
