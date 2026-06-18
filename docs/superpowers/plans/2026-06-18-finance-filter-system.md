# Finance Filter System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a shared finance filter logic center so margin analysis and business analysis can reuse the same Excel-style selection rules before deeper UI consolidation.

**Architecture:** Start with a pure, browser-safe filter logic module that does not depend on React or Plotly. Keep the existing model UIs intact for the first slice, and route their helper behavior through the shared filter functions where possible. Document the broader interaction center so future work can move table filters and drill controls into the same system.

**Tech Stack:** Vanilla JavaScript finance tools, Next.js app files, Node test runner, existing finance docs.

---

### Task 1: Shared Filter Logic Contract

**Files:**
- Create: `tests/finance-filter-system-contract.test.mjs`
- Create: `docs/finance-interaction-system.md`
- Create: `src/lib/finance/filters/index.ts`

- [ ] **Step 1: Write the failing test**

Add tests proving a shared finance filter module can normalize values, apply include/exclude selections, search options, invert selections, prune downstream filters, and expose docs for the interaction center.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/finance-filter-system-contract.test.mjs`

Expected: FAIL because `src/lib/finance/filters/index.ts` and `docs/finance-interaction-system.md` do not exist.

- [ ] **Step 3: Write minimal implementation**

Create the shared filter module with pure functions only:

- `normalizeFilterValues`
- `searchFilterOptions`
- `invertFilterSelection`
- `resolveAppliedFilterValues`
- `buildExcludeSelection`
- `matchesIncludeExcludeFilter`
- `pruneCascadingSelections`

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/finance-filter-system-contract.test.mjs`

Expected: PASS.

### Task 2: Existing Model Compatibility

**Files:**
- Modify: `public/tools/margin-analysis/app.js`
- Modify: `src/app/finance/business-analysis/business-analysis-engine.js`
- Modify: `tests/finance-filter-system-contract.test.mjs`

- [ ] **Step 1: Write compatibility assertions**

Add tests that confirm both margin analysis and business analysis reference the shared filter center or compatibility entrypoint.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/finance-filter-system-contract.test.mjs`

Expected: FAIL until both models expose the shared dependency.

- [ ] **Step 3: Wire only low-risk helpers**

Keep UI markup intact. Replace local value normalization/search/invert/prune helper bodies with calls into the shared finance filter functions where the runtime can safely access them.

- [ ] **Step 4: Run targeted tests**

Run:

```bash
node --test tests/finance-filter-system-contract.test.mjs
npm run test:margin
node --test tests/business-analysis-drill-ui.test.mjs
```

Expected: PASS.

### Task 3: Site Verification

**Files:**
- Modify: `package.json` if the new contract test should join `test:site`.
- Modify: `docs/finance-model-inventory.md`
- Modify: `agent.md`

- [ ] **Step 1: Add the contract test to site tests**
- [ ] **Step 2: Update finance inventory and handoff docs**
- [ ] **Step 3: Run full verification**

Run:

```bash
npx tsc --noEmit
npm run lint
npm run test:site
```

Expected: PASS.
