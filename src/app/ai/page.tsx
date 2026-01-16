"use client";

import { motion } from "framer-motion";
import { PageLayout } from "@/components/layout";
import { ArticleCard } from "@/components/feature";
import { Button } from "@/components/ui";
import { articles, categories } from "@/lib/data/articles";

export default function AIPage() {
    return (
        <PageLayout
            backHref="/explore"
            backText="返回探索"
            title="AI Insights"
            subtitle="探索人工智能的前沿技术、工具与应用实践"
        >
            {/* Category Pills */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-wrap justify-center gap-3 mb-12"
            >
                {categories.map((cat) => (
                    <Button key={cat} variant="secondary" size="sm">
                        {cat}
                    </Button>
                ))}
            </motion.div>

            {/* Articles Grid */}
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                {articles.map((article, index) => (
                    <ArticleCard key={article.id} {...article} index={index} />
                ))}
            </motion.div>

            {/* Placeholder note */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="mt-16"
            >
                <p className="text-sm text-[#b0aea5]/60">
                    💡 这是占位内容，您可以在此处分享 AI 工具使用心得和技术见闻
                </p>
            </motion.div>
        </PageLayout>
    );
}
