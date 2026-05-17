import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const eslintConfig = await readFile(new URL("../eslint.config.mjs", import.meta.url), "utf8");
const packageJson = await readFile(new URL("../package.json", import.meta.url), "utf8");
const notionSyncScript = await readFile(new URL("../scripts/sync-notion-content.mjs", import.meta.url), "utf8").catch(() => "");

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
