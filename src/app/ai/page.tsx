"use client";

import { motion } from "framer-motion";
import { aiContent } from "@/lib/data/generated/content";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AIPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "5rem 2rem 2rem",
        background: "var(--background)",
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ paddingTop: "1rem", paddingBottom: "3rem" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
            <div
              className="bg-gradient-to-br from-[#d97757] to-[#6a9bcc]"
              style={{
                display: "inline-flex",
                padding: "0.75rem",
                borderRadius: "0.75rem",
              }}
            >
              <Sparkles style={{ width: 24, height: 24, color: "white" }} />
            </div>
            <h1
              style={{
                fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                fontWeight: 700,
                color: "var(--foreground)",
              }}
            >
              AI 工作流
            </h1>
          </div>
          <p style={{ fontSize: "1rem", color: "var(--muted)", lineHeight: 1.6 }}>
            记录 AI 工具、内容生产和知识工作方法
          </p>
          <p style={{ fontSize: "0.875rem", color: "var(--muted)", opacity: 0.6, marginTop: "0.5rem" }}>
            共 {aiContent.length} 篇文章
          </p>
        </motion.div>

        {/* Article List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", paddingBottom: "4rem" }}>
          {aiContent.map((article, index) => (
            <motion.div
              key={article.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
            >
              <Link href={article.href} style={{ textDecoration: "none" }}>
                <motion.div
                  whileHover={{ y: -3 }}
                  style={{
                    padding: "1.5rem",
                    borderRadius: "1rem",
                    border: "1px solid var(--border)",
                    background: "var(--card)",
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
                  <p style={{ fontSize: "0.875rem", color: "var(--muted)", marginBottom: "0.75rem", lineHeight: 1.6 }}>
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
            <div style={{ padding: "4rem 0", textAlign: "center" }}>
              <Sparkles style={{ width: 48, height: 48, color: "var(--border)", margin: "0 auto 1.5rem" }} />
              <p style={{ fontSize: "1.125rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
                内容正在路上...
              </p>
              <p style={{ fontSize: "0.875rem", color: "var(--muted)", opacity: 0.6 }}>
                敬请期待，AI 工作流相关内容即将上线
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
