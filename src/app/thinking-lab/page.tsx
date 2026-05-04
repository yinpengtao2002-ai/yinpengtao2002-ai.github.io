import type { Metadata } from "next";
import { thinkingContent } from "@/lib/data/generated/content";
import ThinkingLabClient from "@/components/thinking/ThinkingLabClient";

export const metadata: Metadata = {
  title: "思考与方法｜Lucas Yin",
  description: "Lucas Yin 关于 AI 工作流、经营财务、市场观察和个人随笔的持续记录。",
};

export default function ThinkingLabPage() {
  return <ThinkingLabClient articles={thinkingContent} />;
}
