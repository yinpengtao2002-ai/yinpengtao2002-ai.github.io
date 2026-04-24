"use client";

import { motion } from "framer-motion";
import { Hero } from "@/components/layout";
import { siteConfig } from "@/lib/config/site";
import { sections } from "@/lib/data/sections";
import { aiContent, financeContent } from "@/lib/data/generated/content";
import { scrollToSection } from "@/lib/scroll";
import { useViewportProfile } from "@/lib/useLowMotionMode";
import Link from "next/link";
import { ArrowRight, Mail, Linkedin, MessageCircle } from "lucide-react";

const HOME_UI_FONT =
  '"Anthropic Sans", var(--font-poppins), "IBM Plex Sans", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';

/* Scroll-down arrow that links to the next section */
function ScrollArrow({ targetId, lowMotion }: { targetId: string; lowMotion: boolean }) {
  return (
    <motion.button
      type="button"
      onClick={() => scrollToSection(targetId)}
      animate={lowMotion ? undefined : { y: [0, 8, 0] }}
      transition={lowMotion ? undefined : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        color: "var(--muted)",
        cursor: "pointer",
        textDecoration: "none",
        background: "transparent",
        border: "none",
        padding: 0,
        fontFamily: HOME_UI_FONT,
      }}
      aria-label={`滚动到 ${targetId} 区域`}
    >
      <span style={{ fontSize: 12, letterSpacing: "0.2em" }}>向下滑动 探索更多</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 5v14M5 12l7 7 7-7" />
      </svg>
    </motion.button>
  );
}

/* Full-screen section wrapper with optional scroll arrow */
function FullScreenSection({
  children,
  id,
  nextId,
  lowMotion,
  isMobileLike,
  mobileTopAlign = false,
}: {
  children: React.ReactNode;
  id?: string;
  nextId?: string;
  lowMotion: boolean;
  isMobileLike: boolean;
  mobileTopAlign?: boolean;
}) {
  const topAlign = mobileTopAlign && isMobileLike;

  return (
    <section
      id={id}
      className="full-viewport"
      style={{
        position: "relative",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: topAlign ? "flex-start" : "center",
        padding: topAlign ? "4rem 1.25rem 2.5rem" : isMobileLike ? "3rem 1.25rem" : "3rem 2rem",
        gap: topAlign ? "1rem" : "1.5rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "800px",
          textAlign: "center",
          paddingBottom: topAlign && nextId ? "5.5rem" : 0,
        }}
      >
        {children}
      </div>
      {nextId && (
        <div
          style={
            topAlign
              ? {
                  position: "absolute",
                  left: "50%",
                  bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
                  transform: "translateX(-50%)",
                }
              : { marginTop: 0 }
          }
        >
          <ScrollArrow targetId={nextId} lowMotion={lowMotion} />
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const { lowMotion, isMobileLike } = useViewportProfile();
  const sectionTransition = lowMotion ? { duration: 0.35 } : { duration: 0.8 };
  const sectionViewport = lowMotion ? { once: true, margin: "-20px" } : { once: true, margin: "-80px" };
  const revealInitial = lowMotion ? { opacity: 0 } : { opacity: 0, y: 40 };
  const revealWhileInView = lowMotion ? { opacity: 1 } : { opacity: 1, y: 0 };
  const cardInitial = lowMotion ? { opacity: 0 } : { opacity: 0, y: 20 };
  const cardWhileInView = lowMotion ? { opacity: 1 } : { opacity: 1, y: 0 };
  const getCardTransition = (index: number) =>
    lowMotion
      ? { duration: 0.25, delay: index * 0.04 }
      : { duration: 0.5, delay: index * 0.1 };

  return (
    <>
      {/* ===== HERO (already 100vh, has its own scroll arrow) ===== */}
      <Hero name={siteConfig.name} subtitle={siteConfig.subtitle} />

      {/* ===== ABOUT ===== */}
      <FullScreenSection
        id="about"
        nextId="finance-articles"
        lowMotion={lowMotion}
        isMobileLike={isMobileLike}
        mobileTopAlign
      >
        <motion.div
          initial={revealInitial}
          whileInView={revealWhileInView}
          viewport={sectionViewport}
          transition={sectionTransition}
        >
          <p
            style={{
              fontSize: "0.875rem",
              textTransform: "uppercase",
              letterSpacing: "0.4em",
              color: "var(--accent)",
              marginBottom: "1.5rem",
              fontFamily: HOME_UI_FONT,
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
            目前就职于奇瑞汽车，担任财务BP。
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
              gap: isMobileLike ? "0.5rem" : "0.75rem",
              marginTop: isMobileLike ? "2rem" : "3rem",
            }}
          >
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <Link key={section.id} href={section.href} style={{ textDecoration: "none" }}>
                  <motion.div
                    whileHover={{ y: -3 }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: isMobileLike ? "0.5rem 0.9rem" : "0.625rem 1.25rem",
                      borderRadius: "9999px",
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      fontFamily: HOME_UI_FONT,
                    }}
                  >
                    <Icon style={{ width: 16, height: 16, color: "var(--accent)" }} />
                      <span style={{ fontSize: isMobileLike ? "0.8rem" : "0.875rem", fontWeight: 500, color: "var(--foreground)" }}>
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
      <FullScreenSection id="finance-articles" nextId="ai-articles" lowMotion={lowMotion} isMobileLike={isMobileLike}>
        <motion.div
          initial={revealInitial}
          whileInView={revealWhileInView}
          viewport={sectionViewport}
          transition={sectionTransition}
          style={{ marginBottom: "2rem" }}
        >
          <p
            style={{
              fontSize: "0.875rem",
              textTransform: "uppercase",
              letterSpacing: "0.4em",
              color: "var(--accent-secondary)",
              marginBottom: "1.5rem",
              fontFamily: HOME_UI_FONT,
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
          {financeContent.slice(0, 2).map((article, index) => (
            <motion.div
              key={article.slug}
              initial={cardInitial}
              whileInView={cardWhileInView}
              viewport={{ once: true }}
              transition={getCardTransition(index)}
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
                    fontFamily: HOME_UI_FONT,
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
            <p style={{ padding: "3rem 0", color: "var(--muted)", fontFamily: HOME_UI_FONT }}>文章正在路上...</p>
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
              fontFamily: HOME_UI_FONT,
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
      <FullScreenSection id="ai-articles" nextId="footer" lowMotion={lowMotion} isMobileLike={isMobileLike}>
        <motion.div
          initial={revealInitial}
          whileInView={revealWhileInView}
          viewport={sectionViewport}
          transition={sectionTransition}
          style={{ marginBottom: "2rem" }}
        >
          <p
            style={{
              fontSize: "0.875rem",
              textTransform: "uppercase",
              letterSpacing: "0.4em",
              color: "var(--accent)",
              marginBottom: "1.5rem",
              fontFamily: HOME_UI_FONT,
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
          {aiContent.slice(0, 2).map((article, index) => (
            <motion.div
              key={article.slug}
              initial={cardInitial}
              whileInView={cardWhileInView}
              viewport={{ once: true }}
              transition={getCardTransition(index)}
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
                    fontFamily: HOME_UI_FONT,
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
            <p style={{ padding: "3rem 0", color: "var(--muted)", fontFamily: HOME_UI_FONT }}>文章正在路上... 敬请期待</p>
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
              fontFamily: HOME_UI_FONT,
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
            <p style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--foreground)", fontFamily: HOME_UI_FONT }}>
              {siteConfig.name}
            </p>
            <p style={{ fontSize: "0.875rem", color: "var(--muted)", marginTop: "0.25rem", fontFamily: HOME_UI_FONT }}>
              {siteConfig.author.chineseName} &middot; {siteConfig.author.pinyinName}
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", fontFamily: HOME_UI_FONT }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Mail style={{ width: 16, height: 16, color: "var(--muted)" }} />
              <a
                href={`mailto:${siteConfig.links?.email}`}
                style={{
                  fontSize: "0.875rem",
                  color: "var(--muted)",
                  textDecoration: "none",
                }}
              >
                {siteConfig.links?.email}
              </a>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <MessageCircle style={{ width: 16, height: 16, color: "var(--muted)" }} />
              <span style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
                微信：YPT1479239526
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Linkedin style={{ width: 16, height: 16, color: "var(--muted)" }} />
              <a
                href="https://www.linkedin.com/in/lucasyin2002/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: "0.875rem",
                  color: "var(--muted)",
                  textDecoration: "none",
                }}
              >
                LinkedIn
              </a>
            </div>
          </div>

          <p style={{ fontSize: "0.75rem", color: "var(--muted)", opacity: 0.5, fontFamily: HOME_UI_FONT }}>
            &copy; {new Date().getFullYear()} {siteConfig.name}
          </p>
        </div>
      </section>
    </>
  );
}
