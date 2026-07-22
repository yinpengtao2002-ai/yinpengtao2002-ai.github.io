import browserFinanceCore from "../../../public/tools/shared/finance-core.js";

export type NormalizedFinancePeriod = {
  key: string;
  label: string;
  sort: number;
};

export type NumericParseResult =
  | { status: "valid"; raw: unknown; value: number }
  | { status: "blank"; raw: unknown }
  | { status: "invalid"; raw: unknown; reason: "not_finite" | "not_numeric" | "unsupported_type" };

export type MetricAggregation =
  | { mode: "sum" }
  | { mode: "ratio"; numeratorColumn: string; denominatorColumn: string }
  | { mode: "weighted_average"; weightColumn: string }
  | { mode: "snapshot"; periodColumn: string }
  | { mode: "non_aggregatable"; reason: "rate_requires_source_counts" | "ratio_missing_components" };

export type CsvParseOptions = {
  maxBytes?: number;
  maxRows?: number;
  maxColumns?: number;
  maxCellCharacters?: number;
};

export type FinanceFieldRole = "period" | "denominator" | "dimension" | "metric" | "ignore";

export type FinanceFieldInferenceOptions = {
  headers?: string[];
  explicitRoles?: Record<string, FinanceFieldRole>;
  periodAliases?: string[];
  denominatorAliases?: string[];
  ignoredHeaders?: string[];
};

export type FinanceFieldInferenceResult = {
  headers: string[];
  periodColumn: string;
  denominatorColumn: string;
  dimensionColumns: string[];
  metricColumns: string[];
  ambiguousColumns: string[];
  roles: Record<string, FinanceFieldRole | "ambiguous">;
};

type BrowserFinanceCore = {
  normalizeFinancePeriod(value: unknown): NormalizedFinancePeriod | null;
  parseFinanceNumber(value: unknown): NumericParseResult;
  parseRfc4180Csv(value: unknown, options?: CsvParseOptions): string[][];
  inferMetricAggregation(metric: string, headers?: string[]): MetricAggregation;
  aggregateMetricRows(
    rows: Array<Record<string, unknown>>,
    aggregation: MetricAggregation,
    metric: string,
  ): number | null;
};

const financeCore = browserFinanceCore as BrowserFinanceCore;

export const normalizeFinancePeriod = financeCore.normalizeFinancePeriod;
export const parseFinanceNumber = financeCore.parseFinanceNumber;
export const parseRfc4180Csv = financeCore.parseRfc4180Csv;
export const inferMetricAggregation = financeCore.inferMetricAggregation;
export const aggregateMetricRows = financeCore.aggregateMetricRows;

const DEFAULT_PERIOD_ALIASES = ["月份", "月度", "月", "期间", "年月", "会计期间", "日期", "month", "date", "period"];
const DEFAULT_DENOMINATOR_ALIASES = ["销量", "销售量", "发车量", "台数", "数量", "volume", "qty", "quantity", "units"];
const DEFAULT_IGNORED_HEADERS = ["备注", "说明", "单位", "note", "notes", "remark", "remarks", "comment", "comments"];

function normalizeFieldHeader(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/[\s_\-./()（）%％]/g, "");
}

function collectFieldHeaders(rows: Array<Record<string, unknown>>): string[] {
  const seen = new Set<string>();
  const headers: string[] = [];
  rows.forEach((row) => {
    Object.keys(row || {}).forEach((header) => {
      const cleanHeader = String(header).replace(/^\uFEFF/, "").trim();
      if (!cleanHeader || seen.has(cleanHeader)) return;
      seen.add(cleanHeader);
      headers.push(cleanHeader);
    });
  });
  return headers;
}

function findAliasHeader(headers: string[], aliases: string[]): string {
  const normalizedAliases = new Set(aliases.map(normalizeFieldHeader));
  return headers.find((header) => normalizedAliases.has(normalizeFieldHeader(header))) ?? "";
}

function isKnownDimensionHeader(header: string): boolean {
  return /大区|区域|国家|城市|省份|品牌|市场|渠道|客户|经销商|门店|车型|车系|产品|品类|业务单元|经营模式|燃油|能源|部门|组织|项目|供应商|场景|口径|版本|编码|代码|编号|region|country|city|brand|market|channel|customer|dealer|store|model|product|category|segment|businessunit|department|project|vendor|scenario|code|id/i.test(normalizeFieldHeader(header));
}

function isKnownMetricHeader(header: string): boolean {
  return /销量|数量|收入|成本|费用|边际|毛利|利润|金额|库存|率|占比|比例|单价|均价|平均|nps|score|gmv|revenue|sales|cost|expense|margin|profit|amount|inventory|rate|ratio|average|price/i.test(String(header));
}

export function inferFinanceFieldRoles(
  rows: Array<Record<string, unknown>>,
  options: FinanceFieldInferenceOptions = {},
): FinanceFieldInferenceResult {
  const headers = options.headers?.map((header) => String(header).trim()).filter(Boolean) ?? collectFieldHeaders(rows);
  const explicitRoles = Object.fromEntries(
    Object.entries(options.explicitRoles ?? {}).map(([header, role]) => [normalizeFieldHeader(header), role]),
  );
  const periodColumn = headers.find((header) => explicitRoles[normalizeFieldHeader(header)] === "period")
    ?? findAliasHeader(headers, options.periodAliases ?? DEFAULT_PERIOD_ALIASES);
  const denominatorColumn = headers.find((header) => explicitRoles[normalizeFieldHeader(header)] === "denominator")
    ?? findAliasHeader(headers, options.denominatorAliases ?? DEFAULT_DENOMINATOR_ALIASES);
  const ignored = new Set((options.ignoredHeaders ?? DEFAULT_IGNORED_HEADERS).map(normalizeFieldHeader));
  const dimensionColumns: string[] = [];
  const metricColumns: string[] = [];
  const ambiguousColumns: string[] = [];
  const roles: FinanceFieldInferenceResult["roles"] = {};

  headers.forEach((header) => {
    const normalized = normalizeFieldHeader(header);
    const explicitRole = explicitRoles[normalized];
    if (header === periodColumn || explicitRole === "period") {
      roles[header] = "period";
      return;
    }
    if (header === denominatorColumn || explicitRole === "denominator") {
      roles[header] = "denominator";
      return;
    }
    if (explicitRole === "ignore" || (!explicitRole && ignored.has(normalized))) {
      roles[header] = "ignore";
      return;
    }
    if (explicitRole === "dimension") {
      roles[header] = "dimension";
      dimensionColumns.push(header);
      return;
    }
    if (explicitRole === "metric") {
      roles[header] = "metric";
      metricColumns.push(header);
      return;
    }

    const populatedValues = rows.map((row) => row?.[header]).filter((value) => (
      value !== null && value !== undefined && String(value).trim() !== ""
    ));
    if (isKnownDimensionHeader(header)) {
      roles[header] = "dimension";
      dimensionColumns.push(header);
      return;
    }
    if (isKnownMetricHeader(header)) {
      roles[header] = "metric";
      metricColumns.push(header);
      return;
    }
    if (populatedValues.length === 0) {
      roles[header] = "ambiguous";
      ambiguousColumns.push(header);
      return;
    }
    const numericRate = populatedValues.filter((value) => parseFinanceNumber(value).status === "valid").length / populatedValues.length;
    if (numericRate >= 0.8) {
      roles[header] = "metric";
      metricColumns.push(header);
      return;
    }
    roles[header] = "dimension";
    dimensionColumns.push(header);
  });

  return {
    headers,
    periodColumn,
    denominatorColumn,
    dimensionColumns,
    metricColumns,
    ambiguousColumns,
    roles,
  };
}
