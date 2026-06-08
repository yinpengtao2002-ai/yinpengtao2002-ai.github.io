import type {
  FinancePeriod,
  FinanceRow,
  FinanceSchema,
  FinanceSchemaIssue,
  FinanceTotalMetric,
  FinanceUnitMetric,
} from "./types.ts";

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

const UNIT_SCALE_PATTERNS = [
  { pattern: /百万元/i, multiplier: 1_000_000 },
  { pattern: /千万元/i, multiplier: 10_000_000 },
  { pattern: /亿元|亿/i, multiplier: 100_000_000 },
  { pattern: /万元|万/i, multiplier: 10_000 },
  { pattern: /千元/i, multiplier: 1_000 },
];
const CHINESE_MONTH_NUMBERS: Record<string, number> = {
  "一": 1,
  "二": 2,
  "三": 3,
  "四": 4,
  "五": 5,
  "六": 6,
  "七": 7,
  "八": 8,
  "九": 9,
  "十": 10,
  "十一": 11,
  "十二": 12,
};
const CHINESE_MONTH_NAMES = Object.keys(CHINESE_MONTH_NUMBERS).sort((a, b) => b.length - a.length);
const PERIOD_QUALIFIERS = [
  { key: "actual", order: 1, aliases: ["实际", "实绩", "actual", "actuals", "act"] },
  { key: "target", order: 2, aliases: ["目标", "考核", "target", "goal"] },
  { key: "budget", order: 3, aliases: ["预算", "budget", "bud"] },
  { key: "forecast", order: 4, aliases: ["预测", "预估", "滚动", "forecast", "fcst", "estimate"] },
  { key: "plan", order: 5, aliases: ["计划", "规划", "plan"] },
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

function normalizePeriodQualifier(value: string): { key: string; order: number } | null {
  const normalized = normalizeHeaderName(value)
    .replace(/^(数据|口径)/, "")
    .replace(/(数据|数|值)$/, "");

  if (!normalized) {
    return null;
  }

  for (const qualifier of PERIOD_QUALIFIERS) {
    if (qualifier.aliases.some((alias) => normalized === normalizeHeaderName(alias))) {
      return { key: qualifier.key, order: qualifier.order };
    }
  }

  return null;
}

function buildPeriod(year: number | null, month: number, label: string, qualifierText = ""): FinancePeriod | null {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  const qualifier = qualifierText ? normalizePeriodQualifier(qualifierText) : null;
  if (qualifierText && !qualifier) {
    return null;
  }

  const monthText = String(month).padStart(2, "0");
  const baseKey = year ? `${year}-${monthText}` : `M${monthText}`;
  const baseSort = year ? year * 12 + month : month;

  return {
    key: qualifier ? `${baseKey}__${qualifier.key}` : baseKey,
    label,
    sort: qualifier ? baseSort + qualifier.order / 100 : baseSort,
  };
}

function getChineseMonthPrefix(text: string): { month: number; suffix: string } | null {
  const compactText = text.replace(/\s/g, "");

  for (const monthName of CHINESE_MONTH_NAMES) {
    if (compactText === monthName || compactText === `${monthName}月`) {
      return { month: CHINESE_MONTH_NUMBERS[monthName], suffix: "" };
    }

    if (compactText.startsWith(`${monthName}月`)) {
      return {
        month: CHINESE_MONTH_NUMBERS[monthName],
        suffix: compactText.slice(`${monthName}月`.length),
      };
    }

    if (compactText.startsWith(monthName)) {
      return {
        month: CHINESE_MONTH_NUMBERS[monthName],
        suffix: compactText.slice(monthName.length),
      };
    }
  }

  return null;
}

export function normalizePeriodValue(value: unknown): FinancePeriod | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    const year = value.getFullYear();
    const month = value.getMonth() + 1;
    return {
      key: `${year}-${String(month).padStart(2, "0")}`,
      label: `${year}年${month}月`,
      sort: year * 12 + month,
    };
  }

  if (isEmptyValue(value)) {
    return null;
  }

  const text = String(value).trim();
  const internalKeyMatch =
    text.match(/^M(\d{1,2})__(actual|target|budget|forecast|plan)$/i) ??
    text.match(/^(\d{4})-(\d{1,2})__(actual|target|budget|forecast|plan)$/i);
  if (internalKeyMatch) {
    const isYearlessKey = internalKeyMatch[0].toUpperCase().startsWith("M");
    const year = isYearlessKey ? null : Number(internalKeyMatch[1]);
    const month = Number(isYearlessKey ? internalKeyMatch[1] : internalKeyMatch[2]);
    const qualifierKey = isYearlessKey ? internalKeyMatch[2] : internalKeyMatch[3];
    const qualifier = PERIOD_QUALIFIERS.find((item) => item.key.toLowerCase() === qualifierKey.toLowerCase());

    if (!qualifier) {
      return null;
    }

    return buildPeriod(year, month, text, qualifier.aliases[0]);
  }

  const chineseYearMonthMatch = text.match(/^(\d{4})年\s*([一二三四五六七八九十]{1,3})月$/);
  if (chineseYearMonthMatch) {
    const year = Number(chineseYearMonthMatch[1]);
    const month = CHINESE_MONTH_NUMBERS[chineseYearMonthMatch[2]];

    return buildPeriod(year, month, text);
  }

  const match =
    text.match(/^(\d{4})-(\d{1,2})$/) ??
    text.match(/^(\d{4})[/.](\d{1,2})$/) ??
    text.match(/^(\d{4})-(\d{1,2})-\d{1,2}$/) ??
    text.match(/^(\d{4})\s*[mM]\s*(\d{1,2})$/) ??
    text.match(/^(\d{4})年?\s*-?\s*(\d{1,2})月$/) ??
    text.match(/^(\d{4})年\s*(\d{1,2})月$/) ??
    text.match(/^(\d{4})(\d{2})$/);

  if (!match) {
    const qualifiedYearMonthMatch =
      text.match(/^(\d{4})年\s*([一二三四五六七八九十]{1,3})月\s*(.+)$/) ??
      text.match(/^(\d{4})年\s*(\d{1,2})月\s*(.+)$/) ??
      text.match(/^(\d{4})[-/.](\d{1,2})\s*[-_/]?\s*(.+)$/) ??
      text.match(/^(\d{4})\s*[mM]\s*(\d{1,2})\s*[-_/]?\s*(.+)$/);
    if (qualifiedYearMonthMatch) {
      const year = Number(qualifiedYearMonthMatch[1]);
      const month = CHINESE_MONTH_NUMBERS[qualifiedYearMonthMatch[2]] ?? Number(qualifiedYearMonthMatch[2]);
      return buildPeriod(year, month, text, qualifiedYearMonthMatch[3]);
    }

    const chineseMonthPrefix = getChineseMonthPrefix(text);
    if (chineseMonthPrefix) {
      return buildPeriod(null, chineseMonthPrefix.month, text, chineseMonthPrefix.suffix);
    }

    const qualifiedYearlessMatch =
      text.match(/^(\d{1,2})\s*月\s*(.+)$/) ??
      text.match(/^[mM]\s*(\d{1,2})(?:\s+|[-_/]+)(.+)$/);
    if (qualifiedYearlessMatch) {
      return buildPeriod(null, Number(qualifiedYearlessMatch[1]), text, qualifiedYearlessMatch[2]);
    }

    const yearlessMatch = text.match(/^(\d{1,2})\s*月$/) ?? text.match(/^[mM]\s*(\d{1,2})$/);
    if (!yearlessMatch) {
      return null;
    }

    const month = Number(yearlessMatch[1]);
    return buildPeriod(null, month, text);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  return buildPeriod(year, month, text);
}

export function toFinanceNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  let text = value.trim();

  if (!text || /^[-—–]$/.test(text)) {
    return null;
  }

  let isNegativeByParentheses = false;
  if (/^\(.+\)$/.test(text)) {
    isNegativeByParentheses = true;
    text = text.slice(1, -1).trim();
  }

  const isPercent = /[%％]/.test(text);
  const multiplier = UNIT_SCALE_PATTERNS.find((unit) => unit.pattern.test(text))?.multiplier ?? 1;
  const cleaned = text
    .replace(/[,\uFF0C\s]/g, "")
    .replace(/[¥￥$€£]/g, "")
    .replace(/人民币|百万元|千万元|万元|亿元|千元|美元|欧元|港币|日元|亿|万|元|台|辆|件|个|套|pcs?|units?|rmb|cny|usd|eur|hkd|jpy/gi, "")
    .replace(/[%％]/g, "");

  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(cleaned)) {
    return null;
  }

  let numericValue = Number(cleaned);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  if (isNegativeByParentheses) {
    numericValue = -Math.abs(numericValue);
  }

  const scaledValue = numericValue * multiplier;

  return isPercent ? scaledValue / 100 : scaledValue;
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
