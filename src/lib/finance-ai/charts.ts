import type {
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

function buildBarRankChartSpec(title: string, result: BarRankResult): FinanceChartSpec {
  const items = [...result.items].reverse();
  const values = items.map((item) => item.value);

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
    note: "横向柱状图展示维度排名，条形旁标注当前值、占比和环比变化。",
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
