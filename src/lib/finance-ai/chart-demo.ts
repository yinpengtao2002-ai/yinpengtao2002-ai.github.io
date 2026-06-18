import type { FinanceAIDirectChart, FinanceChartSpec } from "../finance/charts/types";
// @ts-expect-error - Node's test runner imports this TypeScript module by extension.
import { buildDirectChartSpec } from "../finance/charts/index.ts";

const DEMO_CHARTS: FinanceAIDirectChart[] = [
  {
    type: "trend",
    title: "泰国单车边际趋势",
    xLabel: "月份",
    yLabel: "单车边际",
    points: [
      { label: "1月", value: 28.2 },
      { label: "2月", value: 30.4 },
      { label: "3月", value: 29.8 },
      { label: "4月", value: 32.5 },
      { label: "5月", value: 31.7 },
      { label: "6月", value: 33.1 },
    ],
    note: "用于趋势、环比同比走势和关键月份高亮。",
  },
  {
    type: "bar_rank",
    title: "4月国家销量 Top 5",
    xLabel: "销量",
    yLabel: "国家",
    items: [
      { label: "巴西", value: 30680, share: 0.214 },
      { label: "KM", value: 21970, share: 0.154 },
      { label: "英国", value: 13665, share: 0.096 },
      { label: "澳大利亚", value: 10317, share: 0.072 },
      { label: "意大利", value: 7872, share: 0.055 },
    ],
    note: "用于 Top、Bottom、环比增减和全量维度扫描。",
  },
  {
    type: "waterfall",
    title: "4月边际总额变化桥",
    startLabel: "3月",
    startValue: 4800,
    endLabel: "4月",
    endValue: 5780,
    items: [
      { label: "巴西", value: 900 },
      { label: "英国", value: -180 },
      { label: "其他", value: 260 },
    ],
    note: "用于可加总指标的期间变化来源。",
  },
  {
    type: "waterfall",
    title: "泰国单车边际归因桥",
    startLabel: "3月",
    startValue: 29.8,
    endLabel: "4月",
    endValue: 32.5,
    items: [
      { label: "T1D 结构", value: -1.2 },
      { label: "T1D 费率", value: 2.6 },
      { label: "T1E 费率", value: 1.3 },
    ],
    note: "用于单车指标的结构效应和费率效应归因。",
  },
  {
    type: "grouped_bar",
    title: "3月 vs 4月车型单车边际",
    xLabel: "车型",
    yLabel: "单车边际",
    series: [
      {
        name: "3月",
        items: [
          { label: "T1D", value: 29.8 },
          { label: "T1E", value: 24.1 },
          { label: "T19", value: 18.4 },
          { label: "T26", value: 35.2 },
        ],
      },
      {
        name: "4月",
        items: [
          { label: "T1D", value: 33.1 },
          { label: "T1E", value: 23.3 },
          { label: "T19", value: 21.8 },
          { label: "T26", value: 34.4 },
        ],
      },
    ],
    note: "用于两个期间、两个版本或实际预算对比。",
  },
  {
    type: "stacked_bar",
    title: "4月各国家车型销量结构",
    xLabel: "国家",
    yLabel: "销量",
    series: [
      {
        name: "T1D",
        items: [
          { label: "泰国", value: 4100 },
          { label: "巴西", value: 9800 },
          { label: "英国", value: 3200 },
        ],
      },
      {
        name: "T1E",
        items: [
          { label: "泰国", value: 5200 },
          { label: "巴西", value: 12400 },
          { label: "英国", value: 5800 },
        ],
      },
      {
        name: "T19",
        items: [
          { label: "泰国", value: 3150 },
          { label: "巴西", value: 8480 },
          { label: "英国", value: 4665 },
        ],
      },
    ],
    note: "用于看销量、收入或边际的绝对结构。",
  },
  {
    type: "percent_stacked_bar",
    title: "5月 数据口径×车型销量占比",
    xLabel: "数据口径",
    yLabel: "销量占比",
    series: [
      { name: "T19C", items: [{ label: "实际", value: 0.275 }] },
      { name: "T13J", items: [{ label: "实际", value: 0.224 }] },
      { name: "T1EJ", items: [{ label: "实际", value: 0.223 }] },
      { name: "T19", items: [{ label: "实际", value: 0.145 }] },
      { name: "虎8", items: [{ label: "实际", value: 0.132 }] },
    ],
    note: "用于结构占比和结构变化；单个口径也会保留居中窄柱和两侧留白。",
  },
  {
    type: "heatmap",
    title: "国家 × 车型 单车边际热力图",
    xLabels: ["T1D", "T1E", "T19", "T26"],
    yLabels: ["泰国", "巴西", "英国", "澳大利亚"],
    values: [
      [33.1, 23.3, 21.8, 34.4],
      [31.2, 26.8, 19.7, 37.5],
      [28.8, 22.4, 18.1, 30.9],
      [35.6, 25.2, 20.5, 39.2],
    ],
    note: "用于二维交叉、异常值定位和高低表现扫描。",
  },
  {
    type: "scatter_bubble",
    title: "国家经营定位气泡图",
    xLabel: "销量",
    yLabel: "单车边际",
    items: [
      { label: "泰国", x: 12450, y: 32.5, size: 22 },
      { label: "巴西", x: 30680, y: 28.7, size: 42 },
      { label: "英国", x: 13665, y: 24.6, size: 28 },
      { label: "澳大利亚", x: 10317, y: 35.1, size: 24 },
      { label: "意大利", x: 7872, y: 30.2, size: 20 },
    ],
    note: "用于看规模、质量和利润贡献之间的关系。",
  },
  {
    type: "detail_table",
    title: "低单车边际国家明细",
    variant: "exception_list",
    columns: ["国家", "销量", "单车边际", "环比", "主要车型"],
    rows: [
      ["英国", 13665, 24.6, -1.4, "T1E"],
      ["T19", 6210, 21.8, 3.4, "T19"],
      ["墨西哥", 5884, 22.1, -0.8, "T1D"],
      ["意大利", 7872, 30.2, 0.6, "T26"],
      ["智利", 4116, 19.9, -2.1, "T19"],
    ],
    note: "用于聊天里补充可核对的 Top/Bottom 明细。",
  },
];

export function buildFinanceAIChartDemoSpecs(): FinanceChartSpec[] {
  return DEMO_CHARTS.map((chart) => buildDirectChartSpec(chart));
}
