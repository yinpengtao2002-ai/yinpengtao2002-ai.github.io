# Goalkeeper Landscape Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hidden `/tools/goalkeeper-landscape-lab` workbench for physics and asset review while keeping `/tools/goalkeeper-landscape` unchanged.

**Architecture:** The lab is a route-local static Next.js page with route-local CSS and local static arrays for deterministic physics scenarios and asset candidates. Public discovery stays unchanged: the lab is not added to sitemap, Thinking Lab content, global nav, or tool lists.

**Tech Stack:** Next.js App Router, React server component, CSS module, Node contract tests.

---

### Task 1: Hidden Route Contract

**Files:**
- Modify: `tests/routing-contract.test.mjs`
- Create later: `src/app/tools/goalkeeper-landscape-lab/page.tsx`
- Create later: `src/app/tools/goalkeeper-landscape-lab/GoalkeeperLandscapeLab.module.css`

- [ ] **Step 1: Write the failing test**

Add a test that reads the future lab route file and locks the hidden-discovery contract:

```js
test("goalkeeper landscape lab is a hidden internal workbench route", async () => {
  const labPage = await readFile(
    new URL("../src/app/tools/goalkeeper-landscape-lab/page.tsx", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(labPage, /redirect\(/);
  assert.match(labPage, /Goalkeeper Landscape Lab/);
  assert.match(labPage, /Physics Lab/);
  assert.match(labPage, /Asset Lab/);
  assert.match(labPage, /低平滚动球/);
  assert.match(labPage, /中路抱球/);
  assert.match(labPage, /侧身拨挡/);
  assert.match(labPage, /上升掌托/);
  assert.match(labPage, /擦碰漏防/);
  assert.match(labPage, /Khronos glTF Sample Assets/);
  assert.match(labPage, /Kenney official assets/);
  assert.match(labPage, /license/);
  assert.match(labPage, /performance/);
  assert.doesNotMatch(sitemap, /goalkeeper-landscape-lab/);
  assert.doesNotMatch(thinkingLabContent, /goalkeeper-landscape-lab/);
  assert.doesNotMatch(thinkingClient, /goalkeeper-landscape-lab/);
  assert.doesNotMatch(clientShell, /goalkeeper-landscape-lab/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/routing-contract.test.mjs`

Expected: FAIL with `ENOENT` for `src/app/tools/goalkeeper-landscape-lab/page.tsx`.

- [ ] **Step 3: Implement the minimal route**

Create `src/app/tools/goalkeeper-landscape-lab/page.tsx` with:

```tsx
import type { Metadata, Viewport } from "next";
import styles from "./GoalkeeperLandscapeLab.module.css";

export const metadata: Metadata = {
  title: "Goalkeeper Landscape Lab｜Lucas Yin",
  description: "Hidden goalkeeper game workbench for physics scenarios and asset review.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function GoalkeeperLandscapeLabPage() {
  return <main className={styles.page}>...</main>;
}
```

Create `src/app/tools/goalkeeper-landscape-lab/GoalkeeperLandscapeLab.module.css` with scoped workbench layout styles only.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/routing-contract.test.mjs`

Expected: PASS.

### Task 2: Workbench Content And Responsive Layout

**Files:**
- Modify: `src/app/tools/goalkeeper-landscape-lab/page.tsx`
- Modify: `src/app/tools/goalkeeper-landscape-lab/GoalkeeperLandscapeLab.module.css`
- Test: `tests/routing-contract.test.mjs`

- [ ] **Step 1: Expand route content under the existing contract**

The route should expose:

```tsx
const physicsScenarios = [
  { name: "低平滚动球", status: "ground-roll", position: "x -1.8 / y 0.34 / z -7.2" },
  { name: "中路抱球", status: "pocket-catch", position: "x 0.0 / y 1.18 / z -5.4" },
  { name: "侧身拨挡", status: "side-parry", position: "x 1.35 / y 1.06 / z -5.0" },
  { name: "上升掌托", status: "rising-palm", position: "x -0.6 / y 1.62 / z -4.7" },
  { name: "擦碰漏防", status: "poor-contact", position: "x 1.72 / y 0.92 / z -3.8" },
];
```

The asset list should include Khronos, Kenney, procedural goal/field/glove placeholders, and custom material pass rows with `license`, `status`, `source`, and `performance`.

- [ ] **Step 2: Add compact CSS**

Use a full-viewport workbench with left rail, preview area, and telemetry grid. Keep cards at 8px radius or less, avoid marketing hero layout, and include mobile layout rules below 820px.

- [ ] **Step 3: Run targeted verification**

Run: `node --test tests/routing-contract.test.mjs tests/navigation-contract.test.mjs`

Expected: PASS.

### Task 3: Build And Browser Verification

**Files:**
- Verify only unless targeted fixes are needed.

- [ ] **Step 1: Run local verification ladder**

Run:

```bash
node --test tests/routing-contract.test.mjs tests/navigation-contract.test.mjs
npx tsc --noEmit
npm run lint
npm run build:vercel
```

Expected: all commands exit 0. Existing warnings are acceptable only if they are warnings, not errors.

- [ ] **Step 2: Local browser smoke**

Start a local dev server and verify:

```text
http://localhost:<port>/tools/goalkeeper-landscape-lab
http://localhost:<port>/tools/goalkeeper-landscape
```

Check desktop and mobile widths. The lab should load directly with Physics Lab and Asset Lab visible; the stable game should still load unchanged.

### Task 4: Commit, Push, Deploy, Live Smoke

**Files:**
- Stage only files from this lab task.

- [ ] **Step 1: Commit**

Run:

```bash
git add docs/superpowers/plans/2026-07-07-goalkeeper-landscape-lab.md tests/routing-contract.test.mjs src/app/tools/goalkeeper-landscape-lab/page.tsx src/app/tools/goalkeeper-landscape-lab/GoalkeeperLandscapeLab.module.css
git commit -m "Add goalkeeper landscape lab"
```

- [ ] **Step 2: Push and deployment checks**

Run:

```bash
git push origin main
gh run list --branch main --limit 5 --json databaseId,displayTitle,status,conclusion,headSha,workflowName
```

Watch the new run with `gh run watch <run-id> --exit-status`.

- [ ] **Step 3: Production smoke**

Verify:

```text
https://yinpengtao.cn/tools/goalkeeper-landscape-lab/
https://yinpengtao.cn/tools/goalkeeper-landscape/
```

The lab should return 200 and render the workbench. The stable game should still return 200.
