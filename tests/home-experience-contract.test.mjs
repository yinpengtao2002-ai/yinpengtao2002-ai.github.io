import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const hero = await readFile(new URL("../src/components/home/CapabilityHero.tsx", import.meta.url), "utf8");
const financeSection = await readFile(new URL("../src/components/home/HomeFinanceSection.tsx", import.meta.url), "utf8");
const thinkingSection = await readFile(new URL("../src/components/home/HomeThinkingSection.tsx", import.meta.url), "utf8");
const thinkingLab = await readFile(new URL("../src/components/thinking/ThinkingLabClient.tsx", import.meta.url), "utf8");
const contactSection = await readFile(new URL("../src/components/home/HomeContactSection.tsx", import.meta.url), "utf8");
const globals = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
const viewportHook = await readFile(new URL("../src/lib/useLowMotionMode.ts", import.meta.url), "utf8");

const publicHomeCopy = [hero, financeSection, thinkingSection, thinkingLab].join("\n");

test("home hero does not split AI workflow and thinking judgment into separate proof cards", () => {
  assert.doesNotMatch(hero, /title:\s*"AI 工作流"/);
  assert.doesNotMatch(hero, /title:\s*"思考判断"/);
  assert.match(hero, /业务理解/);
  assert.match(hero, /方法沉淀/);
});

test("home page has an explicit continue cue for below-the-fold content", () => {
  assert.match(hero, /下一屏 · 财务模型/);
  assert.match(hero, /#finance/);
  assert.match(hero, /home-hero-continue/);
  assert.match(hero, /home-hero-continue-row/);
  assert.doesNotMatch(hero, /home-secondary-action/);
});

test("home hero returns to a split Lucas plus product-stage layout", () => {
  assert.match(hero, /home-hero-split/);
  assert.match(hero, /home-hero-left/);
  assert.match(hero, /home-hero-right/);
  assert.match(hero, /home-hero-right-stack/);
  assert.match(hero, /home-hero-copy-card/);
  assert.match(hero, /Lucas Yin/);
  assert.match(hero, /奇瑞汽车国际财务 BP/);
  assert.match(hero, /从经营问题到模型、图表和 AI 解读/);
  assert.doesNotMatch(hero, /home-identity-panel/);
  assert.doesNotMatch(hero, /home-hero-center/);
});

test("home hero split layout has concrete responsive styling", () => {
  assert.match(globals, /\.home-hero-split\s*\{/);
  assert.match(globals, /grid-template-columns:\s*minmax\(300px,\s*0\.82fr\)\s*minmax\(440px,\s*1\.18fr\)/);
  assert.match(globals, /\.home-hero-left\s*\{/);
  assert.match(globals, /text-align:\s*left/);
  assert.match(globals, /\.home-hero-right-stack\s*\{/);
  assert.match(globals, /\.home-hero-slogan\s*\{/);
  assert.doesNotMatch(globals, /\.home-hero-center\s*\{/);
  assert.doesNotMatch(globals, /\.home-hero-product-shell\s*\{/);
});

test("home hero desktop intro shifts Lucas left as the right panel enters", () => {
  assert.match(hero, /leftInitial/);
  assert.match(hero, /rightInitial/);
  assert.match(hero, /x: "32vw"/);
  assert.match(hero, /x: "8vw"/);
  assert.match(hero, /delay: 0.28/);
  assert.match(hero, /lowMotion/);
});

test("viewport profile and hero animation avoid mobile hydration drift", () => {
  assert.match(viewportHook, /useState\(false\)/);
  assert.ok(viewportHook.includes('MOBILE_LIKE_QUERY = "(pointer: coarse), (hover: none), (max-width: 768px)"'));
  assert.match(viewportHook, /matchMedia\(MOBILE_LIKE_QUERY\)/);
  assert.match(hero, /lowMotion \? \{ opacity: 1, x: 0, y: 0 \}/);
});

test("home hero left side carries capability evidence without low-value summary copy", () => {
  assert.match(hero, /home-hero-eyebrow/);
  assert.match(hero, /home-hero-lede/);
  assert.match(hero, /home-hero-proof-list/);
  assert.match(hero, /先把经营问题拆清楚/);
  assert.match(globals, /\.home-hero-proof-list\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s);
  assert.doesNotMatch(hero, /我还是职场新人/);
});

test("home hero uses the product stage visual instead of decorative artifacts", () => {
  assert.match(hero, /ProductStageVisual/);
  assert.doesNotMatch(hero, /ArtifactCard/);
  assert.doesNotMatch(hero, /CodeArtifact/);
  assert.doesNotMatch(hero, /ChartArtifact/);
  assert.doesNotMatch(hero, /ImageArtifact/);
});

test("visitor-facing copy avoids redesign-process language", () => {
  const banned = [
    "合并成",
    "改造",
    "改版",
    "旧页面",
    "旧结构",
    "不再",
    "站内索引",
    "fallback",
    "生成内容",
  ];

  for (const word of banned) {
    assert.doesNotMatch(publicHomeCopy, new RegExp(word), `Found visitor-facing process word: ${word}`);
  }
});

test("home viewport sections use resilient sizing for shorter desktop heights", () => {
  assert.match(globals, /\.home-viewport/);
  assert.match(globals, /min-height:\s*min\(100dvh,\s*760px\)/);
  assert.match(globals, /@media\s*\(max-height:\s*820px\)\s*and\s*\(min-width:\s*769px\)\s*\{\s*\.home-viewport/s);
});

test("home continue cue stays in normal layout flow", () => {
  assert.doesNotMatch(globals, /\.home-hero-continue\s*\{[^}]*position:\s*absolute/s);
  assert.match(globals, /\.home-hero-continue-row/);
});

test("homepage finance section previews models as a composed showcase", () => {
  assert.match(financeSection, /home-finance-showcase/);
  assert.match(financeSection, /home-finance-stage/);
  assert.match(financeSection, /home-finance-switcher/);
  assert.doesNotMatch(financeSection, /FinanceModelLibrary compact/);
});

test("homepage finance section defaults to the unit attribution model and switches on hover", () => {
  assert.match(financeSection, /DEFAULT_MODEL_SLUG = "margin-analysis"/);
  assert.match(financeSection, /useState/);
  assert.match(financeSection, /onMouseEnter/);
  assert.match(financeSection, /onFocus/);
  assert.match(financeSection, /onMouseLeave/);
  assert.doesNotMatch(financeSection, /financeModels\[0\]/);
  assert.doesNotMatch(financeSection, /slice\(1\)/);
});

test("home thinking section is a text-first method index", () => {
  assert.match(thinkingSection, /home-thinking-method-index/);
  assert.match(thinkingSection, /home-thinking-note/);
  assert.match(thinkingSection, /home-thinking-list/);
  assert.match(thinkingSection, /判断如何形成/);
  assert.match(thinkingSection, /方法摘句/);
  assert.doesNotMatch(thinkingSection, /next\/image/);
  assert.doesNotMatch(thinkingSection, /<Image/);
  assert.match(globals, /\.home-thinking-method-index\s*\{/);
  assert.match(globals, /\.home-thinking-list\s*\{/);
});

test("contact section includes Lucas phone number", () => {
  assert.match(contactSection, /15140319603/);
  assert.match(contactSection, /电话/);
});
