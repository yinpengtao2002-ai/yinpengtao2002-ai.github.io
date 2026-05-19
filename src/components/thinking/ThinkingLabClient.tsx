"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ContentItem } from "@/lib/data/generated/content";

const UI_FONT =
  'var(--font-poppins), "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';

const THINKING_CATEGORY_ORDER = ["全部", "工具", "AI创作", "思考记录"];

function getDisplayCategory(item: ContentItem) {
  if (item.source === "hosted-tool") {
    return "工具";
  }

  if (item.legacyCategory === "ai") {
    return "AI创作";
  }

  if (item.legacyCategory === "finance" || item.legacyCategory === "essays") {
    return "思考记录";
  }

  return "思考记录";
}

export default function ThinkingLabClient({ articles }: { articles: ContentItem[] }) {
  const categories = useMemo(() => {
    return THINKING_CATEGORY_ORDER.filter((category) => {
      if (category === "全部") {
        return true;
      }

      return articles.some((item) => getDisplayCategory(item) === category);
    });
  }, [articles]);
  const [activeCategory, setActiveCategory] = useState("全部");
  const visibleArticles = activeCategory === "全部"
    ? articles
    : articles.filter((item) => getDisplayCategory(item) === activeCategory);

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)", fontFamily: UI_FONT }}>
      <section
        className="thinking-index-hero"
        style={{ maxWidth: 1040, margin: "0 auto", padding: "5.5rem 1.5rem 1.6rem" }}
      >
        <p style={{ color: "var(--accent)", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
          Tools & Thinking
        </p>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1.1, letterSpacing: 0, marginBottom: 16 }}>
          工具与思考
        </h1>
        <p style={{ maxWidth: 620, color: "var(--muted)", lineHeight: 1.8, fontSize: 15 }}>
          这里放我在经营分析、工具实践、市场观察里的思考样本。重点不是经历罗列，而是判断如何形成。
        </p>
      </section>

      <section
        className="thinking-index-list"
        style={{ maxWidth: 1040, margin: "0 auto", padding: "0 1.5rem 2rem" }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              style={pillStyle(activeCategory === category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          {visibleArticles.map((article, index) => (
            <motion.article
              key={article.slug}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: index * 0.04 }}
            >
              <Link href={article.href} style={{ display: "block", height: "100%", textDecoration: "none" }}>
                <div style={{ height: "100%", border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                    <span style={{ color: "var(--accent)", fontSize: 12, fontWeight: 700 }}>{getDisplayCategory(article)}</span>
                    <span style={{ color: "var(--muted)", fontSize: 12 }}>{article.date}</span>
                  </div>
                  <h2 style={{ fontSize: 18, lineHeight: 1.35, color: "var(--foreground)", marginBottom: 10 }}>
                    {article.title}
                  </h2>
                  <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>
                    {article.description}
                  </p>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--foreground)", fontSize: 13, fontWeight: 700 }}>
                    阅读 <ArrowRight style={{ width: 14, height: 14 }} />
                  </span>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </section>
    </div>
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
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}
