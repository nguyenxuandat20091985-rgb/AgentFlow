"use client";

import { FormEvent, useEffect, useState } from "react";
import styles from "./CommandOverview.module.css";

type Agent = { id: string; name: string; status: string; runtimeEnabled?: boolean };
type Payment = { status?: string };
type Earning = { payments?: Payment[] };
type KPI = {
  agentId: string;
  name: string;
  target: number;
  actual: number;
  remaining: number;
  progress: number;
  transactions: number;
};

type CockpitAgent = {
  id: string;
  name: string;
  channel: string;
  runtimeEnabled: boolean;
  status: string;
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
    registryOnly: number;
    pendingActions: number;
    publishedTierA: number;
    verifiedRevenue: number;
  };
  alerts?: Array<{ level: string; code: string; message: string }>;
  agents?: CockpitAgent[];
  channels?: {
    website?: { live?: boolean; autoPublishTierA?: boolean };
    facebook?: { live?: boolean };
  };
  latestCeoOutreachReport?: string | null;
};

const NAV = [
  ["/", "⌂", "Tổng quan"],
  ["/agents", "◈", "AI Agents"],
  ["/workflows", "⌁", "Workflows"],
  ["/history", "◷", "Lịch sử"],
] as const;

const money = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);

function statusTone(status: string) {
  if (status === "running" || status === "orchestrator") return styles.pillLive;
  if (status === "stopped") return styles.pillWarn;
  return styles.pillMuted;
}

export default function CommandOverview() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [cockpit, setCockpit] = useState<Cockpit | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [command, setCommand] = useState("");
  const [showBrief, setShowBrief] = useState(false);

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
        if (!alive) return;
        setAgents(Array.isArray(ad) ? ad : Array.isArray(ad.agents) ? ad.agents : []);
        setPayments(Array.isArray(ed.payments) ? ed.payments : []);
        setKpis(Array.isArray(kd.kpis) ? kd.kpis : []);
        setCockpit(cd?.ok ? cd : null);
        setConnected(a.ok && e.ok && k.ok);
        setLoading(false);
      } catch {
        if (!alive) return;
        setConnected(false);
        setCockpit(null);
        setLoading(false);
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
  const running =
    m?.running ?? agents.filter((a) => a.status === "running" && a.runtimeEnabled !== false).length;
  const runtimeEnabled = m?.runtimeEnabled ?? 2;
  const registryOnly = m?.registryOnly ?? 18;
  const pendingActions = m?.pendingActions ?? 0;
  const publishedTierA = m?.publishedTierA ?? 0;
  const verifiedRevenue = m?.verifiedRevenue ?? 0;
  const success = payments.filter((p) => String(p.status).toLowerCase() === "success").length;

  const primaryAgents = (cockpit?.agents || []).filter(
    (a) => a.id === "ceo" || a.id === "salesbot" || a.id === "marketing",
  );

  const alerts = cockpit?.alerts || [];
  const criticalCount = alerts.filter((a) => a.level === "critical").length;
  const warnCount = alerts.filter((a) => a.level === "warn").length;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = command.trim();
    if (value) window.location.href = `/chat?prompt=${encodeURIComponent(value)}`;
  };

  const fallbackAgents: CockpitAgent[] = [
    {
      id: "ceo",
      name: "AI CEO",
      status: "orchestrator",
      channel: "ceo",
      pendingActions: 0,
      kpiTarget: null,
      kpiActual: 0,
      kpiProgress: 0,
      role: "Điều phối",
      runtimeEnabled: false,
    },
    {
      id: "salesbot",
      name: "SalesBot",
      status: "stopped",
      channel: "website",
      pendingActions: 0,
      kpiTarget: 15_000_000,
      kpiActual: 0,
      kpiProgress: 0,
      role: "AI Website",
      runtimeEnabled: true,
    },
    {
      id: "marketing",
      name: "Marketing",
      status: "stopped",
      channel: "facebook",
      pendingActions: 0,
      kpiTarget: 15_000_000,
      kpiActual: 0,
      kpiProgress: 0,
      role: "AI Facebook",
      runtimeEnabled: true,
    },
  ];

  const fallbackKpis: KPI[] = [
    {
      agentId: "salesbot",
      name: "SalesBot",
      target: 15_000_000,
      actual: 0,
      remaining: 15_000_000,
      progress: 0,
      transactions: 0,
    },
    {
      agentId: "marketing",
      name: "Marketing",
      target: 15_000_000,
      actual: 0,
      remaining: 15_000_000,
      progress: 0,
      transactions:: 0,
    },
  ];

  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <a href="/" className={styles.brand}>
          <img src="/avatar.svg" alt="" />
          <span>
            Agent<span>Flow</span>
          </span>
        </a>
        <div className={styles.sideLabel}>Điều hành</div>
        <nav>
          {NAV.map(([href, icon, label]) => (
            <a key={href} className={href === "/" ? styles.active : undefined} href={href}>
              <span>{icon}</span>
              {label}
            </a>
          ))}
        </nav>
        <div className={styles.sideFoot}>
          <span className={styles.dot} />
          Một link duy nhất
          <small>agentflow-khaki-rho.vercel.app</small>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topBar}>
          <div>
            <p className={styles.kicker}>AI Control Center</p>
            <h1>Trung tâm điều hành</h1>
          </div>
          <div className={styles.topRight}>
            <span className={connected ? styles.badgeOk : styles.badgeSync}>
              {connected ? "System live" : "Syncing"}
            </span>
          </div>
        </header>

        <section className={styles.briefCard}>
          <div className={styles.briefLeft}>
            <span className={styles.badgeCeo}>AI CEO</span>
            <p className={styles.briefText}>
              {loading ? "Đang tải báo cáo…" : cockpit?.summary || "Chưa có dữ liệu cockpit."}
            </p>
          </div>
          <div className={styles.briefStats}>
            <div>
              <strong>{loading ? "—" : running}</strong>
              <span>Primary online</span>
            </div>
            <div>
              <strong>{loading ? "—" : runtimeEnabled}</strong>
              <span>Runtime on</span>
            </div>
            <div>
              <strong>{loading ? "—" : registryOnly}</strong>
              <span>Registry</span>
            </div>
          </div>
        </section>

        <section className={styles.metricStrip} aria-label="Chỉ số chính">
          <article className={styles.metric}>
            <span>Queue pending</span>
            <strong>{loading ? "—" : pendingActions}</strong>
          </article>
          <article className={styles.metric}>
            <span>Bài Tier A</span>
            <strong>{loading ? "—" : publishedTierA}</strong>
          </article>
          <article className={styles.metric}>
            <span>Doanh thu verified</span>
            <strong className={styles.metricMoney}>{loading ? "—" : money(verifiedRevenue)}</strong>
          </article>
          <article className={styles.metric}>
            <span>Thanh toán OK</span>
            <strong>{loading ? "—" : success}</strong>
          </article>
        </section>

        <section className={styles.twoCol}>
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <h2>KPI AI chủ lực</h2>
              <span className={styles.subtle}>Mục tiêu 30.000.000 ₫</span>
            </div>
            <div className={styles.kpiRow}>
              {(kpis.length ? kpis : fallbackKpis).map((k) => (
                <article key={k.agentId} className={styles.kpiCard}>
                  <div className={styles.kpiTop}>
                    <h3>{k.name}</h3>
                    <span className={k.progress > 0 ? styles.pillLive : styles.pillMuted}>
                      {Math.round(k.progress)}%
                    </span>
                  </div>
                  <p className={styles.kpiValue}>{money(k.actual)}</p>
                  <p className={styles.kpiTarget}>/ {money(k.target)}</p>
                  <div className={styles.bar}>
                    <i style={{ width: `${Math.min(100, k.progress)}%` }} />
                  </div>
                  <div className={styles.kpiMeta}>
                    <span>Còn {money(k.remaining)}</span>
                    <span>{k.transactions} GD</span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <h2>Fleet dưới CEO</h2>
              <span className={styles.subtle}>Cô lập channel</span>
            </div>
            <div className={styles.agentList}>
              {(primaryAgents.length ? primaryAgents : fallbackAgents).map((a) => (
                <div key={a.id} className={styles.agentRow}>
                  <div className={styles.agentInfo}>
                    <strong>{a.name}</strong>
                    <span>
                      {a.role} · {a.channel}
                    </span>
                  </div>
                  <div className={styles.agentRight}>
                    <span className={statusTone(a.status)}>{a.status}</span>
                    <span className={styles.pending}>{a.pendingActions} pending</span>
                  </div>
                </div>
              ))}
            </div>
            <p className={styles.note}>
              Website {cockpit?.channels?.website?.live ? "live" : "—"}
              {" · "}
              Facebook {cockpit?.channels?.facebook?.live ? "live" : "—"}
              {" · "}
              Tier A auto {cockpit?.channels?.website?.autoPublishTierA ? "ON" : "OFF"}
            </p>
          </div>
        </section>

        {alerts.length > 0 && (
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2>Cảnh báo</h2>
              <span className={styles.subtle}>
                {criticalCount ? `${criticalCount} critical` : ""}
                {criticalCount && warnCount ? " · " : ""}
                {warnCount ? `${warnCount} warn` : ""}
              </span>
            </div>
            <div className={styles.alertStack}>
              {alerts.slice(0, 4).map((a) => (
                <div
                  key={a.code + a.message}
                  className={
                    a.level === "critical"
                      ? styles.alertCrit
                      : a.level === "warn"
                        ? styles.alertWarn
                        : styles.alertInfo
                  }
                >
                  <b>{a.level}</b>
                  <span>{a.message}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className={styles.commandPanel}>
          <div className={styles.panelHead}>
            <h2>Ra lệnh AI CEO</h2>
          </div>
          <form onSubmit={submit} className={styles.commandForm}>
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Ví dụ: Báo cáo tình hình fleet hôm nay…"
              aria-label="Lệnh cho AI CEO"
            />
            <button type="submit" disabled={!command.trim()}>
              Gửi
            </button>
          </form>
          <div className={styles.chips}>
            {["Báo cáo hôm nay", "Kiểm tra hệ thống", "Tổng hợp doanh thu"].map((q) => (
              <button key={q} type="button" onClick={() => setCommand(q)}>
                {q}
              </button>
            ))}
          </div>
        </section>

        {(cockpit?.ownerBrief || cockpit?.latestCeoOutreachReport) && (
          <section className={styles.panel}>
            <button type="button" className={styles.briefToggle} onClick={() => setShow              setShowBrief((v) => !v)
            }}>
              <span>Báo cáo chi tiết cho anh</span>
              <span>{showBrief ? "Thu gọn" : "Xem"}</span>
            </button>
            {showBrief && (
              <pre className={styles.briefBody}>
                {cockpit?.ownerBrief}
                {cockpit?.latestCeoOutreachReport
                  ? `\n\n—— Outreach ——\n${String(cockpit.latestCeoOutreachReport).slice(0, 1000)}`
                  : ""}
              </pre>
            )}
          </section>
        )}
      </main>

      <nav className={styles.bottomNav} aria-label="Menu">
        {NAV.map(([href, icon, label]) => (
          <a key={href} className={href === "/" ? styles.active : undefined} href={href}>
            <span>{icon}</span>
            <small>{label}</small>
          </a>
        ))}
      </nav>
    </div>
  );
}
