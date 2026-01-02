"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Bot, Workflow, Brain, Wrench, Zap, Code } from "lucide-react";

const articles = [
    {
        id: 1,
        title: "MCP 入门指南",
        description: "Model Context Protocol 的核心概念、架构设计和实际应用场景全面解析。",
        icon: Code,
        category: "Protocol",
        date: "2024-12",
    },
    {
        id: 2,
        title: "n8n 自动化工作流",
        description: "使用 n8n 构建 AI 驱动的自动化工作流，提升日常工作效率的实战经验。",
        icon: Workflow,
        category: "Automation",
        date: "2024-11",
    },
    {
        id: 3,
        title: "LLM 提示词工程",
        description: "从基础到高级的提示词设计技巧，让大语言模型输出更精准、更有价值的内容。",
        icon: Brain,
        category: "LLM",
        date: "2024-10",
    },
    {
        id: 4,
        title: "AI Agent 开发实践",
        description: "构建智能 Agent 的核心思路：规划、记忆、工具调用和多 Agent 协作。",
        icon: Bot,
        category: "Agent",
        date: "2024-09",
    },
    {
        id: 5,
        title: "RAG 系统优化",
        description: "检索增强生成（RAG）的进阶技巧，包括分块策略、检索优化和答案生成。",
        icon: Zap,
        category: "RAG",
        date: "2024-08",
    },
    {
        id: 6,
        title: "AI 开发工具链",
        description: "推荐一些实用的 AI 开发工具：Cursor、Claude、GPT、Langchain 等使用心得。",
        icon: Wrench,
        category: "Tools",
        date: "2024-07",
    },
];

export default function AIPage() {
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
                    className="mb-12"
                >
                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6">
                        <span className="gradient-text">AI Insights</span>
                    </h1>
                    <p className="text-lg sm:text-xl text-white/50">
                        探索人工智能的前沿技术、工具与应用实践
                    </p>
                </motion.div>

                {/* Category Pills */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="flex flex-wrap justify-center gap-3 mb-12"
                >
                    {["全部", "LLM", "Agent", "Automation", "RAG", "Tools"].map((cat) => (
                        <button
                            key={cat}
                            className="px-5 py-2 text-sm rounded-full bg-white/5 text-white/60 
                       hover:bg-white/10 hover:text-white transition-all"
                        >
                            {cat}
                        </button>
                    ))}
                </motion.div>

                {/* Articles Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {articles.map((article, index) => {
                        const Icon = article.icon;

                        return (
                            <motion.article
                                key={article.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.4 + index * 0.08 }}
                                className="group p-6 rounded-2xl bg-white/5 border border-white/10 
                           hover:border-white/20 hover:bg-white/10
                           transition-all duration-300 cursor-pointer text-left"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400 group-hover:text-purple-300 transition-colors">
                                        <Icon size={22} />
                                    </div>
                                    <span className="px-3 py-1 text-xs rounded-full bg-white/5 text-white/40">
                                        {article.category}
                                    </span>
                                </div>

                                {/* Content */}
                                <h3 className="text-xl font-semibold mb-3 group-hover:text-white transition-colors">
                                    {article.title}
                                </h3>
                                <p className="text-white/50 text-sm leading-relaxed mb-4 line-clamp-2">
                                    {article.description}
                                </p>

                                {/* Date */}
                                <span className="text-xs text-white/30">{article.date}</span>
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
                        💡 这是占位内容，您可以在此处分享 AI 工具使用心得和技术见闻
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
