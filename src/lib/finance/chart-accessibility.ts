export type PlotlyAccessibleTrace = Record<string, unknown>;

export type PlotlyAccessibleDataOptions = {
  title?: string;
  maxRows?: number;
};

export type PlotlyAccessibleData = {
  title: string;
  summary: string;
  columns: string[];
  rows: Array<Array<string | number>>;
  totalRowCount: number;
  truncated: boolean;
};

type NumericPoint = {
  series: string;
  label: string;
  value: number;
};

const DEFAULT_MAX_ROWS = 200;

function textValue(value: unknown, fallback = "—") {
  const text = String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text || fallback;
}

function valueArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function finiteValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatSummaryValue(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 4,
  }).format(value);
}

function traceName(trace: PlotlyAccessibleTrace, index: number) {
  return textValue(trace.name, `系列 ${index + 1}`);
}

export function buildPlotlyAccessibleData(
  traces: PlotlyAccessibleTrace[],
  options: PlotlyAccessibleDataOptions = {},
): PlotlyAccessibleData {
  const title = textValue(options.title, "图表");
  const maxRows = Number.isFinite(options.maxRows) && Number(options.maxRows) > 0
    ? Math.floor(Number(options.maxRows))
    : DEFAULT_MAX_ROWS;
  const onlyHeatmaps = traces.length > 0 && traces.every((trace) => trace.type === "heatmap");
  const columns = onlyHeatmaps
    ? ["系列", "行", "列", "数值"]
    : ["系列", "项目", "数值"];
  const rows: Array<Array<string | number>> = [];
  const points: NumericPoint[] = [];

  traces.forEach((trace, traceIndex) => {
    const series = traceName(trace, traceIndex);
    if (trace.type === "heatmap") {
      const xValues = valueArray(trace.x);
      const yValues = valueArray(trace.y);
      const zValues = valueArray(trace.z);
      const customRows = valueArray(trace.customdata);
      zValues.forEach((rawRow, rowIndex) => {
        valueArray(rawRow).forEach((rawValue, columnIndex) => {
          const value = finiteValue(rawValue);
          if (value === null) return;
          const customCell = valueArray(customRows[rowIndex])[columnIndex];
          const customCellValues = valueArray(customCell);
          const rowLabel = textValue(
            customCellValues.length >= 2 ? customCellValues[1] : yValues[rowIndex],
            `第 ${rowIndex + 1} 行`,
          );
          const customColumnLabel = customCellValues.length >= 2 ? customCellValues[0] : customCell;
          const columnLabel = textValue(
            typeof customColumnLabel === "string" ? customColumnLabel : xValues[columnIndex],
            `第 ${columnIndex + 1} 列`,
          );
          rows.push([series, rowLabel, columnLabel, value]);
          points.push({ series, label: `${rowLabel} · ${columnLabel}`, value });
        });
      });
      return;
    }

    const horizontal = trace.orientation === "h";
    const rawValues = valueArray(horizontal ? trace.x : trace.y);
    const axisLabels = valueArray(horizontal ? trace.y : trace.x);
    const textLabels = valueArray(trace.text);
    const customLabels = valueArray(trace.customdata);
    const pointTextIsCategory = trace.type === "scatter" && String(trace.mode ?? "").includes("markers");
    rawValues.forEach((rawValue, pointIndex) => {
      const value = finiteValue(rawValue);
      if (value === null) return;
      const textLabel = textLabels[pointIndex];
      const customLabel = customLabels[pointIndex];
      const label = textValue(
        typeof customLabel === "string"
          ? customLabel
          : pointTextIsCategory && typeof textLabel === "string" && !textLabel.includes("<")
          ? textLabel
          : axisLabels[pointIndex],
        `数据点 ${pointIndex + 1}`,
      );
      rows.push([series, label, value]);
      points.push({ series, label, value });
    });
  });

  let summary = `${title}当前没有可展示的数据。`;
  if (points.length > 0) {
    const highest = points.reduce((best, point) => point.value > best.value ? point : best);
    const lowest = points.reduce((best, point) => point.value < best.value ? point : best);
    summary = `${title}共 ${points.length} 个数据点；最高为${highest.series} · ${highest.label} ${formatSummaryValue(highest.value)}`;
    if (lowest !== highest) {
      summary += `，最低为${lowest.series} · ${lowest.label} ${formatSummaryValue(lowest.value)}`;
    }
    summary += "。";
  }

  return {
    title,
    summary,
    columns,
    rows: rows.slice(0, maxRows),
    totalRowCount: rows.length,
    truncated: rows.length > maxRows,
  };
}

function appendTextCell(row: HTMLTableRowElement, tagName: "th" | "td", value: string | number) {
  const cell = document.createElement(tagName);
  cell.textContent = typeof value === "number" ? formatSummaryValue(value) : value;
  row.appendChild(cell);
}

export function renderPlotlyAccessibleData(
  chartId: string,
  traces: PlotlyAccessibleTrace[],
  options: PlotlyAccessibleDataOptions = {},
) {
  const chart = document.getElementById(chartId);
  if (!chart) return null;

  const inferredTitle = chart.closest("article")?.querySelector("h2")?.textContent ?? "图表";
  const model = buildPlotlyAccessibleData(traces, {
    ...options,
    title: options.title ?? inferredTitle,
  });
  const alternativeId = `${chartId}-accessibility`;
  const summaryId = `${chartId}-summary`;
  let alternative = document.getElementById(alternativeId);
  if (!alternative) {
    alternative = document.createElement("div");
    alternative.id = alternativeId;
    alternative.className = "finance-chart-accessibility";
    alternative.dataset.financeChartAlternativeFor = chartId;
    chart.insertAdjacentElement("afterend", alternative);
  }

  const summary = document.createElement("p");
  summary.id = summaryId;
  summary.className = "finance-chart-accessibility-summary";
  summary.textContent = model.summary;

  const details = document.createElement("details");
  details.className = "finance-chart-accessibility-details";
  const detailsSummary = document.createElement("summary");
  detailsSummary.textContent = `查看${model.title}数据表`;
  details.appendChild(detailsSummary);

  const tableWrap = document.createElement("div");
  tableWrap.className = "finance-chart-accessibility-table-wrap";
  const table = document.createElement("table");
  const caption = document.createElement("caption");
  caption.textContent = model.truncated
    ? `${model.title}数据表，显示前 ${model.rows.length} 行，共 ${model.totalRowCount} 行`
    : `${model.title}数据表，共 ${model.totalRowCount} 行`;
  table.appendChild(caption);
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  model.columns.forEach((column) => appendTextCell(headerRow, "th", column));
  thead.appendChild(headerRow);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  model.rows.forEach((values) => {
    const row = document.createElement("tr");
    values.forEach((value) => appendTextCell(row, "td", value));
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  details.appendChild(tableWrap);

  alternative.replaceChildren(summary, details);
  chart.setAttribute("aria-describedby", summaryId);
  chart.setAttribute("aria-label", model.title);
  return model;
}
