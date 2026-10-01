/**
 * One distinct monetization mission per agent.
 * Static catalog + dynamic missions registered by Factory spawn.
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
  { agentId: "salesbot", title: "Website affiliate storefront", model: "affiliate_website", howEarns: "Hoa hồng affiliate khi khách mua qua link trên website", dailyActions: ["merchandising_draft", "seo_product_page", "tier_a_publish"], kpi: "verified_commission_vnd", status: "active_runtime", channel: "website" },
  { agentId: "marketing", title: "Facebook traffic to storefront", model: "affiliate_social", howEarns: "Traffic Page → website → hoa hồng verified", dailyActions: ["page_content_draft", "buyer_intent_signal", "compliant_cta"], kpi: "verified_commission_vnd", status: "active_runtime", channel: "facebook" },
  { agentId: "contentwriter", title: "SEO / comparison content that ranks", model: "seo_content", howEarns: "Bài SEO/so sánh → traffic organic → affiliate hoặc lead", dailyActions: ["seo_article_draft", "comparison_table", "internal_link_plan"], kpi: "organic_sessions_to_offer", status: "active_runtime", channel: "content", feedsAgents: ["salesbot"] },
  { agentId: "research", title: "Opportunity scanner (non-product)", model: "market_research", howEarns: "Phát hiện ngách/từ khóa/offer mới có biên lợi nhuận", dailyActions: ["niche_scan", "competitor_gap", "opportunity_brief"], kpi: "opportunities_accepted", status: "active_runtime", channel: "research", feedsAgents: ["salesbot", "marketing", "contentwriter"] },
  { agentId: "leadgen", title: "Lead magnet + consent capture", model: "lead_magnet", howEarns: "Lead đồng ý nhận tư vấn/ebook → bán dịch vụ hoặc affiliate", dailyActions: ["lead_magnet_draft", "form_copy", "followup_sequence_outline"], kpi: "qualified_leads", status: "active_runtime", channel: "leads", feedsAgents: ["emailai", "salesbot"] },
  { agentId: "emailai", title: "Email nurture to conversion", model: "email_nurture", howEarns: "Chuỗi email nuôi dưỡng lead → click affiliate / mua dịch vụ", dailyActions: ["drip_draft", "subject_test_plan", "reengagement_draft"], kpi: "email_attributed_revenue_vnd", status: "dispatch_ready", channel: "email" },
  { agentId: "socialmedia", title: "Multi-channel short content", model: "affiliate_social", howEarns: "Nội dung ngắn kéo về website", dailyActions: ["short_post_batch", "hashtag_pack", "cta_variants"], kpi: "referral_clicks", status: "active_runtime", channel: "social", feedsAgents: ["marketing"] },
  { agentId: "supportai", title: "Support → retention / upsell drafts", model: "support_upsell", howEarns: "Giữ khách + gợi ý mua thêm (draft)", dailyActions: ["faq_draft", "post_purchase_guide", "upsell_script_draft"], kpi: "repeat_purchase_assists", status: "dispatch_ready", channel: "support" },
  { agentId: "customerservice", title: "Ticket handling drafts", model: "support_upsell", howEarns: "Giảm mất đơn / tăng trust", dailyActions: ["ticket_reply_draft", "refund_policy_plain", "escalation_note"], kpi: "ticket_resolution_quality", status: "dispatch_ready", channel: "support" },
  { agentId: "dataanalyzer", title: "Conversion analytics", model: "analytics_optimize", howEarns: "Chỉ ra trang/offer yếu → tối ưu hoa hồng", dailyActions: ["funnel_report", "offer_rank", "dropoff_notes"], kpi: "optimization_actions_accepted", status: "dispatch_ready", channel: "analytics", feedsAgents: ["salesbot", "marketing"] },
  { agentId: "analytics", title: "KPI board & anomaly", model: "analytics_optimize", howEarns: "Báo sớm campaign chết / link hỏng", dailyActions: ["daily_kpi_snapshot", "anomaly_alert_draft"], kpi: "alerts_actioned", status: "dispatch_ready", channel: "analytics" },
  { agentId: "inventory", title: "Offer / catalog hygiene", model: "listing_ops", howEarns: "Link sống, giá/ảnh đúng", dailyActions: ["link_health_check_plan", "stale_offer_flag", "category_balance"], kpi: "broken_links_fixed", status: "active_runtime", channel: "inventory", feedsAgents: ["salesbot"] },
  { agentId: "design", title: "Creative for offers", model: "creative_assets", howEarns: "Ảnh/banner/CTA tăng CTR", dailyActions: ["banner_brief", "thumbnail_variants", "landing_hero_copy"], kpi: "ctr_lift_proxy", status: "dispatch_ready", channel: "design", feedsAgents: ["salesbot", "marketing"] },
  { agentId: "chatbot", title: "On-site assistant → product match", model: "lead_magnet", howEarns: "Tư vấn trên web → click affiliate", dailyActions: ["chat_script_draft", "objection_handling", "product_match_flow"], kpi: "assisted_clicks", status: "dispatch_ready", channel: "chat" },
  { agentId: "billing", title: "Payment event observer", model: "compliance_gate", howEarns: "Bảo vệ doanh thu verified", dailyActions: ["ledger_consistency_notes", "pending_vs_verified_report"], kpi: "ledger_integrity", status: "dispatch_ready", channel: "billing" },
  { agentId: "finance", title: "Net revenue truth", model: "compliance_gate", howEarns: "Báo net thật, chặn forecast giả", dailyActions: ["net_revenue_snapshot", "expense_flag_draft"], kpi: "report_accuracy", status: "dispatch_ready", channel: "finance" },
  { agentId: "qa", title: "Offer & content QA", model: "compliance_gate", howEarns: "Chặn nội dung sai / link chết trước publish", dailyActions: ["prepublish_checklist", "claim_risk_scan"], kpi: "blocked_bad_publishes", status: "dispatch_ready", channel: "qa" },
  { agentId: "code", title: "Automation engineering (no prod deploy)", model: "internal_only", howEarns: "Gián tiếp: sửa pipeline kiếm tiền", dailyActions: ["bug_repro_note", "automation_patch_draft"], kpi: "patches_proposed", status: "dispatch_ready", channel: "code" },
  { agentId: "crm", title: "CRM hygiene for repeat buyers", model: "email_nurture", howEarns: "Giữ danh sách sạch → email hiệu quả hơn", dailyActions: ["segment_draft", "dedupe_plan", "winback_list_outline"], kpi: "list_quality_score", status: "dispatch_ready", channel: "crm", feedsAgents: ["emailai"] },
  { agentId: "shopeeops", title: "Shopee affiliate merchandising", model: "affiliate_website", howEarns: "Tối ưu listing/so sánh Shopee affiliate → hoa hồng verified", dailyActions: ["shopee_listing_brief", "price_compare_draft", "promo_calendar"], kpi: "verified_commission_vnd", status: "active_runtime", channel: "shopee" },
  { agentId: "tiktokgrowth", title: "Short-form TikTok → storefront", model: "affiliate_social", howEarns: "Script/video draft kéo traffic về website affiliate", dailyActions: ["hook_script_batch", "caption_cta", "trend_angle"], kpi: "referral_clicks", status: "active_runtime", channel: "tiktok" },
  { agentId: "youtubecontent", title: "Long-form review / how-to", model: "seo_content", howEarns: "Script review sản phẩm → affiliate + SEO long-tail", dailyActions: ["video_script_outline", "description_seo", "chapter_markers"], kpi: "organic_sessions_to_offer", status: "dispatch_ready", channel: "youtube" },
  { agentId: "couponhunter", title: "Deal / coupon aggregation", model: "listing_ops", howEarns: "Tổng hợp deal công khai → trang deals → affiliate", dailyActions: ["deal_scan_plan", "deal_page_draft", "expiry_flags"], kpi: "deal_page_clicks", status: "dispatch_ready", channel: "deals" },
  { agentId: "localseo", title: "Local intent content VN", model: "seo_content", howEarns: "Nội dung nhu cầu địa phương → lead/affiliate", dailyActions: ["local_keyword_map", "city_landing_draft", "nap_checklist"], kpi: "local_landing_sessions", status: "dispatch_ready", channel: "local" },
  { agentId: "newsletter", title: "Weekly value newsletter", model: "email_nurture", howEarns: "Bản tin hữu ích → click affiliate / lead magnet", dailyActions: ["issue_outline", "subject_lines", "product_picks"], kpi: "email_attributed_revenue_vnd", status: "dispatch_ready", channel: "newsletter" },
  { agentId: "partnerships", title: "Collab / co-promo drafts", model: "lead_magnet", howEarns: "Đề xuất collab creator/blog → traffic chia sẻ", dailyActions: ["partner_list_draft", "outreach_email_draft", "collab_brief"], kpi: "partner_pipeline", status: "dispatch_ready", channel: "partners" },
  { agentId: "pricemonitor", title: "Price & margin watch", model: "analytics_optimize", howEarns: "Cảnh báo giá/hoa hồng thay đổi → tránh mất biên", dailyActions: ["price_delta_report", "commission_alert", "swap_recommend"], kpi: "margin_alerts_actioned", status: "dispatch_ready", channel: "pricing" },
  { agentId: "hr", title: "Internal only", model: "internal_only", howEarns: "Không kênh doanh thu công khai", dailyActions: ["ops_checklist"], kpi: "n/a", status: "blocked", channel: "hr" },
];

const dynamicMissions: EarningMission[] = [];

export function registerDynamicMission(mission: EarningMission): void {
  const idx = dynamicMissions.findIndex((m) => m.agentId === mission.agentId);
  if (idx >= 0) dynamicMissions[idx] = mission;
  else dynamicMissions.unshift(mission);
  if (dynamicMissions.length > 100) dynamicMissions.length = 100;
}

export function allMissions(): EarningMission[] {
  const map = new Map<string, EarningMission>();
  for (const m of EARNING_MISSIONS) map.set(m.agentId, m);
  for (const m of dynamicMissions) map.set(m.agentId, m);
  return [...map.values()];
}

export function missionsByStatus(status: MissionStatus): EarningMission[] {
  return allMissions().filter((m) => m.status === status);
}

export function getMission(agentId: string): EarningMission | undefined {
  return allMissions().find((m) => m.agentId === agentId);
}

export function autoEarningMissions(): EarningMission[] {
  return allMissions().filter((m) => m.status === "active_runtime" || m.status === "dispatch_ready");
}

export function listDynamicMissions(): EarningMission[] {
  return [...dynamicMissions];
}
