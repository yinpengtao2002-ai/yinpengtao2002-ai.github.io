import type { Metadata } from "next";
import StudyCardsTool from "./StudyCardsTool";

export const metadata: Metadata = {
  title: "AI 单词卡｜Lucas Yin",
  description: "从英文文章或单词清单生成背诵卡，逐张记中文释义和例句。",
};

export default function StudyCardsPage() {
  return <StudyCardsTool />;
}
