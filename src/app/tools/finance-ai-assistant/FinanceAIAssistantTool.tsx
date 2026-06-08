"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Download, FileSpreadsheet, KeyRound, Loader2, RotateCcw, Trash2, UploadCloud } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import * as XLSX from "xlsx";
import "katex/dist/katex.min.css";
import { buildChartSpec, buildDirectChartSpec } from "@/lib/finance-ai/charts";
import { resolveFinanceActionFilterMembers } from "@/lib/finance-ai/filter-resolution";
import {
  FINANCE_SCENARIO_COLUMN,
  buildFinanceAnalysisRowsFromWorkbook,
  buildFinanceRawWorkbookSheetFromRows,
  normalizeFinanceWorkbookSheets,
} from "@/lib/finance-ai/workbook";
import {
  buildBarRank,
  buildMetricSnapshot,
  buildTrendSeries,
  buildWaterfallBridge,
} from "@/lib/finance-ai/metrics";
import { inferFinanceSchema, normalizePeriodValue } from "@/lib/finance-ai/schema";
import { normalizeChatMathMarkdown } from "@/lib/markdown/normalizeChatMathMarkdown";
import { normalizeMarkdownStrongEmphasis } from "@/lib/markdown/normalizeStrongEmphasis";
import FinanceAIDetailTable from "@/components/finance/FinanceAIDetailTable";
import type {
  BarRankResult,
  FinanceActionModule,
  FinanceChartSpec,
  FinanceFilter,
  FinanceRawWorkbook,
  FinanceRawWorkbookSheet,
  FinanceRow,
  FinanceSchema,
  WaterfallBridgeResult,
} from "@/lib/finance-ai/types";
import type { FinanceAIChatState } from "@/lib/finance-ai/context";

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
  analysisContext?: NonNullable<FinanceAIChatState["analysisContext"]>;
  meta?: string;
};

type APIResponse = {
  message?: string;
  assumptions?: string[];
  modules?: FinanceActionModule[];
  error?: string;
  errorCode?: string;
  errors?: string[];
};

type ComputedModule = {
  type: FinanceActionModule["type"];
  title: string;
  request: FinanceActionModule;
  result: unknown;
};

type AnalysisContextItem = NonNullable<FinanceAIChatState["analysisContext"]>[number];

type AssistantMessageSection = {
  text: string;
  chartCards: ChartCard[];
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

const FINANCE_AI_ACCESS_HEADER = "X-Finance-AI-Access";
const ASSISTANT_PREVIEW_IMAGE = "/images/product-stage/finance-ai-assistant-preview.webp";
const SAMPLE_TEMPLATE_HEADERS = ["Month", "Dim_A", "Dim_B", "Dim_C", "Dim_D", "Dim_E", "Sales Volume", "Total Margin"];
const ACTUAL_SAMPLE_TEMPLATE_ROWS = [
  { "Month": "3月", "Dim_A": "拉美大区", "Dim_B": "巴西", "Dim_C": "T1D", "Dim_D": "ICE", "Dim_E": "巴西-T1D", "Sales Volume": 100, "Total Margin": 3000 },
  { "Month": "4月", "Dim_A": "拉美大区", "Dim_B": "巴西", "Dim_C": "T1D", "Dim_D": "ICE", "Dim_E": "巴西-T1D", "Sales Volume": 120, "Total Margin": 3900 },
  { "Month": "3月", "Dim_A": "拉美大区", "Dim_B": "墨西哥", "Dim_C": "T1E", "Dim_D": "EV", "Dim_E": "墨西哥-T1E", "Sales Volume": 80, "Total Margin": 1800 },
  { "Month": "4月", "Dim_A": "拉美大区", "Dim_B": "墨西哥", "Dim_C": "T1E", "Dim_D": "EV", "Dim_E": "墨西哥-T1E", "Sales Volume": 72, "Total Margin": 1650 },
];
const BUDGET_SAMPLE_TEMPLATE_ROWS = [
  { "Month": "3月", "Dim_A": "拉美大区", "Dim_B": "巴西", "Dim_C": "T1D", "Dim_D": "ICE", "Dim_E": "巴西-T1D", "Sales Volume": 105, "Total Margin": 3200 },
  { "Month": "4月", "Dim_A": "拉美大区", "Dim_B": "巴西", "Dim_C": "T1D", "Dim_D": "ICE", "Dim_E": "巴西-T1D", "Sales Volume": 130, "Total Margin": 4200 },
  { "Month": "3月", "Dim_A": "拉美大区", "Dim_B": "墨西哥", "Dim_C": "T1E", "Dim_D": "EV", "Dim_E": "墨西哥-T1E", "Sales Volume": 78, "Total Margin": 1850 },
  { "Month": "4月", "Dim_A": "拉美大区", "Dim_B": "墨西哥", "Dim_C": "T1E", "Dim_D": "EV", "Dim_E": "墨西哥-T1E", "Sales Volume": 85, "Total Margin": 2100 },
];
const SAMPLE_TEMPLATE_README_ROWS = [
  ["项目", "说明"],
  ["推荐格式", "将实际和预算分别放在名为“实际”“预算”的工作表中；也可以使用 Actual、Budget 等英文 sheet 名。"],
  ["月份", "Month/月份列只填写纯月份，例如 3月、4月、2026-04；不要写 4月实际、5月预算。"],
  ["维度", "Dim_A 至 Dim_E 可替换为大区、国家、车型、渠道、业务单元等真实维度名称。"],
  ["指标", "Sales Volume 是销量列；Total Margin、净收入、成本、利润等总额指标可以继续向右新增。"],
  ["口径识别", "上传后页面会根据 sheet 名自动生成“数据口径”维度，AI 可用它区分实际、预算、目标或预测。"],
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

type ParsedWorkbook = {
  workbook: FinanceRawWorkbook;
  previewRows: FinanceRow[];
};

function buildRawWorkbookSheet(name: string, sheet: XLSX.WorkSheet): FinanceRawWorkbookSheet {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false }) as unknown[];
  return buildFinanceRawWorkbookSheetFromRows(name, rows);
}

async function parseFile(file: File): Promise<ParsedWorkbook> {
  const name = file.name.toLowerCase();
  const xlsxWorkbook = name.endsWith(".csv")
    ? XLSX.read(await file.text(), { type: "string", cellDates: true })
    : XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array", cellDates: true });
  const rawSheets = xlsxWorkbook.SheetNames
    .map((sheetName) => buildRawWorkbookSheet(sheetName, xlsxWorkbook.Sheets[sheetName]))
    .filter((sheet) => sheet.rowCount > 0);
  const sheets = normalizeFinanceWorkbookSheets(rawSheets);

  if (sheets.length === 0) {
    throw new Error("文件里没有可读取的经营数据工作表。");
  }

  const workbook = {
    fileName: file.name,
    sheets,
    totalRowCount: sheets.reduce((sum, sheet) => sum + sheet.rowCount, 0),
  };

  return {
    workbook,
    previewRows: buildFinanceAnalysisRowsFromWorkbook(workbook),
  };
}

function getDefaultQuestion(schema: FinanceSchema | null) {
  const salesMetric = schema?.totalMetrics.find((metric) => metric.column === schema.salesColumn);
  const metric = salesMetric?.name ?? schema?.unitMetrics[0]?.name ?? schema?.totalMetrics[0]?.name ?? "销量";
  const period = schema?.profile.periods.at(-1)?.label ?? "最近月份";
  const businessDimensions = schema?.dimensionColumns.filter((dimension) => dimension !== FINANCE_SCENARIO_COLUMN) ?? [];
  const dimension = businessDimensions.includes("国家")
    ? "国家"
    : businessDimensions[0] ?? "国家";

  return `${period} ${dimension}表现怎么看？${metric}环比同比如何？`;
}

function getRowsForSchema(workbook: FinanceRawWorkbook, schema: FinanceSchema): FinanceRow[] {
  const analysisRows = buildFinanceAnalysisRowsFromWorkbook(workbook);
  if (analysisRows.some((row) => schema.monthColumn in row && schema.salesColumn in row)) {
    return analysisRows;
  }

  return workbook.sheets.find((sheet) => (
    sheet.headers.includes(schema.monthColumn) &&
    sheet.headers.includes(schema.salesColumn)
  ))?.rows ?? workbook.sheets[0]?.rows ?? [];
}

function getPeriodDisplayLabel(schema: FinanceSchema, value?: string) {
  if (!value) {
    return "";
  }

  const periodKey = normalizePeriodValue(value)?.key ?? value;
  return schema.profile.periods.find((period) => (
    period.key === periodKey ||
    period.label === value
  ))?.label ?? value;
}

function getModuleTitle(module: FinanceActionModule, schema: FinanceSchema) {
  if (module.type === "metric_snapshot") {
    return `${getPeriodDisplayLabel(schema, module.period)} ${module.metric}`;
  }

  if (module.type === "trend_chart") {
    return `${module.metric}趋势`;
  }

  if (module.type === "bar_rank") {
    return `${module.period ? `${getPeriodDisplayLabel(schema, module.period)} ` : ""}${module.dimension}${module.metric}排名`;
  }

  if (module.type === "waterfall_bridge") {
    return `${getPeriodDisplayLabel(schema, module.fromPeriod)} 至 ${getPeriodDisplayLabel(schema, module.toPeriod)} ${module.metric}变化桥`;
  }

  if (module.type === "grouped_bar") {
    if (module.seriesDimension) {
      return `${getPeriodDisplayLabel(schema, module.period)} ${module.dimension}×${module.seriesDimension}${module.metric}对比`;
    }

    return `${getPeriodDisplayLabel(schema, module.period)} ${module.dimension}${module.metric}环比对比`;
  }

  if (module.type === "stacked_bar") {
    return `${getPeriodDisplayLabel(schema, module.period)} ${module.dimension}×${module.seriesDimension}${module.metric}结构`;
  }

  if (module.type === "percent_stacked_bar") {
    return `${getPeriodDisplayLabel(schema, module.period)} ${module.dimension}×${module.seriesDimension}${module.metric}占比`;
  }

  if (module.type === "heatmap") {
    return `${getPeriodDisplayLabel(schema, module.period)} ${module.yDimension}×${module.xDimension}${module.metric}热力图`;
  }

  if (module.type === "scatter_bubble") {
    return `${getPeriodDisplayLabel(schema, module.period)} ${module.dimension}${module.yMetric}经营定位`;
  }

  return `${getPeriodDisplayLabel(schema, module.period)} ${module.dimension}明细表`;
}

function buildBarRankDetailTable(title: string, result: BarRankResult): FinanceChartSpec | null {
  if (!result.allItems?.length || result.allItems.length <= result.visibleItemCount) {
    return null;
  }

  const hasMomComparison = result.comparison === "mom" && result.allItems.some((item) => item.changeValue !== null);
  const columns = hasMomComparison
    ? ["排名", result.dimension, `${result.metric}上期`, `${result.metric}本期`, "占比", "环比变化", "环比变化率"]
    : ["排名", result.dimension, result.metric, "占比", "行数"];

  return buildDirectChartSpec({
    type: "detail_table",
    title: `${title}完整明细`,
    columns,
    rows: result.allItems.map((item, index) => {
      if (!hasMomComparison) {
        return [
          index + 1,
          item.label,
          item.value,
          item.valueShare,
          item.rowCount,
        ];
      }

      const previousValue = item.value !== null && item.changeValue !== null
        ? item.value - item.changeValue
        : null;
      const changeRate = previousValue !== null && previousValue !== 0 && item.changeValue !== null
        ? item.changeValue / previousValue
        : null;

      return [
        index + 1,
        item.label,
        previousValue,
        item.value,
        item.valueShare,
        item.changeValue,
        changeRate,
      ];
    }),
    note: "按用户要求列出完整维度明细；图表仅保留可读的前 10 项。",
  });
}

function buildBarRankComparisonChart(title: string, result: BarRankResult): FinanceChartSpec | null {
  if (result.sort.startsWith("change")) {
    return null;
  }

  if (result.comparison !== "mom" || !result.items.some((item) => item.changeValue !== null && item.value !== null)) {
    return null;
  }

  const previousItems = result.items.map((item) => ({
    label: item.label,
    value: item.value !== null && item.changeValue !== null ? item.value - item.changeValue : 0,
  }));
  const currentItems = result.items.map((item) => ({
    label: item.label,
    value: item.value ?? 0,
  }));

  return buildDirectChartSpec({
    type: "grouped_bar",
    title: title.replace(/排名$/, "环比对比"),
    xLabel: result.dimension,
    yLabel: result.metric,
    series: [
      { name: "上期", items: previousItems },
      { name: result.period ?? "本期", items: currentItems },
    ],
    note: "用分组柱状图对比上期和本期，环比差异由两组柱高直接体现。",
  });
}

function clampChartLimit(limit: number | undefined, fallback = 10, max = 10) {
  if (!limit || !Number.isFinite(limit) || limit <= 0) {
    return fallback;
  }

  return Math.min(Math.floor(limit), max);
}

function mergeFilters(base: FinanceFilter | undefined, extra: FinanceFilter): FinanceFilter {
  return {
    ...(base ?? {}),
    ...extra,
  };
}

function getMetricValue(
  rows: FinanceRow[],
  schema: FinanceSchema,
  metric: string,
  period: string,
  filters?: FinanceFilter,
) {
  return buildMetricSnapshot(rows, schema, { metric, period, filters }).value ?? 0;
}

function getNullableMetricValue(
  rows: FinanceRow[],
  schema: FinanceSchema,
  metric: string,
  period: string,
  filters?: FinanceFilter,
) {
  return buildMetricSnapshot(rows, schema, { metric, period, filters }).value;
}

function isUnitMetric(schema: FinanceSchema, metric: string) {
  return schema.unitMetrics.some((item) => item.name === metric);
}

function getTableMetricValue(
  rows: FinanceRow[],
  schema: FinanceSchema,
  metric: string,
  period: string,
  filters?: FinanceFilter,
) {
  const value = getNullableMetricValue(rows, schema, metric, period, filters);
  return value ?? (isUnitMetric(schema, metric) ? null : 0);
}

function getTableComparisonMetricValue(
  rows: FinanceRow[],
  schema: FinanceSchema,
  metric: string,
  period: string,
  filters?: FinanceFilter,
) {
  const value = getNullableMetricValue(rows, schema, metric, period, filters);
  return value ?? (isUnitMetric(schema, metric) ? null : 0);
}

function rowMatchesFilters(row: FinanceRow, filters?: FinanceFilter, ignoredField?: string) {
  return Object.entries(filters ?? {}).every(([field, values]) => {
    if (field === ignoredField || values.length === 0) {
      return true;
    }

    return values.includes(String(row[field] ?? "").trim());
  });
}

function getAllDimensionLabels(rows: FinanceRow[], dimension: string, filters?: FinanceFilter) {
  if (filters?.[dimension]?.length) {
    return filters[dimension];
  }

  const labels = new Set<string>();
  rows.forEach((row) => {
    if (!rowMatchesFilters(row, filters, dimension)) {
      return;
    }

    const label = String(row[dimension] ?? "").trim();
    if (label) {
      labels.add(label);
    }
  });

  return Array.from(labels);
}

function completeDetailLabels(
  rows: FinanceRow[],
  schema: FinanceSchema,
  labels: string[],
  dimension: string,
  filters: FinanceFilter | undefined,
  limit: number,
) {
  const memberCount = schema.profile.dimensionValueCounts[dimension] ?? 0;
  if (memberCount <= 0 || limit < memberCount) {
    return labels;
  }

  const merged = new Set(labels);
  getAllDimensionLabels(rows, dimension, filters).forEach((label) => {
    if (merged.size < limit) {
      merged.add(label);
    }
  });

  return Array.from(merged);
}

function getRankLabels(
  rows: FinanceRow[],
  schema: FinanceSchema,
  metric: string,
  dimension: string,
  period: string,
  filters: FinanceFilter | undefined,
  limit: number,
) {
  return buildBarRank(rows, schema, {
    metric,
    dimension,
    period,
    filters,
    sort: "value_desc",
    limit,
  }).items.map((item) => item.label);
}

function buildGroupedPlanChart(rows: FinanceRow[], schema: FinanceSchema, module: FinanceActionModule, title: string) {
  if (module.type !== "grouped_bar") {
    return null;
  }

  const period = module.period ?? "";
  const seriesDimension = module.seriesDimension ?? "";

  if (seriesDimension && period) {
    const labels = getRankLabels(
      rows,
      schema,
      module.metric,
      module.dimension,
      period,
      module.filters,
      clampChartLimit(module.limit, 8, 16),
    );
    const seriesLabels = getRankLabels(
      rows,
      schema,
      module.metric,
      seriesDimension,
      period,
      module.filters,
      clampChartLimit(module.seriesLimit, 4, 6),
    );
    const series = seriesLabels.map((seriesLabel) => ({
      name: seriesLabel,
      items: labels.map((label) => ({
        label,
        value: getMetricValue(rows, schema, module.metric, period, mergeFilters(module.filters, {
          [module.dimension]: [label],
          [seriesDimension]: [seriesLabel],
        })),
      })),
    }));
    const spec = buildDirectChartSpec({
      type: "grouped_bar",
      title,
      xLabel: module.dimension,
      yLabel: module.metric,
      series,
      note: "用并列柱对比实际、预算、目标等不同口径，同一维度下的口径不能相加。",
    });

    return {
      result: series,
      spec,
    };
  }

  const result = buildBarRank(rows, schema, {
    metric: module.metric,
    dimension: module.dimension,
    period: module.period,
    filters: module.filters,
    comparison: "mom",
    sort: "value_desc",
    limit: module.limit,
  });

  return {
    result,
    spec: buildBarRankComparisonChart(title, result) ?? buildChartSpec({ type: "bar_rank", title, result }),
  };
}

function buildStackedPlanChart(rows: FinanceRow[], schema: FinanceSchema, module: FinanceActionModule, title: string): FinanceChartSpec | null {
  if (module.type !== "stacked_bar" && module.type !== "percent_stacked_bar") {
    return null;
  }

  const labels = getRankLabels(
    rows,
    schema,
    module.metric,
    module.dimension,
    module.period,
    module.filters,
    clampChartLimit(module.limit, 8, 10),
  );
  const seriesLabels = getRankLabels(
    rows,
    schema,
    module.metric,
    module.seriesDimension,
    module.period,
    module.filters,
    clampChartLimit(module.seriesLimit, 5, 6),
  );
  const rawMatrix = seriesLabels.map((seriesLabel) => ({
    name: seriesLabel,
    items: labels.map((label) => ({
      label,
      value: getMetricValue(rows, schema, module.metric, module.period, mergeFilters(module.filters, {
        [module.dimension]: [label],
        [module.seriesDimension]: [seriesLabel],
      })),
    })),
  }));

  const series = module.type === "percent_stacked_bar"
    ? rawMatrix.map((series) => ({
        ...series,
        items: series.items.map((item, itemIndex) => {
          const total = rawMatrix.reduce((sum, currentSeries) => sum + currentSeries.items[itemIndex].value, 0);
          return { ...item, value: total === 0 ? 0 : item.value / total };
        }),
      }))
    : rawMatrix;

  return buildDirectChartSpec({
    type: module.type,
    title,
    xLabel: module.dimension,
    yLabel: module.metric,
    series,
    note: module.type === "percent_stacked_bar"
      ? "按主维度和系列维度计算结构占比，适合比较构成差异。"
      : "按主维度和系列维度堆叠展示绝对结构。",
  });
}

function buildHeatmapPlanChart(rows: FinanceRow[], schema: FinanceSchema, module: FinanceActionModule, title: string): FinanceChartSpec | null {
  if (module.type !== "heatmap") {
    return null;
  }

  const limit = clampChartLimit(module.limit, 8, 10);
  const xLabels = getRankLabels(rows, schema, module.metric, module.xDimension, module.period, module.filters, limit);
  const yLabels = getRankLabels(rows, schema, module.metric, module.yDimension, module.period, module.filters, limit);
  const values = yLabels.map((yLabel) => (
    xLabels.map((xLabel) => getNullableMetricValue(rows, schema, module.metric, module.period, mergeFilters(module.filters, {
      [module.xDimension]: [xLabel],
      [module.yDimension]: [yLabel],
    })))
  ));

  return buildDirectChartSpec({
    type: "heatmap",
    title,
    xLabels,
    yLabels,
    values,
    note: "按两个维度交叉计算指标，用颜色定位高低表现。",
  });
}

function buildScatterPlanChart(rows: FinanceRow[], schema: FinanceSchema, module: FinanceActionModule, title: string): FinanceChartSpec | null {
  if (module.type !== "scatter_bubble") {
    return null;
  }

  const labels = getRankLabels(
    rows,
    schema,
    module.xMetric,
    module.dimension,
    module.period,
    module.filters,
    clampChartLimit(module.limit, 12, 15),
  );
  const items = labels.map((label) => {
    const filters = mergeFilters(module.filters, { [module.dimension]: [label] });
    return {
      label,
      x: getMetricValue(rows, schema, module.xMetric, module.period, filters),
      y: getMetricValue(rows, schema, module.yMetric, module.period, filters),
      size: module.sizeMetric ? getMetricValue(rows, schema, module.sizeMetric, module.period, filters) : undefined,
    };
  });

  return buildDirectChartSpec({
    type: "scatter_bubble",
    title,
    xLabel: module.xMetric,
    yLabel: module.yMetric,
    items,
    note: "每个点代表一个维度成员，用横轴、纵轴和气泡大小同时观察规模与质量。",
  });
}

function buildDetailTablePlanChart(rows: FinanceRow[], schema: FinanceSchema, module: FinanceActionModule, title: string): FinanceChartSpec | null {
  if (module.type !== "detail_table") {
    return null;
  }

  const primaryMetric = module.metrics[0] ?? schema.totalMetrics[0]?.name ?? schema.unitMetrics[0]?.name;
  const limit = clampChartLimit(module.limit, 20, 120);
  const labels = completeDetailLabels(rows, schema, getRankLabels(
    rows,
    schema,
    primaryMetric,
    module.dimension,
    module.period,
    module.filters,
    limit,
  ), module.dimension, module.filters, limit);
  const shouldCompareMom = module.comparison === "mom" && primaryMetric;
  const currentPeriodSort = schema.profile.periods.find((item) => item.key === module.period)?.sort ?? 0;
  const previousPeriod = shouldCompareMom
    ? schema.profile.periods
        .filter((period) => period.sort < currentPeriodSort)
        .at(-1)
    : undefined;
  const columns = shouldCompareMom && previousPeriod
    ? [
        module.dimension,
        ...module.metrics.flatMap((metric) => [
          `${metric}上期`,
          `${metric}本期`,
          `${metric}环比变化`,
          `${metric}环比变化率`,
        ]),
      ]
    : [module.dimension, ...module.metrics];
  const rowsData = labels.map((label) => {
    const filters = mergeFilters(module.filters, { [module.dimension]: [label] });

    if (!shouldCompareMom || !previousPeriod) {
      return [
        label,
        ...module.metrics.map((metric) => getTableMetricValue(rows, schema, metric, module.period, filters)),
      ];
    }

    return [
      label,
      ...module.metrics.flatMap((metric) => {
        const current = getTableComparisonMetricValue(rows, schema, metric, module.period, filters);
        const previous = getTableComparisonMetricValue(rows, schema, metric, previousPeriod.key, filters);
        const change = current !== null && previous !== null ? current - previous : null;
        const changeRate = previous !== null && previous !== 0 && change !== null ? change / previous : null;

        return [previous, current, change, changeRate];
      }),
    ];
  });

  if (module.comparison === "mom" && !previousPeriod) {
    const currentPeriodSort = schema.profile.periods.find((item) => item.key === module.period)?.sort ?? 0;
    if (currentPeriodSort > 0) {
      module.metrics.forEach((metric) => {
        columns.push(`${metric}环比变化`);
      });
      rowsData.forEach((row) => {
        module.metrics.forEach(() => {
          row.push(null);
        });
      });
    }
  }

  return buildDirectChartSpec({
    type: "detail_table",
    title,
    columns,
    rows: rowsData,
    note: "按用户要求列出可核对的维度明细。",
  });
}

function buildExpandedPlanChart(rows: FinanceRow[], schema: FinanceSchema, module: FinanceActionModule, title: string): { result: unknown; spec: FinanceChartSpec } | null {
  const grouped = buildGroupedPlanChart(rows, schema, module, title);
  if (grouped) {
    return grouped;
  }

  const spec = buildStackedPlanChart(rows, schema, module, title) ??
    buildHeatmapPlanChart(rows, schema, module, title) ??
    buildScatterPlanChart(rows, schema, module, title) ??
    buildDetailTablePlanChart(rows, schema, module, title);

  return spec ? { result: spec.data, spec } : null;
}

function getRequestedRankLimit(question: string) {
  const match = question.match(/(?:top|bottom|前|后|倒数)\s*(\d{1,3})/i);
  const limit = match ? Number(match[1]) : null;

  return limit && Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : null;
}

function executeFinancePlan(
  rows: FinanceRow[],
  schema: FinanceSchema,
  modules: FinanceActionModule[],
): { computedModules: ComputedModule[]; chartCards: ChartCard[] } {
  const computedModules: ComputedModule[] = [];
  const chartCards: ChartCard[] = [];

  modules.forEach((module, index) => {
    const title = getModuleTitle(module, schema);

    if (module.type === "metric_snapshot") {
      const result = buildMetricSnapshot(rows, schema, module);
      computedModules.push({ type: "metric_snapshot", title, request: module, result });

      if (module.chart?.type === "trend_chart") {
        const trendResult = buildTrendSeries(rows, schema, {
          metric: module.metric,
          filters: module.filters,
          highlightPeriod: module.chart.highlightPeriod ?? module.period,
        });
        const spec = buildChartSpec({ type: "trend_chart", title: `${module.metric}趋势`, result: trendResult });
        chartCards.push({ id: `chart-${Date.now()}-${index}-snapshot-trend`, title: spec.title, spec, note: spec.note });
      }
      return;
    }

    if (module.type === "trend_chart") {
      const result = buildTrendSeries(rows, schema, module);
      const spec = buildChartSpec({ type: "trend_chart", title, result });
      computedModules.push({ type: "trend_chart", title, request: module, result });
      chartCards.push({ id: `chart-${Date.now()}-${index}`, title, spec, note: spec.note });
      return;
    }

    if (module.type === "bar_rank") {
      const result = buildBarRank(rows, schema, module);
      const spec = buildBarRankComparisonChart(title, result) ?? buildChartSpec({ type: "bar_rank", title, result });
      computedModules.push({ type: "bar_rank", title, request: module, result });
      chartCards.push({ id: `chart-${Date.now()}-${index}`, title, spec, note: spec.note });
      const detailSpec = buildBarRankDetailTable(title, result);
      if (detailSpec) {
        chartCards.push({
          id: `chart-${Date.now()}-${index}-detail-table`,
          title: detailSpec.title,
          spec: detailSpec,
          note: detailSpec.note,
        });
      }
      return;
    }

    if (module.type === "waterfall_bridge") {
      const result = buildWaterfallBridge(rows, schema, module);
      const spec = buildChartSpec({ type: "waterfall_bridge", title, result });
      computedModules.push({ type: "waterfall_bridge", title, request: module, result });
      chartCards.push({ id: `chart-${Date.now()}-${index}`, title, spec, note: spec.note });
      return;
    }

    const expanded = buildExpandedPlanChart(rows, schema, module, title);
    if (expanded) {
      computedModules.push({ type: module.type, title, request: module, result: expanded.result });
      chartCards.push({ id: `chart-${Date.now()}-${index}`, title, spec: expanded.spec, note: expanded.spec.note });
    }
  });

  return { computedModules, chartCards };
}

function buildComputedSummary(question: string, schema: FinanceSchema, computedModules: ComputedModule[]) {
  const requestedRankLimit = getRequestedRankLimit(question);

  return {
    question,
    answerRules: [
      "items/visibleItemCount 只是图表可见项限制，不代表回答只能覆盖这些项。",
      "bar_rank 如果有 allItems 或 answerItems，说明完整明细表会在消息下方展示；不要说只返回、只能看到或仅给了可见 Top N。",
      "用户指定 Top/Bottom N 时，按 answerItems 或 allItems 的前 N 项回答；正文不要重复手写完整 Markdown 表格。",
      "scatter_bubble、heatmap、stacked_bar、percent_stacked_bar 通常只是可视子集或交叉截面；除非 detail_table 明确覆盖全量，否则不要说所有国家/所有车型/完整全量都已展示。",
      "对用户可见的月份使用 schema.periods.periodLabels 或 result 里的 label，不要直接写 M03/M04 这类内部期间 key。",
    ],
    schema: {
      rowCount: schema.profile.rowCount,
      periods: schema.profile.periods,
      periodLabels: Object.fromEntries(schema.profile.periods.map((period) => [period.key, period.label])),
      dimensions: schema.dimensionColumns,
      totalMetrics: schema.totalMetrics,
      unitMetrics: schema.unitMetrics,
    },
    modules: computedModules.map((module) => {
      if (module.type !== "bar_rank") {
        return module;
      }

      const result = module.result as BarRankResult;
      const allRankItems = result.allItems ?? result.items;
      const answerLimit = requestedRankLimit ?? allRankItems.length;

      return {
        ...module,
        answerGuidance: {
          requestedRankLimit,
          chartVisibleItemCount: result.visibleItemCount,
          totalItemCount: result.totalItemCount,
          hasCompleteDetailTable: Boolean(result.allItems?.length),
          answerItemCount: Math.min(answerLimit, allRankItems.length),
          instruction: "用 answerItems 回答用户要的排名；visibleItemCount 只解释图表展示，不要说结果只返回了可见 Top N。",
        },
        answerItems: allRankItems.slice(0, answerLimit),
      };
    }),
  };
}

function getRequestMetric(request: FinanceActionModule) {
  if ("metric" in request && typeof request.metric === "string") {
    return request.metric;
  }

  if ("yMetric" in request && typeof request.yMetric === "string") {
    return request.yMetric;
  }

  return undefined;
}

function getRequestDimension(request: FinanceActionModule) {
  const record = request as Record<string, unknown>;

  return typeof record.dimension === "string"
    ? record.dimension
    : typeof record.yDimension === "string"
      ? record.yDimension
      : undefined;
}

function getRequestPeriod(request: FinanceActionModule) {
  const record = request as Record<string, unknown>;

  return typeof record.period === "string" ? record.period : undefined;
}

function getRequestFilters(request: FinanceActionModule) {
  return "filters" in request ? request.filters : undefined;
}

function getModuleFocusValues(module: ComputedModule): AnalysisContextItem["focusValues"] {
  const requestDimension = getRequestDimension(module.request);
  const filterFocusValues = Object.entries(getRequestFilters(module.request) ?? {})
    .flatMap(([dimension, values]) => values.slice(0, 4).map((value) => ({ dimension, value })));

  if (module.type === "bar_rank" && requestDimension) {
    const result = module.result as BarRankResult;
    return [
      ...filterFocusValues,
      ...(result.allItems ?? result.items)
        .slice(0, 5)
        .map((item) => ({ dimension: requestDimension, value: item.label })),
    ];
  }

  if (module.type === "waterfall_bridge" && requestDimension) {
    const result = module.result as WaterfallBridgeResult;
    return [
      ...filterFocusValues,
      ...result.items
        .slice(0, 5)
        .map((item) => ({ dimension: requestDimension, value: item.label })),
    ];
  }

  return filterFocusValues;
}

function buildAnalysisContext(computedModules: ComputedModule[]): NonNullable<FinanceAIChatState["analysisContext"]> {
  return computedModules.map((module) => {
    const request = module.request as Record<string, unknown>;

    return {
      type: module.type,
      title: module.title,
      ...(getRequestMetric(module.request) ? { metric: getRequestMetric(module.request) } : {}),
      ...(getRequestDimension(module.request) ? { dimension: getRequestDimension(module.request) } : {}),
      ...(getRequestPeriod(module.request) ? { period: getRequestPeriod(module.request) } : {}),
      ...(typeof request.fromPeriod === "string" ? { fromPeriod: request.fromPeriod } : {}),
      ...(typeof request.toPeriod === "string" ? { toPeriod: request.toPeriod } : {}),
      ...(getRequestFilters(module.request) ? { filters: getRequestFilters(module.request) } : {}),
      focusValues: getModuleFocusValues(module),
    };
  });
}

function getAPIErrorMessage(payload: APIResponse, fallback: string) {
  if (payload.errorCode === "access_not_configured") {
    return "内测密钥还没有在部署环境配置，请先配置 FINANCE_AI_ACCESS_KEY。";
  }

  if (payload.errorCode === "access_denied") {
    return "请先输入正确的内测密钥。";
  }

  if (payload.errorCode === "provider_not_configured") {
    return "当前环境还没有配置 AI Key，无法分析底稿。";
  }

  if (payload.errorCode === "provider_timeout") {
    return "DeepSeek 分析超时了，可以直接重试一次，或先把问题缩窄到一个月份、一个指标或一个维度。";
  }

  if (payload.errorCode === "provider_empty_response") {
    return "DeepSeek 这次没有返回正文内容，可以直接重试一次，或把问题缩窄到一个月份、一个指标或一个维度。";
  }

  if (payload.errorCode === "provider_invalid_plan" && payload.errors?.length) {
    return `AI 计划没有通过校验：${payload.errors.join(" ")}`;
  }

  if (payload.errorCode === "provider_invalid_json") {
    return "上游模型这次没有按约定返回图表数据，可以直接重试一次。";
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

function makeTemplateWorksheet(rows: Record<string, string | number>[]) {
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: SAMPLE_TEMPLATE_HEADERS });
  worksheet["!cols"] = SAMPLE_TEMPLATE_HEADERS.map((header) => ({ wch: Math.max(header.length + 4, 14) }));
  return worksheet;
}

function downloadSampleTemplate() {
  const workbook = XLSX.utils.book_new();
  const actualWorksheet = makeTemplateWorksheet(ACTUAL_SAMPLE_TEMPLATE_ROWS);
  const budgetWorksheet = makeTemplateWorksheet(BUDGET_SAMPLE_TEMPLATE_ROWS);
  const readmeWorksheet = XLSX.utils.aoa_to_sheet(SAMPLE_TEMPLATE_README_ROWS);
  readmeWorksheet["!cols"] = [{ wch: 18 }, { wch: 96 }];

  XLSX.utils.book_append_sheet(workbook, actualWorksheet, "实际");
  XLSX.utils.book_append_sheet(workbook, budgetWorksheet, "预算");
  XLSX.utils.book_append_sheet(workbook, readmeWorksheet, "填表说明");
  const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "finance-ai-assistant-template.xlsx";
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

function buildAssistantMessageSections(message: ChatMessage): AssistantMessageSection[] {
  const chartCards = message.chartCards ?? [];

  return [{
    text: message.text,
    chartCards,
  }];
}

function FinanceAIChartGrid({
  cards,
  className = "finance-ai-chart-grid",
}: {
  cards: ChartCard[];
  className?: string;
}) {
  if (!cards.length) {
    return null;
  }

  return (
    <div className={className}>
      {cards.map((card) => (
        <div className={`finance-ai-chart-card is-${card.spec.kind} is-${card.spec.size}`} key={card.id}>
          <div className="finance-ai-chart-card-header">
            <h2>{card.title}</h2>
          </div>
          {card.spec.kind === "detail_table" ? (
            <FinanceAIDetailTable spec={card.spec} />
          ) : (
            <PlotlyChart spec={card.spec} />
          )}
        </div>
      ))}
    </div>
  );
}

function PlotlyChart({ spec, className = "finance-ai-chart-host" }: { spec: FinanceChartSpec; className?: string }) {
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

  return <div ref={nodeRef} className={className} aria-label={spec.title} />;
}

export default function FinanceAIAssistantTool() {
  const [accessToken, setAccessToken] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [accessBusy, setAccessBusy] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [workbook, setWorkbook] = useState<FinanceRawWorkbook | null>(null);
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
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const dataSummary = useMemo(() => summarizeSchema(schema), [schema]);
  const canAsk = Boolean(workbook) && !busy;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({ block: "end" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [messages, busy]);

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
      const parsed = await parseFile(file);
      const nextSchema = inferFinanceSchema(parsed.previewRows);
      setWorkbook(parsed.workbook);
      setSchema(nextSchema);
      setFileName(file.name);
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

    if (!workbook) {
      setError("请先上传一张 CSV/XLS/XLSX 经营明细。");
      return;
    }

    setBusy(true);
    setError("");
    setInput("");
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", text: question }]);

    try {
      const chatState = {
        recentQuestions: messages
          .filter((message) => message.role === "user")
          .slice(-4)
          .map((message) => message.text),
        recentAssistantMessages: messages
          .filter((message) => message.role === "assistant")
          .slice(-2)
          .map((message) => message.text),
        chartHistory: messages.flatMap((message) => (
          message.chartCards?.map((card) => ({ type: card.spec.kind, title: card.title })) ?? []
        )).slice(-6),
        analysisContext: messages.flatMap((message) => message.analysisContext ?? []).slice(-6),
      };
      const lastAnalysisContext = chatState.analysisContext.at(-1);
      const stateForPlanning = {
        ...chatState,
        ...(lastAnalysisContext?.metric ? { currentMetric: lastAnalysisContext.metric } : {}),
        ...(lastAnalysisContext?.filters ? { currentFilters: lastAnalysisContext.filters } : {}),
      };
      if (!schema) {
        throw new Error("当前底稿还没有识别出可分析字段，请检查示例格式后重新上传。");
      }

      const plan = await callAI("plan", {
        question,
        schema,
        state: stateForPlanning,
      });
      if (!plan.modules?.length) {
        throw new Error("AI 这次没有返回可执行的分析计划，请直接重试一次。");
      }

      const rows = getRowsForSchema(workbook, schema);
      const filterResolution = resolveFinanceActionFilterMembers(rows, schema, plan.modules);
      if (!filterResolution.ok) {
        throw new Error(filterResolution.message);
      }

      const { computedModules, chartCards } = executeFinancePlan(rows, schema, filterResolution.modules);
      const analysisContext = buildAnalysisContext(computedModules);
      const analysis = await callAI("explain", {
        question,
        computedSummary: buildComputedSummary(question, schema, computedModules),
      });
      const assumptionText = analysis.assumptions?.length
        ? `口径：${analysis.assumptions.join("；")}`
        : "口径：AI 生成分析计划，前端按计划聚合当前上传底稿，再由 AI 解读计算结果。";

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: analysis.message || "我已经按 AI 计划计算并生成图表。",
          chartCards,
          analysisContext,
          meta: assumptionText,
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
    setWorkbook(null);
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
      <section className={`finance-ai-assistant-panel ${workbook ? "is-ready" : ""}`}>
        <header className="finance-ai-chat-header">
          <AssistantAvatar />
          <div className="finance-ai-header-copy">
            <p className="finance-ai-kicker">Lucas Finance AI</p>
            <h1>财务分析 AI 助手</h1>
            <p>上传经营明细后，直接对话生成趋势、排名和变化桥；数据刷新后清空。</p>
          </div>
          {workbook ? (
            <div className="finance-ai-header-actions">
              <button type="button" className="finance-ai-icon-button" onClick={resetData} aria-label="清空当前数据">
                <RotateCcw aria-hidden="true" />
              </button>
              <button type="button" className="finance-ai-icon-button" onClick={resetData} aria-label="重置对话和数据">
                <Trash2 aria-hidden="true" />
              </button>
            </div>
          ) : null}
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
        {!workbook ? (
        <section className="finance-ai-empty-state" aria-label="数据上传和识别状态">
          <div className="finance-ai-empty-card">
            <AssistantAvatar />
            <p className="finance-ai-kicker">Upload Workbook</p>
            <h2>先上传一份经营明细</h2>
            <p>支持 CSV、XLS、XLSX。上传后会直接进入对话分析，可以继续追问、生成图表和核对明细。</p>
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
                <span>上传数据</span>
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
          </div>
        </section>
        ) : null}

        {schema?.requiredIssues.length ? (
          <p className="finance-ai-warning">{getSchemaIssueText(schema)}</p>
        ) : null}
        {error ? <p className="finance-ai-error">{error}</p> : null}

        <section className="finance-ai-chat" aria-label="财务分析聊天流">
          {messages.map((message) => {
            const messageSections = buildAssistantMessageSections(message);

            return (
              <article key={message.id} className={`finance-ai-message is-${message.role}`}>
                {message.role === "assistant" ? (
                  <AssistantAvatar compact />
                ) : null}
                <div className="finance-ai-message-bubble">
                  {messageSections.map((section, sectionIndex) => (
                    <div className="finance-ai-message-section" key={`${message.id}-${sectionIndex}`}>
                      {section.text ? <FinanceAIMessageContent text={section.text} /> : null}
                      <FinanceAIChartGrid cards={section.chartCards} />
                    </div>
                  ))}
                  {message.meta ? <small>{message.meta}</small> : null}
                </div>
              </article>
            );
          })}
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
          <div ref={chatEndRef} aria-hidden="true" />
        </section>

        <div className="finance-ai-composer-dock">
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
              placeholder={workbook ? getDefaultQuestion(schema) : "先上传经营明细，再开始提问"}
              disabled={busy || !canAsk}
            />
            <button type="submit" disabled={!input.trim() || !canAsk} aria-label="发送问题">
              {busy ? <Loader2 className="finance-ai-spin" aria-hidden="true" /> : <ArrowUp aria-hidden="true" />}
            </button>
          </form>

          {!canAsk && schema && schema.requiredIssues.length === 0 ? null : (
            <p className="finance-ai-session-note">数据仅保留在当前页面会话中，刷新后清空。</p>
          )}
        </div>
          </>
        )}
      </section>
    </main>
  );
}
