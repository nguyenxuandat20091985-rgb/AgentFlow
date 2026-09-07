"use client";

import { FormEvent, useEffect, useState } from "react";
import styles from "./CommandOverview.module.css";

type Agent = { id: string; name: string; status: string };
type Payment = { status?: string };
type Earning = { payments?: Payment[] };
const NAV = [["/", "⌂", "Tổng quan"], ["/agents", "◈", "AI Agents"], ["/workflows", "⌁", "Workflows"], ["/history", "◷", "Lịch sử"]] as const;

export default function CommandOverview() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [command, setCommand] = useState("");
  useEffect(() => { let alive = true; const load = async () => { try { const [a, e] = await Promise.all([fetch("/api/agents", { cache: "no-store" }), fetch("/api/earning", { cache: "no-store" })]); const ad = a.ok ? await a.json() : []; const ed: Earning = e.ok ? await e.json() : {}; if (alive) { setAgents(Array.isArray(ad) ? ad : []); setPayments(Array.isArray(ed.payments) ? ed.payments : []); setConnected(a.ok && e.ok); setLoading(false); } } catch { if (alive) { setConnected(false); setLoading(false); } } }; load(); const timer = window.setInterval(load, 10000); return () => { alive = false; window.clearInterval(timer); }; }, []);
  const running = agents.filter(a => a.status === "running" || a.status === "ready").length;
  const stopped = agents.length ? agents.length - running : 20 - running;
  const total = agents.length || 20;
  const percent = loading ? 0 : Math.round((running / total) * 100);
  const success = payments.filter(p => String(p.status).toLowerCase() === "success").length;
  const submit = (e: FormEvent) => { e.preventDefault(); const value = command.trim(); if (value) window.location.href = `/chat?prompt=${encodeURIComponent(value)}`; };
  const quick = ["Báo cáo công việc hôm nay", "Kiểm tra hệ thống", "Tổng hợp doanh thu"];
  return <div className={styles.app}>
    <aside className={styles.sidebar}><a href="/" className={styles.brand}><img src="/avatar.svg" alt="" /><span>Agent<span>Flow</span></span></a><div className={styles.sideLabel}>AI OPERATIONS</div><nav>{NAV.map(([href, icon, label]) => <a key={href} className={href === "/" ? styles.active : ""} href={href}><span>{icon}</span>{label}</a>)}</nav><div className={styles.sideStatus}><i /> Control plane <small>Supabase · PayOS · Live</small></div></aside>
    <main className={styles.main}>
      <header className={styles.header}><div><span className={styles.eyebrow}><i /> AI CONTROL CENTER</span><h1>Trung tâm điều hành</h1><p>Quan sát hệ thống theo thời gian thực và điều phối AI CEO từ một điểm duy nhất.</p></div><div className={styles.headerLive}>{connected ? "● SYSTEM LIVE" : "● SYNCING"}</div></header>
      <section className={styles.hero}><div><span className={styles.eyebrow}>COMMAND CENTER · LIVE TELEMETRY</span><h2>AgentFlow đang vận hành.</h2><p>Dữ liệu lấy trực tiếp từ API hệ thống, tự đồng bộ mỗi 10 giây.</p></div><div className={styles.orbit} aria-hidden="true"><div>AF</div></div></section>
      <section className={styles.telemetryGrid} aria-label="Live telemetry">
        <article className={styles.telemetry}><div className={styles.cardTop}><span>AI FLEET</span><b className={styles.good}><i /> LIVE</b></div><div className={styles.agentMetric}><strong>{loading ? "—" : running}</strong><span>/ {total} ONLINE</span></div><div className={styles.progress}><span style={{ width: `${percent}%` }} /></div><div className={styles.miniRow}><span>Running <b>{loading ? "—" : running}</b></span><span>Stopped <b>{loading ? "—" : stopped}</b></span></div></article>
        <article className={styles.telemetry}><div className={styles.cardTop}><span>SYSTEM HEALTH</span><b className={connected ? styles.good : styles.warn}><i /> {connected ? "OPTIMAL" : "CHECK"}</b></div><div className={styles.healthBody}><div className={styles.healthRing} style={{ background: `conic-gradient(#10b981 ${percent}%, #20283a ${percent}% 100%)` }}><div><strong>{loading ? "—" : `${percent}%`}</strong><span>FLEET</span></div></div><div className={styles.healthCopy}><strong>{connected ? "All systems operational" : "Đang kiểm tra kết nối"}</strong><span>Agent Runtime · API · Database</span><small>Polling mỗi 10 giây</small></div></div></article>
        <article className={styles.telemetry}><div className={styles.cardTop}><span>DATA LINK</span><b className={connected ? styles.good : styles.warn}><i /> {connected ? "CONNECTED" : "SYNCING"}</b></div><div className={styles.dataLines}><div><span>Supabase</span><strong>{connected ? "Connected" : "Checking"}</strong></div><div><span>Payment events</span><strong>{loading ? "—" : `${success} success`}</strong></div><div><span>Revenue ledger</span><strong>Live query</strong></div></div></article>
      </section>
      <section className={styles.commandPanel}><div className={styles.commandHeading}><div><span className={styles.eyebrow}>AI CEO · COMMAND BAR</span><h3>Ra lệnh trực tiếp</h3></div><a href="/chat">Mở workspace CEO →</a></div><form onSubmit={submit} className={styles.commandForm}><span>✦</span><input value={command} onChange={e => setCommand(e.target.value)} placeholder="Ví dụ: CEO, báo cáo tình hình và giao Research kiểm tra thị trường…" aria-label="Ra lệnh cho AI CEO" /><button disabled={!command.trim()}>Gửi ↗</button></form><div className={styles.quickRow}><span>Gợi ý</span>{quick.map(q => <button type="button" key={q} onClick={() => setCommand(q)}>{q}</button>)}</div></section>
      <section className={styles.footerGrid}><a href="/agents" className={styles.linkCard}><span>◈</span><div><small>FLEET CONTROL</small><strong>20 AI Agents</strong><p>Trạng thái từng AI.</p></div><b>→</b></a><a href="/workflows" className={styles.linkCard}><span>⌁</span><div><small>AUTOMATION</small><strong>Workflows</strong><p>Quy trình đang vận hành.</p></div><b>→</b></a><a href="/history" className={styles.linkCard}><span>◷</span><div><small>PAYMENT AUDIT</small><strong>Lịch sử giao dịch</strong><p>Dòng tiền thực tế.</p></div><b>→</b></a></section>
    </main>
    <nav className={styles.bottomNav} aria-label="Điều hướng chính">{NAV.map(([href, icon, label]) => <a key={href} className={href === "/" ? styles.active : ""} href={href}><span>{icon}</span><small>{label}</small></a>)}</nav>
  </div>;
}
