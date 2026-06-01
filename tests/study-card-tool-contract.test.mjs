import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readProjectFile(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("AI study card tool is exposed as an independent tool route", async () => {
  const page = await readProjectFile("src/app/tools/study-cards/page.tsx");
  const client = await readProjectFile("src/app/tools/study-cards/StudyCardsTool.tsx");
  const content = await readProjectFile("src/lib/data/thinkingLabContent.ts");
  const sitemap = await readProjectFile("src/app/sitemap.ts");
  const navigation = await readProjectFile("src/components/layout/SiteNavigation.tsx");
  const clientShell = await readProjectFile("src/components/ClientShell.tsx");

  assert.match(page, /AI 学习卡片生成器/);
  assert.match(page, /StudyCardsTool/);
  assert.match(client, /\/api\/tools\/study-cards/);
  assert.match(client, /Anki 风格问答卡/);
  assert.match(client, /概念解释/);
  assert.match(client, /测试题/);
  assert.match(content, /slug:\s*"study-cards"/);
  assert.match(content, /href:\s*"\/tools\/study-cards"/);
  assert.match(sitemap, /\$\{BASE_URL\}\/tools\/study-cards/);
  assert.match(navigation, /\/tools\/study-cards/);
  assert.match(clientShell, /\/tools\/study-cards/);
});

test("AI study card endpoint asks for structured learning output", async () => {
  const route = await readProjectFile("src/app/api/tools/study-cards/route.ts");

  assert.match(route, /cards/);
  assert.match(route, /concept/);
  assert.match(route, /quiz/);
  assert.match(route, /JSON/);
  assert.match(route, /CHAT_API_KEY/);
  assert.match(route, /DEEPSEEK_API_KEY/);
  assert.match(route, /export async function POST/);
});
