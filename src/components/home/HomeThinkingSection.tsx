import Link from "next/link";
import { thinkingContent } from "@/lib/data/generated/content";

export default function HomeThinkingSection() {
  const latest = thinkingContent.slice(0, 4);

  return (
    <section id="thinking" className="home-viewport home-section" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="home-shell" style={{ maxWidth: 1040 }}>
        <p style={{ color: "var(--accent)", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 12, fontWeight: 800, marginBottom: 12 }}>
          Thinking Lab
        </p>
        <h2 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", lineHeight: 1.12, letterSpacing: 0, marginBottom: 14 }}>
          思考与方法
        </h2>
        <p style={{ maxWidth: 620, color: "var(--muted)", lineHeight: 1.8, fontSize: 14, marginBottom: 24 }}>
          这里放方法论、业务观察和工具实践：看我如何拆问题、查证据、做取舍。
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          {latest.map((article) => (
            <Link key={article.slug} href={article.href} style={{ textDecoration: "none" }}>
              <article style={{ height: "100%", border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", padding: 18 }}>
                <span style={{ color: "var(--muted)", fontSize: 12 }}>{article.date}</span>
                <h3 style={{ color: "var(--foreground)", fontSize: 18, lineHeight: 1.35, margin: "8px 0" }}>{article.title}</h3>
                <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>{article.description}</p>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
