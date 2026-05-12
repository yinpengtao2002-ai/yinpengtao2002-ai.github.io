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
import { motion, useScroll, useTransform } from "framer-motion";
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

type ModelDetail = {
  focus: string;
  detail: string;
  guide: string;
  command: string;
  points: string[];
  ledger: { label: string; value: string; note: string }[];
  responsibilityPath: string[];
  liveBrief: { signal: string; action: string };
};

const modelDetails: Record<string, ModelDetail> = {
  "margin-analysis": {
    focus: "两期单车指标的结构效应与费率效应拆解",
    detail: "适合解释单车边际、单车收入或单车成本变化：到底是销量结构变了，还是同一维度下的单车水平变了。",
    guide: "先确认总差异，再拆结构效应和费率效应，最后判断问题来自组合变化还是单车水平变化。",
    command: "结构效应和费率效应分开复核，避免把组合变化误判成经营效率。",
    points: ["两期数据对比", "结构 / 费率双拆解", "适合月度经营复盘"],
    ledger: [
      { label: "主口径", value: "单车边际", note: "两期可比" },
      { label: "拆解线", value: "结构 / 费率", note: "先总后分" },
      { label: "责任线", value: "车型 / 国家", note: "回到动作" },
    ],
    responsibilityPath: ["车型结构", "国家组合", "单车水平"],
    liveBrief: {
      signal: "差异先进入结构桥，再判断同一车型或国家下的单车水平。",
      action: "把最大的负向条目带入下一页表格复核。",
    },
  },
  "business-analysis": {
    focus: "预算与实际的经营差异复盘",
    detail: "把销量、净收入、边际、固定科目和利润贡献串成一条复盘链路，支持按国家、车型等维度下钻。",
    guide: "先看预算差异落在哪个利润环节，再沿销量、净收入、边际和固定科目逐层下钻。",
    command: "按利润链路追差异，先锁定环节，再进入国家、车型和科目责任线。",
    points: ["预算实际对比", "利润桥与差异桥", "维度下钻定位"],
    ledger: [
      { label: "主口径", value: "预算 - 实际", note: "利润链" },
      { label: "拆解线", value: "销量 / 净收 / 边际", note: "逐层下钻" },
      { label: "责任线", value: "区域 / 科目", note: "可复核" },
    ],
    responsibilityPath: ["利润环节", "区域国家", "固定科目"],
    liveBrief: {
      signal: "预算偏差必须先落到利润链路，不能只看总差异。",
      action: "优先打开偏差最大的利润环节。",
    },
  },
  "price-volume-mix": {
    focus: "收入变化中的销量、单价与结构贡献",
    detail: "把预算、预测或实际之间的收入差异拆成销量贡献、价格贡献和结构组合贡献，适合做收入桥和汇报说明。",
    guide: "先看总收入差异，再拆销量、价格和结构贡献，最后决定优先解释规模、单车净收入还是组合变化。",
    command: "先把收入差异拆成销量、价格、结构三条线，再回到国家和车型组合。",
    points: ["收入桥", "价量拆解", "结构组合"],
    ledger: [
      { label: "主口径", value: "收入差异", note: "预算 / 实际" },
      { label: "拆解线", value: "量 / 价 / 结构", note: "三段桥" },
      { label: "责任线", value: "国家 / 车型", note: "解释质量" },
    ],
    responsibilityPath: ["规模兑现", "单车净收", "组合质量"],
    liveBrief: {
      signal: "收入增长不等于质量改善，结构贡献要单独列示。",
      action: "把正负结构影响拆到国家和车型。",
    },
  },
  "monthly-trend": {
    focus: "连续月份指标趋势与结构监控",
    detail: "用于查看连续月份中的同比、环比、同期对比、结构占比和集中度，帮助快速发现趋势变化。",
    guide: "先找趋势断点，再看同比环比和结构占比，最后回到具体维度确认异常来源。",
    command: "先找月份断点，再把同比、环比和结构占比带到同一张趋势图里。",
    points: ["连续月份明细", "同比环比观察", "结构与集中度"],
    ledger: [
      { label: "主口径", value: "月度趋势", note: "连续观察" },
      { label: "拆解线", value: "同比 / 环比", note: "定位断点" },
      { label: "责任线", value: "维度过滤", note: "回到明细" },
    ],
    responsibilityPath: ["趋势断点", "结构占比", "异常维度"],
    liveBrief: {
      signal: "连续月份先看拐点，不急着解释单月波动。",
      action: "把断点月份下钻到维度过滤器。",
    },
  },
  "working-capital": {
    focus: "库存、应收和应付带来的现金占用",
    detail: "用库存天数、应收天数和应付天数搭出现金转换周期，估算资金占用规模和相对目标的释放空间。",
    guide: "先看现金转换周期，再把资金占用拆到库存、应收和应付三条责任线。",
    command: "把现金占用拆到库存、应收、应付三条线，先给释放空间，再给动作。",
    points: ["现金周期", "资金占用", "释放空间"],
    ledger: [
      { label: "主口径", value: "现金周期", note: "库存+应收-应付" },
      { label: "拆解线", value: "占用 / 缓冲", note: "正负分开" },
      { label: "责任线", value: "供应链 / 信控", note: "动作明确" },
    ],
    responsibilityPath: ["库存周转", "销售回款", "供应账期"],
    liveBrief: {
      signal: "现金压力必须拆成占用和缓冲，才知道哪条线能释放。",
      action: "优先比较库存天数和应收天数。",
    },
  },
  "sensitivity-analysis": {
    focus: "利润变量变化的情景推演",
    detail: "围绕销量、净收入、成本、费用和税费做假设调整，判断利润对关键变量的敏感程度。",
    guide: "先设置关键变量假设，再看利润影响排序，用敏感变量反推需要优先管理的经营动作。",
    command: "先跑关键变量弹性，再判断目标利润靠哪条经营杠杆达成。",
    points: ["利润情景测算", "变量敏感性排序", "目标利润倒推"],
    ledger: [
      { label: "主口径", value: "利润弹性", note: "变量假设" },
      { label: "拆解线", value: "销量 / 单车 / 成本", note: "排序比较" },
      { label: "责任线", value: "经营杠杆", note: "目标倒推" },
    ],
    responsibilityPath: ["关键变量", "利润敏感性", "目标倒推"],
    liveBrief: {
      signal: "不要只看一个情景，先比较变量弹性排序。",
      action: "从利润影响最大的变量开始调整。",
    },
  },
  "fx-exposure": {
    focus: "外币敞口、汇率变化与锁汇保护",
    detail: "把预算汇率、实际汇率、外币敞口和锁汇比例放在同一口径，判断汇率对收入或利润的影响。",
    guide: "先拆纯汇率影响，再看锁汇保护或机会成本，最后回到未锁敞口的风险。",
    command: "把纯汇率、锁汇保护和未锁敞口分开，不把汇率贡献混进经营质量。",
    points: ["汇率敏感性", "锁汇比例", "未锁敞口"],
    ledger: [
      { label: "主口径", value: "汇率净影响", note: "预算 / 实际" },
      { label: "拆解线", value: "现货 / 锁汇", note: "机会成本" },
      { label: "责任线", value: "资金 / 业务", note: "敞口管理" },
    ],
    responsibilityPath: ["预算汇率", "锁汇策略", "未锁敞口"],
    liveBrief: {
      signal: "汇率桥要和经营桥分开汇报，否则会误判业务质量。",
      action: "先看未锁敞口，再判断锁汇保护是否足够。",
    },
  },
};

export default function HomeFinanceSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeSlug, setActiveSlug] = useState(DEFAULT_MODEL_SLUG);
  const [mobileCarouselIndex, setMobileCarouselIndex] = useState(0);
  const [mobileCarouselVisualIndex, setMobileCarouselVisualIndex] = useState(1);
  const [mobileCarouselTransitionEnabled, setMobileCarouselTransitionEnabled] = useState(true);
  const [mobileCarouselInteractionKey, setMobileCarouselInteractionKey] = useState(0);
  const mobileSwipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const mobileSwipeMovedRef = useRef(false);
  const suppressMobileSlideClickRef = useRef(false);
  const mobileCarouselResetFrameRef = useRef<number | null>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const commandY = useTransform(scrollYProgress, [0, 0.42, 1], [26, 0, -18]);
  const stageY = useTransform(scrollYProgress, [0.08, 0.56, 0.94], [34, 0, -22]);
  const cockpitY = useTransform(scrollYProgress, [0.12, 0.58, 0.96], [50, 0, -28]);
  const cockpitRotate = useTransform(scrollYProgress, [0.12, 0.58, 0.96], [3, 0, -1.5]);
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
    <section
      ref={sectionRef}
      id="finance"
      className="home-viewport home-section home-finance-section"
    >
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

        <motion.div
          className="home-finance-command-strip"
          style={{ y: commandY }}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={financeRevealViewport}
          transition={{ duration: 0.52, delay: 0.04, ease: financeEase }}
        >
          <span>当前模型</span>
          <strong>{activeModel.title}</strong>
          <em>{activeDetail?.command ?? activeModel.summary}</em>
          <Link href={activeModel.href} aria-label={`打开${activeModel.title}`}>
            进入 <ArrowRight aria-hidden="true" />
          </Link>
        </motion.div>

        <div className="home-finance-showcase home-finance-cockpit-grid">
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
            style={{ transformPerspective: 1200, transformOrigin: "center bottom", y: stageY }}
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
            style={{ y: cockpitY, rotateX: cockpitRotate }}
          >
            <div className="home-finance-floating-ledger" aria-label="当前模型关键口径">
              {(activeDetail?.ledger ?? []).map((item) => (
                <article key={`${activeModel.slug}-${item.label}`}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <em>{item.note}</em>
                </article>
              ))}
            </div>

            <div className="home-finance-live-brief">
              <span>Live brief</span>
              <strong>{activeDetail?.liveBrief.signal}</strong>
              <p>{activeDetail?.liveBrief.action}</p>
            </div>

            <div className="home-finance-responsibility-path" aria-label="责任线">
              {(activeDetail?.responsibilityPath ?? []).map((item, index) => (
                <span key={`${activeModel.slug}-${item}`}>
                  {String(index + 1).padStart(2, "0")} {item}
                </span>
              ))}
            </div>

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
