import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "财务分析 AI 助手｜Lucas Yin",
  description: "财务分析 AI 助手已经归入财务模型库。",
};

export default function FinanceAIAssistantPage() {
  redirect("/finance/finance-ai-assistant");
}
