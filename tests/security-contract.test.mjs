import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { enforceRateLimit, resetRateLimitForTests } from "../src/lib/security/rate-limit.ts";

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
    assert.match(source, /rateLimitError/, `${path} should return a rate-limit response`);
  }
});

test("legacy finance AI access endpoint delegates to private tool access", async () => {
  const legacyRoute = await readProjectFile("src/app/api/tools/finance-ai-assistant/access/route.ts");

  assert.match(legacyRoute, /private-tool-access\/route/);
  assert.match(legacyRoute, /export\s+\{\s*POST\s*\}/);
});

test("private tool access client endpoints include trailing slashes", async () => {
  const constants = await readProjectFile("src/lib/private-tool-access/constants.ts");
  const nextConfig = await readProjectFile("next.config.ts");

  assert.match(nextConfig, /trailingSlash:\s*true/);
  assert.match(constants, /PRIVATE_TOOL_ACCESS_ENDPOINT\s*=\s*"\/api\/private-tool-access\/"/);
  assert.match(constants, /LEGACY_FINANCE_AI_ACCESS_ENDPOINT\s*=\s*"\/api\/tools\/finance-ai-assistant\/access\/"/);
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
