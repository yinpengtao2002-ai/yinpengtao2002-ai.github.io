import { buildActiveThinkingArticlePrompt } from "../../../lib/chatArticleContext.ts";
import { thinkingLabContent } from "../../../lib/data/thinkingLabContent.ts";
import { getChatProviders } from "../../../lib/ai/providers.ts";
import { financeModels, getFinanceModelBySlug, type FinanceModelItem } from "../../../lib/finance/modelRegistry.ts";
import { enforceRateLimit } from "../../../lib/security/rate-limit.ts";
import { parsePublicChatRequest, parseRetryAfterSeconds, type PublicAiError } from "../../../lib/ai/public-api.ts";
import { createSseDataDecoder } from "../../../lib/ai/sse.ts";

const CHAT_PRIMARY_TIMEOUT_MS = 18000;
const CHAT_RATE_LIMIT = { keyPrefix: "api-chat", limit: 30, windowMs: 60_000 };
const STREAM_IDLE_TIMEOUT_MS = 30_000;
const STREAM_TOTAL_TIMEOUT_MS = 120_000;

function buildActiveFinanceModelPrompt(activeFinanceModel?: FinanceModelItem) {
  if (!activeFinanceModel) {
    return "当前没有打开具体财务模型页面。";
  }

  const guide = activeFinanceModel.aiGuide;
  const faq = guide.faq.length > 0
    ? guide.faq.map((item) => `    - ${item.question}：${item.answer}`).join("\n")
    : "    - 暂无常见问题。";
  const fields = guide.fields.length > 0
    ? guide.fields.map((item) => `    - ${item.name}：${item.description}`).join("\n")
    : "    - 暂无字段说明。";
  const pitfalls = guide.pitfalls.length > 0
    ? guide.pitfalls.map((item) => `    - ${item}`).join("\n")
    : "    - 暂无常见误区。";

  return [
    `当前打开的财务模型：${activeFinanceModel.title}（${activeFinanceModel.href}）`,
    `用途：${guide.purpose}`,
    `适用场景：${guide.scenarios.join(" / ")}`,
    `使用步骤：${guide.steps.join(" / ")}`,
    `示例数据：${guide.sampleData}`,
    "字段说明：",
    fields,
    "常见误区：",
    pitfalls,
    "常见问题：",
    faq,
    "如果用户说“这个模型”“当前模型”“这里怎么用”，默认指这个当前打开的财务模型。",
    "你能围绕这个模型提供字段解释、操作步骤、适用场景、常见误区、可视化建议和分析框架。",
  ].join("\n");
}

function normalizeInternalHref(href: string) {
  return href.length > 1 && href.endsWith("/") ? href.slice(0, -1) : href;
}

function getThinkingArticleByHref(href?: string) {
  if (!href) return undefined;
  const normalizedHref = normalizeInternalHref(href);
  return thinkingLabContent.find((article) => (
    normalizeInternalHref(article.href) === normalizedHref ||
    article.aliases?.some((alias) => normalizeInternalHref(`/thinking-lab/${alias}`) === normalizedHref)
  ));
}

function buildSystemPrompt(
  activeFinanceModel?: FinanceModelItem,
  activeThinkingArticle?: ReturnType<typeof getThinkingArticleByHref>
): string {
  const financeModelsCatalog = financeModels
    .map((model) => [
      `  - [${model.title}](${model.href})：${model.summary}`,
      `    用途：${model.aiGuide.purpose}`,
      `    适用场景：${model.aiGuide.scenarios.join(" / ")}`,
      `    使用步骤：${model.aiGuide.steps.join(" / ")}`,
      `    示例数据：${model.aiGuide.sampleData}`,
      `    关键字段：${model.aiGuide.fields.map((item) => item.name).join(" / ")}`,
    ].join("\n"))
    .join("\n");

  const thinkingArticles = thinkingLabContent.length > 0
    ? thinkingLabContent
        .map((a) => `  - [${a.title}](${a.href})：${a.description}`)
        .join("\n")
    : "  - 暂无内容，正在建设中";

  return `你是 Lucas Yin（殷鹏焘）的个人网站 AI 助手。你的风格友好、简洁、专业。

关于 Lucas：
- 目前在奇瑞汽车国际财务 BP 岗位努力工作
- 专注领域：经营分析、财务模型、AI 工作流、数据分析
- GitHub: https://github.com/yinpengtao2002-ai
- 邮箱: yinpengtao2002@gmail.com

网站结构：
- [财务模型](/finance)
- [工具与思考](/thinking-lab)
- [联系](/#contact)

财务模型库：
${financeModelsCatalog}

当前页面上下文：
${buildActiveFinanceModelPrompt(activeFinanceModel)}
${buildActiveThinkingArticlePrompt(activeThinkingArticle)}

工具与思考：
${thinkingArticles}

回复规则：
- 用中文回复，除非用户用英文提问
- 保持简洁，通常 2-4 句话
- 如果当前页面上下文里有“当前打开的财务模型”，用户问“这个模型/当前模型/怎么用/上传什么数据/图表怎么看/怎么形成判断”时，优先回答当前模型，不要泛泛推荐模型库
- 如果当前页面上下文里有“当前打开的文章”，用户问“这篇文章/当前文章/总结一下/核心观点/讲什么”时，优先回答当前打开的文章，不要泛泛推荐文章列表
- 当用户问某个模型怎么用时，优先用模型说明里的用途、适用场景、操作步骤、字段说明、常见误区和示例数据回答
- 优先提供模型选择、使用说明、字段解释、可视化建议和分析框架
- 如果用户要求分析“当前数据”，只基于用户主动发来的截图、指标或数据摘要；不要假装看到了当前数据
- 推荐模型或文章时，必须使用 Markdown 链接格式：[标题](路径)
- 提到站内页面时，不要只裸写 /finance 或 /thinking-lab；必须写成 [财务模型](/finance)、[工具与思考](/thinking-lab) 这样的 Markdown 链接
- 需要写公式时，使用 Markdown LaTeX：行内公式用 $...$，单独成行公式用 $$...$$
- 避免暴露内部实现、内容生成机制或调试语言
- 如果用户问你是什么模型，不要声称具体模型版本；你可以说："我是 Lucas Yin 网站接入的 AI 助手，具体底层模型由网站配置决定。"
- 语气克制、具体，不替 Lucas 自夸
- 当用户提出与本网站无关的问题时（例如写代码、聊八卦、学术问题等），你可以简要回答，但在回复末尾温和地提醒用户："我最擅长的是帮你浏览和推荐本站的文章内容哦，有什么想了解的随时问我！"`;
}

function publicErrorResponse(
  requestId: string,
  status: number,
  errorCode: string,
  message: string,
  retryAfter?: number,
) {
  const payload: PublicAiError = {
    errorCode,
    message,
    requestId,
    ...(retryAfter ? { retryAfter } : {}),
  };
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Request-Id": requestId,
      ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}),
    },
  });
}

async function readWithIdleTimeout(reader: ReadableStreamDefaultReader<Uint8Array>) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new DOMException("AI stream idle timeout", "AbortError")),
          STREAM_IDLE_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const rateLimitError = await enforceRateLimit(req, CHAT_RATE_LIMIT);

  if (rateLimitError) return rateLimitError;

  const parsedRequest = parsePublicChatRequest(await req.text());
  if (!parsedRequest.ok) {
    return publicErrorResponse(
      requestId,
      parsedRequest.status,
      parsedRequest.errorCode,
      parsedRequest.message,
    );
  }

  const { messages, currentFinanceModelSlug, currentThinkingArticleHref } = parsedRequest.value;
  const activeFinanceModel = currentFinanceModelSlug
    ? getFinanceModelBySlug(currentFinanceModelSlug)
    : undefined;
  const activeThinkingArticle = currentThinkingArticleHref
    ? getThinkingArticleByHref(currentThinkingArticleHref)
    : undefined;
  const chatProviders = getChatProviders(CHAT_PRIMARY_TIMEOUT_MS);
  let upstreamResponse: Response | null = null;
  let upstreamController: AbortController | null = null;
  let lastStatus = 503;
  let lastRetryAfter: number | undefined;

  for (const provider of chatProviders) {
    if (!provider.apiKey || !provider.apiUrl) continue;

    const controller = new AbortController();
    const signal = typeof AbortSignal.any === "function"
      ? AbortSignal.any([req.signal, controller.signal])
      : controller.signal;
    const headerTimeoutId = setTimeout(() => controller.abort(), provider.timeoutMs);

    try {
      const response = await fetch(provider.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${provider.apiKey}`,
          "User-Agent": "Mozilla/5.0 (compatible; YinPengtaoWebsite/1.0)",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          model: provider.model,
          max_tokens: 4096,
          stream: true,
          messages: [
            { role: "system", content: buildSystemPrompt(activeFinanceModel, activeThinkingArticle) },
            ...messages,
          ],
        }),
        signal,
      });

      if (response.ok && response.body) {
        upstreamResponse = response;
        upstreamController = controller;
        break;
      }

      lastStatus = response.status;
      if (response.status === 429) {
        lastRetryAfter = parseRetryAfterSeconds(response.headers.get("Retry-After"));
      }
      const detail = await response.text().catch(() => "");
      console.error(JSON.stringify({
        event: "chat_upstream_http_error",
        requestId,
        provider: provider.model,
        status: response.status,
        detail: detail.slice(0, 500),
      }));
      controller.abort();
    } catch (error) {
      lastStatus = error instanceof DOMException && error.name === "AbortError" ? 504 : 502;
      console.error(JSON.stringify({
        event: "chat_upstream_request_error",
        requestId,
        provider: provider.model,
        status: lastStatus,
        error: error instanceof Error ? error.message : "unknown error",
      }));
      controller.abort();
    } finally {
      clearTimeout(headerTimeoutId);
    }
  }

  if (!upstreamResponse?.body || !upstreamController) {
    if (lastStatus === 429 || lastRetryAfter) {
      const retryAfter = lastRetryAfter ?? 60;
      return publicErrorResponse(requestId, 429, "provider_rate_limited", "AI 服务繁忙，请稍后重试。", retryAfter);
    }
    if (lastStatus === 504) {
      return publicErrorResponse(requestId, 504, "provider_timeout", "AI 服务响应超时，请稍后重试。");
    }
    return publicErrorResponse(requestId, 502, "provider_unavailable", "AI 服务暂时不可用，请稍后重试。");
  }

  const encoder = new TextEncoder();
  const reader = upstreamResponse.body.getReader();
  const activeController = upstreamController;
  const readableStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let emittedDone = false;
      let upstreamDone = false;
      const emitDone = () => {
        if (emittedDone) return;
        emittedDone = true;
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      };
      const parser = createSseDataDecoder((data) => {
        if (data.trim() === "[DONE]") {
          upstreamDone = true;
          emitDone();
          return;
        }
        try {
          const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: unknown } }> };
          const content = parsed.choices?.[0]?.delta?.content;
          if (typeof content === "string" && content) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content })}\n\n`));
          }
        } catch {
          // Ignore one malformed event while preserving later complete SSE events.
        }
      });
      const totalTimeoutId = setTimeout(() => activeController.abort(), STREAM_TOTAL_TIMEOUT_MS);

      try {
        while (!upstreamDone) {
          const { done, value } = await readWithIdleTimeout(reader);
          if (done) break;
          parser.push(value);
        }
        parser.finish();
        if (upstreamDone) await reader.cancel().catch(() => undefined);
        emitDone();
        controller.close();
      } catch (error) {
        console.error(JSON.stringify({
          event: "chat_upstream_stream_error",
          requestId,
          error: error instanceof Error ? error.message : "unknown error",
        }));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          error: "AI 服务连接中断，请重试。",
          errorCode: "provider_stream_failed",
          requestId,
        })}\n\n`));
        emitDone();
        controller.close();
      } finally {
        clearTimeout(totalTimeoutId);
        activeController.abort();
        await reader.cancel().catch(() => undefined);
      }
    },
    async cancel() {
      activeController.abort();
      await reader.cancel().catch(() => undefined);
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "X-Request-Id": requestId,
    },
  });
}
