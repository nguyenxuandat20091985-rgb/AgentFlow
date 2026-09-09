import { executeAgent } from "@/lib/agent-engine";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isBlockedHost, OUTREACH_RULES } from "@/lib/website-outreach/policy";

export type QueueActionRow = {
  id: string;
  agent_id: string;
  action_type: string;
  channel: string;
  status: string;
  priority: string;
  source_type?: string | null;
  source_id?: string | null;
  dedupe_key?: string | null;
  payload?: Record<string, unknown> | null;
  created_at?: string | null;
};

export type CeoReviewDecision = {
  id: string;
  decision: "ceo_approved" | "ceo_rejected";
  reason: string;
  title: string;
  destinationId: string | null;
  affiliateLink: string | null;
  priority: string;
};

export type CeoOutreachReviewReport = {
  ok: true;
  reviewer: "AI CEO";
  mode: "review-only-no-publish";
  generatedAt: string;
  scanned: number;
  approved: number;
  rejected: number;
  skipped: number;
  decisions: CeoReviewDecision[];
  ownerReport: string;
  rules: readonly string[];
};

function deterministicReview(row: QueueActionRow): CeoReviewDecision {
  const payload = (row.payload ?? {}) as Record<string, unknown>;
  const title = String(payload.title ?? row.action_type ?? "draft");
  const body = String(payload.body ?? "");
  const affiliateLink = payload.affiliateLink == null ? null : String(payload.affiliateLink);
  const sourceUrl = payload.sourceUrl == null ? null : String(payload.sourceUrl);
  const destinationId = payload.destinationId == null ? null : String(payload.destinationId);
  const execution = String(payload.execution ?? "draft_only");
  const compliance = Array.isArray(payload.complianceNotes)
    ? payload.complianceNotes.map(String)
    : [];

  const reasons: string[] = [];
  let decision: "ceo_approved" | "ceo_rejected" = "ceo_approved";

  if (row.agent_id !== "salesbot" || row.channel !== "website") {
    decision = "ceo_rejected";
    reasons.push("Outside salesbot/website isolation boundary");
  }
  if (execution !== "draft_only" && execution !== "approval_only") {
    decision = "ceo_rejected";
    reasons.push(`Unsafe execution mode: ${execution}`);
  }
  if (sourceUrl && isBlockedHost(sourceUrl)) {
    decision = "ceo_rejected";
    reasons.push(`Blocked host in sourceUrl: ${sourceUrl}`);
  }
  if (affiliateLink && isBlockedHost(affiliateLink)) {
    decision = "ceo_rejected";
    reasons.push("Affiliate link points to blocked host");
  }
  if (!body || body.trim().length < 40) {
    decision = "ceo_rejected";
    reasons.push("Body too short / empty — not useful enough");
  }
  if (destinationId === "public_signal_reply" && !affiliateLink) {
    // still approvable as helpful reply without link
    reasons.push("No affiliate link — approved as pure advice draft only");
  }
  if (!reasons.length) {
    reasons.push("Passes isolation, draft_only, length, and host policy checks");
  }
  if (compliance.some((c) => /spam|impersonat|auto-post/i.test(c))) {
    decision = "ceo_rejected";
    reasons.push("Compliance notes indicate unsafe pattern");
  }

  return {
    id: row.id,
    decision,
    reason: reasons.join("; "),
    title,
    destinationId,
    affiliateLink,
    priority: row.priority || "medium",
  };
}

async function llmOwnerSummary(decisions: CeoReviewDecision[]): Promise<string> {
  const approved = decisions.filter((d) => d.decision === "ceo_approved");
  const rejected = decisions.filter((d) => d.decision === "ceo_rejected");
  const fallback = [
    `Báo cáo AI CEO — duyệt outreach AI Website`,
    `Thời điểm: ${new Date().toISOString()}`,
    `Đã quét: ${decisions.length} draft | Duyệt: ${approved.length} | Từ chối: ${rejected.length}`,
    ``,
    `Đã duyệt (chờ anh đăng tay — hệ thống không tự đăng):`,
    ...approved.slice(0, 10).map((d, i) => `${i + 1}. [${d.priority}] ${d.title} — ${d.reason}`),
    ``,
    rejected.length
      ? `Từ chối:\n${rejected.slice(0, 8).map((d, i) => `${i + 1}. ${d.title} — ${d.reason}`).join("\n")}`
      : `Không có draft bị từ chối.`,
    ``,
    `Lưu ý: Trạng thái ceo_approved ≠ đã đăng. Anh (hoặc connector được phép) mới publish thủ công.`,
  ].join("\n");

  try {
    const result = await executeAgent({
      agent: "AI CEO",
      goal: "Tóm tắt kết quả duyệt draft outreach của AI Website cho chủ hệ thống bằng tiếng Việt, ngắn gọn, rõ ràng. Không tuyên bố đã đăng bài. Nhấn mạnh draft_only và cần đăng tay nếu muốn publish.",
      context: JSON.stringify({
        approvedCount: approved.length,
        rejectedCount: rejected.length,
        approved: approved.slice(0, 12),
        rejected: rejected.slice(0, 8),
        policy: OUTREACH_RULES,
      }),
    });
    if (result.status === "completed" && result.output.trim()) return result.output.trim();
  } catch (error) {
    console.warn("[ceo-outreach-review] LLM summary unavailable", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return fallback;
}

async function loadPendingOutreach(limit = 20): Promise<QueueActionRow[]> {
  const path =
    "agent_action_queue?select=id,agent_id,action_type,channel,status,priority,source_type,source_id,dedupe_key,payload,created_at" +
    "&action_type=eq.website_outreach_post_draft&status=eq.pending&agent_id=eq.salesbot&order=created_at.desc&limit=" +
    String(limit);
  const rows = await supabaseAdmin<QueueActionRow[]>(path);
  return Array.isArray(rows) ? rows : [];
}

async function applyDecision(decision: CeoReviewDecision, original: QueueActionRow) {
  const payload = {
    ...(original.payload ?? {}),
    ceoReview: {
      decision: decision.decision,
      reason: decision.reason,
      reviewedAt: new Date().toISOString(),
      reviewer: "AI CEO",
      publishAllowed: false,
      note: "ceo_approved means ready for owner manual publish only",
    },
  };
  await supabaseAdmin(`agent_action_queue?id=eq.${encodeURIComponent(decision.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      status: decision.decision,
      payload,
    }),
  });
}

/**
 * AI CEO reviews pending website outreach drafts.
 * Updates status to ceo_approved | ceo_rejected.
 * Never publishes externally.
 */
export async function runCeoOutreachReview(options?: { limit?: number; persist?: boolean }): Promise<CeoOutreachReviewReport> {
  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 50);
  const persist = options?.persist !== false;
  const pending = await loadPendingOutreach(limit);
  const decisions: CeoReviewDecision[] = [];
  let skipped = 0;

  for (const row of pending) {
    if (row.action_type !== "website_outreach_post_draft") {
      skipped += 1;
      continue;
    }
    const decision = deterministicReview(row);
    decisions.push(decision);
    if (persist) {
      try {
        await applyDecision(decision, row);
      } catch (error) {
        console.error("[ceo-outreach-review] failed to persist decision", {
          id: row.id,
          error: error instanceof Error ? error.message : String(error),
        });
        skipped += 1;
      }
    }
  }

  const approved = decisions.filter((d) => d.decision === "ceo_approved").length;
  const rejected = decisions.filter((d) => d.decision === "ceo_rejected").length;
  const ownerReport = await llmOwnerSummary(decisions);

  try {
    await supabaseAdmin("agent_task_runs", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        agent_id: "ceo",
        task_type: "outreach_draft_review",
        status: "completed",
        input_snapshot: { scanned: pending.length, limit, persist },
        output: { approved, rejected, skipped, ownerReport, decisions },
      }),
    });
  } catch (error) {
    console.warn("[ceo-outreach-review] task_run persist skipped", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return {
    ok: true,
    reviewer: "AI CEO",
    mode: "review-only-no-publish",
    generatedAt: new Date().toISOString(),
    scanned: pending.length,
    approved,
    rejected,
    skipped,
    decisions,
    ownerReport,
    rules: OUTREACH_RULES,
  };
}
