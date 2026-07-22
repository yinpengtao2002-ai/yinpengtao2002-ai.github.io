"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, BookOpenCheck, Captions, Gamepad2, Wrench } from "lucide-react";
import type { ContentItem } from "@/lib/data/generated/content";

const THINKING_CATEGORY_ORDER = ["全部", "AI创作", "思考记录"];

const TOOL_SHORT_COPY = {
  "study-cards": "英文文章 → 单词卡",
  "subtitle-workbench": "视频/音频 → 字幕总结",
  "goalkeeper-landscape": "横屏守门挑战",
};

const TOOL_ICONS = {
  "study-cards": BookOpenCheck,
  "subtitle-workbench": Captions,
  "goalkeeper-landscape": Gamepad2,
};

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

function normalizeRequestedCategory(value: string | null, categories: string[]) {
  if (!value) return "全部";

  try {
    const category = decodeURIComponent(value);
    return categories.includes(category) ? category : "全部";
  } catch {
    return "全部";
  }
}

export default function ThinkingLabClient({ articles }: { articles: ContentItem[] }) {
  const searchParams = useSearchParams();
  const toolItems = useMemo(() => articles.filter((item) => item.source === "hosted-tool"), [articles]);
  const contentItems = useMemo(() => articles.filter((item) => item.source !== "hosted-tool"), [articles]);
  const categories = useMemo(() => {
    return THINKING_CATEGORY_ORDER.filter((category) => {
      if (category === "全部") {
        return true;
      }

      return contentItems.some((item) => getDisplayCategory(item) === category);
    });
  }, [contentItems]);
  const requestedCategory = useMemo(() => {
    return normalizeRequestedCategory(searchParams.get("category"), categories);
  }, [categories, searchParams]);
  const [activeCategory, setActiveCategory] = useState(requestedCategory);
  useEffect(() => {
    setActiveCategory(requestedCategory);
  }, [requestedCategory]);
  const visibleArticles = activeCategory === "全部"
    ? contentItems
    : contentItems.filter((item) => getDisplayCategory(item) === activeCategory);

  return (
    <div className="thinking-index-page">
      <div className="thinking-index-shell">
        <section className="thinking-index-hero">
          <p className="thinking-index-eyebrow">
            TOOLS & THINKING
          </p>
          <h1 className="thinking-index-title">
            工具与思考
          </h1>
          <p className="thinking-index-intro">
            可直接打开的 AI 工具、创作片段与思考记录。
          </p>
        </section>

        <div className="thinking-main-grid">
          <section className="thinking-content-panel" aria-labelledby="thinking-content-title">
            <div className="thinking-panel-head">
              <h2 id="thinking-content-title">思考内容</h2>
              <div className="thinking-filter-chips" aria-label="内容分类">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`thinking-filter-chip${activeCategory === category ? " active" : ""}`}
                  >
                    <span>{category}</span>
                    <span>{categoryCount(category, contentItems)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="thinking-article-list">
              {visibleArticles.map((article, index) => (
                <motion.article
                  key={article.slug}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, delay: index * 0.035 }}
                >
                  <Link href={article.href} className="thinking-article-card">
                    <span className="thinking-article-main">
                      <strong className="thinking-article-title">{article.title}</strong>
                      <span className="thinking-article-desc">{article.description}</span>
                    </span>
                    <span className="thinking-article-type">{getDisplayCategory(article)}</span>
                    <span className="thinking-article-action">
                      阅读 <ArrowRight aria-hidden="true" />
                    </span>
                  </Link>
                </motion.article>
              ))}
            </div>
          </section>

          <aside className="thinking-tools-panel" aria-labelledby="thinking-tools-title">
            <div className="thinking-panel-head compact">
              <h2 id="thinking-tools-title">快捷工具</h2>
            </div>

            <div className="thinking-tool-list">
              {toolItems.map((tool, index) => {
                const ToolIcon = TOOL_ICONS[tool.slug as keyof typeof TOOL_ICONS] ?? Wrench;
                const toolCopy = TOOL_SHORT_COPY[tool.slug as keyof typeof TOOL_SHORT_COPY] ?? tool.description;

                return (
                  <motion.article
                    key={tool.slug}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: index * 0.04 }}
                  >
                    <Link href={tool.href} className="thinking-tool-card">
                      <span className="thinking-tool-icon" aria-hidden="true">
                        <ToolIcon aria-hidden="true" />
                      </span>
                      <span className="thinking-tool-copy">
                        <strong className="thinking-tool-name">{tool.title}</strong>
                        <span className="thinking-tool-desc">{toolCopy}</span>
                      </span>
                      <span className="thinking-tool-action">
                        打开工具 <ArrowRight aria-hidden="true" />
                      </span>
                    </Link>
                  </motion.article>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function categoryCount(category: string, items: ContentItem[]) {
  if (category === "全部") return items.length;
  return items.filter((item) => getDisplayCategory(item) === category).length;
}
