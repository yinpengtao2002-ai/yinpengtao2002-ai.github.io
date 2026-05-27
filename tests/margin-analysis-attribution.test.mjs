import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const marginAnalysis = await import("../public/tools/margin-analysis/app.js");
const marginAnalysisSource = await readFile(new URL("../public/tools/margin-analysis/app.js", import.meta.url), "utf8");
const marginAnalysisStyles = await readFile(new URL("../public/tools/margin-analysis/styles.css", import.meta.url), "utf8");

const {
    calculateGlobalMetrics,
    calculateDimensionPVMEffects,
    prepareDisplayData,
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

test("left drill filters expose removable chips and keep dropdown options stable", () => {
    assert.match(marginAnalysisSource, /const removeButton = document\.createElement\('button'\)/);
    assert.match(marginAnalysisSource, /removeButton\.setAttribute\('aria-label', `移除\$\{value\}`\)/);
    assert.match(marginAnalysisSource, /event\.stopPropagation\(\);\s*removeFilterChip\(dim, value\);/);
    assert.match(marginAnalysisSource, /Array\.from\(dropdown\.options\)\.find\(option => option\.value === value\)/);
    assert.match(marginAnalysisSource, /rebuildFilterDropdown\(dropdown, availableValues, dim\)/);
    assert.match(marginAnalysisStyles, /\.chip-remove\s*\{[\s\S]*width:\s*20px[\s\S]*border-radius:\s*999px/s);
});

test("detail table header filters open from the full header and text filters apply immediately", () => {
    assert.match(marginAnalysisSource, /inner\.className = 'detail-th-inner filterable'/);
    assert.match(marginAnalysisSource, /inner\.addEventListener\('click', openMenu\)/);
    assert.match(marginAnalysisSource, /const syncTextFilter = \(\) => \{[\s\S]*applyDetailTableFilters\(rowMetas, state\);[\s\S]*\};/);
    assert.match(marginAnalysisSource, /checkbox\.addEventListener\('change', \(\) => \{[\s\S]*syncTextFilter\(\);[\s\S]*\}\);/);
    assert.match(marginAnalysisStyles, /\.detail-th-inner\.filterable\s*\{[\s\S]*cursor:\s*pointer/s);
});
