"use client";

import { motion } from "framer-motion";
import { financeContent } from "@/lib/data/generated/content";
import Link from "next/link";
import { ArrowLeft, TrendingUp } from "lucide-react";

export default function FinancePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "2rem",
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
          style={{ paddingTop: "2rem", paddingBottom: "3rem" }}
        >
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "var(--muted)",
              textDecoration: "none",
              fontSize: "0.875rem",
              marginBottom: "2rem",
            }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
            返回首页
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
            <div
              className="bg-gradient-to-br from-[#6a9bcc] to-[#788c5d]"
              style={{
                display: "inline-flex",
                padding: "0.75rem",
                borderRadius: "0.75rem",
              }}
            >
              <TrendingUp style={{ width: 24, height: 24, color: "white" }} />
            </div>
            <h1
              style={{
                fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                fontWeight: 700,
                color: "var(--foreground)",
              }}
            >
              财务建模
            </h1>
          </div>
          <p style={{ fontSize: "1rem", color: "var(--muted)", lineHeight: 1.6 }}>
            探索财务建模、数据分析与投资决策的专业领域
          </p>
          <p style={{ fontSize: "0.875rem", color: "var(--muted)", opacity: 0.6, marginTop: "0.5rem" }}>
            共 {financeContent.length} 个内容
          </p>
        </motion.div>

        {/* Article List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", paddingBottom: "4rem" }}>
          {financeContent.map((article, index) => (
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

          {financeContent.length === 0 && (
            <p style={{ padding: "3rem 0", color: "var(--muted)", textAlign: "center" }}>
              文章正在路上...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
