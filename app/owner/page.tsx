import type { Metadata } from "next";
import Link from "next/link";
import { buildCeoCockpit } from "@/lib/ceo/cockpit";
import { getFactorySnapshot } from "@/lib/ceo/factory";
import { listBusinessUnits } from "@/lib/ceo/business-units/registry";
import { getPersistenceMode } from "@/lib/ceo/persistence/store";
import { ownerAuthConfigured } from "@/lib/ceo/security/owner-auth";
import { listPendingJobs } from "@/lib/ceo/jobs/queue";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Owner Dashboard | AgentFlow",
  description: "Mobile-first owner control: fleet, factory, opportunities, revenue, kill switch.",
};

export default async function OwnerDashboardPage() {
  let report: Awaited<ReturnType<typeof buildCeoCockpit>> | null = null;
  let error: string | null = null;
  try {
    report = await buildCeoCockpit();
  } catch (e) {
    error = e instanceof Error ? e.message : "Cockpit unavailable";
  }
  const factory = getFactorySnapshot();
  const units = listBusinessUnits();
  const jobs = await listPendingJobs(20);
  const persistence = getPersistenceMode();
  const authOk = ownerAuthConfigured();

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "12px 12px 64px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <nav style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12, fontSize: 13 }}>
        <Link href="/">Home</Link>
        <Link href="/ceo">CEO</Link>
        <Link href="/website">Website</Link>
        <Link href="/revenue">Revenue</Link>
        <Link href="/owner">Owner</Link>
      </nav>
      <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Owner Dashboard</h1>
      <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>
        Mobile-first · persistence={persistence} · auth={authOk ? "configured" : "missing secret"}
      </p>

      {error ? (
        <section style={card}>
          <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p>
          <p style={{ fontSize: 12, color: "#64748b" }}>Database may be offline. Factory still propose-only in memory when configured.</p>
        </section>
      ) : null}

      {report ? (
        <section style={card}>
          <h2 style={h2}>1. Overview</h2>
          <div style={grid}>
            <Tile label="Online" value={`${report.metrics.running}/${report.metrics.runtimeEnabled}`} />
            <Tile label="Pending" value={String(report.metrics.pendingActions)} />
            <Tile label="Verified ₫" value={report.metrics.verifiedRevenue.toLocaleString("vi-VN")} />
            <Tile label="Tier A" value={String(report.metrics.publishedTierA)} />
          </div>
          <p style={{ fontSize: 13, marginTop: 8 }}>{report.summary}</p>
        </section>
      ) : null}

      <section style={card}>
        <h2 style={h2}>2. AI Fleet</h2>
        {report ? (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {report.agents.filter((a) => a.runtimeEnabled || a.id === "ceo").map((a) => (
              <li key={a.id} style={{ marginBottom: 4 }}>
                <strong>{a.name}</strong> · {a.status} · {a.channel}
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="Fleet data unavailable" />
        )}
      </section>

      <section style={card}>
        <h2 style={h2}>3. Agent Factory</h2>
        <p style={{ fontSize: 12, color: "#64748b" }}>Mode {factory.mode}{factory.globalPaused ? " · KILL SWITCH ON" : ""}</p>
        <div style={grid}>
          <Tile label="Proposed" value={String(factory.counts.manifests)} />
          <Tile label="Sandbox" value={String(factory.counts.sandboxReports)} />
          <Tile label="Audit" value={String(factory.counts.audit)} />
        </div>
        <p style={{ fontSize: 12, marginTop: 8 }}>API: /api/ceo/factory (mutating requires Bearer secret)</p>
      </section>

      <section style={card}>
        <h2 style={h2}>4. Opportunities</h2>
        {factory.opportunities.length === 0 ? (
          <Empty text="No opportunities recorded this session" />
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {factory.opportunities.slice(0, 5).map((o) => (
              <li key={o.id}>{o.title} · {o.status} · forecast only</li>
            ))}
          </ul>
        )}
      </section>

      <section style={card}>
        <h2 style={h2}>5. Business Units</h2>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
          {units.map((u) => (
            <li key={u.id} style={{ marginBottom: 4 }}>
              <strong>{u.name}</strong> · {u.status} · budget/day {u.dailyBudgetCeilingVnd.toLocaleString("vi-VN")}₫
            </li>
          ))}
        </ul>
      </section>

      <section style={card}>
        <h2 style={h2}>6–7. Revenue / Expenses</h2>
        <p style={{ fontSize: 13, margin: 0 }}>
          Verified revenue from ledger only. Pending/forecast excluded.{" "}
          <Link href="/revenue">Open revenue →</Link>
        </p>
        {report ? (
          <p style={{ fontSize: 18, fontWeight: 700, margin: "8px 0 0" }}>
            {report.metrics.verifiedRevenue.toLocaleString("vi-VN")} ₫ verified
          </p>
        ) : null}
      </section>

      <section style={card}>
        <h2 style={h2}>8. Jobs queue</h2>
        <p style={{ fontSize: 12, color: "#64748b" }}>mode={jobs.mode}</p>
        {jobs.jobs.length === 0 ? <Empty text="No pending CEO jobs" /> : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {jobs.jobs.slice(0, 8).map((j) => (
              <li key={j.dedupeKey}>{j.agentId} · {j.actionType} · {j.status}</li>
            ))}
          </ul>
        )}
      </section>

      <section style={card}>
        <h2 style={h2}>9. Alerts</h2>
        {report && report.alerts.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {report.alerts.map((a) => (
              <li key={a.code + a.message} style={{ color: a.level === "critical" ? "#b91c1c" : "#334155" }}>
                [{a.level}] {a.message}
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="No alerts" />
        )}
      </section>

      <section style={card}>
        <h2 style={h2}>10–11. Settings / Kill switch</h2>
        <p style={{ fontSize: 13, margin: 0 }}>
          Factory kill switch: <code>POST /api/ceo/kill-switch</code> with Bearer secret.
          Does not stop SalesBot/Marketing. Production agent pause = fleet.ts PR.
        </p>
        <p style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>Secrets only via env. Never shown in UI.</p>
      </section>
    </main>
  );
}

const card: Record<string, string | number> = {
  background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, marginBottom: 12,
};
const h2: Record<string, string | number> = { fontSize: 15, margin: "0 0 8px" };
const grid: Record<string, string | number> = {
  display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(90px,1fr))", gap: 8,
};

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#f8fafc", borderRadius: 8, padding: 10 }}>
      <div style={{ fontSize: 11, color: "#64748b" }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{value}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>{text}</p>;
}
