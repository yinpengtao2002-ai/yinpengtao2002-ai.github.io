import type { Metadata } from "next";
import ToolBackButton from "@/components/finance/ToolBackButton";
import MonthlyTrendTool from "./MonthlyTrendTool";

export const metadata: Metadata = {
    title: "分月指标趋势分析模型｜多期间分析工具｜Lucas Yin",
    description: "上传连续月份数据，按自定义维度分析销量、单车质量、环比同比、同期对比、结构占比和结构集中度。",
};

function ProjectDescription({ className = "" }: { className?: string }) {
    return (
        <section className={className}>
            <h1>分月指标趋势分析模型</h1>
            <p>
                这是一个通用的多期间指标分析模型。上传带有月份、维度和数值指标的数据后，
                可以查看连续月份走势、单车质量、环比同比、同期对比、结构占比和结构集中度。
            </p>
            <h2>适用场景</h2>
            <ul>
                <li>复盘连续多个月的销量、收入、边际、利润、费用或其他业务指标。</li>
                <li>把销量、单车净收入和单车边际放在同一张趋势图里，分段观察规模和单车质量。</li>
                <li>观察多个月份中维度结构占比和集中度变化，定位更值得下钻的区域。</li>
            </ul>
            <h2>输入数据</h2>
            <ul>
                <li>一张 Excel 或 CSV 明细表，至少包含月份列、一个维度列和一个数值指标列。</li>
                <li>维度可以是产品、区域、国家、车型、部门、渠道或用户自定义字段。</li>
                <li>金额、数量等指标默认按合计分析；比率和单价类指标可按平均分析。</li>
            </ul>
            <h2>输出结果</h2>
            <ul>
                <li>多指标趋势图、环比同比图、同期月度对比和维度结构趋势。</li>
                <li>同比热力图、环比热力图和结构集中度。</li>
            </ul>
        </section>
    );
}

export default function MonthlyTrendPage() {
    return (
        <div className="fixed inset-0 overflow-hidden bg-[#faf9f5]">
            <ProjectDescription className="sr-only" />

            <noscript>
                <div className="relative z-[60] min-h-screen overflow-auto bg-[#faf9f5] p-6 text-[#141413]">
                    <ProjectDescription />
                </div>
            </noscript>

            <ToolBackButton />
            <MonthlyTrendTool />
        </div>
    );
}
