import test from "node:test";
import assert from "node:assert/strict";

const sensitivityAnalysis = await import("../src/app/finance/sensitivity-analysis/sensitivity-engine.js");

const {
    DRIVER_DEFINITIONS,
    computeModel,
    getDefaultAssumptions,
    getLockedPlotLayout,
    getPlotConfig,
    getTemplateRows,
    normalizeImportedValue,
} = sensitivityAnalysis.default;

const salesVolumeDriver = DRIVER_DEFINITIONS.find((driver) => driver.key === "salesVolume");
const unitNetRevenueDriver = DRIVER_DEFINITIONS.find((driver) => driver.key === "unitNetRevenue");
const unitMaterialCostDriver = DRIVER_DEFINITIONS.find((driver) => driver.key === "unitMaterialCost");
const EPSILON = 1e-9;

function approx(actual, expected, message) {
    assert.ok(
        Math.abs(actual - expected) < EPSILON,
        `${message}: expected ${expected}, received ${actual}`
    );
}

test("profit model calculates the default structure", () => {
    const result = computeModel(getDefaultAssumptions());

    approx(result.salesVolume, 100, "sales volume");
    approx(result.unitNetRevenue, 13.2, "unit net revenue");
    approx(result.unitMaterialCost, 7.8, "unit material cost");
    approx(result.netRevenue, 1320, "net revenue");
    approx(result.variableCostTotal, 950, "variable cost total");
    approx(result.unitContributionMargin, 3.7, "unit contribution margin");
    approx(result.contributionMargin, 370, "contribution margin");
    approx(result.incomeTax, 0, "income tax default");
    approx(result.fixedDeductionTotal, 177, "fixed deduction total");
    approx(result.profitAdditionTotal, 55, "profit addition total");
    approx(result.fixedPartNet, 122, "fixed part net");
    approx(result.profit, 248, "profit total");
});

test("profit model calculates rates against the right base", () => {
    const result = computeModel(getDefaultAssumptions());

    approx(result.contributionMarginRate, 370 / 1320 * 100, "contribution margin rate");
    approx(result.profitRate, 248 / 1320 * 100, "profit total rate");
});

test("tax reduces profit when it is included", () => {
    const result = computeModel({
        ...getDefaultAssumptions(),
        incomeTax: 10,
    });

    approx(result.fixedDeductionTotal, 187, "fixed deduction total with tax");
    approx(result.fixedPartNet, 132, "fixed part net with tax");
    approx(result.profit, 238, "profit total after tax");
});

test("sales volume only drives above-margin items", () => {
    const result = computeModel({
        ...getDefaultAssumptions(),
        salesVolume: 110,
    });

    approx(result.netRevenue, 1452, "volume-driven net revenue");
    approx(result.materialCost, 858, "volume-driven material cost");
    approx(result.variableManufacturingCost, 99, "volume-driven variable manufacturing cost");
    approx(result.variableSalesCost, 88, "volume-driven variable sales cost");
    approx(result.contributionMargin, 407, "volume-driven contribution margin");
    approx(result.fixedDeductionTotal, 177, "fixed deductions stay independent from volume");
    approx(result.profitAdditionTotal, 55, "profit additions stay independent from volume");
    approx(result.profit, 285, "profit total after unchanged below-margin items");
});

test("imported amount values keep their numeric scale", () => {
    assert.equal(normalizeImportedValue(salesVolumeDriver, "100 万辆"), 100);
    assert.equal(normalizeImportedValue(unitNetRevenueDriver, "13.2 万元/辆"), 13.2);
    assert.equal(normalizeImportedValue(unitMaterialCostDriver, "7.8 万元/辆"), 7.8);
});

test("template rows use finance-facing fields instead of implementation keys", () => {
    const row = getTemplateRows()[0];
    const unitRevenueRow = getTemplateRows()[1];
    const unitCostRow = getTemplateRows()[2];

    assert.deepEqual(Object.keys(row), ["序号", "部分", "名称", "口径", "基准值", "单位"]);
    assert.equal(row["名称"], "销量");
    assert.equal(unitRevenueRow["名称"], "净收入总额");
    assert.equal(unitRevenueRow["口径"], "总额");
    assert.equal(unitRevenueRow["基准值"], 1320);
    assert.equal(unitRevenueRow["单位"], "亿元");
    assert.equal(unitCostRow["名称"], "材料成本总额");
    assert.equal(unitCostRow["基准值"], 780);
    assert.equal(row.Key, undefined);
    assert.equal(row.Description, undefined);
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
