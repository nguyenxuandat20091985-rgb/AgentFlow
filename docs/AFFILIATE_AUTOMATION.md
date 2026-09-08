# AgentFlow affiliate automation

## AccessTrade

Publisher ID: `AT2255379`.

Server-only environment variables:

- `ACCESSTRADE_PUBLISHER_ID`
- `ACCESSTRADE_API_KEY`
- `ACCESSTRADE_API_BASE` (default `https://api.accesstrade.vn`)

The AccessTrade API access key is a secret and must never be committed to Git. AccessTrade documents publisher APIs for datafeeds, transactions and tracking-link creation.

## Safety boundary

Runtime automation may discover opportunities and generate drafts. It must not fabricate orders, payments, commissions or revenue. Only verified payment/provider records may contribute to `revenue_ledger` and KPI actuals.

Facebook Page tokens and other provider credentials are also server-only secrets. Rotate any token that has been exposed and store only the replacement in Vercel Environment Variables.
