// @ts-expect-error - Node's test runner imports this TypeScript module by extension.
import { buildBarRank, buildMetricSnapshot, buildTrendSeries, buildWaterfallBridge, findMetric } from "./metrics.ts";
// @ts-expect-error - Node's test runner imports this TypeScript module by extension.
import { normalizePeriodValue } from "./schema.ts";
import type {
  FinanceAIDirectAnalysis,
  FinanceAIDirectBarRankChart,
  FinanceAIDirectChart,
  FinanceAIDirectTrendChart,
  FinanceAIDirectWaterfallChart,
  FinanceMetric,
  FinanceRow,
  FinanceSchema,
} from "./types.ts";

const DEFAULT_RANK_LIMIT = 5;

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function formatNumber(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "不可比";
  }

  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
}

function getRows(workbookRows: FinanceRow[] | undefined) {
  return Array.isArray(workbookRows) ? workbookRows : [];
}

function findMetricForQuestion(question: string, schema: FinanceSchema): FinanceMetric | null {
  const normalizedQuestion = normalizeText(question);
  const metrics = [...schema.unitMetrics, ...schema.totalMetrics];
  const directMetric = metrics.find((metric) => (
    normalizedQuestion.includes(normalizeText(metric.name)) ||
    ("column" in metric && normalizedQuestion.includes(normalizeText(metric.column)))
  ));

  if (directMetric) {
    return directMetric;
  }

  if (/销量|销售量|台数|volume|qty|units/i.test(question)) {
    return findMetric(schema, schema.salesColumn) ?? null;
  }

  return schema.unitMetrics[0] ?? schema.totalMetrics[0] ?? null;
}

function findPeriodMentions(question: string, schema: FinanceSchema) {
  const normalizedQuestion = normalizeText(question);
  const matches = schema.profile.periods.filter((period) => {
    const candidates = [
      period.key,
      period.label,
      period.key.replace(/^M0?/, ""),
      period.label.replace(/份/g, ""),
    ].map(normalizeText);

    return candidates.some((candidate) => candidate && normalizedQuestion.includes(candidate));
  });

  const explicitMonthMatches = Array.from(question.matchAll(/(?:^|[^0-9])([1-9]|1[0-2])\s*月份?/g))
    .map((match) => normalizePeriodValue(`${match[1]}月`)?.key)
    .filter(Boolean);

  for (const key of explicitMonthMatches) {
    const period = schema.profile.periods.find((item) => item.key === key);
    if (period && !matches.some((item) => item.key === period.key)) {
      matches.push(period);
    }
  }

  return [...matches].sort((a, b) => a.sort - b.sort);
}

function getAnalysisPeriods(question: string, schema: FinanceSchema) {
  const mentioned = findPeriodMentions(question, schema);
  const toPeriod = mentioned.at(-1) ?? schema.profile.periods.at(-1);

  if (!toPeriod) {
    return null;
  }

  const fromPeriod = mentioned.length >= 2
    ? mentioned.at(-2)
    : schema.profile.periods
        .filter((period) => period.sort < toPeriod.sort)
        .at(-1);

  return fromPeriod ? { fromPeriod, toPeriod } : null;
}

function findDimensionForQuestion(question: string, schema: FinanceSchema) {
  const normalizedQuestion = normalizeText(question);
  const directDimension = schema.dimensionColumns.find((dimension) => (
    normalizedQuestion.includes(normalizeText(dimension))
  ));

  if (directDimension) {
    return directDimension;
  }

  if (/国家|市场|country|market/i.test(question)) {
    const named = schema.dimensionColumns.find((dimension) => /国家|市场|country|market/i.test(dimension));
    if (named) {
      return named;
    }

    const dimB = schema.dimensionColumns.find((dimension) => /^dim[_\s-]?b$/i.test(dimension));
    if (dimB) {
      return dimB;
    }
  }

  return schema.dimensionColumns[0] ?? "";
}

function parseRankLimit(question: string) {
  const match = question.match(/top\s*([0-9]+)|前\s*([0-9]+)|前\s*([一二三四五六七八九十]+)\s*(?:个|名|项)?/i);
  const text = match?.[1] ?? match?.[2] ?? match?.[3];
  const chineseDigits: Record<string, number> = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
  };
  const parsed = text && /^\d+$/.test(text) ? Number(text) : text ? chineseDigits[text] : DEFAULT_RANK_LIMIT;

  return Math.min(Math.max(parsed || DEFAULT_RANK_LIMIT, 1), 10);
}

function shouldUseLocalAnalysis(question: string) {
  return /环比|同比|top|前\s*[0-9一二三四五六七八九十]|排名|趋势|瀑布|变化|贡献|销量|边际|收入|成本|利润/i.test(question);
}

function toTrendChart(title: string, result: ReturnType<typeof buildTrendSeries>): FinanceAIDirectTrendChart | null {
  const points = result.points.flatMap((point) => (
    typeof point.value === "number" && Number.isFinite(point.value)
      ? [{ label: point.periodLabel, value: point.value }]
      : []
  ));

  return points.length > 0 ? { type: "trend", title, points } : null;
}

function toBarRankChart(title: string, result: ReturnType<typeof buildBarRank>): FinanceAIDirectBarRankChart | null {
  const items = result.items.flatMap((item) => (
    typeof item.value === "number" && Number.isFinite(item.value)
      ? [{
        label: item.label,
        value: item.value,
        ...(typeof item.valueShare === "number" && Number.isFinite(item.valueShare) ? { share: item.valueShare } : {}),
        ...(typeof item.changeValue === "number" && Number.isFinite(item.changeValue) ? { changeValue: item.changeValue } : {}),
      }]
      : []
  ));

  return items.length > 0 ? { type: "bar_rank", title, items } : null;
}

function toWaterfallChart(title: string, result: ReturnType<typeof buildWaterfallBridge>): FinanceAIDirectWaterfallChart | null {
  return result.items.length > 0
    ? {
      type: "waterfall",
      title,
      startLabel: result.fromPeriod,
      startValue: result.startValue,
      endLabel: result.toPeriod,
      endValue: result.endValue,
      items: result.items,
    }
    : null;
}

export function buildLocalFinanceAnalysis(
  question: string,
  workbookRows: FinanceRow[],
  schema: FinanceSchema | null,
): FinanceAIDirectAnalysis | null {
  const rows = getRows(workbookRows);

  if (!schema || rows.length === 0 || !shouldUseLocalAnalysis(question)) {
    return null;
  }

  const metric = findMetricForQuestion(question, schema);
  const periods = getAnalysisPeriods(question, schema);
  const dimension = findDimensionForQuestion(question, schema);

  if (!metric || !periods) {
    return null;
  }

  const metricName = metric.name;
  const snapshot = buildMetricSnapshot(rows, schema, {
    metric: metricName,
    period: periods.toPeriod.key,
    comparisons: ["mom"],
  });
  const charts: FinanceAIDirectChart[] = [];

  if (/趋势/i.test(question)) {
    const trend = toTrendChart(`${metricName}趋势`, buildTrendSeries(rows, schema, {
      metric: metricName,
      highlightPeriod: periods.toPeriod.key,
    }));
    if (trend) {
      charts.push(trend);
    }
  }

  if (dimension && /top|前\s*[0-9一二三四五六七八九十]|排名|哪些|国家|市场/i.test(question)) {
    const limit = parseRankLimit(question);
    const rank = buildBarRank(rows, schema, {
      metric: metricName,
      dimension,
      period: periods.toPeriod.key,
      comparison: "mom",
      sort: "value_desc",
      limit,
    });
    const rankChart = toBarRankChart(
      `${periods.toPeriod.label}${dimension === "Dim_B" ? "国家" : dimension}${metricName} Top ${rank.visibleItemCount}`,
      rank,
    );
    if (rankChart) {
      charts.push(rankChart);
    }
  }

  if (dimension && metric.kind === "total" && /瀑布|变化桥|变化来源|贡献/i.test(question)) {
    const bridge = toWaterfallChart(`${metricName}环比变化桥`, buildWaterfallBridge(rows, schema, {
      metric: metricName,
      dimension,
      fromPeriod: periods.fromPeriod.key,
      toPeriod: periods.toPeriod.key,
      limit: parseRankLimit(question),
    }));
    if (bridge) {
      charts.push(bridge);
    }
  }

  if (charts.length === 0) {
    return null;
  }

  const changeText = snapshot.mom
    ? `较${periods.fromPeriod.label}变化 ${formatNumber(snapshot.mom.changeValue, 0)}，环比 ${formatPercent(snapshot.mom.changeRate)}`
    : "缺少可比上期，无法计算环比";
  const visibleTopCount = charts.find((chart): chart is FinanceAIDirectBarRankChart => chart.type === "bar_rank")?.items.length;
  const answer = [
    `${periods.toPeriod.label}${metricName}为 ${formatNumber(snapshot.value, metric.kind === "unit" ? 2 : 0)}，${changeText}。`,
    visibleTopCount ? `下方横向柱状图展示 Top ${visibleTopCount}。` : "",
  ].filter(Boolean).join(" ");

  return {
    answer,
    assumptions: [`本地按完整上传底稿确定性聚合：${metricName} 按 ${schema.monthColumn} 汇总，${/国家|市场/i.test(question) && dimension === "Dim_B" ? "国家" : dimension}按 ${dimension} 识别。`],
    charts: charts.slice(0, 3),
  };
}
