import type { Metadata } from "next";
import ToolBackButton from "@/components/finance/ToolBackButton";
import SensitivityTool from "./SensitivityTool";

export const metadata: Metadata = {
    title: "经营利润敏感性分析｜情景推演工具｜Lucas Yin",
    description: "按企业 FBP 内部经营利润口径，分析净收入、材料成本、变动费用和固定部分净额对边际与利润总额的影响。",
};

function ProjectDescription({ className = "" }: { className?: string }) {
    return (
        <section className={className}>
            <h1>经营利润敏感性分析</h1>
            <p>
                用于预算、滚动预测和经营复盘。输入一组经营利润假设后，可以看到净收入、
                变动成本和固定部分净额变化会怎样影响边际与利润总额。
            </p>
            <h2>适用场景</h2>
            <ul>
                <li>年度预算和滚动预测。</li>
                <li>判断利润总额目标能否承受净收入或成本变化。</li>
                <li>对比悲观、基准、乐观三种经营情景。</li>
                <li>找出最值得管理层关注的利润科目。</li>
            </ul>
            <h2>输入数据</h2>
            <ul>
                <li>净收入。</li>
                <li>材料成本、变动制造费用、变动销售费用。</li>
                <li>技术开发费、国际固定费用、折旧加摊销、后台公共费用等固定扣减项。</li>
                <li>其他业务利润、备件利润和子公司利润等利润贡献项。</li>
            </ul>
            <h2>输出结果</h2>
            <ul>
                <li>净收入、边际、利润总额和利润总额率指标。</li>
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
            <SensitivityTool />
        </div>
    );
}
