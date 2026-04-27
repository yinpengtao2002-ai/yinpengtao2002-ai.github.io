import type { Metadata } from "next";
import ToolBackButton from "@/components/finance/ToolBackButton";

export const metadata: Metadata = {
    title: "利润桥敏感性分析｜情景推演工具｜Lucas Yin",
    description: "按企业 FBP 内部利润桥口径，分析收入、返利、净收入、材料成本、变动费用、固定项和利润项对利润的影响。",
};

function ProjectDescription({ className = "" }: { className?: string }) {
    return (
        <section className={className}>
            <h1>利润桥敏感性分析</h1>
            <p>
                用于预算、滚动预测和经营复盘。输入一组利润桥假设后，可以看到收入、返利、
                变动成本、固定费用和利润项变化会怎样影响边际总额与利润。
            </p>
            <h2>适用场景</h2>
            <ul>
                <li>年度预算和滚动预测。</li>
                <li>判断利润目标能否承受收入、返利或成本变化。</li>
                <li>对比悲观、基准、乐观三种经营情景。</li>
                <li>找出最值得管理层关注的利润桥科目。</li>
            </ul>
            <h2>输入数据</h2>
            <ul>
                <li>收入和返利。</li>
                <li>材料成本、变动制造费用、变动销售费用等。</li>
                <li>技术开发费、国际固定费用、折旧加摊销、后台公共费用。</li>
                <li>其他业务利润、备件利润和子公司利润。</li>
            </ul>
            <h2>输出结果</h2>
            <ul>
                <li>净收入、边际总额、利润和利润率指标。</li>
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
                    title="利润桥敏感性分析"
                    className="absolute inset-0 h-full w-full border-0"
                    allow="clipboard-read; clipboard-write"
                />
            </div>
        </div>
    );
}
