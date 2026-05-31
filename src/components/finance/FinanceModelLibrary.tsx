"use client";

import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import FinanceModelPreview from "@/components/finance/FinanceModelPreview";
import { financeModels } from "@/lib/finance/modelRegistry";

const UI_FONT =
  'var(--font-poppins), "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';

export default function FinanceModelLibrary({ compact = false }: { compact?: boolean }) {
  const gridClassName = [
    "finance-model-library-grid",
    compact ? "compact" : "",
  ].filter(Boolean).join(" ");

  return (
    <section style={{ width: "100%", fontFamily: UI_FONT }}>
      <div className={gridClassName}>
        {financeModels.map((model, index) => (
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

function accentColor(accent: string) {
  if (accent === "orange") return "var(--accent)";
  if (accent === "green") return "var(--accent-tertiary)";
  return "var(--accent-secondary)";
}
