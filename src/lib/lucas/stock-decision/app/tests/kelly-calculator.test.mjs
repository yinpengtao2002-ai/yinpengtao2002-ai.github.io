import test from "node:test";
import assert from "node:assert/strict";

import {
  buildKellyLeverageMatrix,
  buildProbabilitySensitivity,
  calculateKellyMetrics,
  deriveWinLossFromPrices,
  normalizePercentInput,
} from "../src/lib/kelly.js";

const closeTo = (actual, expected, tolerance = 0.0005) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

test("calculates the default Kelly example", () => {
  const result = calculateKellyMetrics({
    win: 2 / 3,
    loss: 1 / 3,
    probability: 0.4,
  });

  closeTo(result.riskRewardRatio, 2);
  closeTo(result.expectedValue, 1 / 15);
  closeTo(result.breakevenProbability, 1 / 3);
  closeTo(result.fullKelly, 0.3);
  closeTo(result.adjustedKelly.full, 0.3);
  closeTo(result.adjustedKelly.half, 0.15);
  closeTo(result.adjustedKelly.third, 0.1);
  closeTo(result.adjustedKelly.quarter, 0.075);
});

test("calculates 75 percent full Kelly when win and loss are 2:1 and probability is 50 percent", () => {
  const result = calculateKellyMetrics({
    win: 2 / 3,
    loss: 1 / 3,
    probability: 0.5,
  });

  closeTo(result.fullKelly, 0.75);
});

test("keeps negative Kelly as theory but clamps recommendation to zero", () => {
  const result = calculateKellyMetrics({
    win: 0.5,
    loss: 0.25,
    probability: 0.2,
  });

  assert.ok(result.fullKelly < 0);
  assert.equal(result.recommendedFullKelly, 0);
  assert.equal(result.hasPositiveEdge, false);
});

test("normalizes percentage-style user inputs", () => {
  closeTo(normalizePercentInput(40), 0.4);
  closeTo(normalizePercentInput("66.67"), 0.6667);
  closeTo(normalizePercentInput("0.4"), 0.004);
});

test("derives win and loss from price inputs", () => {
  const result = deriveWinLossFromPrices({
    currentPrice: 9,
    targetPrice: 15,
    failurePrice: 6,
  });

  closeTo(result.win, 2 / 3);
  closeTo(result.loss, 1 / 3);
});

test("builds probability sensitivity rows around the current probability", () => {
  const rows = buildProbabilitySensitivity({
    win: 2 / 3,
    loss: 1 / 3,
    probability: 0.4,
    rangePoints: 10,
    stepPoints: 5,
  });

  assert.deepEqual(
    rows.map((row) => Number(row.probability.toFixed(2))),
    [0.3, 0.35, 0.4, 0.45, 0.5],
  );
  closeTo(rows[2].fullKelly, 0.3);
  closeTo(rows[2].halfKelly, 0.15);
});

test("builds a probability-by-Kelly-fraction leverage matrix", () => {
  const matrix = buildKellyLeverageMatrix({
    win: 2 / 3,
    loss: 1 / 3,
    probability: 0.4,
    rangePoints: 5,
    stepPoints: 5,
    fractions: {
      full: 1,
      half: 0.5,
      third: 1 / 3,
      quarter: 0.25,
      custom: 0.2,
    },
  });

  assert.deepEqual(
    matrix.columns.map((column) => column.key),
    ["full", "half", "third", "quarter", "custom"],
  );
  assert.deepEqual(
    matrix.rows.map((row) => Number(row.probability.toFixed(2))),
    [0.35, 0.4, 0.45],
  );
  closeTo(matrix.rows[1].cells.full.leverage, 0.3);
  closeTo(matrix.rows[1].cells.half.leverage, 0.15);
  closeTo(matrix.rows[1].cells.custom.leverage, 0.06);
});

test("rejects invalid Kelly inputs with clear messages", () => {
  assert.throws(
    () => calculateKellyMetrics({ win: 0, loss: 0.3, probability: 0.4 }),
    /预期收益幅度必须大于 0/,
  );
  assert.throws(
    () => calculateKellyMetrics({ win: 0.6, loss: -0.1, probability: 0.4 }),
    /预期亏损幅度必须大于 0/,
  );
  assert.throws(
    () => calculateKellyMetrics({ win: 0.6, loss: 0.3, probability: 1.2 }),
    /胜率必须在 0% 到 100% 之间/,
  );
  assert.throws(
    () =>
      buildProbabilitySensitivity({
        win: 0.6,
        loss: 0.3,
        probability: 0.4,
        stepPoints: 0,
      }),
    /敏感性分析步长必须大于 0/,
  );
  assert.throws(
    () =>
      buildKellyLeverageMatrix({
        win: 0.6,
        loss: 0.3,
        probability: 0.4,
        rangePoints: 10,
        stepPoints: 0,
      }),
    /敏感性分析步长必须大于 0/,
  );
});
