/**
 * One distinct monetization mission per agent.
 * Diversified legal digital income paths — not only Shopee product links.
 * Only runtimeEnabled agents execute production loops.
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
  feedsAgents?: string[];
};

export const EARNING_MISSIONS: EarningMission[] = [
  {
    agentId: "salesbot",
    title: "Website affiliate storefront",
    model: "affiliate_website",
    howEarns: "Hoa hong affiliate khi khach mua qua link tren website",
    dailyActions: ["merchandising_draft", "seo_product_page", "tier_a_publish"],
    kpi: "verified_commission_vnd",
    status: "active_runtime",
  },
  {
    agentId: "marketing",
    title: "Facebook traffic to storefront",
    model: "affiliate_social",
    howEarns: "Traffic Page -> website -> hoa hong verified",
    dailyActions: ["page_content_draft", "buyer_intent_signal", "compliant_cta"],
    kpi: "verified_commission_vnd",
    status: "active_runtime",
  },
  {
    agentId: "contentwriter",
    title: "SEO / comparison content that ranks",
    model: "seo_content",
    howEarns: "Bai SEO/so sanh -> traffic organic -> affiliate hoac lead",
    dailyActions: ["seo_article_draft", "comparison_table", "internal_link_plan"],
    kpi: "organic_sessions_to_offer",
    status: "draft_only",
    feedsAgents: ["salesbot"],
  },
  {
    agentId: "research",
    title: "Opportunity scanner (non-product)",
    model: "market_research",
    howEarns: "Phat hien ngach/tu khoa/offer moi co bien loi nhuan",
    dailyActions: ["niche_scan", "competitor_gap", "opportunity_brief"],
    kpi: "opportunities_accepted",
    status: "draft_only",
    feedsAgents: ["salesbot", "marketing", "contentwriter"],
  },
  {
    agentId: "leadgen",
    title: "Lead magnet + consent capture",
    model: "lead_magnet",
    howEarns: "Lead dong y nhan tu van/ebook -> ban dich vu hoac affiliate",
    dailyActions: ["lead_magnet_draft", "form_copy", "followup_sequence_outline"],
    kpi: "qualified_leads",
    status: "draft_only",
    feedsAgents: ["emailai", "salesbot"],
  },
  {
    agentId: "emailai",
    title: "Email nurture to conversion",
    model: "email_nurture",
    howEarns: "Chuoi email nuoi duong lead -> click affiliate / mua dich vu",
    dailyActions: ["drip_draft", "subject_test_plan", "reengagement_draft"],
    kpi: "email_attributed_revenue_vnd",
    status: "draft_only",
  },
  {
    agentId: "socialmedia",
    title: "Multi-channel short content",
    model: "affiliate_social",
    howEarns: "Noi dung ngan keo ve website",
    dailyActions: ["short_post_batch", "hashtag_pack", "cta_variants"],
    kpi: "referral_clicks",
    status: "draft_only",
    feedsAgents: ["marketing"],
  },
  {
    agentId: "supportai",
    title: "Support -> retention / upsell drafts",
    model: "support_upsell",
    howEarns: "Giu khach + goi y mua them (draft, khong tu charge)",
    dailyActions: ["faq_draft", "post_purchase_guide", "upsell_script_draft"],
    kpi: "repeat_purchase_assists",
    status: "draft_only",
  },
  {
    agentId: "customerservice",
    title: "Ticket handling drafts",
    model: "support_upsell",
    howEarns: "Giam mat don / tang trust -> chuyen doi gian tiep",
    dailyActions: ["ticket_reply_draft", "refund_policy_plain", "escalation_note"],
    kpi: "ticket_resolution_quality",
    status: "draft_only",
  },
  {
    agentId: "dataanalyzer",
    title: "Conversion analytics",
    model: "analytics_optimize",
    howEarns: "Chi ra trang/offer yeu -> toi uu tang hoa hong",
    dailyActions: ["funnel_report", "offer_rank", "dropoff_notes"],
    kpi: "optimization_actions_accepted",
    status: "draft_only",
    feedsAgents: ["salesbot", "marketing"],
  },
  {
    agentId: "analytics",
    title: "KPI board & anomaly",
    model: "analytics_optimize",
    howEarns: "Bao cao som khi campaign chet / link hong",
    dailyActions: ["daily_kpi_snapshot", "anomaly_alert_draft"],
    kpi: "alerts_actioned",
    status: "draft_only",
  },
  {
    agentId: "inventory",
    title: "Offer / catalog hygiene",
    model: "listing_ops",
    howEarns: "Link song, gia/anh dung -> giam mat hoa hong",
    dailyActions: ["link_health_check_plan", "stale_offer_flag", "category_balance"],
    kpi: "broken_links_fixed",
    status: "draft_only",
    feedsAgents: ["salesbot"],
  },
  {
    agentId: "design",
    title: "Creative for offers",
    model: "creative_assets",
    howEarns: "Anh/banner/CTA tang CTR",
    dailyActions: ["banner_brief", "thumbnail_variants", "landing_hero_copy"],
    kpi: "ctr_lift_proxy",
    status: "draft_only",
    feedsAgents: ["salesbot", "marketing"],
  },
  {
    agentId: "chatbot",
    title: "On-site assistant -> product match",
    model: "lead_magnet",
    howEarns: "Tu van tren web -> click affiliate",
    dailyActions: ["chat_script_draft", "objection_handling", "product_match_flow"],
    kpi: "assisted_clicks",
    status: "draft_only",
  },
  {
    agentId: "billing",
    title: "Payment event observer",
    model: "compliance_gate",
    howEarns: "Bao ve doanh thu verified (chong ghi sai)",
    dailyActions: ["ledger_consistency_notes", "pending_vs_verified_report"],
    kpi: "ledger_integrity",
    status: "draft_only",
  },
  {
    agentId: "finance",
    title: "Net revenue truth",
    model: "compliance_gate",
    howEarns: "Bao net that, chan forecast gia",
    dailyActions: ["net_revenue_snapshot", "expense_flag_draft"],
    kpi: "report_accuracy",
    status: "draft_only",
  },
  {
    agentId: "qa",
    title: "Offer & content QA",
    model: "compliance_gate",
    howEarns: "Chan noi dung sai / link chet truoc publish",
    dailyActions: ["prepublish_checklist", "claim_risk_scan"],
    kpi: "blocked_bad_publishes",
    status: "draft_only",
  },
  {
    agentId: "code",
    title: "Automation engineering (no prod deploy)",
    model: "internal_only",
    howEarns: "Gian tiep: sua pipeline kiem tien",
    dailyActions: ["bug_repro_note", "automation_patch_draft"],
    kpi: "patches_proposed",
    status: "draft_only",
  },
  {
    agentId: "hr",
    title: "Internal only",
    model: "internal_only",
    howEarns: "Khong kenh doanh thu cong khai",
    dailyActions: ["ops_checklist"],
    kpi: "n/a",
    status: "blocked",
  },
  {
    agentId: "crm",
    title: "CRM hygiene for repeat buyers",
    model: "email_nurture",
    howEarns: "Giu danh sach sach -> email hieu qua hon",
    dailyActions: ["segment_draft", "dedupe_plan", "winback_list_outline"],
    kpi: "list_quality_score",
    status: "draft_only",
    feedsAgents: ["emailai"],
  },
];

export function missionsByStatus(status: MissionStatus): EarningMission[] {
  return EARNING_MISSIONS.filter((m) => m.status === status);
}

export function getMission(agentId: string): EarningMission | undefined {
  return EARNING_MISSIONS.find((m) => m.agentId === agentId);
}
