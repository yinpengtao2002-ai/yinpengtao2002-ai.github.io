import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  enforceRateLimit,
  getRateLimitBackendStatus,
  resetRateLimitForTests,
} from "../src/lib/security/rate-limit.ts";

async function readProjectFile(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("global security headers are configured in Next", async () => {
  const nextConfig = await readProjectFile("next.config.ts");

  assert.match(nextConfig, /async headers\(\)/);
  assert.match(nextConfig, /Content-Security-Policy/);
  assert.match(nextConfig, /default-src 'self'/);
  assert.match(nextConfig, /frame-ancestors 'none'/);
  assert.match(nextConfig, /X-Frame-Options/);
  assert.match(nextConfig, /DENY/);
  assert.match(nextConfig, /X-Content-Type-Options/);
  assert.match(nextConfig, /nosniff/);
  assert.match(nextConfig, /Referrer-Policy/);
  assert.match(nextConfig, /Permissions-Policy/);
});

test("goalkeeper route allows WebAssembly without weakening the global script policy", async () => {
  const { default: nextConfig } = await import("../next.config.ts");
  const headerRules = await nextConfig.headers();
  const globalRuleIndex = headerRules.findIndex((rule) => rule.source === "/:path*");
  const goalkeeperRuleIndex = headerRules.findIndex(
    (rule) => rule.source === "/tools/goalkeeper-landscape/:path*",
  );
  const globalRule = headerRules[globalRuleIndex];
  const goalkeeperRule = headerRules[goalkeeperRuleIndex];

  assert.ok(globalRule, "global security header rule should exist");
  assert.ok(goalkeeperRule, "goalkeeper should have a route-specific security header rule");
  assert.ok(
    goalkeeperRuleIndex > globalRuleIndex,
    "goalkeeper security headers should override the matching global rule",
  );

  const globalCsp = globalRule.headers.find((header) => header.key === "Content-Security-Policy")?.value;
  const goalkeeperCsp = goalkeeperRule.headers.find(
    (header) => header.key === "Content-Security-Policy",
  )?.value;

  assert.ok(globalCsp, "global CSP should be configured");
  assert.ok(goalkeeperCsp, "goalkeeper CSP should be configured");
  assert.doesNotMatch(globalCsp, /'wasm-unsafe-eval'|'unsafe-eval'/);
  assert.match(goalkeeperCsp, /script-src [^;]*'wasm-unsafe-eval'/);
  assert.doesNotMatch(goalkeeperCsp, /script-src [^;]*\s'unsafe-eval'(?:\s|;)/);
  assert.match(goalkeeperCsp, /script-src-attr 'none'/);
  assert.equal(
    goalkeeperRule.headers.find((header) => header.key === "X-Frame-Options")?.value,
    "DENY",
  );
});

test("local development CSP does not upgrade same-origin API fetches to HTTPS", async () => {
  const nextConfig = await readProjectFile("next.config.ts");

  assert.match(nextConfig, /shouldUpgradeInsecureRequests/);
  assert.match(nextConfig, /process\.env\.NODE_ENV\s*===\s*"production"/);
  assert.match(nextConfig, /upgradeInsecureRequestsDirective/);
});

test("same-origin static finance tools remain embeddable by their finance pages", async () => {
  const nextConfig = await readProjectFile("next.config.ts");

  assert.match(nextConfig, /sameOriginFrameContentSecurityPolicy/);
  assert.match(nextConfig, /frame-ancestors 'self'/);
  assert.match(nextConfig, /source:\s*"\/tools\/margin-analysis\/:path\*"/);
  assert.match(nextConfig, /value:\s*"SAMEORIGIN"/);
});

test("subtitle workbench no longer needs an external iframe exception", async () => {
  const nextConfig = await readProjectFile("next.config.ts");

  assert.doesNotMatch(nextConfig, /subtitleWorkbenchContentSecurityPolicy/);
  assert.doesNotMatch(nextConfig, /frame-src 'self' https:\/\/yptt-subtitle-workbench\.hf\.space/);
  assert.doesNotMatch(nextConfig, /source:\s*"\/:path\(\(\?!tools\/subtitle-workbench/);
  assert.doesNotMatch(nextConfig, /source:\s*"\/tools\/subtitle-workbench\/:path\*"/);
});

test("AI-facing API routes apply abuse-control rate limits before provider calls", async () => {
  const routeFiles = [
    "src/app/api/chat/route.ts",
    "src/app/api/tools/finance-ai-assistant/route.ts",
    "src/app/api/private-tool-access/route.ts",
    "src/app/api/tools/study-cards/route.ts",
    "src/app/api/tools/study-cards/pronunciation/route.ts",
  ];

  for (const path of routeFiles) {
    const source = await readProjectFile(path);
    assert.match(source, /enforceRateLimit/, `${path} should call enforceRateLimit`);
    assert.match(source, /await enforceRateLimit/, `${path} should await persistent rate limiting`);
    assert.match(source, /rateLimitError/, `${path} should return a rate-limit response`);
  }
});

test("legacy finance AI access endpoint is removed", async () => {
  await assert.rejects(
    () => readProjectFile("src/app/api/tools/finance-ai-assistant/access/route.ts"),
    /ENOENT/,
  );
});

test("private tool access client endpoints include trailing slashes", async () => {
  const constants = await readProjectFile("src/lib/private-tool-access/constants.ts");
  const nextConfig = await readProjectFile("next.config.ts");

  assert.match(nextConfig, /trailingSlash:\s*true/);
  assert.match(constants, /PRIVATE_TOOL_ACCESS_ENDPOINT\s*=\s*"\/api\/private-tool-access\/"/);
  assert.doesNotMatch(constants, /LEGACY_FINANCE_AI_ACCESS/);
});

test("rate limiter buckets requests by route and forwarded client IP", async () => {
  resetRateLimitForTests();
  const request = new Request("https://yinpengtao.cn/api/test", {
    method: "POST",
    headers: {
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
    },
  });

  assert.equal(await enforceRateLimit(request, { keyPrefix: "contract", limit: 2, windowMs: 60_000 }), null);
  assert.equal(await enforceRateLimit(request, { keyPrefix: "contract", limit: 2, windowMs: 60_000 }), null);

  const rejected = await enforceRateLimit(request, { keyPrefix: "contract", limit: 2, windowMs: 60_000 });
  assert.ok(rejected);
  assert.equal(rejected.status, 429);
  assert.equal(rejected.headers.get("Retry-After"), "60");
  assert.equal(rejected.headers.get("X-RateLimit-Limit"), "2");
  assert.equal(rejected.headers.get("X-RateLimit-Remaining"), "0");

  const payload = await rejected.json();
  assert.equal(payload.errorCode, "rate_limited");
  assert.equal(typeof payload.requestId, "string");
  assert.equal(payload.retryAfter, 60);
});

test("production rate limiting requires Upstash while local tests use memory", () => {
  assert.deepEqual(getRateLimitBackendStatus({ NODE_ENV: "production" }), {
    mode: "unavailable",
    reason: "missing_upstash_configuration",
  });
  assert.deepEqual(getRateLimitBackendStatus({
    NODE_ENV: "production",
    UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "token",
  }), { mode: "upstash" });
  assert.deepEqual(getRateLimitBackendStatus({ NODE_ENV: "test" }), { mode: "memory" });
});

test("rate limiter uses one Redis script for atomic increment and TTL", async () => {
  const source = await readProjectFile("src/lib/security/rate-limit.ts");
  assert.match(source, /UPSTASH_REDIS_REST_URL/);
  assert.match(source, /UPSTASH_REDIS_REST_TOKEN/);
  assert.match(source, /redis\.call\('INCR'/);
  assert.match(source, /redis\.call\('PEXPIRE'/);
  assert.match(source, /redis\.call\('PTTL'/);
  assert.match(source, /missing_upstash_configuration/);
});
