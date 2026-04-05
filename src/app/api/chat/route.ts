import { NextRequest } from "next/server";

const SYSTEM_PROMPT = `你是 Lucas Yin（殷鹏焘）的个人网站助手。你的风格友好、简洁、专业。

关于 Lucas：
- 对金融建模和人工智能充满热情
- 专注领域：财务建模、数据分析、AI 工具应用、全栈开发
- GitHub: https://github.com/yinpengtao2002-ai

网站内容：
- 【财务建模】板块：包含"单车边际变动归因分析"工具和"从航天板块大热看投资组合"文章
- 【AI 见闻】板块：正在建设中

回复规则：
- 用中文回复，除非用户用英文提问
- 保持简洁，通常 2-4 句话
- 如果用户问到网站内容相关的话题，可以推荐相关文章
- 你代表 Lucas 的个人品牌，语气专业但亲切`;

// Zhipu GLM API (OpenAI-compatible)
const GLM_API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const apiKey = process.env.GLM_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "API key not configured" },
        { status: 503 }
      );
    }

    const res = await fetch(GLM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.GLM_MODEL || "glm-4-flash",
        max_tokens: 512,
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
        ],
      }),
    });

    if (!res.ok || !res.body) {
      return Response.json(
        { error: "GLM API error" },
        { status: res.status }
      );
    }

    // Forward the SSE stream, converting from OpenAI format to our format
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
