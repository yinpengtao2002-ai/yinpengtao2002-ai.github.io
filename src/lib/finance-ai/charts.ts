import type {
  FinanceAIDirectBarRankChart,
  FinanceAIDirectChart,
  FinanceAIDirectTrendChart,
  FinanceAIDirectWaterfallChart,
  BarRankResult,
  FinanceChartSpec,
  TrendResult,
  WaterfallBridgeResult,
} from "./types.ts";

const COLORS = {
  orange: "#d97757",
  blue: "#5c8fba",
  green: "#7f9165",
  red: "#b65f55",
  text: "#171615",
  muted: "#747168",
  grid: "#e8e5dc",
};

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
  | { type: "trend_chart"; title: string; result: TrendResult }
  | { type: "bar_rank"; title: string; result: BarRankResult }
  | { type: "waterfall_bridge"; title: string; result: WaterfallBridgeResult };

export function buildChartSpec(input: ChartInput): FinanceChartSpec {
  if (input.type === "trend_chart") {
    return buildTrendChartSpec(input.title, input.result);
  }

  if (input.type === "bar_rank") {
    return buildBarRankChartSpec(input.title, input.result);
  }

  return buildWaterfallChartSpec(input.title, input.result);
}

export function buildDirectChartSpec(input: FinanceAIDirectChart): FinanceChartSpec {
  if (input.type === "trend") {
    return buildDirectTrendChartSpec(input);
  }

  if (input.type === "bar_rank") {
    return buildDirectBarRankChartSpec(input);
  }

  return buildDirectWaterfallChartSpec(input);
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

function buildTrendChartSpec(title: string, result: TrendResult): FinanceChartSpec {
  const values = result.points.map((point) => point.value);

  return {
    kind: "trend_chart",
    title,
    data: [{
      type: "scatter",
      mode: "lines+markers+text",
      x: result.points.map((point) => point.periodLabel),
      y: values,
      text: values.map((value) => formatNumber(value, 2)),
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
      hovertemplate: "%{x}<br>%{y:,.2f}<extra></extra>",
    }],
    layout: {
      ...baseLayout,
      margin: { t: 36, r: 28, b: 42, l: 56 },
      xaxis: { gridcolor: COLORS.grid, zeroline: false, tickfont: { color: COLORS.muted }, fixedrange: true },
      yaxis: {
        gridcolor: COLORS.grid,
        zeroline: false,
        tickfont: { color: COLORS.muted },
        range: paddedRange(values),
        fixedrange: true,
      },
    },
    config: baseConfig,
    note: "按月份聚合后展示趋势；单车指标使用总额除以销量。",
  };
}

function buildDirectTrendChartSpec(input: FinanceAIDirectTrendChart): FinanceChartSpec {
  const values = input.points.map((point) => point.value);

  return {
    kind: "trend_chart",
    title: input.title,
    data: [{
      type: "scatter",
      mode: "lines+markers+text",
      x: input.points.map((point) => point.label),
      y: values,
      text: values.map((value) => formatNumber(value, 2)),
      textposition: "top center",
      cliponaxis: false,
      line: { color: COLORS.blue, width: 2.5 },
      marker: { color: COLORS.blue, size: 7 },
      hovertemplate: "%{x}<br>%{y:,.2f}<extra></extra>",
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
        range: paddedRange(values),
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
  const scopeText = result.totalItemCount > result.visibleItemCount
    ? `图中展示当前排名前 ${result.visibleItemCount} 项；最大增减判断已基于全量 ${result.totalItemCount} 个维度成员扫描。`
    : "横向柱状图展示全部可见维度排名，条形旁标注当前值、占比和环比变化。";

  return {
    kind: "bar_rank",
    title,
    data: [{
      type: "bar",
      orientation: "h",
      x: values,
      y: items.map((item) => item.label),
      text: items.map((item) => {
        const shareText = item.valueShare !== null && item.valueShare !== undefined ? `｜${formatShare(item.valueShare)}` : "";
        const changeText = item.changeValue !== null ? `｜环比 ${formatSignedNumber(item.changeValue)}` : "";
        return `${formatNumber(item.value)}${shareText}${changeText}`;
      }),
      textposition: "outside",
      cliponaxis: false,
      marker: { color: COLORS.green },
      hovertemplate: "%{y}<br>当前值 %{x:,.2f}<br>%{text}<extra></extra>",
    }],
    layout: {
      ...baseLayout,
      margin: { t: 28, r: 116, b: 36, l: 92 },
      xaxis: {
        gridcolor: COLORS.grid,
        zeroline: false,
        tickfont: { color: COLORS.muted },
        fixedrange: true,
        range: paddedRange([0, ...values]),
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

  return {
    kind: "bar_rank",
    title: input.title,
    data: [{
      type: "bar",
      orientation: "h",
      x: values,
      y: items.map((item) => item.label),
      text: items.map((item) => {
        const shareText = item.share !== null && item.share !== undefined ? `｜${formatShare(item.share)}` : "";
        const changeText = item.changeValue !== null && item.changeValue !== undefined
          ? `｜变化 ${formatSignedNumber(item.changeValue)}`
          : "";
        const detailText = item.detail ? `｜${item.detail}` : "";
        return `${formatNumber(item.value)}${shareText}${changeText}${detailText}`;
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
        range: paddedRange([0, ...values]),
      },
      yaxis: { title: input.xLabel, automargin: true, tickfont: { color: COLORS.text }, fixedrange: true },
    },
    config: baseConfig,
    note: input.note || "AI 基于上传底稿生成排名数据，前端按横向柱状图协议渲染。",
  };
}

function buildWaterfallChartSpec(title: string, result: WaterfallBridgeResult): FinanceChartSpec {
  const itemValues = result.items.map((item) => item.value);

  return {
    kind: "waterfall_bridge",
    title,
    data: [{
      type: "waterfall",
      orientation: "v",
      measure: ["absolute", ...result.items.map(() => "relative"), "total"],
      x: [result.fromPeriod, ...result.items.map((item) => item.label), result.toPeriod],
      y: [result.startValue, ...itemValues, result.endValue],
      text: [
        formatNumber(result.startValue),
        ...itemValues.map((value) => formatSignedNumber(value)),
        formatNumber(result.endValue),
      ],
      textposition: "outside",
      cliponaxis: false,
      connector: { line: { color: COLORS.grid, width: 1 } },
      increasing: { marker: { color: COLORS.green } },
      decreasing: { marker: { color: COLORS.red } },
      totals: { marker: { color: COLORS.blue } },
      hovertemplate: "%{x}<br>%{y:,.2f}<extra></extra>",
    }],
    layout: {
      ...baseLayout,
      margin: { t: 36, r: 30, b: 52, l: 60 },
      xaxis: { tickfont: { color: COLORS.muted }, fixedrange: true },
      yaxis: {
        gridcolor: COLORS.grid,
        zeroline: true,
        zerolinecolor: COLORS.grid,
        tickfont: { color: COLORS.muted },
        range: waterfallRange(result.startValue, itemValues, result.endValue),
        fixedrange: true,
      },
    },
    config: baseConfig,
    note: "瀑布桥仅用于可加总指标，按维度拆解两个期间的变化贡献。",
  };
}

function buildDirectWaterfallChartSpec(input: FinanceAIDirectWaterfallChart): FinanceChartSpec {
  const itemValues = input.items.map((item) => item.value);

  return {
    kind: "waterfall_bridge",
    title: input.title,
    data: [{
      type: "waterfall",
      orientation: "v",
      measure: ["absolute", ...input.items.map(() => "relative"), "total"],
      x: [input.startLabel, ...input.items.map((item) => item.label), input.endLabel],
      y: [input.startValue, ...itemValues, input.endValue],
      text: [
        formatNumber(input.startValue),
        ...itemValues.map((value) => formatSignedNumber(value)),
        formatNumber(input.endValue),
      ],
      textposition: "outside",
      cliponaxis: false,
      connector: { line: { color: COLORS.grid, width: 1 } },
      increasing: { marker: { color: COLORS.green } },
      decreasing: { marker: { color: COLORS.red } },
      totals: { marker: { color: COLORS.blue } },
      hovertemplate: "%{x}<br>%{y:,.2f}<extra></extra>",
    }],
    layout: {
      ...baseLayout,
      margin: { t: 36, r: 30, b: 52, l: 60 },
      xaxis: { tickfont: { color: COLORS.muted }, fixedrange: true },
      yaxis: {
        gridcolor: COLORS.grid,
        zeroline: true,
        zerolinecolor: COLORS.grid,
        tickfont: { color: COLORS.muted },
        range: waterfallRange(input.startValue, itemValues, input.endValue),
        fixedrange: true,
      },
    },
    config: baseConfig,
    note: input.note || "AI 基于上传底稿生成变化桥数据，前端按瀑布桥协议渲染。",
  };
}
