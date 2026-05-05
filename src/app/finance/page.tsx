import type { Metadata } from "next";
import FinanceModelLibrary from "@/components/finance/FinanceModelLibrary";
import { financeModels } from "@/lib/finance/modelRegistry";

export const metadata: Metadata = {
  title: "财务模型｜Lucas Yin",
  description: "按经营问题进入 Lucas Yin 持续打磨的财务模型和分析工具。",
};

export default function FinancePage() {
  return (
    <div className="finance-index-page">
      <main className="home-shell finance-index-shell">
        <p className="finance-index-kicker">
          Finance Model Library
        </p>
        <h1 className="finance-index-title">
          按经营问题进入模型
        </h1>
        <p className="finance-index-intro">
          这里收录的是我自己搭建并持续打磨的财务模型和分析工具。模型库会按经营问题持续扩展，目前共有 {financeModels.length} 个模型。
        </p>
        <FinanceModelLibrary compact />
      </main>
    </div>
  );
}
