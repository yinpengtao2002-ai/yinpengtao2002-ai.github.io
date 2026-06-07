import type {
  FinanceAIDataRequest,
  FinanceAIDataSelection,
  FinanceRawWorkbook,
  FinanceRawWorkbookSheet,
  FinanceRow,
} from "./types.ts";

const DEFAULT_ROW_LIMIT = 10000;
const MAX_ROW_LIMIT = 20000;

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeForMatch(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function resolveColumns(sheet: FinanceRawWorkbookSheet, requestedColumns: string[]) {
  const normalizedHeaderMap = new Map(sheet.headers.map((header) => [normalizeForMatch(header), header]));
  const columns = requestedColumns
    .flatMap((column) => {
      const exact = normalizedHeaderMap.get(normalizeForMatch(column));
      return exact ? [exact] : [];
    })
    .filter((column, index, list) => list.indexOf(column) === index);

  return columns.length > 0 ? columns : sheet.headers;
}

function getRowLimit(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(Math.max(Math.floor(value), 1), MAX_ROW_LIMIT)
    : DEFAULT_ROW_LIMIT;
}

function matchesFilters(row: FinanceRow, filters: Record<string, string[]> | undefined) {
  const entries = Object.entries(filters ?? {}).filter(([, values]) => Array.isArray(values) && values.length > 0);

  return entries.every(([column, values]) => {
    const rowValue = normalizeForMatch(row[column]);
    const acceptedValues = new Set(values.map(normalizeForMatch));
    return acceptedValues.has(rowValue);
  });
}

function selectSheet(workbook: FinanceRawWorkbook, request: FinanceAIDataRequest) {
  if (request.sheetName) {
    const namedSheet = workbook.sheets.find((sheet) => sheet.name === request.sheetName);
    if (namedSheet) {
      return namedSheet;
    }
  }

  return workbook.sheets[0];
}

function projectRow(row: FinanceRow, headers: string[]): FinanceRow {
  return Object.fromEntries(headers.map((header) => [header, row[header] ?? ""]));
}

export function applyFinanceAIDataRequest(
  workbook: FinanceRawWorkbook,
  request: FinanceAIDataRequest,
): FinanceAIDataSelection {
  const sheet = selectSheet(workbook, request);

  if (!sheet) {
    return {
      request,
      sheetName: request.sheetName || "",
      headers: [],
      rows: [],
      rowCount: 0,
      totalMatchedRowCount: 0,
      omittedRowCount: 0,
    };
  }

  const headers = resolveColumns(sheet, request.columns);
  const rowLimit = getRowLimit(request.rowLimit);
  const matchedRows = sheet.rows
    .filter((row) => matchesFilters(row, request.filters))
    .map((row) => projectRow(row, headers));
  const rows = matchedRows.slice(0, rowLimit);

  return {
    request,
    sheetName: sheet.name,
    headers,
    rows,
    rowCount: rows.length,
    totalMatchedRowCount: matchedRows.length,
    omittedRowCount: Math.max(matchedRows.length - rows.length, 0),
  };
}
