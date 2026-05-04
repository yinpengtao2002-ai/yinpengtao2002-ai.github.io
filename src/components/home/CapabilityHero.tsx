"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { financeModels } from "@/lib/finance/modelRegistry";
import { thinkingContent } from "@/lib/data/generated/content";
import { useViewportProfile } from "@/lib/useLowMotionMode";

const UI_FONT =
  'var(--font-poppins), "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';

const PROOFS = [
  {
    title: "财务模型",
    body: "把预算复盘、趋势分析、利润敏感性等经营问题整理成可使用的分析工具。",
    href: "/finance",
    link: "查看模型库",
  },
  {
    title: "AI 工作流",
    body: "用 AI 辅助资料整理、内容生产、模型搭建和复杂任务拆解。",
    href: "/thinking-lab",
    link: "进入思考与方法",
  },
  {
    title: "思考判断",
    body: "持续记录对业务、市场、工具和个人成长的观察。",
    href: "/thinking-lab",
    link: "阅读最新文章",
  },
];

export default function CapabilityHero() {
  const { lowMotion, isMobileLike } = useViewportProfile();

  return (
    <section
      id="home"
      className="full-viewport"
      style={{
        display: "grid",
        gridTemplateColumns: isMobileLike ? "1fr" : "0.9fr 1.1fr",
        alignItems: "center",
        gap: isMobileLike ? 28 : 56,
        padding: isMobileLike ? "6rem 1.25rem 3rem" : "7rem 4rem 4rem",
        maxWidth: 1180,
        margin: "0 auto",
        fontFamily: UI_FONT,
      }}
    >
      <motion.div
        initial={lowMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
        animate={lowMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1
          style={{
            fontSize: isMobileLike ? "clamp(3.2rem, 18vw, 5rem)" : "clamp(5.5rem, 10vw, 8rem)",
            lineHeight: 0.88,
            letterSpacing: 0,
            fontWeight: 800,
            margin: 0,
          }}
        >
          <span className="gradient-text">Lucas<br />Yin</span>
        </h1>
        <p style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--border)", color: "var(--muted)", lineHeight: 1.9, fontSize: 14 }}>
          经营分析 · 财务模型 · AI 工作流
        </p>
      </motion.div>

      <motion.div
        initial={lowMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
        animate={lowMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.12 }}
      >
        <p style={{ color: "var(--accent)", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 12, fontWeight: 800, marginBottom: 16 }}>
          Capability Profile
        </p>
        <h2 style={{ fontSize: "clamp(1.95rem, 4vw, 3rem)", lineHeight: 1.15, letterSpacing: 0, marginBottom: 18 }}>
          从业务问题出发，持续打磨经营分析、财务模型与 AI 工作流。
        </h2>
        <Link
          href="/finance"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            minHeight: 42,
            padding: "0 16px",
            borderRadius: 999,
            background: "var(--foreground)",
            color: "var(--background)",
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 800,
            marginBottom: 22,
          }}
        >
          查看财务模型 <ArrowRight style={{ width: 15, height: 15 }} />
        </Link>
        <div style={{ display: "grid", gap: 10 }}>
          {PROOFS.map((proof) => (
            <Link key={proof.title} href={proof.href} style={{ textDecoration: "none" }}>
              <div style={{ border: "1px solid var(--border)", background: "var(--card)", borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <strong style={{ color: "var(--foreground)" }}>{proof.title}</strong>
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>
                    {proof.title === "财务模型" ? `${financeModels.length} 个模型` : `${thinkingContent.length} 篇`}
                  </span>
                </div>
                <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7, margin: "6px 0 8px" }}>{proof.body}</p>
                <span style={{ color: "var(--foreground)", fontSize: 13, fontWeight: 800 }}>{proof.link}</span>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
