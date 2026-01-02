import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import ParticleField from "@/components/ParticleField";
import AudioPlayer from "@/components/AudioPlayer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lucas Yin | Personal Portfolio",
  description: "我们需要的是对技术有极致热情的人，而不是习惯用经验找答案的人",
  keywords: ["portfolio", "financial modeling", "AI", "technology"],
  authors: [{ name: "Lucas Yin" }],
  openGraph: {
    title: "Lucas Yin | Personal Portfolio",
    description: "我们需要的是对技术有极致热情的人，而不是习惯用经验找答案的人",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body
        className={`${inter.variable} antialiased gradient-bg noise-overlay`}
      >
        <ParticleField />
        <Navigation />
        <main>{children}</main>
        <AudioPlayer />
      </body>
    </html>
  );
}
