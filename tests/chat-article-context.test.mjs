import test from "node:test";
import assert from "node:assert/strict";

const {
  buildActiveThinkingArticlePrompt,
  getArticleFallbackFocus,
  getCachedArticleSummary,
  selectRelevantArticleSections,
} = await import("../src/lib/chatArticleContext.ts");

const longArticle = {
  id: 999,
  slug: "long-context-test",
  title: "长文章上下文测试",
  description: "这是一篇用来验证文章助手不会塞全文的长文章。",
  date: "2026-05-16",
  category: "AI 工作流",
  href: "/thinking-lab/long-context-test",
  content: [
    "# 开头",
    "这篇文章先说明基本观点：AI 助手应该像工作台，而不是许愿池。",
    "",
    "## 原则 0：别对 AI 许愿，把它当作工作台",
    "原则 0 的正文只用于干扰检索。ZERO_ONLY_MARKER ".repeat(80),
    "",
    "## 原则 8：改产线，不改结果",
    "这一节强调不要只修补单次输出，而是回到上游流程、任务拆解、评价标准和反馈机制。PIPELINE_SECTION_MARKER ".repeat(50),
    "",
    "## 材料与品味",
    "这一节强调材料来自真实世界，品味来自长期训练。MATERIAL_TASTE_MARKER ".repeat(60),
    "",
    "## 结语",
    "最后的结论是：把焦虑换成手感，用流程管理新工具。",
  ].join("\n"),
};

test("article prompt keeps compact metadata and does not include the full body", () => {
  const prompt = buildActiveThinkingArticlePrompt(longArticle, "总结这篇文章");

  assert.match(prompt, /当前打开的文章：长文章上下文测试/);
  assert.match(prompt, /文章目录/);
  assert.match(prompt, /文章摘要缓存/);
  assert.match(prompt, /相关正文片段/);
  assert.match(prompt, /原则 8：改产线，不改结果/);
  assert.doesNotMatch(prompt, /ZERO_ONLY_MARKER ZERO_ONLY_MARKER ZERO_ONLY_MARKER ZERO_ONLY_MARKER/);
  assert.ok(prompt.length < 3600, `prompt should stay compact, got ${prompt.length}`);
});

test("article retrieval selects the section that matches the user's question", () => {
  const sections = selectRelevantArticleSections(longArticle, "原则 8 怎么理解？", { maxSections: 2 });
  const joined = sections.map((section) => section.text).join("\n");

  assert.match(joined, /原则 8：改产线，不改结果/);
  assert.match(joined, /PIPELINE_SECTION_MARKER/);
  assert.doesNotMatch(joined, /ZERO_ONLY_MARKER/);
});

test("article summary cache exposes stable summary material without expanding the full article", () => {
  const first = getCachedArticleSummary(longArticle);
  const second = getCachedArticleSummary(longArticle);

  assert.equal(first, second);
  assert.match(first.text, /这是一篇用来验证文章助手不会塞全文的长文章/);
  assert.match(first.text, /开头/);
  assert.match(first.text, /结语/);
  assert.ok(first.text.length < 1400, `summary cache should stay compact, got ${first.text.length}`);
});

test("fallback focus uses the same compact article summary path", () => {
  const focus = getArticleFallbackFocus(longArticle);

  assert.match(focus, /可以先抓住这几层/);
  assert.match(focus, /原则 8：改产线，不改结果/);
  assert.doesNotMatch(focus, /PIPELINE_SECTION_MARKER PIPELINE_SECTION_MARKER/);
});
