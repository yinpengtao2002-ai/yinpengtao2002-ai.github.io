import { NextRequest } from "next/server";
import { getChatProviders, type ChatProvider } from "@/lib/ai/providers";

const CHAT_PRIMARY_TIMEOUT_MS = 60000;
const PUBLIC_STUDY_CARDS_API_URL = "https://yinpengtao.cn/api/tools/study-cards";

type VocabularyCard = {
  word: string;
  phonetic?: string;
  translation: string;
  example: string;
  source?: string;
  level?: string;
};

type StudyCardResult = {
  summary: string;
  mode?: "article" | "word-list";
  cards: VocabularyCard[];
};

type StudyCardMode = "article" | "word-list";

function hasConfiguredProvider(providers: ChatProvider[]) {
  return providers.some((provider) => Boolean(provider.apiKey && provider.apiUrl));
}

function shouldUsePublicDevProxy(req: NextRequest, providers: ChatProvider[]) {
  const host = req.headers.get("host") || "";
  const isLocalhost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);
  return process.env.NODE_ENV === "development" && isLocalhost && !hasConfiguredProvider(providers);
}

function clampCardCount(value: unknown) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return 8;
  return Math.max(4, Math.min(12, Math.round(numberValue)));
}

function normalizeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function countEnglishWords(text: string) {
  return text.match(/[A-Za-z][A-Za-z'-]*/g)?.length ?? 0;
}

function isLikelyWordList(content: string) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 3) return false;

  const wordLikeLines = lines.filter((line) => /^[A-Za-z][A-Za-z'-]*(?:\s+[A-Za-z][A-Za-z'-]*)?$/.test(line));
  return wordLikeLines.length / lines.length >= 0.75;
}

function hasEnoughVocabularyInput(content: string) {
  return countEnglishWords(content) >= 3 || content.replace(/\s/g, "").length >= 80;
}

const VOCABULARY_CARD_RULES = [
  "目标：生成英文单词卡，帮助用户背英文单词，而不是总结文章观点或出阅读理解题。",
  "逐行单词模式：如果用户每行基本是一个英文单词或短语，保留用户给出的单词，不要替换成别的词；只补充中文释义、音标、英文例句、记忆提示和难度标签。",
  "英文文章模式：如果用户输入的是英文文章，从原文中挑选难度最高且值得记忆的单词；只从原文中出现过的单词里选择，不要发明文章外单词。",
  "文章抽词优先级：优先选择抽象名词、学术词、表达力强的动词/形容词、考试高频词、影响理解的关键词。",
  "不要选择专有名词、数字、缩写、过于常见的基础词、语气词、冠词、普通代词或只在原文里无意义重复的词。",
  "同一个词只出现一次；如果原文有不同词形，优先输出最常见的词典原形，但 source 里保留原文句子。",
  "translation 必须是中文释义，简洁准确，可以包含 1 到 3 个常见义项，避免长篇百科解释。",
  "example 必须是英文例句。逐行单词模式可以自行造一个自然例句；英文文章模式优先改写或引用原文语境，不能捏造原文没有的事实。",
  "source 是来源线索。文章模式写包含该词的原文短句；逐行单词模式写“来自单词清单”。",
  "level 写可感知的难度标签，例如 CET-6、雅思、托福、GRE、学术、高阶表达。",
];

function getDifficultyQuestionGuidance(difficulty: string) {
  if (difficulty.includes("高阶表达")) {
    return "高阶表达：优先挑选学术、抽象、表达力强、适合写作和演讲复用的词，难度可以接近 GRE / 学术阅读。";
  }

  if (difficulty.includes("考试进阶")) {
    return "考试进阶：优先挑选 CET-6、考研、雅思、托福常见难词，兼顾阅读理解和写作复用。";
  }

  return "日常阅读：挑选影响文章理解、但不至于过偏的实用词，释义要直白，例句要容易跟读。";
}

function buildStudyCardPrompt({
  content,
  difficulty,
  cardCount,
}: {
  content: string;
  difficulty: string;
  cardCount: number;
}) {
  const expectedMode: StudyCardMode = isLikelyWordList(content) ? "word-list" : "article";
  const modeHint = expectedMode === "word-list" ? "逐行单词模式" : "英文文章模式";

  return [
    "你是一个严格的英文词汇教练，任务是把用户输入转成可背诵的英文单词卡。",
    "请生成适合逐张翻看的 AI 英文单词卡。正面给英文单词，背面给中文释义、英文例句和来源线索。",
    "输入判断：",
    `- 系统初步判断：${modeHint}`,
    "- 如果用户每行基本是一个英文单词或短语，按逐行单词模式处理。",
    "- 如果用户输入的是英文文章，按英文文章模式处理。",
    ...VOCABULARY_CARD_RULES,
    "要求：",
    `- 难度：${difficulty}`,
    `- ${getDifficultyQuestionGuidance(difficulty)}`,
    `- 最多生成 ${cardCount} 张单词卡；如果逐行单词少于这个数量，就按实际单词数生成`,
    "- word 只写英文单词或短语，不要写中文，不要加序号",
    "- phonetic 尽量给英式或美式音标；不确定时可以为空字符串",
    "- translation 用中文释义，建议 6 到 40 个中文字符",
    "- example 用英文例句，建议 8 到 24 个英文单词，句子自然、可背",
    "- source 用原文短句或“来自单词清单”，不要超过 120 个字符",
    "- level 用 CET-6、雅思、托福、GRE、学术、高阶表达等标签",
    "- summary 不超过 24 个中文字符，只概括这组词的来源或难度",
    "- 只输出 JSON，不要输出 Markdown、解释文字或代码块",
    "JSON 结构必须是：",
    `{"summary":"...","mode":"${expectedMode}","cards":[{"word":"...","phonetic":"...","translation":"...","example":"...","source":"...","level":"..."}]}`,
    "用户内容：",
    content,
  ].join("\n");
}

function extractJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || text.trim();
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) {
    throw new Error("AI response did not contain JSON");
  }

  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
}

function normalizeStudyCardResult(value: unknown, cardCount: number, expectedMode: StudyCardMode): StudyCardResult {
  const raw = value as Partial<StudyCardResult>;
  const cards = Array.isArray(raw.cards)
    ? raw.cards
        .map((item) => ({
          word: normalizeText((item as VocabularyCard).word),
          phonetic: normalizeText((item as VocabularyCard).phonetic),
          translation: normalizeText((item as VocabularyCard).translation),
          example: normalizeText((item as VocabularyCard).example),
          source: normalizeText((item as VocabularyCard).source),
          level: normalizeText((item as VocabularyCard).level),
        }))
        .filter((item) => item.word && item.translation)
        .slice(0, cardCount)
    : [];

  if (cards.length === 0) {
    throw new Error("AI response missed required vocabulary card fields");
  }

  return {
    summary: normalizeText(raw.summary, "已生成单词卡。"),
    mode: expectedMode,
    cards,
  };
}

async function callProvider(provider: ChatProvider, prompt: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), provider.timeoutMs);

  try {
    const response = await fetch(provider.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
        "User-Agent": "Mozilla/5.0 (compatible; YinPengtaoWebsite/1.0)",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: 3200,
        stream: false,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "你只输出严格 JSON，用中文回答。" },
          { role: "user", content: prompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(detail.slice(0, 500) || `Upstream responded with ${response.status}`);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("AI response was empty");
    }

    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function proxyToPublicStudyCardsApi(body: {
  content: string;
  difficulty: string;
  cardCount: number;
}) {
  const response = await fetch(PUBLIC_STUDY_CARDS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; YinPengtaoWebsiteLocalPreview/1.0)",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    return Response.json(
      payload || {
        error: "线上 AI 接口暂时不可用，请稍后再试。",
        errorCode: "PUBLIC_PROXY_FAILED",
      },
      { status: response.status }
    );
  }

  const expectedMode = isLikelyWordList(body.content) ? "word-list" : "article";
  return Response.json(normalizeStudyCardResult(payload, body.cardCount, expectedMode));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const content = normalizeText(body?.content);
    const difficulty = normalizeText(body?.difficulty, "日常阅读：适合英文文章精读");
    const cardCount = clampCardCount(body?.cardCount);

    if (!hasEnoughVocabularyInput(content)) {
      return Response.json(
        { error: "请至少输入 3 个英文单词，或一段 80 字以上英文文章。" },
        { status: 400 }
      );
    }

    if (content.length > 12000) {
      return Response.json(
        { error: "内容太长了，请先缩短到 12000 字以内。" },
        { status: 400 }
      );
    }

    const providers = getChatProviders(CHAT_PRIMARY_TIMEOUT_MS);
    if (shouldUsePublicDevProxy(req, providers)) {
      return proxyToPublicStudyCardsApi({ content, difficulty, cardCount });
    }

    const prompt = buildStudyCardPrompt({ content, difficulty, cardCount });
    const expectedMode = isLikelyWordList(content) ? "word-list" : "article";
    let lastError = "API not configured";
    let lastModel = providers[0]?.model ?? "unknown";

    for (const provider of providers) {
      lastModel = provider.model;

      if (!provider.apiKey || !provider.apiUrl) {
        lastError = `${provider.model} API not configured`;
        continue;
      }

      try {
        const aiText = await callProvider(provider, prompt);
        const parsed = extractJsonObject(aiText);
        return Response.json(normalizeStudyCardResult(parsed, cardCount, expectedMode));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          lastError = "AI generation timed out";
        } else {
          lastError = error instanceof Error ? error.message : "AI generation failed";
        }
      }
    }

    if (!hasConfiguredProvider(providers)) {
      return Response.json(
        {
          error: "当前环境没有配置 AI 接口密钥。",
          errorCode: "API_NOT_CONFIGURED",
          detail: lastError,
          model: lastModel,
        },
        { status: 503 }
      );
    }

    const isTimeout = lastError.toLowerCase().includes("timed out");
    return Response.json(
      {
        error: isTimeout ? "生成超时了，请缩短输入内容后再试。" : "AI 生成没有成功，请再试一次。",
        errorCode: isTimeout ? "AI_TIMEOUT" : "AI_GENERATION_FAILED",
        detail: lastError,
        model: lastModel,
      },
      { status: isTimeout ? 504 : 503 }
    );
  } catch {
    return Response.json(
      { error: "单词卡生成失败，请刷新页面后再试。", errorCode: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
