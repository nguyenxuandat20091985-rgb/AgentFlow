"use client";

import { FormEvent, useState } from "react";

type DiagnosticResult = {
  ok?: boolean;
  agentId?: string;
  facebook?: {
    configured?: boolean;
    valid?: boolean;
    pageId?: string;
    pageName?: string | null;
    reason?: string;
  };
  error?: string;
};

export default function FacebookDiagnosticPage() {
  const [secret, setSecret] = useState("");
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function runDiagnostic(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setMessage("");

    try {
      const response = await fetch("/api/facebook/diagnostic", {
        method: "GET",
        cache: "no-store",
        headers: {
          // Canonical diagnostic auth header. The API also accepts the legacy
          // x-agent-heartbeat-secret header for existing automation.
          Authorization: `Bearer ${secret.trim()}`,
        },
      });
      const data = (await response.json()) as DiagnosticResult;
      setResult(data);
      if (!response.ok) {
        setMessage(data.error || `Kiểm tra thất bại (${response.status})`);
      }
    } catch {
      setMessage("Không thể kết nối tới endpoint diagnostic.");
    } finally {
      setLoading(false);
    }
  }

  const valid = result?.facebook?.valid === true;
  const invalid = result?.facebook?.valid === false;

  return (
    <main style={{ minHeight: "100vh", background: "#070b17", color: "#f8fafc", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <section style={{ maxWidth: 620, margin: "0 auto", paddingTop: 32 }}>
        <div style={{ border: "1px solid #26324a", borderRadius: 20, padding: 24, background: "#0d1324", boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
          <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", opacity: .65 }}>AgentFlow · AI Facebook</div>
          <h1 style={{ fontSize: 30, margin: "8px 0 8px" }}>Kiểm tra Facebook token</h1>
          <p style={{ color: "#aab6ca", lineHeight: 1.6, marginTop: 0 }}>
            Nhập <code>AGENT_HEARTBEAT_SECRET</code>. Trình duyệt gửi secret qua <code>Authorization: Bearer</code>; secret không nằm trong URL và không được hiển thị lại.
          </p>

          <form onSubmit={runDiagnostic}>
            <label htmlFor="secret" style={{ display: "block", fontSize: 14, marginBottom: 8 }}>Heartbeat secret</label>
            <input
              id="secret"
              type="password"
              autoComplete="off"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Nhập secret của Production"
              required
              style={{ width: "100%", boxSizing: "border-box", padding: "14px 16px", borderRadius: 12, border: "1px solid #34415e", background: "#080d1a", color: "#fff", outline: "none", fontSize: 16 }}
            />
            <button
              type="submit"
              disabled={loading || !secret.trim()}
              style={{ marginTop: 14, width: "100%", padding: "14px 18px", borderRadius: 12, border: 0, background: loading ? "#334155" : "#2563eb", color: "white", fontWeight: 700, fontSize: 16, cursor: loading ? "wait" : "pointer" }}
            >
              {loading ? "Đang kiểm tra…" : "Kiểm tra ngay"}
            </button>
          </form>

          {message && <div style={{ marginTop: 18, padding: 14, borderRadius: 12, background: "#2a1520", color: "#fecdd3" }}>{message}</div>}

          {result && (
            <div style={{ marginTop: 20, padding: 18, borderRadius: 14, background: valid ? "#10251d" : invalid ? "#2a1820" : "#182236", border: `1px solid ${valid ? "#1f6b4b" : invalid ? "#713047" : "#33415e"}` }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>
                {valid ? "✅ Facebook token VALID" : invalid ? "❌ Facebook token INVALID" : "⚠️ Chưa xác định"}
              </div>
              <div style={{ marginTop: 12, color: "#cbd5e1", lineHeight: 1.8 }}>
                <div>Configured: <strong>{String(result.facebook?.configured ?? false)}</strong></div>
                <div>Valid: <strong>{String(result.facebook?.valid ?? false)}</strong></div>
                {result.facebook?.pageName && <div>Page: <strong>{result.facebook.pageName}</strong></div>}
                {result.facebook?.pageId && <div>Page ID: <strong>{result.facebook.pageId}</strong></div>}
                {result.facebook?.reason && <div>Reason: <strong>{result.facebook.reason}</strong></div>}
              </div>
              <p style={{ marginBottom: 0, color: "#94a3b8", fontSize: 13 }}>
                Chỉ trạng thái và thông tin nhận diện trang được hiển thị; access token không bao giờ được trả về giao diện.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
