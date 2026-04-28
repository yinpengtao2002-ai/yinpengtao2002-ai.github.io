import type { Metadata } from "next";
import ToolBackButton from "@/components/finance/ToolBackButton";
import SensitivityTool from "./SensitivityTool";

export const metadata: Metadata = {
    title: "利润敏感性分析｜情景推演工具｜Lucas Yin",
    description: "按企业 FBP 利润口径，基于现状底表调整销量、收入、成本、固定扣减项和税费假设，分析对边际与利润总额的影响。",
};

function ProjectDescription({ className = "" }: { className?: string }) {
    return (
        <section className={className}>
            <h1>利润敏感性分析</h1>
            <p>
                用于预算、滚动预测和经营复盘。输入销量、收入、成本、固定部分和税费现状后，
                可以通过百分比调整看到量价变化会怎样影响边际与利润总额。
            </p>
            <h2>适用场景</h2>
            <ul>
                <li>年度预算和滚动预测。</li>
                <li>判断利润总额目标能否承受销量、单车收入或单车成本变化。</li>
                <li>找出最值得管理层关注的利润科目。</li>
            </ul>
            <h2>输入数据</h2>
            <ul>
                <li>销量、单车净收入。</li>
                <li>单车材料成本、单车变动制造费用、单车变动销售费用。</li>
                <li>技术开发费、国际固定费用、折旧加摊销、后台公共费用、所得税等固定扣减项。</li>
                <li>其他业务利润、备件利润和子公司利润等利润贡献项。</li>
            </ul>
            <h2>输出结果</h2>
            <ul>
                <li>销量、单车边际、净收入、边际、利润总额和利润总额率指标。</li>
                <li>统一 10% 波动下的利润敏感性排序。</li>
                <li>二维敏感性矩阵。</li>
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
            <SensitivityTool />
        </div>
    );
}
