export const DEFAULT_KELLY_FRACTIONS = {
  full: 1,
  half: 0.5,
  third: 1 / 3,
  quarter: 0.25,
};

export const KELLY_LABELS = {
  full: "全凯利",
  half: "半凯利",
  third: "1/3 凯利",
  quarter: "1/4 凯利",
  custom: "自定义",
};

const toNumber = (value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const normalized = value.trim().replace("%", "");
    return normalized === "" ? Number.NaN : Number(normalized);
  }
  return Number.NaN;
};

export function normalizePercentInput(value) {
  const number = toNumber(value);
  if (!Number.isFinite(number)) return Number.NaN;
  return number / 100;
}

function assertPositive(value, message) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(message);
  }
}

function assertProbability(probability) {
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
    throw new Error("胜率必须在 0% 到 100% 之间");
  }
}

function assertKellyInputs({ win, loss, probability }) {
  assertPositive(win, "预期收益幅度必须大于 0");
  assertPositive(loss, "预期亏损幅度必须大于 0");
  assertProbability(probability);
}

function calculateAdjustedKelly(fullKelly, fractions) {
  return Object.fromEntries(
    Object.entries(fractions).map(([key, fraction]) => [key, fullKelly * fraction]),
  );
}

export function clampRecommendedKelly(value) {
  return value > 0 ? value : 0;
}

export function getKellyRiskLevel(value) {
  if (value <= 0) return "none";
  if (value > 1) return "leveraged";
  return "positive";
}

// Core Kelly math uses decimals internally: 40% is 0.4, 66.67% is 0.6667.
export function calculateKellyMetrics({
  win,
  loss,
  probability,
  fractions = DEFAULT_KELLY_FRACTIONS,
} = {}) {
  assertKellyInputs({ win, loss, probability });

  const q = 1 - probability;
  const expectedValue = probability * win - q * loss;
  const breakevenProbability = loss / (win + loss);
  const riskRewardRatio = win / loss;
  const fullKelly = expectedValue / (win * loss);
  const adjustedKelly = calculateAdjustedKelly(fullKelly, fractions);

  return {
    win,
    loss,
    probability,
    expectedValue,
    breakevenProbability,
    riskRewardRatio,
    fullKelly,
    recommendedFullKelly: clampRecommendedKelly(fullKelly),
    adjustedKelly,
    recommendedAdjustedKelly: Object.fromEntries(
      Object.entries(adjustedKelly).map(([key, value]) => [key, clampRecommendedKelly(value)]),
    ),
    hasPositiveEdge: fullKelly > 0,
    riskLevel: getKellyRiskLevel(fullKelly),
  };
}

export function deriveWinLossFromPrices({ currentPrice, targetPrice, failurePrice } = {}) {
  const current = toNumber(currentPrice);
  const target = toNumber(targetPrice);
  const failure = toNumber(failurePrice);

  assertPositive(current, "当前价格必须大于 0");

  const win = (target - current) / current;
  const loss = (current - failure) / current;

  assertPositive(win, "目标价格必须高于当前价格");
  assertPositive(loss, "失败价格必须低于当前价格");

  return { win, loss };
}

export function buildProbabilitySensitivity({
  win,
  loss,
  probability,
  rangePoints = 10,
  stepPoints = 1,
  fractions = DEFAULT_KELLY_FRACTIONS,
} = {}) {
  assertKellyInputs({ win, loss, probability });
  assertPositive(rangePoints, "敏感性分析范围必须大于 0");
  assertPositive(stepPoints, "敏感性分析步长必须大于 0");

  const range = rangePoints / 100;
  const step = stepPoints / 100;
  const start = Math.max(0, probability - range);
  const end = Math.min(1, probability + range);
  const rows = [];

  for (let cursor = start; cursor <= end + step / 2; cursor += step) {
    const rowProbability = Number(Math.min(cursor, end).toFixed(10));
    const metrics = calculateKellyMetrics({
      win,
      loss,
      probability: rowProbability,
      fractions,
    });

    rows.push({
      probability: rowProbability,
      expectedValue: metrics.expectedValue,
      fullKelly: metrics.fullKelly,
      halfKelly: metrics.adjustedKelly.half,
      thirdKelly: metrics.adjustedKelly.third,
      quarterKelly: metrics.adjustedKelly.quarter,
      recommendedFullKelly: metrics.recommendedFullKelly,
      recommendedHalfKelly: metrics.recommendedAdjustedKelly.half,
      recommendedThirdKelly: metrics.recommendedAdjustedKelly.third,
      recommendedQuarterKelly: metrics.recommendedAdjustedKelly.quarter,
      isCurrentProbability: Math.abs(rowProbability - probability) < step / 2,
      isPositiveKelly: metrics.fullKelly > 0,
    });
  }

  return rows;
}

export function buildKellyLeverageMatrix({
  win,
  loss,
  probability,
  rangePoints = 10,
  stepPoints = 1,
  fractions = DEFAULT_KELLY_FRACTIONS,
} = {}) {
  assertKellyInputs({ win, loss, probability });
  assertPositive(rangePoints, "敏感性分析范围必须大于 0");
  assertPositive(stepPoints, "敏感性分析步长必须大于 0");

  const columns = Object.entries(fractions).map(([key, fraction]) => ({
    key,
    label: KELLY_LABELS[key] || `${fraction.toFixed(2)} Kelly`,
    fraction,
  }));
  const sensitivityRows = buildProbabilitySensitivity({
    win,
    loss,
    probability,
    rangePoints,
    stepPoints,
    fractions,
  });

  return {
    columns,
    rows: sensitivityRows.map((row) => {
      const metrics = calculateKellyMetrics({
        win,
        loss,
        probability: row.probability,
        fractions,
      });

      return {
        probability: row.probability,
        expectedValue: metrics.expectedValue,
        cells: Object.fromEntries(
          columns.map((column) => {
            const rawLeverage = metrics.adjustedKelly[column.key];
            return [
              column.key,
              {
                rawLeverage,
                leverage: clampRecommendedKelly(rawLeverage),
                riskLevel: getKellyRiskLevel(rawLeverage),
              },
            ];
          }),
        ),
      };
    }),
  };
}

export function formatPercent(value, digits = 2) {
  if (!Number.isFinite(value)) return "--";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatRatio(value, digits = 2) {
  if (!Number.isFinite(value)) return "--";
  return value.toFixed(digits);
}
