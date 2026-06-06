"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import FinanceModelPreview from "@/components/finance/FinanceModelPreview";
import { financeModels, type FinanceModelItem } from "@/lib/finance/modelRegistry";

const MODEL_PROBLEMS: Record<string, string> = {
  "business-analysis": "判断利润差异来自销量、收入质量、边际变化，还是固定科目偏离。",
  "monthly-trend": "把连续月份变化整理成可比较的趋势，帮助发现异常月份和结构转折。",
  "profit-structure": "看清指标在不同维度路径里的分布关系，避免只看总数漏掉结构问题。",
  "sensitivity-analysis": "判断利润对销量、收入、成本和费用变化的敏感程度，辅助做假设取舍。",
  "margin-analysis": "拆开单车指标变化，到底是结构变化造成，还是同一维度下单车水平变化造成。",
  "perspective-bi": "在还没有明确分析路径时，先快速看清数据结构、维度关系和指标口径。",
};

export default function FinanceModelLibrary({ compact = false }: { compact?: boolean }) {
  const directoryClassName = [
    "finance-model-directory",
    compact ? "compact" : "",
  ].filter(Boolean).join(" ");

  return (
    <section className="finance-model-library">
      <div className={directoryClassName} aria-label="财务模型目录">
        <div className="finance-model-directory-head" aria-hidden="true">
          <span>预览</span>
          <span>财务模型</span>
          <span>适合场景</span>
          <span>解决问题</span>
          <span>入口</span>
        </div>
        {financeModels.map((model, index) => (
          <motion.article
            key={model.slug}
            className="finance-model-row-motion"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.04 }}
          >
            <Link
              href={model.href}
              className="finance-model-row finance-model-card-link"
            >
              <div className="finance-model-preview-cell" aria-hidden="true">
                <FinanceModelPreview
                  src={model.previewImage}
                  alt={model.previewAlt}
                  compact={compact}
                  priority={index === 0}
                />
              </div>
              <div className="finance-model-name-cell">
                <h3 className="finance-model-card-title">
                  {model.title}
                </h3>
                <span className="finance-model-kicker">
                  {modelKicker(model)}
                </span>
              </div>
              <div className="finance-model-scenario">
                <span className="finance-model-mobile-label">适合场景</span>
                <p>{scenarioText(model)}</p>
              </div>
              <div className="finance-model-problem">
                <span className="finance-model-mobile-label">解决问题</span>
                <p>{MODEL_PROBLEMS[model.slug]}</p>
              </div>
              <div className="finance-model-action-cell">
                <span className="finance-model-card-action">
                  打开模型 <ArrowRight />
                </span>
              </div>
            </Link>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function scenarioText(model: FinanceModelItem) {
  return model.aiGuide.scenarios.slice(0, 3).join("、");
}

function modelKicker(model: FinanceModelItem) {
  if (model.slug === "business-analysis") return "预算复盘";
  if (model.slug === "monthly-trend") return "趋势监控";
  if (model.slug === "sensitivity-analysis") return "情景推演";
  if (model.slug === "perspective-bi") return "数据探索";
  return "结构归因";
}
