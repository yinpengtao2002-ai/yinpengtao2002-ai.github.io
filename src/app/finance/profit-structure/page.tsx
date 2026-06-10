import type { Metadata } from "next";
import ToolBackButton from "@/components/finance/ToolBackButton";
import ProfitStructureTool from "./ProfitStructureTool";

export const metadata: Metadata = {
    title: "多维利润质量诊断模型｜财务诊断工具｜Lucas Yin",
    description: "上传通用经营明细底表，判断哪个维度最值得优先下钻，以及哪些组合正在拖累整体利润质量。",
};

function ProjectDescription({ className = "" }: { className?: string }) {
    return (
        <section className={className}>
            <h1>多维利润质量诊断模型</h1>
            <p>
                这是一个面向利润质量的多维诊断模型。上传包含月份、维度、销量和任意指标的明细后，
                可以选择质量指标和诊断粒度，找出优先下钻维度与拖累整体质量的组合。
            </p>
            <h2>适用场景</h2>
            <ul>
                <li>上传很多维度后，先判断哪个维度最值得优先分析。</li>
                <li>识别规模大但单位质量低的组合。</li>
                <li>用销量乘以单位质量差，定位拖累整体利润质量的结构。</li>
            </ul>
            <h2>输入数据</h2>
            <ul>
                <li>一张 Excel 或 CSV 底表，至少包含月份、一个维度列、销量和一个上传指标。</li>
                <li>销量列之前的字段会自动识别为分析维度，可新增、删除或改名。</li>
                <li>销量列之后的数值列会识别为上传指标，模型不会自动补造未上传的指标。</li>
            </ul>
            <h2>输出结果</h2>
            <ul>
                <li>总销量、上传指标合计和整体单位质量。</li>
                <li>维度解释力排行、结构质量地图和拖累贡献清单。</li>
                <li>按任意诊断粒度切换当前组合口径，并保留多维筛选。</li>
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
