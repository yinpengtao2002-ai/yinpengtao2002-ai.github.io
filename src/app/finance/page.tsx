import type { Metadata } from "next";
import FinanceModelLibrary from "@/components/finance/FinanceModelLibrary";

export const metadata: Metadata = {
  title: "财务模型｜Lucas Yin",
  description: "Lucas Yin 自己搭建并持续打磨的财务模型和分析工具。",
};

export default function FinancePage() {
  return (
    <div className="finance-index-page">
      <main className="home-shell finance-index-shell">
        <section className="home-finance-title-card finance-index-hero-card" aria-labelledby="finance-index-title">
          <h1 id="finance-index-title" className="home-finance-title">
            问题驱动的财务模型
          </h1>
          <p className="finance-index-intro">
            这里收录的是我自己搭建并持续打磨的财务模型和分析工具，欢迎大家使用。
          </p>
        </section>
        <FinanceModelLibrary compact />
      </main>
    </div>
  );
}
