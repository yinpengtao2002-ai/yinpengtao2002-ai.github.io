import type { FinanceChartSpec } from "./types";
// @ts-expect-error - Node's test runner imports this TypeScript module by extension.
import { buildDirectChartSpec } from "./charts.ts";

const COLORS = {
  orange: "#d97757",
  blue: "#5c8fba",
  green: "#7f9165",
  red: "#b65f55",
  yellow: "#c89b40",
  text: "#171615",
  muted: "#747168",
  grid: "#ded8cb",
  plotSurface: "#f7f3ea",
  plotSurfaceStrong: "#eee7dc",
};

const baseLayout = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  font: {
    family: "PingFang SC, Microsoft YaHei, Helvetica Neue, Arial, sans-serif",
    color: COLORS.text,
    size: 12,
  },
  margin: { t: 36, r: 28, b: 44, l: 58 },
  showlegend: false,
};

const baseConfig = {
  displayModeBar: false,
  responsive: true,
};

const SIZE_BY_KIND: Record<FinanceChartSpec["kind"], FinanceChartSpec["size"]> = {
  metric_card: "small",
  trend_chart: "large",
  bar_rank: "large",
  waterfall_bridge: "large",
  grouped_bar: "medium",
  stacked_bar: "medium",
  percent_stacked_bar: "medium",
  heatmap: "large",
  scatter_bubble: "large",
  detail_table: "large",
};

function spec(kind: FinanceChartSpec["kind"], title: string, data: FinanceChartSpec["data"], layout: Record<string, unknown>, note: string): FinanceChartSpec {
  return {
    kind,
    size: SIZE_BY_KIND[kind],
    title,
    data,
    layout: { ...baseLayout, ...layout },
    config: baseConfig,
    note,
  };
}

function waterfallSpec(
  title: string,
  startLabel: string,
  startValue: number,
  endLabel: string,
  endValue: number,
  items: Array<{ label: string; value: number }>,
  note: string,
): FinanceChartSpec {
  return buildDirectChartSpec({
    type: "waterfall",
    title,
    startLabel,
    startValue,
    endLabel,
    endValue,
    items,
    note,
  });
}

export function buildFinanceAIChartDemoSpecs(): FinanceChartSpec[] {
  return [
    spec("trend_chart", "泰国单车边际趋势", [{
      type: "scatter",
      mode: "lines+markers+text",
      x: ["1月", "2月", "3月", "4月", "5月", "6月"],
      y: [28.2, 30.4, 29.8, 32.5, 31.7, 33.1],
      text: ["28.2", "30.4", "29.8", "32.5", "31.7", "33.1"],
      textposition: "top center",
      cliponaxis: false,
      line: { color: COLORS.blue, width: 2.6 },
      marker: { color: [COLORS.blue, COLORS.blue, COLORS.blue, COLORS.orange, COLORS.blue, COLORS.blue], size: [6, 6, 6, 9, 6, 6] },
      hovertemplate: "%{x}<br>%{y:.1f}<extra></extra>",
    }], {
      xaxis: { gridcolor: COLORS.grid, fixedrange: true },
      yaxis: { gridcolor: COLORS.grid, range: [26.8, 34.4], fixedrange: true },
    }, "用于趋势、环比同比走势和关键月份高亮。"),

    spec("bar_rank", "4月国家销量 Top 5", [{
      type: "bar",
      orientation: "h",
      x: [7872, 10317, 13665, 21970, 30680],
      y: ["意大利", "澳大利亚", "英国", "KM", "巴西"],
      text: ["7,872｜5.5%", "10,317｜7.2%", "13,665｜9.6%", "21,970｜15.4%", "30,680｜21.4%"],
      textposition: "outside",
      cliponaxis: false,
      marker: { color: COLORS.green },
      hovertemplate: "%{y}<br>%{text}<extra></extra>",
    }], {
      margin: { t: 28, r: 116, b: 34, l: 90 },
      xaxis: { gridcolor: COLORS.grid, fixedrange: true, range: [0, 35000] },
      yaxis: { fixedrange: true },
    }, "用于 Top、Bottom、环比增减和全量维度扫描。"),

    waterfallSpec("4月边际总额变化桥", "3月", 4800, "4月", 5780, [
      { label: "巴西", value: 900 },
      { label: "英国", value: -180 },
      { label: "其他", value: 260 },
    ], "用于可加总指标的期间变化来源。"),

    waterfallSpec("泰国单车边际归因桥", "3月", 29.8, "4月", 32.5, [
      { label: "T1D 结构", value: -1.2 },
      { label: "T1D 费率", value: 2.6 },
      { label: "T1E 费率", value: 1.3 },
    ], "用于单车指标的结构效应和费率效应归因。"),

    spec("grouped_bar", "3月 vs 4月车型单车边际", [
      { type: "bar", name: "3月", x: ["T1D", "T1E", "T19", "T26"], y: [29.8, 24.1, 18.4, 35.2], marker: { color: COLORS.blue }, text: ["29.8", "24.1", "18.4", "35.2"], textposition: "outside" },
      { type: "bar", name: "4月", x: ["T1D", "T1E", "T19", "T26"], y: [33.1, 23.3, 21.8, 34.4], marker: { color: COLORS.orange }, text: ["33.1", "23.3", "21.8", "34.4"], textposition: "outside" },
    ], {
      barmode: "group",
      showlegend: true,
      yaxis: { gridcolor: COLORS.grid, fixedrange: true },
      xaxis: { fixedrange: true },
    }, "用于两个期间、两个版本或实际预算对比。"),

    spec("stacked_bar", "4月各国家车型销量结构", [
      { type: "bar", name: "T1D", x: ["泰国", "巴西", "英国"], y: [4100, 9800, 3200], marker: { color: COLORS.blue } },
      { type: "bar", name: "T1E", x: ["泰国", "巴西", "英国"], y: [5200, 12400, 5800], marker: { color: COLORS.green } },
      { type: "bar", name: "T19", x: ["泰国", "巴西", "英国"], y: [3150, 8480, 4665], marker: { color: COLORS.yellow } },
    ], {
      barmode: "stack",
      showlegend: true,
      yaxis: { gridcolor: COLORS.grid, fixedrange: true },
      xaxis: { fixedrange: true },
    }, "用于看销量、收入或边际的绝对结构。"),

    spec("percent_stacked_bar", "4月车型销量占比", [
      { type: "bar", name: "T1D", x: ["泰国", "巴西", "英国"], y: [0.33, 0.32, 0.23], marker: { color: COLORS.blue }, text: ["33%", "32%", "23%"], textposition: "inside" },
      { type: "bar", name: "T1E", x: ["泰国", "巴西", "英国"], y: [0.42, 0.40, 0.42], marker: { color: COLORS.green }, text: ["42%", "40%", "42%"], textposition: "inside" },
      { type: "bar", name: "T19", x: ["泰国", "巴西", "英国"], y: [0.25, 0.28, 0.35], marker: { color: COLORS.yellow }, text: ["25%", "28%", "35%"], textposition: "inside" },
    ], {
      barmode: "stack",
      showlegend: true,
      yaxis: { tickformat: ".0%", range: [0, 1], gridcolor: COLORS.grid, fixedrange: true },
      xaxis: { fixedrange: true },
    }, "用于结构占比和结构变化。"),

    spec("heatmap", "国家 × 车型 单车边际热力图", [{
      type: "heatmap",
      x: ["T1D", "T1E", "T19", "T26"],
      y: ["泰国", "巴西", "英国", "澳大利亚"],
      z: [[33.1, 23.3, 21.8, 34.4], [31.2, 26.8, 19.7, 37.5], [28.8, 22.4, 18.1, 30.9], [35.6, 25.2, 20.5, 39.2]],
      text: [["33.1", "23.3", "21.8", "34.4"], ["31.2", "26.8", "19.7", "37.5"], ["28.8", "22.4", "18.1", "30.9"], ["35.6", "25.2", "20.5", "39.2"]],
      texttemplate: "%{text}",
      colorscale: [[0, "#f3dfd8"], [0.5, "#f8f3e8"], [1, "#d7e2cf"]],
      showscale: false,
      hovertemplate: "%{y} / %{x}<br>%{z:.1f}<extra></extra>",
    }], {
      margin: { t: 28, r: 18, b: 42, l: 74 },
      xaxis: { fixedrange: true },
      yaxis: { fixedrange: true },
    }, "用于二维交叉、异常值定位和高低表现扫描。"),

    spec("scatter_bubble", "国家经营定位气泡图", [{
      type: "scatter",
      mode: "markers+text",
      x: [12450, 30680, 13665, 10317, 7872],
      y: [32.5, 28.7, 24.6, 35.1, 30.2],
      text: ["泰国", "巴西", "英国", "澳大利亚", "意大利"],
      textposition: "top center",
      marker: { size: [22, 42, 28, 24, 20], color: [COLORS.orange, COLORS.green, COLORS.blue, COLORS.yellow, COLORS.red], opacity: 0.82, line: { color: COLORS.plotSurface, width: 2 } },
      hovertemplate: "%{text}<br>销量 %{x:,}<br>单车边际 %{y:.1f}<extra></extra>",
    }], {
      xaxis: { title: "销量", gridcolor: COLORS.grid, fixedrange: true },
      yaxis: { title: "单车边际", gridcolor: COLORS.grid, fixedrange: true },
    }, "用于看规模、质量和利润贡献之间的关系。"),

    spec("detail_table", "低单车边际国家明细", [{
      type: "table",
      header: { values: ["国家", "销量", "单车边际", "环比", "主要车型"], fill: { color: COLORS.plotSurfaceStrong }, align: "left", font: { color: COLORS.text, size: 12 } },
      cells: {
        values: [
          ["英国", "T19", "墨西哥", "意大利", "智利"],
          ["13,665", "6,210", "5,884", "7,872", "4,116"],
          ["24.6", "21.8", "22.1", "30.2", "19.9"],
          ["-1.4", "+3.4", "-0.8", "+0.6", "-2.1"],
          ["T1E", "T19", "T1D", "T26", "T19"],
        ],
        fill: { color: COLORS.plotSurface },
        align: "left",
        font: { color: COLORS.text, size: 12 },
        height: 28,
      },
    }], {
      margin: { t: 20, r: 12, b: 12, l: 12 },
    }, "用于聊天里补充可核对的 Top/Bottom 明细。"),
  ];
}
