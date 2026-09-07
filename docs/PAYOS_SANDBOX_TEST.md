# PayOS → Supabase → Revenue Dashboard test

## Important: PayOS does not currently provide a separate sandbox

According to the current payOS documentation, integration is tested without a separate sandbox environment. payOS can send a sample webhook when you confirm the webhook URL, and real payment testing can be performed with a small real transaction. See the official payOS webhook/API documentation before testing.

## 1. Configure server environment

Set these only in Vercel Environment Variables or a local `.env.local` that is never committed:

```text
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<server-only-secret>
PAYOS_CLIENT_ID=<payos-client-id>
PAYOS_API_KEY=<payos-api-key>
PAYOS_CHECKSUM_KEY=<payos-checksum-key>
OWNER_BANK_CODE=BIDV
OWNER_BANK_ACCOUNT=<owner account number>
OWNER_BANK_NAME=<verified account name>
```

Never put `SUPABASE_SERVICE_ROLE_KEY`, `PAYOS_API_KEY`, or `PAYOS_CHECKSUM_KEY` in `NEXT_PUBLIC_*` variables or browser code.

## 2. Configure PayOS webhook

Use the production webhook URL:

```text
https://<your-agentflow-domain>/api/payments/webhook
```

Confirm the webhook URL in the PayOS payment channel. PayOS uses the `data` object plus the channel checksum key to calculate an HMAC-SHA256 signature; the endpoint in AgentFlow verifies that signature before persistence.

## 3. Sample webhook validation

PayOS can send a sample transaction payload while confirming the webhook. This validates reachability and signature handling. **Do not count a PayOS sample as revenue.** For production, the recommended next hardening step is to mark provider-generated validation samples as test-only if PayOS exposes a reliable test marker; otherwise use a dedicated test payment channel/database.

The repository also contains a local signed-payload utility:

```bash
PAYOS_CHECKSUM_KEY='your-local-checksum-key' \
AGENTFLOW_URL='http://localhost:3000' \
npm run dev
```

In another terminal:

```bash
PAYOS_CHECKSUM_KEY='your-local-checksum-key' \
AGENTFLOW_URL='http://localhost:3000' \
node scripts/test-payos-webhook.mjs
```

This script is a **synthetic signature test**, not a sandbox payment, and should not be pointed at production because the current handler treats a verified success payload as a real payment event.

## 4. Real end-to-end test

After webhook confirmation succeeds, create a small payment link in the PayOS channel and make a small real payment from a separate bank account. Verify:

1. PayOS marks the order as paid.
2. PayOS sends the webhook.
3. AgentFlow returns HTTP 2xx after successful persistence.
4. `payment_events` contains exactly one row for the provider event/reference.
5. `revenue_ledger` contains exactly one row linked to that payment event.
6. `/earning` shows the verified amount after its next refresh.
7. `/payments` shows the inbound payment event.
8. Replaying the same webhook does not create another ledger row.

The money flow is through PayOS to the bank account connected and verified in your PayOS channel. AgentFlow does not transfer or withdraw funds.

## 5. Database verification SQL

Run in Supabase SQL Editor:

```sql
select id, provider, external_event_id, status, amount, currency, verified_at
from public.payment_events
order by verified_at desc
limit 20;

select id, source, payment_event_id, amount, currency, recorded_at
from public.revenue_ledger
order by recorded_at desc
limit 20;
```

Check for duplicate provider events:

```sql
select provider, external_event_id, count(*)
from public.payment_events
group by provider, external_event_id
having count(*) > 1;
```

The final query should return zero rows.

## 6. Realtime

`payment_events`, `revenue_ledger`, `affiliate_orders`, and `commerce_deals` are enabled in the `supabase_realtime` publication. The Owner Dashboard currently polls its server API every 10 seconds, so the database remains the source of truth and the UI updates automatically without fabricated numbers.
