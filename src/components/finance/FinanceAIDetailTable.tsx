"use client";

import { useMemo, useState } from "react";
import type { FinanceChartSpec } from "@/lib/finance-ai/types";

type DetailTableData = {
  columns: string[];
  rows: string[][];
};

function stringifyTableCell(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function arrayFromUnknown(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function extractDetailTableData(spec: FinanceChartSpec): DetailTableData {
  const table = spec.data[0] ?? {};
  const headerRecord = typeof table.header === "object" && table.header !== null
    ? table.header as Record<string, unknown>
    : {};
  const cellsRecord = typeof table.cells === "object" && table.cells !== null
    ? table.cells as Record<string, unknown>
    : {};
  const columns = arrayFromUnknown(headerRecord.values).map(stringifyTableCell);
  const columnValues = arrayFromUnknown(cellsRecord.values).map(arrayFromUnknown);
  const rowCount = columnValues.reduce((max, column) => Math.max(max, column.length), 0);
  const rows = Array.from({ length: rowCount }, (_, rowIndex) => (
    columns.map((_, columnIndex) => stringifyTableCell(columnValues[columnIndex]?.[rowIndex]))
  ));

  return { columns, rows };
}

function isNumericTableColumn(rows: string[][], columnIndex: number) {
  const values = rows
    .map((row) => row[columnIndex]?.trim() ?? "")
    .filter(Boolean);

  if (values.length === 0) {
    return false;
  }

  return values.every((value) => /^[-+]?[\d,.]+(?:\.\d+)?%?(?:万亿|亿|万)?$/.test(value));
}

export default function FinanceAIDetailTable({ spec }: { spec: FinanceChartSpec }) {
  const { columns, rows } = useMemo(() => extractDetailTableData(spec), [spec]);
  const [filterValues, setFilterValues] = useState<Record<number, string>>({});
  const numericColumns = useMemo(() => (
    columns.map((_, columnIndex) => isNumericTableColumn(rows, columnIndex))
  ), [columns, rows]);
  const filteredRows = useMemo(() => (
    rows.filter((row) => (
      columns.every((_, columnIndex) => {
        const filterValue = filterValues[columnIndex]?.trim().toLowerCase();

        if (!filterValue) {
          return true;
        }

        return (row[columnIndex] ?? "").toLowerCase().includes(filterValue);
      })
    ))
  ), [columns, filterValues, rows]);

  if (!columns.length) {
    return <div className="finance-ai-detail-table-empty">暂无可展示明细。</div>;
  }

  return (
    <div className="finance-ai-detail-table-panel">
      <div className="finance-ai-detail-table-count">
        显示 {filteredRows.length.toLocaleString("zh-CN")} / {rows.length.toLocaleString("zh-CN")} 行
      </div>
      <div className="finance-ai-detail-table-wrap">
        <table className="finance-ai-detail-table">
          <thead>
            <tr>
              {columns.map((column, columnIndex) => (
                <th className={numericColumns[columnIndex] ? "is-numeric" : undefined} key={`${column}-${columnIndex}`}>
                  {column}
                </th>
              ))}
            </tr>
            <tr className="finance-ai-detail-table-filters">
              {columns.map((column, columnIndex) => (
                <th key={`${column}-${columnIndex}-filter`}>
                  <input
                    className="finance-ai-detail-table-filter"
                    value={filterValues[columnIndex] ?? ""}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setFilterValues((current) => ({
                        ...current,
                        [columnIndex]: nextValue,
                      }));
                    }}
                    placeholder="筛选"
                    aria-label={`筛选${column}`}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, rowIndex) => (
              <tr key={`${rowIndex}-${row.join("|")}`}>
                {columns.map((column, columnIndex) => (
                  <td className={numericColumns[columnIndex] ? "is-numeric" : undefined} key={`${column}-${columnIndex}`}>
                    {row[columnIndex] || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
