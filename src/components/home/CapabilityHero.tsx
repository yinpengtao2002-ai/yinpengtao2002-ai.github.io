"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import ArtifactCard, { ChartArtifact, CodeArtifact, ImageArtifact } from "@/components/ui/ArtifactCard";
import { financeModels } from "@/lib/finance/modelRegistry";
import { thinkingContent } from "@/lib/data/generated/content";
import { useViewportProfile } from "@/lib/useLowMotionMode";

const UI_FONT =
  'var(--font-poppins), "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';

const PROOFS = [
  {
    title: "业务理解",
    meta: "真实问题",
    body: "从预算、销量、单车指标和利润结构出发，先把问题拆清楚，再选择模型和工具。",
    href: "/finance",
    link: "看模型如何落地",
  },
  {
    title: "建模能力",
    meta: `${financeModels.length} 个模型`,
    body: "把经营分析、趋势跟踪、归因拆解和敏感性测算做成可以直接上手的工作台。",
    href: "/finance",
    link: "进入财务模型",
  },
  {
    title: "方法沉淀",
    meta: `${thinkingContent.length} 篇`,
    body: "记录资料处理、AI 协作、市场观察和个人复盘里的方法、证据与取舍。",
    href: "/thinking-lab",
    link: "阅读思考与方法",
  },
];

export default function CapabilityHero() {
  const { lowMotion } = useViewportProfile();

  return (
    <section
      id="home"
      className="home-viewport home-hero"
      style={{ fontFamily: UI_FONT }}
    >
      <div className="home-hero-pattern" aria-hidden="true" />
      {!lowMotion && (
        <div className="home-hero-artifacts" aria-hidden="true">
          <ArtifactCard delay={0.2} rotate={5} initialY={-8} className="home-artifact-code rounded-md">
            <CodeArtifact />
          </ArtifactCard>
          <ArtifactCard delay={0.35} rotate={-4} initialY={8} className="home-artifact-chart rounded-md">
            <ChartArtifact />
          </ArtifactCard>
          <ArtifactCard delay={0.45} rotate={-7} initialY={0} className="home-artifact-image rounded-md">
            <ImageArtifact />
          </ArtifactCard>
        </div>
      )}

      <div className="home-shell home-hero-grid">
        <motion.div
          initial={lowMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={lowMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="home-hero-identity"
        >
          <h1
            className="home-hero-title"
            style={{
              letterSpacing: 0,
              margin: 0,
            }}
          >
            <span className="gradient-text">Lucas<br />Yin</span>
          </h1>
          <p className="home-hero-role">
            奇瑞汽车国际财务 BP · 经营分析 · 财务模型 · AI 协作
          </p>
        </motion.div>

        <motion.div
          initial={lowMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={lowMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="home-hero-content"
        >
          <p style={{ color: "var(--accent)", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 12, fontWeight: 800, marginBottom: 16 }}>
            Capability Profile
          </p>
          <h2 className="home-hero-headline">
            从业务问题出发，持续打磨经营分析、财务模型与 AI 工作流。
          </h2>
          <p className="home-hero-summary">
            我还是职场新人，但正在真实业务里认真训练三件事：理解问题、搭建模型、把 AI 放进可复盘的工作流。
          </p>
          <div className="home-hero-actions">
            <Link href="/finance" className="home-primary-action">
              查看财务模型 <ArrowRight style={{ width: 15, height: 15 }} />
            </Link>
            <Link href="#finance" className="home-secondary-action">
              继续看 <ArrowDown style={{ width: 15, height: 15 }} />
            </Link>
          </div>
          <div className="home-proof-grid">
            {PROOFS.map((proof) => (
              <Link key={proof.title} href={proof.href} className="home-proof-card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <strong style={{ color: "var(--foreground)" }}>{proof.title}</strong>
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>{proof.meta}</span>
                </div>
                <p className="home-proof-body">{proof.body}</p>
                <span className="home-proof-link">{proof.link}</span>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
