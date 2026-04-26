import { NextRequest } from "next/server";
import { aiContent, financeContent } from "@/lib/data/generated/content";

function buildSystemPrompt(): string {
  // Build article catalog from actual content
  const financeArticles = financeContent
    .map((a) => `  - "${a.title}"：${a.description}（链接：${a.href}）`)
    .join("\n");
  const aiArticles =
    aiContent.length > 0
      ? aiContent
          .map((a) => `  - "${a.title}"：${a.description}（链接：${a.href}）`)
          .join("\n")
      : "  - 暂无内容，正在建设中";

  return `你是 Lucas Yin（殷鹏焘）的个人网站 AI 助手。你的风格友好、简洁、专业。

关于 Lucas：
- 目前就职于奇瑞汽车，担任财务BP
- 专注领域：财务建模、数据分析、AI 工具应用、全栈开发
- GitHub: https://github.com/yinpengtao2002-ai
- 邮箱: yinpengtao2002@gmail.com

网站文章目录：
【财务建模】板块：
${financeArticles}

【AI 见闻】板块：
${aiArticles}

回复规则：
- 用中文回复，除非用户用英文提问
- 保持简洁，通常 2-4 句话
- 当推荐文章时，必须使用 Markdown 链接格式：[文章标题](路径)，例如：[单车边际变动归因分析](/finance/margin-analysis)。不要直接显示路径，始终用文章标题作为链接文字
- 当用户问"有什么内容"或"有哪些文章"时，用上述链接格式列出相关板块的文章
- 如果用户问你是什么模型，不要声称具体模型版本；你可以说："我是 Lucas Yin 网站接入的 AI 助手，具体底层模型由网站配置决定。"
- 你代表 Lucas 的个人品牌，语气专业但亲切
- 当用户提出与本网站无关的问题时（例如写代码、聊八卦、学术问题等），你可以简要回答，但在回复末尾温和地提醒用户："我最擅长的是帮你浏览和推荐本站的文章内容哦，有什么想了解的随时问我！"`;
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const apiKey = process.env.CHAT_API_KEY?.trim();
    const apiUrl = process.env.CHAT_API_URL?.trim();
    const primaryModel = (process.env.CHAT_MODEL || "gpt-3.5-turbo").trim();
    const fallbackModel = (process.env.CHAT_MODEL_FALLBACK || "gpt-5.3-codex").trim();

    if (!apiKey || !apiUrl) {
      return Response.json(
        { error: "API not configured", hasKey: !!apiKey, hasUrl: !!apiUrl },
        { status: 503 }
      );
    }

    const callUpstream = (model: string) =>
      fetch(apiUrl, {
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
      });

    let res = await callUpstream(primaryModel);
    let activeModel = primaryModel;

    if ((!res.ok || !res.body) && fallbackModel && fallbackModel !== primaryModel) {
      const primaryErr = await res.text().catch(() => "");
      console.warn(
        `Primary model ${primaryModel} failed (${res.status}): ${primaryErr.slice(0, 200)}. Trying fallback ${fallbackModel}.`
      );
      res = await callUpstream(fallbackModel);
      activeModel = fallbackModel;
    }

    if (!res.ok || !res.body) {
      const errorText = await res.text().catch(() => "");
      console.error("Upstream API error:", res.status, errorText);
      return Response.json(
        {
          error: "Upstream API error",
          status: res.status,
          detail: errorText.slice(0, 500),
          model: activeModel,
          urlHost: new URL(apiUrl).host,
        },
        { status: res.status }
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
