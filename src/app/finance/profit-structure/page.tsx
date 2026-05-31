import type { Metadata } from "next";
import ToolBackButton from "@/components/finance/ToolBackButton";
import ProfitStructureTool from "./ProfitStructureTool";

export const metadata: Metadata = {
    title: "多维度结构分析模型｜财务诊断工具｜Lucas Yin",
    description: "上传通用经营明细底表，选择任意维度、任意指标，分析销量规模、单位值和指标结构。",
};

function ProjectDescription({ className = "" }: { className?: string }) {
    return (
        <section className={className}>
            <h1>多维度结构分析模型</h1>
            <p>
                这是一个面向经营结构诊断的通用模型。上传包含月份、维度、销量和任意指标的明细后，
                可以在任意维度或维度组合下观察规模、单位值和指标结构。
            </p>
            <h2>适用场景</h2>
            <ul>
                <li>按大区、国家、渠道、客户、业务单元或用户自定义维度识别结构差异。</li>
                <li>判断哪些经营对象规模高，哪些对象单位值或上传指标表现更突出。</li>
                <li>定位低值对象或异常对象，再继续下钻复盘。</li>
            </ul>
            <h2>输入数据</h2>
            <ul>
                <li>一张 Excel 或 CSV 明细表，至少包含月份、一个维度列、销量和一个上传指标。</li>
                <li>销量列之前的字段会自动识别为分析维度，可新增、删除或改名。</li>
                <li>销量列之后的数值列会识别为上传指标，模型不会自动补造未上传的指标。</li>
            </ul>
            <h2>输出结果</h2>
            <ul>
                <li>总销量、上传指标合计和可计算的单位值。</li>
                <li>结构矩阵、候选图表和经营对象排行榜。</li>
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
