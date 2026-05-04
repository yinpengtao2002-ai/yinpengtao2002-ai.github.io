import { NextRequest } from "next/server";
import { thinkingContent } from "@/lib/data/generated/content";
import { financeModels } from "@/lib/finance/modelRegistry";

const CHAT_PRIMARY_TIMEOUT_MS = 18000;
const CHAT_FALLBACK_TIMEOUT_MS = 18000;

function buildSystemPrompt(): string {
  const financeModelsCatalog = financeModels
    .map((model) => [
      `  - "${model.title}"：${model.summary}（链接：${model.href}）`,
      `    用途：${model.aiGuide.purpose}`,
      `    适用场景：${model.aiGuide.scenarios.join(" / ")}`,
      `    使用步骤：${model.aiGuide.steps.join(" / ")}`,
      `    示例数据：${model.aiGuide.sampleData}`,
    ].join("\n"))
    .join("\n");

  const thinkingArticles = thinkingContent.length > 0
    ? thinkingContent
        .map((a) => `  - "${a.title}"：${a.description}（链接：${a.href}）`)
        .join("\n")
    : "  - 暂无内容，正在建设中";

  return `你是 Lucas Yin（殷鹏焘）的个人网站 AI 助手。你的风格友好、简洁、专业。

关于 Lucas：
- 目前在奇瑞汽车国际财务 BP 岗位努力工作
- 专注领域：经营分析、财务模型、AI 工作流、数据分析
- GitHub: https://github.com/yinpengtao2002-ai
- 邮箱: yinpengtao2002@gmail.com

网站结构：
- 财务模型：/finance
- 思考与方法：/thinking-lab
- 联系：/#contact

财务模型库：
${financeModelsCatalog}

思考与方法：
${thinkingArticles}

回复规则：
- 用中文回复，除非用户用英文提问
- 保持简洁，通常 2-4 句话
- 当用户问某个模型怎么用时，优先用模型说明里的用途、适用场景、使用步骤和示例数据回答
- 推荐模型或文章时，必须使用 Markdown 链接格式：[标题](路径)
- 不使用“站内索引”“fallback”“生成内容”等实现语言
- 如果用户问你是什么模型，不要声称具体模型版本；你可以说："我是 Lucas Yin 网站接入的 AI 助手，具体底层模型由网站配置决定。"
- 语气克制、具体，不替 Lucas 自夸
- 当用户提出与本网站无关的问题时（例如写代码、聊八卦、学术问题等），你可以简要回答，但在回复末尾温和地提醒用户："我最擅长的是帮你浏览和推荐本站的文章内容哦，有什么想了解的随时问我！"`;
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const apiKey = process.env.CHAT_API_KEY?.trim();
    const apiUrl = process.env.CHAT_API_URL?.trim();
    const primaryModel = (process.env.CHAT_MODEL || "gpt-5.4-mini").trim();
    const fallbackModel = (process.env.CHAT_MODEL_FALLBACK || "gpt-5.2").trim();

    if (!apiKey || !apiUrl) {
      return Response.json(
        { error: "API not configured", hasKey: !!apiKey, hasUrl: !!apiUrl },
        { status: 503 }
      );
    }

    const callUpstream = async (model: string, timeoutMs: number) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        return await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "User-Agent": "Mozilla/5.0 (compatible; YinPengtaoWebsite/1.0)",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          stream: true,
          messages: [
            { role: "system", content: buildSystemPrompt() },
            ...messages.map((m: { role: string; content: string }) => ({
              role: m.role,
              content: m.content,
            })),
          ],
        }),
        signal: controller.signal,
      });
      } finally {
        clearTimeout(timeoutId);
      }
    };

    let res: Response | null = null;
    let activeModel = primaryModel;
    let upstreamError = "";

    try {
      res = await callUpstream(primaryModel, CHAT_PRIMARY_TIMEOUT_MS);
    } catch (err) {
      upstreamError = err instanceof Error ? err.message : "Upstream request failed";
      console.warn(`Primary model ${primaryModel} request failed: ${upstreamError}`);
    }

    if ((!res || !res.ok || !res.body) && fallbackModel && fallbackModel !== primaryModel) {
      const primaryErr = res ? await res.text().catch(() => "") : upstreamError;
      console.warn(
        `Primary model ${primaryModel} failed (${res?.status ?? "timeout"}): ${primaryErr.slice(0, 200)}. Trying fallback ${fallbackModel}.`
      );
      activeModel = fallbackModel;

      try {
        res = await callUpstream(fallbackModel, CHAT_FALLBACK_TIMEOUT_MS);
        upstreamError = "";
      } catch (err) {
        upstreamError = err instanceof Error ? err.message : "Upstream request failed";
        console.warn(`Fallback model ${fallbackModel} request failed: ${upstreamError}`);
      }
    }

    if (!res || !res.ok || !res.body) {
      const errorText = res ? await res.text().catch(() => "") : upstreamError || "Upstream request timed out";
      const status = res?.status ?? 504;
      const urlHost = (() => {
        try {
          return new URL(apiUrl).host;
        } catch {
          return "invalid-url";
        }
      })();
      console.error("Upstream API error:", status, errorText);
      return Response.json(
        {
          error: "Upstream API error",
          status,
          detail: errorText.slice(0, 500),
          model: activeModel,
          urlHost,
        },
        { status }
      );
    }

    // Forward SSE stream, converting OpenAI-compatible format to our format
    const encoder = new TextEncoder();
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();
              if (data === "[DONE]") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;
                // For thinking models: skip reasoning_content, only forward content
                const text = delta?.content;
                if (text) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ text })}\n\n`
                    )
                  );
                }
              } catch {
                // Skip malformed chunks
              }
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream error" })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
