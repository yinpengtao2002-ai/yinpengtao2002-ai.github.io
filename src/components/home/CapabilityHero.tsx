"use client";

import { motion, type Transition } from "framer-motion";
import Link from "next/link";
import type { MouseEvent } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import HeroModelStage from "@/components/home/HeroModelStage";
import { useViewportProfile } from "@/lib/useLowMotionMode";

const UI_FONT =
  'var(--font-poppins), "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';
const HERO_EASE = [0.22, 1, 0.36, 1] as const;

export default function CapabilityHero() {
  const { isMobileLike, lowMotion, prefersReducedMotion } = useViewportProfile();
  const centerHoldDelay = isMobileLike ? 0.95 : 1;
  const shouldReduceMotion = prefersReducedMotion || (lowMotion && !isMobileLike);
  const heroAnimate = { opacity: 1, x: 0, y: 0 };
  const leftInitial = shouldReduceMotion
    ? { opacity: 0, y: 16 }
    : isMobileLike
      ? { opacity: 1, x: 0, y: "20svh" }
      : { opacity: 1, x: "min(430px, 32vw)" };
  const rightInitial = shouldReduceMotion
    ? { opacity: 0, y: 16 }
    : isMobileLike
      ? { opacity: 0, x: 0, y: 18 }
      : { opacity: 0, x: "min(110px, 8vw)" };
  const leftTransition: Transition = shouldReduceMotion
    ? { duration: 0.42, ease: HERO_EASE }
    : { duration: isMobileLike ? 0.72 : 0.78, delay: centerHoldDelay, ease: HERO_EASE };
  const rightTransition: Transition = shouldReduceMotion
    ? { duration: 0.42, ease: HERO_EASE }
    : { duration: isMobileLike ? 0.62 : 0.72, delay: centerHoldDelay + 0.12, ease: HERO_EASE };
  const handleBrowseMore = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();

    const target = document.getElementById("thinking");
    if (!target) return;

    const top = target.getBoundingClientRect().top + window.scrollY;

    window.scrollTo({
      top,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
    window.history.pushState(null, "", "#thinking");
  };

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
            key={`hero-left-${isMobileLike ? "mobile" : "desktop"}`}
            initial={leftInitial}
            animate={heroAnimate}
            transition={leftTransition}
            className="home-hero-left"
          >
            <FloatingMiniWidgets />
            <p className="home-hero-eyebrow">Lucas Yin · 奇瑞汽车国际财务 BP</p>
            <h1 className="home-hero-title">
              <span className="gradient-text">Lucas<br />Yin</span>
            </h1>
            <p className="home-hero-slogan">
              用模型理解业务，用工具沉淀判断
            </p>
            <p className="home-hero-lede">
              这里收录我持续打磨的财务模型、分析方法和 AI 实践。
            </p>
          </motion.div>

          <motion.div
            key={`hero-right-${isMobileLike ? "mobile" : "desktop"}`}
            initial={rightInitial}
            animate={heroAnimate}
            transition={rightTransition}
            className="home-hero-right"
          >
            <div className="home-hero-right-stack">
              <div className="home-hero-copy-card home-hero-capability-trail" aria-label="能力链路">
                <p className="home-hero-kicker">Capability Path</p>
                <div className="home-hero-path-row">
                  <span className="home-hero-path-step">经营问题</span>
                  <ArrowRight className="home-hero-path-arrow" />
                  <span className="home-hero-path-step">财务模型</span>
                  <ArrowRight className="home-hero-path-arrow" />
                  <span className="home-hero-path-step">可视化分析</span>
                  <ArrowRight className="home-hero-path-arrow" />
                  <span className="home-hero-path-step">分析判断</span>
                  <ArrowRight className="home-hero-path-arrow" />
                  <span className="home-hero-path-step">业务结论</span>
                </div>
                <Link href="/finance" className="home-model-library-entry" aria-label="查看完整财务模型库">
                  <span>精选 4 个 · 共 6 个模型</span>
                  <strong>查看完整模型库</strong>
                  <ArrowRight className="home-model-library-icon" />
                </Link>
              </div>
              <HeroModelStage />
            </div>
          </motion.div>
        </div>

        <div className="home-hero-continue-row">
          <Link href="#thinking" className="home-hero-continue" onClick={handleBrowseMore}>
            <span>浏览更多</span>
            <ArrowDown style={{ width: 15, height: 15 }} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function FloatingMiniWidgets() {
  return (
    <div className="home-hero-floating-widgets" aria-hidden="true">
      <div className="home-mini-widget home-mini-widget-window">
        <div className="home-mini-widget-chrome">
          <span />
          <span />
          <span />
        </div>
        <div className="home-mini-widget-lines">
          <span />
          <span />
        </div>
      </div>
      <div className="home-mini-widget home-mini-widget-bars">
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
