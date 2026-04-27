import { getContentBySlug, aiContent, financeContent, essaysContent } from "@/lib/data/generated/content";
import type { Metadata } from "next";
import Link from "next/link";
import ArticleClient from "./article-client";

type ContentCategory = "ai" | "finance" | "essays";
type ArticleItem = typeof aiContent[number] | typeof financeContent[number] | typeof essaysContent[number];

const BASE_URL = "https://yinpengtao.cn";
const legacyArticleParams = [
    { category: "finance" as const, slug: "gold-stock-selloff-iran-war-2026" },
    { category: "finance" as const, slug: "notion-fbde349d753a" },
];

function isArticleRouteItem(category: ContentCategory, item: ArticleItem) {
    return item.href.startsWith(`/article/${category}/`);
}

interface PageProps {
    params: Promise<{
        category: string;
        slug: string;
    }>;
}

export function generateStaticParams() {
    const buildParams = (category: ContentCategory, items: ArticleItem[]) =>
        items
            .filter((item) => isArticleRouteItem(category, item))
            .flatMap((item) => [
                { category, slug: item.slug },
                ...(item.aliases || []).map((slug) => ({ category, slug })),
            ]);

    const aiParams = buildParams("ai", aiContent);
    const financeParams = buildParams("finance", financeContent);
    const essaysParams = buildParams("essays", essaysContent);

    return [...aiParams, ...financeParams, ...essaysParams, ...legacyArticleParams]
        .filter((param, index, params) =>
            params.findIndex((item) => item.category === param.category && item.slug === param.slug) === index
        );
}

function getArticleWithCategory(category: string, slug: string): { article: ArticleItem; category: ContentCategory } | null {
    const contentByCategory: Record<ContentCategory, ArticleItem[]> = {
        ai: aiContent,
        finance: financeContent,
        essays: essaysContent,
    };
    const categories: ContentCategory[] = ["ai", "finance", "essays"];
    const typedCategory = categories.includes(category as ContentCategory)
        ? category as ContentCategory
        : "ai";

    const directArticle = getContentBySlug(typedCategory, slug);
    if (directArticle && isArticleRouteItem(typedCategory, directArticle)) {
        return { article: directArticle, category: typedCategory };
    }

    for (const fallbackCategory of categories) {
        if (fallbackCategory === typedCategory) continue;
        const article = contentByCategory[fallbackCategory].find(
            (item) => item.slug === slug || item.aliases?.includes(slug)
        );
        if (article && isArticleRouteItem(fallbackCategory, article)) {
            return { article, category: fallbackCategory };
        }
    }

    return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { category, slug } = await params;
    const result = getArticleWithCategory(category, slug);

    if (!result) {
        return {
            title: "文章未找到",
            robots: { index: false, follow: true },
        };
    }

    const { article } = result;

    return {
        title: article.title,
        description: article.description,
        alternates: {
            canonical: article.href,
        },
        openGraph: {
            title: article.title,
            description: article.description,
            url: `${BASE_URL}${article.href}`,
            type: "article",
        },
        twitter: {
            card: "summary_large_image",
            title: article.title,
            description: article.description,
        },
    };
}

export default async function ArticlePage({ params }: PageProps) {
    const { category, slug } = await params;
    const result = getArticleWithCategory(category, slug);

    if (!result) {
        return (
            <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--foreground)", marginBottom: 16 }}>文章未找到</h1>
                    <Link href="/" style={{ color: "var(--accent)", textDecoration: "underline" }}>
                        返回首页
                    </Link>
                </div>
            </div>
        );
    }

    return <ArticleClient article={result.article} category={result.category} />;
}
