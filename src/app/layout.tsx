import type { Metadata } from "next";
import { Poppins, Lora } from "next/font/google";
import "./globals.css";
import MouseTrail from "@/components/ui/MouseTrail";
import ThemeToggle from "@/components/ui/ThemeToggle";
import ChatWidget from "@/components/ChatWidget";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const BASE_URL = "https://yinpengtao.cn";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Lucas Yin | Financial Modeling & AI",
    template: "%s | Lucas Yin",
  },
  description: "Financial Modeling & AI — Driven by a passion for solving real-world problems with technology.",
  keywords: ["Lucas Yin", "殷鹏焘", "financial modeling", "AI", "data analysis", "full-stack development"],
  authors: [{ name: "Lucas Yin" }],
  openGraph: {
    title: "Lucas Yin | Financial Modeling & AI",
    description: "Financial Modeling & AI — Driven by a passion for solving real-world problems with technology.",
    url: BASE_URL,
    siteName: "Lucas Yin",
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lucas Yin | Financial Modeling & AI",
    description: "Financial Modeling & AI — Driven by a passion for solving real-world problems with technology.",
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
      <body
        className={`${poppins.variable} ${lora.variable} antialiased gradient-bg overflow-x-hidden selection:bg-[#d97757] selection:text-white`}
      >
        <MouseTrail />
        <ThemeToggle />
        <main style={{ width: "100%", minWidth: "100vw", display: "block" }}>{children}</main>
        <ChatWidget />
      </body>
    </html>
  );
}
