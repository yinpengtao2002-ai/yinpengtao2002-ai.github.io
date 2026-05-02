import type { Metadata } from "next";
import ToolBackButton from "@/components/finance/ToolBackButton";

export const metadata: Metadata = {
    title: "单车指标变动归因模型｜财务模型｜Lucas Yin",
    description: "上传两期单车指标数据，按当前分析维度拆解结构效应和费率效应，解释单车指标变化的主要来源。",
};

function ProjectDescription({ className = "" }: { className?: string }) {
    return (
        <section className={className}>
            <h1>单车指标变动归因模型</h1>
            <p>
                这是一个面向汽车业务和财务 BP 的单车指标归因工具，用于比较两期数据之间单车指标的变化，
                并按当前维度拆解结构效应与费率效应。用户可以在工具内填写具体分析的单车类型，例如填写“边际”时系统会识别为单车边际。
            </p>
            <h2>适用场景</h2>
            <ul>
                <li>月度经营复盘，解释单车指标为什么上升或下降。</li>
                <li>国家、车型、版型变化较大的业务组合分析。</li>
                <li>识别是销量结构变化影响指标，还是单车水平变化影响指标。</li>
            </ul>
            <h2>输入数据</h2>
            <ul>
                <li>月份或期间。</li>
                <li>大区、国家、车型、燃油品类、品牌等分析维度。</li>
                <li>销量和指标总额。</li>
            </ul>
            <h2>输出结果</h2>
            <ul>
                <li>基期与当期单车指标。</li>
                <li>结构效应、费率效应和总贡献。</li>
                <li>瀑布图、维度明细和可导出的分析结果。</li>
            </ul>
        </section>
    );
}

export default function MarginAnalysisPage() {
    return (
        <div className="fixed inset-0 overflow-hidden bg-[#faf9f5]">
            <ProjectDescription className="sr-only" />

            <noscript>
                <div className="relative z-[60] min-h-screen overflow-auto bg-[#faf9f5] p-6 text-[#141413]">
                    <ProjectDescription />
                </div>
            </noscript>

            <ToolBackButton />

            <div className="absolute inset-0">
                <iframe
                    src="/tools/margin-analysis/index.html"
                    title="单车指标变动归因模型"
                    className="absolute inset-0 h-full w-full border-0"
                    allow="clipboard-read; clipboard-write"
                />
            </div>
        </div>
    );
}
