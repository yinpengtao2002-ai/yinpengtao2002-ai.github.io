import type { Metadata } from "next";
import ToolBackButton from "@/components/finance/ToolBackButton";
import ScenarioModelTool from "@/components/finance/ScenarioModelTool";
import { getScenarioModel } from "@/lib/finance/scenarioModels";

const model = getScenarioModel("working-capital");

export const metadata: Metadata = {
  title: "库存周转与现金占用模型｜Lucas Yin",
  description: "用库存天数、应收天数和应付天数搭出现金周转链，估算资金占用和可释放空间。",
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

export default function WorkingCapitalPage() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-[#faf9f5]">
      <ProjectDescription className="sr-only" />

      <noscript>
        <div className="relative z-[60] min-h-screen overflow-auto bg-[#faf9f5] p-6 text-[#141413]">
          <ProjectDescription />
        </div>
      </noscript>

      <ToolBackButton />
      <ScenarioModelTool slug="working-capital" />
    </div>
  );
}
