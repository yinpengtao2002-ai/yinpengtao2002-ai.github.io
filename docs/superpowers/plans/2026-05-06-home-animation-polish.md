# Home Animation Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add restrained Hex-inspired motion that helps visitors understand Lucas's finance models, thinking library, and AI navigation.

**Architecture:** Keep the existing homepage structure. Add progressive CSS/Framer motion around existing components, and keep AI recommendation cards inside `ChatWidget` so internal links become visible navigation surfaces.

**Tech Stack:** Next.js App Router, React, TypeScript, Framer Motion, CSS animations, Node contract tests.

---

### Task 1: Add Animation Contract Tests

**Files:**
- Modify: `tests/home-experience-contract.test.mjs`
- Modify: `tests/chat-math-normalization.test.mjs`

- [ ] Add tests that require `ProductStageVisual` to expose layered motion elements and `globals.css` to define `home-product-stage-layer-in`.
- [ ] Add tests that require `HomeFinanceSection` to key the active stage by model slug and use `.home-finance-stage-motion`.
- [ ] Add tests that require `HomeThinkingSection` to pass a per-card motion index and CSS to animate/hover thinking cards.
- [ ] Add tests that require `ChatWidget` to derive internal route cards from assistant markdown links and render `InternalRouteCardList`.
- [ ] Run `node --test tests/home-experience-contract.test.mjs tests/chat-math-normalization.test.mjs` and confirm these new tests fail before implementation.

### Task 2: Implement Homepage Motion

**Files:**
- Modify: `src/components/home/ProductStageVisual.tsx`
- Modify: `src/components/home/HomeFinanceSection.tsx`
- Modify: `src/components/home/HomeThinkingSection.tsx`
- Modify: `src/app/globals.css`

- [ ] Add non-interactive product-stage overlay layers for model shell, chart tiles, and AI note.
- [ ] Wrap the active desktop finance stage in `home-finance-stage-motion` keyed by `activeModel.slug`.
- [ ] Add per-card CSS variables to thinking cards for staggered entry and hover lift.
- [ ] Add reduced-motion fallbacks so animations collapse to static opacity/transform.

### Task 3: Implement AI Internal Route Cards

**Files:**
- Modify: `src/components/ChatWidget.tsx`

- [ ] Add a small route-card registry for `/finance`, `/thinking-lab`, and the four finance model routes.
- [ ] Normalize assistant text once, extract markdown internal links, dedupe by href, and render up to three compact route cards when no richer content card list is already present.
- [ ] Make route cards close the mobile AI sheet and navigate through Next router.

### Task 4: Verify And Ship

**Files:**
- No code files expected beyond Tasks 2-3.

- [ ] Run `npm run test:site`.
- [ ] Run `npm run lint`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build:vercel`.
- [ ] Browser-check desktop and mobile homepage motion and AI route cards.
- [ ] Commit, push, and verify GitHub Pages plus Vercel for the new commit.
