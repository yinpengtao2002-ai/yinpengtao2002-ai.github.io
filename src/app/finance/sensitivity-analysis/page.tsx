import type { Metadata } from "next";
import ToolBackButton from "@/components/finance/ToolBackButton";

export const metadata: Metadata = {
    title: "利润敏感性分析｜情景推演工具｜Lucas Yin",
    description: "调整收入、毛利率、费用率和税率假设，快速判断利润最受哪些因素影响。",
};

function ProjectDescription({ className = "" }: { className?: string }) {
    return (
        <section className={className}>
            <h1>利润敏感性分析</h1>
            <p>
                用于预算、滚动预测和经营复盘。输入一组利润假设后，可以看到收入、毛利率、
                费用率和税率变化会怎样影响经营利润与净利润。
            </p>
            <h2>适用场景</h2>
            <ul>
                <li>年度预算和滚动预测。</li>
                <li>判断利润目标能否承受收入或费用变化。</li>
                <li>对比悲观、基准、乐观三种经营情景。</li>
                <li>找出最值得管理层关注的利润驱动因素。</li>
            </ul>
            <h2>输入数据</h2>
            <ul>
                <li>基准收入和收入变动率。</li>
                <li>毛利率、销售费用率和变动经营费用率。</li>
                <li>固定经营费用、管理费用、研发费用、其他收益和所得税率。</li>
            </ul>
            <h2>输出结果</h2>
            <ul>
                <li>经营利润、净利润和利润率指标。</li>
                <li>一维敏感性排序。</li>
                <li>二维敏感性矩阵。</li>
                <li>悲观、基准、乐观三情景对比。</li>
            </ul>
        </section>
    );
}

export default function SensitivityAnalysisPage() {
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
                    src="/tools/sensitivity-analysis/index.html"
                    title="利润敏感性分析"
                    className="absolute inset-0 h-full w-full border-0"
                    allow="clipboard-read; clipboard-write"
                />
            </div>
        </div>
    );
}
