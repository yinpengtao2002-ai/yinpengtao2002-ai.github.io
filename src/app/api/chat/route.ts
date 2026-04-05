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

  return `你是 Lucas Yin（殷鹏焘）的个人网站助手。你的风格友好、简洁、专业。

关于 Lucas：
- 对金融建模和人工智能充满热情
- 专注领域：财务建模、数据分析、AI 工具应用、全栈开发
- GitHub: https://github.com/yinpengtao2002-ai

网站文章目录：
【财务建模】板块：
${financeArticles}

【AI 见闻】板块：
${aiArticles}

回复规则：
- 用中文回复，除非用户用英文提问
- 保持简洁，通常 2-4 句话
- 当用户的问题与某篇文章相关时，主动推荐并附上链接，例如："你可以看看这篇文章：「标题」→ /article/finance/xxx"
- 当用户问"有什么内容"或"有哪些文章"时，列出相关板块的文章
- 你代表 Lucas 的个人品牌，语气专业但亲切`;
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const apiKey = process.env.CHAT_API_KEY;
    const apiUrl = process.env.CHAT_API_URL;
    const model = process.env.CHAT_MODEL || "gpt-3.5-turbo";

    if (!apiKey || !apiUrl) {
      return Response.json(
        { error: "API not configured" },
        { status: 503 }
      );
    }

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 512,
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

    if (!res.ok || !res.body) {
      return Response.json(
        { error: "Upstream API error" },
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
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ text: delta })}\n\n`
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
