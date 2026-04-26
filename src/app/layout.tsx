import type { Metadata } from "next";
import "./globals.css";
import ClientShell from "@/components/ClientShell";

const BASE_URL = "https://yinpengtao.cn";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Lucas Yin (殷鹏焘) | Financial Modeling & AI",
    template: "%s | Lucas Yin (殷鹏焘)",
  },
  description: "殷鹏焘 (Lucas Yin) — Financial Modeling & AI. Driven by a passion for solving real-world problems with technology.",
  keywords: ["Lucas Yin", "殷鹏焘", "殷鹏焘个人网站", "financial modeling", "财务建模", "AI", "data analysis", "full-stack development"],
  authors: [{ name: "Lucas Yin (殷鹏焘)" }],
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
        <meta name="baidu-site-verification" content="codeva-9201I1Yt1V" />
      </head>
      <body
        className="antialiased gradient-bg overflow-x-hidden selection:bg-[#d97757] selection:text-white"
      >
        <ClientShell />
        <main style={{ width: "100%", minWidth: "100vw", display: "block" }}>{children}</main>
      </body>
    </html>
  );
}
