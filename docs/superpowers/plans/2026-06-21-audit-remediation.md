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

### Task 25: Move Private Stock Decision Authorization To Middleware

**Files:**
- Add: `middleware.ts`
- Add: `src/lib/security/private-tool-access-edge.ts`
- Add: `tests/private-tool-access-middleware.test.mjs`
- Modify: `src/app/api/lucas/stock-decision/route.ts`
- Modify: `tests/lucas-private-route-contract.test.mjs`
- Modify: `package.json`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the remaining `架构 P2-1` middleware sub-item to the current private business API that actually needs token enforcement: `/api/lucas/stock-decision`. This does not change the product decision that the formal finance AI assistant remains public.

- [x] **Step 2: Add failing regression contracts**

Updated `tests/lucas-private-route-contract.test.mjs` to require middleware-based protection instead of direct token checks inside the Lucas stock-decision route. Added `tests/private-tool-access-middleware.test.mjs` to require an Edge-compatible verifier that accepts tokens created by the existing server signer, rejects malformed / expired tokens, reads the new private-tool header before the legacy header, and protects `/api/lucas/stock-decision/:path*`.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/lucas-private-route-contract.test.mjs tests/private-tool-access-middleware.test.mjs`

Observed: FAIL before implementation. `tests/lucas-private-route-contract.test.mjs` failed because `middleware.ts` did not exist, and `tests/private-tool-access-middleware.test.mjs` failed because `src/lib/security/private-tool-access-edge.ts` did not exist.

- [x] **Step 4: Implement middleware authorization**

Added `src/lib/security/private-tool-access-edge.ts` using Web Crypto HMAC verification and base64url encoding so middleware can validate tokens signed by the existing Node-side private-tool helper. Added root `middleware.ts` with matcher `"/api/lucas/stock-decision/:path*"` and a `401 { error: "access_denied" }` response for missing / invalid tokens.

- [x] **Step 5: Remove route-local token checks**

Removed direct `readPrivateToolAccessToken` / `verifyPrivateToolAccessToken` usage from `src/app/api/lucas/stock-decision/route.ts`; the route now only returns the private stock-decision HTML with `Cache-Control: no-store` after middleware has admitted the request.

- [x] **Step 6: Add middleware test to the site suite**

Added `tests/private-tool-access-middleware.test.mjs` to `npm run test:site` so the full site contract suite exercises the middleware authorization path.

- [x] **Step 7: Run targeted verification**

Run: `node --test tests/lucas-private-route-contract.test.mjs tests/private-tool-access-middleware.test.mjs`

Observed: PASS, 8/8 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

- [x] **Step 8: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 318/318 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages, with `Proxy (Middleware)` listed in the build output. Existing Node `module.register()` deprecation warnings remain unrelated.

Run: local production smoke with `PRIVATE_TOOL_ACCESS_KEY=local-smoke-private-tool-key npm run start -- -p 3037`

Observed: unauthenticated `GET /api/lucas/stock-decision/` returned `401`; after `POST /api/private-tool-access/` returned a token, authenticated `GET /api/lucas/stock-decision/` returned `200`, preserved `Cache-Control: no-store`, and the HTML contained `kelly-app`.

- [x] **Step 9: Record completion**

Updated `docs/project-audit-report.md` as `架构 P2-1b`, closing the middleware authorization sub-item for the current private stock-decision API while keeping the formal finance AI assistant public.

### Task 26: Open Subtitle Workbench Directly Instead Of Embedding An External Iframe

**Files:**
- Modify: `src/app/tools/subtitle-workbench/page.tsx`
- Modify: `next.config.ts`
- Modify: `src/app/globals.css`
- Modify: `tests/routing-contract.test.mjs`
- Modify: `tests/security-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Investigate the blocked-content report**

Checked the live parent page headers with `curl -I -L https://yinpengtao.cn/tools/subtitle-workbench/`: the route had no `X-Frame-Options`, and CSP allowed `frame-src https://yptt-subtitle-workbench.hf.space`. Checked `curl -I -L https://yptt-subtitle-workbench.hf.space/`: the HF root response did not expose an obvious anti-framing header. A clean Playwright screenshot of the live route rendered the iframe successfully, so the remaining failure boundary is browser / embedded-environment instability around the third-party iframe rather than a deterministic parent CSP regression.

- [x] **Step 2: Add failing regression contracts**

Updated `tests/routing-contract.test.mjs` to require `/tools/subtitle-workbench/` to call `redirect(SUBTITLE_WORKBENCH_URL)` and to avoid `<iframe>`, direct-open overlay links, and old subtitle iframe CSS. Updated `tests/security-contract.test.mjs` to require the subtitle-specific external `frame-src` exception and header rule to be removed.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/routing-contract.test.mjs tests/security-contract.test.mjs`

Observed: FAIL before implementation. The routing contract failed because the page still rendered the iframe, and the security contract failed because `next.config.ts` still contained `subtitleWorkbenchContentSecurityPolicy` and the HF `frame-src` exception.

- [x] **Step 4: Implement direct launch**

Changed `src/app/tools/subtitle-workbench/page.tsx` to use `redirect(SUBTITLE_WORKBENCH_URL)` instead of rendering an iframe wrapper. The Thinking Lab card can keep linking to the stable site route, but the route now lands directly on the hosted HF workbench.

- [x] **Step 5: Remove obsolete iframe exceptions and styles**

Removed the subtitle-specific CSP / header branch from `next.config.ts`; normal pages keep the default anti-framing headers, and same-origin margin static tools keep their existing `SAMEORIGIN` override. Removed the unused `.subtitle-workbench-*` iframe wrapper styles from `src/app/globals.css`.

- [x] **Step 6: Run targeted verification**

Run: `node --test tests/routing-contract.test.mjs tests/security-contract.test.mjs`

Observed: PASS, 13/13 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

- [x] **Step 7: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 318/318 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

Run: local production smoke on `http://127.0.0.1:3038/tools/subtitle-workbench/`

Observed: `curl -I` returned `307` with `location: https://yptt-subtitle-workbench.hf.space/`; `curl -I -L` followed to HF `200`; Playwright screenshot showed the hosted workbench UI directly, not the browser blocked-content page.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `安全 P0-2 三次回归`, noting that this fix removes the third-party iframe boundary rather than further relaxing CSP.

### Task 27: Add A Local Generated Artifact Cleanup Command

**Files:**
- Add: `scripts/clean-local-artifacts.mjs`
- Modify: `package.json`
- Modify: `tests/tooling-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped `架构 P2-4 仓库卫生` to the independently safe local-artifact cleanup sub-item: ignored generated paths `output/`, `.playwright-cli/`, and `tsconfig.tsbuildinfo` were present in the working tree. The separate `stockDecisionHtml.ts` maintainability issue remains a later architecture item.

- [x] **Step 2: Add a failing cleanup contract**

Updated `tests/tooling-contract.test.mjs` to require a `clean:artifacts` package script and `scripts/clean-local-artifacts.mjs`. The test runs the script against a temporary fixture and asserts that it removes only `output/`, `.playwright-cli/`, and `tsconfig.tsbuildinfo`, while preserving a normal `src/keep.txt` file.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/tooling-contract.test.mjs`

Observed: FAIL before implementation because `package.json` did not expose `clean:artifacts`.

- [x] **Step 4: Implement the cleanup command**

Added `scripts/clean-local-artifacts.mjs` with a fixed whitelist of local generated artifact paths and a `--root` option used by the contract test. Added `clean:artifacts` to `package.json`.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/tooling-contract.test.mjs`

Observed: PASS, 11/11 tests.

- [x] **Step 6: Clean the current working tree artifacts**

Run: `npm run clean:artifacts`

Observed: removed `output`, `.playwright-cli`, and `tsconfig.tsbuildinfo`.

Run: `find . -maxdepth 2 \( -name output -o -name .playwright-cli -o -name tsconfig.tsbuildinfo \) -print`

Observed: no output, confirming the three ignored artifacts are no longer present.

- [x] **Step 7: Record completion**

Updated `docs/project-audit-report.md` as `架构 P2-4a`, closing the local-artifact cleanup sub-item while leaving `stockDecisionHtml.ts` extraction for a later pass.

### Task 28: Split The Private Stock Decision HTML Generated Artifact Out Of TypeScript

**Files:**
- Modify: `scripts/build-lucas-stock-decision.mjs`
- Modify: `src/lib/lucas/stock-decision/stockDecisionHtml.ts`
- Add: `src/lib/lucas/stock-decision/stockDecision.html`
- Modify: `src/app/api/lucas/stock-decision/route.ts`
- Modify: `next.config.ts`
- Modify: `tests/lucas-private-route-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the remaining `架构 P2-4 仓库卫生` issue to the private stock-decision generated artifact: `stockDecisionHtml.ts` contained the whole bundled app as a 50KB TypeScript string. The original maintainable source already lives under `src/lib/lucas/stock-decision/app/`, so this pass preserves that source of truth and changes only the generated serving artifact.

- [x] **Step 2: Add failing route and generation contracts**

Updated `tests/lucas-private-route-contract.test.mjs` to require `/api/lucas/stock-decision` to call `getStockDecisionHtml()`, require `stockDecisionHtml.ts` to be a small `readFile` loader, require a generated `stockDecision.html` file, and require `next.config.ts` to include that private HTML artifact in Vercel file tracing.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/lucas-private-route-contract.test.mjs`

Observed: FAIL before implementation because the API route still imported `stockDecisionHtml` directly and `src/lib/lucas/stock-decision/stockDecision.html` did not exist.

- [x] **Step 4: Split the generated artifact**

Changed `scripts/build-lucas-stock-decision.mjs` to write the bundled app directly to `src/lib/lucas/stock-decision/stockDecision.html`. Replaced `stockDecisionHtml.ts` with a 331B async loader that reads and caches that HTML file.

- [x] **Step 5: Keep the private route private**

Changed `src/app/api/lucas/stock-decision/route.ts` to `await getStockDecisionHtml()` after middleware authorization. Added `outputFileTracingIncludes` in `next.config.ts` so the Vercel function includes the private HTML file without moving it into `public/`.

- [x] **Step 6: Rebuild and run targeted verification**

Run: `node scripts/build-lucas-stock-decision.mjs`

Observed: generated `src/lib/lucas/stock-decision/stockDecision.html` at about 47KB while `stockDecisionHtml.ts` stayed at 331B.

Run: `node --test tests/lucas-private-route-contract.test.mjs`

Observed: PASS, 4/4 tests.

Run: `npm test` in `src/lib/lucas/stock-decision/app`

Observed: PASS, 12/12 tests.

Run: `node --test tests/private-tool-access-middleware.test.mjs tests/lucas-private-route-contract.test.mjs`

Observed: PASS, 8/8 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npx tsc --noEmit`

Observed: PASS.

- [x] **Step 7: Run full verification and production-route smoke**

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 319/319 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages.

Run: local production smoke with `PRIVATE_TOOL_ACCESS_KEY=local-smoke-private-tool-key npm run start -- -p 3039`

Observed: unauthenticated `GET /api/lucas/stock-decision/` returned `401`; after `POST /api/private-tool-access/` returned a token, authenticated `GET /api/lucas/stock-decision/` returned `200` and the HTML contained `kelly-app` and `凯利杠杆矩阵`.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `架构 P2-4b`, closing the `stockDecisionHtml.ts` generated-string sub-item and marking the broader `仓库卫生` item fixed.

### Task 29: Extract The Legacy Finance Browser Script Loader Boundary

**Files:**
- Add: `src/lib/finance/browser-tool-loader.ts`
- Modify: `src/app/finance/business-analysis/BusinessAnalysisTool.tsx`
- Modify: `src/app/finance/monthly-trend/MonthlyTrendTool.tsx`
- Modify: `src/app/finance/profit-structure/ProfitStructureTool.tsx`
- Modify: `src/app/finance/sensitivity-analysis/SensitivityTool.tsx`
- Modify: `tests/tooling-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped `架构 P2-3` to a small "clear isolation" sub-item around the legacy browser finance engines. The large `.js` calculation engines are still risky to migrate in one pass, but the TSX shells also duplicated their Plotly / XLSX script loading and global cache typing. This pass keeps engine behavior unchanged and moves that browser boundary into one TypeScript helper.

- [x] **Step 2: Add a failing boundary contract**

Updated `tests/tooling-contract.test.mjs` to require `src/lib/finance/browser-tool-loader.ts`, require it to export `loadBrowserScript`, and require `business-analysis`, `monthly-trend`, `profit-structure`, and `sensitivity-analysis` shells to import that helper instead of declaring local `loadBrowserScript` / `__financeToolScripts`.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/tooling-contract.test.mjs`

Observed: FAIL before implementation because `src/lib/finance/browser-tool-loader.ts` did not exist.

- [x] **Step 4: Extract the shared loader**

Added `src/lib/finance/browser-tool-loader.ts` with the existing script-cache behavior and a single `Window.__financeToolScripts` declaration.

- [x] **Step 5: Move finance shells to the shared boundary**

Changed the four finance TSX shells to import `loadBrowserScript` from `@/lib/finance/browser-tool-loader`; each shell now only keeps its own model-global `initApp` typing and the same dynamic import of its local `.js` engine.

- [x] **Step 6: Run targeted verification**

Run: `node --test tests/tooling-contract.test.mjs`

Observed: PASS, 12/12 tests.

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 320/320 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

- [x] **Step 7: Record completion**

Updated `docs/project-audit-report.md` as `架构 P2-3b`, noting that the browser loader boundary is fixed while full `.js` engine TS migration remains a later split task.

### Task 30: Align Finance Workbench Control Console Breakpoints

**Files:**
- Add: `src/lib/finance/workbench-breakpoints.ts`
- Modify: `src/app/finance/business-analysis/business-analysis-engine.js`
- Modify: `src/app/finance/business-analysis/tool.css`
- Modify: `src/app/finance/monthly-trend/monthly-trend-engine.js`
- Modify: `src/app/finance/profit-structure/profit-structure-engine.js`
- Modify: `src/app/finance/sensitivity-analysis/sensitivity-engine.js`
- Modify: `src/app/finance/sensitivity-analysis/tool.css`
- Modify: `tests/finance-mobile-drill-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped `UI P2` breakpoint inconsistency to the independently verifiable finance workbench control-console breakpoint. Business and sensitivity switched their drawer sidebars at 820px, while monthly trend and profit structure used 900px. This pass does not flatten content-density breakpoints such as 640 / 700 / 720px that are used for chart labels.

- [x] **Step 2: Add a failing breakpoint contract**

Updated `tests/finance-mobile-drill-contract.test.mjs` to require a shared `src/lib/finance/workbench-breakpoints.ts` helper with `FINANCE_WORKBENCH_MOBILE_BREAKPOINT_PX = 900`, require all four Plotly finance engines to use `FINANCE_WORKBENCH_MOBILE_QUERY`, and require their sidebar CSS media blocks to switch at 900px.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/finance-mobile-drill-contract.test.mjs`

Observed: FAIL before implementation because `src/lib/finance/workbench-breakpoints.ts` did not exist.

- [x] **Step 4: Add the shared workbench breakpoint**

Added `src/lib/finance/workbench-breakpoints.ts` with `FINANCE_WORKBENCH_MOBILE_BREAKPOINT_PX`, `FINANCE_WORKBENCH_MOBILE_QUERY`, and `isFinanceWorkbenchMobileViewport()`.

- [x] **Step 5: Align the four finance workbench sidebars**

Changed business-analysis, sensitivity-analysis, monthly-trend, and profit-structure engines to use the shared mobile query for control-console drawer behavior. Changed business-analysis and sensitivity-analysis CSS sidebar media blocks from 820px to 900px. Sensitivity was also given an explicit default export so its existing Node import tests continue to read the same model API after adding the ESM helper import.

- [x] **Step 6: Run targeted verification**

Run: `node --test tests/finance-mobile-drill-contract.test.mjs`

Observed: PASS, 36/36 tests.

Run: `node --test tests/sensitivity-analysis.test.mjs`

Observed: PASS, 7/7 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning remains unrelated.

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

- [x] **Step 7: Record completion**

Updated `docs/project-audit-report.md` as `UI P2-4a`, closing the finance control-console breakpoint sub-item while leaving other content-density breakpoints for separate evaluation.

### Task 31: Tokenize The Shared Finance Tool Back Button

**Files:**
- Modify: `src/components/finance/ToolBackButton.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to one real shared rendered path: `ToolBackButton`, used by the full-screen finance tools. This pass does not attempt a broad `globals.css` token migration.

- [x] **Step 2: Add a failing token contract**

Added `tests/design-token-contract.test.mjs` coverage requiring `ToolBackButton` to use `finance-tool-back-*` classes, avoid TSX hardcoded hex / `rgba` color literals, and have global styles that derive button and icon color from `--accent`, `--foreground`, `--card`, and `--border`.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because `ToolBackButton.tsx` did not contain `finance-tool-back-button` and still used Tailwind arbitrary color utilities such as `border-[#e8e6dc]`, `text-[#141413]`, and `hover:border-[#d97757]`.

- [x] **Step 4: Move button visuals to tokenized global CSS**

Changed `ToolBackButton` to render semantic `finance-tool-back-shell`, `finance-tool-back-button`, `finance-tool-back-icon`, and `finance-tool-back-label` classes. Added global CSS that preserves the original fixed position, mobile circular button, desktop labeled button, hover lift, icon inversion, and focus ring while deriving color from site tokens.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 2/2 tests.

- [x] **Step 6: Run full verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 2/2 tests.

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 322/322 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

Run: local production Playwright on `http://127.0.0.1:3041/finance/business-analysis/`

Observed: PASS. At `1440x900`, `.finance-tool-back-button` was visible at `142x44`, the label displayed, and console errors were 0. At `390x844`, the button was visible at `40x40`, the label was hidden, and console errors were 0. From `/finance/`, opening the budget analysis model and clicking the back button returned to `/finance/`. Fresh direct-open sessions can still put `about:blank` in the browser history before the tool page; that is the pre-existing `router.back()` behavior and not caused by this style migration.

- [x] **Step 7: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10a`, noting that this closes only the shared finance back button token sub-item and leaves other real rendered paths for separate review.

### Task 32: Tokenize Finance Tool Page Shells

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/finance/business-analysis/page.tsx`
- Modify: `src/app/finance/monthly-trend/page.tsx`
- Modify: `src/app/finance/margin-analysis/page.tsx`
- Modify: `src/app/finance/sensitivity-analysis/page.tsx`
- Modify: `src/app/finance/profit-structure/page.tsx`
- Modify: `src/app/finance/perspective-bi/page.tsx`
- Modify: `src/app/finance/finance-ai-assistant/page.tsx`
- Modify: `src/app/finance/finance-ai-assistant/demo/page.tsx`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to another concrete rendered surface: finance tool page wrappers and their no-JS fallback wrappers. This pass does not attempt to migrate tool-internal CSS, Plotly palettes, or global page styling.

- [x] **Step 2: Add a failing token contract**

Updated `tests/design-token-contract.test.mjs` to require all finance tool page wrappers to use `finance-tool-page-shell`, reject `bg-[#faf9f5]` and `text-[#141413]` in those page files, and require global shell / fallback styles to derive from `--background` and `--foreground`.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because `src/app/finance/business-analysis/page.tsx` did not contain `finance-tool-page-shell` and still hardcoded `bg-[#faf9f5]` / `text-[#141413]`.

- [x] **Step 4: Move page shell visuals to tokenized global CSS**

Added `.finance-tool-page-shell` and `.finance-tool-page-fallback` in `src/app/globals.css`, deriving background and foreground from the site tokens. Updated `business-analysis`, `monthly-trend`, `margin-analysis`, `sensitivity-analysis`, `profit-structure`, `perspective-bi`, the formal finance AI assistant, and the finance AI read-only demo page wrappers to use those classes.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 3/3 tests.

Run: `rg -n "bg-\\[#faf9f5\\]|text-\\[#141413\\]" src/app/finance/*/page.tsx src/app/finance/finance-ai-assistant/demo/page.tsx`

Observed: no matches, exit code 1.

- [x] **Step 6: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 323/323 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

Run: local production Playwright on `http://127.0.0.1:3042`

Observed: PASS. At `1440x900`, `/finance/business-analysis/` and `/finance/margin-analysis/` both exposed `.finance-tool-page-shell` with `rgb(250, 249, 245)` background and `rgb(20, 20, 19)` foreground, the back button was visible at `142x44`, and the margin iframe still pointed to `/tools/margin-analysis/index.html`. At `390x844`, `/finance/finance-ai-assistant/` exposed the same shell colors, the back button was visible at `40x40`, the label was hidden, and console errors were 0.

- [x] **Step 7: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10b`, noting that this closes only finance tool page wrapper tokenization and leaves tool-internal palettes plus other hardcoded surfaces for separate passes.

### Task 33: Tokenize Global Text Selection

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to the global text selection style on the root layout. This pass does not attempt to migrate metadata colors, local shadows, or tool-internal palettes.

- [x] **Step 2: Add a failing token contract**

Updated `tests/design-token-contract.test.mjs` to require `src/app/layout.tsx` to avoid Tailwind arbitrary selection colors and to require `src/app/globals.css` to define `::selection` using `--accent` and `--card`.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because `src/app/layout.tsx` still used `selection:bg-[#d97757] selection:text-white`.

- [x] **Step 4: Move selection visuals to tokenized global CSS**

Removed `selection:bg-[#d97757] selection:text-white` from the root `body` className. Added global `::selection` styles in `src/app/globals.css` with `background: var(--accent)` and `color: var(--card)`.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 4/4 tests.

- [x] **Step 6: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `rg -n "selection:bg-\\[#|selection:text-white" src/app src/components`

Observed: no matches, exit code 1.

Run: `npm run test:site`

Observed: PASS, 325/325 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

- [x] **Step 7: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10c`, noting that this closes only the global selection-style token sub-item and leaves other hardcoded visual surfaces for separate passes.

### Task 34: Tokenize Site Navigation Shadows

**Files:**
- Modify: `src/components/layout/SiteNavigation.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to another concrete rendered surface: the global `SiteNavigation` shadows on the desktop pill, mobile launcher, and mobile dropdown. This pass does not attempt to migrate every shadow in `globals.css`, finance tool-internal palettes, or generated private-tool CSS.

- [x] **Step 2: Add a failing token contract**

Updated `tests/design-token-contract.test.mjs` to require `SiteNavigation` to avoid inline `rgba()` `boxShadow` strings, to use `--site-nav-button-shadow`, `--site-nav-menu-shadow`, and `--site-nav-shell-shadow`, and to require those variables to be defined from `--foreground` via `color-mix()` in `:root`.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because `SiteNavigation.tsx` still contained `boxShadow: "0 8px 24px rgba(0,0,0,0.08)"`, `boxShadow: "0 18px 44px rgba(0,0,0,0.12)"`, and `boxShadow: "0 12px 32px rgba(0,0,0,0.08)"`.

- [x] **Step 4: Move navigation shadows to root tokens**

Added `--site-nav-button-shadow`, `--site-nav-menu-shadow`, and `--site-nav-shell-shadow` in `src/app/globals.css`, deriving each shadow from `--foreground` with `color-mix()`. Changed the three `SiteNavigation` `boxShadow` values to `var(...)` references while leaving layout, blur, spacing, and navigation behavior unchanged.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 5/5 tests.

- [x] **Step 6: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 326/326 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

- [x] **Step 7: Verify navigation rendering in a production browser**

Started `npm run start -- --port 3043`.

Run: bundled Playwright opened `http://127.0.0.1:3043/` at `1440×900` and `390×844`, read computed navigation shadows and menu text, then closed the browser and stopped the local server.

Observed: desktop navigation text stayed `首页财务模型工具与思考联系` and its shadow resolved to token-derived `color(srgb ... / 0.08)`; mobile dropdown text stayed `首页财务模型工具与思考联系` and its shadow resolved to token-derived `color(srgb ... / 0.12)`; console error count stayed 0.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10d`, noting that this closes only the global navigation shadow token sub-item and leaves other hardcoded visual surfaces for separate passes.

### Task 35: Tokenize Home Hero Model Stage Accents

**Files:**
- Modify: `src/components/home/HeroModelStage.tsx`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to a concrete homepage surface: `HeroModelStage`, the first-viewport finance model stage on the homepage. This pass does not attempt to migrate the `HomeThinkingSection` accent map, all homepage decorative colors, or finance tool-internal palettes.

- [x] **Step 2: Add a failing token contract**

Updated `tests/design-token-contract.test.mjs` to require `HeroModelStage` to avoid `accent: "#..."` entries, to use `var(--accent-secondary)`, `var(--accent)`, and `var(--accent-tertiary)`, and to keep writing the selected token into `--hero-stage-accent`.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because `HeroModelStage.tsx` still contained `accent: "#6a9bcc"`, `accent: "#d97757"`, and `accent: "#788c5d"` in the stage config.

- [x] **Step 4: Move stage accents to site tokens**

Changed the margin-analysis stage to `var(--accent-secondary)`, the business-analysis and finance-AI stages to `var(--accent)`, and the monthly-trend stage to `var(--accent-tertiary)`. The existing `--hero-stage-accent` custom property still drives the stage panel, buttons, scan line, and highlights.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 6/6 tests.

- [x] **Step 6: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 327/327 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

- [x] **Step 7: Verify homepage stage rendering in a production browser**

Started `npm run start -- --port 3044`.

Run: bundled Playwright opened `http://127.0.0.1:3044/` at `1440×900` and `390×844`, read the homepage model stage text and console errors, then hovered the four desktop stage tabs and read the inline `--hero-stage-accent` style plus computed accent value.

Observed: desktop and mobile stage content stayed readable, console error count stayed 0, and the four desktop stages wrote `var(--accent-secondary)`, `var(--accent)`, `var(--accent-tertiary)`, and `var(--accent)` into `--hero-stage-accent`; the computed colors resolved to the previous brand palette values.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10e`, noting that this closes only the homepage model-stage accent token sub-item and leaves other hardcoded visual surfaces for separate passes.

### Task 36: Tokenize Home Thinking Track Accents

**Files:**
- Modify: `src/components/home/HomeThinkingSection.tsx`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to a concrete homepage surface: `HomeThinkingSection`, the "工具与思考" section on the homepage. This pass does not attempt to migrate all homepage decorative CSS fallbacks, tool-internal palettes, or unrelated global hardcoded colors.

- [x] **Step 2: Add a failing token contract**

Updated `tests/design-token-contract.test.mjs` to require `HomeThinkingSection` to avoid `accent: "#..."` and `soft: "rgba(...)"` track entries, to use `var(--accent-secondary)`, `var(--accent)`, and `var(--accent-tertiary)`, and to derive soft track backgrounds with token-based `color-mix(..., transparent)`.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because `HomeThinkingSection.tsx` still contained `accent: "#3f8f9f"`, `accent: "#b46b8d"`, `accent: "#7d8c45"`, and the matching `rgba(...)` soft color values in the track config.

- [x] **Step 4: Move track accents to site tokens**

Changed the tool track to `var(--accent-secondary)`, the AI creation track to `var(--accent)`, and the thinking-record track to `var(--accent-tertiary)`. Changed the three soft values to token-derived `color-mix(in srgb, var(...) 13/14%, transparent)` values while preserving the existing `--thinking-track-accent` and `--thinking-track-soft` custom-property flow.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 7/7 tests.

- [x] **Step 6: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 328/328 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

- [x] **Step 7: Verify homepage thinking rendering in a production browser**

Started `npm run start -- --port 3045`.

Run: bundled Playwright opened `http://127.0.0.1:3045/` at `1440×900` and `390×844`, scrolled to `#thinking`, read the section text, the active panel custom properties, the three track card custom properties and card dimensions, then closed the browser.

Observed: desktop and mobile `#thinking` content stayed readable, console error count stayed 0, and the three track cards resolved their token-driven accents to the site brand palette (`#6a9bcc`, `#d97757`, `#788c5d`) with token-derived `color-mix(...)` soft backgrounds.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10f`, noting that this closes only the homepage thinking-track accent token sub-item and leaves other hardcoded visual surfaces for separate passes.

### Task 37: Tokenize Chat Assistant Shell Visuals

**Files:**
- Modify: `src/components/ChatWidget.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `tests/tooling-contract.test.mjs`
- Modify: `eslint.config.mjs`
- Modify: `.gitignore`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to one concrete, global rendered surface: the `ChatWidget` assistant shell. This pass covers the mobile backdrop, launcher shadow, desktop/mobile panel shadow, online status dot, mobile greeting-card shadow, and mobile input-wrapper shadow. It does not attempt to migrate message content cards, chart colors, or every inline style in the assistant.

- [x] **Step 2: Add a failing token contract**

Updated `tests/design-token-contract.test.mjs` to require `ChatWidget` to read `--chat-*` design tokens for the assistant shell visuals, to reject the old hardcoded shell literals such as `rgba(20,20,19,0.22)`, `0 24px 60px rgba(20,20,19,0.18)`, `#10B981`, and `rgba(16,185,129,0.4)`, and to require the new tokens to be defined in `:root`.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because `ChatWidget.tsx` still contained the hardcoded mobile backdrop rgba values, launcher/panel/greeting/input shadows, and the fixed green online-dot color.

- [x] **Step 4: Move assistant shell visuals to site tokens**

Added `--chat-mobile-backdrop-keyboard`, `--chat-mobile-backdrop-fullscreen`, `--chat-mobile-backdrop-sheet`, `--chat-launcher-shadow`, `--chat-panel-mobile-shadow`, `--chat-panel-desktop-shadow`, `--chat-status-online`, `--chat-status-online-shadow`, `--chat-greeting-mobile-shadow`, and `--chat-input-mobile-shadow` to `src/app/globals.css`. Changed `ChatWidget` to read those variables; the online status dot now derives from `--accent-tertiary`.

- [x] **Step 5: Preserve local handoff artifacts without letting them break lint**

`npm run lint` initially failed because untracked local `social-card-prompt-handoff*` directories contain `.cjs` helper scripts. These are local generated handoff artifacts, not site source, so this pass added `social-card-prompt-handoff*/` to `.gitignore` and `social-card-prompt-handoff*/**` to ESLint global ignores. Added `tests/tooling-contract.test.mjs` coverage so the standard lint command keeps ignoring those local handoff artifacts.

- [x] **Step 6: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 8/8 tests.

Run: `node --test tests/tooling-contract.test.mjs`

Observed: PASS, 13/13 tests.

Run: `npm run lint`

Observed: PASS after the local handoff artifact ignore was added.

- [x] **Step 7: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 330/330 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

- [x] **Step 8: Verify ChatWidget rendering in a production browser**

Started `npm run start -- --port 3046`.

Run: bundled Playwright opened `http://127.0.0.1:3046/` at `1440×900` and `390×844`, opened Lucas AI, read root `--chat-*` tokens plus computed panel shadow, mobile backdrop background, and online status dot styles, then closed the browser.

Observed: desktop and mobile opened Lucas AI without console errors; the panel shadows, mobile backdrop, and online status dot resolved from the `--chat-*` tokens, with the online dot resolving to the site tertiary accent.

- [x] **Step 9: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10g`, noting that this closes only the global assistant shell token sub-item and leaves other hardcoded visual surfaces for separate passes.

### Task 38: Tokenize Finance Model Status Ribbon

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `tests/finance-model-registry.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to the finance model listing "测试中" status ribbon. This pass covers only the ribbon background, text color, box shadow, and text shadow in `.finance-model-status-ribbon`; it does not change the mobile ribbon placement contract or claim tool-internal chart palettes are fully tokenized.

- [x] **Step 2: Add a failing token contract**

Updated `tests/design-token-contract.test.mjs` to require `--finance-ribbon-bg`, `--finance-ribbon-text`, `--finance-ribbon-shadow`, and `--finance-ribbon-text-shadow` in `:root`, require `.finance-model-status-ribbon` to read those tokens, and reject the old hardcoded `#ffad57`, `#f47b35`, `#e85f24`, `#fff`, and `rgba(...)` ribbon literals.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because `.finance-model-status-ribbon` still contained the hardcoded orange gradient, white text, and rgba shadow/text-shadow values.

- [x] **Step 4: Move ribbon visuals to site tokens**

Added `--finance-ribbon-bg`, `--finance-ribbon-text`, `--finance-ribbon-shadow`, and `--finance-ribbon-text-shadow` to `src/app/globals.css`, deriving the ribbon from `--accent`, `--card`, and `--foreground`. Changed `.finance-model-status-ribbon` to read those tokens while preserving its positioning, rotation, font, and pointer-event behavior.

- [x] **Step 5: Align the older registry contract**

Updated `tests/finance-model-registry.test.mjs` so the structural preview test now expects `background: var(--finance-ribbon-bg)` instead of the old inline `background: linear-gradient`. The separate mobile test still requires `top: 8px`, `right: -26px`, `left: auto`, and `width: 92px`.

- [x] **Step 6: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 9/9 tests.

Run: `node --test tests/finance-model-registry.test.mjs`

Observed: PASS, 15/15 tests.

- [x] **Step 7: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 331/331 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

- [x] **Step 8: Verify finance ribbon rendering in a production browser**

Started `npm run start -- --port 3047`.

Run: bundled Playwright opened `http://127.0.0.1:3047/finance` at `1440×900` and `390×844`, read root `--finance-ribbon-*` tokens and the computed styles for both visible "测试中" ribbons, then closed the browser.

Observed: desktop and mobile both rendered two ribbons inside `.finance-model-preview-frame`; the computed backgrounds were gradients, box shadow and text shadow resolved from token-derived color values, mobile CSS width stayed `92px`, and console error count stayed 0.

- [x] **Step 9: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10h`, noting that this closes only the finance model status ribbon token sub-item and leaves tool-internal chart palettes plus other hardcoded visual surfaces for later passes.

### Task 39: Tokenize Finance AI Assistant Surface Tokens

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `tests/finance-ai-assistant-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to the formal finance AI assistant page and chart surfaces. This pass covers `--finance-ai-page-surface`, `--finance-ai-chart-border`, `--finance-ai-chart-shadow`, the repeated empty-preview shadow, the sticky composer surface, and markdown inline code background. It does not attempt to migrate the upload workbench, detail-table filters, avatars, or every remaining finance AI internal control color.

- [x] **Step 2: Add a failing token contract**

Updated `tests/design-token-contract.test.mjs` to require the finance AI surface tokens to derive from shared site tokens and to reject the old `#f7f5ef`, `#d7cdbc`, and `rgba(64, 52, 36, 0.045)` literals. The same contract requires `.finance-ai-markdown code` to use `--finance-ai-inline-code-bg` instead of the old white rgba literal.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because `src/app/globals.css` still defined `--finance-ai-page-surface: #f7f5ef`, mixed the chart border with `#d7cdbc`, used the old rgba chart shadow, and kept markdown inline code on a direct white rgba background.

- [x] **Step 4: Move finance AI surfaces to site tokens**

Changed `--finance-ai-page-surface` to derive from `--background` and `--border`, `--finance-ai-chart-border` to derive from `--border` and `--accent`, and `--finance-ai-chart-shadow` to derive from `--foreground`. Added `--finance-ai-inline-code-bg` from `--card`, changed `.finance-ai-markdown code` to read it, changed the empty preview card to use the shared chart shadow, and changed the composer dock gradient to use `--finance-ai-page-surface`.

- [x] **Step 5: Align the older finance AI contract**

Updated `tests/finance-ai-assistant-contract.test.mjs` so the chart-surface test now expects site-token-derived finance AI surfaces instead of the fixed `#f7f5ef` / `#d7cdbc` values, while still requiring the formal page and demo cards to use the shared finance AI surface tokens.

- [x] **Step 6: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 10/10 tests.

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Observed: PASS, 40/40 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning remains unrelated.

- [x] **Step 7: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 332/332 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

- [x] **Step 8: Verify finance AI surface rendering in a production browser**

Started `npm run start -- --port 3048`.

Run: bundled Playwright opened `http://127.0.0.1:3048/finance/finance-ai-assistant` and `http://127.0.0.1:3048/finance/finance-ai-assistant/demo` at `1440×900`, read root `--finance-ai-*` tokens and computed page, demo-card, and inline-code styles, then closed the browser.

Observed: formal and demo routes had console error count 0; page backgrounds resolved from `--finance-ai-page-surface`, the demo chart card resolved background / border / shadow from `--finance-ai-chart-*`, and markdown inline code background resolved from `--finance-ai-inline-code-bg`.

- [x] **Step 9: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10i`, noting that this closes only the finance AI assistant page/chart/inline-code surface token sub-item and leaves upload-zone, detail-filter, avatar, and other internal control colors for later passes.

### Task 40: Tokenize Finance AI Upload Workbench Surfaces

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to the formal finance AI assistant upload workbench. This pass covers `.finance-ai-upload-workbench`, `.finance-ai-upload-dropzone`, `.finance-ai-upload-dropzone.is-dragging`, and `.finance-ai-empty-preview-card`. It does not attempt to migrate upload chips, template buttons, avatars, detail filters, chart palettes, or every remaining finance AI internal control color.

- [x] **Step 2: Add a failing token contract**

Added `readCssRule()` to `tests/design-token-contract.test.mjs` and a new contract requiring the upload workbench surfaces to use `--finance-ai-upload-*` / `--finance-ai-empty-preview-bg` tokens. The contract rejects the old scoped `rgba(255, 255, 255, 0.9)`, `rgba(255, 255, 255, 0.72)`, `rgba(70, 48, 30, 0.08)`, `rgba(217, 119, 87, 0.08)`, `rgba(255, 255, 255, 0.48)`, `rgba(217, 119, 87, 0.14)`, `rgba(255, 250, 244, 0.68)`, `rgba(255, 255, 255, 0.86)`, and `rgba(255, 250, 243, 0.7)` literals.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because `.finance-ai-upload-workbench`, `.finance-ai-upload-dropzone`, `.finance-ai-upload-dropzone.is-dragging`, and `.finance-ai-empty-preview-card` still contained the old hardcoded `rgba(...)` background and shadow values.

- [x] **Step 4: Move upload workbench surfaces to site tokens**

Added `--finance-ai-upload-workbench-bg`, `--finance-ai-upload-workbench-shadow`, `--finance-ai-upload-dropzone-bg`, `--finance-ai-upload-dropzone-active-bg`, and `--finance-ai-empty-preview-bg` to `:root`. Each token derives from `--card`, `--accent`, `--foreground`, and the existing `--finance-ai-page-surface`. Updated the four scoped CSS rules to read those tokens while preserving layout, spacing, radius, grid, and min-height behavior.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 11/11 tests.

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Observed: PASS, 40/40 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning remains unrelated.

- [x] **Step 6: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 333/333 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

- [x] **Step 7: Verify finance AI upload workbench rendering in a production browser**

Started `npm run start -- --port 3049`.

Run: bundled Playwright opened `http://127.0.0.1:3049/finance/finance-ai-assistant` at `1440×900` and `390×844`, read the root upload tokens and computed styles for the upload workbench, dropzone, drag state, and empty preview card, then closed the browser and server.

Observed: console error count was 0 on desktop and mobile. Desktop rendered the workbench, dropzone, and empty preview card with nonzero dimensions; mobile rendered the workbench and dropzone with nonzero dimensions. The drag-state dropzone background differed from the resting background, confirming the active token path was applied.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10j`, noting that this closes only the finance AI upload workbench surface token sub-item and leaves upload buttons, template buttons, detail filters, avatars, and other internal control colors for later passes.

### Task 41: Tokenize Finance AI Upload Action Buttons

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to the formal finance AI assistant upload action buttons. This pass covers `.finance-ai-upload-chip` and the upload-area `.finance-ai-template-button` surface. It does not attempt to migrate avatars, error text, detail-table filters, chart palettes, or other finance AI internal control colors.

- [x] **Step 2: Add a failing token contract**

Added `readLastCssRule()` to `tests/design-token-contract.test.mjs` so the test can read the upload-area `.finance-ai-template-button` rule rather than the earlier generic icon-button rule. Added a new contract requiring the upload chip and template button to use `--finance-ai-upload-chip-*` / `--finance-ai-template-button-bg` tokens, and rejecting the old scoped `#e9b7a6`, `#f05c35`, `#df4a24`, `rgba(220, 82, 40, 0.2)`, `#fff`, and `rgba(255, 255, 255, 0.82)` literals.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because `.finance-ai-upload-chip` still used the old warm-orange hex gradient, white text literal, and rgba shadow, and `.finance-ai-template-button` still used the old direct white rgba background.

- [x] **Step 4: Move upload action buttons to site tokens**

Added `--finance-ai-upload-chip-border`, `--finance-ai-upload-chip-bg`, `--finance-ai-upload-chip-shadow`, `--finance-ai-upload-chip-text`, and `--finance-ai-template-button-bg` to `:root`. The tokens derive from `--accent`, `--card`, and `--foreground`. Updated the two scoped CSS rules to read those tokens while preserving button sizing, layout, font weight, cursor, and mobile stacking behavior.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 12/12 tests.

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Observed: PASS, 40/40 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning remains unrelated.

- [x] **Step 6: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 334/334 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

- [x] **Step 7: Verify finance AI upload action rendering in a production browser**

Started `npm run start -- --port 3050`.

Run: bundled Playwright opened `http://127.0.0.1:3050/finance/finance-ai-assistant` at `1440×900` and `390×844`, read the root upload-action tokens and computed styles for `.finance-ai-upload-chip` and `.finance-ai-template-button`, then closed the browser and server.

Observed: console error count was 0 on desktop and mobile. The upload chip and template button were visible in both viewports; the upload chip resolved to a token-derived gradient and shadow, and the template button resolved to a token-derived background.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10k`, noting that this closes only the finance AI upload action button token sub-item and leaves avatars, error text, detail filters, and other internal control colors for later passes.

### Task 42: Tokenize Finance AI Avatar Surfaces

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to the formal finance AI assistant avatar surfaces. This pass covers `.finance-ai-avatar` and `.finance-ai-avatar-mini`. It does not attempt to migrate the empty-state card, error text, detail-table filters, chart palettes, or other finance AI internal control colors.

- [x] **Step 2: Add a failing token contract**

Added a new `tests/design-token-contract.test.mjs` contract requiring the avatar surfaces to use `--finance-ai-avatar-*` and `--finance-ai-avatar-mini-*` tokens. The contract rejects the old scoped `rgba(255, 255, 255, 0.82)`, `rgba(255, 255, 255, 0.8)`, `rgba(54, 72, 92, 0.14)`, and `#fff` literals.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because `.finance-ai-avatar` and `.finance-ai-avatar-mini` still used direct white rgba borders, `#fff` backgrounds, and a hardcoded blue-gray rgba shadow.

- [x] **Step 4: Move avatar surfaces to site tokens**

Added `--finance-ai-avatar-border`, `--finance-ai-avatar-bg`, `--finance-ai-avatar-shadow`, `--finance-ai-avatar-mini-border`, `--finance-ai-avatar-mini-bg`, and `--finance-ai-avatar-mini-shadow` to `:root`. The tokens derive from `--card` and `--accent-secondary`. Updated the two scoped CSS rules to read those tokens while preserving avatar dimensions, radii, display mode, overflow behavior, and image crop behavior.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 13/13 tests.

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Observed: PASS, 40/40 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning remains unrelated.

- [x] **Step 6: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 335/335 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

- [x] **Step 7: Verify finance AI avatar rendering in a production browser**

Started `npm run start -- --port 3051`.

Run: bundled Playwright opened `http://127.0.0.1:3051/finance/finance-ai-assistant` and `http://127.0.0.1:3051/finance/finance-ai-assistant/demo` at `1440×900` and `390×844`, read the root avatar tokens and computed styles for `.finance-ai-avatar` and `.finance-ai-avatar-mini`, then closed the browser and server.

Observed: console error count was 0 on desktop and mobile. The large avatar and mini avatar were visible with nonzero dimensions; their border and shadow resolved from the new token-derived values.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10l`, noting that this closes only the finance AI avatar surface token sub-item and leaves empty-state card, error text, detail filters, and other internal control colors for later passes.

### Task 43: Tokenize Finance AI Empty State Labels

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to the formal finance AI assistant empty-state label surfaces. This pass covers the currently rendered desktop preview label `.finance-ai-empty-preview-copy span` and the dormant backup `.finance-ai-empty-card` style rule. It does not attempt to migrate error text, detail-table filters, composer controls, message bubbles, chart palettes, or other finance AI internal control colors.

- [x] **Step 2: Add a failing token contract for the backup empty card**

Added a new `tests/design-token-contract.test.mjs` contract requiring `.finance-ai-empty-card` to use `--finance-ai-empty-card-bg` and `--finance-ai-empty-card-shadow`. The contract rejects the old scoped `rgba(255, 255, 255, 0.88)`, `rgba(255, 255, 255, 0.68)`, `#fff`, and `rgba(20, 20, 19, 0.08)` literals.

- [x] **Step 3: Verify the backup empty-card contract fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because `.finance-ai-empty-card` still used direct white `rgba(...)` gradient stops, `#fff` mixing, and a hardcoded dark `rgba(...)` shadow.

- [x] **Step 4: Move the backup empty card to site tokens**

Added `--finance-ai-empty-card-bg` and `--finance-ai-empty-card-shadow` to `:root`. The tokens derive from `--card`, `--accent-secondary`, and `--foreground`. Updated `.finance-ai-empty-card` to read those tokens while preserving width, border, radius, padding, and text alignment.

- [x] **Step 5: Add and verify a failing contract for the rendered empty preview label**

Expanded the contract to include `.finance-ai-empty-preview-copy span`, requiring `--finance-ai-empty-preview-label-bg` and rejecting the old `#fff` fallback. Re-ran `node --test tests/design-token-contract.test.mjs` and observed the expected failure because the rendered preview label still mixed against `#fff`.

- [x] **Step 6: Move the rendered empty preview label to site tokens**

Added `--finance-ai-empty-preview-label-bg` to `:root`, deriving from `--accent` and `--card`. Updated `.finance-ai-empty-preview-copy span` to read the token while preserving label display, sizing, typography, and padding.

- [x] **Step 7: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 14/14 tests.

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Observed: PASS, 40/40 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning remains unrelated.

- [x] **Step 8: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 336/336 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

- [x] **Step 9: Verify finance AI empty-state label rendering in a production browser**

Started `npm run start -- --port 3053`.

Run: bundled Playwright opened `http://127.0.0.1:3053/finance/finance-ai-assistant` at `1440×900` and `390×844`, read root empty-state tokens and CSS rules for `.finance-ai-empty-preview-copy span` and `.finance-ai-empty-card`, then closed the browser and server.

Observed: console error count was 0 on desktop and mobile. Desktop rendered the three empty-preview labels with nonzero dimensions and their background rule read `var(--finance-ai-empty-preview-label-bg)`. Mobile kept `.finance-ai-upload-preview-list` hidden with `display: none`, matching the existing responsive layout. The backup `.finance-ai-empty-card` was not present in the DOM on either viewport, so this pass verifies it at the style-rule level only.

- [x] **Step 10: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10m`, noting that this closes the rendered finance AI empty preview label and the dormant backup empty-card style rule, while leaving error text, detail filters, composer controls, and other internal control colors for later passes.

### Task 44: Tokenize Finance AI Composer Controls

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to the formal finance AI assistant composer controls. This pass covers `.finance-ai-composer`, `.finance-ai-composer-status`, and `.finance-ai-composer button`. It does not attempt to migrate thinking chips, error/warning text, detail-table filters, message bubbles, chart palettes, or every remaining composer disabled/thinking surface.

- [x] **Step 2: Add a failing token contract**

Added a new `tests/design-token-contract.test.mjs` contract requiring the composer shell, desktop status pill, and send button to use `--finance-ai-composer-*` tokens. The contract rejects the old scoped `rgba(255, 255, 255, 0.9)`, `rgba(20, 20, 19, 0.07)`, and `#fff` literals.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because the composer shell still used the old direct white rgba background and dark rgba shadow, while the status pill and send button still mixed against or rendered with direct `#fff`.

- [x] **Step 4: Move composer controls to site tokens**

Added `--finance-ai-composer-bg`, `--finance-ai-composer-shadow`, `--finance-ai-composer-status-bg`, `--finance-ai-composer-button-border`, `--finance-ai-composer-button-bg`, and `--finance-ai-composer-button-text` to `:root`. The tokens derive from `--card`, `--foreground`, and `--accent`. Updated the scoped composer/status/button rules to read those tokens while preserving sizing, layout, border radius, typography, and responsive behavior.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 15/15 tests.

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Observed: PASS, 40/40 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning remains unrelated.

- [x] **Step 6: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 337/337 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Existing Node `module.register()` deprecation warnings remain unrelated.

- [x] **Step 7: Verify finance AI composer rendering in a production browser**

Started `npm run start -- --port 3054`.

Run: bundled Playwright opened `http://127.0.0.1:3054/finance/finance-ai-assistant` at `1440×900` and `390×844`, read the root composer tokens and computed styles for `.finance-ai-composer`, `.finance-ai-composer-status`, and `.finance-ai-composer button`, then closed the browser and server.

Observed: console error count was 0 on desktop and mobile. Desktop rendered the composer, status pill, and send button with token-derived styles. Mobile rendered the composer and send button with token-derived styles; the status pill remained hidden by the existing responsive rule for `.finance-ai-composer.has-upload-status .finance-ai-composer-status`.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10n`, noting that this closes only the finance AI composer shell, desktop status pill, and send button token sub-item while leaving thinking chips, error text, detail filters, message bubbles, chart palettes, and other internal control colors for later passes.

### Task 45: Tokenize Finance AI Thinking Chips

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to the formal finance AI assistant thinking chips. This pass covers only `.finance-ai-thinking span`, which is used for the analysis-process chips while the assistant is working. It does not attempt to migrate error/warning text, detail-table filters, message bubbles, chart palettes, or other internal control colors.

- [x] **Step 2: Add a failing token contract**

Added a new `tests/design-token-contract.test.mjs` contract requiring `.finance-ai-thinking span` to use `--finance-ai-thinking-chip-bg`. The contract rejects the old scoped `rgba(255, 255, 255, 0.72)` background.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because `.finance-ai-thinking span` still used the direct white rgba background.

- [x] **Step 4: Move thinking chips to site tokens**

Added `--finance-ai-thinking-chip-bg` to `:root`, deriving from `--card`, and updated `.finance-ai-thinking span` to read that token while preserving border, radius, display, spacing, typography, and foreground color.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 16/16 tests.

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Observed: PASS, 40/40 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning remains unrelated.

- [x] **Step 6: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 338/338 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Content generation reported unchanged.

- [x] **Step 7: Verify finance AI thinking-chip CSS in a production browser**

Started `npm run start -- --port 3055`.

Run: bundled Playwright CLI opened `http://127.0.0.1:3055/finance/finance-ai-assistant` at `1440×900` and `390×844`, checked console errors, read `--finance-ai-thinking-chip-bg`, and inspected the `.finance-ai-thinking span` CSS rules.

Observed: console error count was 0 on desktop and mobile. The mobile composer remained visible. The `.finance-ai-thinking span` CSS rule read `background: var(--finance-ai-thinking-chip-bg)`. The chips are transient loading-state content, so this pass verifies the production CSS rule rather than forcing a provider call.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10o`, noting that this closes only the finance AI thinking-chip background token sub-item while leaving error text, detail filters, message bubbles, chart palettes, and other internal control colors for later passes.

### Task 46: Tokenize Finance AI Detail Filter Triggers

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to the formal finance AI assistant detail-table filter trigger buttons. This pass covers `.finance-ai-detail-filter-trigger` plus its hover, focus, active, and expanded state rule. It does not attempt to migrate the detail filter menu, numeric filter inputs, search input, footer buttons, checkmarks, table zebra rows, message bubbles, or chart palettes.

- [x] **Step 2: Add a failing token contract**

Added a new `tests/design-token-contract.test.mjs` contract requiring the filter trigger button rules to use `--finance-ai-detail-filter-trigger-bg` and `--finance-ai-detail-filter-trigger-active-bg`. The contract rejects the old scoped `rgba(255, 255, 255, 0.58)` and `rgba(255, 255, 255, 0.72)` backgrounds.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because `.finance-ai-detail-filter-trigger` and its active state still used direct white rgba backgrounds.

- [x] **Step 4: Move detail filter triggers to site tokens**

Added `--finance-ai-detail-filter-trigger-bg` and `--finance-ai-detail-filter-trigger-active-bg` to `:root`, deriving from `--card` and `--accent`, and updated the two scoped trigger rules to read those tokens while preserving dimensions, border, radius, icon layout, cursor, foreground color, and focus ring.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 17/17 tests.

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Observed: PASS, 40/40 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning remains unrelated.

- [x] **Step 6: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 339/339 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Content generation reported unchanged.

- [x] **Step 7: Verify finance AI detail-filter trigger CSS in a production browser**

Started `npm run start -- --port 3056`.

Run: bundled Playwright CLI opened `http://127.0.0.1:3056/finance/finance-ai-assistant` at `1440×900` and `390×844`, checked console errors, read `--finance-ai-detail-filter-trigger-bg` / `--finance-ai-detail-filter-trigger-active-bg`, and inspected the `.finance-ai-detail-filter-trigger` CSS rules.

Observed: console error count was 0 on desktop and mobile. The mobile composer remained visible. The detail filter trigger rules read `background: var(--finance-ai-detail-filter-trigger-bg)` and `background: var(--finance-ai-detail-filter-trigger-active-bg)`. This pass verifies the production CSS rule rather than forcing a full provider-generated detail table.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10p`, noting that this closes only the finance AI detail filter trigger background token sub-item while leaving filter menus, numeric inputs, checkmarks, table zebra rows, message bubbles, chart palettes, and other internal control colors for later passes.

### Task 47: Tokenize Finance AI Detail Filter Menu Surfaces

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to the formal finance AI assistant detail-table filter menu surfaces and basic controls. This pass covers `.finance-ai-detail-filter-menu`, `.finance-ai-detail-number-filter`, numeric select/input fields, `.finance-ai-detail-filter-search`, ordinary menu action/footer buttons, the primary apply button, and `.finance-ai-detail-filter-list`. It does not attempt to migrate the checkbox checkmark, detail-table zebra rows, message bubbles, chart palettes, or every remaining finance AI internal control color.

- [x] **Step 2: Add a failing token contract**

Added a new `tests/design-token-contract.test.mjs` contract requiring the menu surface, shadow, numeric filter panel, fields, buttons, primary button, and option list to use `--finance-ai-detail-filter-*` / `--finance-ai-detail-number-filter-bg` tokens. The contract rejects the old scoped `white`, `rgba(40, 35, 25, 0.14)`, `rgba(255, 255, 255, 0.78)`, `rgba(255, 255, 255, 0.72)`, and `rgba(255, 255, 255, 0.62)` literals.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because the detail filter menu still used direct `white`, white `rgba(...)` backgrounds, and the old dark `rgba(...)` menu shadow.

- [x] **Step 4: Move detail filter menu surfaces to site tokens**

Added `--finance-ai-detail-filter-menu-bg`, `--finance-ai-detail-filter-menu-shadow`, `--finance-ai-detail-number-filter-bg`, `--finance-ai-detail-filter-field-bg`, `--finance-ai-detail-filter-button-bg`, `--finance-ai-detail-filter-primary-button-bg`, `--finance-ai-detail-filter-primary-button-text`, and `--finance-ai-detail-filter-list-bg` to `:root`, deriving from `--card`, `--foreground`, `--accent`, `--finance-ai-page-surface`, and `--finance-ai-chart-surface`. Updated the scoped menu, field, button, primary button, and list rules to read those tokens while preserving spacing, borders, typography, layout, and focus behavior.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 18/18 tests.

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Observed: PASS, 40/40 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning remains unrelated.

- [x] **Step 6: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 340/340 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Content generation reported unchanged.

- [x] **Step 7: Verify finance AI detail-filter menu CSS in a production browser**

Started `npm run start -- --port 3057`.

Run: bundled Playwright CLI opened `http://127.0.0.1:3057/finance/finance-ai-assistant` at `1440×900` and `390×844`, checked console errors, read the detail-filter menu tokens, and inspected the menu, numeric filter, field, button, primary button, and list CSS rules.

Observed: console error count was 0 on desktop and mobile. The mobile composer remained visible and the page had no horizontal overflow. The scoped CSS rules read `background` / `box-shadow` from the new `--finance-ai-detail-filter-*` and `--finance-ai-detail-number-filter-bg` tokens. This pass verifies the production CSS rule rather than forcing a provider-generated detail table.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10q`, noting that this closes only the finance AI detail filter menu surface and basic control background token sub-item while leaving checkmarks, table zebra rows, message bubbles, chart palettes, and other internal control colors for later passes.

### Task 48: Tokenize Finance AI Detail Filter Checkmarks

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to the formal finance AI assistant detail-filter checkbox checkmark. This pass covers only `.finance-ai-detail-filter-checkmark`. It does not attempt to migrate detail-table zebra rows, message bubbles, chart palettes, or every remaining finance AI internal control color.

- [x] **Step 2: Add a failing token contract**

Added a new `tests/design-token-contract.test.mjs` contract requiring `.finance-ai-detail-filter-checkmark` to use `--finance-ai-detail-filter-checkmark-bg`. The contract rejects the old scoped `rgba(255, 255, 255, 0.76)` background.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because `.finance-ai-detail-filter-checkmark` still used the direct white rgba background.

- [x] **Step 4: Move detail filter checkmarks to site tokens**

Added `--finance-ai-detail-filter-checkmark-bg` to `:root`, deriving from `--card`, and updated `.finance-ai-detail-filter-checkmark` to read that token while preserving its size, border, radius, alignment, accent check color, and typography.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 19/19 tests.

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Observed: PASS, 40/40 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning remains unrelated.

- [x] **Step 6: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 341/341 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Content generation reported unchanged.

- [x] **Step 7: Verify finance AI detail-filter checkmark CSS in a production browser**

Started `npm run start -- --port 3058`.

Run: bundled Playwright CLI opened `http://127.0.0.1:3058/finance/finance-ai-assistant` at `1440×900` and `390×844`, checked console errors, read `--finance-ai-detail-filter-checkmark-bg`, and inspected the `.finance-ai-detail-filter-checkmark` CSS rule.

Observed: console error count was 0 on desktop and mobile. The mobile composer remained visible and the page had no horizontal overflow. The `.finance-ai-detail-filter-checkmark` rule read `background: var(--finance-ai-detail-filter-checkmark-bg)`. This pass verifies the production CSS rule rather than forcing a provider-generated detail table.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10r`, noting that this closes only the finance AI detail-filter checkmark background token sub-item while leaving table zebra rows, message bubbles, chart palettes, and other internal control colors for later passes.

### Task 49: Tokenize Finance AI Detail Table Zebra Rows

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to the formal finance AI assistant detail table zebra rows. This pass covers only `.finance-ai-detail-table tbody tr:nth-child(even)`. It does not attempt to migrate message bubbles, chart palettes, or every remaining finance AI internal control color.

- [x] **Step 2: Add a failing token contract**

Added a new `tests/design-token-contract.test.mjs` contract requiring the zebra row rule to use `--finance-ai-detail-table-zebra-bg`. The contract rejects the old scoped `rgba(255, 255, 255, 0.58)` background mix.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because `.finance-ai-detail-table tbody tr:nth-child(even)` still mixed in the direct white rgba background.

- [x] **Step 4: Move detail table zebra rows to site tokens**

Added `--finance-ai-detail-table-zebra-bg` to `:root`, deriving from `--finance-ai-page-surface` and `--card`, and updated the zebra row rule to read that token while preserving hover behavior, table spacing, borders, and typography.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 20/20 tests.

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Observed: PASS, 40/40 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning remains unrelated.

- [x] **Step 6: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 342/342 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Content generation reported unchanged.

- [x] **Step 7: Verify finance AI detail-table zebra CSS in a production browser**

Started `npm run start -- --port 3059`.

Run: bundled Playwright CLI opened `http://127.0.0.1:3059/finance/finance-ai-assistant` at `1440×900` and `390×844`, checked console errors, read `--finance-ai-detail-table-zebra-bg`, and inspected the compiled detail-table zebra rule.

Observed: console error count was 0 on desktop and mobile. The mobile composer remained visible and the page had no horizontal overflow. The compiled `.finance-ai-detail-table tbody tr:nth-child(2n)` rule read `background: var(--finance-ai-detail-table-zebra-bg)`.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10s`, noting that this closes only the finance AI detail-table zebra row background token sub-item while leaving message bubbles, chart palettes, and other internal control colors for later passes.

### Task 50: Tokenize Finance AI User Message Bubble

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to the formal finance AI assistant user message bubble background. This pass covers only `.finance-ai-message.is-user .finance-ai-message-bubble`. Assistant message bubbles remain transparent content wrappers for text and chart cards. This pass does not attempt to migrate chart palettes or every remaining finance AI internal control color.

- [x] **Step 2: Add a failing token contract**

Added a new `tests/design-token-contract.test.mjs` contract requiring the user message bubble rule to use `--finance-ai-user-message-bg`. The contract rejects the old scoped `#eee8df` background.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because `.finance-ai-message.is-user .finance-ai-message-bubble` still used the direct `#eee8df` background.

- [x] **Step 4: Move user message bubbles to site tokens**

Added `--finance-ai-user-message-bg` to `:root`, deriving from `--accent` and `--finance-ai-page-surface`, and updated the user bubble rule to read that token while preserving width, border, radius, typography, and mobile gutter behavior.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 21/21 tests.

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Observed: PASS, 40/40 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning remains unrelated.

- [x] **Step 6: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 343/343 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Content generation reported unchanged.

- [x] **Step 7: Verify finance AI user message bubble CSS in a production browser**

Started `npm run start -- --port 3060`.

Run: bundled Playwright CLI opened `http://127.0.0.1:3060/finance/finance-ai-assistant/demo/` at `1440×900` and `390×844`, checked console errors, read `--finance-ai-user-message-bg`, inspected the compiled user message bubble rule, and confirmed a real demo user bubble was visible.

Observed: console error count was 0 on desktop and mobile. The mobile user bubble remained visible and the page had no horizontal overflow. The compiled `.finance-ai-message.is-user .finance-ai-message-bubble` rule read `background: var(--finance-ai-user-message-bg)`.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10t`, noting that this closes only the finance AI user message bubble background token sub-item while leaving chart palettes and other internal control colors for later passes.

### Task 51: Tokenize Finance AI Empty Preview Waterfall Connector

**Files:**
- Modify: `src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to the formal finance AI assistant empty-state preview waterfall connector line. This pass covers only the connector line inside `makeEmptyStatePreviewTrace`. It does not attempt to migrate all Plotly chart palettes or the formal answer chart colors.

- [x] **Step 2: Add a failing token contract**

Added a new `tests/design-token-contract.test.mjs` contract requiring the empty preview waterfall connector to use `--finance-ai-empty-preview-waterfall-connector-line`. The contract rejects the old direct `rgba(172, 158, 132, 0.62)` literal and requires the Plotly render path to resolve CSS tokens before rendering.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because `FinanceAIAssistantTool.tsx` still passed the direct connector rgba color to Plotly.

- [x] **Step 4: Move the empty preview waterfall connector to site tokens**

Added `--finance-ai-empty-preview-waterfall-connector-line` to `:root`, deriving from `--muted`, and updated the empty preview waterfall connector to read that token. Added a small Plotly render-time resolver that converts CSS variable colors into browser-computed `rgb/rgba` strings before calling `Plotly.react`, avoiding fragile direct `var(...)` support assumptions inside Plotly traces.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 22/22 tests.

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Observed: PASS, 40/40 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning remains unrelated.

Run: `npx tsc --noEmit`

Observed: PASS.

- [x] **Step 6: Run full verification**

Run: `npm run lint`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 344/344 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Content generation reported unchanged.

- [x] **Step 7: Verify finance AI empty preview waterfall connector in a production browser**

Started `npm run start -- --port 3061`.

Run: bundled Playwright CLI opened `http://127.0.0.1:3061/finance/finance-ai-assistant` at `1440×900` and `390×844`, checked console errors, inspected empty preview Plotly SVG strokes, and checked mobile width/overflow.

Observed: desktop and mobile console error count was 0. Desktop rendered 3 empty preview cards and 9 Plotly SVGs; the waterfall connector strokes were resolved to `rgb(115, 113, 105)` with no unresolved `var(...)` or `color-mix(...)` values. Mobile kept the composer visible, preserved the existing `display:none` preview-list behavior, and had no horizontal overflow (`clientWidth=390`, `scrollWidth=390`).

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10u`, noting that this closes only the finance AI empty preview waterfall connector token sub-item while leaving formal result chart palettes and other internal control colors for later passes.

### Task 52: Limit Finance AI Browser Workbook Uploads

**Files:**
- Modify: `src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx`
- Modify: `tests/finance-ai-assistant-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 workbook-size hardening item to the formal finance AI assistant browser upload path. The server-side legacy direct workbook API modes were already closed in `安全 P1-5`; this pass covers the remaining local parsing risk where an oversized CSV/XLS/XLSX could be read and expanded in the browser before the page rejects it.

- [x] **Step 2: Add a failing upload-bound contract**

Added a `tests/finance-ai-assistant-contract.test.mjs` contract requiring `FinanceAIAssistantTool.parseFile` to define `FINANCE_AI_UPLOAD_MAX_BYTES` and `FINANCE_AI_UPLOAD_MAX_ROWS`, reject oversized files before `file.text()` / `file.arrayBuffer()`, and reject oversized workbooks before `buildFinanceAnalysisRowsFromWorkbook`.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Observed: FAIL before implementation because the client had no upload byte cap or workbook row cap. The existing 40 finance AI tests still passed. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning remains unrelated.

- [x] **Step 4: Add browser-side upload caps**

Added a 10MB file-size cap and a 20,000-row workbook cap to `FinanceAIAssistantTool.tsx`. `parseFile` now rejects files over 10MB before reading content, and rejects normalized workbooks over 20,000 rows before generating preview / analysis rows. User-facing errors are Chinese and ask the user to upload a smaller or pre-filtered operating-detail file.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Observed: PASS, 41/41 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning remains unrelated.

- [x] **Step 6: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 345/345 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Content generation reported unchanged.

- [x] **Step 7: Verify browser upload behavior**

Started `npm run start -- --port 3062`.

Run: bundled Playwright CLI opened `http://127.0.0.1:3062/finance/finance-ai-assistant` at desktop width, uploaded a small CSV, reloaded, uploaded a generated 10.5MB CSV, then resized to `390×844` for mobile smoke.

Observed: the small CSV loaded the page into the chat-ready state with the workbook session active. The oversized CSV was rejected in-place with `文件过大，请上传不超过 10MB 的经营明细。` before the page left the upload state. Desktop and mobile console error counts were 0. Mobile reported `clientWidth=390` and `scrollWidth=390`, with the upload workbench and composer still present. During the small-upload desktop smoke, the existing fixed back button could intercept the loaded-state reset icon at one scroll position; that was noted as a separate UI overlap, not part of this security upload-bound fix.

Run: `npm run clean:artifacts`

Observed: removed temporary `output/`, `.playwright-cli/`, and `tsconfig.tsbuildinfo` artifacts created during browser verification.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `安全 P1-5b`, noting that this closes the formal finance AI assistant browser upload byte / row-count guard while preserving the public assistant and browser-session-only workbook behavior.

### Task 53: Tokenize Finance AI Error Text

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to the formal finance AI assistant error text color. This pass covers only `.finance-ai-error`, the visible upload / parsing error message used by cases such as oversized workbook uploads. It does not attempt to migrate formal result chart palettes or every remaining internal control color.

- [x] **Step 2: Add a failing token contract**

Added a `tests/design-token-contract.test.mjs` contract requiring `.finance-ai-error` to use `--finance-ai-error-text`. The contract rejects the old direct `#a84232` literal.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because `.finance-ai-error` still set `color: #a84232`.

- [x] **Step 4: Move error text to a site-derived token**

Added `--finance-ai-error-text` to `:root`, deriving from `--accent` and `--foreground`. Updated `.finance-ai-error` to read that token while preserving spacing, typography, and the shared warning / note text styles.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 23/23 tests.

- [x] **Step 6: Run full verification**

Run: `node --test tests/design-token-contract.test.mjs tests/finance-ai-assistant-contract.test.mjs`

Observed: PASS, 64/64 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning remains unrelated.

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 346/346 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Content generation reported unchanged.

- [x] **Step 7: Verify the visible error path in a production browser**

Started `npm run start -- --port 3063`.

Run: bundled Playwright CLI opened `http://127.0.0.1:3063/finance/finance-ai-assistant`, uploaded a generated oversized CSV, and read the visible `.finance-ai-error` computed style.

Observed: the page displayed `文件过大，请上传不超过 10MB 的经营明细。`; `.finance-ai-error` computed to a token-derived `color(srgb 0.634667 0.357961 0.26651)`, while root `--finance-ai-error-text` resolved from `--accent` and `--foreground`. Console error count was 0 and desktop had no horizontal overflow (`clientWidth=1280`, `scrollWidth=1280`).

Run: `npm run clean:artifacts`

Observed: removed temporary `output/`, `.playwright-cli/`, and `tsconfig.tsbuildinfo` artifacts created during browser verification.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10v`, noting that this closes only the finance AI error text color token sub-item while leaving formal result chart palettes and other internal control colors for later passes.

### Task 54: Tokenize Finance AI Detail Table Header Background

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to the formal finance AI assistant detail-table sticky header background. This pass covers only `.finance-ai-detail-table th`. It does not attempt to migrate formal result chart palettes or every remaining internal control color.

- [x] **Step 2: Add a failing token contract**

Added a `tests/design-token-contract.test.mjs` contract requiring `.finance-ai-detail-table th` to use `--finance-ai-detail-table-header-bg`. The contract rejects the old direct `#ebe3d5` literal inside the header background mix.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because `.finance-ai-detail-table th` still mixed `#ebe3d5` into its background.

- [x] **Step 4: Move detail table header background to site tokens**

Added `--finance-ai-detail-table-header-bg` to `:root`, deriving from `--finance-ai-chart-surface` and `--border`. Updated `.finance-ai-detail-table th` to read the token while preserving sticky positioning, z-index, foreground color, and font weight.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 24/24 tests.

- [x] **Step 6: Run full verification**

Run: `node --test tests/design-token-contract.test.mjs tests/finance-ai-assistant-contract.test.mjs`

Observed: PASS, 65/65 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning remains unrelated.

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 347/347 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Content generation reported unchanged.

- [x] **Step 7: Verify the loaded production CSS rule in a browser**

Started `npm run start -- --port 3064`.

Run: bundled Playwright CLI opened `http://127.0.0.1:3064/finance/finance-ai-assistant` and inspected loaded stylesheet rules.

Observed: loaded `.finance-ai-detail-table th` rule used `background: var(--finance-ai-detail-table-header-bg)`; the root token resolved from `--finance-ai-chart-surface` and `--border`. Console error count was 0 and desktop had no horizontal overflow (`clientWidth=1280`, `scrollWidth=1280`).

Run: `npm run clean:artifacts`

Observed: removed temporary `.playwright-cli/` and `tsconfig.tsbuildinfo` artifacts created during browser verification.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10w`, noting that this closes only the finance AI detail-table header background token sub-item while leaving formal result chart palettes and other internal control colors for later passes.

### Task 55: Keep Finance AI Loaded Actions Clear Of Fixed Back Button

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/finance-ai-assistant-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit follow-up**

Scoped a browser-smoke regression found during formal finance AI upload verification: after data is loaded, the ready-state header action buttons (`清空当前数据`, `重置对话和数据`) can sit too close to the fixed shared `ToolBackButton`, allowing the fixed back button to intercept clicks at some desktop positions. This is a concrete interaction bug, not a broad token-governance sub-item.

- [x] **Step 2: Add a failing contract**

Updated `tests/finance-ai-assistant-contract.test.mjs` to require a `--finance-ai-ready-header-action-clearance` token, require ready-state header padding to use it, and require a mobile override under `@media (max-width: 760px)`.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Observed: FAIL before implementation because `--finance-ai-ready-header-action-clearance` did not exist and the ready header still used `padding: 6px 0 4px`.

- [x] **Step 4: Reserve right-side clearance for loaded header actions**

Added `--finance-ai-ready-header-action-clearance: 156px` to `:root`, changed `.finance-ai-assistant-panel.is-ready .finance-ai-chat-header` to use that value as right padding, and added a mobile `.finance-ai-page` override of `116px`.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Observed: PASS, 41/41 tests.

- [x] **Step 6: Run full verification**

Run: `node --test tests/finance-ai-assistant-contract.test.mjs tests/design-token-contract.test.mjs`

Observed: PASS, 65/65 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning remains unrelated.

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 347/347 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Content generation reported unchanged.

- [x] **Step 7: Verify desktop and mobile browser behavior**

Started `npm run start -- --port 3065`.

Run: bundled Playwright CLI opened `http://127.0.0.1:3065/finance/finance-ai-assistant`, uploaded `output/playwright/finance-ai-small.csv`, measured fixed back button and ready header action button rectangles, clicked both desktop actions, resized to `390x844`, uploaded again, measured mobile rectangles, checked console errors, and clicked the mobile reset action.

Observed: desktop back button was `left=1058 right=1200`, ready actions ended at `994` and `1044`, `overlap=false`, and `elementFromPoint` hit `清空当前数据` / `重置对话和数据` respectively. Desktop `clientWidth=1280` and `scrollWidth=1280`. The desktop clear and reset actions both triggered their own UI state changes without navigating back. Mobile back button was `left=286 right=326`, actions ended at `218` and `262`, `overlap=false`, ready header padding was `116px`, `clientWidth=390`, `scrollWidth=390`, console error count was 0, and mobile reset stayed on `/finance/finance-ai-assistant/`.

Run: `npm run clean:artifacts`

Observed: removed temporary `output/`, `.playwright-cli/`, and `tsconfig.tsbuildinfo` artifacts created during browser verification.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-11`, noting that this closes the formal finance AI loaded-state action/back-button overlap only. Full local verification and browser smoke are recorded above; deploy checks follow after commit and push.

### Task 56: Tokenize Home Hero Intro Card Shadows

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to two visible homepage hero cards: `.home-hero-copy-card` and `.home-model-library-entry`. This pass covers only their direct `rgba(20, 20, 19, 0.055)` shadows, not the rest of the homepage decorative shadows or color literals.

- [x] **Step 2: Add a failing token contract**

Added a `tests/design-token-contract.test.mjs` contract requiring `.home-hero-copy-card` and `.home-model-library-entry` to read shared shadow tokens from `:root`, while rejecting the old direct `rgba(20, 20, 19, 0.055)` shadows inside those two rules.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because `.home-hero-copy-card` still used `0 14px 38px rgba(20, 20, 19, 0.055)` and `.home-model-library-entry` still used `0 12px 30px rgba(20, 20, 19, 0.055)`.

- [x] **Step 4: Move hero intro shadows to site-derived tokens**

Added `--home-hero-copy-card-shadow` and `--home-model-library-entry-shadow` to `:root`, deriving both from `--foreground`, then updated the two homepage hero rules to read those tokens.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 25/25 tests.

- [x] **Step 6: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 348/348 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Content generation reported unchanged.

- [x] **Step 7: Verify homepage browser behavior**

Started `npm run start -- --port 3066`.

Run: bundled Playwright CLI opened `http://127.0.0.1:3066/`, inspected `.home-hero-copy-card` and `.home-model-library-entry`, then resized to `390x844` and repeated the inspection.

Observed: desktop `clientWidth=1280`, `scrollWidth=1280`; both target cards were visible and their computed shadows resolved from `--home-hero-copy-card-shadow` / `--home-model-library-entry-shadow`. Mobile `clientWidth=390`, `scrollWidth=390`; both target cards remained visible with the same token-derived shadow values. Console error count was 0 on both desktop and mobile; two non-blocking browser warnings appeared during resize.

Run: `npm run clean:artifacts`

Observed: removed temporary `.playwright-cli/` and `tsconfig.tsbuildinfo` artifacts created during browser verification.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10x`, noting that this closes only the homepage hero intro card shadow token sub-item.

### Task 57: Tokenize Home Hero Model Stage Shadows

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to three adjacent homepage hero model-stage shadow rules: `.home-hero-stage-panel`, `.home-hero-stage-preview`, and `.home-hero-stage-skeleton-window`. This pass covers only those panel / preview / loading-window shadows, not every remaining homepage decorative shadow.

- [x] **Step 2: Add a failing token contract**

Added a `tests/design-token-contract.test.mjs` contract requiring the three stage-shadow rules to read shared shadow tokens from `:root`, while rejecting the old direct `rgba(20, 20, 19, ...)` shadows inside those rules.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because `.home-hero-stage-panel`, `.home-hero-stage-preview`, and `.home-hero-stage-skeleton-window` still used direct `rgba(20, 20, 19, ...)` shadows.

- [x] **Step 4: Move model-stage shadows to site-derived tokens**

Added `--home-hero-stage-panel-shadow`, `--home-hero-stage-preview-shadow`, and `--home-hero-stage-skeleton-window-shadow` to `:root`, deriving each from `--foreground`, then updated the three homepage hero stage rules to read those tokens.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 26/26 tests.

- [x] **Step 6: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 349/349 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Content generation reported unchanged.

- [x] **Step 7: Verify homepage browser behavior**

Started `npm run start -- --port 3067`.

Run: bundled Playwright CLI opened `http://127.0.0.1:3067/`, inspected `.home-hero-stage-panel`, `.home-hero-stage-preview`, and `.home-hero-stage-skeleton-window`, then resized to `390x844` and repeated the inspection.

Observed: desktop `clientWidth=1280`, `scrollWidth=1280`; the stage panel, preview, and skeleton window were visible and their computed shadows resolved from `--home-hero-stage-panel-shadow`, `--home-hero-stage-preview-shadow`, and `--home-hero-stage-skeleton-window-shadow`. Mobile `clientWidth=390`, `scrollWidth=390`; the same three elements remained visible with token-derived shadows. Console error count was 0 on both desktop and mobile; two non-blocking browser warnings appeared during resize.

Run: `npm run clean:artifacts`

Observed: removed temporary `.playwright-cli/` and `tsconfig.tsbuildinfo` artifacts created during browser verification.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10y`, noting that this closes only the homepage hero model-stage shadow token sub-item.

### Task 58: Tokenize Home Hero Model Stage Control Shadows

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to homepage hero model-stage control shadows: `.home-hero-stage-float`, `.home-hero-stage-tab`, and the tab hover / focus / active rule. This pass covers only the floating metric/note cards and tab shadow states, not every remaining homepage decorative shadow.

- [x] **Step 2: Add a failing token contract**

Added a `tests/design-token-contract.test.mjs` contract requiring the three model-stage control shadow rules to read shared shadow tokens from `:root`, while rejecting the old direct `rgba(20, 20, 19, ...)` shadows inside those rules.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because `.home-hero-stage-float`, `.home-hero-stage-tab`, and the tab hover / focus / active rule still used direct `rgba(20, 20, 19, ...)` shadows.

- [x] **Step 4: Move model-stage control shadows to site-derived tokens**

Added `--home-hero-stage-float-shadow`, `--home-hero-stage-tab-shadow`, and `--home-hero-stage-tab-active-shadow` to `:root`, deriving each from `--foreground`, then updated the three homepage hero stage control rules to read those tokens.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 27/27 tests.

- [x] **Step 6: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 350/350 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Content generation reported unchanged.

- [x] **Step 7: Verify homepage browser behavior**

Started `npm run start -- --port 3068`.

Run: bundled Playwright CLI opened `http://127.0.0.1:3068/`, inspected `.home-hero-stage-float`, all `.home-hero-stage-tab` buttons, and the active tab state, then resized to `390x844` and repeated the inspection.

Observed: desktop `clientWidth=1280`, `scrollWidth=1280`; the floating card was visible, active tab used the token-derived active shadow, and non-active tabs used the token-derived default shadow. Mobile `clientWidth=390`, `scrollWidth=390`; the floating card and all four tabs remained visible with token-derived shadows. Console error count was 0 on both desktop and mobile; two non-blocking browser warnings appeared during resize.

Run: `npm run clean:artifacts`

Observed: removed temporary `.playwright-cli/` and `tsconfig.tsbuildinfo` artifacts created during browser verification.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10z`, noting that this closes only the homepage hero model-stage control shadow token sub-item.

### Task 59: Tokenize Home Hero Floating Mini Widget Shadows

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to the current homepage hero floating mini widgets. This pass covers only the shared `.home-mini-widget` shadow used by the two mini widgets rendered by `CapabilityHero`; it does not attempt to migrate their internal colored dots/bars or every remaining homepage decorative color.

- [x] **Step 2: Add a failing token contract**

Added a `tests/design-token-contract.test.mjs` contract requiring `.home-mini-widget` to read `--home-mini-widget-shadow` from `:root`, while rejecting the old direct `0 16px 34px rgba(20, 20, 19, 0.07)` shadow.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because `.home-mini-widget` still used direct `rgba(20, 20, 19, 0.07)` in `box-shadow`.

- [x] **Step 4: Move mini widget shadow to a site-derived token**

Added `--home-mini-widget-shadow` to `:root`, deriving it from `--foreground`, then updated `.home-mini-widget` to read that token.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 28/28 tests.

- [x] **Step 6: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10aa`, noting that this closes only the homepage hero floating mini widget shadow token sub-item.

- [x] **Step 7: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 351/351 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Content generation reported unchanged.

- [x] **Step 8: Verify homepage browser behavior**

Started `npm run start -- --port 3069`.

Run: bundled Playwright CLI opened `http://127.0.0.1:3069/`, inspected `.home-mini-widget` computed styles on desktop, then resized to `390x844` and repeated the inspection.

Observed: desktop `clientWidth=1280`, `scrollWidth=1280`; the two mini widgets rendered by `CapabilityHero` were visible and their computed shadows resolved from `--home-mini-widget-shadow`. Mobile `clientWidth=390`, `scrollWidth=390`; the two mini widgets remained hidden under existing responsive rules, their shadow still resolved from the token, and console error count was 0. Two non-blocking browser warnings appeared during resize.

### Task 60: Tokenize Home Hero Floating Mini Widget Accents

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to the visible accent colors inside the homepage hero floating mini widgets. This pass covers `.home-mini-widget-chrome span` and `.home-mini-widget-bars span`, which are rendered by `CapabilityHero`; it does not migrate the currently unrendered `.home-mini-widget-dots` / `.home-mini-widget-status` backup styles.

- [x] **Step 2: Add a failing token contract**

Added a `tests/design-token-contract.test.mjs` contract requiring the mini widget chrome dots and bars to read `--home-mini-widget-accent-*` tokens from `:root`, while rejecting the old direct `#dc7f5f`, `#e8c66d`, `#7ebc9a`, `#d9785c`, `#6f9eb8`, and `#90a675` literals.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because the scoped mini widget chrome dot and bar rules still used the six direct hex colors.

- [x] **Step 4: Move mini widget accents to site-derived tokens**

Added `--home-mini-widget-accent-primary`, `--home-mini-widget-accent-secondary`, `--home-mini-widget-accent-tertiary`, and `--home-mini-widget-accent-warm` to `:root`, deriving each from the site accent tokens, then updated the mini widget chrome dots and bars to read those tokens.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 29/29 tests.

- [x] **Step 6: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10ab`, noting that this closes only the visible homepage hero floating mini widget accent-color sub-item.

- [x] **Step 7: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 352/352 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Content generation reported unchanged.

- [x] **Step 8: Verify homepage browser behavior**

Started `npm run start -- --port 3070`.

Run: bundled Playwright CLI opened `http://127.0.0.1:3070/`, inspected `.home-mini-widget-chrome span` and `.home-mini-widget-bars span` computed colors on desktop, then resized to `390x844` and repeated layout checks.

Observed: desktop `clientWidth=1280`, `scrollWidth=1280`; all three chrome dots and the visible bars resolved to browser-computed colors derived from `--home-mini-widget-accent-*`, with console error count 0. Mobile `clientWidth=390`, `scrollWidth=390`; the two mini widgets remained hidden under existing responsive rules and console error count was 0. Two non-blocking browser warnings appeared during resize.

### Task 61: Tokenize Home Thinking Visual Card Shadow

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to the visible `.home-thinking-visual-card` shadow in the homepage "工具与思考" section. This pass covers only that image card shadow; it does not migrate the image overlay colors, preview panel surfaces, count pill shadows, or track card hover shadows.

- [x] **Step 2: Add a failing token contract**

Added a `tests/design-token-contract.test.mjs` contract requiring `.home-thinking-visual-card` to read `--home-thinking-visual-card-shadow` from `:root`, while rejecting the old direct `0 22px 58px rgba(20, 20, 19, 0.08)` literal.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because `.home-thinking-visual-card` still used the old hardcoded `rgba(20, 20, 19, 0.08)` shadow.

- [x] **Step 4: Move the visual card shadow to a shared token**

Added `--home-thinking-visual-card-shadow` to `:root`, deriving it from `--foreground`, then updated `.home-thinking-visual-card` to use `box-shadow: var(--home-thinking-visual-card-shadow)`.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 30/30 tests.

- [x] **Step 6: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 353/353 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Content generation reported unchanged.

- [x] **Step 7: Verify homepage browser behavior**

Started `npm run start -- --port 3071`.

Run: bundled Playwright opened `http://127.0.0.1:3071/`, inspected `.home-thinking-visual-card` computed styles on desktop, then resized to `390x844` and repeated the layout check.

Observed: desktop `clientWidth=1280`, `scrollWidth=1280`; the visual card was visible at `413x486`, and its computed shadow resolved from `--home-thinking-visual-card-shadow`. Mobile `clientWidth=390`, `scrollWidth=390`; the visual card was visible at `358x363`, its computed shadow resolved from the same token, and console error count was 0.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10ac`, noting that this closes only the homepage thinking visual-card shadow token sub-item and leaves image overlay, preview panel, count pill, and track card shadows for separate passes.

### Task 62: Tokenize Home Thinking Count Pill Shadows

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `tests/home-experience-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to the two visible count pill shadows in the homepage "工具与思考" section: `.home-thinking-preview-panel .home-thinking-count-pill` on the image card and `.home-thinking-track-head .home-thinking-count-pill` on the category cards. This pass does not migrate preview panel backgrounds, image overlay colors, track card hover shadows, or other homepage decorative colors.

- [x] **Step 2: Add a failing token contract**

Added a `tests/design-token-contract.test.mjs` contract requiring the two count pill rules to read `--home-thinking-preview-count-pill-shadow` and `--home-thinking-track-count-pill-shadow` from `:root`, while rejecting the old direct `0 8px 18px rgba(20, 20, 19, 0.2)` and `0 6px 16px rgba(20, 20, 19, 0.055)` literals.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because the two count pill rules still used the old hardcoded `rgba(20, 20, 19, ...)` shadows.

- [x] **Step 4: Move count pill shadows to shared tokens**

Added `--home-thinking-preview-count-pill-shadow` and `--home-thinking-track-count-pill-shadow` to `:root`, deriving both from `--foreground`, then updated the two count pill rules to use those variables.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 31/31 tests.

- [x] **Step 6: Update adjacent visual contract**

The first full `npm run test:site` attempt failed because `tests/home-experience-contract.test.mjs` still asserted the old literal image-card count pill shadow as part of its legibility contract. Root cause was an outdated test expectation, not a CSS behavior regression. Updated that contract to keep checking count pill background/color and require the new shadow tokens.

Run: `node --test tests/home-experience-contract.test.mjs`

Observed: PASS, 29/29 tests.

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 31/31 tests.

- [x] **Step 7: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 354/354 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Content generation reported unchanged.

- [x] **Step 8: Verify homepage browser behavior**

Started `npm run start -- --port 3072`.

Run: bundled Playwright opened `http://127.0.0.1:3072/`, inspected `.home-thinking-preview-panel .home-thinking-count-pill` and `.home-thinking-track-head .home-thinking-count-pill` computed styles on desktop, then resized to `390x844` and repeated the layout check.

Observed: desktop `clientWidth=1280`, `scrollWidth=1280`; both count pills were visible at `62x24` and `58x24`, and their computed shadows resolved from `--home-thinking-preview-count-pill-shadow` and `--home-thinking-track-count-pill-shadow`. Mobile `clientWidth=390`, `scrollWidth=390`; both pills remained visible at the same stable dimensions, both shadows resolved from their tokens, and console error count was 0.

- [x] **Step 9: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10ad`, noting that this closes only the homepage thinking count pill shadow token sub-item and leaves preview panel backgrounds, image overlay colors, track card hover shadows, and other homepage decorative colors for separate passes.

### Task 63: Tokenize Home Thinking Track Card Active Shadow

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to the `.home-thinking-track-card:hover`, `.home-thinking-track-card:focus-visible`, and `.home-thinking-track-card.is-active` shadow in the homepage "工具与思考" category cards. This pass does not migrate the track card background, orbit glow, image overlay colors, or other homepage decorative colors.

- [x] **Step 2: Add a failing token contract**

Added a `tests/design-token-contract.test.mjs` contract requiring the active track card rule to read `--home-thinking-track-card-active-shadow` from `:root`, while rejecting the old direct `0 16px 42px rgba(20, 20, 19, 0.07)` literal.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because the active track card rule still used the hardcoded `rgba(20, 20, 19, 0.07)` shadow.

- [x] **Step 4: Move the active track card shadow to a shared token**

Added `--home-thinking-track-card-active-shadow` to `:root`, deriving it from `--foreground`, then updated the active track card rule to use `box-shadow: var(--home-thinking-track-card-active-shadow)`.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 32/32 tests.

- [x] **Step 6: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 355/355 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Content generation reported unchanged.

- [x] **Step 7: Verify homepage browser behavior**

Started `npm run start -- --port 3073`.

Run: bundled Playwright opened `http://127.0.0.1:3073/`, hovered the first `.home-thinking-track-card` on desktop, inspected the computed shadow, then resized to `390x844` and checked the mobile stacked card layout.

Observed: desktop `clientWidth=1280`, `scrollWidth=1280`; the first track card was visible at `735x154`, and its computed hover shadow resolved from `--home-thinking-track-card-active-shadow`. Mobile `clientWidth=390`, `scrollWidth=390`; 3 track cards were present, the first card was visible at `358x96`, and console error count was 0.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10ae`, noting that this closes only the homepage thinking track card active shadow token sub-item and leaves track card backgrounds, orbit glow, image overlays, and other homepage decorative colors for separate passes.

### Task 64: Tokenize Thinking Lab Panel And Card Shadows

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to the `/thinking-lab` list page shadows: `.thinking-content-panel` / `.thinking-tools-panel`, the base `.thinking-article-card`, article-card hover, and tool-card hover. This pass does not migrate Thinking Lab background fills, hover backgrounds, icon colors, or unrelated finance card hover shadows.

- [x] **Step 2: Add a failing token contract**

Added a `tests/design-token-contract.test.mjs` contract requiring the Thinking Lab panel, article-card, article hover, and tool hover shadows to read `--thinking-*` tokens from `:root`, while rejecting the old direct `rgba(33, 29, 22, ...)` shadow literals.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because the Thinking Lab panel rule still used `0 18px 42px rgba(33, 29, 22, 0.055)`, and the scoped source also contained the old article and tool card `rgba(...)` shadows.

- [x] **Step 4: Move Thinking Lab shadows to shared tokens**

Added `--thinking-panel-shadow`, `--thinking-article-card-shadow`, `--thinking-article-card-hover-shadow`, and `--thinking-tool-card-hover-shadow` to `:root`, deriving each from `--foreground`. Updated the four Thinking Lab CSS rules to use those variables while preserving layout, borders, hover lift, and transition behavior.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 33/33 tests.

- [x] **Step 6: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 357/357 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Content generation reported unchanged.

- [x] **Step 7: Verify Thinking Lab browser behavior**

Started `npm run start -- --port 3074`.

Run: bundled Playwright opened `http://127.0.0.1:3074/thinking-lab`, inspected the Thinking Lab panel/card token values on desktop, hovered the first article card and first tool card, then resized to `390x844` and repeated the layout check.

Observed: desktop `clientWidth=1280`, `scrollWidth=1280`; content and tools panels were visible; article-card hover and tool-card hover both matched `:hover` and resolved to token-derived shadows. Mobile `clientWidth=390`, `scrollWidth=390`; panels stacked into one column, the first article card was visible, and console error count was 0.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10af`, noting that this closes only the Thinking Lab panel/list-card shadow token sub-item and leaves local backgrounds and other color literals for separate passes.

### Task 65: Tokenize Study Cards Page Shell Shadows

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to the `/tools/study-cards` page shell shadows: `.study-cards-back-link` and the combined `.study-cards-input-panel` / `.study-cards-output-panel` rule. This pass does not migrate Study Cards practice-card shadows, empty-preview surfaces, button colors, or other internal card UI details.

- [x] **Step 2: Add a failing token contract**

Added a `tests/design-token-contract.test.mjs` contract requiring the Study Cards back link and input/output panels to read `--study-cards-*` tokens from `:root`, while rejecting the old direct `rgba(20, 20, 19, ...)` shadow literals.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because `.study-cards-back-link` still used `0 12px 30px rgba(20, 20, 19, 0.1)`, and the input/output panel rule still used `0 18px 48px rgba(20, 20, 19, 0.08)`.

- [x] **Step 4: Move Study Cards shell shadows to shared tokens**

Added `--study-cards-back-link-shadow` and `--study-cards-panel-shadow` to `:root`, deriving both from `--foreground`. Updated the back link and input/output panel rules to use those variables while preserving layout, fixed positioning, blur, panel sizing, and transitions.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 34/34 tests.

- [x] **Step 6: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 358/358 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Content generation reported unchanged.

- [x] **Step 7: Verify Study Cards browser behavior**

Started `npm run start -- --port 3075`.

Run: bundled Playwright opened `http://127.0.0.1:3075/tools/study-cards`, inspected `--study-cards-back-link-shadow` and `--study-cards-panel-shadow` on desktop, then resized to `390x844` and repeated the layout check.

Observed: desktop `clientWidth=1280`, `scrollWidth=1280`; the back link, input panel, and output panel were visible and their computed shadows resolved from the new tokens. Mobile `clientWidth=390`, `scrollWidth=390`; input and output panels stacked into one column, and console error count was 0.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10ag`, noting that this closes only the Study Cards page shell/input-output-panel shadow token sub-item and leaves practice-card, empty-preview, and button color details for separate passes.

### Task 66: Tokenize Study Cards Empty Preview Shadows

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to the `/tools/study-cards` initial empty preview shadows: `.study-cards-empty-preview::before` / `::after` and `.study-cards-empty-card`. This pass does not migrate Study Cards practice-card shadows, answer-panel shadows, export-area shadows, or button colors.

- [x] **Step 2: Add a failing token contract**

Added a `tests/design-token-contract.test.mjs` contract requiring the Study Cards empty preview layer and empty card to read `--study-cards-empty-*` tokens from `:root`, while rejecting the old direct `rgba(20, 20, 19, ...)` and white inset shadow literals.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because the empty preview layer still used `0 14px 34px rgba(20, 20, 19, 0.08)`, and the empty card still used `0 24px 58px rgba(20, 20, 19, 0.13)` plus `inset 0 1px 0 rgba(255, 255, 255, 0.82)`.

- [x] **Step 4: Move Study Cards empty preview shadows to shared tokens**

Added `--study-cards-empty-preview-shadow` and `--study-cards-empty-card-shadow` to `:root`, deriving the outer shadows from `--foreground` and the inset highlight from `--card`. Updated the empty preview layer and empty card rules to use those variables while preserving layout, decorative layering, background gradients, and padding.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 35/35 tests.

- [x] **Step 6: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 359/359 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Content generation reported unchanged.

- [x] **Step 7: Verify Study Cards empty preview browser behavior**

Started `npm run start -- --port 3076`.

Run: bundled Playwright opened `http://127.0.0.1:3076/tools/study-cards`, inspected `--study-cards-empty-preview-shadow` and `--study-cards-empty-card-shadow` plus the computed pseudo-element/card shadows on desktop, then resized to `390x844` and repeated the layout check.

Observed: desktop `clientWidth=1280`, `scrollWidth=1280`; the empty preview and empty card were both visible at `240x320`, and their computed shadows resolved from the new tokens. Mobile `clientWidth=390`, `scrollWidth=390`; the empty preview and empty card were both visible at `220x293`, and console error count was 0.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10ah`, noting that this closes only the Study Cards initial empty-preview shadow token sub-item and leaves practice-card, answer-panel, export-area shadows, and button colors for separate passes.

### Task 67: Tokenize Study Cards Practice Deck Shadows

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/design-token-contract.test.mjs`
- Modify: `docs/project-audit-report.md`
- Modify: `docs/superpowers/plans/2026-06-21-audit-remediation.md`

- [x] **Step 1: Scope the audit item**

Scoped the P1 UI token governance item to the `/tools/study-cards` practice deck shadows after loading cards: `.study-cards-deck::before` / `::after`, `.study-cards-card-stage.is-drag-next` / `.is-drag-prev`, and `.study-cards-practice-card`. This pass does not migrate answer-panel, bingo/completion, export-area shadows, or button colors.

- [x] **Step 2: Add a failing token contract**

Added a `tests/design-token-contract.test.mjs` contract requiring the Study Cards card stack, drag filters, and main practice card shadow to read `--study-cards-*` tokens from `:root`, while rejecting the old direct `rgba(20, 20, 19, ...)` and white inset shadow literals.

- [x] **Step 3: Verify the old code fails**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: FAIL before implementation because the deck layer still used `0 18px 44px rgba(20, 20, 19, 0.08)`, drag next/prev still used direct `drop-shadow(... rgba(20, 20, 19, 0.12))`, and the practice card still used `0 34px 86px rgba(20, 20, 19, 0.18)`, `0 8px 22px rgba(20, 20, 19, 0.1)`, plus `inset 0 1px 0 rgba(255, 255, 255, 0.92)`.

- [x] **Step 4: Move Study Cards practice deck shadows to shared tokens**

Added `--study-cards-deck-layer-shadow`, `--study-cards-drag-next-shadow`, `--study-cards-drag-prev-shadow`, and `--study-cards-practice-card-shadow` to `:root`, deriving shadows from `--foreground` and inset highlights from `--card`. Updated the deck layer, drag state, and practice card rules to use those variables while preserving layout, animation, transforms, and visual hierarchy.

- [x] **Step 5: Run targeted verification**

Run: `node --test tests/design-token-contract.test.mjs`

Observed: PASS, 36/36 tests.

- [x] **Step 6: Run full verification**

Run: `npx tsc --noEmit`

Observed: PASS.

Run: `git diff --check`

Observed: PASS.

Run: `npm run lint`

Observed: PASS.

Run: `npm run test:site`

Observed: PASS, 360/360 tests. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

Run: `npm run build:vercel`

Observed: PASS, Next production build compiled and generated 36 static pages. Content generation reported unchanged.

- [x] **Step 7: Verify Study Cards practice deck browser behavior**

Started `npm run start -- --port 3077`.

Run: bundled Playwright opened `http://127.0.0.1:3077/tools/study-cards`, clicked `示例内容`, inspected the deck layer token, practice-card token, computed pseudo-element/card shadows, then resized to `390x844` and repeated the layout check. A second browser check forced `is-drag-next` / `is-drag-prev` on the card stage and waited for the filter transition to settle.

Observed: desktop `clientWidth=1280`, `scrollWidth=1280`; the practice card was visible at `371x494`, deck pseudo-elements and the main card resolved to token-derived `color(srgb ...)` shadows, and forced drag state settled to `drop-shadow(color(srgb ... / 0.12) 16px 20px 24px)`. Mobile `clientWidth=390`, `scrollWidth=390`; the practice card was visible at `354x598`, the deck was visible, and console error count was 0.

- [x] **Step 8: Record completion**

Updated `docs/project-audit-report.md` as `UI P1-10ai`, noting that this closes only the Study Cards practice deck, drag-state, and main practice-card shadow token sub-item while leaving answer-panel, completion, export-area shadows, and button colors for separate passes.
