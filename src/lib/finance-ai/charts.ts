import type {
  FinanceAIDirectBarRankChart,
  FinanceAIDirectChart,
  FinanceAIDirectDetailTableChart,
  FinanceAIDirectHeatmapChart,
  FinanceAIDirectMetricCardChart,
  FinanceAIDirectScatterBubbleChart,
  FinanceAIDirectSeriesChart,
  FinanceAIDirectTrendChart,
  FinanceAIDirectWaterfallChart,
  BarRankResult,
  FinanceChartSpec,
  MetricSnapshotResult,
  TrendResult,
  WaterfallBridgeResult,
} from "./types.ts";

const COLORS = {
  orange: "#d97757",
  blue: "#5c8fba",
  green: "#7f9165",
  red: "#b65f55",
  yellow: "#c89b40",
  text: "#171615",
  muted: "#747168",
  grid: "#e8e5dc",
};

const SERIES_COLORS = [COLORS.blue, COLORS.green, COLORS.yellow, COLORS.orange, COLORS.red];
const MAX_WATERFALL_VISIBLE_ITEMS = 10;
const MIN_BUBBLE_MARKER_SIZE = 12;
const MAX_BUBBLE_MARKER_SIZE = 48;

const baseLayout = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  font: {
    family: "PingFang SC, Microsoft YaHei, Helvetica Neue, Arial, sans-serif",
    color: COLORS.text,
    size: 12,
  },
  margin: { t: 28, r: 24, b: 42, l: 54 },
  showlegend: false,
};

const baseConfig = {
  displayModeBar: false,
  responsive: true,
};

type ChartInput =
  | { type: "metric_snapshot"; title: string; result: MetricSnapshotResult }
  | { type: "trend_chart"; title: string; result: TrendResult }
  | { type: "bar_rank"; title: string; result: BarRankResult }
  | { type: "waterfall_bridge"; title: string; result: WaterfallBridgeResult };

export function buildChartSpec(input: ChartInput): FinanceChartSpec {
  if (input.type === "metric_snapshot") {
    return buildMetricCardChartSpec(input.title, input.result);
  }

  if (input.type === "trend_chart") {
    return buildTrendChartSpec(input.title, input.result);
  }

  if (input.type === "bar_rank") {
    return buildBarRankChartSpec(input.title, input.result);
  }

  return buildWaterfallChartSpec(input.title, input.result);
}

export function buildDirectChartSpec(input: FinanceAIDirectChart): FinanceChartSpec {
  if (input.type === "metric_card") {
    return buildDirectMetricCardChartSpec(input);
  }

  if (input.type === "trend") {
    return buildDirectTrendChartSpec(input);
  }

  if (input.type === "bar_rank") {
    return buildDirectBarRankChartSpec(input);
  }

  if (input.type === "waterfall") {
    return buildDirectWaterfallChartSpec(input);
  }

  if (input.type === "grouped_bar" || input.type === "stacked_bar" || input.type === "percent_stacked_bar") {
    return buildDirectSeriesChartSpec(input);
  }

  if (input.type === "heatmap") {
    return buildDirectHeatmapChartSpec(input);
  }

  if (input.type === "scatter_bubble") {
    return buildDirectScatterBubbleChartSpec(input);
  }

  if (input.type === "detail_table") {
    return buildDirectDetailTableChartSpec(input);
  }

  throw new Error("Unsupported finance AI direct chart type.");
}

function formatNumber(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatSignedNumber(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatNumber(Math.abs(value), digits)}`;
}

function formatShare(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "";
  }

  return `${(value * 100).toFixed(1)}%`;
}

function isMoneyContext(context: string) {
  return /收入|边际|成本|利润|金额|总额|费用|税|毛利|净利|贡献|扣减|价格|售价|单价/.test(context);
}

function isCountContext(context: string) {
  return /销量|台数|数量|件数|行数|volume|units?|count/i.test(context);
}

function getChineseUnitScale(value: number | null | undefined, context = "") {
  const absolute = Math.abs(value ?? 0);
  const money = isMoneyContext(context);

  if (absolute >= 1_000_000_000_000) {
    return { divisor: 1_000_000_000_000, suffix: money ? "万亿元" : "万亿", digits: 2 };
  }

  if (absolute >= 100_000_000) {
    return { divisor: 100_000_000, suffix: money ? "亿元" : "亿", digits: 2 };
  }

  if (absolute >= 10_000) {
    return { divisor: 10_000, suffix: money ? "万元" : "万", digits: 2 };
  }

  return { divisor: 1, suffix: money ? "元" : "", digits: money && absolute >= 100 ? 0 : 2 };
}

function getScaleForValues(values: number[], context = "") {
  const maxAbsolute = values.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
  return getChineseUnitScale(maxAbsolute, context);
}

function scaledChineseUnit(value: number, scale = getChineseUnitScale(value)) {
  return value / scale.divisor;
}

function formatCompactNumber(value: number, scale = getChineseUnitScale(value), signed = false) {
  const scaledValue = scaledChineseUnit(value, scale);
  const formatted = formatNumber(Math.abs(scaledValue), scale.digits);
  const sign = value < 0 ? "-" : signed && value > 0 ? "+" : "";

  return `${sign}${formatted}${scale.suffix}`;
}

type WaterfallDisplayItem = {
  label: string;
  value: number;
  mixEffect?: number;
  rateEffect?: number;
};

function mergeWaterfallItems<T extends WaterfallDisplayItem>(items: T[]): T[] {
  const merged = new Map<string, WaterfallDisplayItem>();

  for (const item of items) {
    const current = merged.get(item.label);

    if (!current) {
      merged.set(item.label, { ...item });
      continue;
    }

    current.value += item.value;
    if (typeof item.mixEffect === "number" || typeof current.mixEffect === "number") {
      current.mixEffect = (current.mixEffect ?? 0) + (item.mixEffect ?? 0);
    }
    if (typeof item.rateEffect === "number" || typeof current.rateEffect === "number") {
      current.rateEffect = (current.rateEffect ?? 0) + (item.rateEffect ?? 0);
    }
  }

  return Array.from(merged.values()) as T[];
}

function buildWaterfallTrace({
  labels,
  itemValues,
  startValue,
  endValue,
  scale,
  title,
  customdata,
  hovertemplate,
}: {
  labels: string[];
  itemValues: number[];
  startValue: number;
  endValue: number;
  scale: ReturnType<typeof getChineseUnitScale>;
  title: string;
  customdata?: Array<Array<number | null>>;
  hovertemplate: string;
}) {
  const scaledStartValue = scaledChineseUnit(startValue, scale);
  const scaledEndValue = scaledChineseUnit(endValue, scale);
  const scaledItemValues = itemValues.map((value) => scaledChineseUnit(value, scale));

  return {
    trace: {
      type: "waterfall",
      orientation: "v",
      measure: ["absolute", ...itemValues.map(() => "relative"), "total"],
      x: labels,
      y: [scaledStartValue, ...scaledItemValues, 0],
      text: [
        formatCompactNumber(startValue, scale),
        ...itemValues.map((value) => formatCompactNumber(value, getChineseUnitScale(value, title), true)),
        formatCompactNumber(endValue, scale),
      ],
      textposition: "outside",
      cliponaxis: false,
      connector: { line: { color: "#cfcabe", width: 1.4 } },
      increasing: { marker: { color: COLORS.green } },
      decreasing: { marker: { color: COLORS.red } },
      totals: { marker: { color: COLORS.blue } },
      ...(customdata ? { customdata } : {}),
      hovertemplate,
    },
    scaledStartValue,
    scaledEndValue,
    scaledItemValues,
  };
}

function normalizeWaterfallItems<T extends WaterfallDisplayItem>(items: T[]): T[] {
  const sorted = mergeWaterfallItems(items).sort((left, right) => Math.abs(right.value) - Math.abs(left.value));
  const visible = sorted.slice(0, MAX_WATERFALL_VISIBLE_ITEMS);
  const hidden = sorted.slice(MAX_WATERFALL_VISIBLE_ITEMS);
  const otherValue = hidden.reduce((sum, item) => sum + item.value, 0);
  const otherMixEffect = hidden.reduce((sum, item) => sum + (item.mixEffect ?? 0), 0);
  const otherRateEffect = hidden.reduce((sum, item) => sum + (item.rateEffect ?? 0), 0);
  const withOther = hidden.length > 0 && Math.abs(otherValue) > 1e-9
    ? [
        ...visible,
        {
          label: "其他",
          value: otherValue,
          ...(hidden.some((item) => typeof item.mixEffect === "number") ? { mixEffect: otherMixEffect } : {}),
          ...(hidden.some((item) => typeof item.rateEffect === "number") ? { rateEffect: otherRateEffect } : {}),
        } as T,
      ]
    : visible;
  const merged = mergeWaterfallItems(withOther);
  const negatives = merged
    .filter((item) => item.value < 0)
    .sort((left, right) => Math.abs(right.value) - Math.abs(left.value));
  const positives = merged
    .filter((item) => item.value >= 0)
    .sort((left, right) => Math.abs(right.value) - Math.abs(left.value));

  return [...negatives, ...positives];
}

function reconcileWaterfallItems<T extends { label: string; value: number }>(
  items: T[],
  startValue: number,
  endValue: number,
): T[] {
  const itemTotal = items.reduce((sum, item) => sum + item.value, 0);
  const residualValue = endValue - startValue - itemTotal;

  if (Math.abs(residualValue) < 1e-9) {
    return items;
  }

  return [...items, { label: "未拆分差额", value: residualValue } as T];
}

function paddedRange(values: Array<number | null | undefined>) {
  const finiteValues = values.filter((value): value is number => (
    typeof value === "number" && Number.isFinite(value)
  ));

  if (finiteValues.length === 0) {
    return undefined;
  }

  const minValue = Math.min(...finiteValues);
  const maxValue = Math.max(...finiteValues);
  const spread = maxValue - minValue;
  const padding = spread === 0 ? Math.max(Math.abs(maxValue) * 0.08, 1) : spread * 0.16;

  return [minValue - padding, maxValue + padding];
}

function waterfallRange(startValue: number, itemValues: number[], endValue: number) {
  const cumulativeValues = [startValue];
  let cursor = startValue;

  for (const value of itemValues) {
    cursor += value;
    cumulativeValues.push(cursor);
  }

  cumulativeValues.push(endValue);
  return paddedRange(cumulativeValues);
}

function buildMetricCardChartSpec(title: string, result: MetricSnapshotResult): FinanceChartSpec {
  const deltaValue = result.mom?.changeValue ?? null;
  const deltaRate = result.mom?.changeRate ?? null;
  const value = result.value ?? 0;
  const scale = getChineseUnitScale(value, title);
  const scaledValue = scaledChineseUnit(value, scale);
  const scaledDeltaValue = deltaValue !== null ? scaledChineseUnit(deltaValue, scale) : null;

  return {
    kind: "metric_card",
    size: "small",
    title,
    data: [{
      type: "indicator",
      mode: "number+delta",
      value: scaledValue,
      number: {
        font: { color: COLORS.text, size: 24 },
        suffix: scale.suffix,
        valueformat: `,.${scale.digits}f`,
      },
      delta: {
        reference: scaledDeltaValue !== null ? scaledValue - scaledDeltaValue : undefined,
        relative: false,
        valueformat: `,.${scale.digits}f`,
        suffix: scale.suffix,
        increasing: { color: COLORS.green },
        decreasing: { color: COLORS.red },
      },
      title: {
        text: deltaRate !== null ? `环比 ${formatSignedNumber(deltaRate * 100, 1)}%` : result.base.isComputable ? result.base.period : "当前不可计算",
        font: { color: COLORS.muted, size: 11 },
      },
    }],
    layout: {
      ...baseLayout,
      height: 104,
      margin: { t: 8, r: 10, b: 8, l: 10 },
    },
    config: baseConfig,
    note: "指标卡展示当前值和环比变化；单车指标使用总额除以销量。",
  };
}

function buildDirectMetricCardChartSpec(input: FinanceAIDirectMetricCardChart): FinanceChartSpec {
  const scale = getChineseUnitScale(input.value, input.title);
  const scaledValue = scaledChineseUnit(input.value, scale);
  const scaledDeltaValue = input.deltaValue !== null && input.deltaValue !== undefined
    ? scaledChineseUnit(input.deltaValue, scale)
    : null;
  const reference = scaledDeltaValue !== null
    ? scaledValue - scaledDeltaValue
    : input.deltaRate !== null && input.deltaRate !== undefined && input.deltaRate !== -1
      ? scaledValue / (1 + input.deltaRate)
      : undefined;

  return {
    kind: "metric_card",
    size: "small",
    title: input.title,
    data: [{
      type: "indicator",
      mode: "number+delta",
      value: scaledValue,
      number: {
        font: { color: COLORS.text, size: 24 },
        suffix: scale.suffix,
        valueformat: `,.${scale.digits}f`,
      },
      delta: {
        reference,
        relative: scaledDeltaValue === null && input.deltaRate !== null && input.deltaRate !== undefined,
        valueformat: scaledDeltaValue === null && input.deltaRate !== null && input.deltaRate !== undefined
          ? ".1%"
          : `,.${scale.digits}f`,
        suffix: scaledDeltaValue === null && input.deltaRate !== null && input.deltaRate !== undefined ? "" : scale.suffix,
        increasing: { color: COLORS.green },
        decreasing: { color: COLORS.red },
      },
      title: { text: input.subtitle ?? "", font: { color: COLORS.muted, size: 11 } },
    }],
    layout: {
      ...baseLayout,
      height: 104,
      margin: { t: 8, r: 10, b: 8, l: 10 },
    },
    config: baseConfig,
    note: input.note || "AI 基于上传底稿生成指标卡数据，前端按轻量 KPI 卡协议渲染。",
  };
}

function buildTrendChartSpec(title: string, result: TrendResult): FinanceChartSpec {
  const values = result.points.map((point) => point.value);
  const finiteValues = values.filter((value): value is number => value !== null && value !== undefined);
  const scale = getScaleForValues(finiteValues, title);
  const scaledValues = values.map((value) => value === null || value === undefined ? null : scaledChineseUnit(value, scale));

  return {
    kind: "trend_chart",
    size: "large",
    title,
    data: [{
      type: "scatter",
      mode: "lines+markers+text",
      x: result.points.map((point) => point.periodLabel),
      y: scaledValues,
      text: values.map((value) => value === null || value === undefined ? "-" : formatCompactNumber(value, scale)),
      textposition: "top center",
      cliponaxis: false,
      line: { color: COLORS.blue, width: 2.5 },
      marker: {
        color: result.points.map((point) => (
          point.period === result.highlightPeriod ? COLORS.orange : COLORS.blue
        )),
        size: result.points.map((point) => (
          point.period === result.highlightPeriod ? 9 : 6
        )),
      },
      hovertemplate: `%{x}<br>%{y:,.2f}${scale.suffix}<extra></extra>`,
    }],
    layout: {
      ...baseLayout,
      margin: { t: 36, r: 28, b: 42, l: 56 },
      xaxis: { gridcolor: COLORS.grid, zeroline: false, tickfont: { color: COLORS.muted }, fixedrange: true },
      yaxis: {
        gridcolor: COLORS.grid,
        zeroline: false,
        tickfont: { color: COLORS.muted },
        range: paddedRange(scaledValues),
        tickformat: `,.${scale.digits}f`,
        ticksuffix: scale.suffix,
        fixedrange: true,
      },
    },
    config: baseConfig,
    note: "按月份聚合后展示趋势；单车指标使用总额除以销量。",
  };
}

function buildDirectTrendChartSpec(input: FinanceAIDirectTrendChart): FinanceChartSpec {
  const values = input.points.map((point) => point.value);
  const scale = getScaleForValues(values, `${input.title}${input.yLabel ?? ""}`);
  const scaledValues = values.map((value) => scaledChineseUnit(value, scale));

  return {
    kind: "trend_chart",
    size: "large",
    title: input.title,
    data: [{
      type: "scatter",
      mode: "lines+markers+text",
      x: input.points.map((point) => point.label),
      y: scaledValues,
      text: values.map((value) => formatCompactNumber(value, scale)),
      textposition: "top center",
      cliponaxis: false,
      line: { color: COLORS.blue, width: 2.5 },
      marker: { color: COLORS.blue, size: 7 },
      hovertemplate: `%{x}<br>%{y:,.2f}${scale.suffix}<extra></extra>`,
    }],
    layout: {
      ...baseLayout,
      margin: { t: 36, r: 28, b: 42, l: 56 },
      xaxis: { title: input.xLabel, gridcolor: COLORS.grid, zeroline: false, tickfont: { color: COLORS.muted }, fixedrange: true },
      yaxis: {
        title: input.yLabel,
        gridcolor: COLORS.grid,
        zeroline: false,
        tickfont: { color: COLORS.muted },
        range: paddedRange(scaledValues),
        tickformat: `,.${scale.digits}f`,
        ticksuffix: scale.suffix,
        fixedrange: true,
      },
    },
    config: baseConfig,
    note: input.note || "AI 基于上传底稿生成趋势数据，前端按趋势图协议渲染。",
  };
}

function buildBarRankChartSpec(title: string, result: BarRankResult): FinanceChartSpec {
  const items = [...result.items].reverse();
  const values = items.map((item) => item.value);
  const numericValues = values.filter((value): value is number => value !== null && value !== undefined);
  const changeValues = items
    .map((item) => item.changeValue)
    .filter((value): value is number => value !== null && value !== undefined);
  const isChangeRank = result.comparison === "mom" && result.sort.startsWith("change") && changeValues.length > 0;
  const displayValues = isChangeRank ? items.map((item) => item.changeValue) : values;
  const numericDisplayValues = displayValues.filter((value): value is number => value !== null && value !== undefined);
  const scale = getScaleForValues(numericDisplayValues, `${title}${result.metric}`);
  const currentScale = getScaleForValues(numericValues, `${title}${result.metric}`);
  const scaledValues = displayValues.map((value) => value === null || value === undefined ? value : scaledChineseUnit(value, scale));
  const scopeText = result.totalItemCount > result.visibleItemCount
    ? `图中展示当前排名前 ${result.visibleItemCount} 项；最大增减判断已基于全量 ${result.totalItemCount} 个维度成员扫描。`
    : "横向柱状图展示全部可见维度排名，条形旁标注当前值、占比和环比变化。";

  return {
    kind: "bar_rank",
    size: "medium",
    title,
    data: [{
      type: "bar",
      orientation: "h",
      x: scaledValues,
      y: items.map((item) => item.label),
      text: items.map((item) => {
        if (isChangeRank) {
          const changeText = item.changeValue === null ? "-" : formatCompactNumber(item.changeValue, scale, true);
          const currentText = item.value === null ? "-" : formatCompactNumber(item.value, currentScale);
          const shareText = item.valueShare !== null && item.valueShare !== undefined ? `｜${formatShare(item.valueShare)}` : "";
          return `环比 ${changeText}｜当前值 ${currentText}${shareText}`;
        }

        const shareText = item.valueShare !== null && item.valueShare !== undefined ? `｜${formatShare(item.valueShare)}` : "";
        const changeText = item.changeValue !== null ? `｜环比 ${formatCompactNumber(item.changeValue, scale, true)}` : "";
        return `${item.value === null ? "-" : formatCompactNumber(item.value, scale)}${shareText}${changeText}`;
      }),
      textposition: "outside",
      cliponaxis: false,
      marker: {
        color: isChangeRank
          ? displayValues.map((value) => (typeof value === "number" && value < 0 ? COLORS.red : COLORS.green))
          : COLORS.green,
      },
      hovertemplate: isChangeRank
        ? `%{y}<br>环比变化 %{x:,.2f}${scale.suffix}<br>%{text}<extra></extra>`
        : `%{y}<br>当前值 %{x:,.2f}${scale.suffix}<br>%{text}<extra></extra>`,
    }],
    layout: {
      ...baseLayout,
      margin: { t: 28, r: 116, b: 36, l: 92 },
      xaxis: {
        gridcolor: COLORS.grid,
        zeroline: isChangeRank,
        zerolinecolor: COLORS.grid,
        tickfont: { color: COLORS.muted },
        fixedrange: true,
        range: paddedRange([0, ...scaledValues]),
        tickformat: `,.${scale.digits}f`,
        ticksuffix: scale.suffix,
      },
      yaxis: { automargin: true, tickfont: { color: COLORS.text }, fixedrange: true },
    },
    config: baseConfig,
    note: scopeText,
  };
}

function buildDirectBarRankChartSpec(input: FinanceAIDirectBarRankChart): FinanceChartSpec {
  const items = [...input.items].reverse();
  const values = items.map((item) => item.value);
  const changeValues = items
    .map((item) => item.changeValue)
    .filter((value): value is number => value !== null && value !== undefined);
  const scale = getScaleForValues([...values, ...changeValues], `${input.title}${input.yLabel ?? ""}`);
  const scaledValues = values.map((value) => scaledChineseUnit(value, scale));

  return {
    kind: "bar_rank",
    size: "medium",
    title: input.title,
    data: [{
      type: "bar",
      orientation: "h",
      x: scaledValues,
      y: items.map((item) => item.label),
      text: items.map((item) => {
        const shareText = item.share !== null && item.share !== undefined ? `｜${formatShare(item.share)}` : "";
        const changeText = item.changeValue !== null && item.changeValue !== undefined
          ? `｜变化 ${formatCompactNumber(item.changeValue, scale, true)}`
          : "";
        const detailText = item.detail ? `｜${item.detail}` : "";
        return `${formatCompactNumber(item.value, scale)}${shareText}${changeText}${detailText}`;
      }),
      textposition: "outside",
      cliponaxis: false,
      marker: { color: COLORS.green },
      hovertemplate: "%{y}<br>%{text}<extra></extra>",
    }],
    layout: {
      ...baseLayout,
      margin: { t: 28, r: 128, b: 36, l: 92 },
      xaxis: {
        title: input.yLabel,
        gridcolor: COLORS.grid,
        zeroline: false,
        tickfont: { color: COLORS.muted },
        fixedrange: true,
        range: paddedRange([0, ...scaledValues]),
        tickformat: `,.${scale.digits}f`,
        ticksuffix: scale.suffix,
      },
      yaxis: { title: input.xLabel, automargin: true, tickfont: { color: COLORS.text }, fixedrange: true },
    },
    config: baseConfig,
    note: input.note || "AI 基于上传底稿生成排名数据，前端按横向柱状图协议渲染。",
  };
}

function buildWaterfallChartSpec(title: string, result: WaterfallBridgeResult): FinanceChartSpec {
  const items = normalizeWaterfallItems(reconcileWaterfallItems(result.items, result.startValue, result.endValue));
  const itemValues = items.map((item) => item.value);
  const scale = getScaleForValues([result.startValue, result.endValue, ...itemValues], title);
  const isUnitMetricBridge = result.basis === "unit_metric_mix_rate";
  const customdata = isUnitMetricBridge
    ? [
        [null, null],
        ...items.map((item) => [
          scaledChineseUnit(item.mixEffect ?? 0, scale),
          scaledChineseUnit(item.rateEffect ?? 0, scale),
        ]),
        [null, null],
      ]
    : undefined;
  const labels = [result.fromPeriod, ...items.map((item) => item.label), result.toPeriod];
  const waterfall = buildWaterfallTrace({
    labels,
    itemValues,
    startValue: result.startValue,
    endValue: result.endValue,
    scale,
    title,
    customdata,
    hovertemplate: isUnitMetricBridge
      ? `%{x}<br>%{text}<br>结构效应 %{customdata[0]:,.2f}${scale.suffix}<br>费率效应 %{customdata[1]:,.2f}${scale.suffix}<extra></extra>`
      : `%{x}<br>%{text}<extra></extra>`,
  });

  return {
    kind: "waterfall_bridge",
    size: "large",
    title,
    data: [waterfall.trace],
    layout: {
      ...baseLayout,
      bargap: 0.28,
      margin: { t: 36, r: 30, b: 52, l: 60 },
      xaxis: { tickfont: { color: COLORS.muted }, fixedrange: true },
      yaxis: {
        gridcolor: COLORS.grid,
        zeroline: true,
        zerolinecolor: COLORS.grid,
        tickfont: { color: COLORS.muted },
        range: waterfallRange(waterfall.scaledStartValue, waterfall.scaledItemValues, waterfall.scaledEndValue),
        tickformat: `,.${scale.digits}f`,
        ticksuffix: scale.suffix,
        fixedrange: true,
      },
    },
    config: baseConfig,
    note: isUnitMetricBridge
      ? "单车指标瀑布桥按结构效应和费率效应拆解两个期间的单车变化。"
      : "瀑布桥按维度拆解可加总指标在两个期间之间的变化贡献。",
  };
}

function buildDirectWaterfallChartSpec(input: FinanceAIDirectWaterfallChart): FinanceChartSpec {
  const items = normalizeWaterfallItems(reconcileWaterfallItems(input.items, input.startValue, input.endValue));
  const itemValues = items.map((item) => item.value);
  const scale = getScaleForValues([input.startValue, input.endValue, ...itemValues], input.title);
  const labels = [input.startLabel, ...items.map((item) => item.label), input.endLabel];
  const waterfall = buildWaterfallTrace({
    labels,
    itemValues,
    startValue: input.startValue,
    endValue: input.endValue,
    scale,
    title: input.title,
    hovertemplate: `%{x}<br>%{text}<extra></extra>`,
  });

  return {
    kind: "waterfall_bridge",
    size: "large",
    title: input.title,
    data: [waterfall.trace],
    layout: {
      ...baseLayout,
      bargap: 0.28,
      margin: { t: 36, r: 30, b: 52, l: 60 },
      xaxis: { tickfont: { color: COLORS.muted }, fixedrange: true },
      yaxis: {
        gridcolor: COLORS.grid,
        zeroline: true,
        zerolinecolor: COLORS.grid,
        tickfont: { color: COLORS.muted },
        range: waterfallRange(waterfall.scaledStartValue, waterfall.scaledItemValues, waterfall.scaledEndValue),
        tickformat: `,.${scale.digits}f`,
        ticksuffix: scale.suffix,
        fixedrange: true,
      },
    },
    config: baseConfig,
    note: input.note || "AI 基于上传底稿生成变化桥数据，前端按瀑布桥协议渲染。",
  };
}

function getSeriesLabels(series: FinanceAIDirectSeriesChart["series"]) {
  return Array.from(new Set(series.flatMap((item) => item.items.map((point) => point.label))));
}

function buildDirectSeriesChartSpec(input: FinanceAIDirectSeriesChart): FinanceChartSpec {
  const labels = getSeriesLabels(input.series);
  const kind = input.type === "grouped_bar"
    ? "grouped_bar"
    : input.type === "percent_stacked_bar"
      ? "percent_stacked_bar"
      : "stacked_bar";
  const rawValues = input.series.flatMap((series) => series.items.map((item) => item.value));
  const scale = input.type === "percent_stacked_bar"
    ? { divisor: 1, suffix: "", digits: 0 }
    : getScaleForValues(rawValues, `${input.title}${input.yLabel ?? ""}`);

  return {
    kind,
    size: "medium",
    title: input.title,
    data: input.series.map((series, index) => {
      const valueByLabel = new Map(series.items.map((item) => [item.label, item.value]));
      return {
        type: "bar",
        name: series.name,
        x: labels,
        y: labels.map((label) => scaledChineseUnit(valueByLabel.get(label) ?? 0, scale)),
        marker: { color: SERIES_COLORS[index % SERIES_COLORS.length] },
        text: labels.map((label) => (
          input.type === "percent_stacked_bar"
            ? formatShare(valueByLabel.get(label) ?? 0)
            : formatCompactNumber(valueByLabel.get(label) ?? 0, scale)
        )),
        textposition: input.type === "percent_stacked_bar" ? "inside" : "outside",
        cliponaxis: false,
        hovertemplate: `%{x}<br>${series.name} %{text}<extra></extra>`,
      };
    }),
    layout: {
      ...baseLayout,
      barmode: input.type === "grouped_bar" ? "group" : "stack",
      showlegend: true,
      xaxis: { title: input.xLabel, gridcolor: COLORS.grid, fixedrange: true },
      yaxis: {
        title: input.yLabel,
        gridcolor: COLORS.grid,
        fixedrange: true,
        ...(input.type === "percent_stacked_bar" ? {} : {
          tickformat: `,.${scale.digits}f`,
          ticksuffix: scale.suffix,
        }),
        ...(input.type === "percent_stacked_bar" ? { tickformat: ".0%", range: [0, 1] } : {}),
      },
    },
    config: baseConfig,
    note: input.note || "AI 基于上传底稿生成系列柱状图数据，前端按分组或堆叠柱状图协议渲染。",
  };
}

function buildDirectHeatmapChartSpec(input: FinanceAIDirectHeatmapChart): FinanceChartSpec {
  return {
    kind: "heatmap",
    size: "large",
    title: input.title,
    data: [{
      type: "heatmap",
      x: input.xLabels,
      y: input.yLabels,
      z: input.values,
      text: input.values.map((row) => row.map((value) => formatNumber(value, 1))),
      texttemplate: "%{text}",
      colorscale: [[0, "#f3dfd8"], [0.5, "#f8f3e8"], [1, "#d7e2cf"]],
      showscale: false,
      hovertemplate: "%{y} / %{x}<br>%{z:,.2f}<extra></extra>",
    }],
    layout: {
      ...baseLayout,
      margin: { t: 28, r: 18, b: 42, l: 74 },
      xaxis: { fixedrange: true },
      yaxis: { fixedrange: true },
    },
    config: baseConfig,
    note: input.note || "AI 基于上传底稿生成二维交叉数据，前端按热力图协议渲染。",
  };
}

function normalizeBubbleMarkerSizes(input: FinanceAIDirectScatterBubbleChart) {
  const rawSizes = input.items.map((item) => (
    typeof item.size === "number" && Number.isFinite(item.size)
      ? Math.abs(item.size)
      : null
  ));
  const finiteSizes = rawSizes.filter((size): size is number => size !== null);

  if (finiteSizes.length === 0) {
    return input.items.map(() => 20);
  }

  const minSize = Math.min(...finiteSizes);
  const maxSize = Math.max(...finiteSizes);

  if (maxSize === minSize) {
    return input.items.map((_, index) => (rawSizes[index] === null ? 20 : 28));
  }

  const minRoot = Math.sqrt(minSize);
  const maxRoot = Math.sqrt(maxSize);
  const spread = maxRoot - minRoot || 1;

  return rawSizes.map((size) => {
    if (size === null) {
      return 20;
    }

    const ratio = (Math.sqrt(size) - minRoot) / spread;
    return MIN_BUBBLE_MARKER_SIZE + ratio * (MAX_BUBBLE_MARKER_SIZE - MIN_BUBBLE_MARKER_SIZE);
  });
}

function buildDirectScatterBubbleChartSpec(input: FinanceAIDirectScatterBubbleChart): FinanceChartSpec {
  return {
    kind: "scatter_bubble",
    size: "large",
    title: input.title,
    data: [{
      type: "scatter",
      mode: "markers+text",
      x: input.items.map((item) => item.x),
      y: input.items.map((item) => item.y),
      text: input.items.map((item) => item.label),
      textposition: "top center",
      marker: {
        size: normalizeBubbleMarkerSizes(input),
        color: input.items.map((_, index) => SERIES_COLORS[index % SERIES_COLORS.length]),
        opacity: 0.82,
        line: { color: "#fff", width: 2 },
      },
      hovertemplate: "%{text}<br>%{x:,.2f}<br>%{y:,.2f}<extra></extra>",
    }],
    layout: {
      ...baseLayout,
      xaxis: { title: input.xLabel, gridcolor: COLORS.grid, fixedrange: true },
      yaxis: { title: input.yLabel, gridcolor: COLORS.grid, fixedrange: true },
    },
    config: baseConfig,
    note: input.note || "AI 基于上传底稿生成定位数据，前端按气泡散点图协议渲染。",
  };
}

type ChineseUnitScale = ReturnType<typeof getChineseUnitScale>;

function shouldFormatMoneyColumn(column: string, tableTitle = "") {
  const context = `${tableTitle} ${column}`;
  return !isCountContext(column) && isMoneyContext(context);
}

function formatDirectTableCell(value: unknown, column: string, tableTitle = "", scale?: ChineseUnitScale) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return value ?? "";
  }

  if (/排名|名次|序号|序列|rank|index|no\.?|^#$/i.test(column)) {
    return formatNumber(value, Number.isInteger(value) ? 0 : 2);
  }

  if (/占比|比例|率|share|percent/i.test(column) && Math.abs(value) <= 1) {
    return formatShare(value);
  }

  if (shouldFormatMoneyColumn(column, tableTitle)) {
    return formatCompactNumber(value, scale ?? getChineseUnitScale(value, `${tableTitle} ${column}`));
  }

  return formatNumber(value, Number.isInteger(value) ? 0 : 2);
}

function buildDirectDetailTableChartSpec(input: FinanceAIDirectDetailTableChart): FinanceChartSpec {
  const columnScales = input.columns.map((column, columnIndex) => {
    if (!shouldFormatMoneyColumn(column, input.title)) {
      return undefined;
    }

    const values = input.rows
      .map((row) => row[columnIndex])
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

    return values.length > 0 ? getScaleForValues(values, `${input.title} ${column}`) : undefined;
  });
  const columnValues = input.columns.map((_, columnIndex) => (
    input.rows.map((row) => formatDirectTableCell(
      row[columnIndex] ?? "",
      input.columns[columnIndex] ?? "",
      input.title,
      columnScales[columnIndex],
    ))
  ));

  return {
    kind: "detail_table",
    size: "large",
    title: input.title,
    data: [{
      type: "table",
      header: {
        values: input.columns,
        fill: { color: "#f0ebe1" },
        align: "left",
        font: { color: COLORS.text, size: 12 },
      },
      cells: {
        values: columnValues,
        fill: { color: "#fffaf2" },
        align: "left",
        font: { color: COLORS.text, size: 12 },
        height: 28,
      },
    }],
    layout: {
      ...baseLayout,
      margin: { t: 20, r: 12, b: 12, l: 12 },
    },
    config: baseConfig,
    note: input.note || "AI 基于上传底稿生成可核对明细，前端按表格协议渲染。",
  };
}
