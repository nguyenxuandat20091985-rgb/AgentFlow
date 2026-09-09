"use client";

import { FormEvent, useEffect, useState } from "react";
import styles from "./CommandOverview.module.css";

type Agent = { id: string; name: string; status: string; runtimeEnabled?: boolean; currentTask?: string };
type Payment = { status?: string };
type Earning = { payments?: Payment[] };
type KPI = { agentId: string; name: string; target: number; actual: number; remaining: number; progress: number; transactions: number };

type CockpitAgent = {
  id: string;
  name: string;
  domain: string;
  channel: string;
  runtimeEnabled: boolean;
  status: string;
  lastSeen: string | null;
  pendingActions: number;
  kpiTarget: number | null;
  kpiActual: number;
  kpiProgress: number;
  role: string;
};

type Cockpit = {
  ok?: boolean;
  summary?: string;
  ownerBrief?: string;
  metrics?: {
    fleetSize: number;
    runtimeEnabled: number;
    running: number;
    degraded: number;
    registryOnly: number;
    pendingActions: number;
    publishedTierA: number;
    verifiedRevenue: number;
  };
  alerts?: Array<{ level: string; code: string; message: string }>;
  agents?: CockpitAgent[];
  channels?: {
    website?: { live?: boolean; postsUrl?: string; autoPublishTierA?: boolean };
    facebook?: { live?: boolean; note?: string };
  };
  recentPublished?: Array<{ title?: string; published_url?: string; published_at?: string }>;
  latestCeoOutreachReport?: string | null;
};

const NAV = [["/", "⌂", "Tổng quan"], ["/agents", "◈", "AI Agents"], ["/workflows", "⌁", "Workflows"], ["/history", "◷", "Lịch sử"]] as const;
const money = (n: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);

export default function CommandOverview() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [cockpit, setCockpit] = useState<Cockpit | null>(null);
  const [loading, setLoading] = useState(true);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [command, setCommand] = useState("");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [a, e, k, c] = await Promise.all([
          fetch("/api/agents", { cache: "no-store" }),
          fetch("/api/earning", { cache: "no-store" }),
          fetch("/api/agents/kpi", { cache: "no-store" }),
          fetch("/api/ceo/cockpit", { cache: "no-store" }),
        ]);
        const ad = a.ok ? await a.json() : {};
        const ed: Earning = e.ok ? await e.json() : {};
        const kd = k.ok ? await k.json() : {};
        const cd: Cockpit = c.ok ? await c.json() : {};
        if (alive) {
          setAgents(Array.isArray(ad) ? ad : Array.isArray(ad.agents) ? ad.agents : []);
          setPayments(Array.isArray(ed.payments) ? ed.payments : []);
          setKpis(Array.isArray(kd.kpis) ? kd.kpis : []);
          setCockpit(cd?.ok ? cd : null);
          setConnected(a.ok && e.ok && k.ok);
          setLoading(false);
          setKpiLoading(false);
        }
      } catch {
        if (alive) {
          setConnected(false);
          setAgents([]);
          setCockpit(null);
          setLoading(false);
          setKpiLoading(false);
        }
      }
    };
    load();
    const timer = window.setInterval(load, 10000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  const m = cockpit?.metrics;
  const running = m?.running ?? agents.filter((a) => a.status === "running" && a.runtimeEnabled !== false).length;
  const runtimeEnabled = m?.runtimeEnabled ?? 2;
  const registryOnly = m?.registryOnly ?? 18;
  const pendingActions = m?.pendingActions ?? 0;
  const publishedTierA = m?.publishedTierA ?? 0;
  const verifiedRevenue = m?.verifiedRevenue ?? 0;
  const total = agents.length || m?.fleetSize || 20;
  const percent = loading ? 0 : Math.round((running / Math.max(runtimeEnabled, 1)) * 100);
  const success = payments.filter((p) => String(p.status).toLowerCase() === "success").length;

  const primaryAgents = (cockpit?.agents || []).filter(
    (a) => a.id === "ceo" || a.runtimeEnabled || a.id === "salesbot" || a.id === "marketing",
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = command.trim();
    if (value) window.location.href = `/chat?prompt=${encodeURIComponent(value)}`;
  };
  const quick = ["Báo cáo công việc hôm nay", "Kiểm tra hệ thống", "Tổng hợp doanh thu"];

  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <a href="/" className={styles.brand}>
          <img src="/avatar.svg" alt="" />
          <span>
            Agent<span>Flow</span>
          </span>
        </a>
        <div className={styles.sideLabel}>AI OPERATIONS</div>
        <nav>
          {NAV.map(([href, icon, label]) => (
            <a key={href} className={href === "/" ? styles.active : ""} href={href}>
              <span>{icon}</span>
              {label}
            </a>
          ))}
        </nav>
        <div className={styles.sideStatus}>
          <i /> Một link điều hành
          <small>agentflow-khaki-rho.vercel.app</small>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>
              <i /> AI CONTROL CENTER · ALL-IN-ONE
            </span>
            <h1>Trung tâm điều hành</h1>
            <p>AI CEO + 20 AI độc lập — mọi trạng thái, cảnh báo, KPI gộp trong một trang này.</p>
          </div>
          <div className={styles.headerLive}>{connected ? "● SYSTEM LIVE" : "● SYNCING"}</div>
        </header>

        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>AI CEO · LIVE BRIEF</span>
            <h2>{cockpit?.summary || (loading ? "Đang tải báo cáo AI CEO…" : "AgentFlow đang đồng bộ.")}</h2>
            <p>
              Primary: SalesBot (Website) + Marketing (Facebook). Registry-only: {registryOnly} AI chưa bật runtime.
            </p>
          </div>
          <div className={styles.orbit} aria-hidden="true">
            <div>CEO</div>
          </div>
        </section>

        <section className={styles.telemetryGrid} aria-label="Live telemetry">
          <article className={styles.telemetry}>
            <div className={styles.cardTop}>
              <span>PRIMARY ONLINE</span>
              <b className={running > 0 ? styles.good : styles.warn}>
                <i /> {running > 0 ? "LIVE" : "STALE"}
              </b>
            </div>
            <div className={styles.agentMetric}>
              <strong>{loading ? "—" : running}</strong>
              <span>/ {runtimeEnabled} PRIMARY</span>
            </div>
            <div className={styles.progress}>
              <span style={{ width: `${percent}%` }} />
            </div>
            <div className={styles.miniRow}>
              <span>
                Registry <b>{registryOnly}</b>
              </span>
              <span>
                Fleet <b>{total}</b>
              </span>
            </div>
          </article>

          <article className={styles.telemetry}>
            <div className={styles.cardTop}>
              <span>CEO METRICS</span>
              <b className={styles.good}>
                <i /> VERIFIED
              </b>
            </div>
            <div className={styles.dataLines} style={{ marginTop: 16 }}>
              <div>
                <span>Pending queue</span>
                <strong>{loading ? "—" : pendingActions}</strong>
              </div>
              <div>
                <span>Bài Tier A (Website)</span>
                <strong>{loading ? "—" : publishedTierA}</strong>
              </div>
              <div>
                <span>Doanh thu verified</span>
                <strong>{loading ? "—" : money(verifiedRevenue)}</strong>
              </div>
              <div>
                <span>Payment success</span>
                <strong>{loading ? "—" : success}</strong>
              </div>
            </div>
          </article>

          <article className={styles.telemetry}>
            <div className={styles.cardTop}>
              <span>CHANNELS</span>
              <b className={connected ? styles.good : styles.warn}>
                <i /> {connected ? "OK" : "CHECK"}
              </b>
            </div>
            <div className={styles.dataLines} style={{ marginTop: 16 }}>
              <div>
                <span>Website / SalesBot</span>
                <strong>{cockpit?.channels?.website?.live ? "LIVE" : "—"}</strong>
              </div>
              <div>
                <span>Facebook / Marketing</span>
                <strong>{cockpit?.channels?.facebook?.live ? "LIVE" : "—"}</strong>
              </div>
              <div>
                <span>Auto-publish Tier A</span>
                <strong>{cockpit?.channels?.website?.autoPublishTierA ? "ON" : "OFF"}</strong>
              </div>
              <div>
                <span>Isolation</span>
                <strong>Branch + channel</strong>
              </div>
            </div>
          </article>
        </section>

        {(cockpit?.alerts?.length ?? 0) > 0 && (
          <section className={styles.commandPanel} aria-label="CEO alerts">
            <div className={styles.commandHeading}>
              <div>
                <span className={styles.eyebrow}>AI CEO · CẢNH BÁO</span>
                <h3>Theo dõi realtime</h3>
              </div>
            </div>
            <ul className={styles.alertList}>
              {(cockpit?.alerts || []).map((a) => (
                <li
                  key={a.code + a.message}
                  className={a.level === "critical" ? styles.alertCritical : a.level === "warn" ? styles.alertWarn : styles.alertInfo}
                >
                  <b>[{a.level}]</b> {a.message}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className={styles.commandPanel} aria-label="Primary fleet under CEO">
          <div className={styles.commandHeading}>
            <div>
              <span className={styles.eyebrow}>FLEET DƯỚI AI CEO</span>
              <h3>AI độc lập · không ghi đè lẫn nhau</h3>
            </div>
          </div>
          <div className={styles.fleetTableWrap}>
            <table className={styles.fleetTable}>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Status</th>
                  <th>Channel</th>
                  <th>Pending</th>
                  <th>KPI</th>
                </tr>
              </thead>
              <tbody>
                {(primaryAgents.length
                  ? primaryAgents
                  : [
                      { id: "ceo", name: "AI CEO", status: "orchestrator", channel: "ceo", pendingActions: 0, kpiTarget: null, kpiActual: 0, kpiProgress: 0, role: "Orchestrator", domain: "orchestration", runtimeEnabled: false, lastSeen: null },
                      { id: "salesbot", name: "SalesBot (AI Website)", status: "—", channel: "website", pendingActions: 0, kpiTarget: 15_000_000, kpiActual: 0, kpiProgress: 0, role: "Website", domain: "website", runtimeEnabled: true, lastSeen: null },
                      { id: "marketing", name: "Marketing (AI Facebook)", status: "—", channel: "facebook", pendingActions: 0, kpiTarget: 15_000_000, kpiActual: 0, kpiProgress: 0, role: "Facebook", domain: "facebook", runtimeEnabled: true, lastSeen: null },
                    ]
                ).map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.name}</strong>
                      <div className={styles.muted}>{a.role}</div>
                    </td>
                    <td>{a.status}</td>
                    <td>{a.channel}</td>
                    <td>{a.pendingActions}</td>
                    <td>
                      {a.kpiTarget != null
                        ? `${Math.round(a.kpiProgress)}% (${money(a.kpiActual)})`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.muted} style={{ marginTop: 12, fontSize: 11 }}>
            18 AI registry-only không chạy runtime cho đến khi validate trên nhánh riêng — sửa một AI không ảnh hưởng AI khác.
          </p>
        </section>

        <section className={styles.commandPanel} aria-label="Primary agent KPI">
          <div className={styles.commandHeading}>
            <div>
              <span className={styles.eyebrow}>REVENUE CAMPAIGN · KPI</span>
              <h3>2 AI chủ lực · mục tiêu tháng</h3>
            </div>
            <span className={styles.headerLive}>30.000.000 ₫ TARGET</span>
          </div>
          <div className={styles.kpiGrid}>
            {(kpiLoading ? ["SalesBot", "Marketing"] : kpis).map((item: KPI | string) => {
              const k = typeof item === "string" ? null : item;
              return (
                <article className={styles.kpiCard} key={typeof item === "string" ? item : item.agentId}>
                  <div className={styles.cardTop}>
                    <span>{typeof item === "string" ? item : item.name}</span>
                    <b className={k?.progress && k.progress > 0 ? styles.good : styles.warn}>
                      <i /> {k ? `${Math.round(k.progress)}%` : "SYNC"}
                    </b>
                  </div>
                  <div className={styles.kpiNumbers}>
                    <strong>{k ? money(k.actual) : "—"}</strong>
                    <span>/ {money(k?.target ?? 15_000_000)}</span>
                  </div>
                  <div className={styles.progress}>
                    <span style={{ width: `${k?.progress ?? 0}%` }} />
                  </div>
                  <div className={styles.miniRow}>
                    <span>
                      Còn lại <b>{k ? money(k.remaining) : "—"}</b>
                    </span>
                    <span>
                      GD <b>{k?.transactions ?? "—"}</b>
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {cockpit?.ownerBrief ? (
          <section className={styles.commandPanel} aria-label="Owner brief">
            <div className={styles.commandHeading}>
              <div>
                <span className={styles.eyebrow}>AI CEO · BÁO CÁO CHO ANH</span>
                <h3>Chỉ cần xem tại đây</h3>
              </div>
            </div>
            <pre className={styles.ownerBrief}>{cockpit.ownerBrief}</pre>
            {cockpit.latestCeoOutreachReport ? (
              <pre className={styles.ownerBrief} style={{ marginTop: 12 }}>
                {String(cockpit.latestCeoOutreachReport).slice(0, 1200)}
              </pre>
            ) : null}
          </section>
        ) : null}

        <section className={styles.commandPanel}>
          <div className={styles.commandHeading}>
            <div>
              <span className={styles.eyebrow}>AI CEO · COMMAND BAR</span>
              <h3>Ra lệnh từ trung tâm</h3>
            </div>
          </div>
          <form onSubmit={submit} className={styles.commandForm}>
            <span>✦</span>
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Ví dụ: CEO, báo cáo tình hình fleet…"
              aria-label="Ra lệnh cho AI CEO"
            />
            <button disabled={!command.trim()}>Gửi ↗</button>
          </form>
          <div className={styles.quickRow}>
            <span>Gợi ý</span>
            {quick.map((q) => (
              <button type="button" key={q} onClick={() => setCommand(q)}>
                {q}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.footerGrid}>
          <div className={styles.linkCard}>
            <span>♛</span>
            <div>
              <small>AI CEO</small>
              <strong>Đã tích hợp tại trang này</strong>
              <p>Cảnh báo · fleet · báo cáo owner.</p>
            </div>
          </div>
          <div className={styles.linkCard}>
            <span>◈</span>
            <div>
              <small>FLEET</small>
              <strong>{runtimeEnabled} primary · {registryOnly} registry</strong>
              <p>Cô lập nhánh + channel.</p>
            </div>
          </div>
          <div className={styles.linkCard}>
            <span>⌁</span>
            <div>
              <small>AI WEBSITE</small>
              <strong>{publishedTierA} bài Tier A</strong>
              <p>SalesBot · auto-publish owned.</p>
            </div>
          </div>
        </section>
      </main>

      <nav className={styles.bottomNav} aria-label="Điều hướng chính">
        {NAV.map(([href, icon, label]) => (
          <a key={href} className={href === "/" ? styles.active : ""} href={href}>
            <span>{icon}</span>
            <small>{label}</small>
          </a>
        ))}
      </nav>
    </div>
  );
}
