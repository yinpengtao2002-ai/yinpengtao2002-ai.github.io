import type { Metadata } from "next";
import ToolBackButton from "@/components/finance/ToolBackButton";
import PerspectiveBITool from "./PerspectiveBITool";

export const metadata: Metadata = {
    title: "Perspective BI 分析台｜数据透视工具｜Lucas Yin",
    description: "上传 CSV 或 Excel 明细数据，先确认字段口径，再使用 Perspective 完成字段拖拽、分组、筛选、排序、透视表和图表分析。",
};

function ProjectDescription({ className = "" }: { className?: string }) {
    return (
        <section className={className}>
            <h1>Perspective BI 分析台</h1>
            <p>
                这是一个面向经营明细数据的可操作 BI 页面。用户可以上传 CSV 或 Excel 文件，
                先确认字段是维度、指标还是忽略项，再在网页中拖动字段，切换透视表、柱状图、折线图、热力图和散点图。
            </p>
            <h2>适用场景</h2>
            <ul>
                <li>临时拿到经营明细后，快速确认哪些维度和指标值得继续分析。</li>
                <li>把国家、车型、渠道、月份等维度拖进看板，先做探索式数据透视。</li>
                <li>在进入更专业的预算复盘、趋势分析或归因模型前，先整理数据手感。</li>
            </ul>
            <h2>输入数据</h2>
            <ul>
                <li>支持 CSV、XLSX 和 XLS；默认读取第一张表。</li>
                <li>页面会初步识别维度和指标，用户可以在字段口径确认区手动调整。</li>
                <li>页面默认加载一份示例数据，并提供 CSV / Excel 模板下载。</li>
            </ul>
            <h2>输出结果</h2>
            <ul>
                <li>可交互透视表、分组图表、筛选、排序和字段拖拽配置。</li>
                <li>Perspective 原生工作台会直接承接字段、分组、筛选和图表类型选择。</li>
                <li>单车、费率、占比等计算指标会作为字段加入 BI 工作台继续分析。</li>
                <li>上传后自动识别行数、维度列和指标列，并用当前数据刷新 BI 视图。</li>
            </ul>
        </section>
    );
}

export default function PerspectiveBIPage() {
    return (
        <div className="fixed inset-0 overflow-hidden bg-[#faf9f5]">
            <ProjectDescription className="sr-only" />

            <noscript>
                <div className="relative z-[60] min-h-screen overflow-auto bg-[#faf9f5] p-6 text-[#141413]">
                    <ProjectDescription />
                </div>
            </noscript>

            <div id="perspective-tool-back-button">
                <ToolBackButton />
            </div>
            <PerspectiveBITool />
        </div>
    );
}
