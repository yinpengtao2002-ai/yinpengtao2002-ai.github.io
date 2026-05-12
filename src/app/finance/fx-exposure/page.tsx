import type { Metadata } from "next";
import ToolBackButton from "@/components/finance/ToolBackButton";
import ScenarioModelTool from "@/components/finance/ScenarioModelTool";
import { getScenarioModel } from "@/lib/finance/scenarioModels";

const model = getScenarioModel("fx-exposure");

export const metadata: Metadata = {
  title: "汇率敞口敏感性模型｜Lucas Yin",
  description: "把外币收入敞口、预算汇率、实际汇率和锁汇比例放在同一张表里，快速估算汇率对利润的影响。",
};

function ProjectDescription({ className = "" }: { className?: string }) {
  return (
    <section className={className}>
      <h1>{model.title}</h1>
      <p>{model.description}</p>
      <h2>适用场景</h2>
      <ul>
        {model.projectDescription.scenarios.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h2>输入数据</h2>
      <ul>
        {model.projectDescription.inputs.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h2>输出结果</h2>
      <ul>
        {model.projectDescription.outputs.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export default function FxExposurePage() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-[#faf9f5]">
      <ProjectDescription className="sr-only" />

      <noscript>
        <div className="relative z-[60] min-h-screen overflow-auto bg-[#faf9f5] p-6 text-[#141413]">
          <ProjectDescription />
        </div>
      </noscript>

      <ToolBackButton />
      <ScenarioModelTool slug="fx-exposure" />
    </div>
  );
}
