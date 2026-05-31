import type { Metadata } from "next";
import ToolBackButton from "@/components/finance/ToolBackButton";
import ProfitStructureTool from "./ProfitStructureTool";

export const metadata: Metadata = {
    title: "多维盈利结构分析模型｜财务诊断工具｜Lucas Yin",
    description: "上传通用经营明细底表，选择任意维度或维度组合，分析销量规模、单车质量、边际贡献和利润拖累项。",
};

function ProjectDescription({ className = "" }: { className?: string }) {
    return (
        <section className={className}>
            <h1>多维盈利结构分析模型</h1>
            <p>
                这是一个面向经营结构诊断的财务模型。上传包含月份、维度、销量、净收入、成本和边际的明细后，
                可以在任意维度或维度组合下观察规模、单车质量、边际贡献和利润拖累项。
            </p>
            <h2>适用场景</h2>
            <ul>
                <li>按大区、国家、渠道、客户、业务单元或用户自定义维度识别盈利结构。</li>
                <li>判断哪些经营对象贡献利润，哪些对象只有规模但单车质量偏弱。</li>
                <li>定位边际为负或边际率异常的拖累项，再继续下钻复盘。</li>
            </ul>
            <h2>输入数据</h2>
            <ul>
                <li>一张 Excel 或 CSV 明细表，至少包含月份、一个维度列、销量和一个金额指标。</li>
                <li>销量列之前的字段会自动识别为分析维度，可新增、删除或改名。</li>
                <li>销量列之后的数值列会识别为财务指标，默认优先使用净收入、成本和边际。</li>
            </ul>
            <h2>输出结果</h2>
            <ul>
                <li>总销量、净收入、边际、边际率和单车边际。</li>
                <li>盈利结构矩阵、分层贡献看板和经营对象排行榜。</li>
                <li>按任意维度组合切换当前分析口径，并保留多维筛选。</li>
            </ul>
        </section>
    );
}

export default function ProfitStructurePage() {
    return (
        <div className="fixed inset-0 overflow-hidden bg-[#faf9f5]">
            <ProjectDescription className="sr-only" />

            <noscript>
                <div className="relative z-[60] min-h-screen overflow-auto bg-[#faf9f5] p-6 text-[#141413]">
                    <ProjectDescription />
                </div>
            </noscript>

            <ToolBackButton />
            <ProfitStructureTool />
        </div>
    );
}
