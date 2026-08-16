type WorksheetCell = {
  s?: Record<string, unknown>;
  z?: string;
};

type Worksheet = Record<string, unknown> & {
  "!autofilter"?: { ref: string };
  "!cols"?: Array<{ wch?: number }>;
};

type SheetJsLike = {
  utils: {
    aoa_to_sheet: (rows: unknown[][]) => Worksheet;
    encode_cell: (cell: { r: number; c: number }) => string;
    encode_range: (range: { s: { r: number; c: number }; e: { r: number; c: number } }) => string;
  };
};

type TemplateRow = Record<string, string | number>;

const HEADER_STYLE = {
  font: { bold: true, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "5C8FBA" } },
  alignment: { vertical: "center", horizontal: "center", wrapText: true },
};

const BODY_TEXT_STYLE = {
  alignment: { vertical: "top", wrapText: true },
};

function boundedWidth(value: number) {
  return Math.max(12, Math.min(28, value));
}

function setCellStyle(worksheet: Worksheet, ref: string, style: Record<string, unknown>) {
  const cell = worksheet[ref] as WorksheetCell | undefined;
  if (cell) cell.s = style;
}

function setAutofilter(
  XLSX: SheetJsLike,
  worksheet: Worksheet,
  rowCount: number,
  columnCount: number,
) {
  if (!columnCount) return;
  worksheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: Math.max(0, rowCount - 1), c: columnCount - 1 },
    }),
  };
}

export function createTemplateDataSheet(
  XLSX: SheetJsLike,
  rows: TemplateRow[],
  headers: string[],
): Worksheet {
  const values = [
    headers,
    ...rows.map((row) => headers.map((header) => row[header] ?? "")),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(values);
  worksheet["!cols"] = headers.map((header) => {
    const contentWidth = rows.reduce((width, row) => {
      return Math.max(width, String(row[header] ?? "").length + 2);
    }, String(header).length + 4);
    return { wch: boundedWidth(contentWidth) };
  });
  setAutofilter(XLSX, worksheet, values.length, headers.length);

  headers.forEach((_, columnIndex) => {
    setCellStyle(worksheet, XLSX.utils.encode_cell({ r: 0, c: columnIndex }), HEADER_STYLE);
  });
  rows.forEach((row, rowIndex) => {
    headers.forEach((header, columnIndex) => {
      const ref = XLSX.utils.encode_cell({ r: rowIndex + 1, c: columnIndex });
      const cell = worksheet[ref] as WorksheetCell | undefined;
      if (!cell) return;
      if (typeof row[header] === "number") cell.z = "#,##0.000";
    });
  });
  return worksheet;
}

export function createTemplateInfoSheet(
  XLSX: SheetJsLike,
  rows: Array<Array<string | number>>,
  options: { widths?: number[] } = {},
): Worksheet {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const columnCount = rows.reduce((count, row) => Math.max(count, row.length), 0);
  worksheet["!cols"] = Array.from({ length: columnCount }, (_, columnIndex) => {
    const requested = options.widths?.[columnIndex];
    if (Number.isFinite(requested)) return { wch: Number(requested) };
    const width = rows.reduce((current, row) => {
      return Math.max(current, String(row[columnIndex] ?? "").length + 2);
    }, 12);
    return { wch: Math.max(12, Math.min(72, width)) };
  });
  setAutofilter(XLSX, worksheet, rows.length, columnCount);

  rows.forEach((row, rowIndex) => {
    row.forEach((_, columnIndex) => {
      setCellStyle(
        worksheet,
        XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex }),
        rowIndex === 0 ? HEADER_STYLE : BODY_TEXT_STYLE,
      );
    });
  });
  return worksheet;
}
