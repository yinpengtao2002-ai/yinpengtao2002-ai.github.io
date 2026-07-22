import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const financeCore = await import("../public/tools/shared/finance-core.js");
globalThis.FinanceCore = financeCore.default;
const marginAnalysis = await import("../public/tools/margin-analysis/app.js");
const marginAnalysisSource = await readFile(new URL("../public/tools/margin-analysis/app.js", import.meta.url), "utf8");
const marginAnalysisStyles = await readFile(new URL("../public/tools/margin-analysis/styles.css", import.meta.url), "utf8");
const marginAnalysisHtml = await readFile(new URL("../public/tools/margin-analysis/index.html", import.meta.url), "utf8");

const {
    calculateGlobalMetrics,
    calculateDimensionPVMEffects,
    calculateBottomUpPVMEffects,
    prepareDisplayData,
    applyDrillDimensionFilters,
    getImpactBaselineContext,
    resolveExcelFilterAppliedValues,
    resolveExcelFilterSearchValues,
    normalizeUploadedRows,
    applySelectedMetricToRows,
    generateDemoData,
    getTemplateRows,
    sheetRowsToObjects,
    TEMPLATE_HEADERS,
    TEMPLATE_ROLE_ROW,
    TEMPLATE_HEADER_NOTE,
    buildTemplateStylesXml,
    buildTemplateWorksheetXml,
    buildXlsxTemplateEntries,
    createStoredZip,
    buildUnitMetricLabel,
    buildMetricDisplayLabel,
    buildWaterfallTooltipHTML,
    formatPercentPoint,
    formatMetricNumber,
    formatSignedMetricNumber,
    formatMetricValue,
    formatSignedMetricValue,
    buildWaterfallAxisRange,
    getMetricTickFormat,
    buildDetailExportRows,
    buildDetailClipboardText,
    parseCSV,
    selectDefaultComparisonPeriods,
    validateMarginNumericRows,
    getMetricUnitSuffix,
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

function rowByValue(rows, dim, value) {
    const row = rows.find((item) => item[dim] === value);
    assert.ok(row, `Expected row for ${dim}=${value}`);
    return row;
}

test("margin CSV parser supports RFC 4180 multiline fields and trailing cells", () => {
    const rows = parseCSV('\uFEFF月份,大区,销量,边际,备注\r\n2026-01,欧洲,10,20,"第一行\r\n第二行"\r\n2026-02,亚洲,12,24,');
    assert.equal(rows.length, 2);
    assert.equal(rows[0].备注, "第一行\r\n第二行");
    assert.equal(rows[1].备注, "");
});

test("margin period defaults use normalized latest two periods", () => {
    assert.deepEqual(
        selectDefaultComparisonPeriods(["2026-1", "2026-10", "2026-2"]),
        { months: ["2026-01", "2026-02", "2026-10"], baseMonth: "2026-02", currMonth: "2026-10" },
    );
});

test("margin numeric validation reports invalid required cells and normalizes units", () => {
    const result = validateMarginNumericRows([
        { Month: "2026-01", Dim_A: "", "Sales Volume": "100", Metric_1: "1.2亿" },
        { Month: "2026-02", Dim_A: "A", "Sales Volume": "", Metric_1: "#VALUE!" },
    ], [{ key: "Metric_1", sourceHeader: "边际" }], ["Dim_A"], { sheet: "经营明细", firstDataRow: 2 });

    assert.equal(result.rows[0]["Sales Volume"], 100);
    assert.equal(result.rows[0].Metric_1, 120_000_000);
    assert.equal(result.rows[0].Dim_A, "空白");
    assert.deepEqual(result.issues.map((issue) => ({ status: issue.status, sheet: issue.sheet, row: issue.row, column: issue.column })), [
        { status: "blank", sheet: "经营明细", row: 3, column: "销量" },
        { status: "invalid", sheet: "经营明细", row: 3, column: "边际" },
    ]);
});

test("zero-volume global unit metric is explicitly undefined", () => {
    assert.deepEqual(calculateGlobalMetrics([
        { Month: "2026-01", "Sales Volume": 0, "Total Margin": 100 },
    ], "2026-01"), {
        totalVol: 0,
        totalMargin: 100,
        avgMargin: null,
        status: "undefined_zero_volume",
    });
});

test("dimension aggregation safely preserves special object keys and numeric zero", () => {
    const rows = [
        { Month: "base", Dim_A: "__proto__", "Sales Volume": 10, "Total Margin": 100 },
        { Month: "base", Dim_A: 0, "Sales Volume": 10, "Total Margin": 200 },
        { Month: "curr", Dim_A: "__proto__", "Sales Volume": 10, "Total Margin": 110 },
        { Month: "curr", Dim_A: 0, "Sales Volume": 10, "Total Margin": 220 },
    ];
    const base = calculateGlobalMetrics(rows, "base");
    const current = calculateGlobalMetrics(rows, "curr");
    const effects = calculateDimensionPVMEffects(rows, "base", "curr", "Dim_A", current.totalVol, base.totalVol, base.avgMargin);
    assert.deepEqual(new Set(effects.map((row) => row.Dim_A)), new Set(["__proto__", "0"]));
});

test("generic margin chart units do not assume a currency", () => {
    assert.equal(getMetricUnitSuffix("number", "车"), "");
    assert.equal(getMetricUnitSuffix("percent", "车"), "%");
    assert.doesNotMatch(marginAnalysisSource, /metricUnitSuffix\s*=\s*[^;]*['"]¥['"]/);
});

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

test("bottom-up attribution calculates leaf mix and rate before rolling up to the visible dimension", () => {
    assert.equal(typeof calculateBottomUpPVMEffects, "function");
    const data = [
        { Month: "base", Dim_A: "EU", Dim_B: "T19", "Sales Volume": 100, "Total Margin": 1000 },
        { Month: "base", Dim_A: "EU", Dim_B: "T1E", "Sales Volume": 100, "Total Margin": 3000 },
        { Month: "curr", Dim_A: "EU", Dim_B: "T19", "Sales Volume": 50, "Total Margin": 500 },
        { Month: "curr", Dim_A: "EU", Dim_B: "T1E", "Sales Volume": 150, "Total Margin": 4500 },
    ];

    const base = calculateGlobalMetrics(data, "base");
    const curr = calculateGlobalMetrics(data, "curr");
    const layeredEffects = calculateDimensionPVMEffects(
        data,
        "base",
        "curr",
        "Dim_A",
        curr.totalVol,
        base.totalVol,
        base.avgMargin
    );
    const bottomUpEffects = calculateBottomUpPVMEffects(
        data,
        "base",
        "curr",
        "Dim_A",
        ["Dim_A", "Dim_B"],
        curr.totalVol,
        base.totalVol,
        base.avgMargin
    );

    const layeredEu = rowByDim(layeredEffects, "EU");
    approx(layeredEu.Mix_Effect, 0, "layered region mix effect");
    approx(layeredEu.Rate_Effect, 5, "layered region rate effect");

    const bottomUpEu = rowByDim(bottomUpEffects, "EU");
    approx(bottomUpEu.Mix_Effect, 5, "bottom-up rolls leaf structure into parent mix");
    approx(bottomUpEu.Rate_Effect, 0, "bottom-up preserves leaf rate split");
    approx(bottomUpEu.Total_Contribution, layeredEu.Total_Contribution, "bottom-up parent contribution still reconciles");
});

test("bottom-up attribution aggregates zero-volume amount rows into the same finest-grain key before rate calculation", () => {
    const data = [
        { Month: "base", Dim_A: "EU", Dim_B: "T19", "Sales Volume": 100, "Total Margin": 1000 },
        { Month: "base", Dim_A: "EU", Dim_B: "T19", "Sales Volume": 0, "Total Margin": 500 },
        { Month: "curr", Dim_A: "EU", Dim_B: "T19", "Sales Volume": 100, "Total Margin": 1200 },
        { Month: "curr", Dim_A: "EU", Dim_B: "T19", "Sales Volume": 0, "Total Margin": 800 },
    ];

    const base = calculateGlobalMetrics(data, "base");
    const curr = calculateGlobalMetrics(data, "curr");
    const effects = calculateBottomUpPVMEffects(
        data,
        "base",
        "curr",
        "Dim_A",
        ["Dim_A", "Dim_B"],
        curr.totalVol,
        base.totalVol,
        base.avgMargin
    );

    const eu = rowByDim(effects, "EU");
    approx(eu.Margin_Unit_Base, 15, "base leaf unit metric includes zero-volume amount");
    approx(eu.Margin_Unit_Curr, 20, "current leaf unit metric includes zero-volume amount");
    approx(eu.Mix_Effect, 0, "same leaf has no structure movement");
    approx(eu.Rate_Effect, 5, "zero-volume amount flows through leaf rate effect");
    approx(eu.Total_Contribution, curr.avgMargin - base.avgMargin, "bottom-up zero-volume total reconciles");
});

test("bottom-up drilled global impact ties child rows back to the parent leaf rollup", () => {
    const data = [
        { Month: "base", Dim_A: "EU", Dim_B: "DE", Dim_C: "T19", "Sales Volume": 100, "Total Margin": 1000 },
        { Month: "base", Dim_A: "EU", Dim_B: "FR", Dim_C: "T1E", "Sales Volume": 100, "Total Margin": 3000 },
        { Month: "base", Dim_A: "NA", Dim_B: "US", Dim_C: "T19", "Sales Volume": 200, "Total Margin": 4000 },
        { Month: "curr", Dim_A: "EU", Dim_B: "DE", Dim_C: "T19", "Sales Volume": 50, "Total Margin": 500 },
        { Month: "curr", Dim_A: "EU", Dim_B: "FR", Dim_C: "T1E", "Sales Volume": 150, "Total Margin": 4500 },
        { Month: "curr", Dim_A: "NA", Dim_B: "US", Dim_C: "T19", "Sales Volume": 200, "Total Margin": 4000 },
    ];

    const base = calculateGlobalMetrics(data, "base");
    const curr = calculateGlobalMetrics(data, "curr");
    const leafDims = ["Dim_A", "Dim_B", "Dim_C"];
    const parentEffects = calculateBottomUpPVMEffects(
        data,
        "base",
        "curr",
        "Dim_A",
        leafDims,
        curr.totalVol,
        base.totalVol,
        base.avgMargin
    );
    const euParentContribution = rowByDim(parentEffects, "EU").Total_Contribution;
    const euRows = data.filter(row => row.Dim_A === "EU");
    const childEffects = calculateBottomUpPVMEffects(
        euRows,
        "base",
        "curr",
        "Dim_B",
        leafDims,
        curr.totalVol,
        base.totalVol,
        base.avgMargin
    );
    const childContribution = childEffects.reduce((sum, row) => sum + row.Total_Contribution, 0);

    approx(childContribution, euParentContribution, "bottom-up child global impact should equal parent bar contribution");
    approx(rowByValue(childEffects, "Dim_B", "DE").Total_Contribution, 1.25, "DE lower-margin volume reduction contribution");
    approx(rowByValue(childEffects, "Dim_B", "FR").Total_Contribution, 1.25, "FR higher-margin volume increase contribution");
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

test("local impact baseline keeps upper filters and supports multiple selected parent values", () => {
    assert.equal(typeof getImpactBaselineContext, "function");

    const data = [
        { Month: "base", Dim_A: "EU", Dim_B: "DE", Dim_C: "Sedan", "Sales Volume": 100, "Total Margin": 1000 },
        { Month: "base", Dim_A: "EU", Dim_B: "DE", Dim_C: "SUV", "Sales Volume": 50, "Total Margin": 600 },
        { Month: "base", Dim_A: "EU", Dim_B: "FR", Dim_C: "Sedan", "Sales Volume": 80, "Total Margin": 1200 },
        { Month: "base", Dim_A: "EU", Dim_B: "FR", Dim_C: "SUV", "Sales Volume": 20, "Total Margin": 300 },
        { Month: "base", Dim_A: "EU", Dim_B: "IT", Dim_C: "Sedan", "Sales Volume": 60, "Total Margin": 900 },
        { Month: "base", Dim_A: "NA", Dim_B: "US", Dim_C: "Sedan", "Sales Volume": 200, "Total Margin": 3000 },
        { Month: "curr", Dim_A: "EU", Dim_B: "DE", Dim_C: "Sedan", "Sales Volume": 110, "Total Margin": 1210 },
        { Month: "curr", Dim_A: "EU", Dim_B: "DE", Dim_C: "SUV", "Sales Volume": 70, "Total Margin": 910 },
        { Month: "curr", Dim_A: "EU", Dim_B: "FR", Dim_C: "Sedan", "Sales Volume": 70, "Total Margin": 980 },
        { Month: "curr", Dim_A: "EU", Dim_B: "FR", Dim_C: "SUV", "Sales Volume": 40, "Total Margin": 680 },
        { Month: "curr", Dim_A: "EU", Dim_B: "IT", Dim_C: "Sedan", "Sales Volume": 60, "Total Margin": 840 },
        { Month: "curr", Dim_A: "NA", Dim_B: "US", Dim_C: "Sedan", "Sales Volume": 210, "Total Margin": 3150 },
    ];
    const drillOrder = ["Dim_A", "Dim_B", "Dim_C"];
    const selectedDims = { Dim_A: ["EU"], Dim_B: ["DE", "FR"], Dim_C: ["SUV"] };

    const globalContext = getImpactBaselineContext(data, drillOrder, 2, "__global__", "base", "curr", selectedDims, {});
    assert.equal(globalContext.base.totalVol, 510);
    assert.equal(globalContext.curr.totalVol, 560);
    assert.equal(globalContext.targetLabel, "全局");

    const regionContext = getImpactBaselineContext(data, drillOrder, 2, "Dim_A", "base", "curr", selectedDims, {});
    assert.equal(regionContext.base.totalVol, 310);
    assert.equal(regionContext.curr.totalVol, 350);
    assert.equal(regionContext.targetLabel, "大区");

    const countryContext = getImpactBaselineContext(data, drillOrder, 2, "Dim_B", "base", "curr", selectedDims, {});
    assert.equal(countryContext.base.totalVol, 250);
    assert.equal(countryContext.curr.totalVol, 290);
    assert.equal(countryContext.targetLabel, "国家");
});

test("impact baseline at model level uses the intersection of all filters up to that baseline", () => {
    const data = [
        { Month: "base", Dim_A: "EU", Dim_B: "IT", Dim_C: "T19C", Dim_D: "ICE", Dim_E: "Brand A", "Sales Volume": 100, "Total Margin": 1000 },
        { Month: "base", Dim_A: "EU", Dim_B: "IT", Dim_C: "T1E", Dim_D: "EV", Dim_E: "Brand A", "Sales Volume": 40, "Total Margin": 600 },
        { Month: "base", Dim_A: "EU", Dim_B: "IT", Dim_C: "Other", Dim_D: "ICE", Dim_E: "Brand B", "Sales Volume": 900, "Total Margin": 9000 },
        { Month: "base", Dim_A: "EU", Dim_B: "DE", Dim_C: "T19C", Dim_D: "ICE", Dim_E: "Brand A", "Sales Volume": 700, "Total Margin": 7000 },
        { Month: "base", Dim_A: "NA", Dim_B: "IT", Dim_C: "T19C", Dim_D: "ICE", Dim_E: "Brand A", "Sales Volume": 500, "Total Margin": 5000 },
        { Month: "curr", Dim_A: "EU", Dim_B: "IT", Dim_C: "T19C", Dim_D: "ICE", Dim_E: "Brand A", "Sales Volume": 120, "Total Margin": 1440 },
        { Month: "curr", Dim_A: "EU", Dim_B: "IT", Dim_C: "T1E", Dim_D: "EV", Dim_E: "Brand A", "Sales Volume": 60, "Total Margin": 840 },
        { Month: "curr", Dim_A: "EU", Dim_B: "IT", Dim_C: "Other", Dim_D: "ICE", Dim_E: "Brand B", "Sales Volume": 950, "Total Margin": 9500 },
        { Month: "curr", Dim_A: "EU", Dim_B: "DE", Dim_C: "T19C", Dim_D: "ICE", Dim_E: "Brand A", "Sales Volume": 800, "Total Margin": 8800 },
        { Month: "curr", Dim_A: "NA", Dim_B: "IT", Dim_C: "T19C", Dim_D: "ICE", Dim_E: "Brand A", "Sales Volume": 550, "Total Margin": 6050 },
    ];
    const drillOrder = ["Dim_A", "Dim_B", "Dim_C", "Dim_D", "Dim_E"];
    const selectedDims = {
        Dim_A: ["EU"],
        Dim_B: ["IT"],
        Dim_C: ["T19C", "T1E"],
    };

    const modelContext = getImpactBaselineContext(data, drillOrder, 4, "Dim_C", "base", "curr", selectedDims, {}, { Dim_C: "车型" });

    assert.equal(modelContext.targetLabel, "车型");
    assert.equal(modelContext.base.totalVol, 140);
    assert.equal(modelContext.curr.totalVol, 180);
    assert.deepEqual(modelContext.scopeData.map(row => `${row.Month}-${row.Dim_A}-${row.Dim_B}-${row.Dim_C}`), [
        "base-EU-IT-T19C",
        "base-EU-IT-T1E",
        "curr-EU-IT-T19C",
        "curr-EU-IT-T1E",
    ]);
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

test("drill order panel exposes the impact baseline as a path anchor", () => {
    assert.match(marginAnalysisSource, /impactBaselineDim:\s*'__global__'/);
    assert.match(marginAnalysisSource, /buildImpactBaselineTarget\(IMPACT_BASELINE_GLOBAL/);
    assert.match(marginAnalysisSource, /buildImpactBaselineAnchor/);
    assert.match(marginAnalysisSource, /baselineAnchor\.draggable = true/);
    assert.match(marginAnalysisSource, /baselineAnchor\.className = 'impact-baseline-handle'/);
    assert.match(marginAnalysisSource, /baselineAnchor\.innerHTML = `[\s\S]*impact-baseline-handle-label[\s\S]*基准/);
    assert.doesNotMatch(marginAnalysisSource, /impact-baseline-grip/);
    assert.match(marginAnalysisSource, /className = 'dimension-train-car global-baseline/);
    assert.match(marginAnalysisSource, /拖动左侧绿色“基准”条/);
    assert.match(marginAnalysisSource, /影响基准/);
    assert.match(marginAnalysisSource, /分析对\$\{impactTargetLabel\}影响/);
    assert.doesNotMatch(marginAnalysisSource, /impact-baseline-select/);
    assert.doesNotMatch(marginAnalysisStyles, /\.impact-baseline-anchor/);
    assert.match(marginAnalysisStyles, /\.impact-baseline-handle/);
    assert.doesNotMatch(marginAnalysisStyles, /\.impact-baseline-grip/);
    assert.match(marginAnalysisStyles, /\.dimension-train-car\.global-baseline/);
    assert.match(marginAnalysisStyles, /\.baseline-tail-visible/);
    assert.match(marginAnalysisStyles, /width:\s*38px/);
    assert.match(marginAnalysisStyles, /height:\s*22px/);
    assert.match(marginAnalysisStyles, /background:\s*#6f8457/);
    assert.match(marginAnalysisStyles, /color:\s*#fff/);
    assert.doesNotMatch(marginAnalysisStyles, /\.impact-baseline-handle::before/);
    assert.doesNotMatch(marginAnalysisStyles, /writing-mode:\s*vertical-rl/);
});

test("impact baseline changes refresh sidebar state without clearing drill filters", () => {
    assert.match(marginAnalysisSource, /function applyImpactBaselineSelection\(value\)/);
    assert.match(marginAnalysisSource, /applyImpactBaselineSelection\(targetDim\)/);

    const helperBody = marginAnalysisSource.match(/function applyImpactBaselineSelection\(value\) \{([\s\S]*?)\n\}/)?.[1] || "";
    assert.match(helperBody, /AppState\.impactBaselineDim = normalizeImpactBaselineDim\(value, AppState\.drillOrder\);/);
    assert.match(helperBody, /populateDrillOrder\(\);/);
    assert.match(helperBody, /populateDrillFilters\(\);/);
    assert.match(helperBody, /triggerUpdate\(\);/);
    assert.doesNotMatch(helperBody, /selectedDims|excludedDims|drillOrder\s*=/);
});

test("adaptive metric formatter preserves small unit values", () => {
    assert.equal(typeof formatMetricNumber, "function");
    assert.equal(typeof formatSignedMetricNumber, "function");
    assert.equal(formatMetricNumber(2923.2), "2,923");
    assert.equal(formatMetricNumber(23.4), "23.4");
    assert.equal(formatMetricNumber(2.18), "2.18");
    assert.equal(formatMetricNumber(0.236), "0.236");
    assert.equal(formatSignedMetricNumber(0.24), "+0.24");
    assert.equal(formatSignedMetricNumber(-0.236), "-0.236");
});

test("waterfall axis range adapts to small unit metrics", () => {
    assert.equal(typeof buildWaterfallAxisRange, "function");
    assert.equal(typeof getMetricTickFormat, "function");

    const smallRange = buildWaterfallAxisRange(2, 2.2, [2, 0.1, 0.1, 0]);
    assert.ok(smallRange[0] > 0, `expected small positive range to stay focused, got ${smallRange}`);
    assert.ok(smallRange[1] - smallRange[0] < 2, `expected small range to avoid fixed 100 padding, got ${smallRange}`);
    assert.equal(getMetricTickFormat(smallRange[0], smallRange[1]), ",.2f");

    const tinyRange = buildWaterfallAxisRange(0, 0.24, [0, 0.12, 0.12, 0]);
    assert.ok(tinyRange[1] - tinyRange[0] < 1, `expected tiny impact range to remain readable, got ${tinyRange}`);
    assert.equal(getMetricTickFormat(tinyRange[0], tinyRange[1]), ",.3f");
    assert.doesNotMatch(marginAnalysisSource, /Math\.max\(delta \* 1\.5, dataRange \* 0\.3, 100\)/);
    assert.match(marginAnalysisSource, /tickformat: getMetricTickFormat\(yRangeMin, yRangeMax\)/);
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
    assert.match(TEMPLATE_HEADER_NOTE, /插入或删除维度列/);
    assert.match(TEMPLATE_HEADER_NOTE, /表头、样本类型和指标角色/);
    assert.match(TEMPLATE_HEADER_NOTE, /页面内请你确认/);
    assert.doesNotMatch(TEMPLATE_HEADER_NOTE, /销量列之后的数值列/);
    assert.match(TEMPLATE_HEADER_NOTE, /数据口径/);
    assert.match(TEMPLATE_HEADER_NOTE, /备注/);
    assert.match(TEMPLATE_HEADER_NOTE, /扣减项建议按负数填写/);
    assert.match(buildTemplateStylesXml(), /fgColor rgb="FFFFF7CC"/);
    assert.match(buildTemplateWorksheetXml(), /<c r="A1" s="1" t="inlineStr">/);
    assert.match(buildTemplateWorksheetXml(), /<mergeCell ref="A1:O1"\/>/);
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

test("template role row marks denominator and numerator metrics for ratio analysis", () => {
    assert.deepEqual(TEMPLATE_ROLE_ROW, [
        "指标角色", "", "", "", "", "", "", "", "", "", "", "分母", "分子", "分子", "分子"
    ]);
    assert.match(TEMPLATE_HEADER_NOTE, /指标角色/);
    assert.match(TEMPLATE_HEADER_NOTE, /分母/);
    assert.match(TEMPLATE_HEADER_NOTE, /分子/);
    assert.match(buildTemplateWorksheetXml(), /指标角色[\s\S]*分母[\s\S]*分子/);

    const parsed = sheetRowsToObjects([
        TEMPLATE_ROLE_ROW,
        TEMPLATE_HEADERS,
        ["2025-01", "实际", "欧洲区", "德国", "品牌A", "品牌市场A", "直营", "业务A", "T19", "ICE", "", 100, 9000, -7000, 2000],
    ]);
    assert.equal(parsed.__metricRolesByHeader["销量"], "denominator");
    assert.equal(parsed.__metricRolesByHeader["净收入"], "numerator");
    assert.equal(parsed.__metricRolesByHeader["成本"], "numerator");
    assert.equal(parsed.__metricRolesByHeader["边际"], "numerator");
    assert.equal(parsed.length, 1);
});

test("role-marked denominator supports ratio-style uploads", () => {
    const parsed = sheetRowsToObjects([
        ["指标角色", "", "", "分母", "分子"],
        ["月份", "大区", "国家", "净收入", "毛利"],
        ["2025-01", "欧洲区", "德国", 1000, 200],
        ["2025-02", "欧洲区", "德国", 1200, 300],
    ]);
    const normalized = normalizeUploadedRows(parsed);

    assert.equal(normalized.missingCols.length, 0);
    assert.equal(normalized.denominatorLabel, "净收入");
    assert.deepEqual(normalized.dimCols, ["Dim_A", "Dim_B"]);
    assert.deepEqual(normalized.metricColumns.map(metric => metric.metricType), ["毛利"]);
    assert.deepEqual(normalized.metricColumns.map(metric => metric.denominatorLabel), ["净收入"]);
    assert.equal(normalized.rows[0]["Sales Volume"], 1000);
    assert.equal(normalized.rows[0]["Total Margin"], 200);

    const ratioRows = applySelectedMetricToRows(normalized.rows, normalized.metricColumns[0].key);
    assert.equal(calculateGlobalMetrics(ratioRows, "2025-01").avgMargin, 0.2);
    assert.equal(calculateGlobalMetrics(ratioRows, "2025-02").avgMargin, 0.25);
});

test("explicit denominator role is not overwritten by a legacy sales column", () => {
    const parsed = sheetRowsToObjects([
        ["指标角色", "", "", "分母", "分子", ""],
        ["月份", "大区", "国家", "净收入", "毛利", "销量"],
        ["2025-01", "欧洲区", "德国", 1000, 200, 9],
    ]);
    const normalized = normalizeUploadedRows(parsed);

    assert.equal(normalized.denominatorLabel, "净收入");
    assert.equal(normalized.rows[0]["Sales Volume"], 1000);
    assert.equal(normalized.rows[0][normalized.metricColumns[0].key], 200);
    assert.equal(normalized.dimCols.length, 2);
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

test("detail table exports neutralize spreadsheet formulas only in text columns", () => {
    const state = {
        columns: [
            { label: "维度", type: "text" },
            { label: "数值", type: "number" },
        ],
        rowMetas: [
            { tr: { hidden: false }, cells: ["=HYPERLINK(\"https://example.test\")", "-300"] },
            { tr: { hidden: false }, cells: ["@IMPORTXML", "+12"] },
        ],
    };

    assert.deepEqual(buildDetailExportRows(state), [
        ["维度", "数值"],
        ["'=HYPERLINK(\"https://example.test\")", "-300"],
        ["'@IMPORTXML", "+12"],
    ]);
});

test("upload template and sidebar use business dimension headers instead of Dim labels", () => {
    assert.deepEqual(TEMPLATE_HEADERS, ["月份", "数据口径", "大区", "国家", "品牌", "品牌市场", "经营模式", "业务单元", "车型", "燃油品类", "备注", "销量", "净收入", "成本", "边际"]);
    assert.deepEqual(TEMPLATE_ROLE_ROW, ["指标角色", "", "", "", "", "", "", "", "", "", "", "分母", "分子", "分子", "分子"]);
    assert.ok(!TEMPLATE_HEADERS.some(header => /^Dim_/i.test(header)));
    assert.doesNotMatch(marginAnalysisHtml, /维度配置|dim-config-section/);
    assert.doesNotMatch(marginAnalysisHtml, /id="user-settings-section"/);
    assert.match(marginAnalysisHtml, /<details class="sidebar-details" open>\s*<summary class="sidebar-summary">📁 数据中心<\/summary>/);
    const loadedDataCenter = marginAnalysisHtml.match(/<section id="data-center-loaded"[\s\S]*?<\/section>/);
    assert.ok(loadedDataCenter, "Expected loaded data center section");
    assert.match(loadedDataCenter[0], /for="input-metric-type">当前分析对象<\/label>/);
    assert.match(loadedDataCenter[0], /<select id="input-metric-type"/);
    assert.match(loadedDataCenter[0], /名称来自底表表头/);
    assert.match(marginAnalysisSource, /sheetRowsToObjects\(sheetRows, firstSheetName\)/);
    assert.match(marginAnalysisHtml, /可新增或删除维度列/);
    assert.match(marginAnalysisHtml, /销量列之后的数值列会识别为可分析指标/);
    assert.match(marginAnalysisHtml, /指标角色/);
    assert.match(marginAnalysisHtml, /分母/);
    assert.match(marginAnalysisHtml, /分子/);
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

test("loaded data center exposes unit name, current metric selector, and visual metric basis together", () => {
    const loadedDataCenter = marginAnalysisHtml.match(/<section id="data-center-loaded"[\s\S]*?<\/section>/);
    assert.ok(loadedDataCenter, "Expected loaded data center section");
    assert.match(loadedDataCenter[0], /for="input-unit-name">单位名称<\/label>/);
    assert.match(loadedDataCenter[0], /id="input-unit-name"[^>]*value="车"/);
    assert.match(loadedDataCenter[0], /for="input-metric-type">当前分析对象<\/label>/);
    assert.match(loadedDataCenter[0], /<select id="input-metric-type" class="form-select"/);
    assert.match(loadedDataCenter[0], /for="input-metric-format">指标口径<\/label>/);
    assert.match(loadedDataCenter[0], /<select id="input-metric-format" class="form-select"/);
    assert.match(loadedDataCenter[0], /单车\/单位指标/);
    assert.match(loadedDataCenter[0], /比率指标/);
    assert.match(loadedDataCenter[0], /只识别分母和分子/);
    assert.doesNotMatch(loadedDataCenter[0], /指标名称|指标类型/);
    assert.match(marginAnalysisSource, /unitName:\s*'车'/);
    assert.match(marginAnalysisSource, /metricDisplayFormat:\s*'number'/);
    assert.match(marginAnalysisSource, /document\.getElementById\('input-unit-name'\)/);
    assert.match(marginAnalysisSource, /document\.getElementById\('input-metric-format'\)/);
    assert.match(marginAnalysisSource, /unitInput\.addEventListener\('input'/);
    assert.match(marginAnalysisSource, /populateMetricSelector\(\)/);
    assert.match(marginAnalysisSource, /metricInput\.addEventListener\('change'/);
});

test("static margin analysis shell version-busts the shared core and app bundle", () => {
    assert.match(marginAnalysisHtml, /<script src="\.\.\/shared\/finance-core\.js\?v=20260722"><\/script>/);
    assert.match(marginAnalysisHtml, /<script src="app\.js\?v=20260722-finance-core"><\/script>/);
    assert.doesNotMatch(marginAnalysisHtml, /<script src="app\.js"><\/script>/);
});

test("visual metric basis controls unit labels versus ratio labels without auto-naming rates", () => {
    assert.equal(typeof buildMetricDisplayLabel, "function");
    assert.equal(buildMetricDisplayLabel("毛利", "车", "净收入", "number"), "单车毛利");
    assert.equal(buildMetricDisplayLabel("毛利", "车", "净收入", "percent"), "毛利/净收入");
    assert.equal(buildMetricDisplayLabel("边际", "台", "销量", "number"), "单台边际");
    assert.equal(buildMetricDisplayLabel("边际", "台", "销量", "percent"), "边际/销量");
    assert.doesNotMatch(marginAnalysisSource, /毛利率/);
});

test("percent metric display formats ratio charts and tooltips without currency", () => {
    assert.equal(typeof formatMetricValue, "function");
    assert.equal(typeof formatSignedMetricValue, "function");
    assert.equal(formatMetricValue(0.236, "percent"), "23.6%");
    assert.equal(formatSignedMetricValue(0.024, "percent"), "+2.4%");
    assert.equal(formatSignedMetricValue(-0.024, "percent"), "-2.4%");

    const html = buildWaterfallTooltipHTML({
        type: "current",
        label: "当期毛利/净收入",
        value: 0.25,
        baseMargin: 0.2,
        currMargin: 0.25,
        unitMetricLabel: "毛利/净收入",
        denominatorLabel: "净收入",
        metricDisplayFormat: "percent",
        volBase: 1000,
        volCurr: 1200,
    });

    assert.match(html, /毛利\/净收入[\s\S]*25\.0%/);
    assert.match(html, /基期净收入[\s\S]*1,000/);
    assert.match(html, /当期净收入[\s\S]*1,200/);
    assert.doesNotMatch(html, /¥25\.0%|¥0\.25/);
});

test("loaded data center exposes attribution method choice and mode two uses the bottom-up engine", () => {
    const loadedDataCenter = marginAnalysisHtml.match(/<section id="data-center-loaded"[\s\S]*?<\/section>/);
    assert.ok(loadedDataCenter, "Expected loaded data center section");
    assert.match(loadedDataCenter[0], /for="input-attribution-method">归因口径<\/label>/);
    assert.match(loadedDataCenter[0], /<select id="input-attribution-method" class="form-select"/);
    assert.match(loadedDataCenter[0], /模式一：逐层独立归因/);
    assert.match(loadedDataCenter[0], /模式二：最细粒度向上归因/);
    assert.doesNotMatch(loadedDataCenter[0], /试用/);
    assert.match(loadedDataCenter[0], /id="attribution-method-note"/);

    assert.match(marginAnalysisSource, /attributionMethod:\s*'layered'/);
    assert.match(marginAnalysisSource, /const ATTRIBUTION_METHOD_LAYERED = 'layered'/);
    assert.match(marginAnalysisSource, /const ATTRIBUTION_METHOD_BOTTOM_UP = 'bottom-up'/);
    assert.match(marginAnalysisSource, /document\.getElementById\('input-attribution-method'\)/);
    assert.match(marginAnalysisSource, /methodInput\.addEventListener\('change'/);
    assert.match(marginAnalysisSource, /updateAttributionMethodNote\(\)/);
    assert.match(marginAnalysisSource, /先按最细维度组合计算，再汇总到各层图表/);

    const triggerUpdateBody = marginAnalysisSource.match(/function triggerUpdate\(\) \{[\s\S]*?\n\/\/ ==================== 渲染图表和表格/)?.[0] || "";
    assert.match(triggerUpdateBody, /calculateAttributionEffects\(/);
    assert.match(triggerUpdateBody, /AppState\.attributionMethod/);
});

test("analysis footer explains the difference between attribution modes in a collapsible section", () => {
    assert.match(marginAnalysisHtml, /<details id="attribution-mode-guide" class="usage-details" style="display:none;">/);
    assert.match(marginAnalysisHtml, /<summary class="usage-summary">.*模式一与模式二区别.*<\/summary>/);
    assert.match(marginAnalysisHtml, /模式一：逐层独立归因/);
    assert.match(marginAnalysisHtml, /模式二：最细粒度向上归因/);
    assert.match(marginAnalysisHtml, /当前层视角/);
    assert.match(marginAnalysisHtml, /底层 SKU 视角/);
    assert.match(marginAnalysisHtml, /当前维度看不见的底层结构变化/);
    assert.match(marginAnalysisHtml, /多数情况下会表现为费率效应/);
    assert.match(marginAnalysisHtml, /每到一层，就在这一层重新做一次归因/);
    assert.match(marginAnalysisHtml, /固定在最细颗粒做一次归因，再把答案往上卷/);
    assert.match(marginAnalysisHtml, /柱子总贡献通常保持一致/);
    assert.match(marginAnalysisHtml, /最细颗粒越稳定/);
    assert.doesNotMatch(marginAnalysisHtml, /结果特征/);
    assert.doesNotMatch(marginAnalysisHtml, /如何阅读/);
    assert.match(marginAnalysisSource, /document\.getElementById\('attribution-mode-guide'\)/);
});

test("chart interaction guidance is a bottom collapsible section instead of a top chart banner", () => {
    assert.match(marginAnalysisHtml, /<details id="chart-interaction-guide" class="usage-details" style="display:none;">/);
    assert.match(marginAnalysisHtml, /<summary class="usage-summary">.*图表交互.*<\/summary>/);
    assert.match(marginAnalysisHtml, /电脑端：悬停查看拆解卡片，点击柱子下钻/);
    assert.match(marginAnalysisHtml, /手机端：点击柱子看明细卡片，在卡片里进入下一层/);
    assert.match(marginAnalysisHtml, /下钻后：在图表标题右侧切换/);

    const attributionGuideIndex = marginAnalysisHtml.indexOf('id="attribution-mode-guide"');
    const interactionGuideIndex = marginAnalysisHtml.indexOf('id="chart-interaction-guide"');
    const footerIndex = marginAnalysisHtml.indexOf('<div class="footer">');
    assert.ok(attributionGuideIndex > 0, "attribution mode guide should exist before the interaction guide");
    assert.ok(interactionGuideIndex > attributionGuideIndex, "interaction guide should sit below the other analysis notes");
    assert.ok(footerIndex > interactionGuideIndex, "interaction guide should sit at the bottom before the footer");

    assert.match(marginAnalysisSource, /document\.getElementById\('chart-interaction-guide'\)/);
    assert.doesNotMatch(marginAnalysisSource, /container\.appendChild\(buildChartInteractionGuide\(\)\)/);
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

test("demo data provides a richer drill path for first-time exploration", () => {
    const demoRows = generateDemoData();
    const normalized = normalizeUploadedRows(demoRows);

    assert.ok(demoRows.length >= 40, "demo data should include enough rows to make filters and drilldown meaningful");
    assert.deepEqual(normalized.dimCols, ["Dim_A", "Dim_B", "Dim_C", "Dim_D", "Dim_E", "Dim_F", "Dim_G", "Dim_H"]);

    const uniqueCount = (field) => new Set(demoRows.map(row => row[field])).size;
    assert.ok(uniqueCount("大区") >= 4, "demo should span multiple regions");
    assert.ok(uniqueCount("国家") >= 10, "demo should span many countries");
    assert.ok(uniqueCount("品牌市场") >= 3, "demo should include brand-market drilldown");
    assert.ok(uniqueCount("经营模式") >= 2, "demo should include operating modes");
    assert.ok(uniqueCount("业务单元") >= 3, "demo should include business units");
    assert.ok(uniqueCount("车型") >= 5, "demo should span several model families");
    assert.ok(uniqueCount("燃油品类") >= 3, "demo should include fuel or energy categories");
    assert.ok(uniqueCount("品牌") >= 3, "demo should include brand-level drilldown");
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
