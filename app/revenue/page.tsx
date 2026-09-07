"use client";
import {useState} from "react";
const prompt=`AGENTFLOW — REVENUE AUTOPILOT

Mục tiêu: xây dựng doanh thu hợp pháp, minh bạch và tự động hóa cao cho AgentFlow. Không spam, gian lận, giả mạo số liệu hoặc hứa hẹn lợi nhuận.

VAI TRÒ
Bạn là Revenue Operator. Tìm cơ hội doanh thu phù hợp với sản phẩm, ưu tiên doanh thu định kỳ và chi phí vận hành thấp.

CHIẾN LƯỢC
1. Xác định khách hàng và vấn đề họ sẵn sàng trả tiền để giải quyết.
2. Đề xuất subscription SaaS, usage-based credits và agent/workflow templates.
3. Tối ưu landing page, pricing, FAQ, CTA và onboarding.
4. Thu thập lead hợp pháp; chỉ follow-up khi có sự đồng ý phù hợp.
5. Đo conversion, activation, retention, MRR/ARR, CAC, LTV và AI cost.
6. Mỗi chu kỳ thử một thay đổi có thể đo lường và báo cáo kết quả.
7. Không tự ý chi quảng cáo, hoàn tiền, đổi giá hoặc thực hiện giao dịch tài chính khi chưa được duyệt.

AN TOÀN
- Không tuyên bố lợi nhuận đảm bảo.
- Không giả mạo review, khách hàng hay doanh thu.
- Không lạm dụng dữ liệu cá nhân.
- Thanh toán qua payment provider chính thức; không lưu dữ liệu thẻ.
- Gian lận/chargeback/rủi ro pháp lý => dừng và yêu cầu người sở hữu duyệt.

OUTPUT MỖI CHU KỲ
Top 3 cơ hội doanh thu; việc tự động hóa; việc cần người duyệt; KPI và thay đổi; chi phí AI/infra; thử nghiệm tăng trưởng tiếp theo.

Mục tiêu: xây AgentFlow thành SaaS có doanh thu lặp lại, với kiểm soát của chủ sở hữu cho mọi hành động tài chính quan trọng.`;
export default function RevenuePage(){const[copied,setCopied]=useState(false);async function copy(){await navigator.clipboard.writeText(prompt);setCopied(true);setTimeout(()=>setCopied(false),1800)}return <main className="revenue-main"><header className="revenue-top"><a href="/">← AgentFlow</a><span className="pill">Revenue Center</span></header><section className="revenue-hero"><div className="eyebrow">MONETIZATION CONTROL CENTER</div><h1>Revenue Autopilot</h1><p>Trung tâm vận hành tăng trưởng để biến AgentFlow thành SaaS có doanh thu định kỳ và có thể tự động hóa.</p><div className="revenue-stats"><div><strong>3</strong><span>Mô hình doanh thu</span></div><div><strong>7</strong><span>Growth loops</span></div><div><strong>24/7</strong><span>Automation-ready</span></div></div></section><section className="revenue-grid"><article className="revenue-card"><strong>① Subscription SaaS</strong><p>Free / Pro / Business, giới hạn theo credits hoặc agent.</p></article><article className="revenue-card"><strong>② Usage Credits</strong><p>Bán credits cho model calls, executions và premium tools.</p></article><article className="revenue-card"><strong>③ Agent Templates</strong><p>Marketplace workflow/agent chuyên ngành bán một lần hoặc subscription.</p></article></section><section className="revenue-card prompt-card"><div className="section-title"><div><strong>Tab vận hành — Copy toàn bộ</strong><p>Prompt Revenue Operator để đưa vào Agent Console.</p></div><button className="primary" onClick={copy}>{copied?'✓ Đã copy':'Copy toàn bộ'}</button></div><textarea readOnly value={prompt} onFocus={e=>e.currentTarget.select()}/></section><section className="revenue-card"><div className="section-title"><strong>Production checklist</strong><span>Chưa bật tự động thu tiền</span></div><div className="check-list"><div>○ Payment provider + webhook</div><div>○ Database users / plans / subscriptions</div><div>○ Usage metering + AI cost guardrails</div><div>○ Auth + billing portal</div><div>○ Scheduled growth reports</div><div>○ Human approval cho hành động tài chính nhạy cảm</div></div></section></main>}
