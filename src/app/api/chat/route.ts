import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: "API key not configured" },
        { status: 503 }
      );
    }

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    });

    // Return a streaming response
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`)
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
