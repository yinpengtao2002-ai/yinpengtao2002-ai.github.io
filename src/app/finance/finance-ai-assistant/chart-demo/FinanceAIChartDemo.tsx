"use client";

import { useEffect, useMemo, useRef } from "react";
import { buildFinanceAIChartDemoSpecs } from "@/lib/finance-ai/chart-demo";
import type { FinanceChartSpec } from "@/lib/finance-ai/types";

type PlotlyModule = {
  default: {
    react: (
      node: HTMLDivElement,
      data: FinanceChartSpec["data"],
      layout: FinanceChartSpec["layout"],
      config: FinanceChartSpec["config"],
    ) => Promise<unknown>;
    purge: (node: HTMLDivElement) => void;
  };
};

const KIND_LABELS: Record<FinanceChartSpec["kind"], string> = {
  metric_card: "指标卡",
  trend_chart: "趋势图",
  bar_rank: "横向排名",
  waterfall_bridge: "瀑布桥",
  grouped_bar: "分组柱状图",
  stacked_bar: "堆叠柱状图",
  percent_stacked_bar: "百分比堆叠图",
  heatmap: "热力图",
  scatter_bubble: "气泡散点图",
  detail_table: "明细表",
};

function PlotlyDemoChart({ spec }: { spec: FinanceChartSpec }) {
  const nodeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const chartNode = nodeRef.current;
    const plotlyModuleName = "plotly.js-dist-min";
    const loadPlotly = () => import(plotlyModuleName) as Promise<PlotlyModule>;

    void loadPlotly().then((Plotly) => {
      if (!chartNode || cancelled) {
        return;
      }

      void Plotly.default.react(chartNode, spec.data, spec.layout, spec.config);
    }).catch(() => {
      if (chartNode) {
        chartNode.textContent = "图表渲染失败";
      }
    });

    return () => {
      cancelled = true;
      if (chartNode) {
        void loadPlotly().then((Plotly) => {
          void Plotly.default.purge(chartNode);
        });
      }
    };
  }, [spec]);

  return <div ref={nodeRef} className="finance-ai-demo-chart-host" aria-label={spec.title} />;
}

export default function FinanceAIChartDemo() {
  const specs = useMemo(() => buildFinanceAIChartDemoSpecs(), []);

  return (
    <main className="finance-ai-demo-shell">
      <header className="finance-ai-demo-header">
        <p className="finance-ai-kicker">Chart Demo</p>
        <h1>财务分析 AI 助手图表样式</h1>
        <p>这里集中放当前可承接的图表协议，用同一套上传底稿分析语境预览视觉效果。</p>
      </header>

      <section className="finance-ai-demo-grid" aria-label="财务分析 AI 助手图表 Demo">
        {specs.map((spec, index) => (
          <article className={`finance-ai-demo-card is-${spec.kind} is-${spec.size}`} key={`${spec.kind}-${spec.title}-${index}`}>
            <div className="finance-ai-demo-card-header">
              <div>
                <span>{KIND_LABELS[spec.kind]}</span>
                <h2>{spec.title}</h2>
              </div>
            </div>
            <PlotlyDemoChart spec={spec} />
            <p>{spec.note}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
