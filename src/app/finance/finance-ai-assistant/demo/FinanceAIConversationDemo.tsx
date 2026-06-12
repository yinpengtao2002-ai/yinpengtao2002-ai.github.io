"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Eye, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { buildDirectChartSpec } from "@/lib/finance-ai/charts";
import { normalizeChatMathMarkdown } from "@/lib/markdown/normalizeChatMathMarkdown";
import { normalizeMarkdownStrongEmphasis } from "@/lib/markdown/normalizeStrongEmphasis";
import FinanceAIDetailTable from "@/components/finance/FinanceAIDetailTable";
import type { FinanceChartSpec } from "@/lib/finance-ai/types";

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
const BUSINESS_DEMO_CHARTS: FinanceChartSpec[] = [
  buildDirectChartSpec({
    type: "grouped_bar",
    title: "5月各大区销量预算实际对比",
    xLabel: "大区",
    yLabel: "销量",
    series: [
      {
        name: "预算",
        items: [
          { label: "拉美", value: 42100 },
          { label: "右舵", value: 35600 },
          { label: "欧洲", value: 31800 },
          { label: "中东非", value: 18400 },
          { label: "亚太", value: 16200 },
          { label: "独联体", value: 9800 },
        ],
      },
      {
        name: "实际",
        items: [
          { label: "拉美", value: 45620 },
          { label: "右舵", value: 37180 },
          { label: "欧洲", value: 30940 },
          { label: "中东非", value: 17660 },
          { label: "亚太", value: 16880 },
          { label: "独联体", value: 10340 },
        ],
      },
    ],
    note: "用并列柱展示所有大区的预算与实际，不把不同口径堆叠相加。",
  }),
  buildDirectChartSpec({
    type: "detail_table",
    title: "巴西5月分指标预算实际表",
    variant: "budget_actual",
    meta: {
      primaryDimension: "指标",
      metrics: ["销量", "净收入", "边际总额", "利润"],
      period: "5月",
      periods: ["5月"],
      comparison: "scenario",
      filters: { "国家": ["巴西"] },
    },
    columns: ["指标", "预算", "实际", "完成率", "环比", "判断"],
    rows: [
      ["销量", 28900, 30680, "106.2%", "+8.6%", "超预算"],
      ["净收入", 992000000, 1025700000, "103.4%", "+6.9%", "达标"],
      ["边际总额", 91200000, 88500000, "97.1%", "-1.8%", "低于预算"],
      ["利润", 54600000, 52200000, "95.6%", "-2.4%", "承压"],
    ],
    note: "表格适合承接单个国家的多指标完成情况，并保留筛选和数字筛选能力。",
  }),
  buildDirectChartSpec({
    type: "waterfall",
    title: "巴西单车边际变化归因桥",
    startLabel: "4月",
    startValue: 31.2,
    endLabel: "5月",
    endValue: 28.7,
    items: [
      { label: "S56 EV", value: -0.9 },
      { label: "Tiggo 8", value: -0.65 },
      { label: "Arrizo 5", value: -0.45 },
      { label: "T18 HEV", value: 0.25 },
      { label: "其他车型", value: -0.75 },
    ],
    note: "单车指标瀑布桥的中间项应下钻到车型、国家等维度成员，而不是停留在抽象原因。",
  }),
  buildDirectChartSpec({
    type: "grouped_bar",
    title: "5月各大区销量环比对比",
    xLabel: "大区",
    yLabel: "销量",
    series: [
      {
        name: "4月",
        items: [
          { label: "拉美", value: 42010 },
          { label: "右舵", value: 35370 },
          { label: "欧洲", value: 31180 },
          { label: "中东非", value: 18140 },
          { label: "亚太", value: 16010 },
          { label: "独联体", value: 9720 },
        ],
      },
      {
        name: "5月",
        items: [
          { label: "拉美", value: 45620 },
          { label: "右舵", value: 37180 },
          { label: "欧洲", value: 30940 },
          { label: "中东非", value: 17660 },
          { label: "亚太", value: 16880 },
          { label: "独联体", value: 10340 },
        ],
      },
    ],
    note: "环比问题优先用上月和本月并列柱，避免只给一串百分比。",
  }),
  buildDirectChartSpec({
    type: "grouped_bar",
    title: "5月各大区单车边际环比对比",
    xLabel: "大区",
    yLabel: "单车边际",
    series: [
      {
        name: "4月",
        items: [
          { label: "拉美", value: 30.4 },
          { label: "右舵", value: 27.8 },
          { label: "欧洲", value: 25.6 },
          { label: "中东非", value: 23.1 },
          { label: "亚太", value: 29.2 },
          { label: "独联体", value: 22.7 },
        ],
      },
      {
        name: "5月",
        items: [
          { label: "拉美", value: 28.9 },
          { label: "右舵", value: 29.1 },
          { label: "欧洲", value: 25.4 },
          { label: "中东非", value: 22.4 },
          { label: "亚太", value: 30.0 },
          { label: "独联体", value: 22.1 },
        ],
      },
    ],
    note: "同一问题可以同时给销量和单车质量图，避免只解释规模。",
  }),
  buildDirectChartSpec({
    type: "waterfall",
    title: "5月边际总额环比变化桥",
    startLabel: "4月边际总额",
    startValue: 48000000,
    endLabel: "5月边际总额",
    endValue: 57800000,
    items: [
      { label: "巴西", value: 4200000 },
      { label: "泰国", value: 2100000 },
      { label: "墨西哥", value: 1650000 },
      { label: "马来西亚", value: 1100000 },
      { label: "西班牙", value: -1250000 },
      { label: "其他国家", value: 2000000 },
    ],
    note: "总额变化桥按国家贡献下钻，正负贡献加总后与首尾差额一致。",
  }),
];

const SIMULATED_MESSAGES: SimulatedMessage[] = [
  {
    id: "demo-user-kpi",
    role: "user",
    text: "整体 KPI 表现怎么样？先看 5月各大区销量预算实际对比。",
  },
  {
    id: "demo-assistant-kpi",
    role: "assistant",
    text: "**整体判断：**5月销量整体高于预算，但大区之间分化明显。拉美实际 45,620 台，高于预算 3,520 台；右舵实际 37,180 台，高于预算 1,580 台，是主要正贡献。\n\n欧洲和中东非分别低于预算 860 台和 740 台，后续需要重点复盘这两个大区的订单节奏、主销车型销量占比和单车边际质量。",
    chartTitles: ["5月各大区销量预算实际对比"],
    meta: "示例口径：这里使用模拟底稿演示聊天形态，不代表真实经营数据。",
  },
  {
    id: "demo-user-country",
    role: "user",
    text: "巴西 5月分指标完成情况怎么样？销量、净收入、边际和利润都看一下。",
  },
  {
    id: "demo-assistant-country",
    role: "assistant",
    text: "**巴西是规模超预算、利润质量偏弱。**销量完成 106.2%，净收入完成 103.4%，但边际只完成 97.1%，利润完成 95.6%。\n\n这说明巴西不是“卖不动”，而是销量增长没有完全转化成边际和利润。S56 EV、Tiggo 8 等车型的折扣、成本和结构占比需要单独拉出来看。",
    chartTitles: ["巴西5月分指标预算实际表"],
  },
  {
    id: "demo-user-unit-margin",
    role: "user",
    text: "巴西单车边际为什么比上月下降？",
  },
  {
    id: "demo-assistant-unit-margin",
    role: "assistant",
    text: "**巴西单车边际从 31.2 降到 28.7，下降 2.5。**按车型下钻后，S56 EV 贡献 -0.9，Tiggo 8 贡献 -0.65，Arrizo 5 贡献 -0.45，其他车型贡献 -0.75，是主要拖累。\n\nT18 HEV 有 +0.25 的小幅对冲，但不足以抵消主销车型的负贡献，巴西本月边际问题集中在 S56 EV 和 Tiggo 8 的折扣、成本与单车盈利能力同步走弱。",
    chartTitles: ["巴西单车边际变化归因桥"],
  },
  {
    id: "demo-user-mom",
    role: "user",
    text: "5月各大区销量和单车边际环比情况怎么样？",
  },
  {
    id: "demo-assistant-mom",
    role: "assistant",
    text: "**环比看，拉美和右舵的销量增长最明显，但质量表现不同。**拉美销量从 42,010 台增至 45,620 台，但单车边际从 30.4 降到 28.9，属于规模增长、质量回落。\n\n右舵销量从 35,370 台增至 37,180 台，单车边际从 27.8 提升到 29.1，是更健康的增长；欧洲和中东非则需要关注销量回落带来的总额压力。",
    chartTitles: ["5月各大区销量环比对比", "5月各大区单车边际环比对比"],
  },
  {
    id: "demo-user-total-change",
    role: "user",
    text: "5月边际总额环比增加的原因是什么？",
  },
  {
    id: "demo-assistant-total-change",
    role: "assistant",
    text: "**5月边际总额环比增加 980 万，主要来自国家层面的正贡献。**巴西贡献 +420 万，泰国贡献 +210 万，墨西哥贡献 +165 万，马来西亚贡献 +110 万，是增长主线；西班牙拖累 -125 万。\n\n总额提升的底层结构并不完全一致：巴西和泰国更偏规模拉动，墨西哥和马来西亚需要继续拆分销量、净收入和单车边际，确认增长质量是否稳定。",
    chartTitles: ["5月边际总额环比变化桥"],
    meta: "只读示例，不能追问或编辑；进入正式助手后可以上传自己的经营明细继续分析。",
  },
];

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
    <main className="finance-ai-page">
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
          <div className="finance-ai-composer" aria-label="只读示例输入框">
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
    </main>
  );
}
