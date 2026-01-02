"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, TrendingUp, FileSpreadsheet, PieChart, BarChart3 } from "lucide-react";

const projects = [
    {
        id: 1,
        title: "财务模型模板",
        description: "一套完整的三表模型（资产负债表、利润表、现金流量表）模板，适用于企业财务分析和预测。",
        icon: FileSpreadsheet,
        tags: ["Excel", "三表模型", "财务分析"],
        date: "2024-12",
        href: null,
    },
    {
        id: 2,
        title: "估值分析框架",
        description: "DCF、可比公司分析、先例交易分析等主流估值方法的实战应用指南。",
        icon: TrendingUp,
        tags: ["DCF", "估值", "投资分析"],
        date: "2024-11",
        href: null,
    },
    {
        id: 3,
        title: "财务比率分析",
        description: "深入解读杜邦分析、偿债能力、营运效率等关键财务指标的计算与应用。",
        icon: PieChart,
        tags: ["财务比率", "杜邦分析", "财务健康"],
        date: "2024-10",
        href: null,
    },
    {
        id: 4,
        title: "单车边际变动归因分析",
        description: "通过上传两期财务数据，自动对比分析单车边际变动的驱动因素，帮助快速识别成本与收入的关键变化点。",
        icon: BarChart3,
        tags: ["Streamlit", "数据分析", "边际分析"],
        date: "2025-01",
        href: "/finance/margin-analysis",
    },
];

export default function FinancePage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
            {/* Back button - 绝对定位 */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute top-28 left-8"
            >
                <Link
                    href="/explore"
                    className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span>返回探索</span>
                </Link>
            </motion.div>

            {/* Main Content - 居中 */}
            <div className="text-center max-w-5xl mx-auto">
                {/* Title */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-16"
                >
                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6">
                        <span className="gradient-text">Financial Modeling</span>
                    </h1>
                    <p className="text-lg sm:text-xl text-white/50">
                        分享财务建模的心得与实践，从基础理论到高级应用
                    </p>
                </motion.div>

                {/* Projects Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-8"
                >
                    {projects.map((project, index) => {
                        const Icon = project.icon;
                        const CardContent = (
                            <>
                                {/* Icon and Date */}
                                <div className="flex items-start justify-between mb-6">
                                    <div className="p-4 rounded-xl bg-blue-500/10 text-blue-400 group-hover:text-blue-300 transition-colors">
                                        <Icon size={28} />
                                    </div>
                                    <span className="text-sm text-white/40">{project.date}</span>
                                </div>

                                {/* Content */}
                                <h3 className="text-2xl font-semibold mb-3 group-hover:text-white transition-colors">
                                    {project.title}
                                </h3>
                                <p className="text-white/50 leading-relaxed mb-6">
                                    {project.description}
                                </p>

                                {/* Tags */}
                                <div className="flex flex-wrap gap-2">
                                    {project.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="px-3 py-1.5 text-xs rounded-full bg-white/5 text-white/60"
                                        >
                                            {tag}
                                        </span>
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
                                        className="group p-8 rounded-2xl bg-white/5 border border-white/10 
                                           hover:border-white/20 hover:bg-white/10
                                           transition-all duration-300 cursor-pointer text-left h-full"
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
                                className="group p-8 rounded-2xl bg-white/5 border border-white/10 
                                   hover:border-white/20 hover:bg-white/10
                                   transition-all duration-300 cursor-pointer text-left"
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
                    <p className="text-sm text-white/30">
                        💡 这是占位内容，您可以在此处添加您的财务建模文章和项目
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
