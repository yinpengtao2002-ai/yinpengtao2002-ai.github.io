import { Sparkles, TrendingUp } from "lucide-react";
import { SectionData } from "../types";

export const sections: SectionData[] = [
    {
        id: "finance",
        title: "Financial Modeling",
        subtitle: "财务模型",
        description: "我自己搭建并持续打磨的财务模型和分析工具，欢迎大家使用",
        icon: TrendingUp,
        href: "/finance",
        gradient: "from-[#6a9bcc] to-[#788c5d]",
        iconBg: "bg-gradient-to-br from-[#6a9bcc] to-[#788c5d]",
    },
    {
        id: "thinking",
        title: "Thinking Lab",
        subtitle: "思考与方法",
        description: "记录经营分析、工具实践、市场观察和个人复盘",
        icon: Sparkles,
        href: "/thinking-lab",
        gradient: "from-[#d97757] to-[#6a9bcc]",
        iconBg: "bg-gradient-to-br from-[#d97757] to-[#6a9bcc]",
    },
];
