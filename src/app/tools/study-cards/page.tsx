import type { Metadata } from "next";
import StudyCardsTool from "./StudyCardsTool";

export const metadata: Metadata = {
  title: "AI 学习卡片生成器｜Lucas Yin",
  description: "输入一段知识内容，生成 Anki 风格问答卡、概念解释、例子和测试题。",
};

export default function StudyCardsPage() {
  return <StudyCardsTool />;
}
