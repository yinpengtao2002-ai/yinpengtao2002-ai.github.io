import { Code, Workflow, Brain, Bot, Zap, Wrench } from "lucide-react";
import { ArticleData } from "../types";

export const articles: ArticleData[] = [
    {
        id: 1,
        title: "MCP 入门指南",
        description:
            "Model Context Protocol 的核心概念、架构设计和实际应用场景全面解析。",
        icon: Code,
        category: "Protocol",
        date: "2024-12",
    },
    {
        id: 2,
        title: "n8n 自动化工作流",
        description:
            "使用 n8n 构建 AI 驱动的自动化工作流，提升日常工作效率的实战经验。",
        icon: Workflow,
        category: "Automation",
        date: "2024-11",
    },
    {
        id: 3,
        title: "LLM 提示词工程",
        description:
            "从基础到高级的提示词设计技巧，让大语言模型输出更精准、更有价值的内容。",
        icon: Brain,
        category: "LLM",
        date: "2024-10",
    },
    {
        id: 4,
        title: "AI Agent 开发实践",
        description:
            "构建智能 Agent 的核心思路：规划、记忆、工具调用和多 Agent 协作。",
        icon: Bot,
        category: "Agent",
        date: "2024-09",
    },
    {
        id: 5,
        title: "RAG 系统优化",
        description:
            "检索增强生成（RAG）的进阶技巧，包括分块策略、检索优化和答案生成。",
        icon: Zap,
        category: "RAG",
        date: "2024-08",
    },
    {
        id: 6,
        title: "AI 开发工具链",
        description:
            "推荐一些实用的 AI 开发工具：Cursor、Claude、GPT、Langchain 等使用心得。",
        icon: Wrench,
        category: "Tools",
        date: "2024-07",
    },
];

// Get unique categories from articles
export const categories = [
    "全部",
    ...Array.from(new Set(articles.map((a) => a.category))),
];
