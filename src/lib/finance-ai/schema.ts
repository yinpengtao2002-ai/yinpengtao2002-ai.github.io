import type {
  FinancePeriod,
  FinanceRow,
  FinanceSchema,
  FinanceSchemaIssue,
  FinanceTotalMetric,
  FinanceUnitMetric,
} from "./types.ts";
import {
  normalizeFinancePeriod,
  parseFinanceNumber,
} from "../finance/core.ts";

const MONTH_ALIASES = [
  "月份",
  "月度",
  "月",
  "期间",
  "年月",
  "会计期间",
  "month",
  "date",
  "period",
];

const SALES_ALIASES = [
  "销量",
  "销售量",
  "发车量",
  "台数",
  "数量",
  "volume",
  "qty",
  "quantity",
  "units",
];

const NON_DIMENSION_COLUMNS = new Set([
  "版本",
  "单位",
  "备注",
  "口径",
  "数据类型",
  "类型",
  "scenario",
].map(normalizeHeaderName));

const IDENTIFIER_DIMENSION_PREFIXES = [
  "客户",
  "经销商",
  "国家",
  "渠道",
  "车型",
  "产品",
  "用户",
  "账户",
  "门店",
  "供应商",
  "customer",
  "dealer",
  "country",
  "channel",
  "model",
  "product",
  "user",
  "account",
  "store",
  "vendor",
  "client",
  "sku",
].map(normalizeHeaderName);

const RATE_LIKE_PATTERNS = [
  "率",
  "占比",
  "%",
  "％",
  "单车",
  "单位",
  "平均",
  "均价",
  "单价",
  "rate",
  "ratio",
  "perunit",
  "unit",
];

const UNIT_METRIC_BLUEPRINTS = [
  { name: "单车净收入", numeratorAliases: ["净收入", "netrevenue", "营业收入", "收入", "revenue"] },
  { name: "单车成本", numeratorAliases: ["成本", "cost"] },
  { name: "单车边际", numeratorAliases: ["边际总额", "贡献边际", "贡献毛利", "边际", "毛利", "margin"] },
  { name: "单车利润", numeratorAliases: ["利润", "profit"] },
];


const ISSUE_MESSAGES: Record<FinanceSchemaIssue["code"], string> = {
  missing_month: "未识别月份列，请提供月份、月度、期间或 month/date/period 字段。",
  missing_sales: "未识别销量列，请提供销量、销售量、数量或 volume/qty/units 字段。",
  missing_metric: "未识别可用于分析的金额类指标，请在销量列后提供净收入、成本、边际或利润等数值列。",
};

function normalizeHeaderName(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_\-./()（）]/g, "");
}

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

function getHeaders(rows: FinanceRow[]): string[] {
  const seen = new Set<string>();
  const headers: string[] = [];

  for (const row of rows) {
    for (const header of Object.keys(row)) {
      if (!seen.has(header)) {
        seen.add(header);
        headers.push(header);
      }
    }
  }

  return headers;
}

function findAliasColumn(headers: string[], aliases: string[]): string {
  const normalizedAliases = aliases.map(normalizeHeaderName);
  const exactMatch = headers.find((header) => normalizedAliases.includes(normalizeHeaderName(header)));

  if (exactMatch) {
    return exactMatch;
  }

  return headers.find((header) => {
    const normalizedHeader = normalizeHeaderName(header);
    return normalizedAliases.some((alias) => (
      alias.length >= 2 &&
      normalizedHeader.length >= 2 &&
      (normalizedHeader.includes(alias) || alias.includes(normalizedHeader))
    ));
  }) ?? "";
}

function isRateLikeColumn(column: string): boolean {
  const normalizedColumn = normalizeHeaderName(column);
  return RATE_LIKE_PATTERNS.some((pattern) => {
    const normalizedPattern = normalizeHeaderName(pattern);
    return column.includes(pattern) || normalizedColumn.includes(normalizedPattern);
  });
}

function isNonDimensionColumn(column: string): boolean {
  return NON_DIMENSION_COLUMNS.has(normalizeHeaderName(column));
}

function isIdentifierLikeColumn(column: string): boolean {
  const normalizedColumn = normalizeHeaderName(column);

  if (
    normalizedColumn.includes("编码") ||
    normalizedColumn.includes("代码") ||
    normalizedColumn.includes("编号") ||
    normalizedColumn.includes("sku")
  ) {
    return true;
  }

  if (normalizedColumn === "id") {
    return true;
  }

  return IDENTIFIER_DIMENSION_PREFIXES.some((prefix) => normalizedColumn === `${prefix}id`);
}

function isExcludedTotalMetricColumn(column: string): boolean {
  return isNonDimensionColumn(column) || isIdentifierLikeColumn(column);
}

function isNumericColumn(rows: FinanceRow[], column: string): boolean {
  const values = rows.map((row) => row[column]).filter((value) => !isEmptyValue(value));

  if (values.length === 0) {
    return false;
  }

  const numericCount = values.filter((value) => toFinanceNumber(value) !== null).length;
  return numericCount === values.length || numericCount / values.length >= 0.8;
}

function normalizeMetricName(value: string): string {
  return normalizeHeaderName(value).replace(/金额|额|合计|总额|total/g, "");
}

function getMetricAliasMatchRank(column: string, alias: string): number {
  const normalizedRawColumn = normalizeHeaderName(column);
  const normalizedRawAlias = normalizeHeaderName(alias);
  const normalizedColumn = normalizeMetricName(column);
  const normalizedAlias = normalizeMetricName(alias);

  if (normalizedRawColumn === normalizedRawAlias) {
    return 3;
  }

  if (normalizedColumn === normalizedAlias) {
    return 2;
  }

  if (column.includes(alias) || normalizedRawColumn.includes(normalizedRawAlias) || normalizedColumn.includes(normalizedAlias)) {
    return 1;
  }

  return 0;
}

function findMetricForAliases(
  totalMetrics: FinanceTotalMetric[],
  aliases: string[],
): FinanceTotalMetric | undefined {
  for (const alias of aliases) {
    for (const rank of [3, 2, 1]) {
      const metric = totalMetrics.find((candidate) => getMetricAliasMatchRank(candidate.column, alias) === rank);
      if (metric) {
        return metric;
      }
    }
  }

  return undefined;
}

function buildUnitMetrics(
  totalMetrics: FinanceTotalMetric[],
  salesColumn: string,
): FinanceUnitMetric[] {
  if (!salesColumn) {
    return [];
  }

  return UNIT_METRIC_BLUEPRINTS.flatMap((blueprint) => {
    const metric = findMetricForAliases(totalMetrics, blueprint.numeratorAliases);

    if (!metric) {
      return [];
    }

    return [{
      kind: "unit" as const,
      name: blueprint.name,
      numeratorColumn: metric.column,
      denominatorColumn: salesColumn,
    }];
  });
}

function makeIssue(code: FinanceSchemaIssue["code"]): FinanceSchemaIssue {
  return {
    code,
    message: ISSUE_MESSAGES[code],
  };
}

export function normalizePeriodValue(value: unknown): FinancePeriod | null {
  return normalizeFinancePeriod(value);
}

export function toFinanceNumber(value: unknown): number | null {
  const parsed = parseFinanceNumber(value);
  return parsed.status === "valid" ? parsed.value : null;
}

export function inferFinanceSchema(rows: FinanceRow[]): FinanceSchema {
  const headers = getHeaders(rows);
  const monthColumn = findAliasColumn(headers, MONTH_ALIASES);
  const salesColumn = findAliasColumn(headers, SALES_ALIASES);
  const salesIndex = salesColumn ? headers.indexOf(salesColumn) : -1;
  const metricCandidateColumns = salesIndex >= 0
    ? headers.slice(salesIndex + 1)
    : headers.filter((header) => header !== monthColumn && header !== salesColumn);

  const dimensionColumns = salesIndex >= 0
    ? headers.slice(0, salesIndex).filter((header) =>
      header !== monthColumn &&
      header !== salesColumn &&
      !isNonDimensionColumn(header),
    )
    : [];

  const additiveMetrics = metricCandidateColumns
    .filter((column) => column !== monthColumn && column !== salesColumn)
    .filter((column) => !isExcludedTotalMetricColumn(column))
    .filter((column) => isNumericColumn(rows, column))
    .filter((column) => !isRateLikeColumn(column))
    .map((column) => ({
      kind: "total" as const,
      name: column,
      column,
    }));
  const totalMetrics = [
    ...(salesColumn ? [{ kind: "total" as const, name: salesColumn, column: salesColumn }] : []),
    ...additiveMetrics,
  ];

  const excludedMetricColumns = metricCandidateColumns
    .filter((column) => column !== monthColumn && column !== salesColumn)
    .filter((column) => isNumericColumn(rows, column) && isRateLikeColumn(column));

  const periodsByKey = new Map<string, FinancePeriod>();
  if (monthColumn) {
    for (const row of rows) {
      const period = normalizePeriodValue(row[monthColumn]);
      if (period) {
        periodsByKey.set(period.key, period);
      }
    }
  }
  const periods = Array.from(periodsByKey.values()).sort((a, b) => a.sort - b.sort);
  const unitMetrics = buildUnitMetrics(totalMetrics, salesColumn);
  const requiredIssues = [
    !monthColumn || periods.length === 0 ? makeIssue("missing_month") : null,
    !salesColumn ? makeIssue("missing_sales") : null,
    totalMetrics.length === 0 ? makeIssue("missing_metric") : null,
  ].filter((issue): issue is FinanceSchemaIssue => issue !== null);

  const dimensionValueCounts = Object.fromEntries(
    dimensionColumns.map((column) => {
      const values = new Set<string>();
      for (const row of rows) {
        const value = row[column];
        if (!isEmptyValue(value)) {
          values.add(String(value).trim());
        }
      }

      return [column, values.size];
    }),
  );

  return {
    headers,
    monthColumn,
    salesColumn,
    dimensionColumns,
    totalMetrics,
    unitMetrics,
    excludedMetricColumns,
    requiredIssues,
    profile: {
      rowCount: rows.length,
      periods,
      dimensionValueCounts,
    },
  };
}
