"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { TrendingUp, Sparkles, ArrowLeft } from "lucide-react";

const sections = [
    {
        id: "finance",
        title: "Financial Modeling",
        subtitle: "财务建模 & 分析",
        description: "探索财务建模、数据分析与投资决策的专业领域",
        icon: TrendingUp,
        href: "/finance",
        gradient: "from-blue-500 to-cyan-500",
    },
    {
        id: "ai",
        title: "AI Insights",
        subtitle: "AI 见闻 & 工具",
        description: "发现人工智能的前沿趋势、工具与应用场景",
        icon: Sparkles,
        href: "/ai",
        gradient: "from-purple-500 to-pink-500",
    },
];

export default function ExplorePage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
            {/* Back button */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute top-28 left-8"
            >
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span>返回首页</span>
                </Link>
            </motion.div>

            {/* Main Content - Centered */}
            <div className="text-center max-w-5xl mx-auto">
                {/* Title */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-24"
                >
                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-8">
                        <span className="gradient-text">探索领域</span>
                    </h1>
                    <p className="text-xl text-white/50">
                        选择你感兴趣的方向，开始探索
                    </p>
                </motion.div>

                {/* Section Cards - Centered */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl mx-auto">
                    {sections.map((section, index) => {
                        const Icon = section.icon;
                        return (
                            <motion.a
                                key={section.id}
                                href={section.href}
                                initial={{ opacity: 0, y: 40 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.3 + index * 0.15 }}
                                className="group relative p-12 rounded-3xl bg-white/5 border border-white/10 
                           hover:border-white/30 hover:bg-white/10
                           transition-all duration-500 overflow-hidden
                           hover:shadow-[0_0_60px_rgba(168,85,247,0.2)]
                           hover:scale-105"
                            >
                                {/* Background gradient */}
                                <div
                                    className={`absolute inset-0 bg-gradient-to-br ${section.gradient} opacity-0 
                             group-hover:opacity-15 transition-opacity duration-500`}
                                />

                                {/* Icon */}
                                <div
                                    className={`inline-flex p-5 rounded-2xl bg-gradient-to-br ${section.gradient} 
                             mb-8`}
                                >
                                    <Icon className="w-10 h-10 text-white" />
                                </div>

                                {/* Title */}
                                <h2 className="text-3xl font-bold mb-4 group-hover:text-white transition-colors">
                                    {section.title}
                                </h2>

                                {/* Subtitle */}
                                <p className="text-white/60 text-lg mb-4">{section.subtitle}</p>

                                {/* Description */}
                                <p className="text-white/40 leading-relaxed">
                                    {section.description}
                                </p>

                                {/* Arrow indicator */}
                                <div className="absolute bottom-10 right-10 opacity-0 group-hover:opacity-100 
                              translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                                    <svg
                                        className="w-8 h-8 text-white/60"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M17 8l4 4m0 0l-4 4m4-4H3"
                                        />
                                    </svg>
                                </div>
                            </motion.a>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
