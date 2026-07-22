import type { Metadata } from "next";
import ToolBackButton from "@/components/finance/ToolBackButton";
import FinanceAIConversationDemo from "./FinanceAIConversationDemo";

export const metadata: Metadata = {
  title: "财务分析 AI 助手只读示例",
  description: "查看财务分析 AI 助手的只读示例对话，不上传数据，也不会触发模型调用。",
};

export default function FinanceAIConversationDemoPage() {
  return (
    <div className="finance-tool-page-shell min-h-screen">
      <ToolBackButton />
      <FinanceAIConversationDemo />
    </div>
  );
}
