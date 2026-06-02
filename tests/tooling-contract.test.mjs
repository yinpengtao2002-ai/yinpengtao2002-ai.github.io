import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const eslintConfig = await readFile(new URL("../eslint.config.mjs", import.meta.url), "utf8");
const nextConfig = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");
const packageJson = await readFile(new URL("../package.json", import.meta.url), "utf8");
const vendorScript = await readFile(new URL("../scripts/prepare-vendor-assets.mjs", import.meta.url), "utf8");
const perspectiveShim = await readFile(
  new URL("../src/app/finance/perspective-bi/perspective-extensions-shim.js", import.meta.url),
  "utf8"
).catch(() => "");
const notionSyncScript = await readFile(new URL("../scripts/sync-notion-content.mjs", import.meta.url), "utf8").catch(() => "");

async function readRequiredProjectFile(path) {
  try {
    return await readFile(new URL(path, import.meta.url), "utf8");
  } catch {
    assert.fail(`${path} should exist`);
  }
}

async function assertIconAsset(path) {
  let fileInfo;

  try {
    fileInfo = await stat(new URL(path, import.meta.url));
  } catch {
    assert.fail(`${path} should exist`);
  }

  assert.ok(fileInfo.size > 1024, `${path} should be a real icon asset`);
}

test("eslint ignores project-local worktrees", () => {
  assert.ok(eslintConfig.includes('".worktrees/**"'));
});

test("eslint ignores local Vercel build output", () => {
  assert.ok(eslintConfig.includes('".vercel/**"'));
});

test("project exposes a manual Notion content sync command", () => {
  assert.match(packageJson, /"sync:notion":\s*"node scripts\/sync-notion-content\.mjs"/);
  assert.match(notionSyncScript, /NOTION_TOKEN/);
  assert.match(notionSyncScript, /NOTION_AI_DATABASE_ID/);
  assert.match(notionSyncScript, /NOTION_FINANCE_DATABASE_ID/);
  assert.match(notionSyncScript, /npm run gen/);
  assert.match(notionSyncScript, /--deploy/);
  assert.match(notionSyncScript, /git commit --allow-empty/);
  assert.match(notionSyncScript, /src\/lib\/data\/generated\/content\.ts/);
  assert.doesNotMatch(notionSyncScript, /NOTION_TOKEN=/);
});

test("site publishes explicit icons for mobile home-screen bookmarks", async () => {
  const layout = await readRequiredProjectFile("../src/app/layout.tsx");
  const manifest = await readRequiredProjectFile("../src/app/manifest.ts");

  assert.match(layout, /manifest:\s*"\/manifest\.webmanifest"/);
  assert.match(layout, /apple-icon\.png/);
  assert.match(layout, /site-icon-192\.png/);
  assert.match(layout, /site-icon-512\.png/);
  assert.match(manifest, /site-icon-192\.png/);
  assert.match(manifest, /site-icon-512\.png/);
  assert.match(manifest, /purpose:\s*"any"/);
  assert.match(manifest, /purpose:\s*"maskable"/);

  await assertIconAsset("../src/app/apple-icon.png");
  await assertIconAsset("../public/site-icon-192.png");
  await assertIconAsset("../public/site-icon-512.png");
});

test("Perspective BI dependencies and local browser assets are wired", () => {
  assert.match(packageJson, /"@perspective-dev\/client":/);
  assert.match(packageJson, /"@perspective-dev\/server":/);
  assert.match(packageJson, /"@perspective-dev\/viewer":/);
  assert.match(packageJson, /"@perspective-dev\/viewer-datagrid":/);
  assert.match(packageJson, /"@perspective-dev\/viewer-d3fc":/);
  assert.match(vendorScript, /@perspective-dev\/server\/dist\/wasm\/perspective-server\.wasm/);
  assert.match(vendorScript, /@perspective-dev\/viewer\/dist\/wasm\/perspective-viewer\.wasm/);
  assert.match(vendorScript, /@perspective-dev\/viewer\/dist\/css\/pro\.css/);
  assert.match(vendorScript, /@perspective-dev\/viewer\/dist\/css\/intl\/zh\.css/);
  assert.match(nextConfig, /@perspective-dev\/viewer\/src\/ts\/extensions\.js/);
  assert.match(nextConfig, /perspective-extensions-shim\.js/);
  assert.match(perspectiveShim, /class PerspectiveSelectDetail/);
  assert.match(perspectiveShim, /removeFilters/);
});
