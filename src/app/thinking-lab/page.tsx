import type { Metadata } from "next";
import { thinkingContent } from "@/lib/data/generated/content";
import ThinkingLabClient from "@/components/thinking/ThinkingLabClient";

export const metadata: Metadata = {
  title: "思考与方法｜Lucas Yin",
  description: "Lucas Yin 关于经营分析、工具实践、市场观察和个人复盘的思考样本。",
};

export default function ThinkingLabPage() {
  return <ThinkingLabClient articles={thinkingContent} />;
}
