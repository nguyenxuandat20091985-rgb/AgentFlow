"use client";

import { FormEvent, useMemo, useState } from "react";

type Assignment = { id: string; agent: string; title: string; status: string };
type ChatMessage = { id: string; role: "ceo" | "owner"; text: string; time: string };

const AGENTS = [
  "SalesBot", "SupportAI", "DataAnalyzer", "ContentWriter", "ChatBot",
  "LeadGen", "EmailAI", "SocialMedia", "Analytics", "CRM", "Billing",
  "Inventory", "Research", "Design", "Code", "QA", "HR", "Finance",
  "Marketing", "CustomerService",
];

const ICONS = ["↗", "◌", "⌁", "✦", "◈", "◎", "✉", "◇", "◒", "▣", "◫", "▤", "⌕", "✎", "⌘", "✓", "♙", "◐", "◆", "◉"];

const QUICK_QUESTIONS = [
  "Báo cáo tình hình hệ thống hiện tại",
  "Có bao nhiêu AI đang chạy?",
  "Doanh thu và giao dịch hôm nay thế nào?",
  "AI CEO đang làm những việc gì?",
];

const now = () => new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

export default function CEOChat() {
  const [task, setTask] = useState("");
  const [selected, setSelected] = useState<string[]>(["LeadGen", "ContentWriter", "Analytics"]);
  const [priority, setPriority] = useState("normal");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [busy, setBusy] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "ceo", text: "AI CEO đã online. Anh có thể hỏi báo cáo hoặc giao một nhiệm vụ cụ thể. Em sẽ hiển thị tiến trình ngay trong màn hình này.", time: now() },
  ]);

  const selectedLabel = useMemo(() => selected.length === 0 ? "Chưa chọn AI" : `${selected.length} AI được chỉ định`, [selected.length]);

  const toggle = (name: string) => setSelected((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);

  const addMessage = (role: ChatMessage["role"], text: string) => {
    setMessages((current) => [...current, { id: `${role}-${Date.now()}`, role, text, time: now() }]);
  };

  async function askCEO(question: string) {
    setTask(question);
    addMessage("owner", question);
    setReportBusy(true);
    try {
      const response = await fetch("/api/ceo/report", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể lấy báo cáo");
      addMessage("ceo", data.summary || "Đã tổng hợp báo cáo từ dữ liệu hiện tại.");
    } catch (error) {
      addMessage("ceo", error instanceof Error ? error.message : "Không thể lấy báo cáo");
    } finally {
      setReportBusy(false);
      setTask("");
    }
  }

  async function dispatch(event: FormEvent) {
    event.preventDefault();
    const cleanTask = task.trim();
    if (!cleanTask || busy) return;
    if (!selected.length) {
      addMessage("ceo", "Anh hãy chọn ít nhất một AI Agent trước khi giao nhiệm vụ.");
      return;
    }
    setBusy(true);
    addMessage("owner", cleanTask);
    addMessage("ceo", `Đang phân tích yêu cầu và chuẩn bị giao việc cho ${selected.length} AI...`);
    try {
      const response = await fetch("/api/ceo/dispatch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ task: cleanTask, agents: selected, priority }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể giao việc");
      setAssignments(data.assignments || []);
      addMessage("ceo", data.message || "Đã giao nhiệm vụ thành công.");
      setTask("");
    } catch (error) {
      addMessage("ceo", error instanceof Error ? error.message : "Không thể giao việc");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="af-ceo-screen" aria-label="AI CEO workspace">
      <div className="af-ceo-chat-column">
        <div className="af-panel af-ceo-chat-panel">
          <header className="af-ceo-intro">
            <div className="af-ceo-avatar" aria-hidden="true">✦</div>
            <div>
              <div className="af-kicker">EXECUTIVE ORCHESTRATOR</div>
              <h2>AI CEO · Trung tâm giao việc</h2>
              <p>Ra lệnh, hỏi báo cáo và theo dõi kết quả trong một luồng chat độc lập.</p>
            </div>
            <span className="af-live-pill"><i /> ONLINE</span>
          </header>

          <div className="af-chat-scroll" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`af-chat-message ${message.role}`}>
                <div className="af-chat-avatar">{message.role === "ceo" ? "✦" : "A"}</div>
                <div className="af-chat-bubble">
                  <div className="af-chat-meta"><strong>{message.role === "ceo" ? "AI CEO" : "Anh"}</strong><span>{message.time}</span></div>
                  <p>{message.text}</p>
                </div>
              </div>
            ))}
            {reportBusy && <div className="af-chat-typing"><span /><span /><span /> AI CEO đang tổng hợp dữ liệu realtime…</div>}
          </div>

          <div className="af-quick-section">
            <div className="af-quick-title"><span>CÂU HỎI NHANH</span><small>Chạm để hỏi CEO</small></div>
            <div className="af-prompt-chips">{QUICK_QUESTIONS.map((question) => <button key={question} type="button" onClick={() => askCEO(question)}>{question}</button>)}</div>
          </div>

          <form onSubmit={dispatch} className="af-ceo-form">
            <textarea aria-label="Nhập yêu cầu cho AI CEO" value={task} onChange={(event) => setTask(event.target.value)} placeholder="Viết yêu cầu giao việc cho AI CEO…" rows={3} />
            <div className="af-form-toolbar">
              <div className="af-toolbar-group"><span>Agent nhận việc</span><strong>{selectedLabel}</strong></div>
              <label>Ưu tiên <select value={priority} onChange={(event) => setPriority(event.target.value)}><option value="low">Thấp</option><option value="normal">Bình thường</option><option value="high">Cao</option><option value="urgent">Khẩn cấp</option></select></label>
              <button className="af-dispatch-btn" type="submit" disabled={busy || !task.trim()}>{busy ? "Đang giao…" : "✈ Giao việc"}</button>
            </div>
          </form>
        </div>

        <section className="af-panel af-assignment-section">
          <div className="af-panel-head"><div><strong>Nhiệm vụ vừa phân công</strong><small>Tiến trình điều phối của AI CEO</small></div><span>LIVE</span></div>
          {assignments.length === 0 ? <div className="af-empty">Chưa có nhiệm vụ mới. Hãy chọn Agent và giao một yêu cầu.</div> : <div className="af-assignment-list">{assignments.map((item) => <div className="af-assignment" key={item.id}><div className="af-assignment-icon">{ICONS[Math.max(0, AGENTS.indexOf(item.agent))]}</div><div><strong>{item.title}</strong><p>{item.agent}</p></div><span className="af-success">{item.status === "assigned" ? "Đã giao" : item.status}</span></div>)}</div>}
        </section>
      </div>

      <aside className="af-panel af-ceo-agent-panel">
        <div className="af-panel-head">
          <div><strong>Đội ngũ nhận việc</strong><small>Chọn AI được phép nhận nhiệm vụ</small></div>
          <span>{selected.length}/20</span>
        </div>
        <div className="af-agent-picker" role="list">
          {AGENTS.map((name, index) => {
            const running = index < 12;
            const picked = selected.includes(name);
            return <button type="button" role="listitem" key={name} className={picked ? "picked" : ""} onClick={() => toggle(name)} aria-pressed={picked}>
              <span className="af-picker-icon">{ICONS[index]}</span>
              <span className="af-picker-copy"><strong>{name}</strong><small className={running ? "is-on" : "is-off"}><i />{running ? "Đang chạy" : "Đã dừng"}</small></span>
              <b aria-hidden="true">{picked ? "✓" : "＋"}</b>
            </button>;
          })}
        </div>
      </aside>
    </section>
  );
}
