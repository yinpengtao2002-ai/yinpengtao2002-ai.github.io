"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import FinanceModelPreview from "@/components/finance/FinanceModelPreview";
import { financeModels } from "@/lib/finance/modelRegistry";

export default function FinanceModelLibrary({ compact = false }: { compact?: boolean }) {
  const gridClassName = [
    "finance-model-library-grid",
    compact ? "compact" : "",
  ].filter(Boolean).join(" ");

  return (
    <section className="finance-model-library">
      <div className={gridClassName} aria-label="财务模型库">
        {financeModels.map((model, index) => (
          <motion.article
            key={model.slug}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.04 }}
          >
            <Link href={model.href} className="finance-model-card-link">
              <div className="finance-model-card">
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
                    打开模型 <ArrowRight />
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
