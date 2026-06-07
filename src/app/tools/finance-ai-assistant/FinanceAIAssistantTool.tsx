"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Download, FileSpreadsheet, KeyRound, Loader2, RotateCcw, Trash2, UploadCloud } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import * as XLSX from "xlsx";
import "katex/dist/katex.min.css";
import { validateFinanceActionPlan } from "@/lib/finance-ai/actions";
import { buildChartSpec } from "@/lib/finance-ai/charts";
import {
  buildBarRank,
  buildMetricSnapshot,
  buildTrendSeries,
  buildWaterfallBridge,
} from "@/lib/finance-ai/metrics";
import { inferFinanceSchema } from "@/lib/finance-ai/schema";
import { normalizeChatMathMarkdown } from "@/lib/markdown/normalizeChatMathMarkdown";
import { normalizeMarkdownStrongEmphasis } from "@/lib/markdown/normalizeStrongEmphasis";
import type {
  BarRankResult,
  FinanceActionModule,
  FinanceChartSpec,
  FinanceRow,
  FinanceSchema,
  MetricSnapshotResult,
  TrendResult,
  WaterfallBridgeResult,
} from "@/lib/finance-ai/types";

type ChatRole = "user" | "assistant";

type ChartCard = {
  id: string;
  title: string;
  spec: FinanceChartSpec;
  note: string;
};

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  chartCards?: ChartCard[];
  meta?: string;
};

type APIResponse = {
  message?: string;
  modules?: unknown;
  error?: string;
  errorCode?: string;
  errors?: string[];
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

type ComputedModule = {
  computed: MetricSnapshotResult | TrendResult | BarRankResult | WaterfallBridgeResult;
  chart:
    | { type: "trend_chart"; title: string; result: TrendResult }
    | { type: "bar_rank"; title: string; result: BarRankResult }
    | { type: "waterfall_bridge"; title: string; result: WaterfallBridgeResult }
    | null;
};

const FINANCE_AI_ACCESS_HEADER = "X-Finance-AI-Access";
const ASSISTANT_PREVIEW_IMAGE = "/images/product-stage/finance-ai-assistant-preview.png";
const SAMPLE_TEMPLATE_ROWS = [
  { "Month": "3月", "Dim_A": "拉美大区", "Dim_B": "巴西", "Dim_C": "T1D", "Dim_D": "ICE", "Dim_E": "巴西-T1D", "Sales Volume": 100, "Total Margin": 3000 },
  { "Month": "4月", "Dim_A": "拉美大区", "Dim_B": "巴西", "Dim_C": "T1D", "Dim_D": "ICE", "Dim_E": "巴西-T1D", "Sales Volume": 120, "Total Margin": 3900 },
  { "Month": "3月", "Dim_A": "拉美大区", "Dim_B": "墨西哥", "Dim_C": "T1E", "Dim_D": "EV", "Dim_E": "墨西哥-T1E", "Sales Volume": 80, "Total Margin": 1800 },
  { "Month": "4月", "Dim_A": "拉美大区", "Dim_B": "墨西哥", "Dim_C": "T1E", "Dim_D": "EV", "Dim_E": "墨西哥-T1E", "Sales Volume": 72, "Total Margin": 1650 },
];

function summarizeSchema(schema: FinanceSchema | null) {
  if (!schema) {
    return "等待上传经营明细";
  }

  return `已识别：${schema.profile.rowCount.toLocaleString("zh-CN")} 行 / ${schema.profile.periods.length} 个期间 / ${schema.dimensionColumns.length} 个维度 / ${schema.totalMetrics.length} 个可分析指标 / ${schema.unitMetrics.length} 个单车指标`;
}

function getSchemaIssueText(schema: FinanceSchema) {
  return schema.requiredIssues.map((issue) => issue.message).join(" ");
}

function normalizeRows(rows: unknown[]): FinanceRow[] {
  return rows.flatMap((row) => (
    row && typeof row === "object" && !Array.isArray(row)
      ? [row as FinanceRow]
      : []
  ));
}

async function parseFile(file: File): Promise<FinanceRow[]> {
  const name = file.name.toLowerCase();
  const workbook = name.endsWith(".csv")
    ? XLSX.read(await file.text(), { type: "string", cellDates: true })
    : XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("文件里没有可读取的工作表。");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = normalizeRows(XLSX.utils.sheet_to_json(sheet, { defval: "" }));

  if (rows.length === 0) {
    throw new Error("没有读到有效数据行，请检查表头和明细。");
  }

  return rows;
}

function getDefaultQuestion(schema: FinanceSchema | null) {
  const salesMetric = schema?.totalMetrics.find((metric) => metric.column === schema.salesColumn);
  const metric = salesMetric?.name ?? schema?.unitMetrics[0]?.name ?? schema?.totalMetrics[0]?.name ?? "销量";
  const period = schema?.profile.periods.at(-1)?.key ?? "最近月份";
  const dimension = schema?.dimensionColumns.includes("国家")
    ? "国家"
    : schema?.dimensionColumns[0] ?? "国家";

  return `${period} ${dimension}表现怎么看？${metric}环比同比如何？`;
}

function computeModule(rows: FinanceRow[], schema: FinanceSchema, module: FinanceActionModule): ComputedModule {
  switch (module.type) {
    case "metric_snapshot": {
      const computed = buildMetricSnapshot(rows, schema, module);
      const trend = module.chart?.type === "trend_chart"
        ? buildTrendSeries(rows, schema, {
            metric: module.metric,
            filters: module.filters,
            highlightPeriod: module.chart.highlightPeriod ?? module.period,
          })
        : null;

      return {
        computed,
        chart: trend
          ? { type: "trend_chart", title: `${module.metric}趋势`, result: trend }
          : null,
      };
    }

    case "trend_chart": {
      const result = buildTrendSeries(rows, schema, module);
      return {
        computed: result,
        chart: { type: "trend_chart", title: `${module.metric}趋势`, result },
      };
    }

    case "bar_rank": {
      const result = buildBarRank(rows, schema, module);
      return {
        computed: result,
        chart: { type: "bar_rank", title: `${module.dimension}${module.metric}排名`, result },
      };
    }

    case "waterfall_bridge": {
      const result = buildWaterfallBridge(rows, schema, module);
      return {
        computed: result,
        chart: {
          type: "waterfall_bridge",
          title: `${module.fromPeriod} 到 ${module.toPeriod} ${module.metric}变化桥`,
          result,
        },
      };
    }
  }
}

function buildChartCard(id: string, computed: ComputedModule): ChartCard | null {
  if (!computed.chart) {
    return null;
  }

  const spec = buildChartSpec(computed.chart);
  return {
    id,
    title: computed.chart.title,
    spec,
    note: spec.note,
  };
}

function getAPIErrorMessage(payload: APIResponse, fallback: string) {
  if (payload.errorCode === "access_not_configured") {
    return "内测密钥还没有在部署环境配置，请先配置 FINANCE_AI_ACCESS_KEY。";
  }

  if (payload.errorCode === "access_denied") {
    return "请先输入正确的内测密钥。";
  }

  if (payload.errorCode === "provider_not_configured") {
    return "当前环境还没有配置 AI Key，无法生成分析计划。";
  }

  if (payload.errorCode === "provider_failed" && payload.error?.includes("AI response was empty")) {
    return "上游模型这次没有返回内容，可以直接重试一次，或把问题说得更具体一点。";
  }

  if (payload.errorCode === "provider_invalid_plan" && payload.errors?.length) {
    return `AI 计划没有通过校验：${payload.errors.join(" ")}`;
  }

  if (payload.errors?.length) {
    return payload.errors.join(" ");
  }

  return payload.error || fallback;
}

function AssistantAvatar({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? "finance-ai-avatar-mini" : "finance-ai-avatar"} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- This reused finance model preview asset is cropped as a tiny chat avatar. */}
      <img src={ASSISTANT_PREVIEW_IMAGE} alt="" draggable="false" />
    </span>
  );
}

function downloadSampleTemplate() {
  const worksheet = XLSX.utils.json_to_sheet(SAMPLE_TEMPLATE_ROWS);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "示例格式");
  const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "finance-ai-assistant-sample.xlsx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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

function PlotlyChart({ spec }: { spec: FinanceChartSpec }) {
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
        chartNode.textContent = "图表渲染失败，请稍后重试。";
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

export default function FinanceAIAssistantTool() {
  const [accessToken, setAccessToken] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [accessBusy, setAccessBusy] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [rows, setRows] = useState<FinanceRow[]>([]);
  const [schema, setSchema] = useState<FinanceSchema | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "上传一张经营明细后，可以直接问单车边际、环比同比、利润变化来源或维度排名。",
      meta: "数据仅保留在当前页面会话中，刷新后清空。",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const dataSummary = useMemo(() => summarizeSchema(schema), [schema]);
  const canAsk = rows.length > 0 && Boolean(schema) && (schema?.requiredIssues.length ?? 0) === 0 && !busy;

  async function handleAccessSubmit() {
    const key = accessKey.trim();

    if (!key) {
      setAccessError("请输入内测密钥。");
      return;
    }

    setAccessBusy(true);
    setAccessError("");

    try {
      const response = await fetch("/api/tools/finance-ai-assistant/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const payload = await response.json().catch(() => ({})) as APIResponse & { token?: string };

      if (!response.ok || !payload.token) {
        throw new Error(getAPIErrorMessage(payload, "内测密钥校验失败。"));
      }

      setAccessToken(payload.token);
      setAccessKey("");
    } catch (accessSubmitError) {
      setAccessError(accessSubmitError instanceof Error ? accessSubmitError.message : "内测密钥校验失败。");
    } finally {
      setAccessBusy(false);
    }
  }

  async function handleFile(file: File) {
    setBusy(true);
    setError("");

    try {
      const parsedRows = await parseFile(file);
      const nextSchema = inferFinanceSchema(parsedRows);
      const newDatasetMessages: ChatMessage[] = [
        {
          id: `assistant-upload-${Date.now()}`,
          role: "assistant",
          text: nextSchema.requiredIssues.length
            ? getSchemaIssueText(nextSchema)
            : `${file.name} 已上传。${summarizeSchema(nextSchema)}。现在可以直接提问。`,
          meta: "数据仅保留在当前页面会话中，刷新后清空。",
        },
      ];
      setRows(parsedRows);
      setSchema(nextSchema);
      setFileName(file.name);
      setMessages(newDatasetMessages);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "文件读取失败，请换一个 CSV/XLS/XLSX 文件。");
    } finally {
      setBusy(false);
    }
  }

  async function callAI(mode: "plan" | "explain", body: Record<string, unknown>): Promise<APIResponse> {
    if (!accessToken) {
      throw new Error("请先输入正确的内测密钥。");
    }

    const response = await fetch("/api/tools/finance-ai-assistant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [FINANCE_AI_ACCESS_HEADER]: accessToken,
      },
      body: JSON.stringify({ mode, ...body }),
    });
    const payload = await response.json().catch(() => ({})) as APIResponse;

    if (!response.ok) {
      throw new Error(getAPIErrorMessage(payload, "AI 请求失败，请稍后再试。"));
    }

    return payload;
  }

  async function handleSubmit() {
    const question = input.trim();

    if (!question) {
      return;
    }

    if (!schema || rows.length === 0) {
      setError("请先上传一张 CSV/XLS/XLSX 经营明细。");
      return;
    }

    if (schema.requiredIssues.length > 0) {
      setError(getSchemaIssueText(schema));
      return;
    }

    setBusy(true);
    setError("");
    setInput("");
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", text: question }]);

    try {
      const plan = await callAI("plan", {
        question,
        schema,
        state: {
          recentQuestions: messages
            .filter((message) => message.role === "user")
            .slice(-4)
            .map((message) => message.text),
          chartHistory: messages.flatMap((message) => (
            message.chartCards?.map((card) => ({ type: card.spec.kind, title: card.title })) ?? []
          )).slice(-6),
        },
      });
      const validated = validateFinanceActionPlan(schema, plan);

      if (!validated.ok) {
        throw new Error(`AI 计划没有通过校验：${validated.errors.join(" ")}`);
      }

      const computedModules = validated.modules.map((module) => computeModule(rows, schema, module));
      const chartCards = computedModules
        .map((computed, index) => buildChartCard(`chart-${Date.now()}-${index}`, computed))
        .filter((card): card is ChartCard => card !== null);
      const explanation = await callAI("explain", {
        question,
        computedSummary: {
          modules: computedModules.map((module) => module.computed),
          charts: chartCards.map((card) => ({
            type: card.spec.kind,
            title: card.title,
            note: card.note,
          })),
        },
      });

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: explanation.message || "我已经根据当前底稿生成分析结果。",
          chartCards,
          meta: "口径：单车指标按筛选范围先汇总总额和销量，再相除。",
        },
      ]);
    } catch (submitError) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          text: submitError instanceof Error ? submitError.message : "分析失败，请换一种问法。",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function resetData() {
    setRows([]);
    setSchema(null);
    setFileName("");
    setInput("");
    setError("");
    setMessages([{
      id: `assistant-reset-${Date.now()}`,
      role: "assistant",
      text: "当前数据已清空。重新上传经营明细后可以继续分析。",
      meta: "数据仅保留在当前页面会话中，刷新后清空。",
    }]);
  }

  return (
    <main className="finance-ai-page">
      <section className="finance-ai-assistant-panel">
        <header className="finance-ai-chat-header">
          <AssistantAvatar />
          <div className="finance-ai-header-copy">
            <p className="finance-ai-kicker">Lucas Finance AI</p>
            <h1>财务分析 AI 助手</h1>
            <p>上传经营明细后，用对话生成趋势、排名和变化桥；数字由本页本地计算。</p>
          </div>
          <div className="finance-ai-header-actions">
            <button type="button" className="finance-ai-icon-button" onClick={resetData} aria-label="清空当前数据">
              <RotateCcw aria-hidden="true" />
            </button>
            <button type="button" className="finance-ai-icon-button" onClick={resetData} aria-label="重置对话和数据">
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        </header>

        {!accessToken ? (
          <section className="finance-ai-access-gate" aria-label="财务分析 AI 助手内测访问">
            <div className="finance-ai-access-card">
              <span className="finance-ai-access-icon" aria-hidden="true">
                <KeyRound />
              </span>
              <div>
                <p className="finance-ai-kicker">Private Beta</p>
                <h2>输入内测密钥</h2>
                <p>这个模型还在内测中。通过后再上传底表，数据仍只保留在当前页面会话里。</p>
              </div>
              <form
                className="finance-ai-access-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleAccessSubmit();
                }}
              >
                <input
                  value={accessKey}
                  onChange={(event) => setAccessKey(event.target.value)}
                  placeholder="输入内测密钥"
                  type="password"
                  autoComplete="off"
                  disabled={accessBusy}
                />
                <button type="submit" disabled={accessBusy || !accessKey.trim()}>
                  {accessBusy ? <Loader2 className="finance-ai-spin" aria-hidden="true" /> : "进入"}
                </button>
              </form>
              {accessError ? <p className="finance-ai-error">{accessError}</p> : null}
            </div>
          </section>
        ) : (
          <>
        <section className="finance-ai-empty-state" aria-label="数据上传和识别状态">
          <div className="finance-ai-upload-row">
            <label className="finance-ai-upload-chip">
              <input
                type="file"
                accept=".csv,.xls,.xlsx"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleFile(file);
                  }
                  event.currentTarget.value = "";
                }}
              />
              <UploadCloud aria-hidden="true" />
              <span>上传 CSV / XLS / XLSX</span>
            </label>
            <button type="button" className="finance-ai-template-button" onClick={downloadSampleTemplate}>
              <Download aria-hidden="true" />
              <span>下载示例格式</span>
            </button>
          </div>
          <div className="finance-ai-data-status">
            <FileSpreadsheet aria-hidden="true" />
            <span>{fileName ? `${fileName} · ${dataSummary}` : dataSummary}</span>
          </div>
        </section>

        {schema?.requiredIssues.length ? (
          <p className="finance-ai-warning">{getSchemaIssueText(schema)}</p>
        ) : null}
        {error ? <p className="finance-ai-error">{error}</p> : null}

        <section className="finance-ai-chat" aria-label="财务分析聊天流">
          {messages.map((message) => (
            <article key={message.id} className={`finance-ai-message is-${message.role}`}>
              {message.role === "assistant" ? (
                <AssistantAvatar compact />
              ) : null}
              <div className="finance-ai-message-bubble">
                <FinanceAIMessageContent text={message.text} />
                {message.chartCards?.map((card) => (
                  <div className="finance-ai-chart-card" key={card.id}>
                    <h2>{card.title}</h2>
                    <PlotlyChart spec={card.spec} />
                    <p>{card.note}</p>
                  </div>
                ))}
                {message.meta ? <small>{message.meta}</small> : null}
              </div>
            </article>
          ))}
          {busy ? (
            <article className="finance-ai-message is-assistant">
              <AssistantAvatar compact />
              <div className="finance-ai-message-bubble">
                <div className="finance-ai-thinking" aria-label="分析过程">
                  <span><Loader2 className="finance-ai-spin" aria-hidden="true" /> 理解问题</span>
                  <span>匹配字段</span>
                  <span>生成图表</span>
                </div>
              </div>
            </article>
          ) : null}
        </section>

        <form
          className="finance-ai-composer"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={schema ? getDefaultQuestion(schema) : "先上传经营明细，再开始提问"}
            disabled={busy || !canAsk}
          />
          <button type="submit" disabled={!input.trim() || !canAsk} aria-label="发送问题">
            {busy ? <Loader2 className="finance-ai-spin" aria-hidden="true" /> : <ArrowUp aria-hidden="true" />}
          </button>
        </form>

        {!canAsk && schema && schema.requiredIssues.length === 0 ? null : (
          <p className="finance-ai-session-note">数据仅保留在当前页面会话中，刷新后清空。</p>
        )}
          </>
        )}
      </section>
    </main>
  );
}
