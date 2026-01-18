import { getContentBySlug, aiContent, financeContent } from "@/lib/data/generated/content";
import Link from "next/link";
import ArticleClient from "./article-client";

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

    return [...aiParams, ...financeParams];
}

export default async function ArticlePage({ params }: PageProps) {
    const { category, slug } = await params;
    const typedCategory = category as 'ai' | 'finance';

    const article = getContentBySlug(typedCategory, slug);

    if (!article) {
        return (
            <div className="min-h-screen bg-[#FBF9F6] flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">文章未找到</h1>
                    <Link href="/explore" className="text-blue-600 hover:underline">
                        返回对话
                    </Link>
                </div>
            </div>
        );
    }

    return <ArticleClient article={article} category={typedCategory} />;
}
