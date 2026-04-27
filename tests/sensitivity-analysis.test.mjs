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

const percentDriver = DRIVER_DEFINITIONS.find((driver) => driver.key === "grossMargin");
const amountDriver = DRIVER_DEFINITIONS.find((driver) => driver.key === "baseRevenue");
const EPSILON = 1e-9;

function approx(actual, expected, message) {
    assert.ok(
        Math.abs(actual - expected) < EPSILON,
        `${message}: expected ${expected}, received ${actual}`
    );
}

test("profit model calculates the default operating and net profit", () => {
    const result = computeModel(getDefaultAssumptions());

    approx(result.revenue, 1200, "revenue");
    approx(result.grossProfit, 372, "gross profit");
    approx(result.operatingProfit, 78, "operating profit");
    approx(result.netProfit, 60.84, "net profit");
});

test("imported percent values are treated as percentage points", () => {
    assert.equal(normalizeImportedValue(percentDriver, "5%"), 5);
    assert.equal(normalizeImportedValue(percentDriver, "5"), 5);
    assert.equal(normalizeImportedValue(percentDriver, "0.5"), 0.5);
    assert.equal(normalizeImportedValue(percentDriver, 0.5), 0.5);
});

test("imported amount values keep their numeric scale", () => {
    assert.equal(normalizeImportedValue(amountDriver, "1,200 亿元"), 1200);
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
