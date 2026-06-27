import type { Metadata } from "next";
import ToolBackButton from "@/components/finance/ToolBackButton";
import FinanceAIAssistantTool from "@/app/tools/finance-ai-assistant/FinanceAIAssistantTool";

export const metadata: Metadata = {
  title: "财务分析 AI 助手｜对话式经营分析模型｜Lucas Yin",
  description: "上传经营明细后，通过持续聊天生成趋势图、横向排名和瀑布桥分析。",
};

function ProjectDescription({ className = "" }: { className?: string }) {
  return (
    <section className={className}>
      <h1>财务分析 AI 助手</h1>
      <p>
        这是一个对话式经营分析模型。上传 CSV 或 Excel 经营明细后，可以直接提问单车边际、
        环比同比、维度排名和利润变化来源，并在聊天回复中查看趋势图、横向排名和瀑布桥。
      </p>
      <h2>适用场景</h2>
      <ul>
        <li>拿到一份临时经营明细，需要快速回答某个国家、车型或期间的问题。</li>
        <li>希望在连续聊天中保留同一份底稿上下文，边问边生成图表。</li>
        <li>先用 AI 助手做通用经营分析，再进入专项模型做更深入拆解。</li>
      </ul>
      <h2>输入数据</h2>
      <ul>
        <li>支持 CSV、XLS 和 XLSX，上传后读取可用工作表和明细行。</li>
        <li>建议包含月份、销量、维度字段以及净收入、成本、边际或利润等指标。</li>
        <li>上传数据只保留在当前浏览器页面中，刷新后清空。</li>
      </ul>
    </section>
  );
}

export default function FinanceAIAssistantPage() {
  return (
    <div className="finance-tool-page-shell min-h-screen">
      <ProjectDescription className="sr-only" />

      <noscript>
        <div className="finance-tool-page-fallback relative z-[60] min-h-screen overflow-auto p-6">
          <ProjectDescription />
        </div>
      </noscript>

      <ToolBackButton />
      <FinanceAIAssistantTool />
    </div>
  );
}
