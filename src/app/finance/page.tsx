"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { PageLayout } from "@/components/layout";
import { Badge } from "@/components/ui";
import { projects } from "@/lib/data/projects";

export default function FinancePage() {
    return (
        <PageLayout
            backHref="/explore"
            backText="返回探索"
            title="Financial Modeling"
            subtitle="分享财务建模的心得与实践，从基础理论到高级应用"
        >
            {/* Projects Grid */}
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4"
            >
                {projects.map((project, index) => {
                    const Icon = project.icon;
                    const CardContent = (
                        <>
                            {/* Icon and Date */}
                            <div className="flex items-start justify-between mb-6">
                                <div className="p-4 rounded-xl bg-[#6a9bcc]/10 text-[#6a9bcc] group-hover:text-[#6a9bcc] transition-colors">
                                    <Icon size={28} />
                                </div>
                                <span className="text-sm text-[#b0aea5]">{project.date}</span>
                            </div>

                            {/* Content */}
                            <h3 className="text-2xl font-semibold mb-3 text-[#141413] group-hover:text-[#141413] transition-colors">
                                {project.title}
                            </h3>
                            <p className="text-[#b0aea5] leading-relaxed mb-6">
                                {project.description}
                            </p>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2">
                                {project.tags.map((tag) => (
                                    <Badge key={tag}>{tag}</Badge>
                                ))}
                            </div>
                        </>
                    );

                    // 如果有链接，用 Link 包裹
                    if (project.href) {
                        return (
                            <Link key={project.id} href={project.href}>
                                <motion.article
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                                    className="group p-8 rounded-2xl bg-white/80 border border-[#e8e6dc] 
                             hover:border-[#6a9bcc]/40 hover:bg-white
                             transition-all duration-300 cursor-pointer text-left h-full
                             hover:shadow-md"
                                >
                                    {CardContent}
                                </motion.article>
                            </Link>
                        );
                    }

                    // 没有链接，普通卡片
                    return (
                        <motion.article
                            key={project.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                            className="group p-8 rounded-2xl bg-white/80 border border-[#e8e6dc] 
                         hover:border-[#e8e6dc] hover:bg-white
                         transition-all duration-300 text-left
                         hover:shadow-sm"
                        >
                            {CardContent}
                        </motion.article>
                    );
                })}
            </motion.div>

            {/* Placeholder note */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="mt-16"
            >
                <p className="text-sm text-[#b0aea5]/60">
                    💡 这是占位内容，您可以在此处添加您的财务建模文章和项目
                </p>
            </motion.div>
        </PageLayout>
    );
}
