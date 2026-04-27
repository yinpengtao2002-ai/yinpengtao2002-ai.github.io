import { getContentBySlug, aiContent, financeContent, essaysContent } from "@/lib/data/generated/content";
import Link from "next/link";
import ArticleClient from "./article-client";

type ContentCategory = "ai" | "finance" | "essays";

interface PageProps {
    params: Promise<{
        category: string;
        slug: string;
    }>;
}

export function generateStaticParams() {
    const aiParams = aiContent.map((item) => ({
        category: "ai",
        slug: item.slug,
    }));

    const financeParams = financeContent.map((item) => ({
        category: "finance",
        slug: item.slug,
    }));

    const essaysParams = essaysContent.map((item) => ({
        category: "essays",
        slug: item.slug,
    }));

    return [...aiParams, ...financeParams, ...essaysParams];
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
