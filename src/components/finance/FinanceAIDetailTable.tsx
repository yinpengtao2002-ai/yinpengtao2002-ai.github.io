"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ListFilter } from "lucide-react";
import type { FinanceChartSpec } from "@/lib/finance-ai/types";

type DetailTableData = {
  columns: string[];
  rows: string[][];
};

type FilterMenuState = {
  columnIndex: number;
  searchText: string;
  selectedValues: string[];
  left: number;
  top: number;
  width: number;
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

function buildColumnOptions(rows: string[][], columnIndex: number) {
  const seen = new Set<string>();
  const values: string[] = [];

  rows.forEach((row) => {
    const value = row[columnIndex] ?? "";

    if (seen.has(value)) {
      return;
    }

    seen.add(value);
    values.push(value);
  });

  return values.sort((left, right) => left.localeCompare(right, "zh-CN", { numeric: true }));
}

function displayFilterValue(value: string) {
  return value || "空白";
}

function getFilterMenuPosition(trigger: HTMLButtonElement) {
  const rect = trigger.getBoundingClientRect();
  const width = Math.min(260, Math.max(220, window.innerWidth - 24));
  const left = Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - width - 12));
  const estimatedHeight = 324;
  const belowTop = rect.bottom + 8;
  const hasRoomBelow = belowTop + estimatedHeight <= window.innerHeight;
  const top = hasRoomBelow
    ? belowTop
    : Math.max(12, rect.top - estimatedHeight - 8);

  return { left, top, width };
}

function getTableVariantLabel(variant: FinanceChartSpec["tableVariant"]) {
  if (variant === "rank") {
    return "排名表";
  }

  if (variant === "comparison") {
    return "对比表";
  }

  if (variant === "budget_actual") {
    return "预算实际表";
  }

  if (variant === "attribution_detail") {
    return "归因明细";
  }

  if (variant === "exception_list") {
    return "异常清单";
  }

  return "明细表";
}

export default function FinanceAIDetailTable({ spec }: { spec: FinanceChartSpec }) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { columns, rows } = useMemo(() => extractDetailTableData(spec), [spec]);
  const [appliedFilters, setAppliedFilters] = useState<Record<number, string[]>>({});
  const [filterMenu, setFilterMenu] = useState<FilterMenuState | null>(null);
  const numericColumns = useMemo(() => (
    columns.map((_, columnIndex) => isNumericTableColumn(rows, columnIndex))
  ), [columns, rows]);
  const columnOptions = useMemo(() => (
    columns.map((_, columnIndex) => buildColumnOptions(rows, columnIndex))
  ), [columns, rows]);
  const filteredRows = useMemo(() => (
    rows.filter((row) => (
      Object.entries(appliedFilters).every(([columnIndexText, selectedValues]) => {
        const columnIndex = Number(columnIndexText);

        if (!Number.isFinite(columnIndex) || !Array.isArray(selectedValues)) {
          return true;
        }

        return selectedValues.includes(row[columnIndex] ?? "");
      })
    ))
  ), [appliedFilters, rows]);
  const activeFilterCount = Object.keys(appliedFilters).length;
  const menuOptions = filterMenu ? columnOptions[filterMenu.columnIndex] ?? [] : [];
  const searchedMenuOptions = filterMenu
    ? menuOptions.filter((value) => displayFilterValue(value).toLowerCase().includes(filterMenu.searchText.trim().toLowerCase()))
    : [];
  const menuSelectedSet = new Set(filterMenu?.selectedValues ?? []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (!panelRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setFilterMenu(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setFilterMenu(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function openFilterMenu(columnIndex: number, trigger: HTMLButtonElement) {
    const options = columnOptions[columnIndex] ?? [];
    const appliedValues = appliedFilters[columnIndex];
    const position = getFilterMenuPosition(trigger);

    setFilterMenu((current) => (
      current?.columnIndex === columnIndex
        ? null
        : {
            columnIndex,
            searchText: "",
            selectedValues: appliedValues ? [...appliedValues] : [...options],
            ...position,
          }
    ));
  }

  function updateMenuSelection(nextValues: string[]) {
    setFilterMenu((current) => current ? { ...current, selectedValues: nextValues } : current);
  }

  function toggleMenuValue(value: string) {
    if (!filterMenu) {
      return;
    }

    const selected = new Set(filterMenu.selectedValues);
    if (selected.has(value)) {
      selected.delete(value);
    } else {
      selected.add(value);
    }
    updateMenuSelection(Array.from(selected));
  }

  function applyFilterMenu() {
    if (!filterMenu) {
      return;
    }

    const options = columnOptions[filterMenu.columnIndex] ?? [];
    const selectedValues = filterMenu.selectedValues;
    setAppliedFilters((current) => {
      const next = { ...current };

      if (selectedValues.length === options.length) {
        delete next[filterMenu.columnIndex];
      } else {
        next[filterMenu.columnIndex] = selectedValues;
      }

      return next;
    });
    setFilterMenu(null);
  }

  if (!columns.length) {
    return <div className="finance-ai-detail-table-empty">暂无可展示明细。</div>;
  }

  return (
    <div className="finance-ai-detail-table-panel" ref={panelRef}>
      <div className="finance-ai-detail-table-count">
        <span className="finance-ai-detail-table-status">
          <span className="finance-ai-detail-table-kind">{getTableVariantLabel(spec.tableVariant)}</span>
          <span>
            显示 {filteredRows.length.toLocaleString("zh-CN")} / {rows.length.toLocaleString("zh-CN")} 行
            {activeFilterCount ? ` · ${activeFilterCount} 个筛选` : ""}
          </span>
        </span>
        {activeFilterCount ? (
          <button type="button" onClick={() => setAppliedFilters({})}>
            重置筛选
          </button>
        ) : null}
      </div>
      <div className="finance-ai-detail-table-wrap">
        <table className="finance-ai-detail-table">
          <thead>
            <tr>
              {columns.map((column, columnIndex) => (
                <th className={numericColumns[columnIndex] ? "is-numeric" : undefined} key={`${column}-${columnIndex}`}>
                  <div className="finance-ai-detail-th-inner">
                    <span>{column}</span>
                    <button
                      type="button"
                      className={`finance-ai-detail-filter-trigger ${appliedFilters[columnIndex] ? "is-active" : ""}`}
                      aria-label={`筛选${column}`}
                      aria-expanded={filterMenu?.columnIndex === columnIndex}
                      onClick={(event) => openFilterMenu(columnIndex, event.currentTarget)}
                    >
                      <ListFilter aria-hidden="true" />
                      <ChevronDown className="finance-ai-detail-filter-caret" aria-hidden="true" />
                    </button>
                  </div>
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
      {filterMenu && typeof document !== "undefined" ? createPortal((
        <div
          className="finance-ai-detail-filter-menu"
          ref={menuRef}
          style={{ left: filterMenu.left, top: filterMenu.top, width: filterMenu.width }}
        >
          <p className="finance-ai-detail-filter-menu-title">{columns[filterMenu.columnIndex]}筛选</p>
          <input
            className="finance-ai-detail-filter-search"
            value={filterMenu.searchText}
            onChange={(event) => {
              const searchText = event.target.value;
              setFilterMenu((current) => current ? { ...current, searchText } : current);
            }}
            placeholder="搜索值"
            aria-label={`搜索${columns[filterMenu.columnIndex]}筛选值`}
          />
          <div className="finance-ai-detail-filter-actions">
            <button type="button" onClick={() => updateMenuSelection(menuOptions)}>
              全选
            </button>
            <button type="button" onClick={() => updateMenuSelection([])}>
              清空
            </button>
          </div>
          <div className="finance-ai-detail-filter-list">
            {searchedMenuOptions.length ? searchedMenuOptions.map((value) => {
              const checked = menuSelectedSet.has(value);

              return (
                <label className="finance-ai-detail-filter-option" key={`${columns[filterMenu.columnIndex]}-${value || "__blank"}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMenuValue(value)}
                  />
                  <span className="finance-ai-detail-filter-checkmark" aria-hidden="true">
                    {checked ? "✓" : ""}
                  </span>
                  <span>{displayFilterValue(value)}</span>
                </label>
              );
            }) : (
              <div className="finance-ai-detail-filter-empty">没有匹配项</div>
            )}
          </div>
          <div className="finance-ai-detail-filter-footer">
            <span>{filterMenu.selectedValues.length}/{menuOptions.length} 项</span>
            <div>
              <button type="button" onClick={() => setFilterMenu(null)}>
                取消
              </button>
              <button type="button" className="primary" onClick={applyFilterMenu}>
                应用
              </button>
            </div>
          </div>
        </div>
      ), document.body) : null}
    </div>
  );
}
