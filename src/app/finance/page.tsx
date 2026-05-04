import type { Metadata } from "next";
import FinanceModelLibrary from "@/components/finance/FinanceModelLibrary";
import { financeModels } from "@/lib/finance/modelRegistry";

export const metadata: Metadata = {
  title: "财务模型｜Lucas Yin",
  description: "按经营问题进入 Lucas Yin 持续打磨的财务模型和分析工具。",
};

export default function FinancePage() {
  return (
    <div style={{ minHeight: "100vh", padding: "6.5rem 1.5rem 4rem", background: "var(--background)" }}>
      <main style={{ maxWidth: 1040, margin: "0 auto" }}>
        <p style={{ color: "var(--accent-secondary)", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 12, fontWeight: 800, marginBottom: 14 }}>
          Finance Model Library
        </p>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1.1, letterSpacing: 0, marginBottom: 16 }}>
          按经营问题进入模型
        </h1>
        <p style={{ maxWidth: 640, color: "var(--muted)", lineHeight: 1.8, fontSize: 15, marginBottom: 28 }}>
          这里收录的是我自己搭建并持续打磨的财务模型和分析工具。模型库会按经营问题持续扩展，目前共有 {financeModels.length} 个模型。
        </p>
        <FinanceModelLibrary />
      </main>
    </div>
  );
}
