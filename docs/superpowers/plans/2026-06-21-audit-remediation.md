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
