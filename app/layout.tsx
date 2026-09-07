import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./agentflow-v2.css";
import PwaRegister from "./pwa-register";

export const metadata: Metadata = {
  title: "AgentFlow AI",
  description: "AI agent workflow control center",
  applicationName: "AgentFlow AI",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "AgentFlow", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#111827"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body><PwaRegister />{children}</body></html>;
}
