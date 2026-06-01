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
  assert.match(client, /问答卡片/);
  assert.match(client, /概念解释/);
  assert.match(client, /测试题/);
  assert.match(client, /study-cards-progress/);
  assert.match(client, /progressValue/);
  assert.match(client, /基础：/);
  assert.match(client, /进阶：/);
  assert.match(client, /高级：/);
  assert.doesNotMatch(client, /考试：/);
  assert.match(content, /slug:\s*"study-cards"/);
  assert.match(content, /href:\s*"\/tools\/study-cards"/);
  assert.match(sitemap, /\$\{BASE_URL\}\/tools\/study-cards/);
  assert.match(navigation, /\/tools\/study-cards/);
  assert.match(clientShell, /\/tools\/study-cards/);
});

test("AI study card results use an interactive one-card practice flow", async () => {
  const client = await readProjectFile("src/app/tools/study-cards/StudyCardsTool.tsx");
  const styles = await readProjectFile("src/app/globals.css");

  assert.match(client, /activeCardIndex/);
  assert.match(client, /answerRevealed/);
  assert.match(client, /显示答案/);
  assert.match(client, /下一张/);
  assert.match(client, /上一张/);
  assert.match(client, /重新开始/);
  assert.match(client, /study-cards-practice-card/);
  assert.match(styles, /\.study-cards-practice-card/);
  assert.match(styles, /\.study-cards-card-progress/);

  assert.doesNotMatch(client, /复制 Anki TSV/);
  assert.doesNotMatch(client, /cardToTsv/);
  assert.doesNotMatch(client, /ankiTsv/);
  assert.doesNotMatch(client, /Clipboard/);
  assert.doesNotMatch(client, /CheckCircle2/);
  assert.doesNotMatch(client, /is-answer/);
  assert.doesNotMatch(client, /study-cards-card-grid/);
  assert.doesNotMatch(client, /study-cards-flash-card/);
});

test("AI study card endpoint asks for structured learning output", async () => {
  const route = await readProjectFile("src/app/api/tools/study-cards/route.ts");

  assert.match(route, /cards/);
  assert.match(route, /concept/);
  assert.match(route, /quiz/);
  assert.match(route, /JSON/);
  assert.match(route, /CHAT_API_KEY/);
  assert.match(route, /DEEPSEEK_API_KEY/);
  assert.match(route, /response_format/);
  assert.match(route, /60000/);
  assert.match(route, /errorCode/);
  assert.match(route, /API_NOT_CONFIGURED/);
  assert.match(route, /每张卡只考一个知识点/);
  assert.match(route, /back 不超过 45 个中文字符/);
  assert.match(route, /export async function POST/);
});
