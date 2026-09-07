import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AgentFlow AI",
    short_name: "AgentFlow",
    description: "AI agent workflow control center",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7fb",
    theme_color: "#111827",
    orientation: "portrait",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }
    ]
  };
}
