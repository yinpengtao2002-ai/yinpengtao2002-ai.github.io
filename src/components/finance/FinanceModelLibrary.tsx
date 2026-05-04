"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { financeModelCategories, financeModels } from "@/lib/finance/modelRegistry";

const UI_FONT =
  'var(--font-poppins), "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';

export default function FinanceModelLibrary({ compact = false }: { compact?: boolean }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const visibleModels = activeCategory === "all"
    ? financeModels
    : financeModels.filter((model) => model.categoryId === activeCategory);

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

      <div style={{ display: "grid", gridTemplateColumns: compact ? "repeat(auto-fit, minmax(220px, 1fr))" : "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        {visibleModels.map((model, index) => (
          <motion.article
            key={model.slug}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.04 }}
          >
            <Link href={model.href} style={{ display: "block", height: "100%", textDecoration: "none" }}>
              <div style={{ height: "100%", padding: compact ? 16 : 20, border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)" }}>
                <span style={{ color: accentColor(model.accent), fontSize: 12, fontWeight: 800 }}>
                  {financeModelCategories.find((category) => category.id === model.categoryId)?.label}
                </span>
                <h3 style={{ margin: "10px 0 8px", color: "var(--foreground)", fontSize: compact ? 17 : 19, lineHeight: 1.35 }}>
                  {model.title}
                </h3>
                <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>
                  {model.summary}
                </p>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--foreground)", fontSize: 13, fontWeight: 800 }}>
                  打开模型 <ArrowRight style={{ width: 14, height: 14 }} />
                </span>
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
