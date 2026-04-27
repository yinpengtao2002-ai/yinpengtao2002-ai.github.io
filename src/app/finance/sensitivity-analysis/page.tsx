import type { Metadata } from "next";
import ToolBackButton from "@/components/finance/ToolBackButton";

export const metadata: Metadata = {
    title: "敏感性分析模型｜利润情景推演工具｜Lucas Yin",
    description: "面向企业 FBP 的利润敏感性工作台，可导入预算假设，分析收入、毛利率、费用和税率变化对经营利润与净利润的影响。",
};

function ProjectDescription({ className = "" }: { className?: string }) {
    return (
        <section className={className}>
            <h1>敏感性分析模型</h1>
            <p>
                这是一个用于企业 FBP 利润测算的敏感性分析工具，用来判断收入、毛利率、费用率、
                固定费用和税率变化对经营利润与净利润的影响。
            </p>
            <h2>适用场景</h2>
            <ul>
                <li>年度预算和滚动预测。</li>
                <li>经营利润压力测试。</li>
                <li>管理层情景推演。</li>
                <li>判断哪些变量对利润最敏感。</li>
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
                    title="敏感性分析模型"
                    className="absolute inset-0 h-full w-full border-0"
                    allow="clipboard-read; clipboard-write"
                />
            </div>
        </div>
    );
}
