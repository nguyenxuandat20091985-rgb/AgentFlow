import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nhà Bếp Thông Minh",
    short_name: "Nhà Bếp",
    description: "Ứng dụng mua sắm và khám phá deal bếp, gia dụng được AI chọn lọc.",
    start_url: "/website",
    scope: "/website",
    display: "standalone",
    background_color: "#f7f6f1",
    theme_color: "#151612",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "maskable" },
      { src: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" }
    ]
  };
}
