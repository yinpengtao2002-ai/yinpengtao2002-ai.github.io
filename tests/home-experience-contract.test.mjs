import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const hero = await readFile(new URL("../src/components/home/CapabilityHero.tsx", import.meta.url), "utf8");
const homePage = await readFile(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const productStage = await readFile(new URL("../src/components/home/ProductStageVisual.tsx", import.meta.url), "utf8");
const heroModelStage = await readFile(new URL("../src/components/home/HeroModelStage.tsx", import.meta.url), "utf8").catch(() => "");
const financeSection = await readFile(new URL("../src/components/home/HomeFinanceSection.tsx", import.meta.url), "utf8");
const thinkingSection = await readFile(new URL("../src/components/home/HomeThinkingSection.tsx", import.meta.url), "utf8");
const thinkingLab = await readFile(new URL("../src/components/thinking/ThinkingLabClient.tsx", import.meta.url), "utf8");
const thinkingLabContent = await readFile(new URL("../src/lib/data/thinkingLabContent.ts", import.meta.url), "utf8");
const contactSection = await readFile(new URL("../src/components/home/HomeContactSection.tsx", import.meta.url), "utf8");
const globals = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
const viewportHook = await readFile(new URL("../src/lib/useLowMotionMode.ts", import.meta.url), "utf8");

const publicHomeCopy = [hero, financeSection, thinkingSection, thinkingLab].join("\n");

function cssRule(selector, css = globals, startAt = 0) {
  const selectorIndex = css.indexOf(selector, startAt);
  assert.notEqual(selectorIndex, -1, `Missing CSS selector: ${selector}`);
  const ruleStart = css.indexOf("{", selectorIndex);
  const ruleEnd = css.indexOf("}", ruleStart);
  return css.slice(selectorIndex, ruleEnd + 1);
}

function mobileCssRule(selector) {
  const mediaIndex = globals.indexOf("@media (max-width: 768px)");
  assert.notEqual(mediaIndex, -1, "Missing mobile media block");
  return cssRule(selector, globals, mediaIndex);
}

function shortDesktopCssRule(selector) {
  const mediaIndex = globals.indexOf("@media (max-height: 820px) and (min-width: 769px)");
  assert.notEqual(mediaIndex, -1, "Missing short desktop media block");
  return cssRule(selector, globals, mediaIndex);
}

test("home hero does not split AI workflow and thinking judgment into separate proof cards", () => {
  assert.doesNotMatch(hero, /title:\s*"AI 工作流"/);
  assert.doesNotMatch(hero, /title:\s*"思考判断"/);
  assert.doesNotMatch(hero, /title:\s*"业务理解"/);
  assert.doesNotMatch(hero, /title:\s*"方法沉淀"/);
  assert.match(hero, /HeroModelStage/);
});

test("home page has an explicit continue cue for below-the-fold content", () => {
  assert.match(hero, /浏览更多/);
  assert.match(hero, /浏览全部模型/);
  assert.doesNotMatch(hero, /下一屏 · 财务模型/);
  assert.match(hero, /#thinking/);
  assert.match(hero, /handleBrowseMore/);
  assert.match(hero, /getBoundingClientRect\(\)\.top \+ window\.scrollY/);
  assert.match(hero, /window\.scrollTo\(\{/);
  assert.match(hero, /behavior:\s*prefersReducedMotion \? "auto" : "smooth"/);
  assert.doesNotMatch(hero, /target\.scrollIntoView/);
  assert.match(hero, /href="\/finance" className="home-primary-action"/);
  assert.doesNotMatch(hero, /href="#finance" className="home-primary-action"/);
  assert.doesNotMatch(hero, /href="\/finance" className="home-hero-continue"/);
  assert.match(hero, /href="#thinking" className="home-hero-continue" onClick=\{handleBrowseMore\}/);
  assert.match(hero, /home-hero-continue/);
  assert.match(hero, /home-hero-continue-row/);
  assert.doesNotMatch(hero, /home-secondary-action/);
  assert.match(globals, /\.home-hero-continue\s*\{[^}]*position:\s*relative/s);
  assert.match(hero, /home-hero-continue-runner/);
  assert.match(globals, /\.home-hero-continue::before\s*\{[^}]*linear-gradient\(135deg/s);
  assert.doesNotMatch(globals, /\.home-hero-continue::before\s*\{[^}]*animation:\s*homeContinueRing/s);
  assert.match(globals, /\.home-hero-continue::before\s*\{[^}]*padding:\s*1px/s);
  assert.match(globals, /\.home-hero-continue::before\s*\{[^}]*mask-composite:\s*exclude/s);
  assert.match(globals, /\.home-hero-continue-runner\s*\{[^}]*animation:\s*homeContinueRunner/s);
  assert.match(globals, /@keyframes\s+homeContinueRunner/);
});

test("home page removes the duplicate finance section and links to the real finance page", () => {
  assert.doesNotMatch(homePage, /HomeFinanceSection/);
  assert.match(homePage, /<CapabilityHero \/>/);
  assert.match(homePage, /<HomeThinkingSection \/>/);
  assert.match(homePage, /<HomeContactSection \/>/);
  assert.match(hero, /href="\/finance" className="home-primary-action"/);
  assert.doesNotMatch(hero, /document\.getElementById\("finance"\)/);
});

test("home hero returns to a split Lucas plus product-stage layout", () => {
  assert.match(hero, /home-hero-split/);
  assert.match(hero, /home-hero-left/);
  assert.match(hero, /home-hero-right/);
  assert.match(hero, /home-hero-right-stack/);
  assert.match(hero, /home-hero-copy-card/);
  assert.match(hero, /home-hero-capability-trail/);
  assert.match(hero, /经营问题[\s\S]*财务模型[\s\S]*可视化分析[\s\S]*分析判断[\s\S]*业务结论/);
  assert.doesNotMatch(hero, /把经营问题，变成可计算的判断/);
  assert.doesNotMatch(hero, /<span className="home-headline-mark">从问题进入模型<\/span>/);
  assert.match(hero, /Lucas Yin/);
  assert.match(hero, /奇瑞汽车国际财务 BP/);
  assert.match(hero, /从经营问题到模型、判断和图表/);
  assert.match(hero, /gradient-text/);
  assert.match(cssRule(".home-hero-path-row"), /flex-wrap:\s*nowrap/);
  assert.match(mobileCssRule(".home-hero-path-row"), /flex-wrap:\s*nowrap/);
  assert.match(mobileCssRule(".home-hero-path-row"), /gap:\s*3px/);
  assert.match(cssRule(".home-hero-path-step"), /flex:\s*0 0 auto/);
  assert.match(cssRule(".home-hero-path-step"), /white-space:\s*nowrap/);
  assert.match(mobileCssRule(".home-hero-path-step"), /font-size:\s*9\.5px/);
  assert.match(mobileCssRule(".home-hero-path-step"), /padding-inline:\s*5px/);
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
  assert.match(mobileCssRule(".home-hero-copy-card"), /display:\s*block/);
  assert.match(globals, /@media\s*\(max-width:\s*768px\)[\s\S]*\.home-hero-stage-shell\s*\{[\s\S]*display:\s*grid/s);
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
  assert.match(hero, /HeroModelStage/);
  assert.doesNotMatch(hero, /home-hero-question-strip/);
  assert.doesNotMatch(hero, /我还是职场新人/);
});

test("home hero uses an interactive model stage instead of a static question grid", () => {
  assert.match(hero, /HeroModelStage/);
  assert.doesNotMatch(hero, /ProductStageVisual/);
  assert.match(heroModelStage, /HERO_MODEL_STAGES/);
  assert.match(heroModelStage, /useState/);
  assert.match(heroModelStage, /useEffect/);
  assert.match(heroModelStage, /useRef/);
  assert.match(heroModelStage, /SWIPE_THRESHOLD/);
  assert.match(heroModelStage, /\(index \+ direction \+ HERO_MODEL_STAGES\.length\) % HERO_MODEL_STAGES\.length/);
  assert.match(heroModelStage, /requestIdleCallback/);
  assert.match(heroModelStage, /home-hero-stage-preloader/);
  assert.match(heroModelStage, /markStageImageLoaded/);
  assert.match(heroModelStage, /home-hero-stage-skeleton/);
  assert.match(heroModelStage, /home-hero-stage-skeleton-window/);
  assert.match(heroModelStage, /is-loaded/);
  assert.match(heroModelStage, /onTouchStart/);
  assert.match(heroModelStage, /onTouchMove/);
  assert.match(heroModelStage, /onTouchEnd/);
  assert.match(heroModelStage, /home-hero-stage-dots/);
  assert.match(heroModelStage, /home-hero-stage-dot/);
  assert.match(heroModelStage, /当前模型轮播位置/);
  assert.doesNotMatch(heroModelStage, /左右滑动切换/);
  assert.match(heroModelStage, /onMouseEnter/);
  assert.match(heroModelStage, /onFocus/);
  assert.match(heroModelStage, /home-hero-stage-shell/);
  assert.match(heroModelStage, /home-hero-stage-panel/);
  assert.match(heroModelStage, /home-hero-stage-preview/);
  assert.match(heroModelStage, /home-hero-stage-picker/);
  assert.match(heroModelStage, /home-hero-stage-tab/);
  assert.match(heroModelStage, /选择一个经营问题，进入对应模型/);
  assert.match(heroModelStage, /href=\{stage\.href\}/);
  assert.match(heroModelStage, /aria-current=\{isActive \? "true" : undefined\}/);
  assert.match(heroModelStage, /onClick=\{\(\) => setActiveIndex\(index\)\}/);
  assert.doesNotMatch(heroModelStage, /aria-pressed=\{isActive\}/);
  assert.match(heroModelStage, /进入这个模型/);
  assert.match(heroModelStage, /单车为什么变了/);
  assert.match(heroModelStage, /预算偏在哪里/);
  assert.match(heroModelStage, /趋势哪里异常/);
  assert.match(heroModelStage, /哪个变量最影响利润/);
  assert.doesNotMatch(heroModelStage, /校对模型口径/);
  assert.doesNotMatch(heroModelStage, /home-hero-stage-glass/);
  const mobileStageNote = mobileCssRule(".home-hero-stage-float-note");
  assert.match(mobileStageNote, /display:\s*block/);
  assert.doesNotMatch(mobileStageNote, /display:\s*none/);
  assert.match(globals, /\.home-hero-stage-shell\s*\{/);
  assert.match(globals, /\.home-hero-stage-panel\s*\{/);
  assert.match(globals, /\.home-hero-stage-preview\s*\{/);
  assert.match(globals, /\.home-hero-stage-skeleton\s*\{/);
  assert.match(globals, /\.home-hero-stage-skeleton-window\s*\{/);
  assert.match(globals, /\.home-hero-stage-image\.is-loaded\s*\{/);
  assert.match(globals, /\.home-hero-stage-preloader\s*\{/);
  assert.match(globals, /\.home-hero-stage-tab\s*\{/);
  assert.match(globals, /@keyframes\s+homeHeroStageIn/);
  assert.doesNotMatch(globals, /\.home-hero-stage-glass/);
  assert.doesNotMatch(globals, /@keyframes\s+homeHeroStageFloat/);
  assert.match(productStage, /分析判断/);
  assert.doesNotMatch(productStage, /AI 解读/);
  assert.doesNotMatch(hero, /ArtifactCard/);
  assert.doesNotMatch(hero, /CodeArtifact/);
  assert.doesNotMatch(hero, /ChartArtifact/);
  assert.doesNotMatch(hero, /ImageArtifact/);
});

test("home hero arranges floating mini widgets around the Lucas identity", () => {
  assert.match(hero, /home-hero-floating-widgets/);
  assert.match(hero, /home-mini-widget/);
  assert.match(hero, /home-mini-widget-bars/);
  assert.doesNotMatch(hero, /home-mini-widget-dots/);
  assert.doesNotMatch(hero, /home-mini-widget-status/);
  const widgetClassMatches = hero.match(/className="home-mini-widget /g) ?? [];
  assert.equal(widgetClassMatches.length, 2);
  const leftStart = hero.indexOf('className="home-hero-left"');
  const leftEnd = hero.indexOf("</motion.div>", leftStart);
  const leftMarkup = hero.slice(leftStart, leftEnd);
  const rightStart = hero.indexOf('className="home-hero-right"');
  const rightEnd = hero.indexOf("</motion.div>", rightStart);
  const rightMarkup = hero.slice(rightStart, rightEnd);
  assert.match(leftMarkup, /FloatingMiniWidgets/);
  assert.match(hero, /function FloatingMiniWidgets/);
  assert.doesNotMatch(rightMarkup, /home-hero-floating-widgets/);
  assert.match(globals, /\.home-hero-floating-widgets\s*\{/);
  assert.match(globals, /\.home-mini-widget\s*\{/);
  assert.match(globals, /pointer-events:\s*none/);
  assert.match(globals, /position:\s*absolute/);
  assert.match(globals, /\.home-hero-floating-widgets\s*\{[^}]*inset:\s*0/s);
  assert.match(globals, /\.home-hero-floating-widgets\s*\{[^}]*z-index:\s*3/s);
  assert.match(globals, /\.home-hero-left\s*\{[^}]*position:\s*relative/s);
  assert.match(globals, /\.home-hero-left\s*>\s*:not\(\.home-hero-floating-widgets\)\s*\{/);
  assert.match(globals, /\.home-mini-widget-window\s*\{[^}]*top:\s*clamp\(-76px,\s*-8vh,\s*-48px\)[^}]*left:\s*clamp\(4px,\s*2\.4vw,\s*34px\)/s);
  assert.match(globals, /\.home-mini-widget-bars\s*\{[^}]*bottom:\s*clamp\(-62px,\s*-6vh,\s*-36px\)[^}]*right:\s*clamp\(14px,\s*3vw,\s*48px\)/s);
  assert.doesNotMatch(globals, /\.home-mini-widget-window\s*\{[^}]*right:/s);
  assert.match(globals, /@media\s*\(max-width:\s*1180px\)\s*and\s*\(min-width:\s*769px\)[\s\S]*\.home-hero-floating-widgets\s*\{[\s\S]*display:\s*none/s);
  assert.match(mobileCssRule(".home-hero-floating-widgets"), /display:\s*none/);
  assert.match(globals, /\.product-stage-visual\s*\{[^}]*z-index:\s*2/s);
  assert.match(globals, /@keyframes\s+home-widget-float/);
  assert.match(globals, /animation:\s*home-widget-float/);
  assert.match(globals, /@keyframes\s+home-bar-breathe/);
});

test("home mobile hero keeps the finance CTA card as a compact section", () => {
  assert.match(hero, /home-hero-copy-card/);
  assert.match(hero, /浏览全部模型/);
  assert.match(hero, /HeroModelStage/);
  const mobileCopyCard = mobileCssRule(".home-hero-copy-card");
  assert.doesNotMatch(mobileCopyCard, /display:\s*none/);
  assert.match(mobileCopyCard, /display:\s*block/);
});

test("home hero stages business-question controls without changing the finance section list", () => {
  assert.match(heroModelStage, /HERO_MODEL_STAGES/);
  assert.match(heroModelStage, /单车为什么变了/);
  assert.match(heroModelStage, /预算偏在哪里/);
  assert.match(heroModelStage, /趋势哪里异常/);
  assert.match(heroModelStage, /哪个变量最影响利润/);
  assert.match(heroModelStage, /\/finance\/margin-analysis/);
  assert.match(heroModelStage, /\/finance\/business-analysis/);
  assert.match(heroModelStage, /\/finance\/monthly-trend/);
  assert.match(heroModelStage, /\/finance\/sensitivity-analysis/);
  assert.match(hero, /href="\/finance"/);
  assert.doesNotMatch(hero, /href="#finance"/);
  assert.match(hero, /handleBrowseMore/);
  assert.doesNotMatch(hero, /home-hero-question-card/);
  assert.doesNotMatch(financeSection, /单车为什么变了/);
  assert.doesNotMatch(financeSection, /预算偏在哪里/);
  assert.doesNotMatch(financeSection, /趋势哪里异常/);
  assert.doesNotMatch(financeSection, /哪个变量最影响利润/);
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
  assert.match(financeSection, /home-finance-title-card/);
  assert.match(financeSection, /<h2 className="home-finance-title">\s*问题驱动的模型库\s*<\/h2>/);
  assert.doesNotMatch(financeSection, /MODEL LIBRARY/);
  assert.doesNotMatch(financeSection, /Finance Models/);
  assert.doesNotMatch(financeSection, /home-finance-title-meta/);
  assert.doesNotMatch(financeSection, /home-finance-title-copy/);
  assert.doesNotMatch(financeSection, /home-finance-title-prefix/);
  assert.doesNotMatch(financeSection, /home-finance-title-main/);
  assert.match(financeSection, /这里收录的是我自己搭建并持续打磨的财务模型和分析工具，适合从复盘、归因、趋势和情景推演开始使用。/);
  assert.doesNotMatch(financeSection, /按经营问题进入模型/);
  assert.doesNotMatch(financeSection, /四个模型对应四类常见经营问题/);
  assert.match(financeSection, /home-finance-showcase/);
  assert.match(financeSection, /home-finance-stage/);
  assert.match(financeSection, /home-finance-stage-motion/);
  assert.match(financeSection, /home-finance-stage-guide/);
  assert.match(financeSection, /怎么看/);
  assert.match(financeSection, /先确认总差异，再拆结构效应和费率效应/);
  assert.match(financeSection, /home-finance-reveal/);
  assert.match(financeSection, /whileInView/);
  assert.match(financeSection, /viewport=\{financeRevealViewport\}/);
  assert.match(financeSection, /filter: "blur\(6px\)"/);
  assert.match(financeSection, /clipPath: "inset\(10% 5% 8% 5% round 12px\)"/);
  assert.match(financeSection, /staggerChildren: 0\.07/);
  assert.match(financeSection, /home-finance-switch-card-motion/);
  assert.match(financeSection, /key=\{`finance-stage-\$\{activeModel\.slug\}`\}/);
  assert.match(financeSection, /home-finance-switcher/);
  assert.match(financeSection, /home-finance-switch-open/);
  assert.match(financeSection, /打开模型/);
  assert.match(globals, /\.home-finance-title-card\s*\{/);
  assert.match(globals, /\.home-finance-title-card::before/);
  assert.match(globals, /\.home-finance-title\s*\{[^}]*font-family:\s*var\(--font-hero-display\)/s);
  assert.match(globals, /\.home-finance-stage-frame::before/);
  assert.match(globals, /\.home-finance-stage-frame::after/);
  assert.match(globals, /\.home-finance-stage-motion\s*\{/);
  assert.match(globals, /@keyframes\s+home-finance-stage-enter/);
  assert.match(globals, /@keyframes\s+home-finance-preview-settle/);
  assert.match(globals, /@keyframes\s+home-finance-layer-drift/);
  assert.match(globals, /\.home-finance-section \.finance-model-preview-image\s*\{[^}]*object-fit:\s*contain/s);
  assert.match(globals, /\.home-finance-stage \.finance-model-preview\s*\{[^}]*aspect-ratio:\s*1\.5/s);
  assert.match(cssRule(".home-finance-reveal"), /will-change:\s*transform,\s*opacity/);
  assert.doesNotMatch(financeSection, /FinanceModelLibrary compact/);
});

test("homepage finance section uses an automatic mobile preview carousel with four model entries below", () => {
  assert.match(financeSection, /useEffect/);
  assert.match(financeSection, /useRef/);
  assert.match(financeSection, /mobileCarouselIndex/);
  assert.match(financeSection, /mobileCarouselVisualIndex/);
  assert.match(financeSection, /mobileCarouselTransitionEnabled/);
  assert.match(financeSection, /mobileCarouselInteractionKey/);
  assert.match(financeSection, /setMobileCarouselInteractionKey/);
  assert.match(financeSection, /MOBILE_FINANCE_QUERY = "\(max-width: 768px\)"/);
  assert.match(financeSection, /matchMedia\(MOBILE_FINANCE_QUERY\)\.matches/);
  assert.match(financeSection, /mobileCarouselSlides/);
  assert.match(financeSection, /\[switcherModels\.at\(-1\)!,\s*...switcherModels,\s*switcherModels\[0\]!\]/s);
  assert.match(financeSection, /setInterval/);
  assert.match(financeSection, /SWIPE_THRESHOLD/);
  assert.match(financeSection, /handleMobileCarouselTouchStart/);
  assert.match(financeSection, /handleMobileCarouselTouchMove/);
  assert.match(financeSection, /handleMobileCarouselTouchEnd/);
  assert.match(financeSection, /handleMobileCarouselTransitionEnd/);
  assert.match(financeSection, /mobileCarouselInteractionKey,\s*updateMobileCarousel/);
  assert.match(financeSection, /suppressMobileSlideClickRef/);
  assert.match(financeSection, /home-finance-mobile-carousel/);
  assert.match(financeSection, /home-finance-mobile-rise/);
  assert.match(financeSection, /home-finance-mobile-track/);
  assert.match(financeSection, /home-finance-mobile-slide/);
  assert.match(financeSection, /home-finance-mobile-dots/);
  assert.match(financeSection, /aria-label=\{`查看\$\{model\.title\}`\}/);
  assert.match(financeSection, /translateX\(\-\$\{mobileCarouselVisualIndex \* 100\}%\)/);
  assert.match(globals, /@media\s*\(max-width:\s*768px\)[\s\S]*\.home-section\.home-finance-section\s*\{[\s\S]*height:\s*100svh[\s\S]*min-height:\s*100svh[\s\S]*overflow:\s*hidden/s);
  assert.match(mobileCssRule(".home-finance-section"), /height:\s*100svh/);
  assert.match(mobileCssRule(".home-finance-section"), /min-height:\s*100svh/);
  assert.match(mobileCssRule(".home-finance-section"), /padding-bottom:\s*clamp\(4rem,\s*8\.4svh,\s*4\.6rem\)/);
  assert.match(mobileCssRule(".home-section.home-finance-section"), /height:\s*100svh/);
  assert.match(mobileCssRule(".home-finance-shell"), /display:\s*flex/);
  assert.match(mobileCssRule(".home-finance-shell"), /height:\s*100%/);
  assert.match(mobileCssRule(".home-finance-showcase"), /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(mobileCssRule(".home-finance-showcase"), /grid-template-rows:\s*clamp\(340px,\s*51svh,\s*430px\)\s*14px\s*minmax\(0,\s*1fr\)/);
  assert.match(mobileCssRule(".home-finance-showcase"), /align-content:\s*start/);
  assert.match(cssRule(".home-finance-mobile-carousel"), /display:\s*none/);
  assert.match(cssRule(".home-finance-mobile-dots"), /display:\s*none/);
  assert.match(mobileCssRule(".home-finance-title-card"), /padding:\s*10px\s*12px/);
  assert.match(globals, /@media\s*\(max-width:\s*768px\)[\s\S]*\.home-finance-title\s*\{[\s\S]*font-size:\s*clamp\(1\.28rem,\s*5\.8vw,\s*1\.62rem\)/s);
  assert.doesNotMatch(globals, /@media\s*\(max-width:\s*768px\)[\s\S]*\.home-finance-title\s*\{[^}]*white-space:\s*nowrap/s);
  assert.match(mobileCssRule(".home-finance-mobile-carousel"), /display:\s*block/);
  assert.match(mobileCssRule(".home-finance-mobile-carousel"), /min-height:\s*0/);
  assert.match(mobileCssRule(".home-finance-mobile-carousel"), /touch-action:\s*pan-y/);
  assert.match(mobileCssRule(".home-finance-mobile-track"), /display:\s*flex[\s\S]*height:\s*100%[\s\S]*transition:\s*transform/);
  assert.match(mobileCssRule(".home-finance-mobile-slide"), /flex:\s*0 0 100%/);
  assert.match(mobileCssRule(".home-finance-mobile-slide .finance-model-preview"), /aspect-ratio:\s*auto/);
  assert.match(mobileCssRule(".home-finance-mobile-dots"), /display:\s*flex/);
  assert.match(mobileCssRule(".home-finance-mobile-dots button"), /flex:\s*0 0 6px/);
  assert.match(mobileCssRule(".home-finance-mobile-dots button"), /inline-size:\s*6px/);
  assert.match(mobileCssRule(".home-finance-mobile-dots button"), /min-width:\s*6px/);
  assert.match(mobileCssRule(".home-finance-mobile-dots button.is-current"), /flex-basis:\s*18px/);
  assert.match(mobileCssRule(".home-finance-mobile-dots button.is-current"), /inline-size:\s*18px/);
  assert.match(mobileCssRule(".home-finance-stage"), /display:\s*none/);
  const mobileSwitcher = mobileCssRule(".home-finance-switcher");
  assert.match(mobileSwitcher, /display:\s*grid/);
  assert.match(mobileSwitcher, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(mobileSwitcher, /grid-template-rows:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(mobileSwitcher, /height:\s*100%/);
  assert.doesNotMatch(mobileSwitcher, /overflow-x:\s*auto/);
  assert.match(mobileCssRule(".home-finance-switch-card .finance-model-preview"), /display:\s*none/);
  assert.match(globals, /@media\s*\(max-width:\s*768px\)\s*and\s*\(max-height:\s*740px\)[\s\S]*\.home-finance-section\s*\{[\s\S]*padding-bottom:\s*clamp\(4rem,\s*9\.6svh,\s*4\.3rem\)/s);
  assert.match(globals, /@media\s*\(max-width:\s*768px\)\s*and\s*\(max-height:\s*740px\)[\s\S]*\.home-finance-showcase\s*\{[\s\S]*grid-template-rows:\s*clamp\(260px,\s*43svh,\s*318px\)\s*14px\s*minmax\(0,\s*1fr\)/s);
  assert.match(globals, /@media\s*\(max-width:\s*768px\)\s*and\s*\(max-height:\s*740px\)[\s\S]*\.home-finance-switch-card-motion\s*\{[\s\S]*min-height:\s*64px/s);
}
);

test("homepage finance section compresses in short desktop viewports", () => {
  const shortFinanceSection = shortDesktopCssRule(".home-section.home-finance-section");
  assert.match(shortFinanceSection, /height:\s*100dvh/);
  assert.match(shortFinanceSection, /overflow:\s*visible/);
  assert.match(shortFinanceSection, /padding-bottom:\s*clamp\(1\.75rem,\s*4\.4vh,\s*2\.25rem\)/);
  assert.doesNotMatch(shortFinanceSection, /height:\s*auto/);
  assert.doesNotMatch(shortFinanceSection, /padding-bottom:\s*0\.8rem/);
  assert.match(globals, /@media\s*\(max-height:\s*820px\)\s*and\s*\(min-width:\s*769px\)[\s\S]*\.home-finance-showcase\s*\{[\s\S]*height:\s*clamp\(456px,\s*calc\(100dvh - 160px\),\s*540px\)/s);
  assert.match(globals, /@media\s*\(max-height:\s*820px\)\s*and\s*\(min-width:\s*769px\)[\s\S]*\.home-finance-stage-motion\s*\{[\s\S]*grid-template-rows:\s*auto minmax\(0,\s*1fr\)/s);
  assert.match(globals, /@media\s*\(max-height:\s*820px\)\s*and\s*\(min-width:\s*769px\)[\s\S]*\.home-finance-stage-guide\s*\{[\s\S]*display:\s*none/s);
  assert.match(globals, /@media\s*\(max-height:\s*820px\)\s*and\s*\(min-width:\s*769px\)[\s\S]*\.home-finance-stage-motion \.finance-model-preview\s*\{[\s\S]*height:\s*100%/s);
  assert.match(globals, /@media\s*\(max-height:\s*820px\)\s*and\s*\(min-width:\s*769px\)[\s\S]*\.home-finance-stage \.finance-model-preview\s*\{[\s\S]*aspect-ratio:\s*1\.8/s);
  assert.match(globals, /@media\s*\(max-height:\s*820px\)\s*and\s*\(min-width:\s*769px\)[\s\S]*\.home-finance-point-row\s*\{[\s\S]*display:\s*none/s);
  assert.match(globals, /@media\s*\(max-height:\s*820px\)\s*and\s*\(min-width:\s*769px\)[\s\S]*\.home-finance-stage,\s*\.home-finance-stage-frame,\s*\.home-finance-switcher\s*\{[\s\S]*height:\s*100%/s);
  assert.match(globals, /@media\s*\(max-height:\s*820px\)\s*and\s*\(min-width:\s*769px\)[\s\S]*\.home-finance-switcher\s*\{[\s\S]*grid-template-rows:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(globals, /@media\s*\(max-height:\s*820px\)\s*and\s*\(min-width:\s*769px\)[\s\S]*\.home-finance-switch-card \.finance-model-preview\.compact\s*\{[\s\S]*aspect-ratio:\s*1\.9/s);
  assert.doesNotMatch(globals, /\.home-finance-stage,\s*\.home-finance-switcher\s*\{[\s\S]*height:\s*min\(420px,\s*calc\(100dvh - 150px\)\)/s);
  assert.doesNotMatch(globals, /\.home-finance-stage \.finance-model-preview\s*\{[^}]*aspect-ratio:\s*auto/s);
  assert.doesNotMatch(globals, /\.home-finance-switch-card \.finance-model-preview\s*\{[\s\S]*aspect-ratio:\s*1\.95/s);
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
  assert.match(thinkingSection, /motion/);
  assert.match(thinkingSection, /whileInView/);
  assert.match(thinkingSection, /viewport=\{\{ once: true, amount: 0\.28 \}\}/);
  assert.match(thinkingSection, /home-thinking-reveal/);
  assert.match(thinkingSection, /useMemo/);
  assert.match(thinkingSection, /useState/);
  assert.match(thinkingSection, /next\/image/);
  assert.match(thinkingSection, /home-thinking-visual-card/);
  assert.match(thinkingSection, /thinking-methods-tech\.png/);
  assert.doesNotMatch(thinkingSection, /home-hero-stage\.png/);
  assert.match(thinkingSection, /THINKING_TRACKS/);
  assert.match(thinkingSection, /工具/);
  assert.match(thinkingSection, /AI创作/);
  assert.match(thinkingSection, /思考记录/);
  assert.doesNotMatch(thinkingSection, /代码型 \/ iframe \/ 独立工具/);
  assert.doesNotMatch(thinkingSection, /Notion AI 创作数据源/);
  assert.doesNotMatch(thinkingSection, /Notion 财务 \/ 观察数据源/);
  assert.match(thinkingSection, /accent:/);
  assert.match(thinkingSection, /--thinking-track-accent/);
  assert.match(thinkingSection, /--thinking-track-soft/);
  assert.match(thinkingSection, /home-thinking-track-rail/);
  assert.match(thinkingSection, /home-thinking-track-card/);
  assert.match(thinkingSection, /home-thinking-track-orbit/);
  assert.match(thinkingSection, /home-thinking-count-pill/);
  assert.match(thinkingSection, /home-thinking-preview-panel/);
  assert.match(thinkingSection, /home-thinking-preview-list/);
  assert.match(thinkingSection, /home-thinking-preview-item/);
  assert.match(thinkingSection, /home-thinking-preview-action/);
  assert.match(thinkingSection, /home-thinking-category-link/);
  assert.match(thinkingSection, /categoryHref/);
  assert.match(thinkingSection, /encodeURIComponent\(label\)/);
  assert.match(thinkingSection, /useRouter/);
  assert.match(thinkingSection, /router\.push\(href\)/);
  assert.match(thinkingSection, /openCategoryFromCard\(event,\s*track\.categoryHref\)/);
  assert.match(thinkingSection, /openCategoryFromKeyboard\(event,\s*track\.categoryHref\)/);
  assert.match(thinkingSection, /closest\("a"\)/);
  assert.match(thinkingSection, /activeTrack\.items\.slice\(0,\s*4\)/);
  assert.match(thinkingSection, /activePreviewItems\.map/);
  assert.match(thinkingSection, /查看全部 \{track\.label\}/);
  assert.match(thinkingSection, /home-thinking-featured-meta/);
  assert.doesNotMatch(thinkingSection, /把日常工作里沉淀下来的工具、AI创作和判断方法，放成可以直接打开的入口。/);
  assert.match(thinkingSection, /查看全部工具与思考/);
  assert.match(thinkingSection, /href="\/thinking-lab"/);
  assert.doesNotMatch(thinkingSection, /thinkingLabContent\.slice\(0,\s*4\)/);
  assert.doesNotMatch(thinkingLab, /thinking-tool-entry/);
  assert.match(thinkingSection, /--thinking-track-index/);
  assert.doesNotMatch(thinkingSection, /方法摘句/);
  assert.doesNotMatch(thinkingSection, /METHOD_NOTES/);
  assert.doesNotMatch(thinkingSection, /判断如何形成/);
  assert.match(globals, /\.home-thinking-visual-card\s*\{/);
  assert.match(globals, /\.home-thinking-method-index\s*\{/);
  assert.match(globals, /grid-template-columns:\s*minmax\(280px,\s*0\.72fr\)\s*minmax\(0,\s*1\.28fr\)/);
  assert.match(globals, /\.home-thinking-visual-card\s*\{[^}]*min-height:\s*clamp\(390px,\s*54vh,\s*540px\)/s);
  assert.match(globals, /\.home-thinking-track-rail\s*\{/);
  assert.match(globals, /\.home-thinking-track-card\s*\{/);
  assert.match(globals, /\.home-thinking-track-card::before\s*\{/);
  assert.match(globals, /\.home-thinking-track-orbit\s*\{/);
  assert.match(globals, /\.home-thinking-count-pill\s*\{/);
  assert.match(globals, /\.home-thinking-preview-panel\s*\{/);
  assert.match(globals, /\.home-thinking-preview-list\s*\{/);
  assert.match(globals, /\.home-thinking-preview-item\s*\{/);
  assert.match(globals, /\.home-thinking-preview-action\s*\{/);
  assert.match(globals, /\.home-thinking-category-link\s*\{/);
  assert.match(globals, /\.home-thinking-featured-meta\s*\{/);
  assert.doesNotMatch(globals, /\.home-thinking-source-pill\s*\{/);
  assert.match(cssRule(".home-thinking-section"), /align-items:\s*flex-start/);
  assert.match(globals, /\.home-section\.home-thinking-section\s*\{[^}]*padding-top:\s*clamp\(4\.6rem,\s*8vh,\s*6\.2rem\)/s);
  assert.doesNotMatch(globals, /\.home-thinking-list\s*\{/);
  assert.match(globals, /@keyframes\s+home-thinking-card-rise/);
  assert.match(cssRule(".home-thinking-reveal"), /will-change:\s*transform,\s*opacity/);
  assert.match(cssRule(".home-thinking-track-card"), /animation:\s*home-thinking-card-rise/);
  assert.match(cssRule(".home-thinking-visual-card"), /animation:\s*home-thinking-card-rise/);
});

test("home thinking section keeps its visual card readable in short desktop viewports", () => {
  assert.match(globals, /@media\s*\(max-height:\s*820px\)\s*and\s*\(min-width:\s*769px\)[\s\S]*\.home-section\.home-thinking-section\s*\{[\s\S]*padding-top:\s*clamp\(5rem,\s*10\.5vh,\s*6rem\)[\s\S]*padding-bottom:\s*clamp\(0\.9rem,\s*2vh,\s*1\.4rem\)/s);
  assert.match(globals, /@media\s*\(max-height:\s*820px\)\s*and\s*\(min-width:\s*769px\)[\s\S]*\.home-thinking-visual-card\s*\{[\s\S]*min-height:\s*clamp\(410px,\s*62dvh,\s*460px\)/s);
  assert.match(globals, /@media\s*\(max-height:\s*820px\)\s*and\s*\(min-width:\s*769px\)[\s\S]*\.home-thinking-visual-copy h2\s*\{[\s\S]*font-size:\s*clamp\(1\.75rem,\s*3\.1vw,\s*2\.35rem\)/s);
  assert.match(globals, /@media\s*\(max-height:\s*820px\)\s*and\s*\(min-width:\s*769px\)[\s\S]*\.home-thinking-preview-item:nth-child\(n \+ 4\)\s*\{[\s\S]*display:\s*none/s);
  assert.match(globals, /@media\s*\(max-height:\s*820px\)\s*and\s*\(min-width:\s*769px\)[\s\S]*\.home-thinking-track-card p\s*\{[\s\S]*-webkit-line-clamp:\s*1/s);
});

test("home thinking count pills remain legible on the image card and category cards", () => {
  assert.match(globals, /\.home-thinking-preview-panel \.home-thinking-count-pill\s*\{[\s\S]*background:\s*rgba\(255,\s*250,\s*240,\s*0\.92\)[\s\S]*color:\s*color-mix\(in srgb,\s*var\(--thinking-track-accent,\s*#fffaf0\)\s*70%,\s*var\(--foreground\)\)[\s\S]*box-shadow:\s*0\s*8px\s*18px\s*rgba\(20,\s*20,\s*19,\s*0\.2\)/s);
  assert.match(globals, /\.home-thinking-track-head \.home-thinking-count-pill\s*\{[\s\S]*min-width:\s*58px[\s\S]*justify-content:\s*center[\s\S]*background:\s*color-mix\(in srgb,\s*var\(--thinking-track-accent,\s*var\(--accent-secondary\)\)\s*16%,\s*var\(--card\)\)/s);
});

test("home thinking mobile stacks category cards vertically", () => {
  assert.match(globals, /@media\s*\(max-width:\s*768px\)[\s\S]*\.home-section\.home-thinking-section\s*\{[\s\S]*scroll-margin-top:\s*0[\s\S]*padding-top:\s*clamp\(2\.6rem,\s*6\.1svh,\s*3\.3rem\)[\s\S]*padding-bottom:\s*clamp\(1\.1rem,\s*3svh,\s*1\.7rem\)/s);
  assert.match(globals, /@media\s*\(max-width:\s*768px\)[\s\S]*\.home-thinking-visual-card\s*\{[\s\S]*min-height:\s*clamp\(330px,\s*43svh,\s*370px\)/s);

  const mobileThinkingRail = mobileCssRule(".home-thinking-track-rail");
  assert.match(mobileThinkingRail, /display:\s*grid/);
  assert.match(mobileThinkingRail, /grid-template-columns:\s*1fr/);
  assert.match(mobileThinkingRail, /gap:\s*8px/);
  assert.match(mobileThinkingRail, /margin-inline:\s*0/);
  assert.match(mobileThinkingRail, /overflow:\s*visible/);
  assert.match(mobileThinkingRail, /padding:\s*0/);
  assert.doesNotMatch(mobileThinkingRail, /overflow-x:\s*auto/);
  assert.doesNotMatch(mobileThinkingRail, /scroll-snap-type/);

  assert.match(globals, /@media\s*\(max-width:\s*768px\)[\s\S]*\.home-thinking-track-card\s*\{[\s\S]*width:\s*100%[\s\S]*min-height:\s*82px[\s\S]*padding:\s*0\.72rem\s*0\.9rem/s);
  assert.match(globals, /@media\s*\(max-width:\s*768px\)[\s\S]*\.home-thinking-track-card p\s*\{[\s\S]*font-size:\s*11\.5px[\s\S]*line-height:\s*1\.42[\s\S]*-webkit-line-clamp:\s*1/s);
  assert.doesNotMatch(globals, /@media\s*\(max-width:\s*768px\)[\s\S]*\.home-thinking-track-card\s*\{[\s\S]*flex:\s*0\s*0\s*min\(82vw,\s*320px\)[\s\S]*\}/s);
  assert.doesNotMatch(globals, /@media\s*\(max-width:\s*768px\)[\s\S]*\.home-thinking-track-card\s*\{[\s\S]*scroll-snap-align/s);
});

test("thinking lab keeps the original index layout with source-backed fixed categories", () => {
  assert.match(thinkingLab, /THINKING_CATEGORY_ORDER = \["全部", "工具", "AI创作", "思考记录"\]/);
  assert.match(thinkingLab, /useSearchParams/);
  assert.match(thinkingLab, /searchParams\.get\("category"\)/);
  assert.match(thinkingLab, /decodeURIComponent/);
  assert.match(thinkingLab, /function getDisplayCategory/);
  assert.match(thinkingLab, /item\.source === "hosted-tool"/);
  assert.match(thinkingLab, /item\.legacyCategory === "ai"/);
  assert.match(thinkingLab, /item\.legacyCategory === "finance"/);
  assert.match(thinkingLab, /setActiveCategory/);
  assert.match(thinkingLab, /thinking-index-list/);
  assert.doesNotMatch(thinkingLab, /new Set\(articles\.map\(getCategory\)\)/);
  assert.doesNotMatch(thinkingLab, /category \|\| "思考记录"/);
  assert.match(thinkingLabContent, /category:\s*"工具"/);
  assert.match(thinkingLabContent, /source:\s*"hosted-tool"/);
  assert.doesNotMatch(thinkingLabContent, /category:\s*"AI 工作流",\s*\n\s*href:\s*"\/tools\/subtitle-workbench"/);
});

test("home animation polish respects reduced-motion preferences", () => {
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.product-stage-motion-layer/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.home-finance-stage-motion/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.home-finance-reveal/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.home-thinking-reveal/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.home-thinking-track-card/s);
});

test("contact section includes Lucas phone number", () => {
  assert.match(contactSection, /15140319603/);
  assert.match(contactSection, /电话/);
});
