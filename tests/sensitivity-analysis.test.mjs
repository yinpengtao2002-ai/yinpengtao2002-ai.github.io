import test from "node:test";
import assert from "node:assert/strict";

const sensitivityAnalysis = await import("../public/tools/sensitivity-analysis/app.js");

const {
    DRIVER_DEFINITIONS,
    computeModel,
    getDefaultAssumptions,
    getLockedPlotLayout,
    getPlotConfig,
    normalizeImportedValue,
} = sensitivityAnalysis.default;

const revenueDriver = DRIVER_DEFINITIONS.find((driver) => driver.key === "revenue");
const materialCostDriver = DRIVER_DEFINITIONS.find((driver) => driver.key === "materialCost");
const EPSILON = 1e-9;

function approx(actual, expected, message) {
    assert.ok(
        Math.abs(actual - expected) < EPSILON,
        `${message}: expected ${expected}, received ${actual}`
    );
}

test("profit bridge model calculates the default profit bridge", () => {
    const result = computeModel(getDefaultAssumptions());

    approx(result.revenue, 1500, "revenue");
    approx(result.rebate, 180, "rebate");
    approx(result.netRevenue, 1320, "net revenue");
    approx(result.variableCostTotal, 950, "variable cost total");
    approx(result.contributionMargin, 370, "contribution margin");
    approx(result.fixedDeductionTotal, 177, "fixed deduction total");
    approx(result.profitAdditionTotal, 55, "profit addition total");
    approx(result.profit, 248, "profit");
});

test("profit bridge model calculates rates against the right base", () => {
    const result = computeModel(getDefaultAssumptions());

    approx(result.rebateRate, 12, "rebate rate");
    approx(result.contributionMarginRate, 370 / 1320 * 100, "contribution margin rate");
    approx(result.profitRate, 248 / 1320 * 100, "profit rate");
});

test("imported amount values keep their numeric scale", () => {
    assert.equal(normalizeImportedValue(revenueDriver, "1,500 亿元"), 1500);
    assert.equal(normalizeImportedValue(materialCostDriver, "780 百万元"), 780);
});

test("plot configuration keeps charts readable without accidental zoom controls", () => {
    const config = getPlotConfig();
    const layout = getLockedPlotLayout({
        legend: { orientation: "h" },
        xaxis: { title: "横轴" },
        yaxis: { title: "纵轴" },
    });

    assert.equal(config.displayModeBar, false);
    assert.equal(config.scrollZoom, false);
    assert.equal(config.doubleClick, false);
    assert.equal(layout.dragmode, false);
    assert.equal(layout.legend.itemclick, false);
    assert.equal(layout.legend.itemdoubleclick, false);
    assert.equal(layout.xaxis.fixedrange, true);
    assert.equal(layout.yaxis.fixedrange, true);
});
