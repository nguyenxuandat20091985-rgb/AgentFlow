# Google Sheets Affiliate Feed

AI Website now supports a second affiliate-product feed from Google Sheets alongside AccessTrade.

## Supported sources

- AccessTrade datafeed: existing live feed and real affiliate deep links.
- Google Sheets: configurable CSV feed for manually curated affiliate links.
- Shopee / Lazada: detected automatically from the URL, merchant, shop, or network columns.

## Sheet columns

The importer accepts flexible Vietnamese/English column names. Recommended columns:

| Column | Examples |
| --- | --- |
| `title` | Product name |
| `affiliate_url` | AccessTrade/Shopee/Lazada affiliate URL |
| `merchant_url` | Original merchant/product URL |
| `image` | Public product image URL |
| `price` | Sale/current price |
| `discount_rate` | Discount percentage |
| `category` | Product category |
| `network` | shopee / lazada / other |
| `score` | Optional priority score |

Aliases such as `name`, `ten_san_pham`, `aff_link`, `link_tiep_thi`, `anh_san_pham`, `gia_ban`, and `danh_muc` are also accepted.

## Configuration

By default the code points to the Google Sheet supplied for AgentFlow. For production, the recommended configuration is:

- `GOOGLE_AFFILIATE_SHEET_ID` — spreadsheet ID.
- `GOOGLE_AFFILIATE_SHEET_GID` — tab GID, default `0`.
- `GOOGLE_AFFILIATE_SHEET_CSV_URL` — optional full CSV URL; this overrides ID/GID.

The selected sheet/tab must be publicly readable as CSV (for example, published to the web or shared so the server can read it without an interactive Google login). No Google credential is stored in the browser.

## Selection behavior

AI Website merges AccessTrade and Google Sheets products, detects Shopee/Lazada automatically, removes duplicate canonical destinations, then ranks by opportunity/priority score. AccessTrade remains the primary automated source; the sheet is the curated fallback/expansion source.
