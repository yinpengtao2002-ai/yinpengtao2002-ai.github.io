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

function buildTrendChartSpec(title: string, result: TrendResult): FinanceChartSpec {
  return {
    kind: "trend_chart",
    title,
    data: [{
      type: "scatter",
      mode: "lines+markers",
      x: result.points.map((point) => point.periodLabel),
      y: result.points.map((point) => point.value),
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
      xaxis: { gridcolor: COLORS.grid, zeroline: false, tickfont: { color: COLORS.muted } },
      yaxis: { gridcolor: COLORS.grid, zeroline: false, tickfont: { color: COLORS.muted } },
    },
    config: baseConfig,
    note: "按月份聚合后展示趋势；单车指标使用总额除以销量。",
  };
}

function buildBarRankChartSpec(title: string, result: BarRankResult): FinanceChartSpec {
  const items = [...result.items].reverse();

  return {
    kind: "bar_rank",
    title,
    data: [{
      type: "bar",
      orientation: "h",
      x: items.map((item) => item.value),
      y: items.map((item) => item.label),
      marker: { color: COLORS.green },
      hovertemplate: "%{y}<br>%{x:,.2f}<extra></extra>",
    }],
    layout: {
      ...baseLayout,
      margin: { t: 28, r: 24, b: 36, l: 84 },
      xaxis: { gridcolor: COLORS.grid, zeroline: false, tickfont: { color: COLORS.muted } },
      yaxis: { automargin: true, tickfont: { color: COLORS.text } },
    },
    config: baseConfig,
    note: "横向柱状图展示维度排名，具体数值在悬停时查看。",
  };
}

function buildWaterfallChartSpec(title: string, result: WaterfallBridgeResult): FinanceChartSpec {
  return {
    kind: "waterfall_bridge",
    title,
    data: [{
      type: "waterfall",
      orientation: "v",
      measure: ["absolute", ...result.items.map(() => "relative"), "total"],
      x: [result.fromPeriod, ...result.items.map((item) => item.label), result.toPeriod],
      y: [result.startValue, ...result.items.map((item) => item.value), result.endValue],
      connector: { line: { color: COLORS.grid, width: 1 } },
      increasing: { marker: { color: COLORS.green } },
      decreasing: { marker: { color: COLORS.red } },
      totals: { marker: { color: COLORS.blue } },
      hovertemplate: "%{x}<br>%{y:,.2f}<extra></extra>",
    }],
    layout: {
      ...baseLayout,
      margin: { t: 28, r: 24, b: 52, l: 58 },
      xaxis: { tickfont: { color: COLORS.muted } },
      yaxis: { gridcolor: COLORS.grid, zeroline: true, zerolinecolor: COLORS.grid, tickfont: { color: COLORS.muted } },
    },
    config: baseConfig,
    note: "瀑布桥仅用于可加总指标，按维度拆解两个期间的变化贡献。",
  };
}
