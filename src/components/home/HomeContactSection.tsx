import { Linkedin, Mail, MessageCircle } from "lucide-react";
import { siteConfig } from "@/lib/config/site";

export default function HomeContactSection() {
  return (
    <section id="contact" style={{ borderTop: "1px solid var(--border)", padding: "4rem 1.5rem 5rem" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: 10 }}>Lucas Yin</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.8, marginBottom: 24 }}>
          奇瑞汽车 · 国际 · 财务 BP<br />
          汽车出海 · 经营分析 · 财务模型 · AI 实践
        </p>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <a href={`mailto:${siteConfig.links?.email}`} style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--muted)", textDecoration: "none" }}>
            <Mail style={{ width: 16, height: 16 }} /> {siteConfig.links?.email}
          </a>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--muted)" }}>
            <MessageCircle style={{ width: 16, height: 16 }} /> 微信：YPT1479239526
          </span>
          <a href="https://www.linkedin.com/in/lucasyin2002/" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--muted)", textDecoration: "none" }}>
            <Linkedin style={{ width: 16, height: 16 }} /> LinkedIn
          </a>
        </div>
      </div>
    </section>
  );
}
