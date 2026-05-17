import type { Metadata } from "next";
import ThinkingLabClient from "@/components/thinking/ThinkingLabClient";
import { thinkingLabContent } from "@/lib/data/thinkingLabContent";

export const metadata: Metadata = {
  title: "工具与思考｜Lucas Yin",
  description: "Lucas Yin 关于经营分析、工具实践、市场观察和个人复盘的思考样本。",
};

export default function ThinkingLabPage() {
  return <ThinkingLabClient articles={thinkingLabContent} />;
}
