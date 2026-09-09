# AgentFlow Architecture — AI CEO + 20 Independent Execution AIs

**Đọc file này trước khi sửa bất kỳ AI nào.**  
Mục tiêu: nâng cấp / sửa một AI **không** làm sập, ghi đè, hoặc làm nhiễu các AI còn lại.

---

## 1. Mô hình tổng thể

```text
                    ┌─────────────────────┐
                    │      AI CEO         │
                    │  Điều phối + duyệt  │
                    │  + báo cáo owner    │
                    └──────────┬──────────┘
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
    │ AI Website   │   │ AI Facebook  │   │ 18 AI khác   │
    │ (salesbot)   │   │ (marketing)  │   │ registry-only│
    │ LIVE         │   │ LIVE         │   │ chưa bật     │
    └──────────────┘   └──────────────┘   └──────────────┘
```

- **AI CEO**: não điều phối, policy gate, báo cáo. **Không** làm việc channel (không đăng web/FB, không tạo payment).
- **20 AI thực thi**: mỗi AI một domain, một channel, một queue, một nhánh code.

---

## 2. Danh sách AI độc lập dưới AI CEO

| # | ID | Tên | Domain | Channel | runtimeEnabled | Trạng thái |
|---|-----|-----|--------|---------|----------------|------------|
| 0 | `ceo` | AI CEO | orchestration | ceo | false* | Cockpit + review + dispatch |
| 1 | `salesbot` | AI Website | website | website | **true** | LIVE |
| 2 | `marketing` | AI Facebook | facebook | facebook | **true** | LIVE (heartbeat; publish qua connector) |
| 3 | `supportai` | SupportAI | support | support | false | Registry |
| 4 | `dataanalyzer` | DataAnalyzer | analytics | analytics | false | Registry |
| 5 | `contentwriter` | ContentWriter | content | content | false | Registry |
| 6 | `chatbot` | ChatBot | support | chat | false | Registry |
| 7 | `leadgen` | LeadGen | other | leads | false | Registry |
| 8 | `emailai` | EmailAI | other | email | false | Registry |
| 9 | `socialmedia` | SocialMedia | other | social | false | Registry |
| 10 | `analytics` | Analytics | analytics | analytics | false | Registry |
| 11 | `crm` | CRM | database | crm | false | Registry |
| 12 | `billing` | Billing | payment | billing | false | Registry |
| 13 | `inventory` | Inventory | database | inventory | false | Registry |
| 14 | `research` | Research | other | research | false | Registry |
| 15 | `design` | Design | other | design | false | Registry |
| 16 | `code` | Code | other | code | false | Registry |
| 17 | `qa` | QA | other | qa | false | Registry |
| 18 | `hr` | HR | other | hr | false | Registry |
| 19 | `finance` | Finance | payment | finance | false | Registry |
| 20 | `customerservice` | CustomerService | support | support | false | Registry |

\* CEO không chạy trong vòng `PRIMARY_RUNTIME_TASKS` kiểu salesbot; CEO chạy qua API `/api/ceo/*` và bước review trong workflow.

**Nguồn sự thật registry:** `lib/ceo/fleet.ts`  
**Runtime primary:** `lib/agent-runtime.ts` → chỉ `salesbot` + `marketing`.

---

## 3. Luật cô lập (BẮT BUỘC)

### 3.1 Feature branch theo agent

```text
agent/salesbot-*     → chỉ AI Website
agent/marketing-*    → chỉ AI Facebook
agent/ceo-*          → chỉ AI CEO
agent/<agent-id>-*   → chỉ agent đó
```

### 3.2 Path ownership (không đụng path của AI khác)

| Agent | Được sửa |
|-------|----------|
| AI Website | `lib/website-*`, `lib/publishers/owned-cms.ts`, `app/api/website/*`, `app/website/*` |
| AI Facebook | `lib/facebook*`, `app/api/facebook/*` (khi có) |
| AI CEO | `lib/ceo/*`, `app/api/ceo/*`, `app/ceo/*`, `docs/ceo-*` |
| Shared cẩn thận | `lib/agent-runtime.ts`, `.github/workflows/agent-heartbeat.yml`, `lib/supabase-admin.ts` |

**Cấm:** PR AI Facebook sửa `lib/website-*` hoặc `app/api/website/*`.  
**Cấm:** PR AI Website sửa `lib/ceo/*` trừ khi task là tích hợp review (và review path CEO).

### 3.3 Queue / channel isolation

```text
agent_action_queue.agent_id + channel phải khớp domain
salesbot  → channel = website
marketing → channel = facebook
ceo       → chỉ review / report, không cướp queue execution
```

`dedupe_key` luôn prefix `agentId:` để không đè chéo.

### 3.4 Runtime allow-list

- Chỉ agent `runtimeEnabled: true` được gọi trong automation loop.
- Bật AI mới = đổi flag trong `lib/ceo/fleet.ts` **sau** khi branch + CI + validate xong.
- **Không** bật hàng loạt 18 agent.

### 3.5 Safe Fallback

- Step workflow của agent phụ: có thể `continue-on-error` — **không** được làm fail heartbeat salesbot.
- CEO API 503 → Website vẫn hunt/runtime độc lập.
- Publish chỉ hợp lệ khi có `published_url` + `provider_response_id`.
- Doanh thu chỉ đọc `revenue_ledger` — **cấm** agent tự ghi doanh thu ảo.

### 3.6 Secrets

- `AGENT_HEARTBEAT_SECRET` dùng chung auth heartbeat — đổi phải đồng bộ **GitHub Actions + Vercel**.
- Không nhét secret agent B vào code agent A.

---

## 4. Quy trình thêm / nâng cấp một AI (để không phá dự án)

```text
1. Tạo branch: agent/<id>-<feature>
2. Chỉ sửa path của agent đó (+ test)
3. PR → CI → review isolation (checklist dưới)
4. Merge
5. (Optional) thêm step workflow riêng, không phá step salesbot
6. Flip runtimeEnabled + dispatchEnabled trong lib/ceo/fleet.ts (PR riêng nếu cần)
7. Quan sát /ceo và heartbeat 1–2 chu kỳ
```

### Checklist PR (reviewer / AI sau này)

- [ ] Branch đúng `agent/<id>-*`
- [ ] Không sửa path agent khác
- [ ] Không đổi `AGENT_HEARTBEAT_SECRET` trừ khi có kế hoạch sync
- [ ] Không ghi `revenue_ledger` / payment giả
- [ ] Queue `agent_id` + `channel` đúng domain
- [ ] Không auto-post nền tảng cấm (FB group, Zalo spam, v.v.)
- [ ] Nếu sửa `agent-runtime.ts`: chỉ thêm `if (agentId === "...")`, không đổi logic salesbot hiện có
- [ ] Nếu sửa workflow: step mới **sau** heartbeat; lỗi step mới không chặn salesbot

---

## 5. Liên kết điều khiển (production)

| Màn hình | URL |
|----------|-----|
| Trung tâm điều hành | https://agentflow-khaki-rho.vercel.app/ |
| **AI CEO Cockpit** | https://agentflow-khaki-rho.vercel.app/ceo |
| CEO Cockpit API | https://agentflow-khaki-rho.vercel.app/api/ceo/cockpit |
| CEO Report | https://agentflow-khaki-rho.vercel.app/api/ceo/report |
| AI Website storefront | https://agentflow-khaki-rho.vercel.app/website |
| Bài Tier A đã publish | https://agentflow-khaki-rho.vercel.app/website/posts |
| Fleet agents | https://agentflow-khaki-rho.vercel.app/agents |

---

## 6. Trách nhiệm AI CEO (hiện tại)

1. Cockpit fleet + alerts + KPI verified  
2. Duyệt outreach Website → auto-publish **Tier A only**  
3. Dispatch task **chỉ** tới agent allow-list  
4. Owner report — anh chỉ xem báo cáo  
5. **Không** sửa source code agent khác  

---

## 7. Thứ tự kích hoạt khuyến nghị

1. ~~AI Website (salesbot)~~ — DONE  
2. ~~AI CEO Cockpit~~ — DONE  
3. AI Facebook (marketing) — harden publish connector  
4. AI Payment / AI Database — read-only trước  
5. Các AI còn lại — từng cái một  

**Nguyên tắc:** một AI “cháy ổn” mới bật AI tiếp theo.

---

*Cập nhật khi flip runtimeEnabled hoặc thêm domain mới — giữ file này đồng bộ với `lib/ceo/fleet.ts`.*
