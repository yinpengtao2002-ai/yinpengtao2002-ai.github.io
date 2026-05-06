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
  assert.match(hero, /浏览更多/);
  assert.match(hero, /查看财务模型/);
  assert.doesNotMatch(hero, /下一屏 · 财务模型/);
  assert.match(hero, /#finance/);
  assert.match(hero, /handleBrowseMore/);
  assert.match(hero, /scrollIntoView/);
  assert.match(hero, /behavior:\s*prefersReducedMotion \? "auto" : "smooth"/);
  assert.match(hero, /href="#finance" className="home-primary-action" onClick=\{handleBrowseMore\}/);
  assert.doesNotMatch(hero, /href="\/finance" className="home-primary-action"/);
  assert.doesNotMatch(hero, /href="\/finance" className="home-hero-continue"/);
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
  assert.match(hero, /gradient-text/);
  assert.doesNotMatch(hero, /home-identity-panel/);
  assert.doesNotMatch(hero, /home-hero-center/);
});

test("home hero split layout has concrete responsive styling", () => {
  assert.match(globals, /\.home-hero-split\s*\{/);
  assert.match(globals, /grid-template-columns:\s*minmax\(420px,\s*0\.84fr\)\s*minmax\(560px,\s*1\.16fr\)/);
  assert.match(globals, /gap:\s*clamp\(2rem,\s*4vw,\s*4\.25rem\)/);
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
  assert.match(hero, /x: "min\(430px, 32vw\)"/);
  assert.match(hero, /x: "min\(110px, 8vw\)"/);
  assert.doesNotMatch(hero, /x: "32vw"/);
  assert.doesNotMatch(hero, /x: "8vw"/);
  assert.match(hero, /centerHoldDelay = isMobileLike \? 0\.95 : 1/);
  assert.match(hero, /delay: centerHoldDelay/);
  assert.match(hero, /delay: centerHoldDelay \+ 0\.12/);
  assert.match(hero, /lowMotion/);
});

test("home hero mobile intro moves Lucas upward before revealing the product stage", () => {
  assert.match(hero, /isMobileLike/);
  assert.match(hero, /prefersReducedMotion/);
  assert.match(hero, /y: "20svh"/);
  assert.match(hero, /key=\{`hero-left-\$\{isMobileLike \? "mobile" : "desktop"\}`\}/);
  assert.match(globals, /@media\s*\(max-width:\s*768px\)[\s\S]*\.home-hero-slogan\s*\{[\s\S]*display:\s*none/s);
  assert.match(globals, /@media\s*\(max-width:\s*768px\)[\s\S]*\.home-hero-lede\s*\{[\s\S]*display:\s*none/s);
  assert.match(globals, /@media\s*\(max-width:\s*768px\)[\s\S]*\.home-hero-copy-card\s*\{[\s\S]*display:\s*none/s);
  assert.match(globals, /@media\s*\(max-width:\s*768px\)[\s\S]*\.home-hero-workflow-strip\s*\{[\s\S]*display:\s*grid/s);
}
);

test("viewport profile and hero animation avoid mobile hydration drift", () => {
  assert.match(viewportHook, /useState\(false\)/);
  assert.ok(viewportHook.includes('MOBILE_LIKE_QUERY = "(pointer: coarse), (hover: none), (max-width: 768px)"'));
  assert.match(viewportHook, /matchMedia\(MOBILE_LIKE_QUERY\)/);
  assert.match(hero, /const heroAnimate = \{ opacity: 1, x: 0, y: 0 \}/);
});

test("home hero left side keeps identity focused without duplicated cards or buttons", () => {
  assert.match(hero, /home-hero-eyebrow/);
  assert.match(hero, /home-hero-lede/);
  assert.match(hero, /我们需要的是对技术有极致热情的人，而不是习惯用经验找答案的人/);
  assert.doesNotMatch(hero, /从业务问题出发，持续打磨经营分析、财务模型与 AI 工作流/);
  assert.doesNotMatch(hero, /我把真实经营分析中的预算、单车、趋势和利润问题/);
  assert.doesNotMatch(hero, /home-hero-proof-list/);
  assert.doesNotMatch(hero, /home-hero-actions/);
  assert.match(hero, /home-hero-right-stack/);
  assert.match(hero, /home-hero-workflow-strip/);
  assert.doesNotMatch(hero, /我还是职场新人/);
});

test("home hero uses the product stage visual instead of decorative artifacts", () => {
  assert.match(hero, /ProductStageVisual/);
  assert.doesNotMatch(hero, /ArtifactCard/);
  assert.doesNotMatch(hero, /CodeArtifact/);
  assert.doesNotMatch(hero, /ChartArtifact/);
  assert.doesNotMatch(hero, /ImageArtifact/);
});

test("home hero keeps the floating mini widgets as left-edge accents only", () => {
  assert.match(hero, /home-hero-floating-widgets/);
  assert.match(hero, /home-mini-widget/);
  assert.match(hero, /home-mini-widget-bars/);
  assert.match(hero, /home-mini-widget-dots/);
  assert.match(globals, /\.home-hero-floating-widgets\s*\{/);
  assert.match(globals, /\.home-mini-widget\s*\{/);
  assert.match(globals, /pointer-events:\s*none/);
  assert.match(globals, /position:\s*absolute/);
  assert.match(globals, /\.home-hero-floating-widgets\s*\{[^}]*inset:\s*0/s);
  assert.match(globals, /\.home-hero-floating-widgets\s*\{[^}]*z-index:\s*3/s);
  assert.match(globals, /\.home-mini-widget-window\s*\{[^}]*left:\s*clamp\(-150px,\s*-10vw,\s*-112px\)/s);
  assert.match(globals, /\.home-mini-widget-bars\s*\{[^}]*left:\s*clamp\(-118px,\s*-8vw,\s*-86px\)/s);
  assert.match(globals, /\.home-mini-widget-dots\s*\{[^}]*left:\s*clamp\(-186px,\s*-13vw,\s*-138px\)/s);
  assert.match(globals, /\.home-mini-widget-status\s*\{[^}]*left:\s*clamp\(-166px,\s*-11vw,\s*-120px\)/s);
  assert.doesNotMatch(globals, /\.home-mini-widget-dots\s*\{[^}]*right:/s);
  assert.doesNotMatch(globals, /\.home-mini-widget-status\s*\{[^}]*right:/s);
  assert.match(globals, /@media\s*\(max-width:\s*1180px\)[\s\S]*\.home-hero-floating-widgets\s*\{[\s\S]*display:\s*none/s);
  assert.match(globals, /\.product-stage-visual\s*\{[^}]*z-index:\s*2/s);
  assert.match(globals, /@keyframes\s+home-widget-float/);
  assert.match(globals, /animation:\s*home-widget-float/);
  assert.match(globals, /@keyframes\s+home-bar-breathe/);
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

test("home viewport sections fill the current viewport after smooth scroll", () => {
  assert.match(globals, /\.home-viewport/);
  assert.match(globals, /\.home-viewport\s*\{\s*min-height:\s*100dvh;/);
  assert.doesNotMatch(globals, /\.home-viewport\s*\{\s*min-height:\s*min\(100dvh,\s*760px\)/);
  assert.match(globals, /\.home-section\s*\{[^}]*padding:\s*clamp\(2\.6rem,\s*5\.5vh,\s*3\.8rem\)\s*0/s);
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
  assert.match(financeSection, /home-finance-switch-open/);
  assert.match(financeSection, /打开模型/);
  assert.match(globals, /\.home-finance-section \.finance-model-preview-image\s*\{[^}]*object-fit:\s*contain/s);
  assert.match(globals, /\.home-finance-stage \.finance-model-preview\s*\{[^}]*aspect-ratio:\s*1\.5/s);
  assert.doesNotMatch(financeSection, /FinanceModelLibrary compact/);
});

test("homepage finance section becomes a swipeable model preview carousel on mobile", () => {
  assert.match(globals, /@media\s*\(max-width:\s*768px\)[\s\S]*\.home-finance-section\s*\{[\s\S]*height:\s*100svh/s);
  assert.match(globals, /@media\s*\(max-width:\s*768px\)[\s\S]*\.home-finance-stage\s*\{[\s\S]*display:\s*none/s);
  assert.match(globals, /@media\s*\(max-width:\s*768px\)[\s\S]*\.home-finance-switcher\s*\{[\s\S]*display:\s*flex[\s\S]*overflow-x:\s*auto[\s\S]*scroll-snap-type:\s*x mandatory/s);
  assert.match(globals, /@media\s*\(max-width:\s*768px\)[\s\S]*\.home-finance-switch-card\s*\{[\s\S]*flex:\s*0 0/s);
  assert.match(globals, /@media\s*\(max-width:\s*768px\)[\s\S]*\.home-finance-switch-card \.finance-model-preview\s*\{[\s\S]*display:\s*block/s);
}
);

test("homepage finance section compresses in short desktop viewports", () => {
  assert.match(globals, /@media\s*\(max-height:\s*820px\)\s*and\s*\(min-width:\s*769px\)[\s\S]*\.home-section\.home-finance-section\s*\{[\s\S]*height:\s*100dvh[\s\S]*overflow:\s*hidden/s);
  assert.match(globals, /@media\s*\(max-height:\s*820px\)\s*and\s*\(min-width:\s*769px\)[\s\S]*\.home-finance-showcase\s*\{[\s\S]*max-height:\s*calc\(100dvh - 140px\)/s);
  assert.match(globals, /@media\s*\(max-height:\s*820px\)\s*and\s*\(min-width:\s*769px\)[\s\S]*\.home-finance-stage,\s*\.home-finance-switcher\s*\{[\s\S]*height:\s*min\(420px,\s*calc\(100dvh - 150px\)\)/s);
  assert.match(globals, /@media\s*\(max-height:\s*820px\)\s*and\s*\(min-width:\s*769px\)[\s\S]*\.home-finance-stage \.finance-model-preview\s*\{[\s\S]*aspect-ratio:\s*auto/s);
  assert.match(globals, /@media\s*\(max-height:\s*820px\)\s*and\s*\(min-width:\s*769px\)[\s\S]*\.home-finance-switch-card \.finance-model-preview\s*\{[\s\S]*aspect-ratio:\s*1\.95/s);
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

test("home thinking section uses a visual card and a clear index link", () => {
  assert.match(thinkingSection, /home-thinking-method-index/);
  assert.match(thinkingSection, /next\/image/);
  assert.match(thinkingSection, /home-thinking-visual-card/);
  assert.match(thinkingSection, /thinking-methods-tech\.png/);
  assert.doesNotMatch(thinkingSection, /home-hero-stage\.png/);
  assert.match(thinkingSection, /查看全部/);
  assert.match(thinkingSection, /href="\/thinking-lab"/);
  assert.match(thinkingSection, /home-thinking-list/);
  assert.match(thinkingSection, /方法摘句/);
  assert.doesNotMatch(thinkingSection, /METHOD_NOTES/);
  assert.doesNotMatch(thinkingSection, /判断如何形成/);
  assert.match(globals, /\.home-thinking-visual-card\s*\{/);
  assert.match(globals, /\.home-thinking-method-index\s*\{/);
  assert.match(globals, /\.home-thinking-list\s*\{/);
});

test("contact section includes Lucas phone number", () => {
  assert.match(contactSection, /15140319603/);
  assert.match(contactSection, /电话/);
});
