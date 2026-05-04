# Site Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild yinpengtao.cn as a capability-focused personal site with a stronger homepage, finance model library, Notion-backed thinking lab, upgraded AI assistant knowledge, clean redirects, and verified desktop/mobile behavior.

**Architecture:** Create a local finance model registry as the single source for model metadata and AI model knowledge. Move all writing content into a generated `thinkingContent` surface backed by current Notion sources, then expose it through `/thinking-lab` and permanent redirects from legacy article paths. Rebuild the homepage and `/finance` around shared registry data while preserving the existing finance tool pages and their mobile console conventions.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Framer Motion, Tailwind CSS v4, local Node content generation, Notion API, Plotly/SheetJS vendor assets, Node test runner.

---

## Scope Check

This spec touches routing, generated content, homepage design, finance model indexing, article pages, AI assistant prompts, and cleanup. The user explicitly approved a single vertical release rather than an MVP. The plan still decomposes the work into small tasks with independent verification and commit points.

## File Structure

Create:

- `src/lib/finance/model-registry.json`: finance model metadata, categories, and AI-facing model instructions.
- `src/lib/finance/modelRegistry.ts`: typed helpers for finance categories, model cards, and AI model knowledge.
- `src/components/finance/FinanceModelLibrary.tsx`: reusable finance model workbench for homepage and `/finance`.
- `src/components/content/ArticleReader.tsx`: current article reading UI moved out of the old `/article` route.
- `src/app/thinking-lab/page.tsx`: thinking lab listing page.
- `src/app/thinking-lab/[slug]/page.tsx`: thinking article detail route.
- `src/components/thinking/ThinkingLabClient.tsx`: client filtering and topic map for thinking content.
- `src/components/home/CapabilityHero.tsx`: new first-screen capability hero.
- `src/components/home/HomeFinanceSection.tsx`: homepage finance preview.
- `src/components/home/HomeThinkingSection.tsx`: homepage thinking preview.
- `src/components/home/HomeContactSection.tsx`: homepage contact/footer section.
- `tests/finance-model-registry.test.mjs`: registry contract test.
- `tests/generated-content-contract.test.mjs`: generated content contract test.
- `tests/routing-contract.test.mjs`: redirect and sitemap source contract test.

Modify:

- `scripts/generate-content.js`: generate `thinkingContent` from Notion-backed sources and `financeContent` from the local model registry.
- `src/lib/data/generated/content.ts`: generated output from `npm run gen`.
- `src/app/page.tsx`: replace old section previews with capability homepage.
- `src/app/finance/page.tsx`: replace article list with finance model workbench.
- `src/components/layout/SiteNavigation.tsx`: final nav: 首页 / 财务模型 / 思考与方法 / 联系.
- `src/app/sitemap.ts`: output `/`, `/finance`, `/thinking-lab`, finance tools, and thinking article paths only.
- `next.config.ts`: add permanent redirects from `/ai`, `/essays`, and old article paths.
- `src/app/api/chat/route.ts`: build prompt from finance model registry plus `thinkingContent`.
- `src/components/ChatWidget.tsx`: switch cards and quick prompts to finance + thinking.
- `src/lib/chatFallback.ts`: update fallback copy and card types for finance + thinking.
- `src/lib/data/dialoguePatterns.ts`: remove old `/ai` references.
- `public/tools/margin-analysis/app.js`: auto-load demo data on desktop as well as mobile.
- `package.json`: add focused site contract test scripts.

Delete:

- `src/app/ai/page.tsx`
- `src/app/essays/page.tsx`
- `src/app/explore/page.tsx`
- `src/app/article/[category]/[slug]/page.tsx`
- `src/app/article/[category]/[slug]/article-client.tsx`
- `content/finance/*.md` after registry generation replaces the runtime need for those files.
- `src/lib/data/generated/content.json` if no import references remain.

---

### Task 1: Finance Model Registry

**Files:**
- Create: `src/lib/finance/model-registry.json`
- Create: `src/lib/finance/modelRegistry.ts`
- Create: `tests/finance-model-registry.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add the registry contract test**

Create `tests/finance-model-registry.test.mjs`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails before registry exists**

Run:

```bash
node --test tests/finance-model-registry.test.mjs
```

Expected: FAIL with `ENOENT` for `src/lib/finance/model-registry.json`.

- [ ] **Step 3: Create `src/lib/finance/model-registry.json`**

Create the file with this content:

```json
{
  "categories": [
    {
      "id": "budget-review",
      "label": "预算复盘",
      "description": "对比实际与预算，定位销量、收入、边际和利润差异。"
    },
    {
      "id": "trend-monitoring",
      "label": "趋势监控",
      "description": "观察连续月份走势、同比环比、结构变化和集中度。"
    },
    {
      "id": "profit-simulation",
      "label": "利润模拟",
      "description": "调整销量、收入、成本、费用和税费假设，查看利润影响。"
    },
    {
      "id": "unit-attribution",
      "label": "单车归因",
      "description": "拆解单车指标变化中的结构效应和费率效应。"
    }
  ],
  "models": [
    {
      "slug": "business-analysis",
      "categoryId": "budget-review",
      "title": "预算实际对比模型",
      "summary": "对比实际与预算的销量、收入、边际和利润表现，支持按国家、车型等维度下钻。",
      "href": "/finance/business-analysis",
      "date": "2026-04-29",
      "accent": "blue",
      "aiGuide": {
        "purpose": "用于经营复盘，帮助用户快速判断预算差异来自销量、单车净收入、单车边际、固定科目还是利润贡献。",
        "scenarios": ["预算复盘会议", "国家或车型边际差异定位", "总部经营看板拆解"],
        "steps": ["打开模型后先查看自动加载的示例数据。", "在控制台切换分析维度或上传实际与预算底表。", "从预算到实际边际瀑布图、利润桥和维度经营实绩中定位差异。"],
        "sampleData": "页面默认加载预算实际示例数据，展示销量、净收入、边际、固定科目和利润桥。",
        "faq": [
          {
            "question": "这个模型适合什么时候用？",
            "answer": "适合预算实际复盘和经营差异定位，尤其适合需要按国家、车型或自定义维度下钻的场景。"
          }
        ]
      }
    },
    {
      "slug": "monthly-trend",
      "categoryId": "trend-monitoring",
      "title": "分月指标趋势分析模型",
      "summary": "上传连续月份明细，查看销量、单车质量、环比同比、同期对比、结构占比和集中度。",
      "href": "/finance/monthly-trend",
      "date": "2026-05-03",
      "accent": "green",
      "aiGuide": {
        "purpose": "用于连续月份指标分析，把月份、维度和数值指标整理成趋势、同比环比和结构观察。",
        "scenarios": ["月度经营复盘", "跨年趋势监控", "维度结构变化分析"],
        "steps": ["打开模型后先查看自动加载的示例数据。", "上传包含月份、维度和指标列的 Excel 或 CSV。", "切换指标、维度和图表视图，观察趋势、热力图和结构集中度。"],
        "sampleData": "页面默认加载连续月份示例明细，包含区域、国家、车型、销量、收入和边际类指标。",
        "faq": [
          {
            "question": "必须用固定模板吗？",
            "answer": "不必须。模型会自动识别月份列、维度列和指标列，也支持手动切换。"
          }
        ]
      }
    },
    {
      "slug": "sensitivity-analysis",
      "categoryId": "profit-simulation",
      "title": "利润敏感性分析",
      "summary": "调整销量、收入、成本、费用和税费假设，快速判断边际与利润对变量变化的敏感程度。",
      "href": "/finance/sensitivity-analysis",
      "date": "2026-04-01",
      "accent": "orange",
      "aiGuide": {
        "purpose": "用于预算、滚动预测和经营复盘中的情景推演，判断利润总额对关键变量变化的敏感程度。",
        "scenarios": ["年度预算测算", "滚动预测调整", "目标利润倒推"],
        "steps": ["打开模型后查看默认利润示例数据。", "在控制台调整销量、单车净收入、成本、费用和税费。", "查看关键因素排序、目标利润分析、双变量矩阵和瀑布图。"],
        "sampleData": "页面默认使用一套利润示例假设，展示销量、净收入、变动成本、固定扣减和利润贡献。",
        "faq": [
          {
            "question": "它和预算实际对比模型有什么区别？",
            "answer": "预算实际对比模型解释已经发生的差异；利润敏感性分析用于推演假设变化会怎样影响利润。"
          }
        ]
      }
    },
    {
      "slug": "margin-analysis",
      "categoryId": "unit-attribution",
      "title": "单车指标变动归因模型",
      "summary": "上传两期数据，拆解单车指标变化中的结构效应和费率效应，判断变化来源。",
      "href": "/finance/margin-analysis",
      "date": "2026-01-01",
      "accent": "blue",
      "aiGuide": {
        "purpose": "用于比较两期单车指标变化，拆解变化来自销量结构还是单车水平。",
        "scenarios": ["月度单车边际复盘", "车型结构变化分析", "国家组合变化解释"],
        "steps": ["打开模型后先查看自动加载的示例数据。", "上传两期包含销量、指标总额和维度的数据。", "选择分析维度，查看结构效应、费率效应、瀑布图和明细表。"],
        "sampleData": "页面默认加载两期单车指标示例数据，包含 Month、Dim_A 至 Dim_E、Sales Volume 和 Total Margin。",
        "faq": [
          {
            "question": "结构效应和费率效应怎么理解？",
            "answer": "结构效应解释销量组合变化的影响；费率效应解释同一维度下单车水平变化的影响。"
          }
        ]
      }
    }
  ]
}
```

- [ ] **Step 4: Create typed registry helper**

Create `src/lib/finance/modelRegistry.ts`:

```ts
import registry from "./model-registry.json";

export type FinanceModelAccent = "orange" | "blue" | "green";

export interface FinanceModelCategory {
  id: string;
  label: string;
  description: string;
}

export interface FinanceModelGuide {
  purpose: string;
  scenarios: string[];
  steps: string[];
  sampleData: string;
  faq: Array<{
    question: string;
    answer: string;
  }>;
}

export interface FinanceModelItem {
  slug: string;
  categoryId: string;
  title: string;
  summary: string;
  href: string;
  date: string;
  accent: FinanceModelAccent;
  aiGuide: FinanceModelGuide;
}

export const financeModelCategories = registry.categories as FinanceModelCategory[];
export const financeModels = registry.models as FinanceModelItem[];

export function getFinanceModelBySlug(slug: string) {
  return financeModels.find((model) => model.slug === slug);
}

export function getFinanceModelsByCategory(categoryId: string) {
  return financeModels.filter((model) => model.categoryId === categoryId);
}

export function getFinanceModelCategory(categoryId: string) {
  return financeModelCategories.find((category) => category.id === categoryId);
}
```

- [ ] **Step 5: Add site contract script**

Modify `package.json` scripts:

```json
"test:site": "node --test tests/finance-model-registry.test.mjs tests/generated-content-contract.test.mjs tests/routing-contract.test.mjs"
```

Keep existing scripts unchanged.

- [ ] **Step 6: Run registry test**

Run:

```bash
node --test tests/finance-model-registry.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit registry**

Run:

```bash
git add src/lib/finance/model-registry.json src/lib/finance/modelRegistry.ts tests/finance-model-registry.test.mjs package.json package-lock.json
git commit -m "Add finance model registry"
```

---

### Task 2: Generated Content Contract

**Files:**
- Modify: `scripts/generate-content.js`
- Modify: `src/lib/data/generated/content.ts`
- Create: `tests/generated-content-contract.test.mjs`
- Delete: `content/finance/business-analysis.md`
- Delete: `content/finance/margin-analysis.md`
- Delete: `content/finance/monthly-trend.md`
- Delete: `content/finance/sensitivity-analysis.md`
- Delete: `src/lib/data/generated/content.json` if `rg "content.json"` returns no imports

- [ ] **Step 1: Add generated content contract test**

Create `tests/generated-content-contract.test.mjs`:

```js
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
```

- [ ] **Step 2: Run test to capture current failure**

Run:

```bash
node --test tests/generated-content-contract.test.mjs
```

Expected: FAIL because `thinkingContent` does not exist and old `/article/...` hrefs exist.

- [ ] **Step 3: Update generator types and finance source**

Modify `scripts/generate-content.js`:

```js
const financeRegistryPath = path.join(process.cwd(), "src", "lib", "finance", "model-registry.json");

function getFinanceRegistryContent() {
    const registry = JSON.parse(fs.readFileSync(financeRegistryPath, "utf-8"));
    return registry.models.map((model) => ({
        slug: model.slug,
        title: model.title,
        description: model.summary,
        date: model.date,
        category: model.categoryId,
        href: model.href,
        content: [
            model.aiGuide.purpose,
            "",
            "使用步骤：",
            ...model.aiGuide.steps.map((step, index) => `${index + 1}. ${step}`),
        ].join("\n"),
        source: "registry",
    }));
}
```

Replace the old local markdown finance merge with:

```js
const financeContent = renumberContent(getFinanceRegistryContent());
console.log(`  ✅ Total Finance models: ${financeContent.length}`);
```

- [ ] **Step 4: Add thinking href normalization**

Modify the category href normalizer in `scripts/generate-content.js`:

```js
function normalizeThinkingHref(item, legacyCategory) {
    const previousSlug = item.slug;
    const slug = getSemanticSlug(legacyCategory, item);
    const aliases = new Set(item.aliases || []);

    if (previousSlug !== slug) {
        aliases.add(previousSlug);
    }

    return {
        ...item,
        slug,
        legacyCategory,
        href: `/thinking-lab/${slug}`,
        ...(aliases.size > 0 ? { aliases: Array.from(aliases) } : {}),
    };
}
```

- [ ] **Step 5: Generate thinking content from existing Notion-backed sources**

In `main()` replace the old separate `aiContent` and `essaysContent` sections with:

```js
const aiThinkingContent = (await getMergedContent("ai", NOTION_AI_DB))
    .filter((item) => item.source === "notion")
    .map((item) => normalizeThinkingHref(item, "ai"));

const financeNotionContent = (await getNotionContent("finance", NOTION_FINANCE_DB, existingGeneratedContent.finance
    .filter((item) => item.source === "notion")
    .map(withoutGeneratedId)))
    .map((item) => normalizeThinkingHref(item, "finance"));

const existingEssayFallback = existingGeneratedContent.essays
    .filter((item) => item.source === "notion")
    .map(withoutGeneratedId)
    .map((item) => normalizeThinkingHref(item, "essays"));

const thinkingContent = renumberContent(dedupeContentItems([
    ...aiThinkingContent,
    ...financeNotionContent,
    ...existingEssayFallback,
]).sort(sortContentByDateDesc));
console.log(`  ✅ Total Thinking Lab articles: ${thinkingContent.length}`);
```

This preserves current Notion reality without requiring immediate Notion database migration.

- [ ] **Step 6: Update generated TypeScript output**

In the generated `tsContent` template, export:

```ts
export const financeContent: ContentItem[] = ${JSON.stringify(financeContent, null, 2)};

export const thinkingContent: ContentItem[] = ${JSON.stringify(thinkingContent, null, 2)};

export function getThinkingBySlug(slug: string): ContentItem | undefined {
    return thinkingContent.find(item => item.slug === slug || item.aliases?.includes(slug));
}
```

Keep a temporary compatibility export only if TypeScript imports still require it during the task:

```ts
export const aiContent: ContentItem[] = thinkingContent.filter(item => item.legacyCategory === "ai");
export const essaysContent: ContentItem[] = thinkingContent.filter(item => item.legacyCategory === "essays" || item.legacyCategory === "finance");
```

Remove those compatibility exports in Task 8 after all imports are migrated.

- [ ] **Step 7: Run generation**

Run:

```bash
npm run gen
```

Expected: generated `src/lib/data/generated/content.ts` includes `thinkingContent` and finance registry items.

- [ ] **Step 8: Run generated content test**

Run:

```bash
node --test tests/generated-content-contract.test.mjs
```

Expected: PASS.

- [ ] **Step 9: Remove unused old content files**

Run:

```bash
rg "content/finance|content.json" src scripts tests package.json
```

Expected: no runtime imports of `content/finance` or `content.json`.

Delete `content/finance/*.md`. Delete `src/lib/data/generated/content.json` only when the `rg` command confirms it is unused.

- [ ] **Step 10: Commit generated content contract**

Run:

```bash
git add scripts/generate-content.js src/lib/data/generated/content.ts tests/generated-content-contract.test.mjs content/finance src/lib/data/generated/content.json
git commit -m "Rework generated content for thinking lab"
```

---

### Task 3: Redirects, Sitemap, and Route Cleanup Contract

**Files:**
- Modify: `next.config.ts`
- Modify: `src/app/sitemap.ts`
- Create: `tests/routing-contract.test.mjs`

- [ ] **Step 1: Add routing contract test**

Create `tests/routing-contract.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const nextConfig = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");
const sitemap = await readFile(new URL("../src/app/sitemap.ts", import.meta.url), "utf8");

test("next config contains permanent redirects for old thinking routes", () => {
  assert.match(nextConfig, /source:\s*"\/ai"/);
  assert.match(nextConfig, /destination:\s*"\/thinking-lab"/);
  assert.match(nextConfig, /source:\s*"\/essays"/);
  assert.match(nextConfig, /source:\s*"\/article\/ai\/:slug"/);
  assert.match(nextConfig, /source:\s*"\/article\/essays\/:slug"/);
  assert.match(nextConfig, /permanent:\s*true/);
});

test("sitemap uses thinking lab and no retired list pages", () => {
  assert.match(sitemap, /\/thinking-lab/);
  assert.doesNotMatch(sitemap, /\$\{BASE_URL\}\/ai/);
  assert.doesNotMatch(sitemap, /\$\{BASE_URL\}\/essays/);
  assert.doesNotMatch(sitemap, /\$\{BASE_URL\}\/explore/);
});
```

- [ ] **Step 2: Run test to confirm current failure**

Run:

```bash
node --test tests/routing-contract.test.mjs
```

Expected: FAIL because redirects are missing and sitemap still emits `/ai`, `/essays`, and `/explore`.

- [ ] **Step 3: Add redirects to `next.config.ts`**

Add this `async redirects()` property inside `nextConfig`:

```ts
  async redirects() {
    return [
      {
        source: "/ai",
        destination: "/thinking-lab",
        permanent: true,
      },
      {
        source: "/essays",
        destination: "/thinking-lab",
        permanent: true,
      },
      {
        source: "/article/ai/:slug",
        destination: "/thinking-lab/:slug",
        permanent: true,
      },
      {
        source: "/article/essays/:slug",
        destination: "/thinking-lab/:slug",
        permanent: true,
      },
    ];
  },
```

Keep `trailingSlash: true`.

- [ ] **Step 4: Update sitemap**

Replace `src/app/sitemap.ts` imports and static pages:

```ts
import { MetadataRoute } from "next";
import { financeContent, thinkingContent } from "@/lib/data/generated/content";

const BASE_URL = "https://yinpengtao.cn";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), priority: 1.0 },
    { url: `${BASE_URL}/finance`, lastModified: new Date(), priority: 0.9 },
    { url: `${BASE_URL}/thinking-lab`, lastModified: new Date(), priority: 0.8 },
  ];

  const dynamicPages: MetadataRoute.Sitemap = [
    ...financeContent,
    ...thinkingContent,
  ].map((item) => ({
    url: `${BASE_URL}${item.href}`,
    lastModified: item.date ? new Date(item.date) : new Date(),
    priority: item.href.startsWith("/finance/") ? 0.85 : 0.75,
  }));

  return [...staticPages, ...dynamicPages];
}
```

- [ ] **Step 5: Run routing contract test**

Run:

```bash
node --test tests/routing-contract.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit routing contract**

Run:

```bash
git add next.config.ts src/app/sitemap.ts tests/routing-contract.test.mjs
git commit -m "Add thinking lab redirects and sitemap"
```

---

### Task 4: Move Article Reader to Thinking Lab

**Files:**
- Create: `src/components/content/ArticleReader.tsx`
- Create: `src/app/thinking-lab/[slug]/page.tsx`
- Delete after migration: `src/app/article/[category]/[slug]/article-client.tsx`
- Delete after migration: `src/app/article/[category]/[slug]/page.tsx`

- [ ] **Step 1: Create shared article reader**

Copy the current component body from `src/app/article/[category]/[slug]/article-client.tsx` into `src/components/content/ArticleReader.tsx` and change the props:

```ts
interface ArticleReaderProps {
    article: ContentItem;
    sectionLabel: string;
    backHref: string;
}
```

Update back fallback:

```ts
const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
    } else {
        router.push(backHref);
    }
};
```

Update the header label:

```tsx
<span style={...}>
    {sectionLabel}
</span>
```

Keep the existing markdown, math, mermaid, table-of-contents, and `normalizeMarkdownStrongEmphasis` logic unchanged.

- [ ] **Step 2: Create thinking article route**

Create `src/app/thinking-lab/[slug]/page.tsx`:

```tsx
import { getThinkingBySlug, thinkingContent } from "@/lib/data/generated/content";
import type { Metadata } from "next";
import Link from "next/link";
import ArticleReader from "@/components/content/ArticleReader";

const BASE_URL = "https://yinpengtao.cn";

interface PageProps {
    params: Promise<{
        slug: string;
    }>;
}

export function generateStaticParams() {
    return thinkingContent.flatMap((item) => [
        { slug: item.slug },
        ...(item.aliases || []).map((slug) => ({ slug })),
    ]);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const article = getThinkingBySlug(slug);

    if (!article) {
        return {
            title: "文章未找到",
            robots: { index: false, follow: true },
        };
    }

    return {
        title: article.title,
        description: article.description,
        alternates: {
            canonical: article.href,
        },
        openGraph: {
            title: article.title,
            description: article.description,
            url: `${BASE_URL}${article.href}`,
            type: "article",
        },
        twitter: {
            card: "summary_large_image",
            title: article.title,
            description: article.description,
        },
    };
}

export default async function ThinkingArticlePage({ params }: PageProps) {
    const { slug } = await params;
    const article = getThinkingBySlug(slug);

    if (!article) {
        return (
            <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--foreground)", marginBottom: 16 }}>文章未找到</h1>
                    <Link href="/thinking-lab" style={{ color: "var(--accent)", textDecoration: "underline" }}>
                        返回思考与方法
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <ArticleReader
            article={article}
            sectionLabel="Thinking Lab"
            backHref="/thinking-lab"
        />
    );
}
```

- [ ] **Step 3: Delete old article route**

Delete:

```text
src/app/article/[category]/[slug]/page.tsx
src/app/article/[category]/[slug]/article-client.tsx
```

- [ ] **Step 4: Run route import search**

Run:

```bash
rg "src/app/article|/article/|ArticleClient|article-client" src scripts tests
```

Expected: no imports of `ArticleClient` or old article route code. Redirect strings in `next.config.ts`, `tests/routing-contract.test.mjs`, and source-name handling in `scripts/generate-content.js` are allowed.

- [ ] **Step 5: Type check**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS or fail only on known pre-existing generated content issues. If it fails on `ArticleReader` imports or props, fix the names from Steps 1-2.

- [ ] **Step 6: Commit article route migration**

Run:

```bash
git add src/components/content/ArticleReader.tsx src/app/thinking-lab src/app/article
git commit -m "Move articles to thinking lab routes"
```

---

### Task 5: Thinking Lab Listing Page

**Files:**
- Create: `src/app/thinking-lab/page.tsx`
- Create: `src/components/thinking/ThinkingLabClient.tsx`

- [ ] **Step 1: Create client filtering component**

Create `src/components/thinking/ThinkingLabClient.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ContentItem } from "@/lib/data/generated/content";

const UI_FONT =
    'var(--font-poppins), "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';

function getCategory(item: ContentItem) {
    return item.category || "思考记录";
}

export default function ThinkingLabClient({ articles }: { articles: ContentItem[] }) {
    const categories = useMemo(() => {
        const values = Array.from(new Set(articles.map(getCategory)));
        return ["全部", ...values];
    }, [articles]);
    const [activeCategory, setActiveCategory] = useState("全部");
    const visibleArticles = activeCategory === "全部"
        ? articles
        : articles.filter((item) => getCategory(item) === activeCategory);

    return (
        <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)", fontFamily: UI_FONT }}>
            <section style={{ maxWidth: 1040, margin: "0 auto", padding: "7rem 1.5rem 2.5rem" }}>
                <p style={{ color: "var(--accent)", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
                    Thinking Lab
                </p>
                <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 16 }}>
                    思考与方法
                </h1>
                <p style={{ maxWidth: 620, color: "var(--muted)", lineHeight: 1.8, fontSize: 15 }}>
                    这里整理 AI 工作流、经营财务、市场观察和个人随笔。它不是经历列表，而是持续增长的思考样本。
                </p>
            </section>

            <section style={{ maxWidth: 1040, margin: "0 auto", padding: "0 1.5rem 5rem" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
                    {categories.map((category) => (
                        <button
                            key={category}
                            type="button"
                            onClick={() => setActiveCategory(category)}
                            style={{
                                minHeight: 36,
                                padding: "0 14px",
                                borderRadius: 999,
                                border: "1px solid var(--border)",
                                background: activeCategory === category ? "var(--foreground)" : "var(--card)",
                                color: activeCategory === category ? "var(--background)" : "var(--foreground)",
                                fontWeight: 700,
                                fontSize: 13,
                                cursor: "pointer",
                                fontFamily: "inherit",
                            }}
                        >
                            {category}
                        </button>
                    ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
                    {visibleArticles.map((article, index) => (
                        <motion.article
                            key={article.slug}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.28, delay: index * 0.04 }}
                        >
                            <Link href={article.href} style={{ display: "block", height: "100%", textDecoration: "none" }}>
                                <div style={{ height: "100%", border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", padding: 18 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                                        <span style={{ color: "var(--accent)", fontSize: 12, fontWeight: 700 }}>{getCategory(article)}</span>
                                        <span style={{ color: "var(--muted)", fontSize: 12 }}>{article.date}</span>
                                    </div>
                                    <h2 style={{ fontSize: 18, lineHeight: 1.35, color: "var(--foreground)", marginBottom: 10 }}>{article.title}</h2>
                                    <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>{article.description}</p>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--foreground)", fontSize: 13, fontWeight: 700 }}>
                                        阅读 <ArrowRight style={{ width: 14, height: 14 }} />
                                    </span>
                                </div>
                            </Link>
                        </motion.article>
                    ))}
                </div>
            </section>
        </div>
    );
}
```

- [ ] **Step 2: Create route page**

Create `src/app/thinking-lab/page.tsx`:

```tsx
import type { Metadata } from "next";
import { thinkingContent } from "@/lib/data/generated/content";
import ThinkingLabClient from "@/components/thinking/ThinkingLabClient";

export const metadata: Metadata = {
    title: "思考与方法｜Lucas Yin",
    description: "Lucas Yin 关于 AI 工作流、经营财务、市场观察和个人随笔的持续记录。",
};

export default function ThinkingLabPage() {
    return <ThinkingLabClient articles={thinkingContent} />;
}
```

- [ ] **Step 3: Run type check**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS for the new thinking route.

- [ ] **Step 4: Commit thinking listing**

Run:

```bash
git add src/app/thinking-lab/page.tsx src/components/thinking/ThinkingLabClient.tsx
git commit -m "Add thinking lab listing"
```

---

### Task 6: Finance Model Library UI

**Files:**
- Create: `src/components/finance/FinanceModelLibrary.tsx`
- Modify: `src/app/finance/page.tsx`

- [ ] **Step 1: Create reusable finance model library**

Create `src/components/finance/FinanceModelLibrary.tsx`:

```tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { financeModelCategories, financeModels } from "@/lib/finance/modelRegistry";

const UI_FONT =
    'var(--font-poppins), "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';

export default function FinanceModelLibrary({ compact = false }: { compact?: boolean }) {
    const [activeCategory, setActiveCategory] = useState("all");
    const visibleModels = activeCategory === "all"
        ? financeModels
        : financeModels.filter((model) => model.categoryId === activeCategory);

    return (
        <section style={{ width: "100%", fontFamily: UI_FONT }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                <button
                    type="button"
                    onClick={() => setActiveCategory("all")}
                    style={pillStyle(activeCategory === "all")}
                >
                    全部模型
                </button>
                {financeModelCategories.map((category) => (
                    <button
                        key={category.id}
                        type="button"
                        onClick={() => setActiveCategory(category.id)}
                        style={pillStyle(activeCategory === category.id)}
                    >
                        {category.label}
                    </button>
                ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: compact ? "repeat(auto-fit, minmax(220px, 1fr))" : "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
                {visibleModels.map((model, index) => (
                    <motion.article
                        key={model.slug}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: index * 0.04 }}
                    >
                        <Link href={model.href} style={{ display: "block", height: "100%", textDecoration: "none" }}>
                            <div style={{ height: "100%", padding: compact ? 16 : 20, border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)" }}>
                                <span style={{ color: accentColor(model.accent), fontSize: 12, fontWeight: 800 }}>
                                    {financeModelCategories.find((category) => category.id === model.categoryId)?.label}
                                </span>
                                <h3 style={{ margin: "10px 0 8px", color: "var(--foreground)", fontSize: compact ? 17 : 19, lineHeight: 1.35 }}>
                                    {model.title}
                                </h3>
                                <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>
                                    {model.summary}
                                </p>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--foreground)", fontSize: 13, fontWeight: 800 }}>
                                    打开模型 <ArrowRight style={{ width: 14, height: 14 }} />
                                </span>
                            </div>
                        </Link>
                    </motion.article>
                ))}
            </div>
        </section>
    );
}

function pillStyle(active: boolean): React.CSSProperties {
    return {
        minHeight: 36,
        padding: "0 14px",
        borderRadius: 999,
        border: "1px solid var(--border)",
        background: active ? "var(--foreground)" : "var(--card)",
        color: active ? "var(--background)" : "var(--foreground)",
        fontWeight: 800,
        fontSize: 13,
        cursor: "pointer",
        fontFamily: "inherit",
    };
}

function accentColor(accent: string) {
    if (accent === "orange") return "var(--accent)";
    if (accent === "green") return "var(--accent-tertiary)";
    return "var(--accent-secondary)";
}
```

- [ ] **Step 2: Replace finance page**

Replace `src/app/finance/page.tsx`:

```tsx
import type { Metadata } from "next";
import FinanceModelLibrary from "@/components/finance/FinanceModelLibrary";
import { financeModels } from "@/lib/finance/modelRegistry";

export const metadata: Metadata = {
  title: "财务模型｜Lucas Yin",
  description: "按经营问题进入 Lucas Yin 持续打磨的财务模型和分析工具。",
};

export default function FinancePage() {
  return (
    <div style={{ minHeight: "100vh", padding: "6.5rem 1.5rem 4rem", background: "var(--background)" }}>
      <main style={{ maxWidth: 1040, margin: "0 auto" }}>
        <p style={{ color: "var(--accent-secondary)", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 12, fontWeight: 800, marginBottom: 14 }}>
          Finance Model Library
        </p>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 16 }}>
          按经营问题进入模型
        </h1>
        <p style={{ maxWidth: 640, color: "var(--muted)", lineHeight: 1.8, fontSize: 15, marginBottom: 28 }}>
          这里收录的是我自己搭建并持续打磨的财务模型和分析工具。模型库会按经营问题持续扩展，目前共有 {financeModels.length} 个模型。
        </p>
        <FinanceModelLibrary />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Run type check**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS for `FinanceModelLibrary` imports and model registry types.

- [ ] **Step 4: Commit finance library**

Run:

```bash
git add src/components/finance/FinanceModelLibrary.tsx src/app/finance/page.tsx
git commit -m "Rebuild finance model library"
```

---

### Task 7: Homepage Redesign

**Files:**
- Create: `src/components/home/CapabilityHero.tsx`
- Create: `src/components/home/HomeFinanceSection.tsx`
- Create: `src/components/home/HomeThinkingSection.tsx`
- Create: `src/components/home/HomeContactSection.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create capability hero**

Create `src/components/home/CapabilityHero.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { financeModels } from "@/lib/finance/modelRegistry";
import { thinkingContent } from "@/lib/data/generated/content";
import { useViewportProfile } from "@/lib/useLowMotionMode";

const UI_FONT =
    'var(--font-poppins), "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';

const PROOFS = [
    {
        title: "财务模型",
        body: "把预算复盘、趋势分析、利润敏感性等经营问题整理成可使用的分析工具。",
        href: "/finance",
        link: "查看模型库",
    },
    {
        title: "AI 工作流",
        body: "用 AI 辅助资料整理、内容生产、模型搭建和复杂任务拆解。",
        href: "/thinking-lab",
        link: "进入思考与方法",
    },
    {
        title: "思考判断",
        body: "持续记录对业务、市场、工具和个人成长的观察。",
        href: "/thinking-lab",
        link: "阅读最新文章",
    },
];

export default function CapabilityHero() {
    const { lowMotion, isMobileLike } = useViewportProfile();

    return (
        <section
            id="home"
            className="full-viewport"
            style={{
                display: "grid",
                gridTemplateColumns: isMobileLike ? "1fr" : "0.9fr 1.1fr",
                alignItems: "center",
                gap: isMobileLike ? 28 : 56,
                padding: isMobileLike ? "6rem 1.25rem 3rem" : "7rem 4rem 4rem",
                maxWidth: 1180,
                margin: "0 auto",
                fontFamily: UI_FONT,
            }}
        >
            <motion.div
                initial={lowMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
                animate={lowMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <h1
                    style={{
                        fontSize: isMobileLike ? "clamp(3.2rem, 18vw, 5rem)" : "clamp(5.5rem, 10vw, 8rem)",
                        lineHeight: 0.88,
                        letterSpacing: "-0.06em",
                        fontWeight: 800,
                        margin: 0,
                    }}
                >
                    <span className="gradient-text">Lucas<br />Yin</span>
                </h1>
                <p style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--border)", color: "var(--muted)", lineHeight: 1.9, fontSize: 14 }}>
                    经营分析 · 财务模型 · AI 工作流
                </p>
            </motion.div>

            <motion.div
                initial={lowMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
                animate={lowMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.12 }}
            >
                <p style={{ color: "var(--accent)", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 12, fontWeight: 800, marginBottom: 16 }}>
                    Capability Profile
                </p>
                <h2 style={{ fontSize: "clamp(1.95rem, 4vw, 3rem)", lineHeight: 1.15, letterSpacing: "-0.035em", marginBottom: 18 }}>
                    从业务问题出发，持续打磨经营分析、财务模型与 AI 工作流。
                </h2>
                <Link
                    href="/finance"
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        minHeight: 42,
                        padding: "0 16px",
                        borderRadius: 999,
                        background: "var(--foreground)",
                        color: "var(--background)",
                        textDecoration: "none",
                        fontSize: 14,
                        fontWeight: 800,
                        marginBottom: 22,
                    }}
                >
                    查看财务模型 <ArrowRight style={{ width: 15, height: 15 }} />
                </Link>
                <div style={{ display: "grid", gap: 10 }}>
                    {PROOFS.map((proof) => (
                        <Link key={proof.title} href={proof.href} style={{ textDecoration: "none" }}>
                            <div style={{ border: "1px solid var(--border)", background: "var(--card)", borderRadius: 8, padding: "14px 16px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                    <strong style={{ color: "var(--foreground)" }}>{proof.title}</strong>
                                    <span style={{ color: "var(--muted)", fontSize: 12 }}>
                                        {proof.title === "财务模型" ? `${financeModels.length} 个模型` : `${thinkingContent.length} 篇`}
                                    </span>
                                </div>
                                <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7, margin: "6px 0 8px" }}>{proof.body}</p>
                                <span style={{ color: "var(--foreground)", fontSize: 13, fontWeight: 800 }}>{proof.link}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </motion.div>
        </section>
    );
}
```

- [ ] **Step 2: Create homepage finance section**

Create `src/components/home/HomeFinanceSection.tsx`:

```tsx
import FinanceModelLibrary from "@/components/finance/FinanceModelLibrary";

export default function HomeFinanceSection() {
    return (
        <section id="finance" className="full-viewport" style={{ display: "flex", alignItems: "center", padding: "4rem 1.5rem", background: "var(--card)", borderTop: "1px solid var(--border)" }}>
            <div style={{ width: "100%", maxWidth: 1040, margin: "0 auto" }}>
                <p style={{ color: "var(--accent-secondary)", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 12, fontWeight: 800, marginBottom: 12 }}>
                    Finance Model Library
                </p>
                <h2 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", lineHeight: 1.12, letterSpacing: "-0.03em", marginBottom: 14 }}>
                    按经营问题进入模型
                </h2>
                <p style={{ maxWidth: 600, color: "var(--muted)", lineHeight: 1.8, fontSize: 14, marginBottom: 24 }}>
                    模型库按问题扩展，而不是按当前数量写死。未来新增模型时，会自然加入这个工作台。
                </p>
                <FinanceModelLibrary compact />
            </div>
        </section>
    );
}
```

- [ ] **Step 3: Create homepage thinking and contact sections**

Create `src/components/home/HomeThinkingSection.tsx`:

```tsx
import Link from "next/link";
import { thinkingContent } from "@/lib/data/generated/content";

export default function HomeThinkingSection() {
    const latest = thinkingContent.slice(0, 4);

    return (
        <section id="thinking" className="full-viewport" style={{ display: "flex", alignItems: "center", padding: "4rem 1.5rem", borderTop: "1px solid var(--border)" }}>
            <div style={{ width: "100%", maxWidth: 1040, margin: "0 auto" }}>
                <p style={{ color: "var(--accent)", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 12, fontWeight: 800, marginBottom: 12 }}>
                    Thinking Lab
                </p>
                <h2 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", lineHeight: 1.12, letterSpacing: "-0.03em", marginBottom: 14 }}>
                    思考与方法
                </h2>
                <p style={{ maxWidth: 620, color: "var(--muted)", lineHeight: 1.8, fontSize: 14, marginBottom: 24 }}>
                    AI 工作流和随笔合并成持续更新的思考库，记录方法、判断和观察。
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
                    {latest.map((article) => (
                        <Link key={article.slug} href={article.href} style={{ textDecoration: "none" }}>
                            <article style={{ height: "100%", border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", padding: 18 }}>
                                <span style={{ color: "var(--muted)", fontSize: 12 }}>{article.date}</span>
                                <h3 style={{ color: "var(--foreground)", fontSize: 18, lineHeight: 1.35, margin: "8px 0" }}>{article.title}</h3>
                                <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>{article.description}</p>
                            </article>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
```

Create `src/components/home/HomeContactSection.tsx`:

```tsx
import { Mail, Linkedin, MessageCircle } from "lucide-react";
import { siteConfig } from "@/lib/config/site";

export default function HomeContactSection() {
    return (
        <section id="contact" style={{ borderTop: "1px solid var(--border)", padding: "4rem 1.5rem 5rem" }}>
            <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
                <h2 style={{ fontSize: "1.5rem", marginBottom: 10 }}>Lucas Yin</h2>
                <p style={{ color: "var(--muted)", lineHeight: 1.8, marginBottom: 24 }}>
                    奇瑞汽车 · 国际 · 财务 BP<br />
                    汽车出海 · 经营分析 · 财务模型 · AI 实践
                </p>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <a href={`mailto:${siteConfig.links?.email}`} style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--muted)", textDecoration: "none" }}>
                        <Mail style={{ width: 16, height: 16 }} /> {siteConfig.links?.email}
                    </a>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--muted)" }}>
                        <MessageCircle style={{ width: 16, height: 16 }} /> 微信：YPT1479239526
                    </span>
                    <a href="https://www.linkedin.com/in/lucasyin2002/" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--muted)", textDecoration: "none" }}>
                        <Linkedin style={{ width: 16, height: 16 }} /> LinkedIn
                    </a>
                </div>
            </div>
        </section>
    );
}
```

- [ ] **Step 4: Replace home page**

Replace `src/app/page.tsx`:

```tsx
import CapabilityHero from "@/components/home/CapabilityHero";
import HomeFinanceSection from "@/components/home/HomeFinanceSection";
import HomeThinkingSection from "@/components/home/HomeThinkingSection";
import HomeContactSection from "@/components/home/HomeContactSection";

export default function Home() {
  return (
    <>
      <CapabilityHero />
      <HomeFinanceSection />
      <HomeThinkingSection />
      <HomeContactSection />
    </>
  );
}
```

- [ ] **Step 5: Run lint and type check**

Run:

```bash
npx eslint src/app/page.tsx src/components/home/CapabilityHero.tsx src/components/home/HomeFinanceSection.tsx src/components/home/HomeThinkingSection.tsx src/components/home/HomeContactSection.tsx
npx tsc --noEmit
```

Expected: PASS. If React compiler flags object styles created in render, move stable style objects outside components or keep inline primitives that do not create state changes.

- [ ] **Step 6: Commit homepage redesign**

Run:

```bash
git add src/app/page.tsx src/components/home
git commit -m "Rebuild homepage around capability profile"
```

---

### Task 8: Navigation and Old Import Cleanup

**Files:**
- Modify: `src/components/layout/SiteNavigation.tsx`
- Modify: `src/lib/data/sections.ts`
- Modify: `src/lib/data/dialoguePatterns.ts`
- Delete: `src/app/ai/page.tsx`
- Delete: `src/app/essays/page.tsx`
- Delete: `src/app/explore/page.tsx`

- [ ] **Step 1: Update navigation items**

In `src/components/layout/SiteNavigation.tsx`, set:

```ts
const NAV_ITEMS = [
    { label: "首页", href: "/", activePath: "/" },
    { label: "财务模型", href: "/finance", activePath: "/finance" },
    { label: "思考与方法", href: "/thinking-lab", activePath: "/thinking-lab" },
    { label: "联系", href: "/#contact", sectionId: "contact" },
];
```

Update `shouldHideNavigation`:

```ts
function shouldHideNavigation(pathname: string) {
    return (
        pathname.startsWith("/finance/margin-analysis") ||
        pathname.startsWith("/finance/sensitivity-analysis") ||
        pathname.startsWith("/finance/business-analysis") ||
        pathname.startsWith("/finance/monthly-trend")
    );
}
```

Keep the desktop capsule style and mobile menu style.

- [ ] **Step 2: Update contact section scroll behavior**

In `handleClick`, ensure `/#contact` scrolls on homepage:

```ts
if (pathname === "/" && item.sectionId) {
    event.preventDefault();
    scrollToSection(item.sectionId);
}
```

This existing block should continue working after `sectionId` changes from `footer` to `contact`.

- [ ] **Step 3: Update legacy section data**

In `src/lib/data/sections.ts`, replace the `ai` and `essays` section entries with one thinking entry:

```ts
{
    id: "thinking",
    title: "Thinking Lab",
    subtitle: "思考与方法",
    description: "记录 AI 工作流、经营财务、市场观察和个人随笔",
    icon: Sparkles,
    href: "/thinking-lab",
    gradient: "from-[#d97757] to-[#6a9bcc]",
    iconBg: "bg-gradient-to-br from-[#d97757] to-[#6a9bcc]",
}
```

Keep the finance entry.

- [ ] **Step 4: Update dialogue pattern old links**

In `src/lib/data/dialoguePatterns.ts`, replace old `/ai` links:

```text
[AI 工作流](/ai)
```

with:

```text
[思考与方法](/thinking-lab)
```

Run:

```bash
rg "/ai|/essays|/explore|/article/" src/lib src/components src/app
```

Expected: no old links except allowed redirect strings in `next.config.ts` and deleted files not staged.

- [ ] **Step 5: Delete old pages**

Delete:

```text
src/app/ai/page.tsx
src/app/essays/page.tsx
src/app/explore/page.tsx
```

- [ ] **Step 6: Run lint/type check**

Run:

```bash
npm run lint
npx tsc --noEmit
```

Expected: PASS for route import cleanup.

- [ ] **Step 7: Commit navigation cleanup**

Run:

```bash
git add src/components/layout/SiteNavigation.tsx src/lib/data/sections.ts src/lib/data/dialoguePatterns.ts src/app/ai src/app/essays src/app/explore
git commit -m "Simplify navigation for new site structure"
```

---

### Task 9: AI Assistant Knowledge Upgrade

**Files:**
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/components/ChatWidget.tsx`
- Modify: `src/lib/chatFallback.ts`

- [ ] **Step 1: Update chat route imports**

In `src/app/api/chat/route.ts`, replace:

```ts
import { aiContent, essaysContent, financeContent } from "@/lib/data/generated/content";
```

with:

```ts
import { financeContent, thinkingContent } from "@/lib/data/generated/content";
import { financeModels } from "@/lib/finance/modelRegistry";
```

- [ ] **Step 2: Replace system prompt catalogs**

In `buildSystemPrompt()`, replace old three-board catalog with:

```ts
  const financeModelsCatalog = financeModels
    .map((model) => [
      `  - "${model.title}"：${model.summary}（链接：${model.href}）`,
      `    用途：${model.aiGuide.purpose}`,
      `    使用步骤：${model.aiGuide.steps.join(" / ")}`,
    ].join("\n"))
    .join("\n");

  const thinkingArticles = thinkingContent.length > 0
    ? thinkingContent
        .map((a) => `  - "${a.title}"：${a.description}（链接：${a.href}）`)
        .join("\n")
    : "  - 暂无内容，正在建设中";
```

Update prompt body sections:

```text
网站结构：
- 财务模型：/finance
- 思考与方法：/thinking-lab
- 联系：/#contact

财务模型库：
${financeModelsCatalog}

思考与方法：
${thinkingArticles}
```

Update rules:

```text
- 当用户问某个模型怎么用时，优先用模型说明里的用途、适用场景、使用步骤和示例数据回答
- 推荐模型或文章时，必须使用 Markdown 链接格式：[标题](路径)
- 不使用“站内索引”“fallback”“生成内容”等实现语言
- 语气克制、具体，不替 Lucas 自夸
```

- [ ] **Step 3: Update ChatWidget imports and card types**

In `src/components/ChatWidget.tsx`, replace generated content imports:

```ts
import {
    financeContent as staticFinance,
    thinkingContent as staticThinking,
} from "@/lib/data/generated/content";
```

Change:

```ts
type ContentCardType = "ai" | "finance" | "essays";
```

to:

```ts
type ContentCardType = "finance" | "thinking";
```

Replace static arrays:

```ts
const thinkingContent: ContentCard[] = staticThinking.map((item) => ({
    id: item.id, title: item.title, description: item.description,
    date: item.date, category: item.category ?? undefined, href: item.href,
}));
```

Call fallback with:

```ts
const result = getLocalFallbackResponse(userMessage.content, financeContent, thinkingContent, { includeOfflineNotice });
```

- [ ] **Step 4: Update quick prompts and greeting**

Set quick prompts:

```ts
const MOBILE_QUICK_PROMPTS = [
    "哪个模型适合预算复盘？",
    "这个网站能看什么？",
    "推荐一篇思考文章",
];
```

Set greeting:

```ts
return "你好，我是 Lucas AI。\\n\\n我可以帮你找财务模型、解释模型怎么用，也可以推荐思考与方法里的文章。";
```

- [ ] **Step 5: Update fallback signature**

In `src/lib/chatFallback.ts`, replace signature:

```ts
export function getLocalFallbackResponse(
    input: string,
    financeContent: LocalContentCard[],
    thinkingContent: LocalContentCard[] = [],
    options: { includeOfflineNotice?: boolean } = {}
): LocalFallbackResult
```

Set card type:

```ts
cardType?: "finance" | "thinking";
```

Replace old `/ai` and `/essays` responses with `/thinking-lab`. For Lucas intro response:

```ts
response: "Lucas Yin（殷鹏焘）关注经营分析、财务模型和 AI 工作流。你可以先看 [财务模型](/finance)，也可以进入 [思考与方法](/thinking-lab)。"
```

For content directory response:

```ts
response: "你可以先看两个入口：[财务模型](/finance) 和 [思考与方法](/thinking-lab)。如果想直接体验工具，可以先打开 [预算实际对比模型](/finance/business-analysis)。"
```

- [ ] **Step 6: Run old link search**

Run:

```bash
rg "/ai|/essays|/article/essays|/article/ai|日常随笔|AI 工作流" src/components/ChatWidget.tsx src/lib/chatFallback.ts src/app/api/chat/route.ts
```

Expected: no old path references. The words `AI 工作流` can remain only when describing a capability, not as a route label.

- [ ] **Step 7: Run lint/type check**

Run:

```bash
npx eslint src/app/api/chat/route.ts src/components/ChatWidget.tsx src/lib/chatFallback.ts
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 8: Commit AI assistant upgrade**

Run:

```bash
git add src/app/api/chat/route.ts src/components/ChatWidget.tsx src/lib/chatFallback.ts
git commit -m "Upgrade AI assistant for model and thinking lab"
```

---

### Task 10: Finance Tool Example Data Behavior

**Files:**
- Modify: `public/tools/margin-analysis/app.js`
- Inspect only: `src/app/finance/monthly-trend/monthly-trend-engine.js`
- Inspect only: `src/app/finance/business-analysis/business-analysis-engine.js`
- Inspect only: `src/app/finance/sensitivity-analysis/sensitivity-engine.js`

- [ ] **Step 1: Confirm current auto-demo behavior in Next tools**

Run:

```bash
rg -n "loadRows\\(createSampleRows\\(\\)|loadDemoData\\(\\)|initFileUpload\\(\\)" src/app/finance/monthly-trend/monthly-trend-engine.js src/app/finance/business-analysis/business-analysis-engine.js src/app/finance/sensitivity-analysis/sensitivity-engine.js
```

Expected:

- monthly trend calls `loadRows(createSampleRows(), "示例数据")` inside `initApp`.
- business analysis calls `loadDemoData()` inside `initApp`.
- sensitivity analysis calls `initFileUpload()` inside `initApp`, which renders default assumptions.

- [ ] **Step 2: Update margin static tool to auto-load demo on all viewports**

In `public/tools/margin-analysis/app.js`, replace the DOMContentLoaded viewport-only block:

```js
        // 手机端自动加载示例数据并收起侧边栏
        if (isMobile()) {
            const demoData = generateDemoData();
            processLoadedData(demoData, "示例数据");
            // 收起侧边栏
            const sidebar = document.getElementById("sidebar");
            const expandBtn = document.getElementById("sidebar-expand");
            sidebar.classList.add("collapsed");
            document.body.classList.remove("sidebar-open");
            expandBtn.style.display = "inline-flex";
            schedulePlotResize();
        }
```

with:

```js
        const demoData = generateDemoData();
        processLoadedData(demoData, "示例数据");

        if (isMobile()) {
            const sidebar = document.getElementById("sidebar");
            const expandBtn = document.getElementById("sidebar-expand");
            sidebar.classList.add("collapsed");
            document.body.classList.remove("sidebar-open");
            expandBtn.style.display = "inline-flex";
            schedulePlotResize();
        }
```

- [ ] **Step 3: Run existing finance tests**

Run:

```bash
npm run test:margin
npm run test:sensitivity
```

Expected: PASS.

- [ ] **Step 4: Commit example data behavior**

Run:

```bash
git add public/tools/margin-analysis/app.js
git commit -m "Auto-load margin demo data"
```

---

### Task 11: Remove Compatibility Exports and Old References

**Files:**
- Modify: `scripts/generate-content.js`
- Modify: `src/lib/data/generated/content.ts`

- [ ] **Step 1: Search for old content exports**

Run:

```bash
rg "aiContent|essaysContent|getContentBySlug|/article/|/ai|/essays|/explore" src scripts tests
```

Expected allowed results before cleanup:

- `scripts/generate-content.js` may still mention `ai` and `essays` as Notion source names.
- `tests/routing-contract.test.mjs` may contain old paths to verify redirects.
- No component/page should import `aiContent` or `essaysContent`.

- [ ] **Step 2: Remove compatibility exports**

In `scripts/generate-content.js`, remove the temporary exports:

```ts
export const aiContent: ContentItem[] = ...
export const essaysContent: ContentItem[] = ...
export function getContentBySlug(...)
```

Keep only:

```ts
export const financeContent: ContentItem[] = ...
export const thinkingContent: ContentItem[] = ...
export function getThinkingBySlug(...)
```

- [ ] **Step 3: Regenerate content**

Run:

```bash
npm run gen
```

Expected: generated file no longer exports old arrays.

- [ ] **Step 4: Run full old-reference search**

Run:

```bash
rg "aiContent|essaysContent|getContentBySlug|/article/ai|/article/essays|href=\"/ai\"|href=\"/essays\"" src scripts tests
```

Expected: no matches outside source-name handling in `scripts/generate-content.js` and redirect assertions in `tests/routing-contract.test.mjs`.

- [ ] **Step 5: Run site tests**

Run:

```bash
npm run test:site
```

Expected: PASS.

- [ ] **Step 6: Commit compatibility cleanup**

Run:

```bash
git add scripts/generate-content.js src/lib/data/generated/content.ts
git commit -m "Remove legacy content exports"
```

---

### Task 12: Full Verification and Visual QA

**Files:**
- No planned edits unless verification finds issues.

- [ ] **Step 1: Run full automated checks**

Run:

```bash
npm run lint
npx tsc --noEmit
npm run test:site
npm run test:margin
npm run test:sensitivity
npm run build:vercel
```

Expected: all commands PASS.

- [ ] **Step 2: Start local dev server**

Run:

```bash
npm run dev
```

Expected: Next dev server starts and prints a local URL, usually `http://localhost:3000`.

- [ ] **Step 3: Browser-check desktop routes**

Open and inspect at desktop width around `1440x900`:

```text
/
/finance
/thinking-lab
/finance/business-analysis
/finance/monthly-trend
/finance/sensitivity-analysis
/finance/margin-analysis
```

Expected:

- Homepage uses capsule nav and capability hero.
- Homepage primary button goes to `/finance`.
- `/finance` shows categories and all four models by default.
- `/thinking-lab` shows Notion-backed articles and category filters.
- Finance tools show demo/default data without requiring upload.
- Full-screen finance tools hide global navigation and keep their own back/control behavior.

- [ ] **Step 4: Browser-check mobile routes**

Inspect at `390x844`:

```text
/
/finance
/thinking-lab
/finance/business-analysis
/finance/monthly-trend
/finance/sensitivity-analysis
/finance/margin-analysis
```

Expected:

- Mobile homepage follows the same order as desktop.
- Mobile nav uses compact directory button.
- Finance library categories fit without text overlap.
- Tool controls start in their established mobile state.
- AI assistant button does not hide primary content or tool controls.

- [ ] **Step 5: Check redirects**

Run against the local dev server:

```bash
curl -I http://localhost:3000/ai
curl -I http://localhost:3000/essays
curl -I http://localhost:3000/article/ai/humanities-ai-guide
curl -I http://localhost:3000/article/essays/moonlight-ferry
```

Expected: each returns a 308 or 301-style permanent redirect to `/thinking-lab` or `/thinking-lab/<slug>`.

- [ ] **Step 6: Check AI assistant basics**

Ask in the AI assistant:

```text
哪个模型适合预算复盘？
单车指标变动归因模型怎么用？
这个网站能看什么？
推荐一篇思考文章
```

Expected:

- Answers link to `/finance/business-analysis` for budget review.
- Answers explain model steps using registry guide data.
- Answers use `/thinking-lab` links for articles.
- Answers do not mention fallback, index internals, or old `/ai` and `/essays` pages.

- [ ] **Step 7: Stop dev server**

Stop the dev server with `Ctrl-C`.

Expected: no required terminal sessions remain running.

- [ ] **Step 8: Final commit if verification fixes were needed**

If verification required fixes, commit them:

```bash
git add <changed-files>
git commit -m "Polish site redesign verification"
```

If no fixes were needed, do not create an empty commit.

---

## Completion Criteria

The work is complete only when:

- The final navigation is `首页 / 财务模型 / 思考与方法 / 联系`.
- `/finance` is a model library, not an article list.
- `/thinking-lab` is the only public article listing surface.
- Thinking article details render at `/thinking-lab/<slug>`.
- Old `/ai`, `/essays`, `/article/ai/<slug>`, and `/article/essays/<slug>` permanently redirect.
- Finance model URLs stay unchanged.
- All finance models open with visible demo/default data.
- AI assistant can recommend models and explain model usage.
- Old `/explore`, `/about`, old article route, and old list pages are gone.
- Full verification commands pass.
