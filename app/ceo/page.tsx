import type { Metadata } from "next";
import Link from "next/link";
import { buildCeoCockpit } from "@/lib/ceo/cockpit";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI CEO Cockpit | AgentFlow",
  description: "Bảng điều phối AI CEO — fleet, cảnh báo, KPI verified.",
};

export default async function CeoCockpitPage() {
  let report: Awaited<ReturnType<typeof buildCeoCockpit>> | null = null;
  let error: string | null = null;
  try {
    report = await buildCeoCockpit();
  } catch (e) {
    error = e instanceof Error ? e.message : "Không tải được cockpit";
  }

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px", fontFamily: "system-ui, sans-serif" }}>
      <p style={{ marginBottom: 12 }}>
        <Link href="/">← AgentFlow</Link>
        {" · "}
        <Link href="/website">Website</Link>
        {" · "}
        <Link href="/website/posts">Posts</Link>
      </p>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>AI CEO Cockpit</h1>
      <p style={{ color: "#555", marginBottom: 20 }}>
        Điều phối độc lập — không sửa code agent khác. Primary: SalesBot + Marketing.
      </p>

      {error || !report ? (
        <p style={{ color: "#b91c1c" }}>{error || "No data"}</p>
      ) : (
        <>
          <section style={{ background: "#f8fafc", borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <strong>{report.summary}</strong>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8 }}>
              <Stat label="Online" value={`${report.metrics.running}/${report.metrics.runtimeEnabled}`} />
              <Stat label="Registry" value={String(report.metrics.registryOnly)} />
              <Stat label="Pending" value={String(report.metrics.pendingActions)} />
              <Stat label="Tier A posts" value={String(report.metrics.publishedTierA)} />
              <Stat label="Revenue" value={`${report.metrics.verifiedRevenue.toLocaleString("vi-VN")} ₫`} />
            </div>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18 }}>Cảnh báo</h2>
            <ul>
              {report.alerts.map((a) => (
                <li key={a.code + a.message} style={{ color: a.level === "critical" ? "#b91c1c" : a.level === "warn" ? "#b45309" : "#334155" }}>
                  [{a.level}] {a.message}
                </li>
              ))}
            </ul>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18 }}>Fleet</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: 8 }}>Agent</th>
                    <th>Status</th>
                    <th>Channel</th>
                    <th>Pending</th>
                    <th>KPI</th>
                  </tr>
                </thead>
                <tbody>
                  {report.agents
                    .filter((a) => a.runtimeEnabled || a.id === "ceo" || a.status === "running")
                    .concat(
                      report.agents.filter(
                        (a) => !a.runtimeEnabled && a.id !== "ceo" && a.status !== "running",
                      ),
                    )
                    .filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i)
                    .map((a) => (
                      <tr key={a.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: 8 }}>
                          <strong>{a.name}</strong>
                          <div style={{ color: "#64748b", fontSize: 12 }}>{a.role}</div>
                        </td>
                        <td>{a.status}</td>
                        <td>{a.channel}</td>
                        <td>{a.pendingActions}</td>
                        <td>
                          {a.kpiTarget != null
                            ? `${Math.round(a.kpiProgress)}% (${a.kpiActual.toLocaleString("vi-VN")} ₫)`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18 }}>Owner brief</h2>
            <pre style={{ whiteSpace: "pre-wrap", background: "#0f172a", color: "#e2e8f0", padding: 16, borderRadius: 12, fontSize: 13 }}>
              {report.ownerBrief}
            </pre>
          </section>

          <section>
            <h2 style={{ fontSize: 18 }}>Isolation</h2>
            <ul style={{ color: "#475569", fontSize: 14 }}>
              {report.isolationRules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
      <div style={{ fontSize: 11, color: "#64748b" }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{value}</div>
    </div>
  );
}
