import type { Metadata } from "next";
import { MotionConfig } from "framer-motion";
import "./globals.css";
import ClientShell from "@/components/ClientShell";
import PageTransition from "@/components/layout/PageTransition";

const BASE_URL = "https://yinpengtao.cn";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  applicationName: "Lucas Yin",
  title: {
    default: "Lucas Yin (殷鹏焘) | Financial Modeling & AI",
    template: "%s | Lucas Yin (殷鹏焘)",
  },
  description: "殷鹏焘 (Lucas Yin) — Financial Modeling & AI. Driven by a passion for solving real-world problems with technology.",
  keywords: ["Lucas Yin", "殷鹏焘", "殷鹏焘个人网站", "financial modeling", "财务建模", "AI", "data analysis", "full-stack development"],
  authors: [{ name: "Lucas Yin (殷鹏焘)" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/site-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/site-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Lucas Yin",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Lucas Yin (殷鹏焘) | Financial Modeling & AI",
    description: "殷鹏焘 (Lucas Yin) — Financial Modeling & AI. Driven by a passion for solving real-world problems with technology.",
    url: BASE_URL,
    siteName: "Lucas Yin",
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lucas Yin (殷鹏焘) | Financial Modeling & AI",
    description: "殷鹏焘 (Lucas Yin) — Financial Modeling & AI. Driven by a passion for solving real-world problems with technology.",
  },
  verification: {
    google: "_SRIbBn9vkLjTvw36xM7n5Fx4SXdSY2WsTy-LYUtKm4",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="theme-color" content="#faf9f5" />
        <meta name="baidu-site-verification" content="codeva-9201I1Yt1V" />
      </head>
      <body
        className="antialiased gradient-bg overflow-x-hidden"
      >
        <MotionConfig reducedMotion="user">
          <ClientShell />
          <main id="main-content" style={{ width: "100%", minWidth: 0, display: "block" }}>
            <PageTransition>{children}</PageTransition>
          </main>
        </MotionConfig>
      </body>
    </html>
  );
}
