import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const registry = JSON.parse(
  await readFile(new URL("../src/lib/finance/model-registry.json", import.meta.url), "utf8")
);

test("finance registry contains the approved categories in order", () => {
  assert.deepEqual(
    registry.categories.map((category) => category.id),
    ["budget-review", "trend-monitoring", "profit-simulation", "unit-attribution"]
  );
});

test("finance registry contains the four existing model routes", () => {
  assert.deepEqual(
    registry.models.map((model) => model.slug).sort(),
    ["business-analysis", "margin-analysis", "monthly-trend", "sensitivity-analysis"]
  );
  for (const model of registry.models) {
    assert.match(model.href, /^\/finance\/[a-z-]+$/);
    assert.equal(typeof model.summary, "string");
    assert.ok(model.summary.length >= 18, `${model.slug} summary should be visitor-facing`);
    assert.ok(Array.isArray(model.aiGuide.steps), `${model.slug} needs AI guide steps`);
    assert.ok(model.aiGuide.steps.length >= 3, `${model.slug} needs at least three usage steps`);
  }
});

test("finance registry maps every model to an existing category", () => {
  const categories = new Set(registry.categories.map((category) => category.id));
  for (const model of registry.models) {
    assert.ok(categories.has(model.categoryId), `${model.slug} has unknown category ${model.categoryId}`);
  }
});
