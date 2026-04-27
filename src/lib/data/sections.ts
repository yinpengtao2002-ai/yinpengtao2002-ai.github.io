import { TrendingUp, Sparkles, PenLine } from "lucide-react";
import { SectionData } from "../types";

export const sections: SectionData[] = [
    {
        id: "finance",
        title: "Financial Modeling",
        subtitle: "财务模型",
        description: "整理可直接使用的财务模型和分析工具",
        icon: TrendingUp,
        href: "/finance",
        gradient: "from-[#6a9bcc] to-[#788c5d]",
        iconBg: "bg-gradient-to-br from-[#6a9bcc] to-[#788c5d]",
    },
    {
        id: "ai",
        title: "AI Workflow",
        subtitle: "AI 工作流",
        description: "记录 AI 工具、内容生产和知识工作方法",
        icon: Sparkles,
        href: "/ai",
        gradient: "from-[#d97757] to-[#6a9bcc]",
        iconBg: "bg-gradient-to-br from-[#d97757] to-[#6a9bcc]",
    },
    {
        id: "essays",
        title: "Daily Essays",
        subtitle: "日常随笔",
        description: "记录日常观察、故事片段和个人思考",
        icon: PenLine,
        href: "/essays",
        gradient: "from-[#788c5d] to-[#d97757]",
        iconBg: "bg-gradient-to-br from-[#788c5d] to-[#d97757]",
    },
];
