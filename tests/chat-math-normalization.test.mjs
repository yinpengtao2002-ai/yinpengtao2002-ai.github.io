import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const { normalizeChatMathMarkdown } = await import(
  "../src/lib/markdown/normalizeChatMathMarkdown.ts"
);
const { normalizeChatInternalLinks } = await import(
  "../src/lib/markdown/normalizeChatInternalLinks.ts"
);

const chatWidget = await readFile(
  new URL("../src/components/ChatWidget.tsx", import.meta.url),
  "utf8"
);
const chatRoute = await readFile(
  new URL("../src/app/api/chat/route.ts", import.meta.url),
  "utf8"
);
const chatFallback = await readFile(
  new URL("../src/lib/chatFallback.ts", import.meta.url),
  "utf8"
);
const clientShell = await readFile(
  new URL("../src/components/ClientShell.tsx", import.meta.url),
  "utf8"
);
const envExample = await readFile(new URL("../.env.example", import.meta.url), "utf8");

test("converts common AI inline LaTeX delimiters to markdown math", () => {
  const input = "利润公式是 \\(Profit = Revenue - Cost\\)。";

  assert.equal(
    normalizeChatMathMarkdown(input),
    "利润公式是 $Profit = Revenue - Cost$。"
  );
});

test("converts common AI block LaTeX delimiters to display math", () => {
  const input = "可以写成：\n\\[\nROE = \\frac{Net\\ Income}{Equity}\n\\]";

  assert.equal(
    normalizeChatMathMarkdown(input),
    "可以写成：\n$$\nROE = \\frac{Net\\ Income}{Equity}\n$$"
  );
});

test("does not rewrite code spans or fenced code blocks", () => {
  const input = [
    "正文 \\(a+b\\)",
    "`\\(keep_inline_code\\)`",
    "```",
    "\\[keep_block_code\\]",
    "```",
  ].join("\n");

  assert.equal(
    normalizeChatMathMarkdown(input),
    [
      "正文 $a+b$",
      "`\\(keep_inline_code\\)`",
      "```",
      "\\[keep_block_code\\]",
      "```",
    ].join("\n")
  );
});

test("chat widget normalizes math before markdown rendering", () => {
  assert.match(chatWidget, /normalizeChatMathMarkdown/);
  assert.match(chatWidget, /normalizeChatInternalLinks/);
  assert.match(chatWidget, /normalizeChatInternalLinks\(normalizeChatMathMarkdown\(text\)\)/);
  assert.match(chatWidget, /className="chat-markdown"/);
});

test("chat widget turns internal markdown links into compact route cards", () => {
  assert.match(chatWidget, /INTERNAL_ROUTE_CARDS/);
  assert.match(chatWidget, /getInternalRouteCards/);
  assert.match(chatWidget, /InternalRouteCardList/);
  assert.match(chatWidget, /chat-route-card-list/);
  assert.match(chatWidget, /routeCards\.length > 0/);
  assert.match(chatWidget, /!message\.contentCards/);
  assert.match(chatWidget, /router\.push\(card\.href\)/);
  assert.match(chatWidget, /\/finance\/business-analysis/);
  assert.match(chatWidget, /\/thinking-lab/);
});

test("chat widget sends current finance model context to the API", () => {
  assert.match(chatWidget, /usePathname/);
  assert.match(chatWidget, /getCurrentFinanceModelSlug/);
  assert.match(chatWidget, /currentFinanceModel/);
  assert.match(chatWidget, /currentFinanceModelSlug:\s*currentFinanceModel\?\.slug/);
  assert.match(chatWidget, /当前模型/);
});

test("finance detail pages keep the AI assistant available", () => {
  assert.match(clientShell, /<ChatWidget \/>/);
  assert.doesNotMatch(clientShell, /!\s*hideShellExtras\s*&&\s*<ChatWidget \/>/);
  assert.match(clientShell, /hideDecorativeExtras/);
});

test("chat renderer turns bare internal routes into clickable markdown links", () => {
  const input = "财务模型库（/finance）和思考与方法（/thinking-lab）都可以看，也可以直接进 /finance/business-analysis。";

  assert.equal(
    normalizeChatInternalLinks(input),
    "[财务模型库](/finance)和[思考与方法](/thinking-lab)都可以看，也可以直接进 [/finance/business-analysis](/finance/business-analysis)。"
  );
});

test("chat route link normalization keeps existing markdown links and code untouched", () => {
  const input = [
    "已有 [财务模型](/finance) 不要改。",
    "`/thinking-lab` 也不要改。",
  ].join("\n");

  assert.equal(normalizeChatInternalLinks(input), input);
});

test("chat API defaults to gpt-5.2 with gpt-5.4 fallback", () => {
  assert.match(chatRoute, /process\.env\.CHAT_MODEL\s*\|\|\s*"gpt-5\.2"/);
  assert.match(chatRoute, /process\.env\.CHAT_MODEL_FALLBACK\s*\|\|\s*"gpt-5\.4"/);
  assert.match(envExample, /CHAT_MODEL=gpt-5\.2/);
  assert.match(envExample, /CHAT_MODEL_FALLBACK=gpt-5\.4/);
  assert.doesNotMatch(chatRoute, /gpt-5\.4-mini/);
});

test("chat API tells the model to avoid bare internal routes", () => {
  assert.match(chatRoute, /\[财务模型\]\(\/finance\)/);
  assert.match(chatRoute, /\[思考与方法\]\(\/thinking-lab\)/);
  assert.doesNotMatch(chatRoute, /财务模型：\/finance/);
  assert.doesNotMatch(chatRoute, /思考与方法：\/thinking-lab/);
  assert.match(chatRoute, /不要只裸写 \/finance 或 \/thinking-lab/);
  assert.match(chatRoute, /\[财务模型\]\(\/finance\)/);
  assert.match(chatRoute, /\[思考与方法\]\(\/thinking-lab\)/);
});

test("chat API injects active finance model guidance when a model page is open", () => {
  assert.match(chatRoute, /currentFinanceModelSlug/);
  assert.match(chatRoute, /getFinanceModelBySlug/);
  assert.match(chatRoute, /activeFinanceModel/);
  assert.match(chatRoute, /当前打开的财务模型/);
  assert.match(chatRoute, /如果用户说“这个模型”/);
  assert.match(chatRoute, /不能直接读取用户在页面里上传的数据/);
  assert.match(chatRoute, /不要假装看到了当前数据/);
  assert.match(chatFallback, /需要你把关键指标、截图或数据摘要发给我/);
  assert.match(chatRoute, /faq\.map/);
});
