import type { Metadata } from "next";
import FinanceAIAssistantTool from "./FinanceAIAssistantTool";

export const metadata: Metadata = {
  title: "财务分析 AI 助手｜Lucas Yin",
  description: "上传经营明细后，通过持续聊天生成趋势图、横向排名和瀑布桥分析。",
};

export default function FinanceAIAssistantPage() {
  return <FinanceAIAssistantTool />;
}
