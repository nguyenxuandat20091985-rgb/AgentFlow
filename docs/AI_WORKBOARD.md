# AgentFlow — AI CEO Shared Workboard

> **BẮT BUỘC đọc trước khi một AI/agent sửa code.** Đây là bảng trạng thái và bàn giao chung để agent sau biết hệ thống đang làm gì, đã làm gì và phải làm gì tiếp theo.
>
> **Rule:** Không viết lại một feature đã DONE/LIVE. Trước khi sửa, đọc `docs/ARCHITECTURE.md`, file workboard này và git diff của branch hiện tại.

## 1. Production baseline

- Production branch: `main`
- Production app / **trung tâm điều hành bắt buộc:** `https://agentflow-khaki-rho.vercel.app/`
- CEO registry: `lib/ceo/fleet.ts`
- CEO router: `lib/ceo/router.ts`
- Primary runtime: `lib/agent-runtime.ts`
- Architecture contract: `docs/ARCHITECTURE.md`
- Isolation contract: `docs/agent-isolation.md`
- Secrets: environment variables only; **never commit secret values**.

## 2. AI fleet — current state

| # | AI | ID | Current state | Current scope | Next action |
|---|---|---|---|---|---|
| 1 | AI Website & Hosting | `salesbot` | **LIVE / VERIFY** | Website, hosting, affiliate storefront, outreach cycle | Verify production heartbeat → runtime → website cycle; monitor from Workflows; only fix proven failures |
| 2 | AI Database & Storage | `database` | PLANNED | Supabase / Firestore data layer | Define read/write contracts and ownership; no activation yet |
| 3 | AI Payment & Escrow | `payment` | PLANNED | payOS/webhooks/ledger/escrow | Read-only verification first; real revenue only from verified events |
| 4 | AI Facebook Marketing & Graph API | `marketing` | **LIVE / VERIFY** | Fanpage Nhà Bếp Thông Minh | Verify token diagnostic + connector; approval-gated publishing |
| 5 | AI Telegram & Zalo Distribution | `telegram-zalo` | PLANNED | Deal distribution channels | Define channel adapters and anti-spam rules |
| 6 | AI Affiliate & Shopee Automation | `affiliate` | PLANNED | Product/deal discovery, tracking links | Define affiliate data contract; no fake conversion/revenue |
| 7 | AI Content Generator | `content` | PLANNED | LLM content generation | Use shared provider router; add quality/safety policy |
| 8 | AI Workflow & Make.com Automation | `workflow` | PLANNED | Automation orchestration | Add isolated jobs; failures must not stop Website/Facebook |
| 9 | AI CI/CD & GitHub Actions | `cicd` | IN PROGRESS | Build, test, deploy gates | Enforce PR checks and isolation policy |
| 10 | AI Mobile Terminal & Code Manager | `mobile` | PLANNED | Termux/Acode/vscode.dev workflows | Documentation only until contracts are stable |
| 11 | AI Local Model Runner | `local-model` | PLANNED | PocketPal/Dify/Typebot/Aider | Adapter contract; no production write access by default |
| 12 | AI SEO & Traffic Growth | `seo` | PLANNED | SEO, keywords, blog growth | Read-only analytics first; then controlled content |
| 13 | AI Customer Support & Chatbot | `support` | PLANNED | Customer interaction | Draft-only first; escalation rules before activation |
| 14 | AI Data Analytics & Tracking | `analytics` | PLANNED | KPI, CTR, conversion tracking | Define event schema and verified attribution |
| 15 | AI Security & Heartbeat Monitor | `security` | IN PROGRESS | Secrets, auth, heartbeat, health | Keep auth/fallback centralized; never expose secrets |
| 16 | AI Order & Transaction Verifier | `order-verifier` | PLANNED | Verify real orders/events | Read-only verification before any downstream action |
| 17 | AI Social Media Cross-Poster | `cross-poster` | PLANNED | Cross-platform publishing | Provider adapters + approval/anti-spam gate |
| 18 | AI Error Handler & Fallback | `error-fallback` | IN PROGRESS | Retry, circuit breaker, safe fallback | Protect live agents from secondary-agent failures |
| 19 | AI Backup & System Recovery | `backup-recovery` | PLANNED | Backup/restore/recovery | Recovery runbook and restore verification |
| 20 | AI Task Queue & Scheduler | `task-scheduler` | PLANNED | Queues, schedules, leases | Define idempotency + per-agent queues |

### Supporting AI capability: Binance Zero-Capital Scout

`ai3-binance-scout` exists as an isolated workflow/capability. It is **not** allowed to silently expand the 20-agent production allow-list. Any activation must have its own CI, queue, permissions and CEO approval.

## 3. LLM provider contract

The owner has configured provider API keys in deployment environments for:

- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `OPENROUTER_API_KEY`
- `DEEPSEEK_API_KEY`

**Never copy or display their values in source, logs, screenshots, prompts, PRs, or this workboard.**

All agents that need an LLM must use the shared provider/router contract rather than creating a new provider client independently. Provider fallback order and model selection must be documented in the router before changing it.

## 4. Handoff protocol — every AI must follow

### Before coding

1. Read `docs/ARCHITECTURE.md`.
2. Read this workboard.
3. Read the target AI's `docs/ai*.md` file, if present.
4. Check current `main` and the branch diff.
5. Identify the exact task and acceptance criteria.
6. Declare which paths are owned by the AI before editing.

### During coding

- Work only in the AI's isolated branch.
- Do not rewrite unrelated code.
- Do not change shared runtime/auth/workflow code unless the task explicitly requires it.
- If a shared change is required, make the smallest additive change and add a regression test/check.
- Never commit secrets.
- Never fabricate revenue, orders, clicks, conversions, or provider responses.

### Before merge

- Build/typecheck passes.
- Relevant tests/checks pass.
- Isolation/path ownership check passes.
- Existing live agents remain unchanged unless explicitly part of the task.
- API/data contract is backwards compatible or has a migration plan.
- Workboard is updated with: **what changed / what was verified / next action / known risks**.

### If a change breaks production

Stop further feature work. Revert/rollback to the last known-good deployment, record the failure, and only then prepare a minimal fix branch.

## 5. Current execution order

**NOW:** stabilize and verify AI Website. Its operational monitoring belongs inside **Workflows** of the central control center.

**NEXT:** harden CI/CD + isolation + safe fallback without changing live Website/Facebook behavior.

**THEN:** activate AI #2 onward one at a time, with explicit contracts and a green production verification between activations.

## 6. Change log

- 2026-09-10: Shared workboard established as the handoff source for all AI agents.
- 2026-09-10: 20-agent separation recorded; live agents remain `salesbot` and `marketing` in the current runtime allow-list.
- 2026-09-10: AI Website operations reaffirmed under the central control center; Workflows receives the Website monitor; `/website` remains public storefront only.
- 2026-09-10: Website monitor isolated to `components/agentflow/AIWebsiteShortcut.tsx` + `.module.css`; monitor is read-only and fail-soft.
