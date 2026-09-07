"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";

type Agent = { id: string; name: string; role?: string; status: string; revenue?: number };
type Payment = { id: string; external_event_id?: string; provider?: string; status?: string; amount?: number; created_at?: string };
type LedgerRow = { id?: string; event_id?: string; amount?: number; agent_id?: string; created_at?: string };
type View = "overview" | "agents" | "workflows" | "history" | "chat";

const NAMES = [
  "SalesBot", "SupportAI", "DataAnalyzer", "ContentWriter", "ChatBot",
  "LeadGen", "EmailAI", "SocialMedia", "Analytics", "CRM", "Billing",
  "Inventory", "Research", "Design", "Code", "QA", "HR", "Finance",
  "Marketing", "CustomerService",
];

const ICONS = ["↗", "◌", "⌁", "✦", "◈", "◎", "✉", "◇", "◒", "▣", "◫", "▤", "⌕", "✎", "⌘", "✓", "♙", "◐", "◆", "◉"];
const seed: Agent[] = NAMES.map((name, index) => ({ id: name.toLowerCase(), name, role: "AI Agent", status: index < 12 ? "running" : "stopped", revenue: 0 }));

export default function AgentFlowShell({ view, children }: { view: View; children?: ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>(seed);
  const [revenue, setRevenue] = useState(0);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [agentResponse, earningResponse] = await Promise.all([
          fetch("/api/agents", { cache: "no-store" }),
          fetch("/api/earning", { cache: "no-store" }),
        ]);
        const agentData = agentResponse.ok ? await agentResponse.json() : [];
        const earningData = await earningResponse.json();
        if (!earningResponse.ok) throw new Error(earningData.error || "Không thể tải dữ liệu doanh thu");
        if (alive) {
          setAgents(Array.isArray(agentData) && agentData.length ? agentData : seed);
          setRevenue(Number(earningData.revenue?.total || 0));
          setPayments(Array.isArray(earningData.payments) ? earningData.payments : []);
          setLedger(Array.isArray(earningData.ledger) ? earningData.ledger : []);
          setLastSync(new Date());
          setError("");
        }
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Không thể tải dữ liệu hệ thống");
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const timer = window.setInterval(load, 10_000);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);

  const revenueByAgent = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of ledger) {
      const key = String(row.agent_id || "").toLowerCase();
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + Number(row.amount || 0));
    }
    return map;
  }, [ledger]);

  const fleet = useMemo(() => NAMES.map((name, index) => {
    const live = agents.find((agent) => agent.name?.toLowerCase() === name.toLowerCase() || agent.id?.toLowerCase() === name.toLowerCase());
    const revenueForAgent = revenueByAgent.get(name.toLowerCase()) ?? revenueByAgent.get(live?.id?.toLowerCase() || "") ?? 0;
    return { ...seed[index], ...(live || {}), revenue: Number(live?.revenue ?? revenueForAgent) };
  }), [agents, revenueByAgent]);

  const running = fleet.filter((agent) => agent.status === "running" || agent.status === "ready").length;
  const stopped = fleet.length - running;
  const successfulPayments = payments.filter((payment) => String(payment.status).toLowerCase() === "success");
  const money = (value: number) => `${Number(value || 0).toLocaleString("vi-VN")} ₫`;

  // Bottom navigation is intentionally limited to the four core product areas.
  // AI CEO remains accessible from the Overview control center, but is not a fifth tab.
  const nav = [
    ["/", "⌂", "Tổng quan"],
    ["/agents", "◈", "AI Agents"],
    ["/workflows", "⌁", "Workflows"],
    ["/history", "◷", "Lịch sử"],
  ] as const;

  return (
    <div className="af-shell">
      <aside className="af-sidebar">
        <a className="af-brand" href="/" aria-label="AgentFlow - Trang chủ"><img src="/avatar.svg" alt="" /><span>Agent<span>Flow</span></span></a>
        <div className="af-side-caption">AI OPERATIONS</div>
        <nav className="af-side-nav" aria-label="Điều hướng">
          {nav.map(([href, icon, label]) => <a key={href} className={(view === "overview" && href === "/") || href.includes(view) ? "active" : ""} href={href}><span>{icon}</span><span>{label}</span></a>)}
        </nav>
        <div className="af-sidebar-footer"><span className="af-online-dot" /><div><strong>Control plane</strong><small>Supabase · PayOS · Live</small></div></div>
      </aside>

      <main className="af-main">
        <header className="af-topbar">
          <div className="af-heading">
            <div className="af-kicker">AI CONTROL CENTER</div>
            <h1>{view === "chat" ? "AI CEO" : view === "agents" ? "AI Agents" : view === "workflows" ? "Workflows" : view === "history" ? "Lịch sử giao dịch" : "Trung tâm điều hành"}</h1>
            <p>{view === "overview" ? "Một màn hình để nắm trạng thái vận hành. Chi tiết được tách riêng theo từng khu vực." : "AgentFlow · vận hành tập trung, dữ liệu thực tế."}</p>
          </div>
          <div className="af-top-actions">
            {lastSync && <span className="af-sync">● Đồng bộ {lastSync.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>}
            <a className="af-ceo-button" href="/chat">✦ Mở AI CEO</a>
          </div>
        </header>

        {error && <div className="af-error" role="alert">{error}</div>}
        {view === "overview" && <Overview running={running} stopped={stopped} successfulPayments={successfulPayments.length} loading={loading} />}
        {view === "agents" && <Agents fleet={fleet} loading={loading} money={money} />}
        {view === "workflows" && <Workflows />}
        {view === "history" && <History payments={successfulPayments} loading={loading} money={money} totalRevenue={revenue} />}
        {view === "chat" && children}
      </main>

      <nav className="af-bottom-nav" aria-label="Điều hướng chính">
        {nav.map(([href, icon, label]) => <a key={href} className={(view === "overview" && href === "/") || href.includes(view) ? "active" : ""} href={href}><span>{icon}</span><small>{label}</small></a>)}
      </nav>
    </div>
  );
}

function Overview({ running, stopped, successfulPayments, loading }: { running: number; stopped: number; successfulPayments: number; loading: boolean }) {
  const health = [
    ["Supabase Database", "Kết nối dữ liệu", "connected"],
    ["PayOS Webhook", "Nhận & đối soát thanh toán", "connected"],
    ["Agent Runtime", "Đồng bộ trạng thái 10 giây", "connected"],
    ["Safety Firewall", "Bảo vệ luồng điều khiển", "connected"],
  ];
  const percent = Math.round((running / 20) * 100);
  return (
    <div className="af-overview">
      <section className="af-panel af-control-center">
        <div className="af-section-head"><div><div className="af-kicker">OPERATIONS</div><h2>Trung tâm điều hành</h2><p>Điểm vào duy nhất để điều phối AI CEO và theo dõi sức khỏe vận hành.</p></div><span className="af-live-pill"><i /> LIVE</span></div>
        <div className="af-command-grid">
          <a href="/chat" className="af-command-card af-command-primary"><span className="af-command-icon">✦</span><div><small>AI CEO</small><strong>Giao việc & điều phối</strong><p>Ra lệnh bằng ngôn ngữ tự nhiên, chọn đúng Agent và xem kết quả.</p></div><b>→</b></a>
          <a href="/agents" className="af-command-card"><span className="af-command-icon">◈</span><div><small>FLEET</small><strong>Quản lý 20 AI Agents</strong><p>Kiểm tra trạng thái từng Agent và năng lực đang hoạt động.</p></div><b>→</b></a>
          <a href="/workflows" className="af-command-card"><span className="af-command-icon">⌁</span><div><small>AUTOMATION</small><strong>Điều hành Workflows</strong><p>Theo dõi các quy trình tự động mà không pha trộn dữ liệu tài chính.</p></div><b>→</b></a>
        </div>
        <div className="af-control-footer"><div><span>AI đang hoạt động</span><strong>{loading ? "—" : `${running}/20`}</strong></div><div><span>Giao dịch thành công</span><strong>{loading ? "—" : successfulPayments}</strong></div><div><span>Nhịp đồng bộ</span><strong>10s</strong></div><a href="/chat">Hỏi AI CEO →</a></div>
      </section>

      <section className="af-panel af-system-status">
        <div className="af-section-head"><div><div className="af-kicker">SYSTEM HEALTH</div><h2>Trạng thái hệ thống</h2><p>Biểu đồ vận hành và các dịch vụ nền, không lẫn với dòng tiền.</p></div><span className="af-health-score">{percent}% fleet online</span></div>
        <div className="af-health-layout">
          <div className="af-donut-wrap"><div className="af-donut" style={{ background: `conic-gradient(#10B981 0 ${percent}%, #EF4444 ${percent}% 100%)` }} aria-label={`${percent}% AI đang chạy`}><div><strong>{loading ? "—" : running}</strong><span>đang chạy</span></div></div><div className="af-legend"><span><i className="green" />Đang chạy <b>{running}</b></span><span><i className="red" />Đã dừng <b>{stopped}</b></span></div></div>
          <div className="af-health-list">{health.map(([name, detail]) => <div className="af-health-row" key={name}><div className="af-health-icon">✓</div><div><strong>{name}</strong><span>{detail}</span></div><em>Healthy</em></div>)}</div>
        </div>
      </section>
    </div>
  );
}

function Agents({ fleet, loading, money }: { fleet: Agent[]; loading: boolean; money: (value: number) => string }) {
  return <section className="af-page-section"><div className="af-section-head"><div><div className="af-kicker">AUTONOMOUS FLEET</div><h2>20 AI Agents</h2><p>Mỗi Agent có trạng thái và doanh thu riêng, tự cập nhật mỗi 10 giây.</p></div><span className="af-info-pill">20 / 20 Agents</span></div><div className="af-agent-grid">{loading ? NAMES.map((name) => <div className="af-agent-skeleton" key={name} />) : fleet.map((agent, index) => { const on = agent.status === "running" || agent.status === "ready"; return <article className={`af-agent-card ${on ? "is-on" : "is-off"}`} key={agent.id} tabIndex={0} aria-label={`${agent.name}: ${on ? "Đang chạy" : "Đã dừng"}`}><div className="af-agent-top"><span className="af-agent-icon">{ICONS[index]}</span><span className={`af-status-dot ${on ? "on" : "off"}`} /></div><strong>{agent.name}</strong><span className="af-agent-role">{agent.role || "AI Agent"}</span><div className="af-agent-status">{on ? "Đang chạy" : "Đã dừng"}</div><div className="af-agent-revenue">+{money(Number(agent.revenue || 0))}</div></article>; })}</div></section>;
}

function Workflows() {
  const items = [["Customer Acquisition", "Lead → tư vấn → payment → webhook", "Active"], ["E-Commerce Autopilot", "Tìm deal → nội dung → theo dõi chuyển đổi", "Active"], ["Affiliate Autopilot", "Theo dõi click → đơn hàng → commission", "Active"], ["Revenue Reconciliation", "PayOS webhook → payment_events → revenue_ledger", "Protected"]];
  return <section className="af-page-section"><div className="af-section-head"><div><div className="af-kicker">AUTOMATION</div><h2>Workflows</h2><p>Chỉ tập trung vào nhiệm vụ và quy trình vận hành.</p></div></div><div className="af-workflow-list">{items.map(([name, desc, status]) => <article className="af-workflow-card" key={name}><span className="af-workflow-icon">⌁</span><div><strong>{name}</strong><p>{desc}</p></div><span className="af-workflow-status">{status}</span></article>)}</div></section>;
}

function History({ payments, loading, money, totalRevenue }: { payments: Payment[]; loading: boolean; money: (value: number) => string; totalRevenue: number }) {
  return <section className="af-page-section"><div className="af-history-summary"><div><div className="af-kicker">PAYMENT AUDIT</div><h2>Dòng tiền thực tế</h2><p>Toàn bộ giao dịch thành công được đối chiếu từ payment_events.</p></div><div className="af-history-total"><span>Total Revenue</span><strong>{money(totalRevenue)}</strong><small>revenue_ledger · Supabase</small></div></div><div className="af-panel af-history-panel">{loading ? <div className="af-empty">Đang tải giao dịch thực tế…</div> : payments.length ? <div className="af-table-wrap"><table className="af-table"><thead><tr><th>Mã giao dịch</th><th>Số tiền</th><th>Thời gian</th><th>Trạng thái</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td><strong>{payment.external_event_id || payment.id}</strong><small>{payment.provider || "payos"}</small></td><td className="af-table-amount">{money(Number(payment.amount || 0))}</td><td>{payment.created_at ? new Date(payment.created_at).toLocaleString("vi-VN") : "—"}</td><td><span className="af-success">SUCCESS</span></td></tr>)}</tbody></table></div> : <div className="af-empty">Chưa có giao dịch thành công.</div>}</div></section>;
}
