import type { ContentItem } from "@/lib/data/generated/content";

export interface CachedArticleSummary {
    key: string;
    text: string;
}

interface ArticleContextSource {
    title: string;
    description: string;
    href: string;
    content?: string;
    date?: string;
    category?: string | null;
}

const ARTICLE_SUMMARY_CACHE = new Map<string, CachedArticleSummary>();

function compactWhitespace(text: string) {
    return text.replace(/\s+/g, " ").trim();
}

export function normalizeMarkdownText(text: string) {
    return compactWhitespace(
        text
            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
            .replace(/!\[[^\]]*]\([^)]+\)/g, "")
            .replace(/[`*>#~|-]/g, "")
    );
}

function truncateText(text: string, maxLength: number) {
    const normalized = compactWhitespace(text);
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength)}...`;
}

function getArticleCacheKey(article: Pick<ArticleContextSource, "href" | "content" | "description">) {
    return `${article.href}::${article.content?.length ?? 0}::${article.description.length}`;
}

function getParagraphs(content: string) {
    return content
        .split(/\n{2,}/)
        .map(normalizeMarkdownText)
        .filter((paragraph) => paragraph.length >= 24 && !paragraph.startsWith("作者："));
}

export function getArticleSections(article: Pick<ArticleContextSource, "title" | "content">) {
    const content = article.content || "";
    if (!content.trim()) return [];

    const headingMatches = Array.from(content.matchAll(/^(#{1,3})\s+(.+)$/gm));
    if (headingMatches.length === 0) {
        return getParagraphs(content).map((paragraph, index) => ({
            heading: index === 0 ? article.title : `片段 ${index + 1}`,
            text: paragraph,
            score: 0,
        }));
    }

    return headingMatches.map((match, index) => {
        const heading = normalizeMarkdownText(match[2]);
        const start = (match.index ?? 0) + match[0].length;
        const end = headingMatches[index + 1]?.index ?? content.length;
        const body = normalizeMarkdownText(content.slice(start, end));
        return {
            heading,
            text: `${heading}\n${body}`.trim(),
            score: 0,
        };
    }).filter((section) => section.text.length > section.heading.length);
}

export function getCachedArticleSummary(article: Pick<ArticleContextSource, "title" | "description" | "href" | "content">) {
    const key = getArticleCacheKey(article);
    const cached = ARTICLE_SUMMARY_CACHE.get(key);
    if (cached) return cached;

    const sections = getArticleSections(article);
    const headings = sections.map((section) => section.heading).filter(Boolean).slice(0, 10);
    const paragraphs = getParagraphs(article.content || "");
    const opening = paragraphs[0] ? truncateText(paragraphs[0], 220) : "";
    const closing = paragraphs.length > 1 ? truncateText(paragraphs[paragraphs.length - 1], 220) : "";
    const text = [
        `摘要：${article.description}`,
        headings.length > 0 ? `文章目录：${headings.join(" / ")}` : "",
        opening ? `开头：${opening}` : "",
        closing && closing !== opening ? `结尾：${closing}` : "",
    ].filter(Boolean).join("\n");

    const summary = { key, text: text.length > 1300 ? `${text.slice(0, 1300)}...` : text };
    ARTICLE_SUMMARY_CACHE.set(key, summary);
    return summary;
}

export function getArticleFallbackFocus(article: Pick<ArticleContextSource, "title" | "description" | "href" | "content">) {
    const summary = getCachedArticleSummary(article);
    const directoryLine = summary.text.split("\n").find((line) => line.startsWith("文章目录："));
    if (directoryLine) {
        return `可以先抓住这几层：${directoryLine.replace("文章目录：", "").split(" / ").slice(0, 4).join("；")}。`;
    }

    return summary.text;
}

export function buildActiveThinkingArticlePrompt(activeThinkingArticle?: ContentItem) {
    if (!activeThinkingArticle) {
        return "当前没有打开具体工具与思考文章。";
    }

    const summary = getCachedArticleSummary(activeThinkingArticle);

    return [
        `当前打开的文章：${activeThinkingArticle.title}（${activeThinkingArticle.href}）`,
        `文章分类：${activeThinkingArticle.category ?? "未分类"}`,
        `发布日期：${activeThinkingArticle.date}`,
        "文章摘要缓存：",
        summary.text,
        "如果用户说“这篇文章”“当前文章”“总结一下”“核心观点”“讲什么”，默认指这个当前打开的文章。",
        "回答时优先使用文章摘要缓存、目录、开头和结尾；不要假装读到了未提供的全文细节。",
        "你能围绕这篇文章提供内容总结、核心观点、段落逻辑、方法提炼、相关模型和延展阅读建议。",
    ].join("\n");
}
