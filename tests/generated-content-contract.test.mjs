import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const generated = await readFile(
  new URL("../src/lib/data/generated/content.ts", import.meta.url),
  "utf8"
);

test("generated content exports finance and thinking surfaces", () => {
  assert.match(generated, /export const financeContent: ContentItem\[\]/);
  assert.match(generated, /export const thinkingContent: ContentItem\[\]/);
  assert.match(generated, /export function getThinkingBySlug/);
});

test("generated content does not emit old article hrefs for thinking content", () => {
  const thinkingBlock = generated.slice(generated.indexOf("export const thinkingContent"));
  assert.doesNotMatch(thinkingBlock, /\/article\/ai\//);
  assert.doesNotMatch(thinkingBlock, /\/article\/essays\//);
});

test("finance generated content points to finance tool routes", () => {
  assert.match(generated, /"href": "\/finance\/business-analysis"/);
  assert.match(generated, /"href": "\/finance\/monthly-trend"/);
  assert.match(generated, /"href": "\/finance\/sensitivity-analysis"/);
  assert.match(generated, /"href": "\/finance\/margin-analysis"/);
});
