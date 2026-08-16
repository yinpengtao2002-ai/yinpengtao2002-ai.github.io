import test from "node:test";
import assert from "node:assert/strict";

const financeTemplates = await import("../src/lib/finance/templates.js");
const demoStoryModule = await import("../src/lib/finance-ai/demo-story.js");

const { createBudgetOperatingDetailRows, createOperatingDetailSampleRows } = financeTemplates.default;
const { buildFinanceAIDemoStory } = demoStoryModule.default;

function round(value, digits = 6) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function sum(rows, field) {
  return rows.reduce((total, row) => total + Number(row[field] || 0), 0);
}

test("finance AI read-only demo is fully reproducible from the canonical operating story", () => {
  const story = buildFinanceAIDemoStory();
  const actualRows = createOperatingDetailSampleRows({ months: [story.periods.base, story.periods.current] });
  const scenarioRows = createBudgetOperatingDetailRows(actualRows);
  const scenario = (label, period, predicate = () => true) => scenarioRows.filter((row) => (
    row.数据口径 === label && row.月份 === period && predicate(row)
  ));

  assert.deepEqual(story.periods, { base: "2026-05", current: "2026-06" });
  assert.equal(story.country, "巴西");
  assert.deepEqual(story.regionScenario.actual.map((item) => item.label), ["欧洲", "拉美", "中东", "亚太"]);
  assert.deepEqual(story.regionScenario.budget.map((item) => item.label), ["欧洲", "拉美", "中东", "亚太"]);

  for (const item of story.regionScenario.actual) {
    const expected = sum(scenario("实际", story.periods.current, (row) => row.大区 === item.label), "销量");
    assert.equal(item.value, round(expected));
  }
  for (const item of story.regionScenario.budget) {
    const expected = sum(scenario("预算", story.periods.current, (row) => row.大区 === item.label), "销量");
    assert.equal(item.value, round(expected));
  }

  const countryActual = scenario("实际", story.periods.current, (row) => row.国家 === story.country);
  const countryBudget = scenario("预算", story.periods.current, (row) => row.国家 === story.country);
  const expectedCountryMetrics = {
    "销量": [sum(countryBudget, "销量"), sum(countryActual, "销量")],
    "净收入": [sum(countryBudget, "净收入"), sum(countryActual, "净收入")],
    "边际": [sum(countryBudget, "边际"), sum(countryActual, "边际")],
  };
  for (const metric of story.countryMetrics) {
    const [budget, actual] = expectedCountryMetrics[metric.label];
    assert.equal(metric.budget, round(budget));
    assert.equal(metric.actual, round(actual));
    assert.equal(metric.completion, round(budget === 0 ? 0 : actual / budget));
  }

  const baseCountry = scenario("实际", story.periods.base, (row) => row.国家 === story.country);
  const currentCountry = scenario("实际", story.periods.current, (row) => row.国家 === story.country);
  assert.equal(story.countryUnitMarginBridge.startValue, round(sum(baseCountry, "边际") / sum(baseCountry, "销量")));
  assert.equal(story.countryUnitMarginBridge.endValue, round(sum(currentCountry, "边际") / sum(currentCountry, "销量")));
  assert.equal(
    round(story.countryUnitMarginBridge.items.reduce((total, item) => total + item.value, story.countryUnitMarginBridge.startValue)),
    story.countryUnitMarginBridge.endValue,
  );

  const baseMargin = sum(scenario("实际", story.periods.base), "边际");
  const currentMargin = sum(scenario("实际", story.periods.current), "边际");
  assert.equal(story.totalMarginBridge.startValue, round(baseMargin));
  assert.equal(story.totalMarginBridge.endValue, round(currentMargin));
  assert.equal(
    round(story.totalMarginBridge.items.reduce((total, item) => total + item.value, story.totalMarginBridge.startValue)),
    story.totalMarginBridge.endValue,
  );

  const canonicalLabels = new Set(actualRows.flatMap((row) => [row.大区, row.国家, row.车型]));
  const displayedLabels = [
    ...story.regionScenario.actual.map((item) => item.label),
    ...story.countryUnitMarginBridge.items.map((item) => item.label),
    ...story.totalMarginBridge.items.map((item) => item.label),
  ];
  assert.ok(displayedLabels.every((label) => canonicalLabels.has(label)), "demo labels must come from canonical business dimensions");
});
