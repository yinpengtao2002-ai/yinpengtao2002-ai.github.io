import test from "node:test";
import assert from "node:assert/strict";

const marginAnalysis = await import("../public/tools/margin-analysis/app.js");

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
