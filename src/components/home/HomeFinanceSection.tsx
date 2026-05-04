import FinanceModelLibrary from "@/components/finance/FinanceModelLibrary";

export default function HomeFinanceSection() {
  return (
    <section id="finance" className="full-viewport" style={{ display: "flex", alignItems: "center", padding: "4rem 1.5rem", background: "var(--card)", borderTop: "1px solid var(--border)" }}>
      <div style={{ width: "100%", maxWidth: 1040, margin: "0 auto" }}>
        <p style={{ color: "var(--accent-secondary)", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 12, fontWeight: 800, marginBottom: 12 }}>
          Finance Model Library
        </p>
        <h2 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", lineHeight: 1.12, letterSpacing: 0, marginBottom: 14 }}>
          按经营问题进入模型
        </h2>
        <p style={{ maxWidth: 600, color: "var(--muted)", lineHeight: 1.8, fontSize: 14, marginBottom: 24 }}>
          模型库按问题扩展，而不是按当前数量写死。未来新增模型时，会自然加入这个工作台。
        </p>
        <FinanceModelLibrary compact />
      </div>
    </section>
  );
}
