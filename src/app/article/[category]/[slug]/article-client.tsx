"use client";

/* eslint-disable @next/next/no-img-element */
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import mermaid from "mermaid";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ContentItem } from "@/lib/data/generated/content";
import { normalizeMarkdownStrongEmphasis } from "@/lib/markdown/normalizeStrongEmphasis";

type TocHeading = {
    id: string;
    level: 2 | 3;
    line: number;
    text: string;
};

type MarkdownHeadingNode = {
    position?: {
        start?: {
            line?: number | null;
        };
    };
};

function cleanHeadingText(text: string) {
    return text
        .replace(/\s+#+$/, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[*_`~]/g, "")
        .trim();
}

function extractTableOfContents(markdown: string): TocHeading[] {
    const headings: TocHeading[] = [];
    const headingPattern = /^(#{2,3})\s+(.+)$/gm;
    let match = headingPattern.exec(markdown);

    while (match) {
        const level = match[1].length as 2 | 3;
        const text = cleanHeadingText(match[2]);
        if (text) {
            const line = markdown.slice(0, match.index).split("\n").length;
            headings.push({
                id: `section-${line}`,
                level,
                line,
                text,
            });
        }
        match = headingPattern.exec(markdown);
    }

    return headings;
}

function getHeadingId(node: MarkdownHeadingNode | undefined, level: 2 | 3, headings: TocHeading[]) {
    const line = node?.position?.start?.line;
    if (typeof line !== "number") return undefined;

    return headings.find((heading) => heading.level === level && heading.line === line)?.id;
}

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
    category: "ai" | "finance" | "essays";
}

export default function ArticleClient({ article, category }: ArticleClientProps) {
    const router = useRouter();
    const articleContent = useMemo(() => normalizeMarkdownStrongEmphasis(article.content), [article.content]);
    const tocHeadings = useMemo(() => extractTableOfContents(articleContent), [articleContent]);

    useLayoutEffect(() => {
        const previousScrollRestoration =
            "scrollRestoration" in window.history ? window.history.scrollRestoration : undefined;

        if ("scrollRestoration" in window.history) {
            window.history.scrollRestoration = "manual";
        }

        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        const raf = window.requestAnimationFrame(() => {
            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        });

        return () => {
            window.cancelAnimationFrame(raf);

            if (previousScrollRestoration) {
                window.history.scrollRestoration = previousScrollRestoration;
            }
        };
    }, [article.slug]);

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
                        {category === "ai" ? "AI Workflow" : category === "finance" ? "Financial Modeling" : "Daily Essays"}
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

                {tocHeadings.length > 1 && (
                    <nav aria-label="文章目录" style={styles.toc}>
                        <div style={styles.tocTitle}>目录</div>
                        <div style={styles.tocList}>
                            {tocHeadings.map((heading) => (
                                <a
                                    key={heading.id}
                                    href={`#${heading.id}`}
                                    style={{
                                        ...styles.tocLink,
                                        paddingLeft: heading.level === 3 ? 18 : 0,
                                    }}
                                >
                                    {heading.text}
                                </a>
                            ))}
                        </div>
                    </nav>
                )}

                {/* Article Body */}
                <article className="notion-article">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }]]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                            h1: ({ children }) => (
                                <h1 style={styles.h1}>{children}</h1>
                            ),
                            h2: ({ node, children }) => (
                                <h2 id={getHeadingId(node, 2, tocHeadings)} style={styles.h2}>{children}</h2>
                            ),
                            h3: ({ node, children }) => (
                                <h3 id={getHeadingId(node, 3, tocHeadings)} style={styles.h3}>{children}</h3>
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
                        {articleContent}
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
        scrollMarginTop: 88,
    },
    h3: {
        fontSize: "1.25rem",
        fontWeight: 600,
        color: "var(--foreground)",
        margin: "32px 0 8px",
        lineHeight: 1.4,
        scrollMarginTop: 88,
    },
    toc: {
        border: "1px solid var(--border)",
        borderRadius: 8,
        background: "var(--card)",
        padding: "18px 20px",
        margin: "0 0 36px",
    },
    tocTitle: {
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: "0.08em",
        color: "var(--muted)",
        marginBottom: 10,
    },
    tocList: {
        display: "grid",
        gap: 8,
    },
    tocLink: {
        color: "var(--foreground)",
        fontSize: 14,
        lineHeight: 1.5,
        textDecoration: "none",
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
