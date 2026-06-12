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
const chatArticleContext = await readFile(
  new URL("../src/lib/chatArticleContext.ts", import.meta.url),
  "utf8"
);
const financeRegistry = await readFile(
  new URL("../src/lib/finance/model-registry.json", import.meta.url),
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
  assert.match(chatWidget, /getMarkdownRouteBlocks/);
  assert.match(chatWidget, /InternalRouteCardList/);
  assert.match(chatWidget, /chat-markdown-block/);
  assert.match(chatWidget, /chat-route-card-list/);
  assert.match(chatWidget, /router\.push\(card\.href\)/);
  assert.match(chatWidget, /block\.cards\.length > 0/);
  assert.doesNotMatch(chatWidget, /routeCards\.length > 0/);
});

test("chat widget sends current finance model context to the API", () => {
  assert.match(chatWidget, /usePathname/);
  assert.match(chatWidget, /getCurrentFinanceModelSlug/);
  assert.match(chatWidget, /currentFinanceModel/);
  assert.match(chatWidget, /currentFinanceModelSlug:\s*currentFinanceModel\?\.slug/);
  assert.match(chatWidget, /当前模型/);
});

test("chat widget frames Lucas AI with practical model and chart questions", () => {
  assert.match(chatWidget, /模型选择、使用说明、图表阅读和文章推荐/);
  assert.match(chatWidget, /适用场景/);
  assert.match(chatWidget, /操作步骤/);
  assert.match(chatWidget, /字段说明/);
  assert.match(chatWidget, /图表阅读/);
  assert.match(chatWidget, /我可以帮你选择财务模型、说明模型用法、梳理图表阅读顺序/);
  assert.doesNotMatch(chatWidget, /怎么校对模型口径/);
  assert.doesNotMatch(chatWidget, /上传前要校对哪些口径/);
  assert.doesNotMatch(chatWidget, /我看到你正在看[^`]*直接问我当前模型怎么用、要上传什么数据/);
});

test("chat widget turns finance detail pages into model assistant mode", () => {
  assert.match(chatWidget, /MODEL_ASSISTANT_QUICK_PROMPTS/);
  assert.match(chatWidget, /适用场景/);
  assert.match(chatWidget, /操作步骤/);
  assert.match(chatWidget, /字段说明/);
  assert.match(chatWidget, /常见误区/);
  assert.match(chatWidget, /getModelAssistantGreeting/);
  assert.match(chatWidget, /当前模型助手/);
  assert.match(chatWidget, /当前模型：/);
  assert.match(chatWidget, /currentFinanceModelSlugRef/);
  assert.match(chatWidget, /已切换到/);
  assert.match(chatWidget, /字段、步骤、图表和常见误区/);
});

test("chat widget turns thinking article pages into article assistant mode", () => {
  assert.match(chatWidget, /getCurrentThinkingArticle/);
  assert.match(chatWidget, /currentThinkingArticle/);
  assert.match(chatWidget, /startsWith\("\/thinking-lab\/"\)/);
  assert.match(chatWidget, /currentThinkingArticleHref:\s*currentThinkingArticleCard\?\.href/);
  assert.match(chatWidget, /content:\s*currentThinkingArticle\.content/);
  assert.match(chatWidget, /当前文章助手/);
  assert.match(chatWidget, /当前文章：/);
  assert.match(chatWidget, /总结这篇文章/);
  assert.match(chatWidget, /核心观点/);
  assert.match(chatWidget, /相关模型/);
});

test("finance detail pages keep the AI assistant available", () => {
  assert.match(clientShell, /<ChatWidget \/>/);
  assert.doesNotMatch(clientShell, /!\s*hideShellExtras\s*&&\s*<ChatWidget \/>/);
  assert.match(clientShell, /hideDecorativeExtras/);
});

test("tool pages do not remove the global AI assistant from mobile visitors", () => {
  const assistantHideBlock = clientShell.match(/function shouldHideAssistant[\s\S]*?\n}/)?.[0] ?? "";

  assert.match(clientShell, /<ChatWidget \/>/);
  assert.doesNotMatch(assistantHideBlock, /\/tools\/study-cards/);
});

test("mobile chat launcher clearly identifies Lucas AI", () => {
  assert.match(chatWidget, /aria-label="打开 Lucas AI 助手"/);
  assert.match(chatWidget, /chat-floating-ai-badge/);
});

test("mobile chat panel exposes a clear Lucas AI close control", () => {
  assert.match(chatWidget, /type="button"[\s\S]*aria-label="关闭 Lucas AI 助手"[\s\S]*onClick=\{handleClose\}/);
  assert.match(chatWidget, /zIndex:\s*3/);
});

test("mobile chat launcher avoids reserving a large bottom blank before it is opened", () => {
  assert.doesNotMatch(chatWidget, /if \(!isOpen \|\| !isMobileLike/);
  assert.match(chatWidget, /const mobileLauncherStyle/);
  assert.doesNotMatch(chatWidget, /const mobileBrowserChromeGap = 88/);
  assert.doesNotMatch(chatWidget, /viewportOffsetTop \+ viewportHeight - mobileLauncherHeight - mobileLauncherGap/);
  assert.match(chatWidget, /bottom:\s*"calc\(env\(safe-area-inset-bottom, 0px\) \+ 18px\)"/);
  assert.match(chatWidget, /\.\.\.mobileLauncherStyle/);
  assert.doesNotMatch(chatWidget, /bottom:\s*`calc\(env\(safe-area-inset-bottom, 0px\) \+ \$\{mobileBrowserChromeGap\}px\)`/);
});

test("chat renderer turns bare internal routes into clickable markdown links", () => {
  const input = "财务模型库（/finance）和工具与思考（/thinking-lab）都可以看，也可以直接进 /finance/business-analysis。";

  assert.equal(
    normalizeChatInternalLinks(input),
    "[财务模型库](/finance)和[工具与思考](/thinking-lab)都可以看，也可以直接进 [/finance/business-analysis](/finance/business-analysis)。"
  );
});

test("chat route link normalization keeps existing markdown links and code untouched", () => {
  const input = [
    "已有 [财务模型](/finance) 不要改。",
    "`/thinking-lab` 也不要改。",
  ].join("\n");

  assert.equal(normalizeChatInternalLinks(input), input);
});

test("chat API uses shared GPT primary and DeepSeek fallback provider config", () => {
  assert.match(chatRoute, /getChatProviders\(CHAT_PRIMARY_TIMEOUT_MS\)/);
  assert.match(envExample, /AI_PRIMARY_API_KEY=/);
  assert.match(envExample, /AI_PRIMARY_API_URL=https:\/\/api\.dstopology\.com/);
  assert.match(envExample, /AI_PRIMARY_MODEL=gpt-5\.5/);
  assert.match(envExample, /DEEPSEEK_API_KEY=/);
  assert.match(envExample, /DEEPSEEK_API_URL=https:\/\/api\.deepseek\.com\/chat\/completions/);
  assert.doesNotMatch(chatRoute, /gpt-5\.2/);
  assert.doesNotMatch(chatRoute, /gpt-5\.4/);
  assert.doesNotMatch(chatRoute, /CHAT_API_KEY/);
  assert.doesNotMatch(chatRoute, /CHAT_API_URL/);
  assert.doesNotMatch(chatRoute, /884819/);
  assert.doesNotMatch(envExample, /CHAT_API_KEY=/);
  assert.doesNotMatch(envExample, /CHAT_API_URL=/);
  assert.doesNotMatch(envExample, /884819/);
  assert.doesNotMatch(envExample, /CHAT_MODEL=/);
  assert.doesNotMatch(envExample, /CHAT_MODEL_FALLBACK=/);
  assert.doesNotMatch(chatRoute, /gpt-5\.4-mini/);
});

test("chat API tells the model to avoid bare internal routes", () => {
  assert.match(chatRoute, /\[财务模型\]\(\/finance\)/);
  assert.match(chatRoute, /\[工具与思考\]\(\/thinking-lab\)/);
  assert.doesNotMatch(chatRoute, /财务模型：\/finance/);
  assert.doesNotMatch(chatRoute, /工具与思考：\/thinking-lab/);
  assert.match(chatRoute, /不要只裸写 \/finance 或 \/thinking-lab/);
  assert.match(chatRoute, /\[财务模型\]\(\/finance\)/);
  assert.match(chatRoute, /\[工具与思考\]\(\/thinking-lab\)/);
});

test("chat API injects active finance model guidance when a model page is open", () => {
  assert.match(chatRoute, /currentFinanceModelSlug/);
  assert.match(chatRoute, /getFinanceModelBySlug/);
  assert.match(chatRoute, /activeFinanceModel/);
  assert.match(chatRoute, /当前打开的财务模型/);
  assert.match(chatRoute, /字段说明：/);
  assert.match(chatRoute, /常见误区：/);
  assert.match(chatRoute, /guide\.fields\.map/);
  assert.match(chatRoute, /guide\.pitfalls\.map/);
  assert.match(chatRoute, /如果用户说“这个模型”/);
  assert.match(chatRoute, /模型选择/);
  assert.match(chatRoute, /可视化建议/);
  assert.match(chatRoute, /分析框架/);
  assert.match(chatRoute, /字段解释/);
  assert.match(chatRoute, /操作步骤/);
  assert.match(chatRoute, /适用场景/);
  assert.match(chatRoute, /不要假装看到了当前数据/);
  assert.match(chatRoute, /只基于用户主动发来的截图、指标或数据摘要/);
  assert.match(chatFallback, /如果要做具体数据判断，可以把关键指标、截图或数据摘要发给我/);
  assert.match(chatFallback, /字段可以这样理解/);
  assert.match(chatFallback, /常见误区/);
  assert.doesNotMatch(chatFallback, /目前我能先解释模型口径、上传要求和图表读法/);
  assert.match(chatRoute, /faq\.map/);
});

test("chat API injects active thinking article guidance when an article page is open", () => {
  assert.match(chatRoute, /currentThinkingArticleHref/);
  assert.match(chatRoute, /getThinkingArticleByHref/);
  assert.match(chatRoute, /activeThinkingArticle/);
  assert.match(chatRoute, /buildActiveThinkingArticlePrompt\(activeThinkingArticle\)/);
  assert.doesNotMatch(chatRoute, /latestUserQuestion/);
  assert.match(chatArticleContext, /当前打开的文章/);
  assert.match(chatArticleContext, /如果用户说“这篇文章”/);
  assert.match(chatArticleContext, /文章摘要缓存/);
  assert.doesNotMatch(chatArticleContext, /相关正文片段/);
  assert.doesNotMatch(chatArticleContext, /selectRelevantArticleSections/);
  assert.match(chatRoute, /优先回答当前打开的文章/);
  assert.match(chatFallback, /你现在打开的是/);
  assert.match(chatFallback, /getArticleFallbackFocus/);
  assert.match(chatFallback, /我可以帮你概括核心观点、解释段落逻辑、提炼方法/);
});

test("finance model registry provides field explanations and common pitfalls for the AI assistant", () => {
  const registry = JSON.parse(financeRegistry);
  for (const model of registry.models) {
    assert.ok(Array.isArray(model.aiGuide.fields), `${model.slug} should define aiGuide.fields`);
    assert.ok(model.aiGuide.fields.length >= 3, `${model.slug} should explain key fields`);
    assert.ok(Array.isArray(model.aiGuide.pitfalls), `${model.slug} should define aiGuide.pitfalls`);
    assert.ok(model.aiGuide.pitfalls.length >= 2, `${model.slug} should define common pitfalls`);
  }
});
