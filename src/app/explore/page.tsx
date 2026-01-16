"use client";

import { motion } from "framer-motion";
import { PageLayout } from "@/components/layout";
import { SectionCard } from "@/components/feature";
import { sections } from "@/lib/data/sections";

export default function ExplorePage() {
    return (
        <PageLayout
            backHref="/"
            backText="返回首页"
            title="探索领域"
            subtitle="选择你感兴趣的方向，开始探索"
        >
            {/* Section Cards */}
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl mx-auto mt-12"
            >
                {sections.map((section, index) => (
                    <SectionCard
                        key={section.id}
                        {...section}
                        index={index}
                    />
                ))}
            </motion.div>
        </PageLayout>
    );
}
