import type { Metadata } from "next";
import ToolBackButton from "@/components/finance/ToolBackButton";
import BusinessAnalysisTool from "./BusinessAnalysisTool";

export const metadata: Metadata = {
    title: "预算实际对比模型｜财务复盘工具｜Lucas Yin",
    description: "按企业 FBP 口径比较实际与预算的单车净收入、单车边际、净收入总额、边际总额、边际率和利润总额，用于边际复盘与多维度归因分析。",
};

function ProjectDescription({ className = "" }: { className?: string }) {
    return (
        <section className={className}>
            <h1>预算实际对比模型</h1>
            <p>
                这是一个面向总部经营复盘的财务模型，用实际与预算两套口径聚焦单车净收入、
                单车边际、净收入总额、边际总额、边际率和利润总额，并支持按用户上传的维度自主筛选和下钻。
            </p>
            <h2>适用场景</h2>
            <ul>
                <li>经营复盘会议，快速判断净收入、单车边际和边际总额预算达成。</li>
                <li>大区、国家、品牌市场、经营模式、业务单元、车型或自定义维度之间的边际质量对比。</li>
                <li>识别收入规模达成但边际偏差、单车收入不足或单车边际走弱的经营异常。</li>
            </ul>
            <h2>输入数据</h2>
            <ul>
                <li>Excel 模板拆成“实际”和“预算”两张子表，科目在行上、金额在列上。</li>
                <li>默认维度参考大区、国家、品牌市场、经营模式、业务单元和车型，也可以多写或少写。</li>
                <li>经营明细用于边际以上分析；固定科目可以上传或手工填写。</li>
            </ul>
            <h2>输出结果</h2>
            <ul>
                <li>单车净收入、单车边际、净收入总额、边际总额、边际率、利润总额和预算达成。</li>
                <li>边际预算缺口归因、单车净收入和单车边际矩阵、利润变动桥和利润桥。</li>
                <li>维度经营实绩、筛选和逐层下钻归因分析。</li>
            </ul>
        </section>
    );
}

export default function BusinessAnalysisPage() {
    return (
        <div className="fixed inset-0 overflow-hidden bg-[#faf9f5]">
            <ProjectDescription className="sr-only" />

            <noscript>
                <div className="relative z-[60] min-h-screen overflow-auto bg-[#faf9f5] p-6 text-[#141413]">
                    <ProjectDescription />
                </div>
            </noscript>

            <ToolBackButton />
            <BusinessAnalysisTool />
        </div>
    );
}
