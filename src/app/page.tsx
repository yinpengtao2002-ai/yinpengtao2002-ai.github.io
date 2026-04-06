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

/* Centered wrapper - guaranteed centering via flex */
function CenteredBlock({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={className}
      style={{ width: "100%", minWidth: "100%" }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "640px",
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: "2rem",
          paddingRight: "2rem",
          textAlign: "center",
        }}
      >
        {children}
      </div>
    </section>
  );
}

export default function Home() {
  const allArticles = [...financeContent, ...aiContent];

  return (
    <>
      {/* Hero */}
      <Hero name={siteConfig.name} subtitle={siteConfig.subtitle} />

      {/* ===================== ABOUT ===================== */}
      <CenteredBlock id="about" className="relative" style-py="8rem">
        {/* Decorative line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "1px",
            height: "96px",
            background: "linear-gradient(to bottom, transparent, var(--border), transparent)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          style={{ paddingTop: "8rem", paddingBottom: "8rem" }}
        >
          <p
            style={{
              fontSize: "0.875rem",
              textTransform: "uppercase",
              letterSpacing: "0.4em",
              color: "var(--accent)",
              marginBottom: "1.5rem",
            }}
          >
            About
          </p>
          <h2
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontWeight: 700,
              color: "var(--foreground)",
              marginBottom: "2rem",
              lineHeight: 1.2,
            }}
          >
            你好，我是
            <span className="gradient-text"> {siteConfig.author.chineseName}</span>
          </h2>
          <p
            style={{
              fontSize: "1.125rem",
              lineHeight: 1.8,
              color: "var(--muted)",
              marginBottom: "1.5rem",
            }}
          >
            对金融建模与人工智能充满热情。
            <br />
            我相信技术的力量在于解决真实的问题。
          </p>
          <p style={{ fontSize: "1rem", fontStyle: "italic", color: "var(--accent)" }}>
            &ldquo;{siteConfig.description}&rdquo;
          </p>

          {/* Skill pills */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "0.75rem",
              marginTop: "3rem",
            }}
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
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.625rem 1.25rem",
                    borderRadius: "9999px",
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                  }}
                >
                  <Icon style={{ width: 16, height: 16, color: "var(--accent)" }} />
                  <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--foreground)" }}>
                    {skill.label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </CenteredBlock>

      {/* ===================== EXPLORE SECTIONS ===================== */}
      <CenteredBlock>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          style={{ paddingTop: "8rem", paddingBottom: "2rem" }}
        >
          <p
            style={{
              fontSize: "0.875rem",
              textTransform: "uppercase",
              letterSpacing: "0.4em",
              color: "var(--accent-secondary)",
              marginBottom: "1.5rem",
            }}
          >
            Explore
          </p>
          <h2
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontWeight: 700,
              color: "var(--foreground)",
              marginBottom: "1.5rem",
            }}
          >
            探索领域
          </h2>
          <p style={{ fontSize: "1.125rem", color: "var(--muted)" }}>
            两个核心方向，持续深耕。
          </p>
        </motion.div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", paddingBottom: "8rem" }}>
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
                <Link href={section.href} style={{ textDecoration: "none" }}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    style={{
                      padding: "2.5rem 2rem",
                      borderRadius: "1rem",
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      textAlign: "center",
                      transition: "all 0.3s ease",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      className={section.iconBg}
                      style={{
                        display: "inline-flex",
                        padding: "1rem",
                        borderRadius: "0.75rem",
                        marginBottom: "1.25rem",
                      }}
                    >
                      <Icon style={{ width: 24, height: 24, color: "white" }} />
                    </div>
                    <h3
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: "var(--foreground)",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {section.title}
                    </h3>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--accent)",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {section.subtitle}
                    </p>
                    <p style={{ fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.6 }}>
                      {section.description}
                    </p>
                  </motion.div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </CenteredBlock>

      {/* ===================== ARTICLES ===================== */}
      <CenteredBlock id="articles">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          style={{ paddingTop: "8rem", paddingBottom: "2rem" }}
        >
          <p
            style={{
              fontSize: "0.875rem",
              textTransform: "uppercase",
              letterSpacing: "0.4em",
              color: "var(--accent-tertiary)",
              marginBottom: "1.5rem",
            }}
          >
            Articles
          </p>
          <h2
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontWeight: 700,
              color: "var(--foreground)",
              marginBottom: "1.5rem",
            }}
          >
            最新文章
          </h2>
        </motion.div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", paddingBottom: "8rem" }}>
          {allArticles.map((article, index) => (
            <motion.div
              key={article.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link href={article.href} style={{ textDecoration: "none" }}>
                <motion.div
                  whileHover={{ y: -3 }}
                  style={{
                    padding: "1.5rem",
                    borderRadius: "1rem",
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    textAlign: "center",
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: 600,
                      color: "var(--foreground)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {article.title}
                  </h3>
                  <p style={{ fontSize: "0.875rem", color: "var(--muted)", marginBottom: "0.75rem" }}>
                    {article.description}
                  </p>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)", opacity: 0.5 }}>
                    {article.date}
                  </span>
                </motion.div>
              </Link>
            </motion.div>
          ))}

          {allArticles.length === 0 && (
            <p style={{ padding: "3rem 0", color: "var(--muted)" }}>文章正在路上...</p>
          )}
        </div>
      </CenteredBlock>

      {/* ===================== CHAT CTA ===================== */}
      <CenteredBlock>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          style={{ paddingTop: "8rem", paddingBottom: "8rem" }}
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            style={{
              display: "inline-flex",
              padding: "1rem",
              borderRadius: "9999px",
              background: "var(--card)",
              border: "1px solid var(--border)",
              marginBottom: "2rem",
            }}
          >
            <MessageCircle style={{ width: 32, height: 32, color: "var(--accent)" }} />
          </motion.div>
          <h2
            style={{
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              fontWeight: 700,
              color: "var(--foreground)",
              marginBottom: "1rem",
            }}
          >
            想聊聊？
          </h2>
          <p style={{ fontSize: "1.125rem", color: "var(--muted)", marginBottom: "2.5rem" }}>
            和 AI 助手对话，发现更多有趣的内容。
          </p>
          <Link
            href="/explore"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "1rem 2.5rem",
              borderRadius: "9999px",
              background: "var(--foreground)",
              color: "white",
              fontWeight: 500,
              textDecoration: "none",
              transition: "all 0.3s ease",
            }}
          >
            进入对话
            <ArrowRight style={{ width: 16, height: 16 }} />
          </Link>
        </motion.div>
      </CenteredBlock>

      {/* ===================== FOOTER ===================== */}
      <CenteredBlock>
        <div
          style={{
            paddingTop: "5rem",
            paddingBottom: "5rem",
            borderTop: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2rem",
          }}
        >
          <div>
            <p style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--foreground)" }}>
              {siteConfig.name}
            </p>
            <p style={{ fontSize: "0.875rem", color: "var(--muted)", marginTop: "0.25rem" }}>
              {siteConfig.author.chineseName} &middot; {siteConfig.author.pinyinName}
            </p>
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            {siteConfig.links?.github && (
              <a
                href={siteConfig.links.github}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "0.75rem",
                  borderRadius: "9999px",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                  display: "flex",
                  transition: "all 0.3s ease",
                }}
              >
                <Github style={{ width: 20, height: 20 }} />
              </a>
            )}
            {siteConfig.links?.email && (
              <a
                href={`mailto:${siteConfig.links.email}`}
                style={{
                  padding: "0.75rem",
                  borderRadius: "9999px",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                  display: "flex",
                  transition: "all 0.3s ease",
                }}
              >
                <Mail style={{ width: 20, height: 20 }} />
              </a>
            )}
          </div>

          <p style={{ fontSize: "0.75rem", color: "var(--muted)", opacity: 0.5 }}>
            &copy; {new Date().getFullYear()} {siteConfig.name}
          </p>
          <p style={{ fontSize: "0.75rem", color: "var(--muted)", opacity: 0.3 }}>
            v2.2.0
          </p>
        </div>
      </CenteredBlock>
    </>
  );
}
