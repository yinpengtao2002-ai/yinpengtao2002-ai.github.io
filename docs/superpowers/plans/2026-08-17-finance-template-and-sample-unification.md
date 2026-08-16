# Finance Template And Sample Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every finance-model example workbook use one canonical business story and one visible operating-detail contract, with budget and actual represented by workbook sheets instead of a row-level field.

**Architecture:** Keep `src/lib/finance/templates.js` as the template hub, backed by a browser-safe canonical operating-detail module that both Next.js tools and the static margin tool can consume. Separate visible headers from the internal normalized scenario field, select deterministic model-specific subsets from the canonical rows, and use a shared SheetJS workbook helper for clean row-1 data sheets plus guidance sheets. Preserve legacy upload parsing, including old files that still contain `数据口径` or an embedded metric-role row.

**Tech Stack:** Next.js 16, TypeScript/JavaScript, SheetJS, Node test runner, Playwright.

---

### Task 1: Lock The Visible Template And Canonical Sample Contract

**Files:**
- Modify: `tests/finance-template-system-contract.test.mjs`
- Modify: `tests/margin-analysis-attribution.test.mjs`
- Modify: `tests/finance-ai-assistant-contract.test.mjs`
- Modify: `tests/profit-structure-analysis.test.mjs`

- [x] **Step 1: Replace the old visible-header expectations**

Assert that `OPERATING_DETAIL_HEADERS` omits `数据口径`, while `OPERATING_DETAIL_INTERNAL_HEADERS` contains it for normalized scenario rows.

- [x] **Step 2: Add deterministic subset coverage tests**

For each operating-detail model, assert that template rows are canonical rows, cover the periods required by that model, include multiple regions/countries/brands, and do not expose `数据口径`.

- [x] **Step 3: Add scenario-pairing tests**

Assert that actual and budget sheet rows have identical business keys, that budget generation is invariant to input order/subsetting, and that budget notes are blank.

- [x] **Step 4: Add static-margin synchronization tests**

Assert that `generateDemoData()` equals the shared margin profile, has exactly two paired periods, and that the downloadable data header starts on row 1 without `数据口径`.

- [x] **Step 5: Run the focused tests and observe RED**

Run:

```bash
node --test tests/finance-template-system-contract.test.mjs tests/margin-analysis-attribution.test.mjs tests/finance-ai-assistant-contract.test.mjs tests/profit-structure-analysis.test.mjs
```

Expected: failures for the old header shape, naive sampling, static margin data, and workbook packaging.

### Task 2: Create One Browser-Safe Canonical Operating-Detail Source

**Files:**
- Create: `public/tools/shared/operating-detail-templates.js`
- Modify: `src/lib/finance/templates.js`
- Modify: `src/lib/finance/templates.d.ts`
- Modify: `public/tools/margin-analysis/index.html`

- [x] **Step 1: Implement the shared canonical generator**

Expose visible/internal headers, business-key fields, field dictionary rows, fill instructions, the 18-month sample generator, stable budget derivation, and model profile selection through both `module.exports` and `globalThis.FinanceOperatingDetailTemplates`.

- [x] **Step 2: Define model sample profiles**

Use two paired periods for margin attribution, broad multi-dimensional subsets for profit/BI, continuous periods for monthly trend and AI, and paired scenario subsets for business analysis.

- [x] **Step 3: Make `templates.js` the typed facade**

Re-export the shared operating-detail API alongside template-family metadata. Keep compatibility aliases while moving all user-facing callers to `getOperatingDetailTemplateRowsForModel(modelSlug)`.

- [x] **Step 4: Load the canonical source before the static margin app**

Add the shared script to the static tool and fail clearly if either shared finance module is missing.

- [x] **Step 5: Run the template contract tests and reach GREEN for the data layer**

Run:

```bash
node --test tests/finance-template-system-contract.test.mjs tests/margin-analysis-attribution.test.mjs
```

Expected: canonical data, stable budget rows, and profile tests pass.

### Task 3: Standardize SheetJS Workbook Packaging

**Files:**
- Create: `src/lib/finance/template-workbook.ts`
- Create: `tests/finance-template-workbook.test.mjs`
- Modify: `src/app/finance/monthly-trend/monthly-trend-engine.js`
- Modify: `src/app/finance/profit-structure/profit-structure-engine.js`
- Modify: `src/app/finance/perspective-bi/perspective-bi-engine.js`
- Modify: `src/app/finance/business-analysis/business-analysis-engine.js`
- Modify: `src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx`
- Modify: `src/app/finance/sensitivity-analysis/sensitivity-engine.js`

- [x] **Step 1: Write a workbook-helper contract test**

Create a workbook in memory and assert that data sheets have the header at row 1, an autofilter covering the data range, sensible widths, and separate `填表说明` / `字段字典` sheets.

- [x] **Step 2: Run the workbook-helper test and observe RED**

Run:

```bash
node --test tests/finance-template-workbook.test.mjs
```

Expected: import failure because the helper does not exist.

- [x] **Step 3: Implement the shared workbook helper**

Provide pure functions that create ordered data worksheets and information worksheets, apply widths/autofilter/header styling, and append sheets with Chinese names.

- [x] **Step 4: Migrate operating-detail workbooks**

Use model-specific canonical rows, visible headers, `经营明细` or `实际` / `预算` data sheets, and the shared instructions/dictionary metadata.

- [x] **Step 5: Standardize the sensitivity workbook**

Keep its separate assumption-row family, but rename sheets/files in Chinese and add row-1 data, autofilter, `填表说明`, and `字段字典`.

- [x] **Step 6: Run workbook and focused model tests**

Run:

```bash
node --test tests/finance-template-workbook.test.mjs tests/finance-template-system-contract.test.mjs tests/finance-ai-assistant-contract.test.mjs
npm run test:sensitivity
```

Expected: all pass.

### Task 4: Rebuild The Static Margin Workbook Around The Shared Story

**Files:**
- Modify: `public/tools/margin-analysis/app.js`
- Modify: `public/tools/margin-analysis/index.html`
- Modify: `tests/margin-analysis-attribution.test.mjs`

- [x] **Step 1: Replace the standalone portfolio generator**

Return the shared `margin-analysis` profile for both page demo and template rows.

- [x] **Step 2: Replace the custom one-sheet ZIP template**

Use SheetJS to produce `经营明细`, `填表说明`, and `字段字典`; keep the CSV template as a clean row-1 single-table fallback.

- [x] **Step 3: Preserve legacy metric-role uploads**

Continue recognizing embedded `指标角色` rows, and additionally read role assignments from the new `字段字典` sheet when present.

- [x] **Step 4: Update visible copy and filenames**

Explain that base/current are selected by month, not budget/actual, and use Chinese-facing filenames.

- [x] **Step 5: Run all margin tests**

Run:

```bash
npm run test:margin
```

Expected: all pass.

### Task 5: Make The Finance AI Read-Only Demo Reproducible

**Files:**
- Create: `src/lib/finance-ai/demo-story.js`
- Create: `src/lib/finance-ai/demo-story.d.ts`
- Create: `tests/finance-ai-demo-story.test.mjs`
- Modify: `src/app/finance/finance-ai-assistant/demo/FinanceAIConversationDemo.tsx`

- [x] **Step 1: Write a failing canonical-story test**

Assert that every region, country, model and number displayed by the demo can be recomputed from canonical actual/budget rows for the selected periods.

- [x] **Step 2: Build aggregate demo facts from canonical rows**

Compute region scenario comparison, country KPI comparison, model-level unit-margin bridge, region month-over-month comparison, and country contribution bridge.

- [x] **Step 3: Generate charts and narrative from those facts**

Replace unrelated hard-coded regions, models and values with the canonical brands, countries and calculated totals.

- [x] **Step 4: Run AI demo and assistant contracts**

Run:

```bash
node --test tests/finance-ai-demo-story.test.mjs tests/finance-ai-assistant-contract.test.mjs tests/finance-ai-core.test.mjs
```

Expected: all pass.

### Task 6: Remove The Misleading Business CSV Download And Fix Copy

**Files:**
- Modify: `src/app/finance/business-analysis/BusinessAnalysisTool.tsx`
- Modify: `src/app/finance/business-analysis/business-analysis-engine.js`
- Modify: `src/app/finance/business-analysis/page.tsx`
- Modify: `tests/finance-template-system-contract.test.mjs`

- [x] **Step 1: Add a failing UI/source contract**

Assert that the budget/actual tool exposes only an Excel template action and no CSV-template fallback, while CSV upload support remains.

- [x] **Step 2: Remove the CSV-template control and handler**

Keep summary export and legacy CSV upload behavior unchanged.

- [x] **Step 3: Fix page and workbook guidance**

Describe row-1 operating-detail columns in two scenario sheets; remove the obsolete “科目在行上、金额在列上” wording.

- [x] **Step 4: Run business and template contracts**

Run the focused business-analysis and finance-template test files and expect all pass.

### Task 7: Update Durable Documentation

**Files:**
- Modify: `docs/finance-template-system.md`
- Modify: `docs/finance-model-inventory.md`
- Modify: `agent.md`

- [x] **Step 1: Document visible versus internal semantics**

Record that user-facing operating-detail sheets never contain `数据口径`, while parsers may still normalize sheet names or legacy columns internally.

- [x] **Step 2: Document canonical profiles and workbook packaging**

Record the shared story, deterministic subset rules, row-1 data sheets, separate instruction/dictionary sheets, units, signs, roles and aggregation guidance.

- [x] **Step 3: Document the budget/actual CSV decision**

Record that the model teaches Excel only because CSV cannot represent two scenario sheets, while CSV upload remains compatible.

### Task 8: Verify Downloads, Build, And Deploy

**Files:**
- Modify only if verification finds a scoped defect.

- [x] **Step 1: Run focused and full relevant checks**

```bash
node --test tests/finance-template-system-contract.test.mjs tests/finance-template-workbook.test.mjs tests/finance-ai-demo-story.test.mjs tests/finance-ai-assistant-contract.test.mjs tests/finance-ai-core.test.mjs tests/business-analysis-unit-bridge.test.mjs tests/business-analysis-drill-ui.test.mjs tests/finance-mobile-drill-contract.test.mjs tests/profit-structure-analysis.test.mjs
npm run test:margin
npm run test:sensitivity
npm run lint
npx tsc --noEmit
npm run build:vercel
git diff --check
```

- [x] **Step 2: Inspect generated workbooks**

Download representative templates in a real browser, open them with the bundled spreadsheet runtime, verify sheet names, row-1 headers, paired keys, autofilters, widths, field dictionaries, and absence of visible `数据口径`.

- [x] **Step 3: Verify browser behavior**

Check desktop and mobile routes for template actions, static margin demo data, AI read-only charts, uploads and console errors.

- [ ] **Step 4: Commit and push only scoped files**

Preserve `generated-posters/`, commit the finance-template changes, and push `main`.

- [ ] **Step 5: Confirm deployment**

Verify GitHub checks, Vercel status for the exact commit, and the named live routes before reporting the change as shipped.
