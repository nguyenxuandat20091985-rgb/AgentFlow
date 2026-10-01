/**
 * One distinct monetization mission per agent.
 * Diversified legal digital income paths — not only Shopee product links.
 * dispatch_ready / active_runtime agents get queue work + cron planning cycles.
 */

export type MissionStatus = "active_runtime" | "dispatch_ready" | "draft_only" | "blocked";

export type EarningMission = {
  agentId: string;
  title: string;
  model:
    | "affiliate_website"
    | "affiliate_social"
    | "seo_content"
    | "lead_magnet"
    | "email_nurture"
    | "market_research"
    | "digital_product_draft"
    | "support_upsell"
    | "analytics_optimize"
    | "listing_ops"
    | "creative_assets"
    | "compliance_gate"
    | "internal_only";
  howEarns: string;
  dailyActions: string[];
  kpi: string;
  status: MissionStatus;
  channel: string;
  feedsAgents?: string[];
};

export const EARNING_MISSIONS: EarningMission[] = [
  {
    agentId: "salesbot",
    title: "Website affiliate storefront",
    model: "affiliate_website",
    howEarns: "Hoa hồng affiliate khi khách mua qua link trên website",
    dailyActions: ["merchandising_draft", "seo_product_page", "tier_a_publish"],
    kpi: "verified_commission_vnd",
    status: "active_runtime",
    channel: "website",
  },
  {
    agentId: "marketing",
    title: "Facebook traffic to storefront",
    model: "affiliate_social",
    howEarns: "Traffic Page → website → hoa hồng verified",
    dailyActions: ["page_content_draft", "buyer_intent_signal", "compliant_cta"],
    kpi: "verified_commission_vnd",
    status: "active_runtime",
    channel: "facebook",
  },
  {
    agentId: "contentwriter",
    title: "SEO / comparison content that ranks",
    model: "seo_content",
    howEarns: "Bài SEO/so sánh → traffic organic → affiliate hoặc lead",
    dailyActions: ["seo_article_draft", "comparison_table", "internal_link_plan"],
    kpi: "organic_sessions_to_offer",
    status: "dispatch_ready",
    channel: "content",
    feedsAgents: ["salesbot"],
  },
  {
    agentId: "research",
    title: "Opportunity scanner (non-product)",
    model: "market_research",
    howEarns: "Phát hiện ngách/từ khóa/offer mới có biên lợi nhuận",
    dailyActions: ["niche_scan", "competitor_gap", "opportunity_brief"],
    kpi: "opportunities_accepted",
    status: "dispatch_ready",
    channel: "research",
    feedsAgents: ["salesbot", "marketing", "contentwriter"],
  },
  {
    agentId: "leadgen",
    title: "Lead magnet + consent capture",
    model: "lead_magnet",
    howEarns: "Lead đồng ý nhận tư vấn/ebook → bán dịch vụ hoặc affiliate",
    dailyActions: ["lead_magnet_draft", "form_copy", "followup_sequence_outline"],
    kpi: "qualified_leads",
    status: "dispatch_ready",
    channel: "leads",
    feedsAgents: ["emailai", "salesbot"],
  },
  {
    agentId: "emailai",
    title: "Email nurture to conversion",
    model: "email_nurture",
    howEarns: "Chuỗi email nuôi dưỡng lead → click affiliate / mua dịch vụ",
    dailyActions: ["drip_draft", "subject_test_plan", "reengagement_draft"],
    kpi: "email_attributed_revenue_vnd",
    status: "dispatch_ready",
    channel: "email",
  },
  {
    agentId: "socialmedia",
    title: "Multi-channel short content",
    model: "affiliate_social",
    howEarns: "Nội dung ngắn kéo về website (TikTok/IG/Threads draft)",
    dailyActions: ["short_post_batch", "hashtag_pack", "cta_variants"],
    kpi: "referral_clicks",
    status: "dispatch_ready",
    channel: "social",
    feedsAgents: ["marketing"],
  },
  {
    agentId: "supportai",
    title: "Support → retention / upsell drafts",
    model: "support_upsell",
    howEarns: "Giữ khách + gợi ý mua thêm (draft, không tự charge)",
    dailyActions: ["faq_draft", "post_purchase_guide", "upsell_script_draft"],
    kpi: "repeat_purchase_assists",
    status: "dispatch_ready",
    channel: "support",
  },
  {
    agentId: "customerservice",
    title: "Ticket handling drafts",
    model: "support_upsell",
    howEarns: "Giảm mất đơn / tăng trust → chuyển đổi gián tiếp",
    dailyActions: ["ticket_reply_draft", "refund_policy_plain", "escalation_note"],
    kpi: "ticket_resolution_quality",
    status: "dispatch_ready",
    channel: "support",
  },
  {
    agentId: "dataanalyzer",
    title: "Conversion analytics",
    model: "analytics_optimize",
    howEarns: "Chỉ ra trang/offer yếu → tối ưu tăng hoa hồng",
    dailyActions: ["funnel_report", "offer_rank", "dropoff_notes"],
    kpi: "optimization_actions_accepted",
    status: "dispatch_ready",
    channel: "analytics",
    feedsAgents: ["salesbot", "marketing"],
  },
  {
    agentId: "analytics",
    title: "KPI board & anomaly",
    model: "analytics_optimize",
    howEarns: "Báo sớm khi campaign chết / link hỏng",
    dailyActions: ["daily_kpi_snapshot", "anomaly_alert_draft"],
    kpi: "alerts_actioned",
    status: "dispatch_ready",
    channel: "analytics",
  },
  {
    agentId: "inventory",
    title: "Offer / catalog hygiene",
    model: "listing_ops",
    howEarns: "Link sống, giá/ảnh đúng → giảm mất hoa hồng",
    dailyActions: ["link_health_check_plan", "stale_offer_flag", "category_balance"],
    kpi: "broken_links_fixed",
    status: "dispatch_ready",
    channel: "inventory",
    feedsAgents: ["salesbot"],
  },
  {
    agentId: "design",
    title: "Creative for offers",
    model: "creative_assets",
    howEarns: "Ảnh/banner/CTA tăng CTR",
    dailyActions: ["banner_brief", "thumbnail_variants", "landing_hero_copy"],
    kpi: "ctr_lift_proxy",
    status: "dispatch_ready",
    channel: "design",
    feedsAgents: ["salesbot", "marketing"],
  },
  {
    agentId: "chatbot",
    title: "On-site assistant → product match",
    model: "lead_magnet",
    howEarns: "Tư vấn trên web → click affiliate",
    dailyActions: ["chat_script_draft", "objection_handling", "product_match_flow"],
    kpi: "assisted_clicks",
    status: "dispatch_ready",
    channel: "chat",
  },
  {
    agentId: "billing",
    title: "Payment event observer",
    model: "compliance_gate",
    howEarns: "Bảo vệ doanh thu verified (chống ghi sai)",
    dailyActions: ["ledger_consistency_notes", "pending_vs_verified_report"],
    kpi: "ledger_integrity",
    status: "dispatch_ready",
    channel: "billing",
  },
  {
    agentId: "finance",
    title: "Net revenue truth",
    model: "compliance_gate",
    howEarns: "Báo net thật, chặn forecast giả",
    dailyActions: ["net_revenue_snapshot", "expense_flag_draft"],
    kpi: "report_accuracy",
    status: "dispatch_ready",
    channel: "finance",
  },
  {
    agentId: "qa",
    title: "Offer & content QA",
    model: "compliance_gate",
    howEarns: "Chặn nội dung sai / link chết trước publish",
    dailyActions: ["prepublish_checklist", "claim_risk_scan"],
    kpi: "blocked_bad_publishes",
    status: "dispatch_ready",
    channel: "qa",
  },
  {
    agentId: "code",
    title: "Automation engineering (no prod deploy)",
    model: "internal_only",
    howEarns: "Gián tiếp: sửa pipeline kiếm tiền",
    dailyActions: ["bug_repro_note", "automation_patch_draft"],
    kpi: "patches_proposed",
    status: "dispatch_ready",
    channel: "code",
  },
  {
    agentId: "crm",
    title: "CRM hygiene for repeat buyers",
    model: "email_nurture",
    howEarns: "Giữ danh sách sạch → email hiệu quả hơn",
    dailyActions: ["segment_draft", "dedupe_plan", "winback_list_outline"],
    kpi: "list_quality_score",
    status: "dispatch_ready",
    channel: "crm",
    feedsAgents: ["emailai"],
  },
  {
    agentId: "hr",
    title: "Internal only",
    model: "internal_only",
    howEarns: "Không kênh doanh thu công khai",
    dailyActions: ["ops_checklist"],
    kpi: "n/a",
    status: "blocked",
    channel: "hr",
  },
];

export function missionsByStatus(status: MissionStatus): EarningMission[] {
  return EARNING_MISSIONS.filter((m) => m.status === status);
}

export function getMission(agentId: string): EarningMission | undefined {
  return EARNING_MISSIONS.find((m) => m.agentId === agentId);
}

export function autoEarningMissions(): EarningMission[] {
  return EARNING_MISSIONS.filter((m) => m.status === "active_runtime" || m.status === "dispatch_ready");
}
