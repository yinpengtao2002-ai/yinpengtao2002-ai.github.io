import type { Metadata } from "next";
import FinanceModelLibrary from "@/components/finance/FinanceModelLibrary";
import { financeModels } from "@/lib/finance/modelRegistry";

export const metadata: Metadata = {
  title: "财务模型｜Lucas Yin",
  description: "从复盘、归因、趋势到敏感性，按真实经营问题选择 Lucas Yin 持续打磨的财务模型。",
};

export default function FinancePage() {
  return (
    <div className="finance-index-page">
      <main className="home-shell finance-index-shell">
        <p className="finance-index-kicker">
          Finance Model Library
        </p>
        <h1 className="finance-index-title">
          问题驱动的财务模型
        </h1>
        <p className="finance-index-intro">
          从复盘、归因、趋势到敏感性，按真实经营问题选择模型。目前共有 {financeModels.length} 个模型，后续会继续扩展。
        </p>
        <FinanceModelLibrary compact />
      </main>
    </div>
  );
}
