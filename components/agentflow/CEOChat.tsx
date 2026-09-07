"use client";

import { FormEvent, useState } from "react";

const AGENTS = [
  "SalesBot", "SupportAI", "DataAnalyzer", "ContentWriter", "ChatBot",
  "LeadGen", "EmailAI", "SocialMedia", "Analytics", "CRM", "Billing",
  "Inventory", "Research", "Design", "Code", "QA", "HR", "Finance",
  "Marketing", "CustomerService",
];

const ICONS = ["↗", "◌", "⌁", "✦", "◈", "◎", "✉", "◇", "◒", "▣", "◫", "▤", "⌕", "✎", "⌘", "✓", "♙", "◐", "◆", "◉"];
type Assignment = { id: string; agent: string; title: string; status: string };

const QUICK_QUESTIONS = [
  "Báo cáo tình hình hệ thống hiện tại",
  "Có bao nhiêu AI đang chạy?",
  "Doanh thu và giao dịch hôm nay thế nào?",
  "AI CEO đang làm những việc gì?",
];

export default function CEOChat() {
  const [task, setTask] = useState("");
  const [selected, setSelected] = useState<string[]>(["LeadGen", "ContentWriter", "Analytics"]);
  const [priority, setPriority] = useState("normal");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [busy, setBusy] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [message, setMessage] = useState("AI CEO đang sẵn sàng nhận chỉ thị.");

  const toggle = (name: string) => setSelected((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);

  async function askCEO(question: string) {
    setTask(question);
    if (question.toLowerCase().includes("báo cáo") || question.toLowerCase().includes("doanh thu") || question.toLowerCase().includes("bao nhiêu ai")) {
      setReportBusy(true);
      try {
        const response = await fetch("/api/ceo/report", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Không thể lấy báo cáo");
        setMessage(data.summary);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Không thể lấy báo cáo");
      } finally {
        setReportBusy(false);
      }
    }
  }

  async function dispatch(event: FormEvent) {
    event.preventDefault();
    if (!task.trim() || busy) return;
    setBusy(true);
    setMessage("AI CEO đang phân tích yêu cầu và chia nhiệm vụ...");
    try {
      const response = await fetch("/api/ceo/dispatch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ task, agents: selected, priority }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể giao việc");
      setAssignments(data.assignments || []);
      setMessage(data.message);
      setTask("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể giao việc");
    } finally {
      setBusy(false);
    }
  }

  return <section className="af-ceo-workspace">
    <div className="af-panel af-ceo-main">
      <div className="af-ceo-intro">
        <div className="af-ceo-avatar">✦</div>
        <div><div className="af-kicker">EXECUTIVE ORCHESTRATOR</div><h2>AI CEO · Trung tâm giao việc</h2><p>Anh ra lệnh một lần. AI CEO lập kế hoạch, phân công Agent và trả báo cáo ngay trong cuộc trò chuyện.</p></div>
        <span className="af-live-pill"><i /> ONLINE</span>
      </div>

      <div className="af-quick-title"><span>CÂU HỎI NHANH</span><small>Chạm để hỏi AI CEO</small></div>
      <div className="af-prompt-chips">{QUICK_QUESTIONS.map((question) => <button key={question} type="button" onClick={() => askCEO(question)}>{question}</button>)}</div>

      <form onSubmit={dispatch} className="af-ceo-form">
        <textarea aria-label="Yêu cầu giao việc cho AI CEO" value={task} onChange={(event) => setTask(event.target.value)} placeholder="Ví dụ: Tìm 100 khách hàng tiềm năng, giao LeadGen tìm kiếm, ContentWriter soạn nội dung và Analytics lập báo cáo..." />
        <div className="af-form-toolbar">
          <div className="af-toolbar-group"><span>Agent nhận việc</span><strong>{selected.length} AI</strong></div>
          <label>Ưu tiên <select value={priority} onChange={(event) => setPriority(event.target.value)}><option value="low">Thấp</option><option value="normal">Bình thường</option><option value="high">Cao</option><option value="urgent">Khẩn cấp</option></select></label>
          <button className="af-dispatch-btn" type="submit" disabled={busy || !task.trim()}>{busy ? "Đang phân tích…" : "✈ Giao việc cho CEO"}</button>
        </div>
      </form>

      <div className="af-ceo-message"><span>AI CEO</span>{reportBusy ? "Đang tổng hợp dữ liệu realtime…" : message}</div>
      <div className="af-assignment-section"><div className="af-panel-head"><strong>Nhiệm vụ vừa phân công</strong><span>Live orchestration</span></div>{assignments.length === 0 ? <div className="af-empty">Chưa có nhiệm vụ mới. Hãy ra lệnh hoặc dùng một câu hỏi nhanh.</div> : <div className="af-assignment-list">{assignments.map((item) => <div className="af-assignment" key={item.id}><div className="af-assignment-icon">{ICONS[AGENTS.indexOf(item.agent)]}</div><div><strong>{item.title}</strong><p>{item.agent}</p></div><span className={item.status === "assigned" ? "af-success" : "af-queued"}>{item.status === "assigned" ? "Đã giao" : "Đang chờ"}</span></div>)}</div>}</div>
    </div>

    <aside className="af-panel af-ceo-side">
      <div className="af-panel-head"><div><strong>Chỉ định Agent</strong><small>Chọn các AI được phép nhận nhiệm vụ</small></div><span>{selected.length}/20</span></div>
      <div className="af-agent-picker">{AGENTS.map((name, index) => <button type="button" key={name} className={selected.includes(name) ? "picked" : ""} onClick={() => toggle(name)}><span className="af-picker-icon">{ICONS[index]}</span><span>{name}<small className={index < 12 ? "is-on" : "is-off"}>● {index < 12 ? "Đang chạy" : "Đã dừng"}</small></span><b>{selected.includes(name) ? "✓" : ""}</b></button>)}</div>
    </aside>
  </section>;
}
