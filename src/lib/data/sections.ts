import { TrendingUp, Sparkles, PenLine } from "lucide-react";
import { SectionData } from "../types";

export const sections: SectionData[] = [
    {
        id: "finance",
        title: "Financial Modeling",
        subtitle: "财务建模 & 分析",
        description: "探索财务建模、数据分析与投资决策的专业领域",
        icon: TrendingUp,
        href: "/finance",
        gradient: "from-[#6a9bcc] to-[#788c5d]",
        iconBg: "bg-gradient-to-br from-[#6a9bcc] to-[#788c5d]",
    },
    {
        id: "ai",
        title: "AI Insights",
        subtitle: "AI 见闻 & 工具",
        description: "发现人工智能的前沿趋势、工具与应用场景",
        icon: Sparkles,
        href: "/ai",
        gradient: "from-[#d97757] to-[#6a9bcc]",
        iconBg: "bg-gradient-to-br from-[#d97757] to-[#6a9bcc]",
    },
    {
        id: "essays",
        title: "Essays",
        subtitle: "随笔 & 写作",
        description: "存放随笔、小说和更个人化的写作",
        icon: PenLine,
        href: "/essays",
        gradient: "from-[#788c5d] to-[#d97757]",
        iconBg: "bg-gradient-to-br from-[#788c5d] to-[#d97757]",
    },
];
