import { NextResponse } from "next/server";

export async function GET() {
  const bank = {
    code: process.env.OWNER_BANK_CODE || "BIDV",
    accountNo: process.env.OWNER_BANK_ACCOUNT || "4430269669",
    accountName: process.env.OWNER_BANK_NAME || "NGUYỄN XUÂN ĐẠT",
    branch: process.env.OWNER_BANK_BRANCH || "PGD Quảng Yên",
  };
  const address = process.env.CRYPTO_WALLET_ADDRESS || "0xada9b8ff01be517ca638071d138b523d14ce5373";
  return NextResponse.json(
    {
      bank,
      crypto: { address, network: "BEP20", chain: "BNB Smart Chain", asset: "USDT" },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
