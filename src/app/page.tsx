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
  Phone,
} from "lucide-react";

/* Scroll-down arrow that links to the next section */
function ScrollArrow({ targetId }: { targetId: string }) {
  return (
    <motion.a
      href={`#${targetId}`}
      animate={{ y: [0, 8, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        color: "var(--muted)",
        cursor: "pointer",
        textDecoration: "none",
      }}
    >
      <span style={{ fontSize: 12, letterSpacing: "0.2em" }}>向下滑动 探索更多</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 5v14M5 12l7 7 7-7" />
      </svg>
    </motion.a>
  );
}

/* Full-screen section wrapper with optional scroll arrow */
function FullScreenSection({
  children,
  id,
  nextId,
}: {
  children: React.ReactNode;
  id?: string;
  nextId?: string;
}) {
  return (
    <section
      id={id}
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "4rem 2rem",
        position: "relative",
      }}
    >
      <div style={{ width: "100%", maxWidth: "800px", textAlign: "center" }}>
        {children}
      </div>
      {nextId && (
        <div style={{ position: "absolute", bottom: "2.5rem" }}>
          <ScrollArrow targetId={nextId} />
        </div>
      )}
    </section>
  );
}

export default function Home() {
  return (
    <>
      {/* ===== HERO (already 100vh, has its own scroll arrow) ===== */}
      <Hero name={siteConfig.name} subtitle={siteConfig.subtitle} />

      {/* ===== ABOUT ===== */}
      <FullScreenSection id="about" nextId="finance-articles">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
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
            目前就职于奇瑞汽车股份有限公司，担任财务BP。
            <br />
            热爱金融建模与人工智能，相信技术的力量在于解决真实的问题。
          </p>
          <p style={{ fontSize: "1rem", fontStyle: "italic", color: "var(--accent)" }}>
            &ldquo;{siteConfig.description}&rdquo;
          </p>

          {/* 领域标签 */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "0.75rem",
              marginTop: "3rem",
            }}
          >
            {sections.map((section, i) => {
              const Icon = section.icon;
              return (
                <Link key={section.id} href={section.href} style={{ textDecoration: "none" }}>
                  <motion.div
                    whileHover={{ y: -3 }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.625rem 1.25rem",
                      borderRadius: "9999px",
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <Icon style={{ width: 16, height: 16, color: "var(--accent)" }} />
                    <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--foreground)" }}>
                      {section.subtitle}
                    </span>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      </FullScreenSection>

      {/* ===== FINANCE ARTICLES PREVIEW ===== */}
      <FullScreenSection id="finance-articles" nextId="ai-articles">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          style={{ marginBottom: "2rem" }}
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
            Financial Modeling
          </p>
          <h2
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontWeight: 700,
              color: "var(--foreground)",
              marginBottom: "1.5rem",
            }}
          >
            财务建模
          </h2>
        </motion.div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%" }}>
          {financeContent.slice(0, 3).map((article, index) => (
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

          {financeContent.length === 0 && (
            <p style={{ padding: "3rem 0", color: "var(--muted)" }}>文章正在路上...</p>
          )}

          {financeContent.length > 0 && (
            <Link
              href="/finance"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
                marginTop: "1rem",
                color: "var(--accent-secondary)",
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: 500,
                borderRadius: "9999px",
                border: "1px solid var(--border)",
                transition: "all 0.3s ease",
              }}
            >
              查看全部 {financeContent.length} 篇
              <ArrowRight style={{ width: 14, height: 14 }} />
            </Link>
          )}
        </div>
      </FullScreenSection>

      {/* ===== AI ARTICLES PREVIEW ===== */}
      <FullScreenSection id="ai-articles" nextId="footer">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          style={{ marginBottom: "2rem" }}
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
            AI Insights
          </p>
          <h2
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontWeight: 700,
              color: "var(--foreground)",
              marginBottom: "1.5rem",
            }}
          >
            AI 见闻
          </h2>
        </motion.div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%" }}>
          {aiContent.slice(0, 3).map((article, index) => (
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

          {aiContent.length === 0 && (
            <p style={{ padding: "3rem 0", color: "var(--muted)" }}>文章正在路上... 敬请期待</p>
          )}

          {aiContent.length > 0 && (
            <Link
              href="/ai"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
                marginTop: "1rem",
                color: "var(--accent)",
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: 500,
                borderRadius: "9999px",
                border: "1px solid var(--border)",
                transition: "all 0.3s ease",
              }}
            >
              查看全部 {aiContent.length} 篇
              <ArrowRight style={{ width: 14, height: 14 }} />
            </Link>
          )}
        </div>
      </FullScreenSection>

      {/* ===== FOOTER ===== */}
      <section id="footer" style={{ width: "100%", borderTop: "1px solid var(--border)" }}>
        <div
          style={{
            maxWidth: "800px",
            marginLeft: "auto",
            marginRight: "auto",
            paddingTop: "5rem",
            paddingBottom: "5rem",
            paddingLeft: "2rem",
            paddingRight: "2rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2rem",
            textAlign: "center",
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
            {siteConfig.links?.phone && (
              <a
                href={`tel:${siteConfig.links.phone}`}
                style={{
                  padding: "0.75rem",
                  borderRadius: "9999px",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                  display: "flex",
                  transition: "all 0.3s ease",
                }}
              >
                <Phone style={{ width: 20, height: 20 }} />
              </a>
            )}
          </div>

          <p style={{ fontSize: "0.75rem", color: "var(--muted)", opacity: 0.5 }}>
            &copy; {new Date().getFullYear()} {siteConfig.name}
          </p>
          <p style={{ fontSize: "0.75rem", color: "var(--muted)", opacity: 0.3 }}>
            v3.1.0
          </p>
        </div>
      </section>
    </>
  );
}
