import type { Metadata } from "next";
import Link from "next/link";
import { buildCeoCockpit } from "@/lib/ceo/cockpit";
import { getFactorySnapshot } from "@/lib/ceo/factory";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI CEO Cockpit | AgentFlow",
  description: "Bảng điều phối AI CEO — fleet, KPI verified, Agent Factory, kill switch.",
};

export default async function CeoCockpitPage() {
  let report: Awaited<ReturnType<typeof buildCeoCockpit>> | null = null;
  let error: string | null = null;
  try {
    report = await buildCeoCockpit();
  } catch (e) {
    error = e instanceof Error ? e.message : "Không tải được cockpit";
  }

  const factory = getFactorySnapshot();

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "16px 12px 48px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <p style={{ marginBottom: 12, fontSize: 14 }}>
        <Link href="/">← AgentFlow</Link>
        {" · "}
        <Link href="/website">Website</Link>
        {" · "}
        <Link href="/website/posts">Posts</Link>
        {" · "}
        <Link href="/revenue">Revenue</Link>
      </p>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>AI CEO Cockpit</h1>
      <p style={{ color: "#555", marginBottom: 16, fontSize: 14 }}>
        Điều phối độc lập — không sửa code agent khác. Primary: SalesBot + Marketing.
      </p>

      {error || !report ? (
        <p style={{ color: "#b91c1c" }}>{error || "No data"}</p>
      ) : (
        <>
          <section style={{ background: "#f8fafc", borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <strong style={{ fontSize: 14 }}>{report.summary}</strong>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))", gap: 8 }}>
              <Stat label="Online" value={`${report.metrics.running}/${report.metrics.runtimeEnabled}`} />
              <Stat label="Registry" value={String(report.metrics.registryOnly)} />
              <Stat label="Pending" value={String(report.metrics.pendingActions)} />
              <Stat label="Tier A" value={String(report.metrics.publishedTierA)} />
              <Stat label="Verified ₫" value={report.metrics.verifiedRevenue.toLocaleString("vi-VN")} />
            </div>
          </section>

          <section style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 17, marginBottom: 8 }}>Cảnh báo</h2>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
              {report.alerts.map((a) => (
                <li key={a.code + a.message} style={{ color: a.level === "critical" ? "#b91c1c" : a.level === "warn" ? "#b45309" : "#334155", marginBottom: 4 }}>
                  [{a.level}] {a.message}
                </li>
              ))}
            </ul>
          </section>

          <section style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 17, marginBottom: 8 }}>Fleet</h2>
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 480 }}>
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
                    .concat(report.agents.filter((a) => !a.runtimeEnabled && a.id !== "ceo" && a.status !== "running"))
                    .filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i)
                    .map((a) => (
                      <tr key={a.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: 8 }}>
                          <strong>{a.name}</strong>
                          <div style={{ color: "#64748b", fontSize: 11 }}>{a.role}</div>
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

          <section style={{ marginBottom: 20, border: "1px solid #e2e8f0", borderRadius: 12, padding: 14 }}>
            <h2 style={{ fontSize: 17, marginTop: 0, marginBottom: 8 }}>Agent Factory (Phase 1–2)</h2>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 10 }}>
              Mode: <strong>{factory.mode}</strong>
              {factory.globalPaused ? <span style={{ color: "#b91c1c", marginLeft: 8 }}>· KILL SWITCH ON</span> : null}
              <br />
              {factory.note}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(90px,1fr))", gap: 8, marginBottom: 10 }}>
              <Stat label="Proposed" value={String(factory.counts.manifests)} />
              <Stat label="Opportunities" value={String(factory.counts.opportunities)} />
              <Stat label="Cases" value={String(factory.counts.businessCases)} />
              <Stat label="Sandbox" value={String(factory.counts.sandboxReports)} />
              <Stat label="Audit" value={String(factory.counts.audit)} />
            </div>
            <p style={{ fontSize: 12, color: "#475569", marginBottom: 8, lineHeight: 1.45 }}>
              API: <code>GET/POST /api/ceo/factory</code> — propose_manifest · sandbox_check · record_opportunity · record_business_case.
              <br />
              Kill switch: <code>/api/ceo/kill-switch</code> (factory only; không dừng salesbot/marketing).
              <br />
              Agent mới mặc định <strong>runtimeEnabled=false</strong>.
            </p>
            {factory.manifests.length > 0 ? (
              <ul style={{ fontSize: 13, margin: 0, paddingLeft: 18 }}>
                {factory.manifests.slice(0, 5).map((m) => (
                  <li key={m.id}>
                    <strong>{m.id}</strong> v{m.version} · {m.lifecycle} · runtime={String(m.runtimeEnabled)}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Chưa có manifest đề xuất trong phiên này.</p>
            )}
          </section>

          <section style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 17, marginBottom: 8 }}>Owner brief</h2>
            <pre style={{ whiteSpace: "pre-wrap", background: "#0f172a", color: "#e2e8f0", padding: 14, borderRadius: 12, fontSize: 12, overflowX: "auto" }}>
              {report.ownerBrief}
            </pre>
          </section>

          <section>
            <h2 style={{ fontSize: 17, marginBottom: 8 }}>Isolation</h2>
            <ul style={{ color: "#475569", fontSize: 13, paddingLeft: 18, margin: 0 }}>
              {report.isolationRules.map((r) => (
                <li key={r} style={{ marginBottom: 4 }}>{r}</li>
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
      <div style={{ fontWeight: 700, fontSize: 15 }}>{value}</div>
    </div>
  );
}
