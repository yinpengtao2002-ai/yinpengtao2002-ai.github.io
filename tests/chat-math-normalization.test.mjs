import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const { normalizeChatMathMarkdown } = await import(
  "../src/lib/markdown/normalizeChatMathMarkdown.ts"
);

const chatWidget = await readFile(
  new URL("../src/components/ChatWidget.tsx", import.meta.url),
  "utf8"
);
const chatRoute = await readFile(
  new URL("../src/app/api/chat/route.ts", import.meta.url),
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
  assert.match(chatWidget, /normalizeChatMathMarkdown\(text\)/);
  assert.match(chatWidget, /className="chat-markdown"/);
});

test("chat API defaults to gpt-5.2 with gpt-5.4 fallback", () => {
  assert.match(chatRoute, /process\.env\.CHAT_MODEL\s*\|\|\s*"gpt-5\.2"/);
  assert.match(chatRoute, /process\.env\.CHAT_MODEL_FALLBACK\s*\|\|\s*"gpt-5\.4"/);
  assert.match(envExample, /CHAT_MODEL=gpt-5\.2/);
  assert.match(envExample, /CHAT_MODEL_FALLBACK=gpt-5\.4/);
  assert.doesNotMatch(chatRoute, /gpt-5\.4-mini/);
});
