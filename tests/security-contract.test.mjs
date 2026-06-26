import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { enforceRateLimit, resetRateLimitForTests } from "../src/lib/security/rate-limit.ts";

async function readProjectFile(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

function extractSourceRule(source, routeSource) {
  const start = source.indexOf(`source: "${routeSource}"`);
  assert.notEqual(start, -1, `Expected to find header rule for ${routeSource}`);
  const nextRuleStart = source.indexOf("\n      {\n        source:", start + 1);
  return source.slice(start, nextRuleStart === -1 ? source.indexOf("\n    ];", start) : nextRuleStart);
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

test("same-origin static finance tools remain embeddable by their finance pages", async () => {
  const nextConfig = await readProjectFile("next.config.ts");

  assert.match(nextConfig, /sameOriginFrameContentSecurityPolicy/);
  assert.match(nextConfig, /frame-ancestors 'self'/);
  assert.match(nextConfig, /source:\s*"\/tools\/margin-analysis\/:path\*"/);
  assert.match(nextConfig, /value:\s*"SAMEORIGIN"/);
});

test("subtitle workbench page allows its external hosted iframe", async () => {
  const nextConfig = await readProjectFile("next.config.ts");
  const subtitleRule = extractSourceRule(nextConfig, "/tools/subtitle-workbench/:path*");

  assert.match(nextConfig, /subtitleWorkbenchContentSecurityPolicy/);
  assert.match(nextConfig, /frame-src 'self' https:\/\/yptt-subtitle-workbench\.hf\.space/);
  assert.match(nextConfig, /source:\s*"\/:path\(\(\?!tools\/subtitle-workbench/);
  assert.match(nextConfig, /source:\s*"\/tools\/subtitle-workbench\/:path\*"/);
  assert.doesNotMatch(subtitleRule, /X-Frame-Options/);
  assert.doesNotMatch(subtitleRule, /DENY/);
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
    assert.match(source, /rateLimitError/, `${path} should return a rate-limit response`);
  }
});

test("legacy finance AI access endpoint delegates to private tool access", async () => {
  const legacyRoute = await readProjectFile("src/app/api/tools/finance-ai-assistant/access/route.ts");

  assert.match(legacyRoute, /private-tool-access\/route/);
  assert.match(legacyRoute, /export\s+\{\s*POST\s*\}/);
});

test("rate limiter buckets requests by route and forwarded client IP", async () => {
  resetRateLimitForTests();
  const request = new Request("https://yinpengtao.cn/api/test", {
    method: "POST",
    headers: {
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
    },
  });

  assert.equal(enforceRateLimit(request, { keyPrefix: "contract", limit: 2, windowMs: 60_000 }), null);
  assert.equal(enforceRateLimit(request, { keyPrefix: "contract", limit: 2, windowMs: 60_000 }), null);

  const rejected = enforceRateLimit(request, { keyPrefix: "contract", limit: 2, windowMs: 60_000 });
  assert.ok(rejected);
  assert.equal(rejected.status, 429);
  assert.equal(rejected.headers.get("Retry-After"), "60");
  assert.equal(rejected.headers.get("X-RateLimit-Limit"), "2");
  assert.equal(rejected.headers.get("X-RateLimit-Remaining"), "0");

  const payload = await rejected.json();
  assert.equal(payload.errorCode, "rate_limited");
});
