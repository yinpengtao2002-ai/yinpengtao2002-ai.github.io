import type { Metadata } from "next";
import ToolBackButton from "@/components/finance/ToolBackButton";
import FinanceAIChartDemo from "./FinanceAIChartDemo";

export const metadata: Metadata = {
  title: "财务分析 AI 助手图表 Demo｜Lucas Yin",
  description: "集中预览财务分析 AI 助手可生成的图表样式。",
};

export default function FinanceAIChartDemoPage() {
  return (
    <div className="finance-ai-demo-page">
      <ToolBackButton />
      <FinanceAIChartDemo />
    </div>
  );
}
