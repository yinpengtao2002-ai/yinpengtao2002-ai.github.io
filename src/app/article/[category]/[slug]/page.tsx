import { getContentBySlug, aiContent, financeContent, essaysContent } from "@/lib/data/generated/content";
import type { Metadata } from "next";
import Link from "next/link";
import ArticleClient from "./article-client";

type ContentCategory = "ai" | "finance" | "essays";
type ArticleItem = typeof aiContent[number] | typeof financeContent[number] | typeof essaysContent[number];

const BASE_URL = "https://yinpengtao.cn";

interface PageProps {
    params: Promise<{
        category: string;
        slug: string;
    }>;
}

export function generateStaticParams() {
    const buildParams = (category: ContentCategory, items: ArticleItem[]) =>
        items.flatMap((item) => [
            { category, slug: item.slug },
            ...(item.aliases || []).map((slug) => ({ category, slug })),
        ]);

    const aiParams = buildParams("ai", aiContent);
    const financeParams = buildParams("finance", financeContent);
    const essaysParams = buildParams("essays", essaysContent);

    return [...aiParams, ...financeParams, ...essaysParams];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { category, slug } = await params;
    const typedCategory = ["ai", "finance", "essays"].includes(category)
        ? category as ContentCategory
        : "ai";
    const article = getContentBySlug(typedCategory, slug);

    if (!article) {
        return {
            title: "文章未找到",
            robots: { index: false, follow: true },
        };
    }

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
    const typedCategory = ["ai", "finance", "essays"].includes(category)
        ? category as ContentCategory
        : "ai";

    const article = getContentBySlug(typedCategory, slug);

    if (!article) {
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

    return <ArticleClient article={article} category={typedCategory} />;
}
