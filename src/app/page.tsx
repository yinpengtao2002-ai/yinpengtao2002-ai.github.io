"use client";

import { motion } from "framer-motion";
import { Hero } from "@/components/layout";
import { siteConfig } from "@/lib/config/site";
import { sections } from "@/lib/data/sections";
import { aiContent, financeContent } from "@/lib/data/generated/content";
import Link from "next/link";
import {
  ArrowRight,
  Github,
  Mail,
  MessageCircle,
  TrendingUp,
  Sparkles,
  Code2,
  BarChart3,
} from "lucide-react";

const skillIcons = [BarChart3, TrendingUp, Sparkles, Code2];

export default function Home() {
  const allArticles = [...financeContent, ...aiContent];

  return (
    <>
      {/* Hero */}
      <Hero name={siteConfig.name} subtitle={siteConfig.subtitle} />

      {/* ===================== ABOUT ===================== */}
      <section id="about" className="relative py-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent via-[var(--border)] to-transparent" />

        <div className="max-w-2xl mx-auto px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8 }}
          >
            <p
              className="text-sm uppercase tracking-[0.4em] mb-6"
              style={{ color: "var(--accent)" }}
            >
              About
            </p>
            <h2
              className="text-4xl md:text-5xl font-bold mb-8 leading-tight"
              style={{ color: "var(--foreground)" }}
            >
              你好，我是
              <span className="gradient-text">
                {" "}{siteConfig.author.chineseName}
              </span>
            </h2>
            <p
              className="text-lg md:text-xl leading-relaxed mb-6"
              style={{ color: "var(--muted)" }}
            >
              对金融建模与人工智能充满热情。
              <br />
              我相信技术的力量在于解决真实的问题。
            </p>
            <p
              className="text-base italic"
              style={{ color: "var(--accent)" }}
            >
              &ldquo;{siteConfig.description}&rdquo;
            </p>
          </motion.div>

          {/* Skill pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-3 mt-14"
          >
            {[
              { label: "金融建模", en: "Financial Modeling" },
              { label: "数据分析", en: "Data Analysis" },
              { label: "人工智能", en: "AI & ML" },
              { label: "全栈开发", en: "Full Stack" },
            ].map((skill, i) => {
              const Icon = skillIcons[i];
              return (
                <motion.div
                  key={skill.label}
                  whileHover={{ y: -3 }}
                  className="flex items-center gap-2.5 px-5 py-2.5 rounded-full border transition-all duration-300"
                  style={{
                    background: "var(--card)",
                    borderColor: "var(--border)",
                  }}
                >
                  <Icon className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    {skill.label}
                  </span>
                  <span className="text-xs hidden sm:inline" style={{ color: "var(--muted)" }}>
                    {skill.en}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ===================== EXPLORE SECTIONS ===================== */}
      <section className="py-32">
        <div className="max-w-2xl mx-auto px-8 text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8 }}
          >
            <p
              className="text-sm uppercase tracking-[0.4em] mb-6"
              style={{ color: "var(--accent-secondary)" }}
            >
              Explore
            </p>
            <h2
              className="text-4xl md:text-5xl font-bold mb-6"
              style={{ color: "var(--foreground)" }}
            >
              探索领域
            </h2>
            <p className="text-lg" style={{ color: "var(--muted)" }}>
              两个核心方向，持续深耕。
            </p>
          </motion.div>
        </div>

        <div className="max-w-2xl mx-auto px-8 flex flex-col gap-6">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
              >
                <Link href={section.href}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    className="group relative py-10 px-8 rounded-2xl border text-center overflow-hidden transition-all duration-500"
                    style={{
                      background: "var(--card)",
                      borderColor: "var(--border)",
                    }}
                  >
                    {/* Hover glow */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${section.gradient} opacity-0 group-hover:opacity-[0.05] transition-opacity duration-500`}
                    />

                    <div className={`inline-flex p-4 rounded-xl ${section.iconBg} mb-5`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>

                    <h3
                      className="text-2xl font-bold mb-2"
                      style={{ color: "var(--foreground)" }}
                    >
                      {section.title}
                    </h3>
                    <p className="text-sm mb-2" style={{ color: "var(--accent)" }}>
                      {section.subtitle}
                    </p>
                    <p
                      className="text-sm leading-relaxed max-w-md mx-auto"
                      style={{ color: "var(--muted)" }}
                    >
                      {section.description}
                    </p>
                  </motion.div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ===================== ARTICLES ===================== */}
      <section id="articles" className="py-32">
        <div className="max-w-2xl mx-auto px-8 text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8 }}
          >
            <p
              className="text-sm uppercase tracking-[0.4em] mb-6"
              style={{ color: "var(--accent-tertiary)" }}
            >
              Articles
            </p>
            <h2
              className="text-4xl md:text-5xl font-bold mb-6"
              style={{ color: "var(--foreground)" }}
            >
              最新文章
            </h2>
          </motion.div>
        </div>

        <div className="max-w-2xl mx-auto px-8 flex flex-col gap-4">
          {allArticles.map((article, index) => (
            <motion.div
              key={article.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link href={article.href}>
                <motion.div
                  whileHover={{ y: -3 }}
                  className="group p-6 rounded-2xl border text-center transition-all duration-300"
                  style={{
                    background: "var(--card)",
                    borderColor: "var(--border)",
                  }}
                >
                  <h3
                    className="text-lg font-semibold mb-2 transition-colors duration-300"
                    style={{ color: "var(--foreground)" }}
                  >
                    <span className="group-hover:text-[var(--accent)]">
                      {article.title}
                    </span>
                  </h3>
                  <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>
                    {article.description}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-xs" style={{ color: "var(--muted)", opacity: 0.5 }}>
                      {article.date}
                    </span>
                    <ArrowRight
                      className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all duration-300"
                      style={{ color: "var(--accent)" }}
                    />
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}

          {allArticles.length === 0 && (
            <p className="text-center py-12" style={{ color: "var(--muted)" }}>
              文章正在路上...
            </p>
          )}
        </div>
      </section>

      {/* ===================== CHAT CTA ===================== */}
      <section className="py-32">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl mx-auto px-8 text-center"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="inline-flex p-4 rounded-full mb-8"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <MessageCircle className="w-8 h-8" style={{ color: "var(--accent)" }} />
          </motion.div>
          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ color: "var(--foreground)" }}
          >
            想聊聊？
          </h2>
          <p className="text-lg mb-10" style={{ color: "var(--muted)" }}>
            和 AI 助手对话，发现更多有趣的内容。
          </p>
          <Link
            href="/explore"
            className="group inline-flex items-center gap-3 px-10 py-4 rounded-full text-white font-medium transition-all duration-300 hover:gap-5"
            style={{ background: "var(--foreground)" }}
          >
            进入对话
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="py-20 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-2xl mx-auto px-8 flex flex-col items-center gap-8">
          <div className="text-center">
            <p className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
              {siteConfig.name}
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              {siteConfig.author.chineseName} &middot; {siteConfig.author.pinyinName}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {siteConfig.links?.github && (
              <a
                href={siteConfig.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-full border transition-all duration-300 hover:scale-110"
                style={{ borderColor: "var(--border)", color: "var(--muted)" }}
              >
                <Github className="w-5 h-5" />
              </a>
            )}
            {siteConfig.links?.email && (
              <a
                href={`mailto:${siteConfig.links.email}`}
                className="p-3 rounded-full border transition-all duration-300 hover:scale-110"
                style={{ borderColor: "var(--border)", color: "var(--muted)" }}
              >
                <Mail className="w-5 h-5" />
              </a>
            )}
          </div>

          <p className="text-xs" style={{ color: "var(--muted)", opacity: 0.5 }}>
            &copy; {new Date().getFullYear()} {siteConfig.name}
          </p>
        </div>
      </footer>
    </>
  );
}
