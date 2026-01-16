import type { Metadata } from "next";
import { Poppins, Lora } from "next/font/google";
import "./globals.css";
// import Navigation from "@/components/Navigation";
import MouseTrail from "@/components/ui/MouseTrail";

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
    <html lang="zh-CN">
      <body
        className={`${poppins.variable} ${lora.variable} antialiased gradient-bg overflow-x-hidden selection:bg-[#d97757] selection:text-white`}
      >
        <MouseTrail />
        {/* Navigation disabled as requested */}
        {/* <Navigation /> */}
        <main>{children}</main>
      </body>
    </html>
  );
}
