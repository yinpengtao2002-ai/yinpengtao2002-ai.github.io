"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Eye, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { buildDirectChartSpec } from "@/lib/finance/charts";
import financeAIDemoStory from "@/lib/finance-ai/demo-story.js";
import { normalizeChatMathMarkdown } from "@/lib/markdown/normalizeChatMathMarkdown";
import { normalizeMarkdownStrongEmphasis } from "@/lib/markdown/normalizeStrongEmphasis";
import FinanceAIDetailTable from "@/components/finance/FinanceAIDetailTable";
import type { FinanceChartSpec } from "@/lib/finance/charts/types";
import type { FinanceAIDemoStory } from "@/lib/finance-ai/demo-story.js";
import { normalizePlotlyLayout, normalizePlotlyTraces } from "@/lib/finance/plotly-layout";

type ChatRole = "user" | "assistant";

type SimulatedMessage = {
  id: string;
  role: ChatRole;
  text: string;
  chartTitles?: string[];
  meta?: string;
};

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

const ASSISTANT_AVATAR_IMAGE = "/images/product-stage/finance-ai-assistant-avatar.webp";
const { buildFinanceAIDemoStory } = financeAIDemoStory;
const DEMO_STORY = buildFinanceAIDemoStory();

function monthLabel(period: string) {
  const [year, month] = period.split("-");
  return `${year}年${Number(month)}月`;
}

function formatDemoNumber(value: number, maximumFractionDigits = 3) {
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
}

function formatDemoSigned(value: number) {
  const normalized = Math.abs(value) < 0.0000005 ? 0 : value;
  return `${normalized >= 0 ? "+" : ""}${formatDemoNumber(normalized)}`;
}

function formatDemoPercent(value: number) {
  return `${(value * 100).toLocaleString("zh-CN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function sumDemoValues(items: Array<{ value: number }>) {
  return items.reduce((total, item) => total + item.value, 0);
}

function buildBusinessDemoCharts(story: FinanceAIDemoStory): FinanceChartSpec[] {
  const baseLabel = monthLabel(story.periods.base);
  const currentLabel = monthLabel(story.periods.current);
  const scenarioTitle = `${currentLabel}各大区销量预算实际对比`;
  const countryTitle = `${story.country}${currentLabel}分指标预算实际表`;
  const countryBridgeTitle = `${story.country}单车边际变化归因桥`;
  const volumeMomTitle = `${currentLabel}各大区销量环比对比`;
  const unitMarginMomTitle = `${currentLabel}各大区单车边际环比对比`;
  const totalBridgeTitle = `${currentLabel}边际总额环比变化桥`;

  return [
    buildDirectChartSpec({
      type: "grouped_bar",
      title: scenarioTitle,
      xLabel: "大区",
      yLabel: "销量",
      series: [
        { name: "预算", items: story.regionScenario.budget },
        { name: "实际", items: story.regionScenario.actual },
      ],
      note: "实际和预算按同一大区并列，均来自统一示例底稿。",
    }),
    buildDirectChartSpec({
      type: "detail_table",
      title: countryTitle,
      variant: "budget_actual",
      meta: {
        primaryDimension: "指标",
        metrics: story.countryMetrics.map((metric) => metric.label),
        period: story.periods.current,
        periods: [story.periods.current],
        comparison: "scenario",
        filters: { "国家": [story.country] },
      },
      columns: ["指标", "预算", "实际", "完成率", "判断"],
      rows: story.countryMetrics.map((metric) => [
        metric.label,
        metric.budget,
        metric.actual,
        formatDemoPercent(metric.completion),
        metric.completion >= 1 ? "达到预算" : "低于预算",
      ]),
      note: "销量、净收入和边际使用相同国家、期间及业务明细汇总。",
    }),
    buildDirectChartSpec({
      type: "waterfall",
      title: countryBridgeTitle,
      startLabel: baseLabel,
      startValue: story.countryUnitMarginBridge.startValue,
      endLabel: currentLabel,
      endValue: story.countryUnitMarginBridge.endValue,
      items: story.countryUnitMarginBridge.items,
      note: "各车型贡献合计后与巴西单车边际的首尾差额一致。",
    }),
    buildDirectChartSpec({
      type: "grouped_bar",
      title: volumeMomTitle,
      xLabel: "大区",
      yLabel: "销量",
      series: [
        {
          name: baseLabel,
          items: story.regionMom.map((item) => ({ label: item.label, value: item.baseVolume })),
        },
        {
          name: currentLabel,
          items: story.regionMom.map((item) => ({ label: item.label, value: item.currentVolume })),
        },
      ],
      note: "两个期间沿用相同大区和统一销量单位。",
    }),
    buildDirectChartSpec({
      type: "grouped_bar",
      title: unitMarginMomTitle,
      xLabel: "大区",
      yLabel: "单车边际",
      series: [
        {
          name: baseLabel,
          items: story.regionMom.map((item) => ({ label: item.label, value: item.baseUnitMargin })),
        },
        {
          name: currentLabel,
          items: story.regionMom.map((item) => ({ label: item.label, value: item.currentUnitMargin })),
        },
      ],
      note: "单车边际由每个大区的边际总额除以销量重新计算。",
    }),
    buildDirectChartSpec({
      type: "waterfall",
      title: totalBridgeTitle,
      startLabel: `${baseLabel}边际总额`,
      startValue: story.totalMarginBridge.startValue,
      endLabel: `${currentLabel}边际总额`,
      endValue: story.totalMarginBridge.endValue,
      items: story.totalMarginBridge.items,
      note: "国家贡献合计后与边际总额的首尾差额一致。",
    }),
  ];
}

function buildSimulatedMessages(story: FinanceAIDemoStory): SimulatedMessage[] {
  const baseLabel = monthLabel(story.periods.base);
  const currentLabel = monthLabel(story.periods.current);
  const scenarioTitle = `${currentLabel}各大区销量预算实际对比`;
  const countryTitle = `${story.country}${currentLabel}分指标预算实际表`;
  const countryBridgeTitle = `${story.country}单车边际变化归因桥`;
  const volumeMomTitle = `${currentLabel}各大区销量环比对比`;
  const unitMarginMomTitle = `${currentLabel}各大区单车边际环比对比`;
  const totalBridgeTitle = `${currentLabel}边际总额环比变化桥`;
  const regionVariance = story.regionScenario.actual.map((actual, index) => ({
    label: actual.label,
    actual: actual.value,
    budget: story.regionScenario.budget[index]?.value ?? 0,
    change: actual.value - (story.regionScenario.budget[index]?.value ?? 0),
  }));
  const strongestRegion = [...regionVariance].sort((a, b) => b.change - a.change)[0];
  const weakestRegion = [...regionVariance].sort((a, b) => a.change - b.change)[0];
  const totalActual = sumDemoValues(story.regionScenario.actual);
  const totalBudget = sumDemoValues(story.regionScenario.budget);
  const countryMetricText = story.countryMetrics
    .map((metric) => `${metric.label}完成 ${formatDemoPercent(metric.completion)}`)
    .join("，");
  const weakestCountryMetric = [...story.countryMetrics].sort((a, b) => a.completion - b.completion)[0];
  const unitMarginChange = story.countryUnitMarginBridge.endValue - story.countryUnitMarginBridge.startValue;
  const leadingModelItems = [...story.countryUnitMarginBridge.items]
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 2);
  const regionVolumeChanges = story.regionMom.map((item) => ({
    ...item,
    volumeChange: item.currentVolume - item.baseVolume,
    unitMarginChange: item.currentUnitMargin - item.baseUnitMargin,
  }));
  const leadingVolumeRegion = [...regionVolumeChanges].sort((a, b) => b.volumeChange - a.volumeChange)[0];
  const leadingQualityRegion = [...regionVolumeChanges].sort((a, b) => b.unitMarginChange - a.unitMarginChange)[0];
  const totalMarginChange = story.totalMarginBridge.endValue - story.totalMarginBridge.startValue;
  const positiveCountries = story.totalMarginBridge.items
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
  const negativeCountries = story.totalMarginBridge.items
    .filter((item) => item.value < 0)
    .sort((a, b) => a.value - b.value)
    .slice(0, 2);

  return [
    {
      id: "demo-user-kpi",
      role: "user",
      text: `整体 KPI 表现怎么样？先看${currentLabel}各大区销量预算实际对比。`,
    },
    {
      id: "demo-assistant-kpi",
      role: "assistant",
      text: `**整体判断：**${currentLabel}销量合计 ${formatDemoNumber(totalActual)}，${totalActual >= totalBudget ? "高于" : "低于"}预算 ${formatDemoNumber(Math.abs(totalActual - totalBudget))}。${strongestRegion.label}实际 ${formatDemoNumber(strongestRegion.actual)}，相对预算变化 ${formatDemoSigned(strongestRegion.change)}；${weakestRegion.label}相对预算变化 ${formatDemoSigned(weakestRegion.change)}。\n\n区域对比只反映规模完成情况，后续仍需结合单车边际判断增长质量。`,
      chartTitles: [scenarioTitle],
      meta: "统一示例底稿，仅用于展示分析过程，不代表真实经营数据。",
    },
    {
      id: "demo-user-country",
      role: "user",
      text: `${story.country}${currentLabel}分指标完成情况怎么样？销量、净收入和边际都看一下。`,
    },
    {
      id: "demo-assistant-country",
      role: "assistant",
      text: `**${story.country}${currentLabel}预算完成情况：**${countryMetricText}。\n\n三项指标中，${weakestCountryMetric.label}完成率最低，为 ${formatDemoPercent(weakestCountryMetric.completion)}。这说明规模、收入和边际需要放在同一口径下共同判断，不能只看其中一项。`,
      chartTitles: [countryTitle],
    },
    {
      id: "demo-user-unit-margin",
      role: "user",
      text: `${story.country}单车边际为什么比${baseLabel}发生变化？`,
    },
    {
      id: "demo-assistant-unit-margin",
      role: "assistant",
      text: `**${story.country}单车边际从 ${formatDemoNumber(story.countryUnitMarginBridge.startValue)} ${unitMarginChange >= 0 ? "升至" : "降至"} ${formatDemoNumber(story.countryUnitMarginBridge.endValue)}，变化 ${formatDemoSigned(unitMarginChange)}。**按车型下钻后，${leadingModelItems.map((item) => `${item.label} 贡献 ${formatDemoSigned(item.value)}`).join("，")}，是绝对影响最大的两项。\n\n所有车型贡献相加后与单车边际首尾差额一致。`,
      chartTitles: [countryBridgeTitle],
    },
    {
      id: "demo-user-mom",
      role: "user",
      text: `${currentLabel}各大区销量和单车边际环比情况怎么样？`,
    },
    {
      id: "demo-assistant-mom",
      role: "assistant",
      text: `**环比看，${leadingVolumeRegion.label}的销量增量最大。**销量从 ${formatDemoNumber(leadingVolumeRegion.baseVolume)} 变为 ${formatDemoNumber(leadingVolumeRegion.currentVolume)}，变化 ${formatDemoSigned(leadingVolumeRegion.volumeChange)}。\n\n单车边际方面，${leadingQualityRegion.label}的改善最明显，从 ${formatDemoNumber(leadingQualityRegion.baseUnitMargin)} 变为 ${formatDemoNumber(leadingQualityRegion.currentUnitMargin)}，变化 ${formatDemoSigned(leadingQualityRegion.unitMarginChange)}。`,
      chartTitles: [volumeMomTitle, unitMarginMomTitle],
    },
    {
      id: "demo-user-total-change",
      role: "user",
      text: `${currentLabel}边际总额环比${totalMarginChange >= 0 ? "增加" : "减少"}的原因是什么？`,
    },
    {
      id: "demo-assistant-total-change",
      role: "assistant",
      text: `**${currentLabel}边际总额从 ${formatDemoNumber(story.totalMarginBridge.startValue)} 变为 ${formatDemoNumber(story.totalMarginBridge.endValue)}，环比变化 ${formatDemoSigned(totalMarginChange)}。**${positiveCountries.length ? `主要正贡献来自${positiveCountries.map((item) => `${item.label} ${formatDemoSigned(item.value)}`).join("、")}` : "本期没有国家形成正贡献"}；${negativeCountries.length ? `主要负贡献来自${negativeCountries.map((item) => `${item.label} ${formatDemoSigned(item.value)}`).join("、")}` : "本期没有国家形成负贡献"}。\n\n国家贡献合计与边际总额变化完全衔接。`,
      chartTitles: [totalBridgeTitle],
      meta: "只读示例，不能追问或编辑；进入正式助手后可以上传自己的经营明细继续分析。",
    },
  ];
}

const BUSINESS_DEMO_CHARTS = buildBusinessDemoCharts(DEMO_STORY);
const SIMULATED_MESSAGES = buildSimulatedMessages(DEMO_STORY);

function AssistantAvatar({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? "finance-ai-avatar-mini" : "finance-ai-avatar"} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- Decorative assistant avatar shared with the live chat UI. */}
      <img src={ASSISTANT_AVATAR_IMAGE} alt="" draggable="false" />
    </span>
  );
}

function FinanceAIMessageContent({ text }: { text: string }) {
  const normalizedText = normalizeMarkdownStrongEmphasis(normalizeChatMathMarkdown(text));

  return (
    <div className="finance-ai-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: ({ href, children }) => (
            <a href={href || "#"} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {normalizedText}
      </ReactMarkdown>
    </div>
  );
}

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

      void Plotly.default.react(chartNode, normalizePlotlyTraces(spec.data), normalizePlotlyLayout(spec.layout), spec.config);
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

  return <div ref={nodeRef} className="finance-ai-chart-host" aria-label={spec.title} />;
}

function FinanceAIChartGrid({ cards }: { cards: FinanceChartSpec[] }) {
  if (!cards.length) {
    return null;
  }

  return (
    <div className="finance-ai-chart-grid">
      {cards.map((spec) => (
        <div className={`finance-ai-chart-card is-${spec.kind} is-${spec.size}`} key={spec.title}>
          <div className="finance-ai-chart-card-header">
            <h2>{spec.title}</h2>
          </div>
          {spec.kind === "detail_table" ? (
            <FinanceAIDetailTable spec={spec} />
          ) : (
            <PlotlyDemoChart spec={spec} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function FinanceAIConversationDemo() {
  const specsByTitle = useMemo(() => {
    const entries = BUSINESS_DEMO_CHARTS.map((spec) => [spec.title, spec] as const);
    return new Map(entries);
  }, []);

  return (
    <div className="finance-ai-page">
      <section className="finance-ai-assistant-panel finance-ai-conversation-demo">
        <header className="finance-ai-chat-header">
          <AssistantAvatar />
          <div className="finance-ai-header-copy">
            <p className="finance-ai-kicker">Read-only Demo</p>
            <h1>财务分析 AI 助手示例</h1>
            <p>这是一个模拟对话内容，只能观看；正式使用时需要先上传自己的经营明细。</p>
          </div>
          <span className="finance-ai-readonly-pill">
            <Eye aria-hidden="true" />
            只读示例
          </span>
        </header>

        <section className="finance-ai-chat" aria-label="财务分析 AI 助手只读示例对话">
          {SIMULATED_MESSAGES.map((message) => {
            const roleClassName = message.role === "user"
              ? "finance-ai-message is-user"
              : "finance-ai-message is-assistant";
            const chartCards = (message.chartTitles ?? [])
              .map((title) => specsByTitle.get(title))
              .filter((spec): spec is FinanceChartSpec => Boolean(spec));

            return (
              <article key={message.id} className={roleClassName}>
                {message.role === "assistant" ? <AssistantAvatar compact /> : null}
                <div className="finance-ai-message-bubble">
                  <div className="finance-ai-message-section">
                    <FinanceAIMessageContent text={message.text} />
                    <FinanceAIChartGrid cards={chartCards} />
                  </div>
                  {message.meta ? <small>{message.meta}</small> : null}
                </div>
              </article>
            );
          })}
        </section>

        <div className="finance-ai-composer-dock">
          <div className="finance-ai-composer finance-ai-readonly-composer" aria-label="只读示例输入框">
            <input value="只读示例，不能追问或编辑" disabled readOnly />
            <button type="button" disabled aria-label="只读示例不可发送">
              <Loader2 aria-hidden="true" />
            </button>
          </div>

          <p className="finance-ai-session-note">
            这个页面不会上传数据、不会调用模型。<Link href="/finance/finance-ai-assistant">进入正式助手 <ArrowRight aria-hidden="true" /></Link>
          </p>
        </div>
      </section>
    </div>
  );
}
