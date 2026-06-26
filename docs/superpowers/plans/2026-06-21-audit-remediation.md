# Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Work through `docs/project-audit-report.md` one verified item at a time, starting with the high-risk paid finance AI route.

**Architecture:** Treat the audit report as a triage source, not an unquestioned spec. Each item must be re-checked against current code, fixed with the smallest durable change, verified, then recorded back into the audit report with status, date, files, and commands.

**Tech Stack:** Next.js App Router route handlers, React client components, Node test runner contract tests, existing HMAC access token helpers.

---

### Task 1: Gate The Paid Finance AI Assistant POST Route

**Files:**
- Modify: `tests/finance-ai-assistant-contract.test.mjs`
- Modify: `src/app/api/tools/finance-ai-assistant/route.ts`
- Modify: `src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx`
- Modify: `docs/project-audit-report.md`

- [x] **Step 1: Write the failing route contract**

Add a contract test that calls `POST(makeRequest({ mode: "plan", question: "巴西 3 月边际怎么看？", schema: {} }, { accessToken: false }))` and expects status `401` plus `errorCode: "access_denied"`.

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Expected: FAIL because the current route returns `400 invalid_schema` before any access check.

- [x] **Step 3: Implement route access check**

Import `FINANCE_AI_ACCESS_HEADER` and `verifyFinanceAIAccessToken` from `src/lib/finance-ai/access.ts`, then reject `POST` requests before JSON parsing when the header is missing, invalid, or expired.

- [x] **Step 4: Update test request helper**

Make `makeRequest` include a freshly signed finance AI access token by default, while allowing `{ accessToken: false }` for denial tests.

- [x] **Step 5: Gate the client workbench**

Add an in-memory access form to `FinanceAIAssistantTool.tsx`, reuse `/api/tools/finance-ai-assistant/access`, and include `X-Finance-AI-Access` in `callAI` requests.

- [x] **Step 6: Run targeted verification**

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Expected: PASS.

- [x] **Step 7: Record completion in the audit report**

Update the first P0 security item to `已修复`, add a dated fix note with files touched and the exact verification command, and leave the broader rate-limit item open for a separate pass.

### Task 2: Add Security Headers And Basic AI Route Rate Limits

**Files:**
- Create: `src/lib/security/rate-limit.ts`
- Create: `tests/security-contract.test.mjs`
- Modify: `next.config.ts`
- Modify: `package.json`
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/app/api/tools/finance-ai-assistant/route.ts`
- Modify: `src/app/api/tools/finance-ai-assistant/access/route.ts`
- Modify: `src/app/api/tools/study-cards/route.ts`
- Modify: `src/app/api/tools/study-cards/pronunciation/route.ts`
- Modify: `docs/project-audit-report.md`

- [x] **Step 1: Write the failing security contract**

Added `tests/security-contract.test.mjs` to require global security headers, AI-route `enforceRateLimit` calls, and a behavioral limiter test.

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/security-contract.test.mjs`

Observed: FAIL with missing `src/lib/security/rate-limit.ts`.

- [x] **Step 3: Add rate-limit helper**

Implemented `src/lib/security/rate-limit.ts` with route/IP buckets and `429 rate_limited` responses.

- [x] **Step 4: Add global security headers**

Added CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` through `next.config.ts`.

- [x] **Step 5: Wire AI-facing POST routes**

Applied rate limits to `/api/chat`, `/api/tools/finance-ai-assistant`, `/api/tools/finance-ai-assistant/access`, `/api/tools/study-cards`, and `/api/tools/study-cards/pronunciation`.

- [x] **Step 6: Run verification**

Run: `node --test tests/security-contract.test.mjs`, `npx tsc --noEmit`, `npm run test:site`, `npm run lint`, `npm run build:vercel`, and production-preview header checks with `curl -I -L`.

- [x] **Step 7: Record completion in the audit report**

Updated `docs/project-audit-report.md` with `安全 P0-2` status, verification commands, and the limitation that current rate limiting is process-local rather than shared KV-backed.

### Task 3: Reopen The Finance AI Assistant Without An Access Code

**Files:**
- Modify: `tests/finance-ai-assistant-contract.test.mjs`
- Modify: `src/app/api/tools/finance-ai-assistant/route.ts`
- Modify: `src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx`
- Modify: `src/app/globals.css`
- Modify: `docs/project-audit-report.md`

- [x] **Step 1: Write the failing public-access contract**

Changed the finance AI contract so a no-token `plan` request reaches normal schema validation (`400 invalid_schema`) instead of `401 access_denied`, and so the client no longer contains the access gate or `X-Finance-AI-Access` request header.

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Observed: FAIL with many `401` responses and remaining access-gate assertions, proving the previous gate was still active.

- [x] **Step 3: Remove the main route token gate**

Removed `verifyFinanceAIAccessToken` / `FINANCE_AI_ACCESS_HEADER` from `src/app/api/tools/finance-ai-assistant/route.ts`; kept `enforceRateLimit`.

- [x] **Step 4: Remove the client access form**

Removed the access-token state, `/access` fetch, `X-Finance-AI-Access` request header, access-card JSX, and matching `.finance-ai-access-*` CSS.

- [x] **Step 5: Record the product decision**

Updated `docs/project-audit-report.md`: `安全 P0-1` is now `放弃` by product decision, with risk mitigated by rate limits and the next workbook-size cap task.

### Task 4: Replace Vulnerable `xlsx@0.18.5`

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Regenerate: `public/vendor/xlsx/xlsx.full.min.js` through `npm run prepare:vendor` (`public/vendor/` is gitignored)
- Modify: `tests/tooling-contract.test.mjs`
- Modify: `docs/project-audit-report.md`

- [x] **Step 1: Re-check the audit item**

Confirmed the repo used `xlsx: ^0.18.5`, `package-lock.json` resolved `https://registry.npmjs.org/xlsx/-/xlsx-0.18.5.tgz`, and both bundled imports plus static browser tools depended on the SheetJS-compatible API.

- [x] **Step 2: Verify the low-risk replacement**

Checked `@e965/xlsx@0.20.3`; it provides the same package API shape and includes `dist/xlsx.full.min.js`, so the existing import path and vendor-copy script can stay stable.

- [x] **Step 3: Write the failing dependency contract**

Added a `tests/tooling-contract.test.mjs` assertion requiring `xlsx` to be an `npm:@e965/xlsx` alias, the lockfile to resolve `@e965/xlsx`, the old `xlsx-0.18.5` tarball to be absent, and the local browser bundle to no longer report version `0.18.5`.

- [x] **Step 4: Run test to verify it fails**

Run: `node --test tests/tooling-contract.test.mjs`

Observed: FAIL because `package.json` still contained `^0.18.5`.

- [x] **Step 5: Replace the dependency and refresh vendor assets**

Ran `npm install 'xlsx@npm:@e965/xlsx@^0.20.3'` and `npm run prepare:vendor`, updating `package.json`, `package-lock.json`, and the local ignored `public/vendor/xlsx/xlsx.full.min.js` build artifact.

- [x] **Step 6: Run targeted verification**

Run: `node --test tests/tooling-contract.test.mjs`

Observed: PASS, 7/7 tests.

- [x] **Step 7: Check audit output and record completion**

Run: `npm audit --omit=dev`

Observed: no remaining `xlsx` advisory; the command still exits non-zero for 18 unrelated production dependency advisories in Next, Mermaid/DOMPurify, and Perspective/D3. Updated `docs/project-audit-report.md` with the result and residual scope.

### Task 5: Shorten Shared Finance Access Token TTL

**Files:**
- Modify: `src/lib/finance-ai/access.ts`
- Modify: `tests/finance-ai-assistant-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/finance-model-inventory.md`

- [x] **Step 1: Re-check the audit item**

Confirmed the formal finance AI assistant is public by product decision, while the shared access endpoint still unlocks private / testing tools such as `/Lucas`, `/finance/profit-structure`, and `/finance/perspective-bi`.

- [x] **Step 2: Keep the safer storage model**

Kept access tokens in React state only. They are not written to `localStorage`, cookies, or persistent client storage.

- [x] **Step 3: Write the failing TTL contract**

Added a behavior assertion to `tests/finance-ai-assistant-contract.test.mjs` so a real `/api/tools/finance-ai-assistant/access` response must expire within 2 hours.

- [x] **Step 4: Run test to verify it fails**

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Observed: FAIL because the existing token TTL was 12 hours.

- [x] **Step 5: Shorten the TTL**

Changed `TOKEN_TTL_MS` in `src/lib/finance-ai/access.ts` from 12 hours to 2 hours.

- [x] **Step 6: Run targeted verification**

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Observed: PASS, 46/46 tests.

- [x] **Step 7: Record completion**

Updated `docs/project-audit-report.md` and `docs/finance-model-inventory.md` to record the 2-hour in-memory token behavior for shared private / testing finance access.

### Task 6: Close Legacy Direct Finance AI Workbook Modes

**Files:**
- Modify: `src/app/api/tools/finance-ai-assistant/route.ts`
- Modify: `tests/finance-ai-assistant-contract.test.mjs`
- Modify: `docs/project-audit-report.md`

- [x] **Step 1: Re-check the audit item**

Confirmed the formal finance AI page currently sends schema and computed summaries to the route, not the full uploaded workbook. The remaining risk was the public legacy direct API surface: `analyze`, `data_request`, and `analyze_selection`.

- [x] **Step 2: Write the failing direct-mode rejection contract**

Added a contract test requiring direct workbook modes to return `400 unsupported_mode` before any provider fetch is attempted.

- [x] **Step 3: Run test to verify it fails**

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Observed: FAIL while the route still had incomplete direct-mode remnants.

- [x] **Step 4: Close direct workbook modes**

Kept the `UNSUPPORTED_DIRECT_WORKBOOK_MODES` guard for `analyze`, `data_request`, and `analyze_selection`, and removed route expectations that those modes still call provider code.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Observed: PASS.

- [x] **Step 6: Record completion**

Updated `docs/project-audit-report.md` with the exact direct API scope and noted that the current official page flow is not blocked because it does not send full workbooks to the route.

### Task 7: Extract Shared Non-Streaming Chat Provider Helper

**Files:**
- Create: `src/lib/ai/callProvider.ts`
- Create: `tests/ai-provider-call-contract.test.mjs`
- Modify: `src/app/api/tools/finance-ai-assistant/route.ts`
- Modify: `src/app/api/tools/study-cards/route.ts`
- Modify: `tests/finance-ai-assistant-contract.test.mjs`
- Modify: `tests/study-card-tool-contract.test.mjs`
- Modify: `package.json`
- Modify: `docs/project-audit-report.md`

- [x] **Step 1: Re-check the audit item**

Confirmed only two routes share the same non-streaming OpenAI-compatible chat completion shape: `finance-ai-assistant` and `study-cards`. `/api/chat` streams SSE and `pronunciation` returns audio, so they should remain specialized.

- [x] **Step 2: Write the failing helper contract**

Added `tests/ai-provider-call-contract.test.mjs` requiring `src/lib/ai/callProvider.ts`, JSON extraction from fenced/narrated responses, provider fallback attempts, empty-content diagnostics with `finishReason`, and route imports for compatible JSON chat endpoints.

- [x] **Step 3: Run test to verify it fails**

Run: `node --test tests/ai-provider-call-contract.test.mjs`

Observed: FAIL because `src/lib/ai/callProvider.ts` did not exist.

- [x] **Step 4: Extract the shared provider helper**

Added `callProvider`, `callFirstConfiguredProvider`, `hasConfiguredProvider`, `extractJsonObject`, and shared provider attempt/error typing in `src/lib/ai/callProvider.ts`.

- [x] **Step 5: Refactor compatible routes**

Changed `finance-ai-assistant` to use the shared helper through a finance-specific wrapper for timeouts/error text, and changed `study-cards` to use the shared helper directly with a `contentValidator` so invalid card JSON can still fall through to the next provider.

- [x] **Step 6: Preserve non-compatible route boundaries**

Left `/api/chat` streaming SSE provider logic and `study-cards/pronunciation` TTS/audio provider logic separate. Added tests to prevent accidental future coupling to the normal JSON chat helper.

- [x] **Step 7: Record completion**

Updated `docs/project-audit-report.md` with the adjusted scope and targeted verification command.

### Task 8: Add Global Framer Motion Reduced-Motion Config

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `tests/navigation-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Re-check the audit item**

Confirmed the site already has local `useLowMotionMode` handling in several components and CSS `prefers-reduced-motion` rules, but the root layout did not provide Framer Motion's global `MotionConfig`.

- [x] **Step 2: Write the failing layout contract**

Added a `tests/navigation-contract.test.mjs` assertion requiring the root layout to import `MotionConfig` and wrap the page transition area with `reducedMotion="user"`.

- [x] **Step 3: Run test to verify it fails**

Run: `node --test tests/navigation-contract.test.mjs`

Observed: FAIL because `src/app/layout.tsx` did not import or render `MotionConfig`.

- [x] **Step 4: Add the global MotionConfig wrapper**

Wrapped `ClientShell` and the main `PageTransition` tree in `<MotionConfig reducedMotion="user">`, so global navigation, chat overlays, and route transitions inherit the user's system-level reduced-motion preference.

- [x] **Step 5: Run verification**

Run: `node --test tests/navigation-contract.test.mjs`, `npx tsc --noEmit`, `npm run lint`, `git diff --check`, `npm run test:site`, and `npm run build:vercel`

Observed: PASS.

- [x] **Step 6: Record completion**

Updated `docs/project-audit-report.md` with `UI P0-3` status, scope, and verification commands.

### Task 9: Raise Global Muted Text Contrast

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/home-experience-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Re-check the audit item**

Confirmed `--muted` was `#b0aea5`, which computes to about 2.11:1 against `--background: #faf9f5` and about 2.22:1 against `--card: #ffffff`.

- [x] **Step 2: Verify the suggested color before adopting it**

Calculated that the audit-suggested `#8a887e` is still below AA contrast, about 3.38:1 on the warm background and 3.56:1 on white cards, so it was not adopted.

- [x] **Step 3: Write the failing contrast contract**

Added a `tests/home-experience-contract.test.mjs` test that extracts root hex color tokens and computes WCAG relative luminance / contrast ratio, requiring `--muted` to reach 4.5:1 on both `--background` and `--card`.

- [x] **Step 4: Run test to verify it fails**

Run: `node --test tests/home-experience-contract.test.mjs`

Observed: FAIL because the existing `#b0aea5` token did not meet the 4.5:1 threshold.

- [x] **Step 5: Adjust the token**

Changed `--muted` to `#737169`, preserving the warm restrained palette while reaching AA contrast on the site's main warm and white surfaces.

- [x] **Step 6: Run verification**

Run: `node --test tests/home-experience-contract.test.mjs`, `npx tsc --noEmit`, `npm run lint`, `git diff --check`, `npm run test:site`, and `npm run build:vercel`

Observed: PASS.

- [x] **Step 7: Record completion**

Updated `docs/project-audit-report.md` with `UI P0-1` status, the actual chosen token, and the reason the original suggested color was rejected.

### Task 10: Stop Hiding Substantive Mobile Home Copy

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/home/HomeFinanceSection.tsx`
- Modify: `tests/home-experience-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Re-check the audit item and current render path**

Confirmed mobile CSS hid `.home-hero-slogan` and `.home-hero-lede` with `display:none`. Also confirmed `src/app/page.tsx` currently renders `CapabilityHero`, `HomeThinkingSection`, and `HomeContactSection`, but not `HomeFinanceSection` / `#finance`; the finance-section part of the audit does not hit the current homepage render path.

- [x] **Step 2: Write the failing home experience contract**

Changed `tests/home-experience-contract.test.mjs` so mobile hero slogan / lede must not be `display:none`, mobile finance carousel must include a compact `home-finance-mobile-guide`, and short desktop finance guide/detail/points must be compressed instead of hidden.

- [x] **Step 3: Run test to verify it fails**

Run: `node --test tests/home-experience-contract.test.mjs`

Observed: FAIL because the current mobile hero rules hid the slogan and lede, `HomeFinanceSection` did not render a mobile guide, and short-desktop finance rules hid guide/detail/points.

- [x] **Step 4: Implement compact content display**

Changed mobile hero slogan / lede to compact visible text, added a mobile `怎么看` guide block to the dormant `HomeFinanceSection` carousel, and changed short-desktop finance guide/detail/points from hidden to clamped compact display.

- [x] **Step 5: Verify mobile hero fit after browser QA**

Playwright at `390×844` showed the added hero copy was visible, then revealed the continue CTA was close to the viewport edge. Added a failing contract for compact mobile model-stage dimensions, then reduced the mobile preview and stage tab heights so the final CTA bottom stays inside the viewport.

- [x] **Step 6: Run verification**

Run: `node --test tests/home-experience-contract.test.mjs`; Playwright checked `/` at `390×844` and `1280×820`, with console error count 0; then ran `npx tsc --noEmit`, `npm run lint`, `git diff --check`, `npm run test:site`, and `npm run build:vercel`. Current homepage still has no rendered `#finance` section, as expected.

Observed: PASS.

- [x] **Step 7: Record completion**

Updated `docs/project-audit-report.md` with `UI P0-2` status, the render-path caveat, and the browser verification summary.

### Task 11: Make MouseTrail Respect Reduced Motion

**Files:**
- Modify: `src/components/ui/MouseTrail.tsx`
- Modify: `tests/navigation-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Re-check the audit item**

Confirmed `MouseTrail` is still on the real shell path through `ClientShell` when decorative extras are enabled. It skipped touch devices, but did not read system reduced-motion and used `mix-blend-multiply` on a full-screen canvas.

- [x] **Step 2: Write the failing contract**

Added a `tests/navigation-contract.test.mjs` assertion requiring `MouseTrail` to import and call `useReducedMotion`, derive `shouldDisableTrail = isTouchDevice || prefersReducedMotion`, avoid binding canvas work when disabled, return `null` when disabled, and omit `mix-blend-multiply`.

- [x] **Step 3: Run test to verify it fails**

Run: `node --test tests/navigation-contract.test.mjs`

Observed: FAIL because `MouseTrail` did not import `useReducedMotion` and still rendered the blended canvas.

- [x] **Step 4: Implement the reduced-motion guard**

Changed `MouseTrail` to call `useReducedMotion()`, treat coarse pointer / no-hover / touch as disabled, and skip both canvas rendering and `mousemove`/animation setup when disabled.

- [x] **Step 5: Remove expensive blend mode**

Replaced the full-screen canvas class `mix-blend-multiply` with a simple opacity class to keep the subtle effect without blend-mode repaint overhead.

- [x] **Step 6: Add the missing mousemove allocation guard**

After re-reading the audit item, tightened the contract to also require a particle spawn interval, a no-allocation path once `maxParticles` is reached, and removal of the old `for (let i = 0; i < 3; i++)` per-event allocation loop.

Run: `node --test tests/navigation-contract.test.mjs`

Observed: FAIL on the new `PARTICLE_SPAWN_INTERVAL_MS` assertion, confirming the allocation guard was not yet implemented.

Implemented a small 32ms particle spawn throttle, limited each emit to the remaining available particle slots, and returned early when the active particle list is already at `maxParticles`.

- [x] **Step 7: Run targeted verification**

Run: `node --test tests/navigation-contract.test.mjs`

Observed: PASS.

- [x] **Step 8: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 300/300 tests. Existing Node module-type warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 35 static pages.

- [x] **Step 9: Record completion**

Updated `docs/project-audit-report.md` with `UI P1-4` status, the reduced-motion/performance scope, and the full verification command list.

### Task 12: Fix Security Header Regression for Iframe Tools

**Files:**
- Modify: `next.config.ts`
- Modify: `tests/security-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Confirm the regression**

Verified the live static tool URL `https://yinpengtao.cn/tools/margin-analysis/index.html` returned `200` but also carried `Content-Security-Policy: ... frame-ancestors 'none'` and `X-Frame-Options: DENY`. That makes the static tool refuse being embedded by the first-party `/finance/margin-analysis` page.

- [x] **Step 2: Identify root cause**

Traced the regression to the P0-2 security hardening in `next.config.ts`: the global `source: "/(.*)"` header rule applied the anti-framing headers to every path, including the same-origin static finance tool intended for iframe embedding.

After the user pointed out the subtitle summary tool, confirmed the same hardening also affected `/tools/subtitle-workbench`: that page embeds `https://yptt-subtitle-workbench.hf.space/`, but the parent page CSP still had `frame-src 'self'`. A direct header check of the Hugging Face app did not show an anti-framing header, so the blocker was our parent CSP.

- [x] **Step 3: Write the failing contract**

Added a `tests/security-contract.test.mjs` assertion requiring a `sameOriginFrameContentSecurityPolicy`, `frame-ancestors 'self'`, a `/tools/margin-analysis/:path*` header rule, and `X-Frame-Options: SAMEORIGIN`.

Run: `node --test tests/security-contract.test.mjs`

Observed: FAIL because `next.config.ts` had no same-origin iframe exception.

Added a second assertion requiring `subtitleWorkbenchContentSecurityPolicy`, a `/tools/subtitle-workbench/:path*` header rule, and `frame-src 'self' https://yptt-subtitle-workbench.hf.space`.

Run: `node --test tests/security-contract.test.mjs`

Observed: FAIL because `next.config.ts` had no subtitle workbench iframe exception.

- [x] **Step 4: Implement the scoped header exception**

Kept the global anti-framing default as `frame-ancestors 'none'` / `X-Frame-Options: DENY`, then added a later `/tools/margin-analysis/:path*` header override with `frame-ancestors 'self'` / `X-Frame-Options: SAMEORIGIN`.

Added a `/tools/subtitle-workbench/:path*` CSP override that keeps `frame-ancestors 'none'` but expands `frame-src` to include `https://yptt-subtitle-workbench.hf.space`.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/security-contract.test.mjs`

Observed: PASS.

- [x] **Step 6: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 301/301 tests. Existing Node module-type warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 35 static pages.

- [x] **Step 7: Verify local production headers and iframe rendering**

Started `npx next start -p 3024`.

Run: `curl -I -L http://localhost:3024/tools/margin-analysis/index.html`

Observed: `Content-Security-Policy` includes `frame-ancestors 'self'` and `X-Frame-Options: SAMEORIGIN`.

Run: `curl -I -L http://localhost:3024/finance/margin-analysis`

Observed: the first-party finance page still keeps `frame-ancestors 'none'` and `X-Frame-Options: DENY`.

Run: `curl -I -L http://localhost:3024/tools/subtitle-workbench/`

Observed: `Content-Security-Policy` keeps `frame-ancestors 'none'` and includes `frame-src 'self' https://yptt-subtitle-workbench.hf.space`.

Run: Playwright open/snapshot for `http://localhost:3024/finance/margin-analysis` and `http://localhost:3024/tools/subtitle-workbench`

Observed: both iframe contents render. Margin analysis shows its controls and charts; subtitle workbench shows the hosted "视频字幕提取与总结" interface. Margin console only showed the tool's normal render/calculation logs.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` with a `安全 P0-2 回归` entry documenting the iframe regressions and scoped fixes for both `margin-analysis` and the subtitle workbench.

### Task 13: Make ChatWidget Behave as an Accessible Modal Dialog

**Files:**
- Modify: `src/components/ChatWidget.tsx`
- Modify: `tests/chat-math-normalization.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Re-check the audit item**

Confirmed `ChatWidget` rendered the assistant panel as a fixed visual layer without `role="dialog"` / `aria-modal`, without a stable label/description pair, without Escape close or Tab focus containment, and without live-region status on the message stream.

- [x] **Step 2: Write the failing contract**

Added a `tests/chat-math-normalization.test.mjs` assertion requiring launcher/panel refs, `focusableSelectors`, dialog semantics, labelled/described ids, `onKeyDown={handlePanelKeyDown}`, Escape handling, Tab / Shift+Tab focus wrapping including the panel-focused mobile edge case, focus restoration to the launcher, and `aria-live` / `aria-busy` on the message container.

- [x] **Step 3: Run test to verify it fails**

Run: `node --test tests/chat-math-normalization.test.mjs`

Observed: FAIL because `ChatWidget` did not have `launcherButtonRef`, confirming the new contract caught the missing modal accessibility implementation.

- [x] **Step 4: Implement the modal accessibility behavior**

Changed `ChatWidget` to keep refs for the launcher and panel, focus the input on desktop open while focusing the panel itself on mobile open, and restore focus to the launcher after closing.

Added `handlePanelKeyDown` so Escape closes the panel and Tab / Shift+Tab cycle through focusable controls inside the panel, including when the panel itself holds focus on mobile open. Added `role="dialog"`, `aria-modal="true"`, stable title and description ids, and `tabIndex={-1}` to the panel.

- [x] **Step 5: Add live status and button naming**

Added `aria-live="polite"`, `aria-relevant="additions text"`, and `aria-busy={isProcessing}` to the message container. Also made the send control an explicit `type="button"` with `aria-label="发送消息"`.

- [x] **Step 6: Run targeted verification**

Run: `node --test tests/chat-math-normalization.test.mjs`

Observed: PASS. Existing Node module-type warning remains unrelated.

- [x] **Step 7: Record completion**

Updated `docs/project-audit-report.md` with `UI P1-5` status, the modal accessibility scope, and the verification command list.

- [x] **Step 8: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 303/303 tests. Existing Node module-type warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 35 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

- [x] **Step 9: Verify local production keyboard behavior**

Started `npx next start -p 3026`.

Run: Playwright open/snapshot/click/press for `http://localhost:3026/` on desktop width, then resized to `390×844` for the mobile panel-focused edge case.

Observed: opening the launcher exposed `dialog "Lucas AI"` with the desktop textbox focused; pressing Escape closed the dialog and restored focus to the launcher; pressing Tab from the textbox wrapped focus to the close button, and Shift+Tab from the close button wrapped back to the textbox. On mobile `390×844`, opening the launcher focused the dialog container, Shift+Tab wrapped to the textbox instead of escaping to the backdrop or navigation, and Escape restored focus to the AI launcher. Console error count stayed 0.

### Task 14: Keep Finance Testing Ribbon Anchored on Mobile Cards

**Files:**
- Modify: `src/components/finance/FinanceModelLibrary.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/finance-model-registry.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Re-check the in-progress change**

Confirmed `main` already contained commit `8e7320e Fix mobile finance testing ribbon position`, which changed the mobile `.finance-model-status-ribbon` rule from the previous left-side anchor back to a right-side anchor. A follow-up working-tree change then made the safer structural fix: render the ribbon inside a `.finance-model-preview-frame` so the badge belongs to the thumbnail instead of the whole card.

- [x] **Step 2: Confirm the regression contract**

The new contract in `tests/finance-model-registry.test.mjs` requires `FinanceModelLibrary` to render `FinanceModelPreview` and `.finance-model-status-ribbon` inside `.finance-model-preview-frame`, requires that frame to be `position: relative` with `overflow: hidden`, parses all `@media (max-width: 768px)` CSS blocks, and requires the mobile `.finance-model-status-ribbon` rule to keep `top: 8px`, `right: -26px`, `left: auto`, and `width: 92px`, while rejecting the old `left: 22px` anchor.

- [x] **Step 3: Verify the old baseline would fail**

Run: a Node assertion against `git show HEAD:src/components/finance/FinanceModelLibrary.tsx` requiring `finance-model-preview-frame`.

Observed: FAIL because the baseline rendered `.finance-model-status-ribbon` as a card-level sibling before `FinanceModelPreview`, not inside a preview frame.

- [x] **Step 4: Record completion**

Updated `docs/project-audit-report.md` with `UI P1-6` status, the mobile testing-ribbon scope, and the verification command list.

- [x] **Step 5: Run targeted and full verification**

Run: `node --test tests/finance-model-registry.test.mjs`

Observed: PASS, 15/15 tests.

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 304/304 tests. Existing Node module-type warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 35 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

- [x] **Step 6: Verify mobile finance page in a browser**

Started `npx next start -p 3027`, opened `http://localhost:3027/finance` at `390×844`, and captured Playwright snapshot, computed styles, bounding boxes, and `output/playwright/finance-ribbon-mobile-390x844.png`.

Observed: both visible `测试中` ribbons render inside `.finance-model-preview-frame`, keep `top: 8px`, `right: -26px`, `width: 92px`, and the frame clips them with `overflow: hidden`; `centerNearFrameTopRight: true` for both, without moving to the left side of the mobile card or into the title area. Console error count stayed 0.

### Task 15: Bring Local CSS Module Accent Blues Back Into The Site Palette

**Files:**
- Modify: `src/app/Lucas/Lucas.module.css`
- Modify: `src/app/finance/chart-candidates-demo/ChartCandidatesDemo.module.css`
- Modify: `src/app/finance/chart-candidates-demo/ChartCandidatesDemo.tsx`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `package.json`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Confirmed the narrow remaining P1 UI item was the CSS Module off-palette color finding. The actionable cold blues were `#2f76b7` and `#174d7a` in `src/app/Lucas/Lucas.module.css`, plus `#315f85` in `src/app/finance/chart-candidates-demo/ChartCandidatesDemo.module.css` and the chart demo TSX inline small-multiple colors.

- [x] **Step 2: Add a regression contract**

Added `tests/design-token-contract.test.mjs` and included it in `npm run test:site`. The contract checks `Lucas.module.css`, `ChartCandidatesDemo.module.css`, and `ChartCandidatesDemo.tsx`, rejects `#2f76b7`, `#315f85`, and `#174d7a`, and requires the replacements to use site accent tokens or `color-mix()` derived from them.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL because `src/app/Lucas/Lucas.module.css` still used the off-palette focus blue `#2f76b7`.

- [x] **Step 4: Replace the local off-palette blues**

Changed Lucas focus borders to `var(--accent)` plus an accent `color-mix()` focus ring; changed Lucas detail-table emphasized values to a `var(--accent-secondary)` mix. Changed the chart candidate Pareto line/dot to the same accent-secondary mix, and changed the TSX small-multiple blue series to a shared `financeBlue` token-derived value.

- [x] **Step 5: Record completion**

Updated `docs/project-audit-report.md` with `UI P1-7` status, scope, and verification commands.

- [x] **Step 6: Run verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 1/1 test.

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 305/305 tests. Existing Node module-type warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 35 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

- [x] **Step 7: Verify the affected pages in a production browser**

Started `npx next start -p 3028`.

Run: Playwright opened `http://localhost:3028/finance/chart-candidates-demo` at `1280×900` and read computed SVG colors for the Pareto line, Pareto dot, and the first small-multiple polyline.

Observed: all three resolved to the same site-token-derived blue (`color(srgb 0.334745 0.480784 0.625882)`), replacing the old hard-coded `#315f85`.

Run: Playwright opened `http://localhost:3028/Lucas`, focused the access-code input, and read computed focus styles.

Observed: the input focus border resolved to `rgb(217, 119, 87)` and the focus ring used the same accent with alpha. Console error count stayed 0.

### Task 16: Read The Homepage Phone Contact From Site Config

**Files:**
- Modify: `src/components/home/HomeContactSection.tsx`
- Modify: `tests/home-experience-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Confirmed the P2 contact hardcoding item was narrow: `HomeContactSection` already reads email from `siteConfig.links?.email`, but still hard-coded the phone number in both `href="tel:..."` and visible text even though `src/lib/config/site.ts` already exposes `links.phone`.

- [x] **Step 2: Add a regression contract**

Changed the existing `tests/home-experience-contract.test.mjs` contact test from requiring the phone number literal in the component to requiring `siteConfig.links?.phone` for both the `tel:` href and visible phone text, while rejecting the hard-coded phone literal inside the component source.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/home-experience-contract.test.mjs`

Observed: FAIL because `HomeContactSection.tsx` still used `href="tel:15140319603"` and visible `电话：15140319603`, and did not reference `siteConfig.links?.phone`.

- [x] **Step 4: Replace the hard-coded phone**

Changed the phone link to `href={`tel:${siteConfig.links?.phone}`}` and the visible text to `电话：{siteConfig.links?.phone}`.

- [x] **Step 5: Record completion**

Updated `docs/project-audit-report.md` with `UI P2-1` status, scope, and verification commands.

- [x] **Step 6: Run verification**

Run: `node --test tests/home-experience-contract.test.mjs`

Observed: PASS, 29/29 tests.

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 305/305 tests. Existing Node module-type warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 35 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

- [x] **Step 7: Verify the homepage contact link in a production browser**

Started `npx next start -p 3029`, opened `http://localhost:3029/#contact` at `390×844`, and read the contact section's phone link.

Observed: `#contact` existed, the phone link kept `href="tel:15140319603"`, visible text stayed `电话：15140319603`, and console error count stayed 0.

### Task 17: Make Site Navigation SSR-Capable And Add A Header Landmark

**Files:**
- Modify: `src/components/ClientShell.tsx`
- Modify: `src/components/layout/SiteNavigation.tsx`
- Modify: `tests/navigation-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Confirmed the P2 navigation item had two narrow parts: `ClientShell` used `dynamic(() => import("@/components/layout/SiteNavigation"), { ssr: false })`, and the visible navigation UI exposed a `<nav>` but no surrounding `<header>` landmark.

- [x] **Step 2: Add a regression contract**

Added a `tests/navigation-contract.test.mjs` assertion requiring `ClientShell` to statically import `SiteNavigation`, forbidding the old no-SSR dynamic import for that component, and requiring both mobile and desktop `SiteNavigation` branches to render `header[aria-label="网站导航"]`.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/navigation-contract.test.mjs`

Observed: FAIL because `ClientShell.tsx` still dynamically imported `SiteNavigation` with `{ ssr: false }`, and `SiteNavigation.tsx` did not expose the required header landmarks.

- [x] **Step 4: Replace the no-SSR navigation import and add landmarks**

Changed `ClientShell` to statically import `SiteNavigation` while preserving the no-SSR dynamic imports for `MouseTrail` and `ChatWidget`. Changed the mobile `SiteNavigation` wrapper from a generic `<div>` to `header[aria-label="网站导航"]`, and changed the desktop top-level wrapper to `header[aria-label="网站导航"]` with an inner `nav[aria-label="网站导航"]`. The existing hidden-navigation route rules remain in `SiteNavigation`, so full-screen tool routes still return `null`.

- [x] **Step 5: Record completion**

Updated `docs/project-audit-report.md` with `UI P2-2` status, scope, verification commands, and browser evidence.

- [x] **Step 6: Run verification**

Run: `node --test tests/navigation-contract.test.mjs`

Observed: PASS, 8/8 tests.

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 306/306 tests. Existing Node module-type warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 35 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

- [x] **Step 7: Verify navigation landmarks in a production browser**

Started `npm run start -- --port 3032`.

Run: Playwright opened `http://localhost:3032/` at `1440×900` and read the navigation DOM.

Observed: `header[aria-label="网站导航"]` count was 1, `nav[aria-label="网站导航"]` count was 1, navigation text was `首页财务模型工具与思考联系`, and console error count stayed 0.

Run: Playwright resized the homepage to `390×844`, read the closed mobile menu state, clicked the navigation button, and read the expanded state.

Observed: closed state had `header=1`, `button=1`, `aria-expanded="false"`, and `nav=0`; expanded state had `header=1`, `aria-expanded="true"`, `nav=1`, and the same navigation text. Console error count stayed 0.

Run: Playwright opened `http://localhost:3032/finance/perspective-bi` and read the navigation DOM.

Observed: hidden-navigation route kept `header=0` and `nav=0`, so the full-screen workbench route did not gain an empty landmark.

### Task 18: Unblock The Subtitle Workbench Host Page

**Files:**
- Modify: `next.config.ts`
- Modify: `src/app/tools/subtitle-workbench/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/security-contract.test.mjs`
- Modify: `tests/routing-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Reproduce and inspect current behavior**

Opened `https://yinpengtao.cn/tools/subtitle-workbench/` with Playwright and confirmed the iframe can render in the test browser, but the live page response still included `X-Frame-Options: DENY` from the global security-header rule. Direct `curl -I -L` checks showed the parent page CSP allowed `frame-src https://yptt-subtitle-workbench.hf.space`, and the Hugging Face app itself did not return an anti-framing header on the root page.

- [x] **Step 2: Add regression contracts**

Updated `tests/security-contract.test.mjs` to require the subtitle workbench host route to avoid inheriting the global `X-Frame-Options: DENY` rule while still allowing the external HF iframe through CSP. Updated `tests/routing-contract.test.mjs` to require a visible direct-open fallback link to the hosted workbench.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/security-contract.test.mjs tests/routing-contract.test.mjs`

Observed: FAIL because `next.config.ts` still used the global `source: "/(.*)"` rule and the subtitle page had no `subtitle-workbench-open-link` / direct-open fallback.

- [x] **Step 4: Implement the scoped fix**

Refactored `next.config.ts` header groups so normal pages still receive CSP plus `X-Frame-Options: DENY`, margin static tool pages still receive `SAMEORIGIN`, and `/tools/subtitle-workbench/:path*` receives its own CSP/shared security headers without `X-Frame-Options`. Added a fixed right-side `直接打开工作台` link to `https://yptt-subtitle-workbench.hf.space/` on the subtitle workbench page.

- [x] **Step 5: Record completion**

Updated `docs/project-audit-report.md` with a `安全 P0-2 二次回归` entry and detailed note under the original security-header audit item.

- [x] **Step 6: Run verification**

Run: `node --test tests/security-contract.test.mjs tests/routing-contract.test.mjs`

Observed: PASS, 12/12 tests.

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 306/306 tests. Existing Node module-type warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 35 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

- [x] **Step 7: Verify local production headers and browser behavior**

Started `npm run start -- --port 3034`.

Run: `curl -I -L http://localhost:3034/tools/subtitle-workbench/`

Observed: `Content-Security-Policy` includes `frame-src 'self' https://yptt-subtitle-workbench.hf.space`, shared security headers remain, and `X-Frame-Options` is absent.

Run: `curl -I -L http://localhost:3034/`

Observed: normal pages still return `X-Frame-Options: DENY`.

Run: `curl -I -L http://localhost:3034/tools/margin-analysis/index.html`

Observed: same-origin static tool pages still return `X-Frame-Options: SAMEORIGIN`.

Run: Playwright opened `http://localhost:3034/tools/subtitle-workbench/`.

Observed: iframe content rendered as `视频字幕提取与总结`, and the page exposed a direct external link with accessible name `直接打开视频字幕与总结工作台`.

### Task 19: Remove Legacy Animation And Hero Dead Code

**Files:**
- Delete: `src/components/ParticleField.tsx`
- Delete: `src/components/TypewriterText.tsx`
- Delete: `src/components/layout/Hero.tsx`
- Delete: `src/lib/animations.ts`
- Delete: `src/lib/config/animation.ts`
- Modify: `src/components/layout/index.ts`
- Modify: `tests/tooling-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Confirmed this pass should not try to solve the entire UI P1 bucket. The safe scope is the audit's concrete dead-code claim: `ParticleField`, `TypewriterText`, the legacy layout `Hero`, and the two conflicting animation config files. `rg` found no active business imports for those files; the only live code path was the stale `Hero` export in `src/components/layout/index.ts`.

- [x] **Step 2: Add a regression contract**

Added `tests/tooling-contract.test.mjs` coverage requiring the layout barrel to stop exporting `Hero` and requiring the five legacy files to stay removed from the repository.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/tooling-contract.test.mjs`

Observed: FAIL because the layout barrel still exported `Hero` and the legacy files still existed.

- [x] **Step 4: Remove the dead code**

Deleted `src/components/ParticleField.tsx`, `src/components/TypewriterText.tsx`, `src/components/layout/Hero.tsx`, `src/lib/animations.ts`, and `src/lib/config/animation.ts`. Removed `export { default as Hero } from "./Hero";` from `src/components/layout/index.ts`.

- [x] **Step 5: Record completion**

Updated `docs/project-audit-report.md` with `UI P1-8`, marked the dead-code sub-item fixed, and clarified that design-token and `ui/` primitive adoption remain separate follow-up work inside the same broader P1 bucket.

- [x] **Step 6: Run fresh verification**

Run: `node --test tests/tooling-contract.test.mjs`

Observed: PASS, 8/8 tests.

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 307/307 tests. Existing Node module-type warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 35 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

### Task 20: Guard Article KaTeX Overflow And Mermaid Render States

**Files:**
- Modify: `src/components/content/ArticleReader.tsx`
- Modify: `src/app/globals.css`
- Modify: `package.json`
- Add: `tests/article-reader-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P2 reading-experience audit item to two concrete defects that can be fixed safely without redesigning the article template: wide KaTeX display math in article bodies had no overflow guard, and Mermaid failures only logged to the console while leaving the article area blank. Dark mode, progress bars, and scroll-spy remain separate product/design choices for later review.

- [x] **Step 2: Add a regression contract**

Added `tests/article-reader-contract.test.mjs` and wired it into `npm run test:site`. The test requires `.notion-article .katex-display` to stay bounded and horizontally scrollable, and requires Mermaid charts to expose explicit loading, ready, and error states with visible status copy.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/article-reader-contract.test.mjs`

Observed: FAIL, 0/2 tests. The article KaTeX CSS selector was missing, and `ArticleReader.tsx` had no Mermaid render-state type or visible loading/error state.

- [x] **Step 4: Implement the reading guardrails**

Added article KaTeX CSS for bounded display math and no-wrap inner formulas. Reworked `MermaidChart` to use a `loading / ready / error` state, reset state when the chart changes, avoid state updates after unmount, and show `图表加载中...` / `无法渲染这张图` instead of leaving the card blank.

- [x] **Step 5: Record completion**

Updated `docs/project-audit-report.md` as `UI P2-3a`, noting that the KaTeX/Mermaid sub-item is fixed while dark mode, progress, and scroll-spy remain separate follow-up decisions.

- [x] **Step 6: Run fresh verification**

Run: `node --test tests/article-reader-contract.test.mjs`

Observed: PASS, 2/2 tests.

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 309/309 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 35 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

Run: local production smoke on `http://localhost:3035/thinking-lab/gold-stock-selloff-iran-war-2026`

Observed: `curl -I -L` returned 200 after the trailing-slash redirect; HTML contained `mermaid-chart-card` and `图表加载中...`, and did not contain `<pre><div class="mermaid-chart-card">`.

### Task 21: Add Article Reading Progress And TOC Scroll Spy

**Files:**
- Modify: `src/components/content/ArticleReader.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/article-reader-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the remaining P2 article-reading audit item to reading progress and TOC scroll-spy. The audit also mentioned dark mode, but `agent.md` records the public site as intentionally single-theme light mode, so this pass does not introduce a dark-mode toggle or dark article theme.

- [x] **Step 2: Add a failing regression contract**

Extended `tests/article-reader-contract.test.mjs` to require `ArticleReader` to expose `readingProgress` and `activeHeadingId` state, render an `article-reading-progress` element with `role="progressbar"` and `aria-valuenow`, update on `scroll` and `resize`, mark the active TOC link with `aria-current="location"`, and provide reduced-motion-safe progress bar CSS.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/article-reader-contract.test.mjs`

Observed: FAIL, 2/3 tests passing. The new test failed because `ArticleReader` had no `readingProgress` state, confirming the contract caught the missing reading progress / scroll-spy behavior.

- [x] **Step 4: Implement the reading progress and scroll-spy**

Added a requestAnimationFrame-throttled scroll/resize listener that updates document reading progress and chooses the last h2/h3 above the sticky header offset as the active TOC item. Rendered a thin sticky-header progress bar with `role="progressbar"` / `aria-valuenow`, and added `aria-current="location"` plus accent styling for the active TOC link.

- [x] **Step 5: Add restrained progress styling**

Added `.article-reading-progress` CSS using the existing accent tokens, a 2px track, and `prefers-reduced-motion: reduce` handling to remove progress-bar transition animation for low-motion users.

- [x] **Step 6: Run verification**

Run: `node --test tests/article-reader-contract.test.mjs`

Observed: PASS, 3/3 tests.

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 310/310 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 35 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

Run: local production Playwright on `http://localhost:3036/thinking-lab/gold-stock-selloff-iran-war-2026/`

Observed: snapshot exposed `progressbar "文章阅读进度"`. DOM checks showed initial `progress=0`, `role=progressbar`, active TOC text `引言`; after scrolling to roughly 42% of document height, `progress=45`, active TOC text `欧洲央行：同样进退维谷`, active href `#section-92`, and the progress-bar transform changed to `matrix(0.454797, 0, 0, 1, 0, 0)`. Browser console errors: 0.

- [x] **Step 7: Record completion**

Updated `docs/project-audit-report.md` as `UI P2-3b`, noting that reading progress and TOC scroll-spy are fixed while dark article theming is not adopted under the current single-theme light product rule.

### Task 22: Remove Unused Legacy UI Primitives

**Files:**
- Delete: `src/components/feature/ArticleCard.tsx`
- Delete: `src/components/feature/BackButton.tsx`
- Delete: `src/components/feature/SectionCard.tsx`
- Delete: `src/components/feature/index.ts`
- Delete: `src/components/layout/PageLayout.tsx`
- Delete: `src/components/layout/Section.tsx`
- Modify: `src/components/layout/index.ts`
- Delete: `src/components/ui/ArtifactCard.tsx`
- Delete: `src/components/ui/Badge.tsx`
- Delete: `src/components/ui/Button.tsx`
- Delete: `src/components/ui/Card.tsx`
- Delete: `src/components/ui/Container.tsx`
- Delete: `src/components/ui/Icon.tsx`
- Delete: `src/components/ui/ThinkingSubtitle.tsx`
- Delete: `src/components/ui/index.ts`
- Modify: `src/app/globals.css`
- Modify: `tests/tooling-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped this pass to the remaining P1 UI governance sub-item around unused legacy primitives and feature/layout shells. This does not claim to complete every live token/button standardization concern; it closes the stale unmounted library residue that the app was not using.

- [x] **Step 2: Add a failing regression contract**

Added `tests/tooling-contract.test.mjs` coverage requiring the old `feature/*` shells, old `layout/PageLayout` / `layout/Section`, old `ui/*` primitives, and their barrel export to stay removed. The contract also checks `src/app/globals.css` for orphaned `.artifact-*` and `.card-hover` rules.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/tooling-contract.test.mjs`

Observed: FAIL before cleanup because `src/components/feature/ArticleCard.tsx` still existed. After deleting the files, the CSS-residue assertion intentionally failed again while `.artifact-*` and `.card-hover` remained in `globals.css`.

- [x] **Step 4: Remove unused files and stale exports**

Deleted the unmounted `feature/*` shell components, the old `PageLayout` / `Section` layout components, and the unused `ui/Button`, `ui/Card`, `ui/Container`, `ui/Icon`, `ui/ArtifactCard`, `ui/Badge`, and `ui/ThinkingSubtitle` primitives. Updated `src/components/layout/index.ts` to export only the still-live `PageTransition` and `SiteNavigation`.

- [x] **Step 5: Remove orphaned global CSS**

Removed the legacy `.artifact-card`, `.artifact-card-inner`, `.artifact-window-chrome`, `.artifact-card-content`, `.artifact-code`, `.artifact-chart`, `.artifact-image`, and `.card-hover` rules from `src/app/globals.css`.

- [x] **Step 6: Run verification**

Run: `node --test tests/tooling-contract.test.mjs`

Observed: PASS, 9/9 tests.

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 312/312 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 35 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

- [x] **Step 7: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-9`, noting that the stale primitive library was removed rather than force-adopted because it carried outdated hardcoded styling and was not part of the live site surface.

### Task 23: Remove TypeScript Extension Import Suppressions

**Files:**
- Modify: `tsconfig.json`
- Modify: `src/app/api/tools/finance-ai-assistant/route.ts`
- Modify: `src/app/api/tools/finance-ai-assistant/access/route.ts`
- Modify: `src/lib/finance-ai/actions.ts`
- Modify: `src/lib/finance-ai/metrics.ts`
- Modify: `src/lib/finance-ai/workbook.ts`
- Modify: `src/lib/finance-ai/chart-demo.ts`
- Modify: `tests/tooling-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the architecture P2 item to its smallest safe sub-item: remove the `@ts-expect-error` comments that existed only because source files import TypeScript modules with explicit `.ts` extensions for Node's test runner. The larger finance model `.js` engine migration remains separate because it touches several full-screen tools.

- [x] **Step 2: Add a failing regression contract**

Added `tests/tooling-contract.test.mjs` coverage requiring `tsconfig.json` to enable `compilerOptions.allowImportingTsExtensions` and scanning `src/**/*.ts(x)` for the old `@ts-expect-error - Node's test runner imports` suppression text.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/tooling-contract.test.mjs`

Observed: FAIL, 9/10 tests passing. The new test failed because `allowImportingTsExtensions` was undefined, proving the contract caught the missing compiler rule before implementation.

- [x] **Step 4: Make extension imports explicit**

Added `"allowImportingTsExtensions": true` to `tsconfig.json`, which is valid with the repo's existing `noEmit: true` setup and `moduleResolution: "bundler"`.

- [x] **Step 5: Remove stale suppressions**

Removed the Node test runner `.ts` extension `@ts-expect-error` comments from the finance AI route, finance AI access route, action/metric/workbook helpers, and chart demo helper.

- [x] **Step 6: Run targeted verification**

Run: `node --test tests/tooling-contract.test.mjs`

Observed: PASS, 10/10 tests.

Run: `npx tsc --noEmit`

Observed: PASS.

- [x] **Step 7: Run full verification**

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 313/313 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 35 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `架构 P2-3a`, explicitly closing the `.ts` extension import suppression sub-item while leaving broader `.js` finance engine TypeScript migration for later.

### Task 24: Rename Private Tool Access Gate

**Files:**
- Add: `src/lib/private-tool-access/constants.ts`
- Add: `src/lib/security/private-tool-access.ts`
- Add: `src/app/api/private-tool-access/route.ts`
- Modify: `src/app/api/tools/finance-ai-assistant/access/route.ts`
- Modify: `src/lib/finance-ai/access.ts`
- Modify: `src/app/Lucas/LucasAccessGate.tsx`
- Modify: `src/app/Lucas/LucasPrivateWorkbench.tsx`
- Modify: `src/app/api/lucas/stock-decision/route.ts`
- Modify: `src/app/finance/profit-structure/ProfitStructureTool.tsx`
- Modify: `src/app/finance/perspective-bi/PerspectiveBITool.tsx`
- Modify: `tests/lucas-private-route-contract.test.mjs`
- Modify: `tests/profit-structure-analysis.test.mjs`
- Modify: `tests/tooling-contract.test.mjs`
- Modify: `tests/security-contract.test.mjs`
- Modify: `tests/finance-ai-assistant-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped architecture item `架构 P2-1` to the independently safe naming sub-item: the old `FINANCE_AI_ACCESS` name made private / beta tool gates look like the formal finance AI assistant. This pass does not reintroduce an access code to `/finance/finance-ai-assistant`, and does not claim to finish the later middleware unification item.

- [x] **Step 2: Add failing regression contracts**

Updated the Lucas private route, profit-structure, tooling, security, and finance-AI assistant contracts to require the new `/api/private-tool-access` endpoint, `PRIVATE_TOOL_ACCESS_ENDPOINT`, and `X-Private-Tool-Access` header in live gated clients, while keeping the old finance-AI access route only as a compatibility shim.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/lucas-private-route-contract.test.mjs tests/profit-structure-analysis.test.mjs tests/tooling-contract.test.mjs tests/security-contract.test.mjs tests/finance-ai-assistant-contract.test.mjs`

Observed: FAIL before implementation. The first failure was the missing `src/app/api/private-tool-access/route.ts`, and the updated contracts also expected private-tool endpoint / header names that the old code did not expose.

- [x] **Step 4: Implement private-tool access naming**

Added client-safe private-tool constants, server-side `src/lib/security/private-tool-access.ts`, and the new `/api/private-tool-access` POST endpoint with its own rate limit key. The server reads `PRIVATE_TOOL_ACCESS_KEY` first and falls back to `FINANCE_AI_ACCESS_KEY` so production can migrate without an immediate secret rename.

- [x] **Step 5: Preserve compatibility without changing product access**

Moved Lucas, profit-structure, and Perspective BI clients to `PRIVATE_TOOL_ACCESS_ENDPOINT` / `X-Private-Tool-Access`. Kept `/api/tools/finance-ai-assistant/access` as a delegating compatibility route and kept `src/lib/finance-ai/access.ts` as aliases for old imports. Formal finance AI remains public.

- [x] **Step 6: Run targeted verification**

Run: `node --test tests/lucas-private-route-contract.test.mjs tests/profit-structure-analysis.test.mjs tests/tooling-contract.test.mjs tests/security-contract.test.mjs tests/finance-ai-assistant-contract.test.mjs`

Observed: PASS, 73/73 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

- [x] **Step 7: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS after removing two trailing blank lines from compatibility alias files.

Run: `npm run test:site`

Observed: PASS, 314/314 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `架构 P2-1a`, explicitly closing the private-tool access naming sub-item while leaving middleware-based unified authorization as a later architecture item.
