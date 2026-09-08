import type { Metadata } from "next";
import { getWebsiteCatalog } from "@/lib/website-catalog";
import StorefrontClient from "./StorefrontClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nhà Bếp Thông Minh | Deal bếp & gia dụng được AI chọn lọc",
  description: "Khám phá deal bếp và gia dụng được AI sàng lọc từ Shopee, Lazada và AccessTrade.",
};

export default async function WebsitePage() {
  const products = await getWebsiteCatalog();
  return <StorefrontClient products={products} />;
}
