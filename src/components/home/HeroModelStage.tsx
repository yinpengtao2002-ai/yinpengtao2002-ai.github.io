"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type TouchEvent } from "react";
import { ArrowRight } from "lucide-react";

const SWIPE_THRESHOLD = 46;
const STAGE_PRELOAD_DELAY = 720;

type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

const HERO_MODEL_STAGES = [
  {
    slug: "margin-analysis",
    question: "单车为什么变了？",
    label: "单车归因",
    title: "单车指标变动归因模型",
    description: "把两期单车变化拆成结构效应和费率效应，先定位问题来自组合变化，还是同一维度下的单车水平变化。",
    insight: "先看总差异，再看结构和费率谁在拉动。",
    metricLabel: "单车边际变化",
    metricValue: "+3.45%",
    href: "/finance/margin-analysis",
    previewImage: "/images/product-stage/unit-attribution-preview.png",
    previewAlt: "单车指标变动归因模型的瀑布图、指标卡和维度明细预览",
    accent: "#6a9bcc",
  },
  {
    slug: "business-analysis",
    question: "预算偏在哪里？",
    label: "预算复盘",
    title: "预算实际对比模型",
    description: "把销量、净收入、边际、固定科目和利润贡献串成一条复盘链路，适合从总差异一路下钻到经营原因。",
    insight: "预算差异不是一个数，而是一条经营链路。",
    metricLabel: "复盘链路",
    metricValue: "预算 → 利润",
    href: "/finance/business-analysis",
    previewImage: "/images/product-stage/budget-actual-preview.png",
    previewAlt: "预算实际对比模型的差异桥、利润桥、KPI 和维度表现预览",
    accent: "#d97757",
  },
  {
    slug: "monthly-trend",
    question: "趋势哪里异常？",
    label: "趋势监控",
    title: "分月指标趋势分析模型",
    description: "观察连续月份的同比、环比、结构占比和集中度，帮助从趋势线、热力图和结构变化里发现异常。",
    insight: "先看趋势断点，再回到结构和维度。",
    metricLabel: "连续月份",
    metricValue: "同比 / 环比",
    href: "/finance/monthly-trend",
    previewImage: "/images/product-stage/monthly-trend-preview.png",
    previewAlt: "分月指标趋势分析模型的趋势线、热力图、结构占比和月度指标预览",
    accent: "#788c5d",
  },
  {
    slug: "sensitivity-analysis",
    question: "哪个变量最影响利润？",
    label: "利润模拟",
    title: "利润敏感性分析",
    description: "围绕销量、净收入、成本、费用和税费做情景调整，快速判断利润对关键变量的敏感程度。",
    insight: "把假设变成排序，再把排序变成判断。",
    metricLabel: "利润影响",
    metricValue: "变量排序",
    href: "/finance/sensitivity-analysis",
    previewImage: "/images/product-stage/profit-sensitivity-preview.png",
    previewAlt: "利润敏感性分析的敏感性排序、利润瀑布、双变量矩阵和结果卡预览",
    accent: "#d97757",
  },
];

export default function HeroModelStage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadedImageSlugs, setLoadedImageSlugs] = useState(() => new Set<string>());
  const [shouldPreloadStageImages, setShouldPreloadStageImages] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchMovedRef = useRef(false);
  const activeStage = HERO_MODEL_STAGES[activeIndex] ?? HERO_MODEL_STAGES[0];
  const activeStageImageLoaded = loadedImageSlugs.has(activeStage.slug);

  useEffect(() => {
    const idleWindow = window as IdleWindow;
    const warmStageImages = () => setShouldPreloadStageImages(true);

    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(warmStageImages, { timeout: 1800 });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }

    const fallbackTimer = idleWindow.setTimeout(warmStageImages, STAGE_PRELOAD_DELAY);
    return () => idleWindow.clearTimeout(fallbackTimer);
  }, []);

  const markStageImageLoaded = (slug: string) => {
    setLoadedImageSlugs((current) => {
      if (current.has(slug)) return current;

      const next = new Set(current);
      next.add(slug);
      return next;
    });
  };

  const updateActiveStage = (direction: 1 | -1) => {
    setActiveIndex(
      (index) => (index + direction + HERO_MODEL_STAGES.length) % HERO_MODEL_STAGES.length,
    );
  };
  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;

    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    touchMovedRef.current = false;
  };
  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    const touch = event.touches[0];
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY)) {
      touchMovedRef.current = true;
    }
  };
  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const isHorizontalSwipe =
      Math.abs(deltaX) >= SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * 1.15;
    if (!touchMovedRef.current || !isHorizontalSwipe) return;

    updateActiveStage(deltaX < 0 ? 1 : -1);
    touchMovedRef.current = false;
  };

  return (
    <div
      className="home-hero-stage-shell"
      style={{ "--hero-stage-accent": activeStage.accent } as CSSProperties}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="home-hero-stage-panel" aria-live="polite">
        <div className="home-hero-stage-copy" key={`stage-copy-${activeStage.slug}`}>
          <span className="home-hero-stage-kicker">{activeStage.label}</span>
          <h3>{activeStage.title}</h3>
          <p>{activeStage.description}</p>
          <Link href={activeStage.href} className="home-hero-stage-link">
            进入这个模型 <ArrowRight style={{ width: 14, height: 14 }} />
          </Link>
        </div>

        <div className="home-hero-stage-preview" key={`stage-preview-${activeStage.slug}`}>
          <div
            className={`home-hero-stage-skeleton${activeStageImageLoaded ? " is-hidden" : ""}`}
            aria-hidden="true"
          >
            <div className="home-hero-stage-skeleton-window">
              <div className="home-hero-stage-skeleton-toolbar">
                <span />
                <span />
                <span />
              </div>
              <div className="home-hero-stage-skeleton-grid">
                <div className="home-hero-stage-skeleton-bars">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="home-hero-stage-skeleton-cards">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="home-hero-stage-skeleton-lines">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          </div>
          <Image
            src={activeStage.previewImage}
            alt={activeStage.previewAlt}
            fill
            priority={activeIndex === 0}
            draggable={false}
            sizes="(max-width: 768px) 92vw, 520px"
            className={`home-hero-stage-image${activeStageImageLoaded ? " is-loaded" : ""}`}
            onLoad={() => markStageImageLoaded(activeStage.slug)}
          />
          <div className="home-hero-stage-float home-hero-stage-float-metric">
            <span>{activeStage.metricLabel}</span>
            <strong>{activeStage.metricValue}</strong>
          </div>
          <div className="home-hero-stage-float home-hero-stage-float-note">
            {activeStage.insight}
          </div>
          <div className="home-hero-stage-scan" aria-hidden="true" />
        </div>
      </div>

      <div className="home-hero-stage-dots" aria-label="当前模型轮播位置">
        {HERO_MODEL_STAGES.map((stage, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={stage.slug}
              type="button"
              className={`home-hero-stage-dot${isActive ? " is-active" : ""}`}
              aria-label={`切换到${stage.label}`}
              aria-current={isActive ? "true" : undefined}
              onClick={() => setActiveIndex(index)}
            />
          );
        })}
      </div>

      <div className="home-hero-stage-picker" aria-label="选择一个经营问题，进入对应模型">
        {HERO_MODEL_STAGES.map((stage, index) => {
          const isActive = index === activeIndex;
          return (
            <Link
              key={stage.slug}
              href={stage.href}
              className={`home-hero-stage-tab${isActive ? " is-active" : ""}`}
              aria-current={isActive ? "true" : undefined}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
            >
              <span>{stage.label}</span>
              <strong>{stage.question}</strong>
            </Link>
          );
        })}
      </div>

      {shouldPreloadStageImages ? (
        <div className="home-hero-stage-preloader" aria-hidden="true">
          {HERO_MODEL_STAGES.map((stage) => (
            <Image
              key={`preload-${stage.slug}`}
              src={stage.previewImage}
              alt=""
              width={640}
              height={420}
              loading="eager"
              fetchPriority="low"
              draggable={false}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
