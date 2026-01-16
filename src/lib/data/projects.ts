import { TrendingUp, FileSpreadsheet, PieChart, BarChart3 } from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface ProjectData {
    id: number;
    title: string;
    description: string;
    icon: LucideIcon;
    tags: string[];
    date: string;
    href: string | null;
}

export const projects: ProjectData[] = [
    {
        id: 1,
        title: "财务模型模板",
        description:
            "一套完整的三表模型（资产负债表、利润表、现金流量表）模板，适用于企业财务分析和预测。",
        icon: FileSpreadsheet,
        tags: ["Excel", "三表模型", "财务分析"],
        date: "2024-12",
        href: null,
    },
    {
        id: 2,
        title: "估值分析框架",
        description:
            "DCF、可比公司分析、先例交易分析等主流估值方法的实战应用指南。",
        icon: TrendingUp,
        tags: ["DCF", "估值", "投资分析"],
        date: "2024-11",
        href: null,
    },
    {
        id: 3,
        title: "财务比率分析",
        description:
            "深入解读杜邦分析、偿债能力、营运效率等关键财务指标的计算与应用。",
        icon: PieChart,
        tags: ["财务比率", "杜邦分析", "财务健康"],
        date: "2024-10",
        href: null,
    },
    {
        id: 4,
        title: "单车边际变动归因分析",
        description:
            "通过上传两期财务数据，自动对比分析单车边际变动的驱动因素，帮助快速识别成本与收入的关键变化点。",
        icon: BarChart3,
        tags: ["Streamlit", "数据分析", "边际分析"],
        date: "2025-01",
        href: "/finance/margin-analysis",
    },
];
