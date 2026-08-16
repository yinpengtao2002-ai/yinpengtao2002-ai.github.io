import test from "node:test";
import assert from "node:assert/strict";

const xlsxModule = await import("xlsx");
const XLSX = xlsxModule.default ?? xlsxModule;
const workbookTemplates = await import("../src/lib/finance/template-workbook.ts");

const {
  createTemplateDataSheet,
  createTemplateInfoSheet,
} = workbookTemplates;

test("template data sheets start on row 1 and carry scan-friendly layout metadata", () => {
  const headers = ["月份", "国家", "销量", "成本"];
  const rows = [
    { 月份: "2026-05", 国家: "德国", 销量: 12, 成本: -80 },
    { 月份: "2026-06", 国家: "德国", 销量: 14, 成本: -92 },
  ];

  const worksheet = createTemplateDataSheet(XLSX, rows, headers);
  const values = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

  assert.deepEqual(values, [
    headers,
    ["2026-05", "德国", 12, -80],
    ["2026-06", "德国", 14, -92],
  ]);
  assert.deepEqual(worksheet["!autofilter"], { ref: "A1:D3" });
  assert.equal(worksheet["!cols"].length, headers.length);
  assert.ok(worksheet["!cols"].every((column) => column.wch >= 12 && column.wch <= 28));
  assert.equal(worksheet.A1.s.font.bold, true);
  assert.equal(worksheet.A1.s.alignment.wrapText, true);
});

test("template information sheets keep table headers on row 1 with readable widths", () => {
  const rows = [
    ["字段", "说明"],
    ["月份", "YYYY-MM"],
    ["成本", "扣减项填写负数"],
  ];

  const worksheet = createTemplateInfoSheet(XLSX, rows, { widths: [18, 72] });
  const values = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

  assert.deepEqual(values, rows);
  assert.deepEqual(worksheet["!cols"], [{ wch: 18 }, { wch: 72 }]);
  assert.deepEqual(worksheet["!autofilter"], { ref: "A1:B3" });
  assert.equal(worksheet.A1.s.font.bold, true);
  assert.equal(worksheet.B2.s.alignment.wrapText, true);
});
