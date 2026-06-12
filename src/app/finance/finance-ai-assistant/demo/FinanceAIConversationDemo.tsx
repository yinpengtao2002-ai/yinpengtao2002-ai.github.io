"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Eye, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { buildFinanceAIChartDemoSpecs } from "@/lib/finance-ai/chart-demo";
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

const SIMULATED_MESSAGES: SimulatedMessage[] = [
  {
    id: "demo-user-budget",
    role: "user",
    text: "5月实际和预算比一下销量，分国家看。",
  },
  {
    id: "demo-assistant-budget",
    role: "assistant",
    text: "**整体判断：**这个问题适合用分组柱状图，不适合堆叠图。并列展示实际和预算后，可以直接看每个国家是超预算还是低于预算。\n\n从示例底稿看，销量差异主要集中在头部市场，建议先看实际与预算的缺口，再下钻到车型或业务单元。",
    chartTitles: ["3月 vs 4月车型单车边际", "低单车边际国家明细"],
    meta: "示例口径：这里使用模拟底稿演示聊天形态，不代表真实经营数据。",
  },
  {
    id: "demo-user-margin",
    role: "user",
    text: "泰国单车边际为什么提升？顺便看看趋势。",
  },
  {
    id: "demo-assistant-margin",
    role: "assistant",
    text: "**泰国单车边际提升**主要来自 T1D 费率改善，其次是 T1E 费率改善；结构变化略微拖累，所以不能只看车型占比。\n\n我会把变化桥和趋势图放在一起看：瀑布桥解释来源，趋势图确认这个月是不是孤立波动。",
    chartTitles: ["泰国单车边际归因桥", "泰国单车边际趋势"],
  },
  {
    id: "demo-user-followup",
    role: "user",
    text: "哪些国家规模和质量都比较值得关注？",
  },
  {
    id: "demo-assistant-followup",
    role: "assistant",
    text: "这类问题适合用气泡图。横轴看销量规模，纵轴看单车质量，气泡大小代表相对贡献。右上角一般是优先关注的健康市场，右下角则更像是规模大但质量需要追问的市场。",
    chartTitles: ["国家经营定位气泡图"],
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
    const entries = buildFinanceAIChartDemoSpecs().map((spec) => [spec.title, spec] as const);
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
