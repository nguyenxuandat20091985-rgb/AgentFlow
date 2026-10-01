/**
 * Full agent spawn pipeline (execute_limited).
 * Creates earning agents with distinct missions. Never books revenue.
 */
import {
  proposeAgentManifest,
  factoryPropose,
  factoryRunSandbox,
  recordAudit,
  isGlobalPaused,
  FACTORY_MANIFEST_QUOTA,
} from "@/lib/ceo/factory";
import { canTransition, type AgentManifest } from "@/lib/ceo/schemas/agent-manifest";
import { persistManifest } from "@/lib/ceo/persistence/store";
import { registerDynamicMission, type EarningMission } from "@/lib/ceo/earning/missions";
import { enqueueJob } from "@/lib/ceo/jobs/queue";

export type SpawnSpec = {
  id: string;
  name: string;
  domain: string;
  channel: string;
  title: string;
  howEarns: string;
  model: EarningMission["model"];
  dailyActions: string[];
  kpi: string;
  notes?: string;
};

/** Catalog of next-wave earning agents (ids must not collide with reserved static fleet). */
export const SPAWN_CATALOG: SpawnSpec[] = [
  {
    id: "shopeeops",
    name: "Shopee Ops",
    domain: "other",
    channel: "shopee",
    title: "Shopee affiliate merchandising",
    howEarns: "Tối ưu listing/so sánh Shopee affiliate → hoa hồng verified",
    model: "affiliate_website",
    dailyActions: ["shopee_listing_brief", "price_compare_draft", "promo_calendar"],
    kpi: "verified_commission_vnd",
  },
  {
    id: "tiktokgrowth",
    name: "TikTok Growth",
    domain: "content",
    channel: "tiktok",
    title: "Short-form TikTok → storefront",
    howEarns: "Script/video draft kéo traffic về website affiliate",
    model: "affiliate_social",
    dailyActions: ["hook_script_batch", "caption_cta", "trend_angle"],
    kpi: "referral_clicks",
  },
  {
    id: "youtubecontent",
    name: "YouTube Content",
    domain: "content",
    channel: "youtube",
    title: "Long-form review / how-to",
    howEarns: "Script review sản phẩm → affiliate + SEO long-tail",
    model: "seo_content",
    dailyActions: ["video_script_outline", "description_seo", "chapter_markers"],
    kpi: "organic_sessions_to_offer",
  },
  {
    id: "couponhunter",
    name: "Coupon Hunter",
    domain: "other",
    channel: "deals",
    title: "Deal / coupon aggregation",
    howEarns: "Tổng hợp deal công khai → trang deals → affiliate",
    model: "listing_ops",
    dailyActions: ["deal_scan_plan", "deal_page_draft", "expiry_flags"],
    kpi: "deal_page_clicks",
  },
  {
    id: "localseo",
    name: "Local SEO",
    domain: "content",
    channel: "local",
    title: "Local intent content VN",
    howEarns: "Nội dung nhu cầu địa phương → lead/affiliate",
    model: "seo_content",
    dailyActions: ["local_keyword_map", "city_landing_draft", "nap_checklist"],
    kpi: "local_landing_sessions",
  },
  {
    id: "newsletter",
    name: "Newsletter AI",
    domain: "other",
    channel: "newsletter",
    title: "Weekly value newsletter",
    howEarns: "Bản tin hữu ích → click affiliate / lead magnet",
    model: "email_nurture",
    dailyActions: ["issue_outline", "subject_lines", "product_picks"],
    kpi: "email_attributed_revenue_vnd",
  },
  {
    id: "partnerships",
    name: "Partnerships",
    domain: "other",
    channel: "partners",
    title: "Collab / co-promo drafts",
    howEarns: "Đề xuất collab creator/blog → traffic chia sẻ",
    model: "lead_magnet",
    dailyActions: ["partner_list_draft", "outreach_email_draft", "collab_brief"],
    kpi: "partner_pipeline",
  },
  {
    id: "pricemonitor",
    name: "Price Monitor",
    domain: "analytics",
    channel: "pricing",
    title: "Price & margin watch",
    howEarns: "Cảnh báo giá/hoa hồng thay đổi → tránh mất biên",
    model: "analytics_optimize",
    dailyActions: ["price_delta_report", "commission_alert", "swap_recommend"],
    kpi: "margin_alerts_actioned",
  },
];

function missionFromSpec(spec: SpawnSpec): EarningMission {
  return {
    agentId: spec.id,
    title: spec.title,
    model: spec.model,
    howEarns: spec.howEarns,
    dailyActions: spec.dailyActions,
    kpi: spec.kpi,
    status: "dispatch_ready",
    channel: spec.channel,
  };
}

export async function spawnAgent(spec: SpawnSpec): Promise<{
  ok: boolean;
  agentId: string;
  stages: string[];
  errors?: string[];
  manifest?: AgentManifest;
}> {
  const stages: string[] = [];
  if (isGlobalPaused()) {
    return { ok: false, agentId: spec.id, stages, errors: ["global kill switch active"] };
  }

  const proposed = factoryPropose({
    id: spec.id,
    name: spec.name,
    domain: spec.domain,
    channel: spec.channel,
    capabilities: ["draft_earning", "queue_jobs"],
    notes: spec.notes ?? `${spec.title} | ${spec.howEarns}`,
  });
  if (!proposed.ok) {
    // May already exist in memory — try activate path
    stages.push("propose_failed");
    return { ok: false, agentId: spec.id, stages, errors: proposed.errors };
  }
  stages.push("proposed");
  await persistManifest(proposed.manifest);

  const sandbox = factoryRunSandbox(spec.id);
  if (!sandbox.ok) {
    stages.push("sandbox_failed");
    return { ok: false, agentId: spec.id, stages, errors: sandbox.errors };
  }
  stages.push(sandbox.report.passed ? "sandbox_passed" : "sandbox_failed");
  if (!sandbox.report.passed) {
    return { ok: false, agentId: spec.id, stages, errors: ["sandbox checks failed"], manifest: sandbox.manifest };
  }

  const manifest = sandbox.manifest!;
  // Lifecycle: sandbox → validated → approved → enabled (execute_limited)
  for (const next of ["validated", "approved", "enabled"] as const) {
    const t = canTransition(manifest.lifecycle, next, { allowEnable: true });
    if (!t.allowed) {
      stages.push(`transition_blocked_${next}`);
      return { ok: false, agentId: spec.id, stages, errors: [t.reason], manifest };
    }
    manifest.lifecycle = next;
    if (next === "enabled") manifest.runtimeEnabled = true;
    manifest.updatedAt = new Date().toISOString();
  }
  stages.push("enabled");

  // Re-validate with runtime allowed
  const { validateAgentManifest } = await import("@/lib/ceo/schemas/agent-manifest");
  const validated = validateAgentManifest(manifest, { allowRuntimeEnabled: true });
  if (!validated.ok) {
    stages.push("validate_enabled_failed");
    return { ok: false, agentId: spec.id, stages, errors: validated.errors, manifest };
  }

  await persistManifest(validated.value);
  registerDynamicMission(missionFromSpec(spec));
  stages.push("mission_registered");

  const day = new Date().toISOString().slice(0, 10);
  await enqueueJob({
    agentId: spec.id,
    actionType: `${spec.id}_${spec.dailyActions[0] ?? "daily"}`,
    channel: spec.channel,
    uniqueKey: `${day}:spawn`,
    priority: "medium",
    payload: {
      mission: spec.title,
      howEarns: spec.howEarns,
      source: "factory_spawn",
      execution: "auto_draft",
      neverBookRevenue: true,
    },
  });
  stages.push("job_enqueued");

  recordAudit({
    actor: "factory",
    actorId: "factory",
    action: "manifest_proposed",
    targetType: "agent_manifest",
    targetId: spec.id,
    result: "ok",
    detail: { stages, lifecycle: "enabled", runtimeEnabled: true, note: "spawn pipeline complete" },
  });

  return { ok: true, agentId: spec.id, stages, manifest: validated.value };
}

export async function spawnCatalogBatch(limit = 8): Promise<{
  ok: true;
  results: Array<{ agentId: string; ok: boolean; stages: string[]; errors?: string[] }>;
}> {
  const results: Array<{ agentId: string; ok: boolean; stages: string[]; errors?: string[] }> = [];
  for (const spec of SPAWN_CATALOG.slice(0, limit)) {
    const r = await spawnAgent(spec);
    results.push({ agentId: r.agentId, ok: r.ok, stages: r.stages, errors: r.errors });
  }
  return { ok: true, results };
}

// silence unused import if tree-shaken oddly
void proposeAgentManifest;
void FACTORY_MANIFEST_QUOTA;
