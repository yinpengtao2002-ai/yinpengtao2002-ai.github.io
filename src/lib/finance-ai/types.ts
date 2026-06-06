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
};

export type BarRankItem = {
  label: string;
  value: number | null;
  changeValue: number | null;
  rowCount: number;
  blankValueCount: number;
  invalidValueCount: number;
};

export type BarRankResult = {
  metric: string;
  dimension: string;
  items: BarRankItem[];
  filters: FinanceFilter;
  period?: string;
  comparison?: "mom";
};

export type WaterfallBridgeRequest = {
  metric: string;
  dimension: string;
  fromPeriod: string;
  toPeriod: string;
  filters?: FinanceFilter;
  limit?: number;
};

export type WaterfallBridgeItem = {
  label: string;
  value: number;
};

export type WaterfallBridgeResult = {
  metric: string;
  dimension: string;
  fromPeriod: string;
  toPeriod: string;
  startValue: number;
  endValue: number;
  changeValue: number;
  items: WaterfallBridgeItem[];
  filters: FinanceFilter;
};
