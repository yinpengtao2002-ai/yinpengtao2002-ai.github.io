import { normalizePeriodValue, toFinanceNumber } from "./schema.ts";
import type { FinanceRawWorkbook, FinanceRawWorkbookSheet, FinanceRow } from "./types.ts";

const MAX_HEADER_SCAN_ROWS = 40;
const MAX_EVIDENCE_ROWS = 30;
export const FINANCE_SCENARIO_COLUMN = "数据口径";

const MONTH_ALIASES = [
  "月份",
  "月度",
  "年月",
  "期间",
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
  "salesvolume",
  "volume",
  "qty",
  "quantity",
  "units",
];

const FINANCE_METRIC_PATTERNS = [
  "净收入",
  "收入",
  "成本",
  "边际",
  "毛利",
  "利润",
  "revenue",
  "income",
  "cost",
  "margin",
  "profit",
  "amount",
  "total",
];

const DIMENSION_PATTERNS = [
  "大区",
  "区域",
  "国家",
  "市场",
  "车型",
  "品牌",
  "渠道",
  "客户",
  "产品",
  "dim",
  "region",
  "country",
  "market",
  "model",
  "brand",
  "channel",
  "customer",
  "product",
];
const SCENARIO_SHEET_ALIASES = [
  { label: "实际", aliases: ["实际", "实际数", "实际数据", "actual", "actuals", "act"] },
  { label: "预算", aliases: ["预算", "预算数", "预算数据", "budget", "bud"] },
  { label: "目标", aliases: ["目标", "目标数", "目标数据", "target", "goal"] },
  { label: "预测", aliases: ["预测", "预估", "滚动预测", "forecast", "fcst", "estimate"] },
  { label: "计划", aliases: ["计划", "计划数", "计划数据", "plan"] },
];
const NON_DATA_SHEET_PATTERNS = [
  "填表说明",
  "填表规则",
  "说明",
  "规则",
  "字段说明",
  "维度说明",
  "科目字典",
  "readme",
  "guide",
  "instruction",
  "instructions",
  "dictionary",
];

function normalizeHeaderName(value: string): string {
  return value.trim().toLowerCase().replace(/^\uFEFF/, "").replace(/[\s_\-./()（）]/g, "");
}

function isInstructionSheetName(sheetName: string): boolean {
  const normalizedName = normalizeHeaderName(sheetName);
  return NON_DATA_SHEET_PATTERNS.some((pattern) => normalizedName.includes(normalizeHeaderName(pattern)));
}

export function getFinanceScenarioFromSheetName(sheetName: string): string {
  const normalizedName = normalizeHeaderName(sheetName);

  for (const scenario of SCENARIO_SHEET_ALIASES) {
    if (scenario.aliases.some((alias) => {
      const normalizedAlias = normalizeHeaderName(alias);
      return normalizedName === normalizedAlias || normalizedName.startsWith(normalizedAlias);
    })) {
      return scenario.label;
    }
  }

  return "";
}

function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).replace(/^\uFEFF/, "").trim();
}

function isEmptyCell(value: unknown): boolean {
  return stringifyCell(value) === "";
}

function trimTrailingEmptyCells(row: unknown[]): unknown[] {
  const cells = [...row];

  while (cells.length > 0 && isEmptyCell(cells[cells.length - 1])) {
    cells.pop();
  }

  return cells;
}

function toRowArray(row: unknown): unknown[] {
  return Array.isArray(row) ? trimTrailingEmptyCells(row) : [];
}

function countNonEmptyCells(row: unknown[]): number {
  return row.filter((cell) => !isEmptyCell(cell)).length;
}

function includesAlias(header: string, aliases: string[]): boolean {
  const normalizedHeader = normalizeHeaderName(header);
  return aliases.some((alias) => {
    const normalizedAlias = normalizeHeaderName(alias);
    return normalizedHeader === normalizedAlias || (
      normalizedAlias.length >= 2 &&
      normalizedHeader.length >= 2 &&
      (normalizedHeader.includes(normalizedAlias) || normalizedAlias.includes(normalizedHeader))
    );
  });
}

function findHeaderIndex(headers: string[], aliases: string[]): number {
  return headers.findIndex((header) => includesAlias(header, aliases));
}

function countPatternHeaders(headers: string[], patterns: string[]): number {
  return headers.filter((header) => includesAlias(header, patterns)).length;
}

function countDataLikeCells(row: unknown[]): number {
  return row.filter((cell) => (
    normalizePeriodValue(cell) !== null ||
    toFinanceNumber(cell) !== null
  )).length;
}

function columnEvidenceRatio(rows: unknown[][], columnIndex: number, tester: (value: unknown) => boolean): number {
  if (columnIndex < 0) {
    return 0;
  }

  const values = rows
    .map((row) => row[columnIndex])
    .filter((value) => !isEmptyCell(value));

  if (values.length === 0) {
    return 0;
  }

  const matchingValues = values.filter(tester).length;
  return matchingValues / values.length;
}

function makeUniqueHeaders(headerRow: unknown[]): string[] {
  const seen = new Map<string, number>();

  return headerRow.map((cell, index) => {
    const rawHeader = stringifyCell(cell) || `列${index + 1}`;
    const seenCount = seen.get(rawHeader) ?? 0;
    seen.set(rawHeader, seenCount + 1);
    return seenCount === 0 ? rawHeader : `${rawHeader}_${seenCount + 1}`;
  });
}

function scoreHeaderCandidate(rawRows: unknown[][], rowIndex: number): number {
  const row = rawRows[rowIndex];
  const headers = makeUniqueHeaders(row);
  const nonEmptyCount = countNonEmptyCells(row);

  if (nonEmptyCount < 2) {
    return -Infinity;
  }

  const monthIndex = findHeaderIndex(headers, MONTH_ALIASES);
  const salesIndex = findHeaderIndex(headers, SALES_ALIASES);
  const metricHeaderCount = countPatternHeaders(headers, FINANCE_METRIC_PATTERNS);
  const dimensionHeaderCount = countPatternHeaders(headers, DIMENSION_PATTERNS);
  const evidenceRows = rawRows
    .slice(rowIndex + 1, rowIndex + 1 + MAX_EVIDENCE_ROWS)
    .filter((candidateRow) => countNonEmptyCells(candidateRow) > 0);

  let score = 0;
  score += nonEmptyCount * 0.2;
  score += Math.min(evidenceRows.length, 8) * 0.15;

  if (monthIndex >= 0) {
    score += 8;
    score += columnEvidenceRatio(evidenceRows, monthIndex, (value) => normalizePeriodValue(value) !== null) * 5;
  }

  if (salesIndex >= 0) {
    score += 8;
    score += columnEvidenceRatio(evidenceRows, salesIndex, (value) => toFinanceNumber(value) !== null) * 5;
  }

  score += Math.min(metricHeaderCount, 4) * 3;
  score += Math.min(dimensionHeaderCount, 5) * 1.2;

  if (monthIndex < 0 && salesIndex < 0) {
    score -= countDataLikeCells(row) * 2;
  }

  return score;
}

function findHeaderRowIndex(rawRows: unknown[][]): number {
  let bestIndex = -1;
  let bestScore = -Infinity;
  const scanLimit = Math.min(rawRows.length, MAX_HEADER_SCAN_ROWS);

  for (let rowIndex = 0; rowIndex < scanLimit; rowIndex += 1) {
    const score = scoreHeaderCandidate(rawRows, rowIndex);

    if (score > bestScore) {
      bestIndex = rowIndex;
      bestScore = score;
    }
  }

  if (bestIndex >= 0 && bestScore > 0) {
    return bestIndex;
  }

  return rawRows.findIndex((row) => countNonEmptyCells(row) >= 2);
}

function buildDataRows(rawRows: unknown[][], headerRowIndex: number, headers: string[]): FinanceRow[] {
  return rawRows.slice(headerRowIndex + 1).flatMap((row) => {
    const record: FinanceRow = {};
    let hasValue = false;

    headers.forEach((header, index) => {
      const value = row[index] ?? "";
      record[header] = value;

      if (!isEmptyCell(value)) {
        hasValue = true;
      }
    });

    return hasValue ? [record] : [];
  });
}

export function buildFinanceRawWorkbookSheetFromRows(name: string, rows: unknown[]): FinanceRawWorkbookSheet {
  const rawRows = rows.map(toRowArray).filter((row) => row.length > 0);
  const headerRowIndex = findHeaderRowIndex(rawRows);

  if (headerRowIndex < 0) {
    return {
      name,
      headers: [],
      rows: [],
      rowCount: 0,
    };
  }

  const headers = makeUniqueHeaders(rawRows[headerRowIndex]);
  const dataRows = buildDataRows(rawRows, headerRowIndex, headers);

  return {
    name,
    headers,
    rows: dataRows,
    rowCount: dataRows.length,
  };
}

function withScenarioColumn(sheet: FinanceRawWorkbookSheet, scenario: string): FinanceRawWorkbookSheet {
  const headers = [
    FINANCE_SCENARIO_COLUMN,
    ...sheet.headers.filter((header) => header !== FINANCE_SCENARIO_COLUMN),
  ];
  const rows = sheet.rows.map((row) => {
    const nextRow = {
      [FINANCE_SCENARIO_COLUMN]: scenario,
      ...row,
    };
    nextRow[FINANCE_SCENARIO_COLUMN] = scenario;
    return nextRow;
  });

  return {
    ...sheet,
    headers,
    rows,
    rowCount: rows.length,
  };
}

export function normalizeFinanceWorkbookSheets(sheets: FinanceRawWorkbookSheet[]): FinanceRawWorkbookSheet[] {
  return sheets
    .filter((sheet) => sheet.rowCount > 0 && !isInstructionSheetName(sheet.name))
    .map((sheet) => {
      const scenario = getFinanceScenarioFromSheetName(sheet.name);
      return scenario ? withScenarioColumn(sheet, scenario) : sheet;
    });
}

export function buildFinanceAnalysisRowsFromWorkbook(workbook: FinanceRawWorkbook): FinanceRow[] {
  const sheets = normalizeFinanceWorkbookSheets(workbook.sheets);
  const scenarioSheets = sheets.filter((sheet) => sheet.headers.includes(FINANCE_SCENARIO_COLUMN));

  if (scenarioSheets.length > 0) {
    return scenarioSheets.flatMap((sheet) => sheet.rows);
  }

  return sheets[0]?.rows ?? [];
}
