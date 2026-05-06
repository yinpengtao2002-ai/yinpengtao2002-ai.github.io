# Homepage Motion System And Mobile Finance List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a restrained Hex-inspired motion system for page transitions and homepage scroll, while making the mobile finance model index easier to scan.

**Architecture:** Keep the existing Next.js App Router and Framer Motion stack. Add one client-side page transition wrapper, extend existing home sections with viewport-triggered animation classes, make the global navigation aware of the active homepage section, and add mobile-only compact card styling to the finance model library.

**Tech Stack:** Next.js 16 App Router, React 19, Framer Motion, CSS media queries, Node test contracts, Playwright visual checks through the bundled runtime.

---

### Task 1: Add Page Transition Wrapper

**Files:**
- Create: `src/components/layout/PageTransition.tsx`
- Modify: `src/app/layout.tsx`
- Test: `tests/navigation-contract.test.mjs`

- [x] **Step 1: Add a test contract**

Add assertions that the layout imports and wraps children with `PageTransition`, and that the transition component uses `AnimatePresence`, `usePathname`, and reduced-motion handling.

- [x] **Step 2: Implement component**

Create `PageTransition` as a client component keyed by `usePathname()`. It should animate `opacity` and `y` only, with a short duration and no large directional movement.

- [x] **Step 3: Wrap root content**

Wrap the root `<main>` children in `PageTransition` without moving `ClientShell`.

### Task 2: Add Homepage Scroll Reveal

**Files:**
- Modify: `src/components/home/HomeFinanceSection.tsx`
- Modify: `src/components/home/HomeThinkingSection.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/home-experience-contract.test.mjs`

- [x] **Step 1: Add section animation contracts**

Assert that finance and thinking sections use viewport-triggered motion wrappers, and that reduced-motion CSS disables nonessential animation.

- [x] **Step 2: Add finance reveal layers**

Use `motion` wrappers with `whileInView` for the finance header, stage, and switcher cards. Keep the existing model-switch animation.

- [x] **Step 3: Add thinking reveal layers**

Use a single section-level motion wrapper and keep the current card-rise animation.

### Task 3: Make Navigation Follow Homepage Sections

**Files:**
- Modify: `src/components/layout/SiteNavigation.tsx`
- Test: `tests/navigation-contract.test.mjs`

- [x] **Step 1: Add section observer contract**

Assert that navigation observes `home`, `finance`, `thinking`, and `contact`, and that it exposes an active capsule marker.

- [x] **Step 2: Implement section state**

On the homepage, use `IntersectionObserver` to set `activeSectionId`. Keep page-route active behavior on non-home pages.

- [x] **Step 3: Add active capsule marker**

Render a subtle `motion.span` behind the active desktop nav item. Mobile menu items should also reflect the active section.

### Task 4: Compact Mobile Finance Model Index

**Files:**
- Modify: `src/components/finance/FinanceModelLibrary.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/finance-model-registry.test.mjs`

- [x] **Step 1: Add mobile compact-list contract**

Assert that the finance library emits list-specific classes and CSS hides oversized preview cards on mobile.

- [x] **Step 2: Add semantic classes**

Replace inline-only card styling with class names for the link, category, title, summary, and action elements.

- [x] **Step 3: Add mobile CSS**

At mobile widths, render each model as a horizontal compact row with a small thumbnail and concise text. Keep desktop unchanged.

### Task 5: Verify, Commit, Deploy

**Files:**
- Existing tests and generated screenshots under `output/playwright/`

- [x] **Step 1: Run unit and contract checks**

Run `npm run test:site`, `npm run lint`, `npx tsc --noEmit`, and `git diff --check`.

- [x] **Step 2: Run production build**

Run `npm run build:vercel`.

- [x] **Step 3: Visual check**

Capture `/`, `/#finance`, and `/finance` at desktop and mobile sizes. Confirm mobile `/finance` shows multiple models without long image cards.

- [x] **Step 4: Commit and push**

Commit with `Polish motion system and mobile finance list`, push `main`, then confirm GitHub Pages and Vercel success for the new commit.
