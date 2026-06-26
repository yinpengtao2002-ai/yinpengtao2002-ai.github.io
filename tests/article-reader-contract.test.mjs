import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const articleReader = await readFile(new URL("../src/components/content/ArticleReader.tsx", import.meta.url), "utf8");
const globals = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");

function cssRule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = globals.match(new RegExp(`${escaped}\\s*\\{(?<body>[^}]*)\\}`, "s"));
  return match?.groups?.body ?? "";
}

test("article markdown keeps wide KaTeX display math inside the reading column", () => {
  assert.match(articleReader, /<article className="notion-article">/);

  const katexDisplay = cssRule(".notion-article .katex-display");
  assert.match(katexDisplay, /max-width:\s*100%/);
  assert.match(katexDisplay, /overflow-x:\s*auto/);
  assert.match(katexDisplay, /overflow-y:\s*hidden/);

  const katexInner = cssRule(".notion-article .katex-display>.katex");
  assert.match(katexInner, /white-space:\s*nowrap/);
});

test("article Mermaid charts expose loading and render-failure states", () => {
  assert.match(articleReader, /type MermaidRenderState = "loading" \| "ready" \| "error"/);
  assert.match(articleReader, /type MermaidRenderResult = \{/);
  assert.match(articleReader, /Children\.toArray\(children\)/);
  assert.match(articleReader, /child\.type === MermaidChart/);
  assert.match(articleReader, /props\.className === "language-mermaid"/);
  assert.match(articleReader, /<MermaidChart chart=\{String\(props\.children\)\.replace\(\/\\n\$\/, ""\)\}/);
  assert.match(articleReader, /return <>\{children\}<\/>;/);
  assert.match(articleReader, /aria-live="polite"/);
  assert.match(articleReader, /className="mermaid-chart-status"/);
  assert.match(articleReader, /renderResult\.chart === chart \? renderResult\.state : "loading"/);
  assert.match(articleReader, /setRenderResult\(\{ chart, svg, state: "ready" \}\)/);
  assert.match(articleReader, /setRenderResult\(\{ chart, svg: "", state: "error" \}\)/);
  assert.match(articleReader, /图表加载中\.\.\./);
  assert.match(articleReader, /无法渲染这张图/);

  const chartCard = cssRule(".mermaid-chart-card");
  assert.match(chartCard, /overflow-x:\s*auto/);
  assert.match(chartCard, /background:\s*var\(--card\)/);

  const chartStatus = cssRule(".mermaid-chart-status");
  assert.match(chartStatus, /color:\s*var\(--muted\)/);
});

test("article reader exposes reading progress and active table-of-contents state", () => {
  assert.match(articleReader, /const \[readingProgress, setReadingProgress\] = useState\(0\)/);
  assert.match(articleReader, /const \[activeHeadingId, setActiveHeadingId\] = useState\(""\)/);
  assert.match(articleReader, /className="article-reading-progress"/);
  assert.match(articleReader, /role="progressbar"/);
  assert.match(articleReader, /aria-label="文章阅读进度"/);
  assert.match(articleReader, /aria-valuenow=\{Math\.round\(readingProgress\)\}/);
  assert.match(articleReader, /transform: `scaleX\(\$\{readingProgress \/ 100\}\)`/);
  assert.match(articleReader, /window\.addEventListener\("scroll", scheduleUpdate, \{ passive: true \}\)/);
  assert.match(articleReader, /window\.addEventListener\("resize", scheduleUpdate\)/);
  assert.match(articleReader, /document\.getElementById\(heading\.id\)/);
  assert.match(articleReader, /setActiveHeadingId\(nextActiveHeadingId\)/);
  assert.match(articleReader, /aria-current=\{isActiveHeading \? "location" : undefined\}/);
  assert.match(articleReader, /styles\.tocLinkActive/);

  const progress = cssRule(".article-reading-progress");
  assert.match(progress, /height:\s*2px/);
  assert.match(progress, /overflow:\s*hidden/);

  const progressBar = cssRule(".article-reading-progress span");
  assert.match(progressBar, /transform-origin:\s*left center/);
  assert.match(progressBar, /background:\s*linear-gradient/);

  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*\.article-reading-progress span\s*\{[\s\S]*transition:\s*none/s);
});
