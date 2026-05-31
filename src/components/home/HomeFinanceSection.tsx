"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type TouchEvent,
} from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import FinanceModelPreview from "@/components/finance/FinanceModelPreview";
import { financeModels } from "@/lib/finance/modelRegistry";

const DEFAULT_MODEL_SLUG = "margin-analysis";
const SWIPE_THRESHOLD = 46;
const MOBILE_FINANCE_QUERY = "(max-width: 768px)";
const financeRevealViewport = { once: true, amount: 0.3 } as const;
const financeEase = [0.22, 1, 0.36, 1] as const;
const financeSwitcherVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.18,
    },
  },
};
const financeSwitchCardVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.94 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

const modelDetails: Record<string, { focus: string; detail: string; guide: string; points: string[] }> = {
  "margin-analysis": {
    focus: "两期单车指标的结构效应与费率效应拆解",
    detail: "适合解释单车边际、单车收入或单车成本变化：到底是销量结构变了，还是同一维度下的单车水平变了。",
    guide: "先确认总差异，再拆结构效应和费率效应，最后判断问题来自组合变化还是单车水平变化。",
    points: ["两期数据对比", "结构 / 费率双拆解", "适合月度经营复盘"],
  },
  "business-analysis": {
    focus: "预算与实际的经营差异复盘",
    detail: "把销量、净收入、边际、固定科目和利润贡献串成一条复盘链路，支持按国家、车型等维度下钻。",
    guide: "先看预算差异落在哪个利润环节，再沿销量、净收入、边际和固定科目逐层下钻。",
    points: ["预算实际对比", "利润桥与差异桥", "维度下钻定位"],
  },
  "monthly-trend": {
    focus: "连续月份指标趋势与结构监控",
    detail: "用于查看连续月份中的同比、环比、同期对比、结构占比和集中度，帮助快速发现趋势变化。",
    guide: "先找趋势断点，再看同比环比和结构占比，最后回到具体维度确认异常来源。",
    points: ["连续月份明细", "同比环比观察", "结构与集中度"],
  },
  "profit-structure": {
    focus: "任意维度下的盈利结构诊断",
    detail: "上传通用经营明细后，按大区、国家、渠道、客户、业务单元或任意组合识别利润贡献和边际拖累项。",
    guide: "先选当前分析维度，再看盈利矩阵和分层贡献，最后回到明细表确认拖累项的规模和单车质量。",
    points: ["任意维度分析", "盈利分层矩阵", "拖累项识别"],
  },
  "sensitivity-analysis": {
    focus: "利润变量变化的情景推演",
    detail: "围绕销量、净收入、成本、费用和税费做假设调整，判断利润对关键变量的敏感程度。",
    guide: "先设置关键变量假设，再看利润影响排序，用敏感变量反推需要优先管理的经营动作。",
    points: ["利润情景测算", "变量敏感性排序", "目标利润倒推"],
  },
  "perspective-bi": {
    focus: "上传明细后的自助 BI 数据透视",
    detail: "适合先把 CSV 或 Excel 明细放进网页工作台，拖动字段、切换图表、筛选排序，快速判断数据里有什么。",
    guide: "先上传明细或查看示例数据，再用字段拖拽确认维度和指标，最后把清晰的问题带入专项模型。",
    points: ["自助 BI 透视", "字段拖拽分析", "上传明细探索"],
  },
};

export default function HomeFinanceSection() {
  const [activeSlug, setActiveSlug] = useState(DEFAULT_MODEL_SLUG);
  const [mobileCarouselIndex, setMobileCarouselIndex] = useState(0);
  const [mobileCarouselVisualIndex, setMobileCarouselVisualIndex] = useState(1);
  const [mobileCarouselTransitionEnabled, setMobileCarouselTransitionEnabled] = useState(true);
  const [mobileCarouselInteractionKey, setMobileCarouselInteractionKey] = useState(0);
  const mobileSwipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const mobileSwipeMovedRef = useRef(false);
  const suppressMobileSlideClickRef = useRef(false);
  const mobileCarouselResetFrameRef = useRef<number | null>(null);
  const defaultModel =
    financeModels.find((model) => model.slug === DEFAULT_MODEL_SLUG) ??
    financeModels.at(0);
  const activeModel =
    financeModels.find((model) => model.slug === activeSlug) ??
    defaultModel;
  const switcherModels = useMemo(
    () => [
      ...financeModels.filter((model) => model.slug === DEFAULT_MODEL_SLUG),
      ...financeModels.filter((model) => model.slug !== DEFAULT_MODEL_SLUG),
    ],
    [],
  );
  const mobileCarouselSlides = useMemo(() => {
    if (switcherModels.length <= 1) return switcherModels;
    return [switcherModels.at(-1)!, ...switcherModels, switcherModels[0]!];
  }, [switcherModels]);
  const restoreMobileCarouselTransition = useCallback(() => {
    if (mobileCarouselResetFrameRef.current) {
      window.cancelAnimationFrame(mobileCarouselResetFrameRef.current);
    }

    mobileCarouselResetFrameRef.current = window.requestAnimationFrame(() => {
      mobileCarouselResetFrameRef.current = window.requestAnimationFrame(() => {
        setMobileCarouselTransitionEnabled(true);
        mobileCarouselResetFrameRef.current = null;
      });
    });
  }, []);
  const updateMobileCarousel = useCallback((direction: 1 | -1) => {
    if (switcherModels.length <= 1) return;

    setMobileCarouselTransitionEnabled(true);
    setMobileCarouselIndex(
      (index) => (index + direction + switcherModels.length) % switcherModels.length,
    );
    setMobileCarouselVisualIndex((index) => index + direction);
  }, [switcherModels.length]);

  useEffect(() => {
    if (switcherModels.length <= 1) return;

    const timer = window.setInterval(() => {
      if (!window.matchMedia(MOBILE_FINANCE_QUERY).matches) return;

      updateMobileCarousel(1);
    }, 3600);

    return () => window.clearInterval(timer);
  }, [switcherModels.length, mobileCarouselInteractionKey, updateMobileCarousel]);

  useEffect(() => () => {
    if (mobileCarouselResetFrameRef.current) {
      window.cancelAnimationFrame(mobileCarouselResetFrameRef.current);
    }
  }, []);

  if (!activeModel) {
    return null;
  }

  const activeDetail = modelDetails[activeModel.slug];
  const selectMobileCarouselIndex = (index: number) => {
    setMobileCarouselTransitionEnabled(true);
    setMobileCarouselIndex(index);
    setMobileCarouselVisualIndex(index + 1);
    setMobileCarouselInteractionKey((key) => key + 1);
  };
  const handleMobileCarouselTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;

    mobileSwipeStartRef.current = { x: touch.clientX, y: touch.clientY };
    mobileSwipeMovedRef.current = false;
  };
  const handleMobileCarouselTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const start = mobileSwipeStartRef.current;
    const touch = event.touches[0];
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY)) {
      mobileSwipeMovedRef.current = true;
    }
  };
  const handleMobileCarouselTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = mobileSwipeStartRef.current;
    const touch = event.changedTouches[0];
    mobileSwipeStartRef.current = null;
    if (!start || !touch || switcherModels.length <= 1) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const isHorizontalSwipe =
      Math.abs(deltaX) >= SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * 1.15;
    if (!isHorizontalSwipe) return;

    suppressMobileSlideClickRef.current = true;
    setMobileCarouselInteractionKey((key) => key + 1);
    updateMobileCarousel(deltaX < 0 ? 1 : -1);
    window.setTimeout(() => {
      suppressMobileSlideClickRef.current = false;
    }, 260);
  };
  const handleMobileCarouselTransitionEnd = () => {
    if (switcherModels.length <= 1) return;

    if (mobileCarouselVisualIndex === 0) {
      setMobileCarouselTransitionEnabled(false);
      setMobileCarouselVisualIndex(switcherModels.length);
      restoreMobileCarouselTransition();
    }

    if (mobileCarouselVisualIndex === switcherModels.length + 1) {
      setMobileCarouselTransitionEnabled(false);
      setMobileCarouselVisualIndex(1);
      restoreMobileCarouselTransition();
    }
  };
  const handleMobileCarouselTouchCancel = () => {
    mobileSwipeStartRef.current = null;
    mobileSwipeMovedRef.current = false;
  };
  const handleMobileSlideClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!suppressMobileSlideClickRef.current && !mobileSwipeMovedRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    mobileSwipeMovedRef.current = false;
  };

  return (
    <section id="finance" className="home-viewport home-section home-finance-section">
      <div className="home-shell home-finance-shell">
        <motion.header
          className="home-finance-header home-finance-reveal"
          initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={financeRevealViewport}
          transition={{ duration: 0.58, ease: financeEase }}
        >
          <div className="home-finance-title-card">
            <h2 className="home-finance-title">
              问题驱动的模型库
            </h2>
            <p className="home-finance-intro">
              这里收录的是我自己搭建并持续打磨的财务模型和分析工具，适合从复盘、归因、趋势和情景推演开始使用。
            </p>
          </div>
          <Link href="/finance" className="home-finance-library-link" aria-label="查看完整财务模型列表">
            全部模型 <ArrowRight style={{ width: 15, height: 15 }} />
          </Link>
        </motion.header>

        <div className="home-finance-showcase">
          <motion.div
            className="home-finance-stage-frame home-finance-reveal"
            initial={{
              opacity: 0,
              y: 34,
              scale: 0.94,
              rotateX: 5,
              clipPath: "inset(10% 5% 8% 5% round 12px)",
              filter: "blur(4px)",
            }}
            whileInView={{
              opacity: 1,
              y: 0,
              scale: 1,
              rotateX: 0,
              clipPath: "inset(0% 0% 0% 0% round 8px)",
              filter: "blur(0px)",
            }}
            viewport={financeRevealViewport}
            transition={{ duration: 0.72, delay: 0.08, ease: financeEase }}
            style={{ transformPerspective: 1200, transformOrigin: "center bottom" }}
          >
            <Link href={activeModel.href} className="home-finance-stage">
              <div key={`finance-stage-${activeModel.slug}`} className="home-finance-stage-motion">
                <div className="home-finance-stage-copy">
                  <h3>{activeModel.title}</h3>
                  <p>{activeDetail?.focus ?? activeModel.summary}</p>
                  <div className="home-finance-detail">
                    {activeDetail?.detail ?? activeModel.summary}
                  </div>
                  {activeDetail?.guide ? (
                    <div className="home-finance-stage-guide">
                      <span>怎么看</span>
                      <p>{activeDetail.guide}</p>
                    </div>
                  ) : null}
                  <div className="home-finance-point-row">
                    {(activeDetail?.points ?? []).map((point) => (
                      <span key={point}>{point}</span>
                    ))}
                  </div>
                  <span className="home-finance-open">
                    打开模型 <ArrowRight style={{ width: 14, height: 14 }} />
                  </span>
                </div>
                <FinanceModelPreview
                  src={activeModel.previewImage}
                  alt={activeModel.previewAlt}
                  priority
                />
              </div>
            </Link>
          </motion.div>

          <motion.div
            className="home-finance-mobile-carousel home-finance-mobile-rise"
            aria-label="财务模型预览轮播"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={financeRevealViewport}
            transition={{ duration: 0.58, delay: 0.1, ease: financeEase }}
            onTouchStart={handleMobileCarouselTouchStart}
            onTouchMove={handleMobileCarouselTouchMove}
            onTouchEnd={handleMobileCarouselTouchEnd}
            onTouchCancel={handleMobileCarouselTouchCancel}
          >
            <div
              className="home-finance-mobile-track"
              onTransitionEnd={handleMobileCarouselTransitionEnd}
              style={{
                transform: `translateX(-${mobileCarouselVisualIndex * 100}%)`,
                transition: mobileCarouselTransitionEnabled ? undefined : "none",
              }}
            >
              {mobileCarouselSlides.map((model, slideIndex) => {
                const detail = modelDetails[model.slug];
                return (
                  <Link
                    key={`${model.slug}-${slideIndex}`}
                    href={model.href}
                    className="home-finance-mobile-slide"
                    onClick={handleMobileSlideClick}
                  >
                    <div className="home-finance-mobile-copy">
                      <h3>{model.title}</h3>
                      <p>{detail?.focus ?? model.summary}</p>
                    </div>
                    <FinanceModelPreview
                      src={model.previewImage}
                      alt={model.previewAlt}
                    />
                  </Link>
                );
              })}
            </div>
          </motion.div>

          <div className="home-finance-mobile-dots" aria-label="财务模型轮播位置">
            {switcherModels.map((model, index) => (
              <button
                key={model.slug}
                type="button"
                className={index === mobileCarouselIndex ? "is-current" : undefined}
                aria-label={`查看${model.title}`}
                aria-current={index === mobileCarouselIndex ? "true" : undefined}
                onClick={() => selectMobileCarouselIndex(index)}
              />
            ))}
          </div>

          <motion.div
            className="home-finance-switcher home-finance-reveal"
            onMouseLeave={() => setActiveSlug(DEFAULT_MODEL_SLUG)}
            variants={financeSwitcherVariants}
            initial="hidden"
            whileInView="visible"
            viewport={financeRevealViewport}
          >
            {switcherModels.map((model, index) => {
              const isActive = model.slug === activeModel.slug;
              const isMobileActive = index === mobileCarouselIndex;
              return (
                <motion.div
                  key={model.slug}
                  className="home-finance-switch-card-motion"
                  variants={financeSwitchCardVariants}
                  transition={{ duration: 0.46, ease: financeEase }}
                >
                  <Link
                    href={model.href}
                    className={`home-finance-switch-card${isMobileActive ? " is-mobile-current" : ""}`}
                    aria-current={isActive ? "true" : undefined}
                    onFocus={() => setActiveSlug(model.slug)}
                    onMouseEnter={() => setActiveSlug(model.slug)}
                  >
                    <FinanceModelPreview
                      src={model.previewImage}
                      alt={model.previewAlt}
                      compact
                    />
                    <div className="home-finance-switch-copy">
                      <strong>{model.title}</strong>
                      <span className="home-finance-switch-open">
                        打开模型 <ArrowRight style={{ width: 13, height: 13 }} />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
