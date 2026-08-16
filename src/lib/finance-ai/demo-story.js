// eslint-disable-next-line @typescript-eslint/no-require-imports -- Keep this pure story builder consumable by Node contract tests and Next.js.
const financeTemplates = require("../finance/templates.js");

const DEMO_PERIODS = {
  base: "2026-05",
  current: "2026-06",
};
const DEMO_COUNTRY = "巴西";
const REGION_ORDER = ["欧洲", "拉美", "中东", "亚太"];
const METRIC_ORDER = ["销量", "净收入", "边际"];

function round(value, digits = 6) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function sum(rows, field) {
  return rows.reduce((total, row) => total + Number(row?.[field] || 0), 0);
}

function unitMargin(rows) {
  const volume = sum(rows, "销量");
  return volume === 0 ? 0 : sum(rows, "边际") / volume;
}

function selectScenarioRows(rows, scenario, period, predicate = () => true) {
  return rows.filter((row) => (
    row["数据口径"] === scenario
    && row["月份"] === period
    && predicate(row)
  ));
}

function reconcileBridgeItems(items, targetChange) {
  const reconciled = items.map((item) => ({
    label: item.label,
    value: round(item.value),
  }));
  if (!reconciled.length) return reconciled;
  const priorTotal = reconciled
    .slice(0, -1)
    .reduce((total, item) => total + item.value, 0);
  reconciled[reconciled.length - 1].value = round(targetChange - priorTotal);
  return reconciled;
}

function buildUnitMarginBridge(baseRows, currentRows) {
  const models = Array.from(new Set([
    ...baseRows.map((row) => row["车型"]),
    ...currentRows.map((row) => row["车型"]),
  ]));
  const baseVolume = sum(baseRows, "销量");
  const currentVolume = sum(currentRows, "销量");
  const startValue = round(unitMargin(baseRows));
  const endValue = round(unitMargin(currentRows));
  const rawStartValue = unitMargin(baseRows);

  const rawItems = models.map((model) => {
    const baseModelRows = baseRows.filter((row) => row["车型"] === model);
    const currentModelRows = currentRows.filter((row) => row["车型"] === model);
    const baseModelVolume = sum(baseModelRows, "销量");
    const currentModelVolume = sum(currentModelRows, "销量");
    const baseRate = baseModelVolume === 0 ? rawStartValue : unitMargin(baseModelRows);
    const currentRate = currentModelVolume === 0 ? baseRate : unitMargin(currentModelRows);
    const baseWeight = baseVolume === 0 ? 0 : baseModelVolume / baseVolume;
    const currentWeight = currentVolume === 0 ? 0 : currentModelVolume / currentVolume;
    const mixEffect = (currentWeight - baseWeight) * (baseRate - rawStartValue);
    const rateEffect = currentWeight * (currentRate - baseRate);
    return {
      label: model,
      value: mixEffect + rateEffect,
    };
  });

  return {
    startValue,
    endValue,
    items: reconcileBridgeItems(rawItems, round(endValue - startValue)),
  };
}

function buildTotalMarginBridge(baseRows, currentRows) {
  const countries = Array.from(new Set([
    ...baseRows.map((row) => row["国家"]),
    ...currentRows.map((row) => row["国家"]),
  ]));
  const startValue = round(sum(baseRows, "边际"));
  const endValue = round(sum(currentRows, "边际"));
  const rawItems = countries.map((country) => ({
    label: country,
    value: sum(currentRows.filter((row) => row["国家"] === country), "边际")
      - sum(baseRows.filter((row) => row["国家"] === country), "边际"),
  }));

  return {
    startValue,
    endValue,
    items: reconcileBridgeItems(rawItems, round(endValue - startValue)),
  };
}

function buildFinanceAIDemoStory() {
  const actualRows = financeTemplates.createOperatingDetailSampleRows({
    months: [DEMO_PERIODS.base, DEMO_PERIODS.current],
  });
  const scenarioRows = financeTemplates.createBudgetOperatingDetailRows(actualRows);
  const scenarioRowsFor = (scenario, period, predicate) => selectScenarioRows(
    scenarioRows,
    scenario,
    period,
    predicate,
  );
  const actualRowsFor = (period, predicate = () => true) => scenarioRowsFor("实际", period, predicate);

  const regionScenario = {
    actual: REGION_ORDER.map((region) => ({
      label: region,
      value: round(sum(scenarioRowsFor("实际", DEMO_PERIODS.current, (row) => row["大区"] === region), "销量")),
    })),
    budget: REGION_ORDER.map((region) => ({
      label: region,
      value: round(sum(scenarioRowsFor("预算", DEMO_PERIODS.current, (row) => row["大区"] === region), "销量")),
    })),
  };

  const countryActual = scenarioRowsFor(
    "实际",
    DEMO_PERIODS.current,
    (row) => row["国家"] === DEMO_COUNTRY,
  );
  const countryBudget = scenarioRowsFor(
    "预算",
    DEMO_PERIODS.current,
    (row) => row["国家"] === DEMO_COUNTRY,
  );
  const countryMetrics = METRIC_ORDER.map((metric) => {
    const budget = round(sum(countryBudget, metric));
    const actual = round(sum(countryActual, metric));
    return {
      label: metric,
      budget,
      actual,
      completion: round(budget === 0 ? 0 : actual / budget),
    };
  });

  const baseCountryRows = actualRowsFor(
    DEMO_PERIODS.base,
    (row) => row["国家"] === DEMO_COUNTRY,
  );
  const currentCountryRows = actualRowsFor(
    DEMO_PERIODS.current,
    (row) => row["国家"] === DEMO_COUNTRY,
  );
  const baseRows = actualRowsFor(DEMO_PERIODS.base);
  const currentRows = actualRowsFor(DEMO_PERIODS.current);

  const regionMom = REGION_ORDER.map((region) => {
    const regionBaseRows = baseRows.filter((row) => row["大区"] === region);
    const regionCurrentRows = currentRows.filter((row) => row["大区"] === region);
    return {
      label: region,
      baseVolume: round(sum(regionBaseRows, "销量")),
      currentVolume: round(sum(regionCurrentRows, "销量")),
      baseUnitMargin: round(unitMargin(regionBaseRows)),
      currentUnitMargin: round(unitMargin(regionCurrentRows)),
    };
  });

  return {
    periods: { ...DEMO_PERIODS },
    country: DEMO_COUNTRY,
    regionScenario,
    countryMetrics,
    countryUnitMarginBridge: buildUnitMarginBridge(baseCountryRows, currentCountryRows),
    regionMom,
    totalMarginBridge: buildTotalMarginBridge(baseRows, currentRows),
  };
}

module.exports = {
  buildFinanceAIDemoStory,
};
