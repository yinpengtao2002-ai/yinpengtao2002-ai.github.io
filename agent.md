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
- `public/vendor/`: local browser copies of Plotly and SheetJS.

## Finance Models

Finance tools are first-class site pages under `/finance`. Each model should have:

- a route in `src/app/finance/<slug>/page.tsx`;
- a content card in `content/finance/<slug>.md`;
- accessible no-JS fallback copy through a hidden `ProjectDescription` and `<noscript>`;
- the shared `ToolBackButton`;
- local vendor assets where possible instead of CDN scripts;
- focused tests when calculation logic is complex.

Current models:

- `margin-analysis`: `/finance/margin-analysis`
  - Route: `src/app/finance/margin-analysis/page.tsx`
  - Static tool: `public/tools/margin-analysis/index.html`
  - Assets: `public/tools/margin-analysis/app.js`, `public/tools/margin-analysis/styles.css`
  - Content: `content/finance/margin-analysis.md`
  - Tests: `tests/margin-analysis-attribution.test.mjs`
  - Purpose: compare two periods of unit margin data and decompose changes into structure/mix effect and rate effect.

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

## Finance Model Conventions

- Prefer the FBP chain: sales volume -> net revenue -> contribution margin -> fixed deductions -> profit total. Add non-P&L modules only when the model explicitly asks for them.
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
- Do not revert user changes or generated work unless the user explicitly asks.
- Keep mobile and desktop in one responsive implementation when feasible.

## AI Assistant Configuration

- `/api/chat` expects an OpenAI-compatible endpoint through `CHAT_API_URL` and `CHAT_API_KEY`.
- Current default models in code: primary `gpt-5.4-mini`, fallback `gpt-5.2`.
- `.env.example` uses the 8848AI endpoint: `https://api.884819.xyz/v1/chat/completions`.
- Vercel environment variables override code defaults.
- Local development chat falls back to local content unless `.env.local` provides `CHAT_API_KEY` and `CHAT_API_URL`.
- On 2026-04-28, `z-ai/glm-5.1` and `z-ai/glm5` timed out through 8848AI, so do not restore them as defaults without retesting.
- Keep fallback wording user-facing; avoid phrases like "站内索引" unless deliberately exposing implementation details.

## Markdown Inventory

- `agent.md`: this handoff file.
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
