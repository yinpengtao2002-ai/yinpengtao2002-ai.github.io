"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type TouchEvent,
} from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import FinanceModelPreview from "@/components/finance/FinanceModelPreview";
import { financeModelCategories, financeModels } from "@/lib/finance/modelRegistry";

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
  "price-volume-mix": {
    focus: "收入变化中的销量、单价与结构贡献",
    detail: "把预算、预测或实际之间的收入差异拆成销量贡献、价格贡献和结构组合贡献，适合做收入桥和汇报说明。",
    guide: "先看总收入差异，再拆销量、价格和结构贡献，最后决定优先解释规模、单车净收入还是组合变化。",
    points: ["收入桥", "价量拆解", "结构组合"],
  },
  "monthly-trend": {
    focus: "连续月份指标趋势与结构监控",
    detail: "用于查看连续月份中的同比、环比、同期对比、结构占比和集中度，帮助快速发现趋势变化。",
    guide: "先找趋势断点，再看同比环比和结构占比，最后回到具体维度确认异常来源。",
    points: ["连续月份明细", "同比环比观察", "结构与集中度"],
  },
  "working-capital": {
    focus: "库存、应收和应付带来的现金占用",
    detail: "用库存天数、应收天数和应付天数搭出现金转换周期，估算资金占用规模和相对目标的释放空间。",
    guide: "先看现金转换周期，再把资金占用拆到库存、应收和应付三条责任线。",
    points: ["现金周期", "资金占用", "释放空间"],
  },
  "sensitivity-analysis": {
    focus: "利润变量变化的情景推演",
    detail: "围绕销量、净收入、成本、费用和税费做假设调整，判断利润对关键变量的敏感程度。",
    guide: "先设置关键变量假设，再看利润影响排序，用敏感变量反推需要优先管理的经营动作。",
    points: ["利润情景测算", "变量敏感性排序", "目标利润倒推"],
  },
  "fx-exposure": {
    focus: "外币敞口、汇率变化与锁汇保护",
    detail: "把预算汇率、实际汇率、外币敞口和锁汇比例放在同一口径，判断汇率对收入或利润的影响。",
    guide: "先拆纯汇率影响，再看锁汇保护或机会成本，最后回到未锁敞口的风险。",
    points: ["汇率敏感性", "锁汇比例", "未锁敞口"],
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
  const layeredModels = useMemo(() => {
    if (!activeModel || switcherModels.length === 0) return [];

    const activeIndex = Math.max(
      switcherModels.findIndex((model) => model.slug === activeModel.slug),
      0,
    );

    return [0, 1, 2].map((offset) => switcherModels[(activeIndex + offset) % switcherModels.length]);
  }, [activeModel, switcherModels]);
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
              这里收录的是我自己搭建并持续打磨的财务模型和分析工具，适合从复盘、归因、趋势、收入桥、汇率和现金占用开始使用。
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
                  <span className="home-finance-category">
                    {getCategoryLabel(activeModel.categoryId)}
                  </span>
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
                      <span className="home-finance-category">
                        {getCategoryLabel(model.categoryId)}
                      </span>
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
            className="home-finance-operating-room home-finance-reveal"
            onMouseLeave={() => setActiveSlug(DEFAULT_MODEL_SLUG)}
            viewport={financeRevealViewport}
            initial={{ opacity: 0, y: 28, rotateX: 4, filter: "blur(6px)" }}
            whileInView={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.68, delay: 0.12, ease: financeEase }}
          >
            <div className="home-finance-layer-stack" aria-label="模型工作台层叠预览">
              {layeredModels.map((model, index) => {
                const detail = modelDetails[model.slug];
                return (
                  <motion.div
                    key={`finance-layer-${model.slug}`}
                    layoutId={`finance-depth-${model.slug}`}
                    className={`home-finance-depth-card is-layer-${index}`}
                    style={{
                      "--finance-depth-index": index,
                      "--finance-depth-shift": `${index * 22}px`,
                      "--finance-depth-scale": 1 - index * 0.045,
                      "--finance-depth-z": `${34 - index * 18}px`,
                      "--finance-depth-rotate": `${index * -0.8}deg`,
                    } as CSSProperties}
                    transition={{ duration: 0.42, ease: financeEase }}
                  >
                    <Link href={model.href} aria-label={`打开${model.title}`}>
                      <FinanceModelPreview
                        src={model.previewImage}
                        alt={model.previewAlt}
                        compact
                      />
                      <div className="home-finance-depth-copy">
                        <span>{getCategoryLabel(model.categoryId)}</span>
                        <strong>{model.title}</strong>
                        <p>{detail?.focus ?? model.summary}</p>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              className="home-finance-switcher home-finance-model-rail"
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
                    <button
                      type="button"
                      className={`home-finance-switch-card${isMobileActive ? " is-mobile-current" : ""}`}
                      aria-current={isActive ? "true" : undefined}
                      aria-label={`预览${model.title}`}
                      onClick={() => setActiveSlug(model.slug)}
                      onFocus={() => setActiveSlug(model.slug)}
                      onMouseEnter={() => setActiveSlug(model.slug)}
                    >
                      <FinanceModelPreview
                        src={model.previewImage}
                        alt={model.previewAlt}
                        compact
                      />
                      <div className="home-finance-switch-copy">
                        <span>{getCategoryLabel(model.categoryId)}</span>
                        <strong>{model.title}</strong>
                        <span className="home-finance-switch-open">
                          预览模型 <ArrowRight style={{ width: 13, height: 13 }} />
                        </span>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function getCategoryLabel(categoryId: string) {
  return financeModelCategories.find((category) => category.id === categoryId)?.label ?? "财务模型";
}
