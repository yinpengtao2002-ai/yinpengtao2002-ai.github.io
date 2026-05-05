import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const hero = await readFile(new URL("../src/components/home/CapabilityHero.tsx", import.meta.url), "utf8");
const financeSection = await readFile(new URL("../src/components/home/HomeFinanceSection.tsx", import.meta.url), "utf8");
const thinkingSection = await readFile(new URL("../src/components/home/HomeThinkingSection.tsx", import.meta.url), "utf8");
const thinkingLab = await readFile(new URL("../src/components/thinking/ThinkingLabClient.tsx", import.meta.url), "utf8");
const globals = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");

const publicHomeCopy = [hero, financeSection, thinkingSection, thinkingLab].join("\n");

test("home hero does not split AI workflow and thinking judgment into separate proof cards", () => {
  assert.doesNotMatch(hero, /title:\s*"AI 工作流"/);
  assert.doesNotMatch(hero, /title:\s*"思考判断"/);
  assert.match(hero, /业务理解/);
  assert.match(hero, /方法沉淀/);
});

test("home page has an explicit continue cue for below-the-fold content", () => {
  assert.match(hero, /继续看/);
  assert.match(hero, /#finance/);
  assert.match(hero, /home-hero-continue/);
  assert.match(hero, /home-hero-continue-row/);
  assert.doesNotMatch(hero, /home-secondary-action/);
});

test("home hero uses a refined headline treatment without low-value summary copy", () => {
  assert.match(hero, /home-hero-copy-card/);
  assert.match(hero, /home-headline-mark/);
  assert.match(hero, /home-headline-line/);
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
  assert.match(globals, /@media\s*\(max-height:\s*760px\)/);
});

test("home continue cue stays in normal layout flow", () => {
  assert.doesNotMatch(globals, /\.home-hero-continue\s*\{[^}]*position:\s*absolute/s);
  assert.match(globals, /\.home-hero-continue-row/);
});
