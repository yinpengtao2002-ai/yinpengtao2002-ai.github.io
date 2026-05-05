import FinanceModelLibrary from "@/components/finance/FinanceModelLibrary";

export default function HomeFinanceSection() {
  return (
    <section id="finance" className="home-viewport home-section" style={{ background: "var(--card)", borderTop: "1px solid var(--border)" }}>
      <div className="home-shell" style={{ maxWidth: 1040 }}>
        <p style={{ color: "var(--accent-secondary)", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 12, fontWeight: 800, marginBottom: 12 }}>
          Finance Model Library
        </p>
        <h2 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", lineHeight: 1.12, letterSpacing: 0, marginBottom: 14 }}>
          按经营问题进入模型
        </h2>
        <p style={{ maxWidth: 600, color: "var(--muted)", lineHeight: 1.8, fontSize: 14, marginBottom: 24 }}>
          从预算复盘、趋势跟踪到利润敏感性，用模型把经营问题拆到可观察、可复盘、可行动。
        </p>
        <FinanceModelLibrary compact />
      </div>
    </section>
  );
}
