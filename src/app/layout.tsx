import type { Metadata } from "next";
import { Poppins, Lora } from "next/font/google";
import "./globals.css";
import MouseTrail from "@/components/ui/MouseTrail";
import ThemeToggle from "@/components/ui/ThemeToggle";

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
    default: "Lucas Yin | Personal Portfolio",
    template: "%s | Lucas Yin",
  },
  description: "金融建模 & AI — 对技术有极致热情的人",
  keywords: ["Lucas Yin", "殷鹏焘", "portfolio", "financial modeling", "AI", "全栈开发"],
  authors: [{ name: "Lucas Yin" }],
  openGraph: {
    title: "Lucas Yin | Personal Portfolio",
    description: "金融建模 & AI — 对技术有极致热情的人",
    url: BASE_URL,
    siteName: "Lucas Yin",
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lucas Yin | Personal Portfolio",
    description: "金融建模 & AI — 对技术有极致热情的人",
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
        <main>{children}</main>
      </body>
    </html>
  );
}
