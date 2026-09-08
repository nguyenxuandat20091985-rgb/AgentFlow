"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./page.module.css";

type Agent = {
  id: string;
  name: string;
  legacyName: string;
  role: string;
  workstream: string;
  model: string;
  status: "running" | "stopped";
  statusSource: string;
  runtimeEnabled: boolean;
  isolated: boolean;
  protectedFromOtherAgents: boolean;
  currentTask: string;
  lastSeenAt: string | null;
  lastRun: { taskType: string; status: string; createdAt: string } | null;
};

type Registry = {
  agents: Agent[];
  isolation: {
    productionRuntime: string[];
    developmentAgents: string[];
    policy: string;
  };
};

export default function Manage() {
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [installed, setInstalled] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [deferred, setDeferred] = useState<any>(null);
  const [updatedAt, setUpdatedAt] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/agents", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as Registry;
      setRegistry(data);
      setUpdatedAt(new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch {
      // Keep the last known registry on transient network failures.
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30000);
    const onInstalled = () => setInstalled(true);
    const onInstallPrompt = (event: any) => { event.preventDefault(); setDeferred(event); };
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
    };
  }, [load]);

  async function install() {
    if (deferred) {
      deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } else {
      setInstalled(true);
    }
  }

  const agents = registry?.agents ?? [];
  const running = agents.filter((agent) => agent.status === "running");
  const development = agents.filter((agent) => !agent.runtimeEnabled);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a href="/" className={styles.back}>← Dashboard</a>
        <div>
          <div className={styles.eyebrow}>Control Center · realtime</div>
          <h1>AI đang làm việc</h1>
          <p>Theo dõi đúng trạng thái vận hành từ heartbeat, không đoán trạng thái.</p>
        </div>
        <span className={styles.live}>● LIVE</span>
      </header>

      <section className={styles.summary}>
        <div><span>ĐANG VẬN HÀNH</span><strong>{running.length}</strong><small>AI có heartbeat hợp lệ</small></div>
        <div><span>KHU VỰC PHÁT TRIỂN</span><strong>{development.length}</strong><small>Chưa được phép chạy production</small></div>
        <div><span>CHU KỲ CẬP NHẬT</span><strong>30s</strong><small>{updatedAt ? `Cập nhật ${updatedAt}` : "Đang tải..."}</small></div>
      </section>

      <section className={styles.primaryGrid}>
        {running.length ? running.map((agent) => (
          <article className={`${styles.agentCard} ${styles.active}`} key={agent.id}>
            <div className={styles.cardTop}>
              <div className={styles.icon}>{agent.name === "AI Website" ? "W" : "F"}</div>
              <span className={styles.running}><i /> ĐANG LÀM VIỆC</span>
            </div>
            <h2>{agent.name}</h2>
            <p className={styles.role}>{agent.role}</p>
            <div className={styles.task}><span>CÔNG VIỆC HIỆN TẠI</span><strong>{agent.currentTask}</strong></div>
            <div className={styles.meta}><span>Kênh: <b>{agent.workstream}</b></span><span>Runtime: <b>production</b></span></div>
            <div className={styles.protect}>🔒 Được bảo vệ khỏi runtime của các AI khác</div>
          </article>
        )) : (
          <div className={styles.empty}>Chưa có Agent nào có heartbeat hợp lệ.</div>
        )}
      </section>

      <section className={styles.isolation}>
        <div className={styles.sectionHead}>
          <div><div className={styles.eyebrow}>Isolation Guard</div><h2>18 AI còn lại — phát triển riêng</h2></div>
          <span>{development.length} agents · runtime OFF</span>
        </div>
        <p className={styles.policy}>{registry?.isolation.policy ?? "Các AI chưa được kích hoạt không được phép chạy production runtime."}</p>
        <div className={styles.devGrid}>
          {development.map((agent) => (
            <div className={styles.devRow} key={agent.id}>
              <div><strong>{agent.name}</strong><small>{agent.role}</small></div>
              <span>PHÁT TRIỂN RIÊNG</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.installCard}>
        <div><div className={styles.eyebrow}>Mobile workspace</div><h2>AgentFlow trên điện thoại</h2><p>Đưa Trung tâm điều khiển AI lên màn hình chính.</p></div>
        <button onClick={install}>{installed ? "✓ Đã cài ứng dụng" : "Cài AgentFlow"}</button>
      </section>

      <section className={styles.quick}>
        <div><div className={styles.eyebrow}>CEO Console</div><h2>Giao việc cho AI</h2></div>
        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ví dụ: phân tích 10 deal mới và chuẩn bị kế hoạch nội dung..." />
        <a className={!prompt.trim() ? styles.disabled : ""} href={prompt.trim() ? `/?goal=${encodeURIComponent(prompt)}` : "/manage"}>Mở AI Console →</a>
      </section>
    </main>
  );
}
