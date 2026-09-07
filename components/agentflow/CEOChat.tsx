"use client";
import { FormEvent, useState } from "react";

const AGENTS = [
  "SalesBot", "SupportAI", "DataAnalyzer", "ContentWriter", "ChatBot",
  "LeadGen", "EmailAI", "SocialMedia", "Analytics", "CRM", "Billing",
  "Inventory", "Research", "Design", "Code", "QA", "HR", "Finance",
  "Marketing", "CustomerService",
];

const ICONS = ["↗","◌","⌁","✦","◈","◎","✉","◇","◒","▣","◫","▤","⌕","✎","⌘","✓","♙","◐","◆","◉"];

type Assignment = { id: string; agent: string; title: string; status: string };

export default function CEOChat() {
  const [task, setTask] = useState("");
  const [selected, setSelected] = useState<string[]>(["LeadGen", "ContentWriter", "Analytics"]);
  const [priority, setPriority] = useState("normal");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("AI CEO đang sẵn sàng nhận chỉ thị.");
  const toggle = (name: string) => setSelected((current) => current.includes(name) ? current.filter((x) => x !== name) : [...current, name]);

  async function dispatch(event: FormEvent) {
    event.preventDefault();
    if (!task.trim() || busy) return;
    setBusy(true); setMessage("AI CEO đang phân tích yêu cầu và chia nhiệm vụ...");
    try {
      const response = await fetch("/api/ceo/dispatch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ task, agents: selected, priority }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể giao việc");
      setAssignments(data.assignments || []); setMessage(data.message); setTask("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể giao việc"); }
    finally { setBusy(false); }
  }

  return <section className="ceo-workspace">
    <div className="ceo-main panel">
      <div className="ceo-intro">
        <div className="ceo-avatar">✦</div>
        <div><div className="eyebrow">EXECUTIVE ORCHESTRATOR</div><h2>Chat giao việc cho AI CEO</h2><p>Mô tả mục tiêu bằng ngôn ngữ tự nhiên. AI CEO sẽ lập kế hoạch và điều phối đúng Agent.</p></div>
        <span className="live-badge">● ONLINE</span>
      </div>
      <div className="prompt-chips">
        {["Tìm 100 khách hàng tiềm năng", "Tạo chiến dịch marketing", "Phân tích doanh thu tháng này", "Chăm sóc khách hàng mới"].map((item) => <button key={item} onClick={() => setTask(item)}>{item}</button>)}
      </div>
      <form onSubmit={dispatch} className="ceo-form">
        <textarea aria-label="Yêu cầu giao việc" value={task} onChange={(e) => setTask(e.target.value)} placeholder="Ví dụ: Tìm 100 khách hàng tiềm năng bất động sản, gửi email giới thiệu và tổng hợp báo cáo..." />
        <div className="form-toolbar">
          <div className="toolbar-group"><span>Agent nhận việc</span><strong>{selected.length} AI</strong></div>
          <label>Ưu tiên <select value={priority} onChange={(e) => setPriority(e.target.value)}><option value="low">Thấp</option><option value="normal">Bình thường</option><option value="high">Cao</option><option value="urgent">Khẩn cấp</option></select></label>
          <button className="dispatch-btn" type="submit" disabled={busy || !task.trim()}>{busy ? "Đang phân tích..." : "✈ Giao việc"}</button>
        </div>
      </form>
      <div className="ceo-message"><span>AI CEO</span>{message}</div>
      <div className="assignment-section"><div className="panelhead"><strong>Nhiệm vụ vừa phân công</strong><span className="label">Live orchestration</span></div>{assignments.length === 0 ? <div className="empty">Chưa có nhiệm vụ mới. Hãy nhập yêu cầu để AI CEO bắt đầu điều phối.</div> : <div className="assignment-list">{assignments.map((item) => <div className="assignment" key={item.id}><div className="assignment-icon">{ICONS[AGENTS.indexOf(item.agent)]}</div><div><strong>{item.title}</strong><p>{item.agent}</p></div><span className={item.status === "assigned" ? "status running" : "status queued"}>{item.status === "assigned" ? "Đã giao" : "Đang chờ"}</span></div>)}</div>}</div>
    </div>
    <aside className="ceo-side panel">
      <div className="panelhead"><div><strong>Chọn AI Agents</strong><div className="label">Các Agent được phép nhận việc</div></div><span className="label">{selected.length}/20</span></div>
      <div className="agent-picker">{AGENTS.map((name, index) => <button type="button" key={name} className={selected.includes(name) ? "picked" : ""} onClick={() => toggle(name)}><span className="picker-icon">{ICONS[index]}</span><span>{name}<small>● {index < 12 ? "Đang chạy" : "Đã dừng"}</small></span><b>{selected.includes(name) ? "✓" : ""}</b></button>)}</div>
    </aside>
  </section>;
}
