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
