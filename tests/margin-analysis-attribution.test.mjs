import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const marginAnalysis = await import("../public/tools/margin-analysis/app.js");
const marginAnalysisSource = await readFile(new URL("../public/tools/margin-analysis/app.js", import.meta.url), "utf8");
const marginAnalysisStyles = await readFile(new URL("../public/tools/margin-analysis/styles.css", import.meta.url), "utf8");
const marginAnalysisHtml = await readFile(new URL("../public/tools/margin-analysis/index.html", import.meta.url), "utf8");

const {
    calculateGlobalMetrics,
    calculateDimensionPVMEffects,
    prepareDisplayData,
    applyDrillDimensionFilters,
    resolveExcelFilterAppliedValues,
    resolveExcelFilterSearchValues,
    normalizeUploadedRows,
    applySelectedMetricToRows,
    generateDemoData,
    getTemplateRows,
    sheetRowsToObjects,
    TEMPLATE_HEADERS,
    TEMPLATE_HEADER_NOTE,
    buildTemplateStylesXml,
    buildTemplateWorksheetXml,
    buildXlsxTemplateEntries,
    createStoredZip,
    buildUnitMetricLabel,
    buildWaterfallTooltipHTML,
    formatPercentPoint,
    buildDetailExportRows,
    buildDetailClipboardText,
} = marginAnalysis.default;

const EPSILON = 1e-9;

function approx(actual, expected, message) {
    assert.ok(
        Math.abs(actual - expected) < EPSILON,
        `${message}: expected ${expected}, received ${actual}`
    );
}

function rowByDim(rows, value) {
    const row = rows.find((item) => item.Dim_A === value);
    assert.ok(row, `Expected row for Dim_A=${value}`);
    return row;
}

test("current-dimension attribution splits mix and rate for comparable items", () => {
    const data = [
        { Month: "base", Dim_A: "A", "Sales Volume": 100, "Total Margin": 1000 },
        { Month: "base", Dim_A: "B", "Sales Volume": 100, "Total Margin": 2000 },
        { Month: "curr", Dim_A: "A", "Sales Volume": 150, "Total Margin": 1800 },
        { Month: "curr", Dim_A: "B", "Sales Volume": 50, "Total Margin": 900 },
    ];

    const base = calculateGlobalMetrics(data, "base");
    const curr = calculateGlobalMetrics(data, "curr");
    const effects = calculateDimensionPVMEffects(
        data,
        "base",
        "curr",
        "Dim_A",
        curr.totalVol,
        base.totalVol,
        base.avgMargin
    );

    const a = rowByDim(effects, "A");
    approx(a.Mix_Effect, -1.25, "A mix effect");
    approx(a.Rate_Effect, 1.5, "A rate effect");
    approx(a.Total_Contribution, 0.25, "A total contribution");

    const b = rowByDim(effects, "B");
    approx(b.Mix_Effect, -1.25, "B mix effect");
    approx(b.Rate_Effect, -0.5, "B rate effect");
    approx(b.Total_Contribution, -1.75, "B total contribution");

    const totalContribution = effects.reduce((sum, row) => sum + row.Total_Contribution, 0);
    approx(totalContribution, curr.avgMargin - base.avgMargin, "sum ties to unit margin movement");
});

test("new and exited dimension items are treated as structure effect", () => {
    const data = [
        { Month: "base", Dim_A: "A", "Sales Volume": 100, "Total Margin": 1000 },
        { Month: "base", Dim_A: "B", "Sales Volume": 100, "Total Margin": 2000 },
        { Month: "curr", Dim_A: "A", "Sales Volume": 100, "Total Margin": 1000 },
        { Month: "curr", Dim_A: "C", "Sales Volume": 100, "Total Margin": 3000 },
    ];

    const base = calculateGlobalMetrics(data, "base");
    const curr = calculateGlobalMetrics(data, "curr");
    const effects = calculateDimensionPVMEffects(
        data,
        "base",
        "curr",
        "Dim_A",
        curr.totalVol,
        base.totalVol,
        base.avgMargin
    );

    const retained = rowByDim(effects, "A");
    approx(retained.Mix_Effect, 0, "retained item mix effect");
    approx(retained.Rate_Effect, 0, "retained item rate effect");

    const exited = rowByDim(effects, "B");
    approx(exited.Mix_Effect, -2.5, "exited item mix effect");
    approx(exited.Rate_Effect, 0, "exited item rate effect");

    const added = rowByDim(effects, "C");
    approx(added.Mix_Effect, 7.5, "new item mix effect");
    approx(added.Rate_Effect, 0, "new item rate effect");

    const totalContribution = effects.reduce((sum, row) => sum + row.Total_Contribution, 0);
    approx(totalContribution, curr.avgMargin - base.avgMargin, "sum ties to unit margin movement");
});

test("display total row preserves totals and weighted unit margin", () => {
    const data = [
        { Month: "base", Dim_A: "A", "Sales Volume": 100, "Total Margin": 1000 },
        { Month: "base", Dim_A: "B", "Sales Volume": 100, "Total Margin": 2000 },
        { Month: "curr", Dim_A: "A", "Sales Volume": 150, "Total Margin": 1800 },
        { Month: "curr", Dim_A: "B", "Sales Volume": 50, "Total Margin": 900 },
    ];

    const base = calculateGlobalMetrics(data, "base");
    const curr = calculateGlobalMetrics(data, "curr");
    const effects = calculateDimensionPVMEffects(
        data,
        "base",
        "curr",
        "Dim_A",
        curr.totalVol,
        base.totalVol,
        base.avgMargin
    );
    const displayData = prepareDisplayData(
        effects,
        "Dim_A",
        base.totalVol,
        curr.totalVol,
        base.totalMargin,
        curr.totalMargin
    );
    const totalRow = rowByDim(displayData, "总计");

    assert.equal(totalRow.Vol_Base, 200);
    assert.equal(totalRow.Vol_Curr, 200);
    approx(totalRow.Weight_Base_Pct, 100, "base weight total");
    approx(totalRow.Weight_Curr_Pct, 100, "current weight total");
    approx(totalRow.Margin_Unit_Base, 15, "base total unit margin");
    approx(totalRow.Margin_Unit_Curr, 13.5, "current total unit margin");
    approx(totalRow.Total_Contribution, -1.5, "display total contribution");
});

test("zero-volume nonzero-margin rows are included in the same pivot key unit metric", () => {
    const data = [
        { Month: "base", Dim_A: "Core", "Sales Volume": 100, "Total Margin": 1000 },
        { Month: "base", Dim_A: "Core", "Sales Volume": 0, "Total Margin": 100 },
        { Month: "curr", Dim_A: "Core", "Sales Volume": 100, "Total Margin": 1000 },
        { Month: "curr", Dim_A: "Core", "Sales Volume": 0, "Total Margin": 200 },
    ];

    const base = calculateGlobalMetrics(data, "base");
    const curr = calculateGlobalMetrics(data, "curr");
    const effects = calculateDimensionPVMEffects(
        data,
        "base",
        "curr",
        "Dim_A",
        curr.totalVol,
        base.totalVol,
        base.avgMargin
    );
    const displayData = prepareDisplayData(
        effects,
        "Dim_A",
        base.totalVol,
        curr.totalVol,
        base.totalMargin,
        curr.totalMargin
    );

    const core = rowByDim(effects, "Core");
    approx(core.Margin_Unit_Base, 11, "base unit metric includes zero-volume same-key margin");
    approx(core.Margin_Unit_Curr, 12, "current unit metric includes zero-volume same-key margin");
    approx(core.Rate_Effect, 1, "same-key zero-volume margin flows through rate effect after aggregation");
    approx(core.Total_Contribution, 1, "same-key zero-volume margin contribution");

    const totalContribution = effects.reduce((sum, row) => sum + row.Total_Contribution, 0);
    approx(totalContribution, curr.avgMargin - base.avgMargin, "sum ties to true unit metric movement");

    const totalRow = rowByDim(displayData, "总计");
    approx(totalRow.Total_Contribution, curr.avgMargin - base.avgMargin, "display total ties to true unit metric movement");
    approx(totalRow.Margin_Unit_Base, 11, "base total unit metric includes zero-volume margin");
    approx(totalRow.Margin_Unit_Curr, 12, "current total unit metric includes zero-volume margin");
});

test("zero-volume margin is aggregated before calculating rate effect", () => {
    const data = [
        { Month: "base", Dim_A: "T19", "Sales Volume": 100, "Total Margin": -1000 },
        { Month: "base", Dim_A: "T19", "Sales Volume": 0, "Total Margin": 5000 },
        { Month: "curr", Dim_A: "T19", "Sales Volume": 200, "Total Margin": -2400 },
        { Month: "curr", Dim_A: "T19", "Sales Volume": 0, "Total Margin": 11000 },
    ];

    const base = calculateGlobalMetrics(data, "base");
    const curr = calculateGlobalMetrics(data, "curr");
    const effects = calculateDimensionPVMEffects(
        data,
        "base",
        "curr",
        "Dim_A",
        curr.totalVol,
        base.totalVol,
        base.avgMargin
    );

    const t19 = rowByDim(effects, "T19");
    approx(t19.Margin_Unit_Base, 40, "base displayed unit metric includes auxiliary margin");
    approx(t19.Margin_Unit_Curr, 43, "current displayed unit metric includes auxiliary margin");
    approx(t19.Rate_Effect, 3, "rate effect follows aggregated unit metric movement");
    approx(t19.Total_Contribution, curr.avgMargin - base.avgMargin, "total still reconciles");
});

test("negative-volume dimension groups reconcile instead of dropping their margin", () => {
    const data = [
        { Month: "base", Dim_A: "Core", "Sales Volume": 100, "Total Margin": 1000 },
        { Month: "base", Dim_A: "Return", "Sales Volume": -10, "Total Margin": -100 },
        { Month: "curr", Dim_A: "Core", "Sales Volume": 100, "Total Margin": 1000 },
        { Month: "curr", Dim_A: "Return", "Sales Volume": -10, "Total Margin": -200 },
    ];

    const base = calculateGlobalMetrics(data, "base");
    const curr = calculateGlobalMetrics(data, "curr");
    const effects = calculateDimensionPVMEffects(
        data,
        "base",
        "curr",
        "Dim_A",
        curr.totalVol,
        base.totalVol,
        base.avgMargin
    );

    const totalContribution = effects.reduce((sum, row) => sum + row.Total_Contribution, 0);
    approx(totalContribution, curr.avgMargin - base.avgMargin, "sum ties to true unit metric movement with negative volume");
});

test("drilled global-impact decomposition ties back to parent bar contribution", () => {
    const data = [
        { Month: "base", Dim_A: "EU", Dim_B: "DE", "Sales Volume": 100, "Total Margin": 1000 },
        { Month: "base", Dim_A: "EU", Dim_B: "FR", "Sales Volume": 80, "Total Margin": 1200 },
        { Month: "base", Dim_A: "NA", Dim_B: "US", "Sales Volume": 120, "Total Margin": 2400 },
        { Month: "curr", Dim_A: "EU", Dim_B: "DE", "Sales Volume": 110, "Total Margin": 1320 },
        { Month: "curr", Dim_A: "EU", Dim_B: "FR", "Sales Volume": 60, "Total Margin": 780 },
        { Month: "curr", Dim_A: "NA", Dim_B: "US", "Sales Volume": 130, "Total Margin": 2600 },
    ];

    const base = calculateGlobalMetrics(data, "base");
    const curr = calculateGlobalMetrics(data, "curr");
    const parentEffects = calculateDimensionPVMEffects(
        data,
        "base",
        "curr",
        "Dim_A",
        curr.totalVol,
        base.totalVol,
        base.avgMargin
    );
    const euParentContribution = rowByDim(parentEffects, "EU").Total_Contribution;

    const euRows = data.filter((row) => row.Dim_A === "EU");
    const childGlobalEffects = calculateDimensionPVMEffects(
        euRows,
        "base",
        "curr",
        "Dim_B",
        curr.totalVol,
        base.totalVol,
        base.avgMargin
    );
    const childContribution = childGlobalEffects.reduce((sum, row) => sum + row.Total_Contribution, 0);

    approx(childContribution, euParentContribution, "EU child decomposition should equal parent bar height");
});

test("left drill filters use an Excel-style checklist menu", () => {
    assert.match(marginAnalysisSource, /className = 'excel-filter-trigger'/);
    assert.match(marginAnalysisSource, /className = 'excel-filter-menu'/);
    assert.match(marginAnalysisSource, /createExcelFilterAction\('全选'/);
    assert.match(marginAnalysisSource, /createExcelFilterAction\('反选'/);
    assert.match(marginAnalysisSource, /footerActions\.className = 'excel-filter-footer-actions'/);
    assert.match(marginAnalysisSource, /keepSearchButton\.textContent = '仅保留搜索结果'/);
    assert.match(marginAnalysisSource, /applyButton\.textContent = keyword \? '应用到当前勾选' : '应用'/);
    assert.match(marginAnalysisSource, /applyExcelFilterSelection\(dim, availableValues, new Set\(searchValues\)\)/);
    assert.match(marginAnalysisSource, /footerActions\.appendChild\(keepSearchButton\)[\s\S]*footerActions\.appendChild\(applyButton\)/);
    assert.doesNotMatch(marginAnalysisSource, /excel-filter-search-tools/);
    assert.match(marginAnalysisSource, /scrollExcelFilterMenuIntoView\(menu\)/);
    assert.match(marginAnalysisSource, /sidebar\.scrollTo\(\{[\s\S]*behavior: 'smooth'/);
    assert.doesNotMatch(marginAnalysisSource, /className = 'filter-mode-toggle'/);
    assert.doesNotMatch(marginAnalysisHtml, /保留筛选|排除筛选/);
    assert.match(marginAnalysisStyles, /\.excel-filter-trigger/);
    assert.match(marginAnalysisStyles, /\.excel-filter-checkmark/);
    assert.match(marginAnalysisStyles, /\.excel-filter-footer-actions/);
});

test("left drill filters can exclude one value while keeping all other values", () => {
    assert.equal(typeof applyDrillDimensionFilters, "function");

    const data = [
        { Month: "base", Dim_A: "Germany", Dim_B: "T19", "Sales Volume": 100, "Total Margin": 1000 },
        { Month: "base", Dim_A: "France", Dim_B: "T19", "Sales Volume": 90, "Total Margin": 900 },
        { Month: "base", Dim_A: "Spain", Dim_B: "T19", "Sales Volume": 80, "Total Margin": 800 },
    ];

    const filtered = applyDrillDimensionFilters(
        data,
        ["Dim_A", "Dim_B"],
        1,
        { Dim_A: null },
        { Dim_A: ["Germany"] }
    );

    assert.deepEqual(filtered.map(row => row.Dim_A), ["France", "Spain"]);
    assert.match(marginAnalysisSource, /AppState\.excludedDims/);
    assert.match(marginAnalysisSource, /uncheckedValues = availableValues\.filter\(value => !selectedValues\.has\(value\)\)/);
});

test("left drill filter search supports keep-search and apply-current-selection modes", () => {
    assert.equal(typeof resolveExcelFilterAppliedValues, "function");
    assert.equal(typeof resolveExcelFilterSearchValues, "function");

    const availableValues = ["中国", "美国", "德国", "墨西哥"];

    assert.deepEqual(
        resolveExcelFilterSearchValues(availableValues, "美国"),
        ["美国"]
    );
    assert.deepEqual(
        resolveExcelFilterSearchValues(availableValues, "国"),
        ["中国", "美国", "德国"]
    );
    assert.deepEqual(
        resolveExcelFilterAppliedValues(availableValues, new Set(["中国", "德国", "墨西哥"])),
        ["中国", "德国", "墨西哥"]
    );
    assert.deepEqual(
        resolveExcelFilterAppliedValues(availableValues, new Set(["美国", "德国"])),
        ["美国", "德国"]
    );
});

test("spreadsheet template can carry a visible note above the detected header row", () => {
    assert.match(TEMPLATE_HEADER_NOTE, /可直接修改标题行/);
    assert.match(TEMPLATE_HEADER_NOTE, /新增或删除维度列/);
    assert.match(TEMPLATE_HEADER_NOTE, /插入或删除/);
    assert.match(TEMPLATE_HEADER_NOTE, /销量列之后的数值列/);
    assert.match(TEMPLATE_HEADER_NOTE, /扣减项建议按负数填写/);
    assert.match(buildTemplateStylesXml(), /fgColor rgb="FFFFF7CC"/);
    assert.match(buildTemplateWorksheetXml(), /<c r="A1" s="1" t="inlineStr">/);
    assert.match(buildTemplateWorksheetXml(), /<mergeCell ref="A1:J1"\/>/);
    const zippedTemplate = new TextDecoder().decode(createStoredZip(buildXlsxTemplateEntries()));
    assert.match(zippedTemplate, /fgColor rgb="FFFFF7CC"/);
    assert.match(zippedTemplate, /<c r="A1" s="1" t="inlineStr">/);

    const rows = sheetRowsToObjects([
        [TEMPLATE_HEADER_NOTE],
        [],
        ["月份", "大区", "国家", "销量", "指标总额"],
        ["2025-01", "欧洲区", "德国", 100, 3000],
    ]);
    const normalized = normalizeUploadedRows(rows);

    assert.equal(normalized.missingCols.length, 0);
    assert.deepEqual(normalized.dimCols, ["Dim_A", "Dim_B"]);
    assert.equal(normalized.dimNames.Dim_A, "大区");
    assert.equal(normalized.rows[0].Month, "2025-01");
    assert.equal(normalized.rows[0].Dim_B, "德国");
});

test("template sample rows use negative costs as financial deductions", () => {
    assert.equal(typeof getTemplateRows, "function");
    getTemplateRows().forEach((row) => {
        assert.ok(row["成本"] < 0, "template cost should be negative");
        assert.equal(row["净收入"] + row["成本"], row["边际"]);
    });
});

test("uploaded sheets can expose multiple metrics after sales volume for single-vehicle analysis", () => {
    assert.equal(typeof normalizeUploadedRows, "function");
    assert.equal(typeof applySelectedMetricToRows, "function");

    const normalized = normalizeUploadedRows([
        { "月份": "2025-01", "大区": "欧洲区", "国家": "德国", "销量": 100, "净收入": 9000, "成本": 7000, "边际": 2000 },
        { "月份": "2025-02", "大区": "欧洲区", "国家": "德国", "销量": 120, "净收入": 10800, "成本": 7800, "边际": 3000 },
    ]);

    assert.equal(normalized.missingCols.length, 0);
    assert.deepEqual(normalized.dimCols, ["Dim_A", "Dim_B"]);
    assert.deepEqual(normalized.metricColumns.map(metric => metric.metricType), ["净收入", "成本", "边际"]);
    assert.deepEqual(normalized.metricColumns.map(metric => metric.sourceHeader), ["净收入", "成本", "边际"]);
    assert.equal(normalized.rows[0][normalized.metricColumns[2].key], 2000);

    const marginRows = applySelectedMetricToRows(normalized.rows, normalized.metricColumns[2].key);
    assert.equal(marginRows[0]["Total Margin"], 2000);
    assert.equal(marginRows[1]["Total Margin"], 3000);
});

test("legacy metric total column remains compatible as the default margin metric", () => {
    const normalized = normalizeUploadedRows([
        { "月份": "2025-01", "大区": "欧洲区", "国家": "德国", "销量": 100, "指标总额": 3000 },
    ]);

    assert.equal(normalized.missingCols.length, 0);
    assert.deepEqual(normalized.metricColumns.map(metric => metric.metricType), ["边际"]);
    assert.equal(normalized.rows[0][normalized.metricColumns[0].key], 3000);
    assert.equal(normalized.rows[0]["Total Margin"], 3000);
});

test("detail table header filters open from the full header and text filters apply immediately", () => {
    assert.match(marginAnalysisSource, /inner\.className = 'detail-th-inner filterable'/);
    assert.match(marginAnalysisSource, /inner\.addEventListener\('click', openMenu\)/);
    assert.match(marginAnalysisSource, /const syncTextFilter = \(\) => \{[\s\S]*applyDetailTableFilters\(rowMetas, state\);[\s\S]*\};/);
    assert.match(marginAnalysisSource, /checkbox\.addEventListener\('change', \(\) => \{[\s\S]*syncTextFilter\(\);[\s\S]*\}\);/);
    assert.match(marginAnalysisStyles, /\.detail-th-inner\.filterable\s*\{[\s\S]*cursor:\s*pointer/s);
});

test("detail table copy uses the current filtered and sorted view", () => {
    assert.equal(typeof buildDetailExportRows, "function");
    assert.equal(typeof buildDetailClipboardText, "function");
    const hiddenGermanyRow = { hidden: true };
    const chinaRow = { hidden: false };
    const totalRow = { hidden: false };
    const state = {
        columns: [{ label: "国家" }, { label: "总贡献" }],
        rowMetas: [
            { tr: hiddenGermanyRow, cells: ["德国", "-24"] },
            { tr: chinaRow, cells: ["中国", "+53"] },
            { tr: totalRow, cells: ["总计", "+101"], isTotal: true },
        ],
        tbody: {
            children: [chinaRow, hiddenGermanyRow, totalRow],
        },
    };

    assert.deepEqual(buildDetailExportRows(state), [
        ["国家", "总贡献"],
        ["中国", "+53"],
        ["总计", "+101"],
    ]);
    assert.equal(buildDetailClipboardText(state), "国家\t总贡献\n中国\t+53\n总计\t+101");
    assert.match(marginAnalysisSource, /copyDetailButton\.textContent = '复制当前表格'/);
    assert.match(marginAnalysisSource, /exportDetailButton\.textContent = '导出当前表'/);
    assert.match(marginAnalysisSource, /showDetailCopyFallback\(filterState, text\)/);
    assert.match(marginAnalysisStyles, /\.detail-copy-fallback\s*\{/);
});

test("upload template and sidebar use business dimension headers instead of Dim labels", () => {
    assert.deepEqual(TEMPLATE_HEADERS, ["月份", "大区", "国家", "车型", "燃油品类", "品牌", "销量", "净收入", "成本", "边际"]);
    assert.ok(!TEMPLATE_HEADERS.some(header => /^Dim_/i.test(header)));
    assert.doesNotMatch(marginAnalysisHtml, /维度配置|dim-config-section/);
    assert.doesNotMatch(marginAnalysisHtml, /id="user-settings-section"/);
    assert.match(marginAnalysisHtml, /<details class="sidebar-details" open>\s*<summary class="sidebar-summary">📁 数据中心<\/summary>/);
    const loadedDataCenter = marginAnalysisHtml.match(/<section id="data-center-loaded"[\s\S]*?<\/section>/);
    assert.ok(loadedDataCenter, "Expected loaded data center section");
    assert.match(loadedDataCenter[0], /for="input-metric-type">当前分析对象<\/label>/);
    assert.match(loadedDataCenter[0], /<select id="input-metric-type"/);
    assert.match(loadedDataCenter[0], /名称来自底表表头/);
    assert.match(marginAnalysisSource, /sheetRowsToObjects\(sheetRows\)/);
    assert.match(marginAnalysisHtml, /可新增或删除维度列/);
    assert.match(marginAnalysisHtml, /销量列之后的数值列会识别为可分析指标/);
    assert.doesNotMatch(marginAnalysisHtml, /未启用维度/);
    assert.doesNotMatch(marginAnalysisHtml, /Dim_[A-E]|Sales Volume|Total Margin/);
});

test("unit metric naming stays single-vehicle by default and supports configurable unit names", () => {
    assert.equal(typeof buildUnitMetricLabel, "function");
    assert.equal(buildUnitMetricLabel("车", "边际"), "单车边际");
    assert.equal(buildUnitMetricLabel("台", "边际"), "单台边际");
    assert.equal(buildUnitMetricLabel("个", "净收入"), "单个净收入");
    assert.equal(buildUnitMetricLabel("", "净收入"), "单车净收入");
    assert.equal(buildUnitMetricLabel("只", ""), "单只边际");
    assert.equal(buildUnitMetricLabel("台", "单台边际"), "单台边际");

    assert.match(marginAnalysisHtml, /<title>单车指标变动归因模型<\/title>/);
    assert.match(marginAnalysisHtml, /<h1 class="main-header">单车指标变动归因模型<\/h1>/);
    assert.doesNotMatch(marginAnalysisHtml, /单均|单位指标变动分析模型/);
});

test("loaded data center exposes unit name and current metric selector together", () => {
    const loadedDataCenter = marginAnalysisHtml.match(/<section id="data-center-loaded"[\s\S]*?<\/section>/);
    assert.ok(loadedDataCenter, "Expected loaded data center section");
    assert.match(loadedDataCenter[0], /for="input-unit-name">单位名称<\/label>/);
    assert.match(loadedDataCenter[0], /id="input-unit-name"[^>]*value="车"/);
    assert.match(loadedDataCenter[0], /for="input-metric-type">当前分析对象<\/label>/);
    assert.match(loadedDataCenter[0], /<select id="input-metric-type" class="form-select"/);
    assert.doesNotMatch(loadedDataCenter[0], /指标名称|指标类型/);
    assert.match(marginAnalysisSource, /unitName:\s*'车'/);
    assert.match(marginAnalysisSource, /document\.getElementById\('input-unit-name'\)/);
    assert.match(marginAnalysisSource, /unitInput\.addEventListener\('input'/);
    assert.match(marginAnalysisSource, /populateMetricSelector\(\)/);
    assert.match(marginAnalysisSource, /metricInput\.addEventListener\('change'/);
});

test("demo data gives revenue, cost, and margin distinct unit-metric movements", () => {
    assert.equal(typeof generateDemoData, "function");
    const normalized = normalizeUploadedRows(generateDemoData());
    assert.deepEqual(normalized.metricColumns.map(metric => metric.metricType), ["净收入", "成本", "边际"]);

    const deltas = {};
    normalized.metricColumns.forEach((metric) => {
        const rows = applySelectedMetricToRows(normalized.rows, metric.key);
        const base = calculateGlobalMetrics(rows, "2025-01").avgMargin;
        const current = calculateGlobalMetrics(rows, "2025-02").avgMargin;
        deltas[metric.metricType] = current - base;
    });

    assert.ok(Math.abs(deltas["净收入"]) > 100, "demo net revenue should visibly move");
    assert.ok(Math.abs(deltas["成本"] + deltas["边际"]) > 100, "demo cost and margin should not be mirror images");
    normalized.rows.forEach((row) => {
        assert.ok(row.Metric_2 < 0, "demo cost should be negative");
        assert.equal(row.Metric_1 + row.Metric_2, row.Metric_3);
    });
});

test("analysis area no longer renders the top KPI card strip", () => {
    assert.doesNotMatch(marginAnalysisHtml, /id="metrics-row"|class="metric-card"|metric-value-\d|metric-label-\d/);
    assert.doesNotMatch(marginAnalysisSource, /metric-value-\d|metric-label-\d|function updateMetricCards/);
    assert.doesNotMatch(marginAnalysisStyles, /\.metrics-row|\.metric-card|\.metric-value|\.metric-label/);
});

test("drilled attribution switch explains the two analysis views in its own control", () => {
    assert.match(marginAnalysisSource, /className = 'attribution-view-hint'/);
    assert.match(marginAnalysisSource, /可切换两个分析视角/);
    assert.match(marginAnalysisSource, /分析自身\$\{unitMetricLabel\}变动/);
    assert.match(marginAnalysisSource, /preserveScrollPosition\(section\)/);
    assert.match(marginAnalysisSource, /window\.scrollTo\(scrollX, scrollY\)/);
    assert.match(marginAnalysisSource, /renderPromise\?\.then/);
    assert.match(marginAnalysisStyles, /\.attribution-view-hint/);
    assert.match(marginAnalysisStyles, /\.attribution-view-switch/);
});

test("mobile waterfall taps keep the detail card while blank chart taps still dismiss it", () => {
    assert.match(marginAnalysisSource, /graphDiv\.__waterfallBlankClickHandler = \(event\) => \{/);
    assert.match(marginAnalysisSource, /window\.setTimeout\(\(\) => \{[\s\S]*clearWaterfallTouchCards\(\);[\s\S]*\}, 0\);/);
    assert.match(marginAnalysisSource, /graphDiv\.__waterfallSuppressBlankClickUntil = Date\.now\(\) \+ 350/);
    assert.match(marginAnalysisSource, /window\.requestAnimationFrame\(\(\) => handleWaterfallBarTap\(meta, dimCol, level\)\)/);
    assert.match(marginAnalysisSource, /getWaterfallMetaAtClientPoint\(graphDiv, event\.clientX, event\.clientY\)/);
    assert.match(marginAnalysisSource, /handleWaterfallBarTap\(fallbackMeta, dimCol, level\)/);
});

test("waterfall total tooltips include volume totals", () => {
    assert.equal(typeof buildWaterfallTooltipHTML, "function");
    const html = buildWaterfallTooltipHTML({
        type: "current",
        label: "本期单车边际",
        value: 3024,
        baseMargin: 2923,
        currMargin: 3024,
        unitMetricLabel: "单车边际",
        volBase: 27300,
        volCurr: 30500,
    });

    assert.match(html, /基期销量[\s\S]*27,300/);
    assert.match(html, /当期销量[\s\S]*30,500/);
    assert.match(marginAnalysisSource, /createWaterfallTotalMeta\('current'[\s\S]*totalVolBase, totalVolCurr/);
});

test("waterfall mix share change uses percent sign instead of pct", () => {
    assert.equal(typeof formatPercentPoint, "function");
    assert.equal(formatPercentPoint(1.8), "+1.8%");
    assert.equal(formatPercentPoint(-1.8), "-1.8%");
    assert.doesNotMatch(formatPercentPoint(1.8), /pct/);
});

test("business headers map into dimensions and all uploaded dimensions are enabled by default", () => {
    assert.equal(typeof normalizeUploadedRows, "function");

    const rows = [
        { "月份": "2025-01", "大区": "欧洲区", "国家": "德国", "车型": "T19", "燃油品类": "PHEV", "品牌": "品牌A", "渠道": "直营", "客户类型": "集团客户", "销量": 100, "指标总额": 1000 },
        { "月份": "2025-02", "大区": "欧洲区", "国家": "法国", "车型": "T19", "燃油品类": "PHEV", "品牌": "品牌A", "渠道": "经销", "客户类型": "零售客户", "销量": 120, "指标总额": 1800 },
    ];

    const normalized = normalizeUploadedRows(rows);
    assert.deepEqual(normalized.dimCols, ["Dim_A", "Dim_B", "Dim_C", "Dim_D", "Dim_E", "Dim_F", "Dim_G"]);
    assert.deepEqual(normalized.dimNames, {
        Dim_A: "大区",
        Dim_B: "国家",
        Dim_C: "车型",
        Dim_D: "燃油品类",
        Dim_E: "品牌",
        Dim_F: "渠道",
        Dim_G: "客户类型",
    });
    assert.equal(normalized.rows[0].Month, "2025-01");
    assert.equal(normalized.rows[0].Dim_A, "欧洲区");
    assert.equal(normalized.rows[0].Dim_F, "直营");
    assert.equal(normalized.rows[1].Dim_G, "零售客户");
    assert.equal(normalized.rows[1]["Sales Volume"], 120);
    assert.equal(normalized.rows[1]["Total Margin"], 1800);
    assert.deepEqual(normalized.metricColumns.map(metric => metric.metricType), ["边际"]);
});
