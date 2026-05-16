import test from "node:test";
import assert from "node:assert/strict";

const { getInternalRouteCards, getMarkdownRouteBlocks } = await import(
  "../src/lib/chatRouteCards.ts"
);

test("chat route cards are attached to the paragraph that mentions the model", () => {
  const markdown = [
    "预算复盘先看 [预算实际对比模型](/finance/business-analysis)，再定位销量、收入和边际问题。",
    "",
    "如果只想解释两期单车指标为什么变了，可以看 [单车指标变动归因模型](/finance/margin-analysis)。",
  ].join("\n");

  const blocks = getMarkdownRouteBlocks(markdown);

  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].cards.length, 1);
  assert.equal(blocks[0].cards[0].href, "/finance/business-analysis");
  assert.equal(blocks[1].cards.length, 1);
  assert.equal(blocks[1].cards[0].href, "/finance/margin-analysis");
});

test("chat route cards dedupe repeated links inside the same paragraph", () => {
  const cards = getInternalRouteCards(
    "可以先打开 [预算实际对比模型](/finance/business-analysis)，也就是 [/finance/business-analysis](/finance/business-analysis)。",
  );

  assert.equal(cards.length, 1);
  assert.equal(cards[0].title, "预算实际对比模型");
});
