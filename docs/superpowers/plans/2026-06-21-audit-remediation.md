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
