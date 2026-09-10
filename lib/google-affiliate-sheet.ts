const DEFAULT_SHEET_ID = "1YGP1o-yAw4qnwjWE1KV6QFO5rcdNN9oBfFLID3DqwcE";
const DEFAULT_GID = "0";

export type SheetAffiliateProduct = {
  id: string;
  title: string;
  price: number | null;
  discountRate: number;
  image: string | null;
  url: string;
  merchantUrl: string | null;
  category: string;
  source: "sheet";
  network: "shopee" | "lazada" | "other";
  score: number;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function key(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function numberValue(value: string): number | null {
  const raw = clean(value);
  if (!raw) return null;
  const normalized = raw
    .replace(/\s/g, "")
    .replace(/₫|đ|VND|VNĐ/gi, "")
    .replace(/%/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(/,(?=\d{3}(?:\D|$))/g, "");
  const parsed = Number(normalized.replace(/,/g, "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function findValue(row: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const value = row[key(alias)];
    if (value) return value;
  }
  return "";
}

function detectNetwork(value: string) {
  const text = value.toLowerCase();
  if (text.includes("shopee")) return "shopee" as const;
  if (text.includes("lazada")) return "lazada" as const;
  return "other" as const;
}

function resolveFeedUrl() {
  const explicit = clean(process.env.GOOGLE_AFFILIATE_SHEET_CSV_URL);
  if (explicit) return explicit;

  const sheetId = clean(process.env.GOOGLE_AFFILIATE_SHEET_ID) || DEFAULT_SHEET_ID;
  const gid = clean(process.env.GOOGLE_AFFILIATE_SHEET_GID) || DEFAULT_GID;
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/export?format=csv&gid=${encodeURIComponent(gid)}`;
}

export async function fetchGoogleAffiliateSheetProducts(limit = 48): Promise<SheetAffiliateProduct[]> {
  const response = await fetch(resolveFeedUrl(), {
    headers: { accept: "text/csv,text/plain;q=0.9,*/*;q=0.8" },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`Google Sheets feed returned ${response.status}`);
  }

  const rows = parseCsv(await response.text());
  if (rows.length < 2) return [];

  const headers = rows[0].map(key);
  const products: SheetAffiliateProduct[] = [];

  for (let index = 1; index < rows.length; index += 1) {
    const values = rows[index];
    const row: Record<string, string> = {};
    headers.forEach((header, column) => {
      if (header) row[header] = clean(values[column]);
    });

    const title = findValue(row, ["title", "name", "product", "product_name", "ten_san_pham", "ten"]);
    const url = findValue(row, ["affiliate_url", "affiliate_link", "aff_link", "tracking_url", "tracking_link", "link_tiep_thi", "link", "url"]);
    if (!title || !/^https?:\/\//i.test(url)) continue;

    const merchantUrl = findValue(row, ["merchant_url", "product_url", "destination_url", "landing_url", "canonical_url"]);
    const image = findValue(row, ["image", "image_url", "product_image", "anh", "anh_san_pham", "thumbnail"]);
    const networkValue = findValue(row, ["network", "source", "merchant", "store", "shop", "nen_tang"]);
    const category = findValue(row, ["category", "categories", "category_name", "danh_muc"]) || "Tiếp thị liên kết";
    const price = numberValue(findValue(row, ["price", "sale_price", "final_price", "gia", "gia_ban"]));
    const discountRate = numberValue(findValue(row, ["discount_rate", "discount", "giam_gia", "giam"]));
    const score = numberValue(findValue(row, ["score", "priority", "rank", "diem"])) ?? 50;

    products.push({
      id: `sheet-${index}-${Buffer.from(url).toString("base64url").slice(0, 18)}`,
      title,
      price,
      discountRate: discountRate ?? 0,
      image: /^https?:\/\//i.test(image) ? image : null,
      url,
      merchantUrl: /^https?:\/\//i.test(merchantUrl) ? merchantUrl : null,
      category,
      source: "sheet",
      network: detectNetwork(`${networkValue} ${url} ${merchantUrl}`),
      score,
    });
  }

  return products.sort((a, b) => b.score - a.score).slice(0, limit);
}
