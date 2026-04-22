"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import mermaid from "mermaid";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ContentItem } from "@/lib/data/generated/content";

function MermaidChart({ chart }: { chart: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState("");

    useLayoutEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: "neutral",
            securityLevel: "loose",
        });
        const render = async () => {
            try {
                const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
                const { svg } = await mermaid.render(id, chart);
                setSvg(svg);
            } catch (e) {
                console.error("Mermaid render failed:", e);
            }
        };
        render();
    }, [chart]);

    return (
        <div
            ref={ref}
            style={{
                margin: "24px 0",
                display: "flex",
                justifyContent: "center",
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 24,
                overflowX: "auto",
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}

interface ArticleClientProps {
    article: ContentItem;
    category: "ai" | "finance";
}

export default function ArticleClient({ article, category }: ArticleClientProps) {
    const router = useRouter();

    useLayoutEffect(() => {
        if ("scrollRestoration" in window.history) {
            window.history.scrollRestoration = "manual";
        }
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
        const timers = [50, 100, 200, 400].map(ms =>
            setTimeout(() => window.scrollTo(0, 0), ms)
        );
        const onScroll = () => {
            window.scrollTo(0, 0);
        };
        window.addEventListener("scroll", onScroll);
        const cleanup = setTimeout(() => {
            window.removeEventListener("scroll", onScroll);
        }, 500);
        return () => {
            timers.forEach(clearTimeout);
            clearTimeout(cleanup);
            window.removeEventListener("scroll", onScroll);
        };
    }, []);

    const handleBack = () => {
        if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
        } else {
            router.push(`/${category}`);
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "var(--background)",
                color: "var(--foreground)",
            }}
        >
            {/* Sticky Header */}
            <header
                style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 50,
                    background: "var(--background)",
                    borderBottom: "1px solid var(--border)",
                    backdropFilter: "blur(8px)",
                }}
            >
                <div
                    style={{
                        maxWidth: 720,
                        margin: "0 auto",
                        padding: "12px 24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <button
                        onClick={handleBack}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            color: "var(--muted)",
                            fontSize: 14,
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                        }}
                    >
                        <ArrowLeft style={{ width: 16, height: 16 }} />
                        <span>返回</span>
                    </button>
                    <span
                        style={{
                            fontSize: 12,
                            color: "var(--muted)",
                            opacity: 0.5,
                            letterSpacing: 1,
                            textTransform: "uppercase",
                        }}
                    >
                        {category === "ai" ? "AI Insights" : "Financial Modeling"}
                    </span>
                </div>
            </header>

            {/* Article Content */}
            <motion.main
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                    maxWidth: 720,
                    margin: "0 auto",
                    padding: "48px 24px 96px",
                }}
            >
                {/* Title */}
                <h1
                    style={{
                        fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                        fontWeight: 700,
                        lineHeight: 1.3,
                        color: "var(--foreground)",
                        marginBottom: 16,
                    }}
                >
                    {article.title}
                </h1>

                {/* Meta */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 40,
                        paddingBottom: 24,
                        borderBottom: "1px solid var(--border)",
                    }}
                >
                    {article.date && (
                        <span style={{ fontSize: 14, color: "var(--muted)" }}>
                            {article.date}
                        </span>
                    )}
                    {article.description && (
                        <>
                            <span style={{ color: "var(--border)" }}>·</span>
                            <span style={{ fontSize: 14, color: "var(--muted)" }}>
                                {article.description}
                            </span>
                        </>
                    )}
                </div>

                {/* Article Body */}
                <article className="notion-article">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }]]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                            h1: ({ children }) => (
                                <h1 style={styles.h1}>{children}</h1>
                            ),
                            h2: ({ children }) => (
                                <h2 style={styles.h2}>{children}</h2>
                            ),
                            h3: ({ children }) => (
                                <h3 style={styles.h3}>{children}</h3>
                            ),
                            p: ({ children }) => (
                                <p style={styles.p}>{children}</p>
                            ),
                            a: ({ href, children }) => (
                                <a
                                    href={href}
                                    style={styles.a}
                                    target={href?.startsWith("http") ? "_blank" : undefined}
                                    rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
                                >
                                    {children}
                                </a>
                            ),
                            ul: ({ children }) => (
                                <ul style={styles.ul}>{children}</ul>
                            ),
                            ol: ({ children }) => (
                                <ol style={styles.ol}>{children}</ol>
                            ),
                            li: ({ children }) => (
                                <li style={styles.li}>{children}</li>
                            ),
                            blockquote: ({ children }) => (
                                <blockquote style={styles.blockquote}>
                                    {children}
                                </blockquote>
                            ),
                            code: ({ children, className }) => {
                                if (className === "language-mermaid") {
                                    return <MermaidChart chart={String(children).replace(/\n$/, "")} />;
                                }
                                const isBlock = className?.startsWith("language-");
                                if (isBlock) {
                                    return (
                                        <code style={styles.codeBlock}>
                                            {children}
                                        </code>
                                    );
                                }
                                return (
                                    <code style={styles.codeInline}>{children}</code>
                                );
                            },
                            pre: ({ children }) => (
                                <pre style={styles.pre}>{children}</pre>
                            ),
                            table: ({ children }) => (
                                <div style={{ overflowX: "auto", margin: "24px 0" }}>
                                    <table style={styles.table}>{children}</table>
                                </div>
                            ),
                            thead: ({ children }) => (
                                <thead style={styles.thead}>{children}</thead>
                            ),
                            th: ({ children }) => (
                                <th style={styles.th}>{children}</th>
                            ),
                            td: ({ children }) => (
                                <td style={styles.td}>{children}</td>
                            ),
                            tr: ({ children }) => (
                                <tr style={styles.tr}>{children}</tr>
                            ),
                            hr: () => <hr style={styles.hr} />,
                            img: ({ src, alt }) => (
                                <img
                                    src={src}
                                    alt={alt || ""}
                                    style={styles.img}
                                />
                            ),
                            strong: ({ children }) => (
                                <strong style={{ fontWeight: 700, color: "var(--foreground)" }}>
                                    {children}
                                </strong>
                            ),
                            em: ({ children }) => (
                                <em style={{ fontStyle: "italic" }}>{children}</em>
                            ),
                        }}
                    >
                        {article.content}
                    </ReactMarkdown>
                </article>

                {/* Footer */}
                <div
                    style={{
                        marginTop: 64,
                        paddingTop: 24,
                        borderTop: "1px solid var(--border)",
                        display: "flex",
                        justifyContent: "center",
                    }}
                >
                    <button
                        onClick={handleBack}
                        style={{
                            fontSize: 14,
                            color: "var(--muted)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                        }}
                    >
                        ← 返回
                    </button>
                </div>
            </motion.main>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    h1: {
        fontSize: "1.875rem",
        fontWeight: 700,
        color: "var(--foreground)",
        margin: "48px 0 16px",
        lineHeight: 1.3,
    },
    h2: {
        fontSize: "1.5rem",
        fontWeight: 600,
        color: "var(--foreground)",
        margin: "40px 0 12px",
        lineHeight: 1.35,
    },
    h3: {
        fontSize: "1.25rem",
        fontWeight: 600,
        color: "var(--foreground)",
        margin: "32px 0 8px",
        lineHeight: 1.4,
    },
    p: {
        fontSize: 16,
        lineHeight: 1.8,
        color: "var(--foreground)",
        margin: "8px 0 16px",
    },
    a: {
        color: "var(--accent)",
        textDecoration: "underline",
        textUnderlineOffset: 3,
    },
    ul: {
        paddingLeft: 24,
        margin: "8px 0 16px",
        listStyleType: "disc",
    },
    ol: {
        paddingLeft: 24,
        margin: "8px 0 16px",
        listStyleType: "decimal",
    },
    li: {
        fontSize: 16,
        lineHeight: 1.8,
        color: "var(--foreground)",
        marginBottom: 4,
    },
    blockquote: {
        borderLeft: "3px solid var(--accent)",
        paddingLeft: 16,
        margin: "16px 0",
        color: "var(--muted)",
        fontStyle: "italic",
    },
    codeInline: {
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 4,
        padding: "2px 6px",
        fontSize: "0.9em",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        color: "var(--accent)",
    },
    codeBlock: {
        display: "block",
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "16px 20px",
        fontSize: 14,
        lineHeight: 1.7,
        overflowX: "auto",
        whiteSpace: "pre",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        color: "var(--foreground)",
    },
    pre: {
        margin: "16px 0",
        overflow: "auto",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 15,
    },
    thead: {
        borderBottom: "2px solid var(--border)",
    },
    th: {
        padding: "8px 12px",
        textAlign: "left",
        fontWeight: 600,
        fontSize: 14,
        color: "var(--muted)",
    },
    td: {
        padding: "10px 12px",
        borderBottom: "1px solid var(--border)",
        fontSize: 15,
        color: "var(--foreground)",
    },
    tr: {},
    hr: {
        border: "none",
        borderTop: "1px solid var(--border)",
        margin: "40px 0",
    },
    img: {
        maxWidth: "100%",
        borderRadius: 8,
        margin: "16px 0",
    },
};
