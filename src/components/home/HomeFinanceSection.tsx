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
import { ArrowRight } from "lucide-react";
import FinanceModelPreview from "@/components/finance/FinanceModelPreview";
import { financeModelCategories, financeModels } from "@/lib/finance/modelRegistry";

const DEFAULT_MODEL_SLUG = "margin-analysis";
const SWIPE_THRESHOLD = 46;

const modelDetails: Record<string, { focus: string; detail: string; points: string[] }> = {
  "margin-analysis": {
    focus: "两期单车指标的结构效应与费率效应拆解",
    detail: "适合解释单车边际、单车收入或单车成本变化：到底是销量结构变了，还是同一维度下的单车水平变了。",
    points: ["两期数据对比", "结构 / 费率双拆解", "适合月度经营复盘"],
  },
  "business-analysis": {
    focus: "预算与实际的经营差异复盘",
    detail: "把销量、净收入、边际、固定科目和利润贡献串成一条复盘链路，支持按国家、车型等维度下钻。",
    points: ["预算实际对比", "利润桥与差异桥", "维度下钻定位"],
  },
  "monthly-trend": {
    focus: "连续月份指标趋势与结构监控",
    detail: "用于查看连续月份中的同比、环比、同期对比、结构占比和集中度，帮助快速发现趋势变化。",
    points: ["连续月份明细", "同比环比观察", "结构与集中度"],
  },
  "sensitivity-analysis": {
    focus: "利润变量变化的情景推演",
    detail: "围绕销量、净收入、成本、费用和税费做假设调整，判断利润对关键变量的敏感程度。",
    points: ["利润情景测算", "变量敏感性排序", "目标利润倒推"],
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
        <header className="home-finance-header">
          <div>
            <p className="home-finance-kicker">Finance Model Library</p>
            <h2 className="home-finance-title">按经营问题进入模型</h2>
            <p className="home-finance-intro">
              四个模型对应四类常见经营问题。默认展示单车指标变动归因模型，移动鼠标即可切换预览。
            </p>
          </div>
          <Link href="/finance" className="home-finance-library-link">
            全部模型 <ArrowRight style={{ width: 15, height: 15 }} />
          </Link>
        </header>

        <div className="home-finance-showcase">
          <Link href={activeModel.href} className="home-finance-stage">
            <div className="home-finance-stage-copy">
              <span className="home-finance-category">
                {getCategoryLabel(activeModel.categoryId)}
              </span>
              <h3>{activeModel.title}</h3>
              <p>{activeDetail?.focus ?? activeModel.summary}</p>
              <div className="home-finance-detail">
                {activeDetail?.detail ?? activeModel.summary}
              </div>
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
          </Link>

          <div
            className="home-finance-mobile-carousel"
            aria-label="财务模型预览轮播"
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
          </div>

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

          <div
            className="home-finance-switcher"
            onMouseLeave={() => setActiveSlug(DEFAULT_MODEL_SLUG)}
          >
            {switcherModels.map((model, index) => {
              const isActive = model.slug === activeModel.slug;
              const isMobileActive = index === mobileCarouselIndex;
              return (
                <Link
                  key={model.slug}
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
                    <span>{getCategoryLabel(model.categoryId)}</span>
                    <strong>{model.title}</strong>
                    <span className="home-finance-switch-open">
                      打开模型 <ArrowRight style={{ width: 13, height: 13 }} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function getCategoryLabel(categoryId: string) {
  return financeModelCategories.find((category) => category.id === categoryId)?.label ?? "财务模型";
}
