import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);

test("root scripts expose one complete verification ladder", async () => {
  const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const scripts = packageJson.scripts;

  assert.equal(scripts.typecheck, "tsc --noEmit --pretty false");
  assert.equal(scripts.test, "node --test tests/*.test.mjs");
  assert.equal(scripts["test:goalkeeper"], "npm --prefix tool-sources/goalkeeper-landscape test");
  assert.equal(scripts["build:goalkeeper"], "npm --prefix tool-sources/goalkeeper-landscape run build");
  assert.match(scripts["test:all"], /npm run test.*npm run test:goalkeeper/);
  for (const command of [
    "npm run lint",
    "npm run typecheck",
    "npm run test:all",
    "npm run audit:prod",
    "npm run build:goalkeeper",
    "npm run build:vercel",
    "npm run test:e2e",
    "git diff --exit-code",
  ]) {
    assert.match(scripts.check, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("GitHub Actions runs the same check on pull requests and main", async () => {
  const workflow = await readFile(path.join(root, ".github/workflows/ci.yml"), "utf8");
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /push:[\s\S]*branches:\s*\[main\]/);
  assert.match(workflow, /permissions:[\s\S]*contents:\s*read/);
  assert.match(workflow, /node-version:\s*24/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm --prefix tool-sources\/goalkeeper-landscape ci/);
  assert.match(workflow, /playwright install --with-deps chromium/);
  assert.match(workflow, /npm run check/);
});

test("Playwright suite covers security, lifecycle and mobile regressions", async () => {
  const config = await readFile(path.join(root, "playwright.config.ts"), "utf8");
  const security = await readFile(path.join(root, "e2e/security.spec.ts"), "utf8");
  const lifecycle = await readFile(path.join(root, "e2e/finance-lifecycle.spec.ts"), "utf8");
  const mobile = await readFile(path.join(root, "e2e/mobile.spec.ts"), "utf8");

  assert.match(config, /npm run start -- -p 3100/);
  assert.match(config, /baseURL:\s*"http:\/\/127\.0\.0\.1:3100"/);
  assert.match(security, /script-src-attr 'none'/);
  assert.match(security, /allow-same-origin/);
  assert.match(lifecycle, /ResizeObserver/);
  assert.match(lifecycle, /js-plotly-plot/);
  assert.match(mobile, /390/);
  assert.match(mobile, /scrollWidth/);
  assert.match(mobile, /Escape/);
});
