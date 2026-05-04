import { getThinkingBySlug, thinkingContent } from "@/lib/data/generated/content";
import type { Metadata } from "next";
import Link from "next/link";
import ArticleReader from "@/components/content/ArticleReader";

const BASE_URL = "https://yinpengtao.cn";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export function generateStaticParams() {
  return thinkingContent.flatMap((item) => [
    { slug: item.slug },
    ...(item.aliases || []).map((slug) => ({ slug })),
  ]);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getThinkingBySlug(slug);

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

export default async function ThinkingArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = getThinkingBySlug(slug);

  if (!article) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--foreground)", marginBottom: 16 }}>文章未找到</h1>
          <Link href="/thinking-lab" style={{ color: "var(--accent)", textDecoration: "underline" }}>
            返回思考与方法
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ArticleReader
      article={article}
      sectionLabel="Thinking Lab"
      backHref="/thinking-lab"
    />
  );
}
