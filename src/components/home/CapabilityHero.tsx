"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import ProductStageVisual from "@/components/home/ProductStageVisual";
import { financeModels } from "@/lib/finance/modelRegistry";
import { thinkingContent } from "@/lib/data/generated/content";
import { useViewportProfile } from "@/lib/useLowMotionMode";

const UI_FONT =
  'var(--font-poppins), "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';

const PROOFS = [
  {
    title: "业务理解",
    meta: "真实问题",
    body: "先把经营问题拆清楚，再选择模型和工具。",
    href: "/finance",
    link: "看模型如何落地",
  },
  {
    title: "建模能力",
    meta: `${financeModels.length} 个模型`,
    body: "把预算复盘、趋势跟踪、归因拆解和敏感性测算做成工作台。",
    href: "/finance",
    link: "进入财务模型",
  },
  {
    title: "方法沉淀",
    meta: `${thinkingContent.length} 篇`,
    body: "记录资料处理、AI 协作、市场观察和个人复盘里的证据与取舍。",
    href: "/thinking-lab",
    link: "阅读思考与方法",
  },
];

export default function CapabilityHero() {
  const { lowMotion } = useViewportProfile();
  const leftInitial = lowMotion ? { opacity: 0, y: 16 } : { opacity: 1, x: "32vw" };
  const rightInitial = lowMotion ? { opacity: 0, y: 16 } : { opacity: 0, x: "8vw" };

  return (
    <section
      id="home"
      className="home-viewport home-hero"
      style={{ fontFamily: UI_FONT }}
    >
      <div className="home-hero-pattern" aria-hidden="true" />

      <div className="home-shell home-hero-frame">
        <div className="home-hero-split">
          <motion.div
            initial={leftInitial}
            animate={lowMotion ? { opacity: 1, x: 0, y: 0 } : { opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.76, ease: [0.22, 1, 0.36, 1] }}
            className="home-hero-left"
          >
            <p className="home-hero-eyebrow">Lucas Yin · 奇瑞汽车国际财务 BP</p>
            <h1 className="home-hero-title">Lucas<br />Yin</h1>
            <p className="home-hero-slogan">
              从经营问题到模型、图表和 AI 解读
            </p>
            <p className="home-hero-lede">
              我把真实经营分析中的预算、单车、趋势和利润问题，沉淀成可以直接使用的财务模型与 AI 协作流程。
            </p>
            <div className="home-hero-proof-list">
              {PROOFS.map((proof) => (
                <Link key={proof.title} href={proof.href} className="home-proof-card">
                  <div className="home-proof-heading">
                    <strong>{proof.title}</strong>
                    <span>{proof.meta}</span>
                  </div>
                  <p className="home-proof-body">{proof.body}</p>
                  <span className="home-proof-link">{proof.link}</span>
                </Link>
              ))}
            </div>
            <div className="home-hero-actions">
              <Link href="/finance" className="home-primary-action">
                查看财务模型 <ArrowRight style={{ width: 15, height: 15 }} />
              </Link>
              <Link href="/thinking-lab" className="home-quiet-action">
                思考与方法
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={rightInitial}
            animate={lowMotion ? { opacity: 1, x: 0, y: 0 } : { opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.72, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="home-hero-right"
          >
            <div className="home-hero-right-stack">
              <div className="home-hero-copy-card">
                <p className="home-hero-kicker">Capability Profile</p>
                <h2 className="home-hero-headline">
                  <span className="home-headline-mark">从业务问题出发</span>
                  <span className="home-headline-line">持续打磨经营分析、财务模型与 AI 工作流</span>
                </h2>
                <Link href="/finance" className="home-primary-action">
                  查看财务模型 <ArrowRight style={{ width: 15, height: 15 }} />
                </Link>
              </div>
              <ProductStageVisual />
              <div className="home-hero-workflow-strip">
                {PROOFS.map((proof) => (
                  <Link key={proof.title} href={proof.href} className="home-proof-card">
                    <div className="home-proof-heading">
                      <strong>{proof.title}</strong>
                      <span>{proof.meta}</span>
                    </div>
                    <p className="home-proof-body">{proof.body}</p>
                    <span className="home-proof-link">{proof.link}</span>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="home-hero-continue-row">
          <Link href="#finance" className="home-hero-continue">
            <span>下一屏 · 财务模型</span>
            <ArrowDown style={{ width: 15, height: 15 }} />
          </Link>
        </div>
      </div>
    </section>
  );
}
