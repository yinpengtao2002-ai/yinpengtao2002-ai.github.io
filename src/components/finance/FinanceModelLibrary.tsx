"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import FinanceModelPreview from "@/components/finance/FinanceModelPreview";
import { financeModelCategories, financeModels } from "@/lib/finance/modelRegistry";

const UI_FONT =
  'var(--font-poppins), "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';

export default function FinanceModelLibrary({ compact = false }: { compact?: boolean }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const isFiltered = activeCategory !== "all";
  const visibleModels = activeCategory === "all"
    ? financeModels
    : financeModels.filter((model) => model.categoryId === activeCategory);
  const gridClassName = [
    "finance-model-library-grid",
    compact ? "compact" : "",
    isFiltered ? "filtered" : "",
  ].filter(Boolean).join(" ");

  return (
    <section style={{ width: "100%", fontFamily: UI_FONT }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => setActiveCategory("all")}
          style={pillStyle(activeCategory === "all")}
        >
          全部模型
        </button>
        {financeModelCategories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setActiveCategory(category.id)}
            style={pillStyle(activeCategory === category.id)}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className={gridClassName}>
        {visibleModels.map((model, index) => (
          <motion.article
            key={model.slug}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.04 }}
          >
            <Link href={model.href} className="finance-model-card-link">
              <div
                className="finance-model-card"
                style={{ "--finance-card-accent": accentColor(model.accent) } as CSSProperties}
              >
                <FinanceModelPreview
                  src={model.previewImage}
                  alt={model.previewAlt}
                  compact={compact}
                  priority={index === 0}
                />
                <div className="finance-model-card-body">
                  <span className="finance-model-card-category">
                    {financeModelCategories.find((category) => category.id === model.categoryId)?.label}
                  </span>
                  <h3 className="finance-model-card-title">
                    {model.title}
                  </h3>
                  <p className="finance-model-card-summary">
                    {model.summary}
                  </p>
                  <span className="finance-model-card-action">
                    打开模型 <ArrowRight style={{ width: 14, height: 14 }} />
                  </span>
                </div>
              </div>
            </Link>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function pillStyle(active: boolean): CSSProperties {
  return {
    minHeight: 36,
    padding: "0 14px",
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: active ? "var(--foreground)" : "var(--card)",
    color: active ? "var(--background)" : "var(--foreground)",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

function accentColor(accent: string) {
  if (accent === "orange") return "var(--accent)";
  if (accent === "green") return "var(--accent-tertiary)";
  return "var(--accent-secondary)";
}
