import type { FinanceAIDirectChart } from "../finance/charts/types";

export type {
  FinanceAIDirectBarRankChart,
  FinanceAIDirectChart,
  FinanceAIDirectDetailTableChart,
  FinanceAIDirectHeatmapChart,
  FinanceAIDirectMetricCardChart,
  FinanceAIDirectScatterBubbleChart,
  FinanceAIDirectSeriesChart,
  FinanceAIDirectTrendChart,
  FinanceAIDirectWaterfallChart,
  FinanceChartKind,
  FinanceChartSize,
  FinanceChartSpec,
  FinanceTableMeta,
  FinanceTableVariant,
} from "../finance/charts/types";

export type FinancePeriod = {
  key: string;
  label: string;
  sort: number;
};

export type FinanceMetricKind = "total" | "unit";

export type FinanceTotalMetric = {
  kind: "total";
  name: string;
  column: string;
};

export type FinanceUnitMetric = {
  kind: "unit";
  name: string;
  numeratorColumn: string;
  denominatorColumn: string;
};

export type FinanceMetric = FinanceTotalMetric | FinanceUnitMetric;

export type FinanceSchemaIssueCode = "missing_month" | "missing_sales" | "missing_metric";

export type FinanceSchemaIssue = {
  code: FinanceSchemaIssueCode;
  message: string;
};

export type FinanceDataProfile = {
  rowCount: number;
  periods: FinancePeriod[];
  dimensionValueCounts: Record<string, number>;
};

export type FinanceSchema = {
  headers: string[];
  monthColumn: string;
  salesColumn: string;
  dimensionColumns: string[];
  totalMetrics: FinanceTotalMetric[];
  unitMetrics: FinanceUnitMetric[];
  excludedMetricColumns: string[];
  requiredIssues: FinanceSchemaIssue[];
  profile: FinanceDataProfile;
};

export type FinanceRow = Record<string, unknown>;

export type FinanceFilter = Record<string, string[]>;

export type FinanceRawWorkbookSheet = {
  name: string;
  headers: string[];
  rows: FinanceRow[];
  rowCount: number;
};

export type FinanceRawWorkbook = {
  fileName: string;
  sheets: FinanceRawWorkbookSheet[];
  totalRowCount: number;
};

export type FinanceComparisonKind = "mom" | "yoy";

export type MetricSnapshotRequest = {
  metric: string;
  period: string;
  filters?: FinanceFilter;
  comparisons?: FinanceComparisonKind[];
};

export type MetricValueBase = {
  period: string;
  value: number | null;
  totalValue: number;
  salesValue: number;
  rowCount: number;
  blankValueCount: number;
  invalidValueCount: number;
  isComputable: boolean;
};

export type MetricComparison = MetricValueBase & {
  changeValue: number | null;
  changeRate: number | null;
};

export type MetricSnapshotResult = {
  metric: string;
  filters: FinanceFilter;
  base: MetricValueBase;
  value: number | null;
  mom?: MetricComparison;
  yoy?: MetricComparison;
};

export type TrendRequest = {
  metric: string;
  filters?: FinanceFilter;
  highlightPeriod?: string;
};

export type TrendPoint = MetricValueBase & {
  periodLabel: string;
};

export type TrendResult = {
  metric: string;
  filters: FinanceFilter;
  points: TrendPoint[];
  highlightPeriod?: string;
};

export type BarRankRequest = {
  metric: string;
  dimension: string;
  period?: string;
  filters?: FinanceFilter;
  comparison?: "mom";
  sort?: "value_desc" | "value_asc" | "change_desc" | "change_asc";
  limit?: number;
  detailTable?: boolean;
};

export type BarRankSort = NonNullable<BarRankRequest["sort"]>;

export type BarRankItem = {
  label: string;
  value: number | null;
  valueShare: number | null;
  changeValue: number | null;
  changeShare: number | null;
  rowCount: number;
  blankValueCount: number;
  invalidValueCount: number;
};

export type BarRankFullScan = {
  basis: "all_dimension_members";
  totalItemCount: number;
  visibleItemCount: number;
  increases: BarRankItem[];
  decreases: BarRankItem[];
  largestAbsoluteChanges: BarRankItem[];
};

export type BarRankResult = {
  metric: string;
  dimension: string;
  items: BarRankItem[];
  allItems?: BarRankItem[];
  totalItemCount: number;
  visibleItemCount: number;
  sort: BarRankSort;
  fullScan?: BarRankFullScan;
  filters: FinanceFilter;
  period?: string;
  comparison?: "mom";
};

export type WaterfallBridgeRequest = {
  metric: string;
  dimension: string;
  fromPeriod?: string;
  toPeriod?: string;
  period?: string;
  comparison?: "scenario";
  fromScenario?: string;
  toScenario?: string;
  filters?: FinanceFilter;
  limit?: number;
};

export type WaterfallBridgeItem = {
  label: string;
  value: number;
  mixEffect?: number;
  rateEffect?: number;
};

export type WaterfallBridgeResult = {
  metric: string;
  dimension: string;
  fromPeriod?: string;
  toPeriod?: string;
  period?: string;
  comparison?: "scenario";
  fromScenario?: string;
  toScenario?: string;
  fromPeriodLabel?: string;
  toPeriodLabel?: string;
  periodLabel?: string;
  startValue: number;
  endValue: number;
  changeValue: number;
  basis?: "total_metric" | "unit_metric_mix_rate";
  items: WaterfallBridgeItem[];
  filters: FinanceFilter;
};

export type FinanceActionModule =
  | ({ type: "metric_snapshot"; chart?: { type: "metric_card" | "trend_chart"; highlightPeriod?: string } } & MetricSnapshotRequest)
  | ({ type: "trend_chart" } & TrendRequest)
  | ({ type: "bar_rank" } & BarRankRequest)
  | ({ type: "waterfall_bridge" } & WaterfallBridgeRequest)
  | ({ type: "grouped_bar"; comparison?: "mom"; seriesDimension?: string; seriesLimit?: number } & Pick<BarRankRequest, "metric" | "dimension" | "period" | "filters" | "limit">)
  | ({ type: "stacked_bar" | "percent_stacked_bar"; metric: string; dimension: string; seriesDimension: string; period: string; filters?: FinanceFilter; limit?: number; seriesLimit?: number })
  | ({ type: "heatmap"; metric: string; xDimension: string; yDimension: string; period: string; filters?: FinanceFilter; limit?: number })
  | ({ type: "scatter_bubble"; xMetric: string; yMetric: string; sizeMetric?: string; dimension: string; period: string; filters?: FinanceFilter; limit?: number })
  | ({ type: "detail_table"; metrics: string[]; dimension: string; period: string; comparison?: "mom"; filters?: FinanceFilter; limit?: number });

export type FinanceActionPlan = {
  modules: FinanceActionModule[];
};

export type FinanceActionValidationResult =
  | { ok: true; modules: FinanceActionModule[]; errors: [] }
  | { ok: false; modules: FinanceActionModule[]; errors: string[] };

export type FinanceAIDirectAnalysis = {
  answer: string;
  assumptions: string[];
  charts: FinanceAIDirectChart[];
};

export type FinanceAIDataRequest = {
  sheetName?: string;
  columns: string[];
  filters?: Record<string, string[]>;
  rowLimit?: number;
  reason?: string;
};

export type FinanceAIDataSelection = {
  request: FinanceAIDataRequest;
  sheetName: string;
  headers: string[];
  rows: FinanceRow[];
  rowCount: number;
  totalMatchedRowCount: number;
  omittedRowCount: number;
};
