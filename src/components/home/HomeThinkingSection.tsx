"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import { thinkingContent } from "@/lib/data/generated/content";

export default function HomeThinkingSection() {
  const latest = thinkingContent.slice(0, 4);

  return (
    <section id="thinking" className="home-viewport home-section home-thinking-section">
      <motion.div
        className="home-shell home-thinking-method-index home-thinking-reveal"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.28 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="home-thinking-visual-card">
          <Image
            src="/images/home/thinking-methods-tech.png"
            alt="思考与方法内容预览"
            fill
            sizes="(max-width: 768px) 100vw, 360px"
            className="home-thinking-visual-image"
          />
          <div className="home-thinking-visual-shade" aria-hidden="true" />
          <div className="home-thinking-visual-copy">
            <p className="home-thinking-kicker">Thinking Lab</p>
            <h2>思考与方法</h2>
            <Link href="/thinking-lab" className="home-thinking-all-link">
              查看全部 <ArrowRight style={{ width: 15, height: 15 }} />
            </Link>
          </div>
        </div>

        <div className="home-thinking-list">
          {latest.map((article, index) => (
            <Link
              key={article.slug}
              href={article.href}
              className="home-thinking-item"
              style={{ "--thinking-item-index": index } as CSSProperties}
            >
              <span>{article.date}</span>
              <h3>{article.title}</h3>
              <p>
                <strong>方法摘句：</strong>
                {article.description}
              </p>
            </Link>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
