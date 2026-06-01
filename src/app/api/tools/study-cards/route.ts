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
    "请基于用户提供的内容生成适合逐张翻看的问答闪卡。",
    "要求：",
    `- 难度：${difficulty}`,
    `- 生成 ${cardCount} 张问答卡`,
    "- 每张卡只考一个知识点，不要把多个概念塞进一张卡",
    "- 问答卡 front 必须是可主动回忆的问题，不超过 28 个中文字符",
    "- back 不超过 45 个中文字符，只给可背诵答案，不写长段解释",
    "- note 不超过 28 个中文字符；没有必要就留空，不要写“易错点：”这类标签",
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
        max_tokens: 1800,
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
