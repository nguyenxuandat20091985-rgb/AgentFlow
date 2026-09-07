"use client";

import { FormEvent, useState } from "react";

export default function CommandOverview({
  running,
  stopped,
  successfulPayments,
  loading,
  dataConnected,
}: {
  running: number;
  stopped: number;
  successfulPayments: number;
  loading: boolean;
  dataConnected: boolean;
}) {
  const [command, setCommand] = useState("");
  const [sent, setSent] = useState(false);
  const percent = loading ? 0 : Math.round((running / Math.max(running + stopped, 1)) * 100);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = command.trim();
    if (!value) return;
    window.location.href = `/chat?prompt=${encodeURIComponent(value)}`;
  };

  const quick = [
    "Báo cáo công việc hôm nay",
    "Kiểm tra 20 AI Agents",
    "Tổng hợp doanh thu hôm nay",
  ];

  return (
    <div className="cmd-overview">
      <section className="cmd-hero">
        <div className="cmd-hero-copy">
          <span className="cmd-eyebrow"><i /> COMMAND CENTER · LIVE</span>
          <h2>Điều hành AgentFlow</h2>
          <p>Quan sát hệ thống theo thời gian thực và ra lệnh trực tiếp cho AI CEO.</p>
        </div>
        <div className="cmd-hero-orbit" aria-hidden="true"><div className="cmd-orbit-core">AF</div></div>
      </section>

      <section className="cmd-telemetry-grid" aria-label="Live telemetry">
        <article className="cmd-telemetry cmd-agents-live">
          <div className="cmd-card-top"><span>AI FLEET</span><b><i /> LIVE</b></div>
          <div className="cmd-agent-metric"><strong>{loading ? "—" : running}</strong><span>/ {loading ? "20" : running + stopped} ONLINE</span></div>
          <div className="cmd-progress"><span style={{ width: `${percent}%` }} /></div>
          <div className="cmd-mini-row"><span>Running <b>{loading ? "—" : running}</b></span><span>Stopped <b>{loading ? "—" : stopped}</b></span></div>
        </article>

        <article className="cmd-telemetry cmd-health">
          <div className="cmd-card-top"><span>SYSTEM HEALTH</span><b className="health-good"><i /> {dataConnected ? "OPTIMAL" : "CHECK"}</b></div>
          <div className="cmd-health-body">
            <div className="cmd-health-ring" style={{ background: `conic-gradient(#10b981 ${percent}%, #1f2937 ${percent}% 100%)` }}><div><strong>{loading ? "—" : `${percent}%`}</strong><span>HEALTH</span></div></div>
            <div className="cmd-health-copy"><strong>{dataConnected ? "All systems operational" : "Đang kiểm tra kết nối"}</strong><span>Agent runtime · API · Database</span><small>Polling 10s · no manual refresh</small></div>
          </div>
        </article>

        <article className="cmd-telemetry cmd-data">
          <div className="cmd-card-top"><span>DATA LINK</span><b className={dataConnected ? "health-good" : "health-warn"}><i /> {dataConnected ? "CONNECTED" : "SYNCING"}</b></div>
          <div className="cmd-data-lines"><div><span>Supabase</span><strong>{dataConnected ? "Connected" : "Checking"}</strong></div><div><span>Payment events</span><strong>{loading ? "—" : successfulPayments} success</strong></div><div><span>Revenue ledger</span><strong>Live query</strong></div></div>
        </article>
      </section>

      <section className="cmd-command-panel">
        <div className="cmd-command-heading"><div><span className="cmd-eyebrow">AI CEO · COMMAND BAR</span><h3>Ra lệnh cho hệ thống</h3></div><a href="/chat">Mở workspace CEO →</a></div>
        <form onSubmit={submit} className="cmd-command-form">
          <span className="cmd-command-icon">✦</span>
          <input value={command} onChange={(e) => { setCommand(e.target.value); setSent(false); }} placeholder="Ví dụ: CEO, báo cáo tình hình và giao Research kiểm tra thị trường…" aria-label="Ra lệnh cho AI CEO" />
          <button type="submit" disabled={!command.trim()} aria-label="Gửi lệnh">Gửi ↗</button>
        </form>
        <div className="cmd-quick-row"><span>Gợi ý nhanh</span>{quick.map((item) => <button key={item} type="button" onClick={() => setCommand(item)}>{item}</button>)}{sent && <em>Đã gửi</em>}</div>
      </section>

      <section className="cmd-footer-grid">
        <a href="/agents" className="cmd-link-card"><span>◈</span><div><small>FLEET CONTROL</small><strong>20 AI Agents</strong><p>Xem chi tiết trạng thái từng AI.</p></div><b>→</b></a>
        <a href="/workflows" className="cmd-link-card"><span>⌁</span><div><small>AUTOMATION</small><strong>Workflows</strong><p>Theo dõi quy trình đang vận hành.</p></div><b>→</b></a>
        <a href="/history" className="cmd-link-card"><span>◷</span><div><small>PAYMENT AUDIT</small><strong>Lịch sử giao dịch</strong><p>Đối soát dòng tiền thực tế.</p></div><b>→</b></a>
      </section>
    </div>
  );
}
