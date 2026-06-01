import type { Metadata } from "next";
import StudyCardsTool from "./StudyCardsTool";

export const metadata: Metadata = {
  title: "AI 学习卡片生成器｜Lucas Yin",
  description: "输入一段知识内容，生成适合逐张翻看的 AI 问答闪卡。",
};

export default function StudyCardsPage() {
  return <StudyCardsTool />;
}
