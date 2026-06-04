import { NextRequest } from "next/server";

const CHAT_PRIMARY_TIMEOUT_MS = 60000;
const CHAT_FALLBACK_TIMEOUT_MS = 60000;
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const CHAT_FALLBACK_API_URL = "https://api.884819.xyz/v1/chat/completions";
const PUBLIC_STUDY_CARDS_API_URL = "https://yinpengtao.cn/api/tools/study-cards";

type ChatProvider = {
  model: string;
  apiUrl: string;
  apiKey?: string;
  timeoutMs: number;
};

type StudyCard = {
  front: string;
  back: string;
  note?: string;
};

type StudyCardResult = {
  summary: string;
  cards: StudyCard[];
};

function readEnv(value?: string) {
  return value?.trim() || "";
}

function getChatProviders(): ChatProvider[] {
  const deepseekApiUrl = readEnv(process.env.DEEPSEEK_API_URL) || DEEPSEEK_API_URL;
  const fallbackApiUrl = readEnv(process.env.CHAT_API_URL) || CHAT_FALLBACK_API_URL;
  const deepseekApiKey = readEnv(process.env.DEEPSEEK_API_KEY);
  const fallbackApiKey = readEnv(process.env.CHAT_API_KEY);
  const fallbackModel = readEnv(process.env.CHAT_MODEL) || "gpt-5.2";
  const secondFallbackModel = readEnv(process.env.CHAT_MODEL_FALLBACK) || "gpt-5.4";

  return [
    {
      model: "deepseek-v4-pro",
      apiUrl: deepseekApiUrl,
      apiKey: deepseekApiKey,
      timeoutMs: CHAT_PRIMARY_TIMEOUT_MS,
    },
    {
      model: fallbackModel,
      apiUrl: fallbackApiUrl,
      apiKey: fallbackApiKey,
      timeoutMs: CHAT_FALLBACK_TIMEOUT_MS,
    },
    {
      model: secondFallbackModel,
      apiUrl: fallbackApiUrl,
      apiKey: fallbackApiKey,
      timeoutMs: CHAT_FALLBACK_TIMEOUT_MS,
    },
  ];
}

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

const QUESTION_TYPE_GUIDE = [
  "出题框架：每张卡先选一种题型，再写 front；不要把材料标题直接改成问句。",
  "- 适用条件：考什么时候该用某个概念、方法或判断，例如“何时需要 X 介入？”",
  "- 区分边界：考两个概念、步骤或工具的分工，例如“X 和 Y 怎么分工？”",
  "- 因果机制：考为什么会发生、为什么不能跳过，例如“为什么不能只看 X？”",
  "- 迁移判断：给一个相似场景，考学习者先判断该看哪条原则，例如“遇到 Y 先检查什么？”",
  "- 反例纠错：考常见误用会漏掉什么，例如“只做 X 会错过什么？”",
  "- 顺序依赖：考前后步骤和必要前提，例如“做 X 前必须先确定什么？”",
  "- 同一题型不要连续出现超过 2 张；整组卡片要覆盖概念、边界、因果和迁移。",
];

const BAD_QUESTION_PATTERNS = [
  "坏问题：什么是 X？X 的核心是什么？X 有哪些特点？本文讲了什么？",
  "不要问“核心是什么”“主要内容是什么”“有哪些方面”“如何理解 X”这类摘要题。",
  "不要让 front 和 back 共享大段相同短语；front 要逼学习者先作判断。",
];

const ANSWER_QUALITY_RULES = [
  "答案写法：先判断，再解释依据；不要只给名词解释。",
  "信息密度优先：宁可多写半句说明判断依据，也不要为了压缩字数把答案写成泛泛口号。",
  "好的 back 应该像可复述的结论：判断 + 关键依据 / 差异 / 后果；必要时可以写 1 到 3 句。",
  "note 只能给回忆方向，像“先看边界”“想想误判来源”；可以更具体地提示观察角度，但不能提前说出答案关键词。",
  "生成前先自检：如果 front 只是定义题、摘要题、照搬标题或答案已被 note 泄露，必须重写。",
];

const SOURCE_GROUNDING_RULES = [
  "忠于原文：问题和答案只能基于用户内容，不得引入原文没有出现的人名、数据、概念、案例、结论或外部背景。",
  "每个 back 都必须能在用户内容里找到依据，可以重组表达，但不能替材料补充事实或价值判断。",
  "不要根据常识、新闻背景或你自己的知识补充任何内容；材料没有写就不要写。",
  "材料没有依据的判断不要生成卡片；宁可少覆盖一个角度，也不要编造更顺滑的解释。",
];

function getDifficultyQuestionGuidance(difficulty: string) {
  if (difficulty.includes("高级")) {
    return "高级难度：多出迁移判断、反例纠错、边界取舍题；少出直接定义题。";
  }

  if (difficulty.includes("进阶")) {
    return "进阶难度：以区分边界、因果机制、适用条件为主，保留必要术语。";
  }

  return "基础难度：问题仍要考判断，但场景更直白；答案用更明确的因果或步骤表达。";
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
  return [
    "你是一个擅长把知识材料转成学习卡片的 AI 学习助手。",
    "请基于用户提供的内容生成适合逐张翻看的问答闪卡，目标是帮助学习者回忆关键判断，而不是复述原文标题。",
    "质量判断：",
    "- 先提取材料里的关键概念、概念之间的关系、使用边界、因果链和易混点",
    "- 优先生成能检查理解的问题，避免“什么是 X”这类只考定义的浅问题",
    "- 不要把原文句子拆短后照搬；必须重新组织成适合主动回忆的问答",
    ...QUESTION_TYPE_GUIDE,
    ...BAD_QUESTION_PATTERNS,
    ...ANSWER_QUALITY_RULES,
    ...SOURCE_GROUNDING_RULES,
    "要求：",
    `- 难度：${difficulty}`,
    `- ${getDifficultyQuestionGuidance(difficulty)}`,
    `- 生成 ${cardCount} 张问答卡`,
    "- 每张卡只考一个知识点，不要把多个概念塞进一张卡",
    "- front 可以是一句具体问题，适合抛给学习者主动回忆；建议 12 到 56 个中文字符，必要时可以稍长，但不要写成一整段背景",
    "- 问题必须考判断、关系、边界或因果，不能只把小标题改成疑问句",
    "- back 通常写 1 到 3 句，建议 100 到 220 个中文字符；答案必须能脱离原文独立复述，并明确说出判断依据、适用边界或核心差异；不要因为字数范围删掉关键限定",
    "- note 是给学习者的提示，会在答案显示前展示；通常 12 到 48 个中文字符，可以提示观察角度或排查顺序",
    "- 提示只能给回忆方向，不能泄露答案里的关键名词、结论或完整因果",
    "- summary 不超过 28 个中文字符，只概括这组卡片的主题",
    "- 只输出 JSON，不要输出 Markdown、解释文字或代码块",
    "JSON 结构必须是：",
    '{"summary":"...","cards":[{"front":"...","back":"...","note":"..."}]}',
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

function normalizeStudyCardResult(value: unknown, cardCount: number): StudyCardResult {
  const raw = value as Partial<StudyCardResult>;
  const cards = Array.isArray(raw.cards)
    ? raw.cards
        .map((item) => ({
          front: normalizeText((item as StudyCard).front),
          back: normalizeText((item as StudyCard).back),
          note: normalizeText((item as StudyCard).note),
        }))
        .filter((item) => item.front && item.back)
        .slice(0, cardCount)
    : [];

  if (cards.length === 0) {
    throw new Error("AI response missed required study card fields");
  }

  return {
    summary: normalizeText(raw.summary, "已根据输入内容生成学习卡片。"),
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

  return Response.json(payload);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const content = normalizeText(body?.content);
    const difficulty = normalizeText(body?.difficulty, "清晰、适合自学者");
    const cardCount = clampCardCount(body?.cardCount);

    if (content.length < 80) {
      return Response.json(
        { error: "请至少输入 80 个字的学习内容。" },
        { status: 400 }
      );
    }

    if (content.length > 12000) {
      return Response.json(
        { error: "内容太长了，请先缩短到 12000 字以内。" },
        { status: 400 }
      );
    }

    const providers = getChatProviders();
    if (shouldUsePublicDevProxy(req, providers)) {
      return proxyToPublicStudyCardsApi({ content, difficulty, cardCount });
    }

    const prompt = buildStudyCardPrompt({ content, difficulty, cardCount });
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
        return Response.json(normalizeStudyCardResult(parsed, cardCount));
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
      { error: "学习卡片生成失败，请刷新页面后再试。", errorCode: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
