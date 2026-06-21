# Agent Handoff Notes

Future agents should read this file before changing this project. Keep it current when project conventions, finance tools, environment defaults, or deployment behavior change.

## Project Overview

- Site: Lucas Yin's personal website, `yinpengtao.cn`.
- Stack: Next.js 16, TypeScript, App Router, Tailwind CSS v4, Framer Motion.
- Main branch: `main`.
- Expected workflow: make practical fixes, verify locally, then commit and push directly unless the user says otherwise.
- Product taste: warm, restrained, editorial, Claude/Anthropic-inspired. Visual details matter, especially mobile layout, typography, and back navigation.

## Common Commands

- Lint all files: `npm run lint`
- Lint selected files: `npx eslint path/to/file.tsx`
- Type check: `npx tsc --noEmit`
- Production build: `npm run build`
- Regenerate content only: `npm run gen`
- Refresh local browser vendor files: `npm run prepare:vendor`
- Margin model tests: `npm run test:margin`
- Sensitivity model tests: `npm run test:sensitivity`

`npm run build` runs `scripts/generate-content.js` first and may rewrite `src/lib/data/generated/content.ts`. If the generated change is unrelated, restore it before committing:

```bash
git restore --worktree -- src/lib/data/generated/content.ts
```

## Key Structure

- `src/app/page.tsx`: homepage sections.
- `src/app/layout.tsx`: site metadata and global shell.
- `src/app/finance/page.tsx`: finance model listing page.
- `src/app/api/chat/route.ts`: server-side chat proxy for the site AI assistant.
- `src/components/ChatWidget.tsx`: floating AI assistant, including mobile sheet/fullscreen behavior.
- `src/components/finance/ToolBackButton.tsx`: shared back button for full-screen tools.
- `src/lib/chatFallback.ts`: local fallback responses when upstream AI is unavailable.
- `src/lib/data/generated/content.ts`: generated article/model index. Do not edit by hand.
- `content/`: local Markdown content sources used by `scripts/generate-content.js`.
- `docs/finance-model-inventory.md`: 财务模型清单，记录模型路由、源码、图表和交互模式。每次财务模型内容变化都要同步更新。
- `docs/finance-chart-system.md`: 财务图表中枢和模型依赖地图。改中枢图表、财务算法或模型图表组合时，必须先查这里并同步受影响模型。
- `docs/finance-interaction-system.md`: 财务交互中枢和模型依赖地图。改筛选器、级联筛选、下钻路径或明细表筛选时，必须先查这里并同步受影响模型。
- `docs/finance-template-system.md`: 财务模板中枢和模型依赖地图。改上传模板、示例数据、默认数据或模板族映射时，必须先查这里并同步同模板族模型。
- `public/vendor/`: local browser copies of Plotly and SheetJS.

## Finance Models

Finance tools are first-class site pages under `/finance`. Each model should have:

- a route in `src/app/finance/<slug>/page.tsx`;
- a content card in `content/finance/<slug>.md`;
- accessible no-JS fallback copy through a hidden `ProjectDescription` and `<noscript>`;
- the shared `ToolBackButton`;
- local vendor assets where possible instead of CDN scripts;
- focused tests when calculation logic is complex.

每次财务模型内容变化，都要同步更新 `docs/finance-model-inventory.md`。包括新增、删除、重命名财务模型，新增、删除或调整图表，改变交互模式，改变内测门禁，改变上传/模板行为，或修改模型库元数据。

每次触碰财务图表中枢或共享计算口径，都要先查看 `docs/finance-chart-system.md` 的模型依赖地图。不要只改一个页面里的图表实现；命中同一图表族或同一算法的模型都要同步检查文档、测试和可视行为。

每次触碰财务交互中枢、筛选器、级联筛选、维度下钻、明细表列筛选或上传后的字段治理，都要先查看 `docs/finance-interaction-system.md` 的模型依赖地图。不要在单个模型里重新手写筛选状态逻辑；优先复用 `src/lib/finance/filters/`。

每次触碰财务上传模板、模板按钮、示例数据、默认加载数据或上传说明，都要先查看 `docs/finance-template-system.md` 的模型依赖地图。同一模板族优先共享 `src/lib/finance/templates.js`；除敏感性分析之外，新财务模型默认先判断能否落在 `operating-detail` 经营明细事实表。

Current models:

- `monthly-trend`: `/finance/monthly-trend`
  - Route: `src/app/finance/monthly-trend/page.tsx`
  - Shell: `src/app/finance/monthly-trend/MonthlyTrendTool.tsx`
  - Engine: `src/app/finance/monthly-trend/monthly-trend-engine.js`
  - Styles: `src/app/finance/monthly-trend/tool.css`
  - Content: `content/finance/monthly-trend.md`
  - Purpose: analyze continuous monthly detail data across dimensions and metrics, including trends, MoM/YoY, same-month comparison, structure share, heatmaps, and concentration.

- `margin-analysis`: `/finance/margin-analysis`
  - Route: `src/app/finance/margin-analysis/page.tsx`
  - Static tool: `public/tools/margin-analysis/index.html`
  - Assets: `public/tools/margin-analysis/app.js`, `public/tools/margin-analysis/styles.css`
  - Content: `content/finance/margin-analysis.md`
  - Tests: `tests/margin-analysis-attribution.test.mjs`
  - Purpose: compare two periods of unit margin data and decompose changes into structure/mix effect and rate effect.

- `finance-ai-assistant`: `/finance/finance-ai-assistant`
  - Route: `src/app/finance/finance-ai-assistant/page.tsx`
  - Shared tool: `src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx`
  - Shared finance AI logic: `src/lib/finance-ai/`
  - Purpose: upload operating detail data and use continuous chat to generate finance answers, charts, and detail tables from the current browser-session dataset.

- `sensitivity-analysis`: `/finance/sensitivity-analysis`
  - Route: `src/app/finance/sensitivity-analysis/page.tsx`
  - Shell: `src/app/finance/sensitivity-analysis/SensitivityTool.tsx`
  - Engine: `src/app/finance/sensitivity-analysis/sensitivity-engine.js`
  - Styles: `src/app/finance/sensitivity-analysis/tool.css`
  - Content: `content/finance/sensitivity-analysis.md`
  - Tests: `tests/sensitivity-analysis.test.mjs`
  - Purpose: adjust sales volume, revenue, cost, fixed deductions, tax, and profit contribution assumptions to see profit impact.

- `business-analysis`: `/finance/business-analysis`
  - Route: `src/app/finance/business-analysis/page.tsx`
  - Shell: `src/app/finance/business-analysis/BusinessAnalysisTool.tsx`
  - Engine: `src/app/finance/business-analysis/business-analysis-engine.js`
  - Styles: `src/app/finance/business-analysis/tool.css`
  - Content: `content/finance/business-analysis.md`
  - Origin: adapted from Desktop `经营分析看板v14.html` / `business_dashboard_v14.html`.
  - Purpose: budget-vs-actual model across HQ dispatch/sales volume, net revenue, variable costs, contribution margin, fixed deductions, profit additions, and profit total. Excel uploads use separate `实际` and `预算` sheets with subjects on rows and amount in one column; the UI also has a second fixed/profit-subject entry area. Operating rows carry user-defined drillable dimensions while fixed/profit contribution rows may be summary amounts. Default dimensions are 大区、国家、品牌市场、经营模式、业务单元、车型, but uploads may include more or fewer dimensions.

- `profit-structure`: `/finance/profit-structure`
  - Route: `src/app/finance/profit-structure/page.tsx`
  - Shell: `src/app/finance/profit-structure/ProfitStructureTool.tsx`
  - Engine: `src/app/finance/profit-structure/profit-structure-engine.js`
  - Styles: `src/app/finance/profit-structure/tool.css`
  - Tests: `tests/profit-structure-analysis.test.mjs`
  - Purpose: multi-dimensional profit structure diagnosis from one operating detail table. The expected bottom-table habit is `月份` + any user-uploaded dimensions + `销量` + finance metrics such as `净收入`, `成本`, and `边际`. Do not position this model around one fixed dimension such as 车型 or 产品; all uploaded dimension columns should remain available for primary analysis, combination, filtering, and drill-down.

- `perspective-bi`: `/finance/perspective-bi`
  - Route: `src/app/finance/perspective-bi/page.tsx`
  - Purpose: a productized Perspective BI workbench for ad hoc CSV/XLSX/XLS exploration before users enter a more opinionated finance model.

## Finance Model Conventions

- Prefer the FBP chain: sales volume -> net revenue -> contribution margin -> fixed deductions -> profit total. Add non-P&L modules only when the model explicitly asks for them.
- Treat the finance chart system as the shared source of truth for reusable chart specs, Plotly theme/config, PVM attribution, and FBP bridge logic. Local per-model chart code should move toward this center instead of growing new one-off implementations.
- Treat the finance interaction system as the shared source of truth for reusable filter state, cascading filter pruning, drill paths, and detail-table filters. Model-local UI shells can remain, but state logic should move toward `src/lib/finance/filters/`.
- Treat the finance template system as the shared source of truth for upload templates and demo data. 除敏感性分析之外，`business-analysis`, `margin-analysis`, `monthly-trend`, `profit-structure`, `perspective-bi`, and the finance AI assistant belong to the `operating-detail` family; sensitivity uses `profit-sensitivity-assumptions`.
- Keep dimensions business-readable: region, country, model/product, channel, customer/store where relevant.
- Use upload, template download, demo data, filters, KPI cards, tables, and charts as real controls, not decorative controls.
- Use a left control console plus a scrollable analysis workspace for full-screen tools.
- Use restrained light styling: `#faf9f5` background, white panels, orange/blue/green accents, 8px panel radius.
- Avoid external CDNs for tool runtime dependencies. Use `public/vendor/plotly/plotly.min.js` and `public/vendor/xlsx/xlsx.full.min.js`.
- If importing old dashboard HTML, remove third-party branding, watermarks, dark neon themes, and purely cosmetic theme controls unless the user explicitly wants them.

## Behavior Rules To Preserve

- Back buttons should use `router.back()` when browser history exists, with a sensible fallback.
- Mobile AI links to internal pages should close the AI panel so the destination page is not covered.
- Desktop AI should remain a side/floating assistant where possible.
- The public site is intentionally single-theme light mode. Do not reintroduce a dark-mode toggle or `data-theme="dark"` styling unless the user explicitly asks for it.
- Do not revert user changes or generated work unless the user explicitly asks.
- Keep mobile and desktop in one responsive implementation when feasible.

## AI Assistant Configuration

- `/api/chat`, `/api/tools/finance-ai-assistant`, and `/api/tools/study-cards` share `src/lib/ai/providers.ts`.
- The formal finance AI assistant must preserve the `plan -> deterministic browser compute -> explain` chain. Do not add API modes that send uploaded workbook rows directly to a provider for calculation.
- The primary provider is GPT (`gpt-5.5`) through `AI_PRIMARY_API_KEY`, `AI_PRIMARY_API_URL`, and optional `AI_PRIMARY_MODEL`; the default URL is `https://api.dstopology.com`, normalized to `/v1/chat/completions`.
- DeepSeek (`deepseek-v4-pro`) stays as the fallback model. If `DEEPSEEK_API_KEY` is absent, fallback reuses the primary NewAPI key and URL; if `DEEPSEEK_API_KEY` is present, it uses `DEEPSEEK_API_URL`, defaulting to `https://api.deepseek.com/chat/completions`.
- Do not hard-code real AI secrets in the repo. Configure production keys in Vercel environment variables.
- Do not reintroduce the old generic fallback variables (`CHAT_API_URL` / `CHAT_API_KEY`); that key path is deprecated.
- Local development chat falls back to local content unless `.env.local` provides at least one provider key.
- On 2026-04-28, `z-ai/glm-5.1` and `z-ai/glm5` timed out through 8848AI, so do not restore them as defaults without retesting.
- Keep fallback wording user-facing; avoid phrases like "站内索引" unless deliberately exposing implementation details.

## Markdown Inventory

- `agent.md`: this handoff file.
- `docs/finance-model-inventory.md`: 当前财务模型清单，包含路由、图表和交互模式。任何财务模型内容变化都要同步更新。
- `docs/finance-chart-system.md`: 财务图表中枢、共享算法边界和模型依赖地图。任何中枢图表或共享口径变化都要同步核对。
- `docs/finance-interaction-system.md`: 财务交互中枢、筛选器/下钻/明细表筛选依赖地图。任何共享交互或模型筛选变化都要同步核对。
- `docs/finance-template-system.md`: 财务模板中枢、上传模板、示例数据和模型模板族依赖地图。任何模板族或示例数据变化都要同步核对。
- `content/finance/*.md`: active finance model listing sources. Do not delete casually.
- `website-changelog.md`: useful history of the website rebuild. Not used at runtime.
- `README.md`: currently outdated create-next-app-style project notes. Candidate for replacement.
- `findings.md`, `progress.md`, `task_plan.md`: old January 2026 refactor notes. Mostly stale historical context.

Do not delete stale Markdown files without explicit user confirmation.

## Recent Gotchas

- The margin analysis tool is static frontend files, not Streamlit.
- Desktop source folders may contain extra files such as `.git`, `.DS_Store`, `.claude`, `.devcontainer`, and `agent.md`; do not blindly copy whole folders into this repo.
- Markdown bold rendering has CommonMark delimiter edge cases when `**` touches quote/currency characters. Use `src/lib/markdown/normalizeStrongEmphasis.ts` rather than patching article text by hand.
- Keep finance tools scoped to their own route folders. Shared utilities are fine, but avoid cross-tool globals that can leak between full-screen tool pages.
