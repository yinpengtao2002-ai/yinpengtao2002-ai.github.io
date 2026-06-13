export type FinanceChartFilter = Record<string, string[]>;

export type FinanceChartKind =
  | "metric_card"
  | "trend_chart"
  | "bar_rank"
  | "waterfall_bridge"
  | "grouped_bar"
  | "stacked_bar"
  | "percent_stacked_bar"
  | "heatmap"
  | "scatter_bubble"
  | "detail_table";

export type FinanceChartSize = "small" | "medium" | "large";

export type FinanceTableVariant =
  | "rank"
  | "comparison"
  | "budget_actual"
  | "attribution_detail"
  | "exception_list"
  | "generic";

export type FinanceTableMeta = {
  primaryDimension?: string;
  metrics?: string[];
  period?: string;
  periods?: string[];
  comparison?: string;
  filters?: FinanceChartFilter;
  focusValues?: Array<{ dimension: string; value: string }>;
};

export type FinanceChartSpec = {
  kind: FinanceChartKind;
  size: FinanceChartSize;
  title: string;
  data: Array<Record<string, unknown>>;
  layout: Record<string, unknown>;
  config: Record<string, unknown>;
  note: string;
  tableVariant?: FinanceTableVariant;
  tableMeta?: FinanceTableMeta;
};

export type FinanceChartMetricValue = {
  period: string;
  value: number | null;
  totalValue: number;
  salesValue: number;
  rowCount: number;
  blankValueCount: number;
  invalidValueCount: number;
  isComputable: boolean;
};

export type FinanceChartMetricComparison = FinanceChartMetricValue & {
  changeValue: number | null;
  changeRate: number | null;
};

export type FinanceChartMetricSnapshotResult = {
  metric: string;
  filters: FinanceChartFilter;
  base: FinanceChartMetricValue;
  value: number | null;
  mom?: FinanceChartMetricComparison;
  yoy?: FinanceChartMetricComparison;
};

export type FinanceChartTrendPoint = FinanceChartMetricValue & {
  periodLabel: string;
};

export type FinanceChartTrendResult = {
  metric: string;
  filters: FinanceChartFilter;
  points: FinanceChartTrendPoint[];
  highlightPeriod?: string;
};

export type FinanceChartBarRankItem = {
  label: string;
  value: number | null;
  valueShare: number | null;
  changeValue: number | null;
  changeShare: number | null;
  rowCount: number;
  blankValueCount: number;
  invalidValueCount: number;
};

export type FinanceChartBarRankResult = {
  metric: string;
  dimension: string;
  items: FinanceChartBarRankItem[];
  allItems?: FinanceChartBarRankItem[];
  totalItemCount: number;
  visibleItemCount: number;
  sort: "value_desc" | "value_asc" | "change_desc" | "change_asc";
  filters: FinanceChartFilter;
  period?: string;
  comparison?: "mom";
};

export type FinanceChartWaterfallBridgeItem = {
  label: string;
  value: number;
  mixEffect?: number;
  rateEffect?: number;
};

export type FinanceChartWaterfallBridgeResult = {
  metric: string;
  dimension: string;
  fromPeriod?: string;
  toPeriod?: string;
  period?: string;
  comparison?: "scenario";
  fromScenario?: string;
  toScenario?: string;
  filters: FinanceChartFilter;
  fromPeriodLabel?: string;
  toPeriodLabel?: string;
  periodLabel?: string;
  startValue: number;
  endValue: number;
  changeValue: number;
  basis?: "total_metric" | "unit_metric_mix_rate";
  items: FinanceChartWaterfallBridgeItem[];
};

export type FinanceChartBuildInput =
  | { type: "metric_snapshot"; title: string; result: FinanceChartMetricSnapshotResult }
  | { type: "trend_chart"; title: string; result: FinanceChartTrendResult }
  | { type: "bar_rank"; title: string; result: FinanceChartBarRankResult }
  | { type: "waterfall_bridge"; title: string; result: FinanceChartWaterfallBridgeResult };

export type FinanceAIDirectTrendChart = {
  type: "trend";
  title: string;
  xLabel?: string;
  yLabel?: string;
  points: Array<{ label: string; value: number }>;
  note?: string;
};

export type FinanceAIDirectMetricCardChart = {
  type: "metric_card";
  title: string;
  value: number;
  subtitle?: string;
  deltaValue?: number | null;
  deltaRate?: number | null;
  note?: string;
};

export type FinanceAIDirectBarRankChart = {
  type: "bar_rank";
  title: string;
  xLabel?: string;
  yLabel?: string;
  items: Array<{
    label: string;
    value: number;
    share?: number | null;
    changeValue?: number | null;
    detail?: string;
  }>;
  note?: string;
};

export type FinanceAIDirectWaterfallChart = {
  type: "waterfall";
  title: string;
  startLabel: string;
  startValue: number;
  endLabel: string;
  endValue: number;
  items: Array<{ label: string; value: number }>;
  note?: string;
};

export type FinanceAIDirectSeriesChart = {
  type: "grouped_bar" | "stacked_bar" | "percent_stacked_bar";
  title: string;
  xLabel?: string;
  yLabel?: string;
  series: Array<{
    name: string;
    items: Array<{ label: string; value: number }>;
  }>;
  note?: string;
};

export type FinanceAIDirectHeatmapChart = {
  type: "heatmap";
  title: string;
  xLabels: string[];
  yLabels: string[];
  values: Array<Array<number | null>>;
  note?: string;
};

export type FinanceAIDirectScatterBubbleChart = {
  type: "scatter_bubble";
  title: string;
  xLabel?: string;
  yLabel?: string;
  items: Array<{
    label: string;
    x: number;
    y: number;
    size?: number | null;
  }>;
  note?: string;
};

export type FinanceAIDirectDetailTableChart = {
  type: "detail_table";
  title: string;
  variant?: FinanceTableVariant;
  meta?: FinanceTableMeta;
  columns: string[];
  rows: Array<Array<string | number | null>>;
  note?: string;
};

export type FinanceAIDirectChart =
  | FinanceAIDirectMetricCardChart
  | FinanceAIDirectTrendChart
  | FinanceAIDirectBarRankChart
  | FinanceAIDirectWaterfallChart
  | FinanceAIDirectSeriesChart
  | FinanceAIDirectHeatmapChart
  | FinanceAIDirectScatterBubbleChart
  | FinanceAIDirectDetailTableChart;
