import { allDialoguePatterns, defaultResponses } from "@/lib/data/dialoguePatterns";

export const CHAT_API_TIMEOUT_MS = 70000;

const OFFLINE_INDEX_NOTICE = "当前助手暂时不可用，先为你显示相关内容入口。";

export interface LocalContentCard {
    id: number;
    title: string;
    description: string;
    category?: string;
    date: string;
    href: string;
}

export interface LocalFallbackResult {
    response: string;
    contentCards?: LocalContentCard[];
    cardType?: "ai" | "finance" | "essays";
}

function includesAny(text: string, keywords: string[]) {
    return keywords.some((keyword) => text.includes(keyword));
}

function withOfflineNotice(result: LocalFallbackResult, includeOfflineNotice?: boolean) {
    if (!includeOfflineNotice) return result;
    return {
        ...result,
        response: `${OFFLINE_INDEX_NOTICE}\n\n${result.response}`,
    };
}

export function getLocalFallbackResponse(
    input: string,
    aiContent: LocalContentCard[],
    financeContent: LocalContentCard[],
    essaysContent: LocalContentCard[] = [],
    options: { includeOfflineNotice?: boolean } = {}
): LocalFallbackResult {
    const lower = input.toLowerCase().trim();

    if (includesAny(lower, ["lucas", "卢卡斯", "站长", "博主", "作者", "yinpengtao", "殷鹏焘", "殷鹏涛"])) {
        return withOfflineNotice({
            response: "Lucas Yin（殷鹏焘）目前在奇瑞汽车做财务 BP，关注财务建模、数据分析和 AI 工具应用。你可以从 [财务建模](/finance) 或 [AI 工作流](/ai) 开始看。",
        }, options.includeOfflineNotice);
    }

    if (includesAny(lower, ["单车", "边际", "归因", "结构效应", "费率效应", "变动分析", "margin"])) {
        const cards = financeContent.filter((item) => item.href.includes("margin-analysis") || item.title.includes("单车"));
        return withOfflineNotice({
            response: "你要找的是 [单车边际变动归因分析](/finance/margin-analysis)。它用于上传两期财务数据，并按用户选择的分析维度拆解结构效应和费率效应。",
            contentCards: cards.length > 0 ? cards : undefined,
            cardType: cards.length > 0 ? "finance" : undefined,
        }, options.includeOfflineNotice);
    }

    if (includesAny(lower, ["ai", "人工智能", "见闻", "chatgpt", "llm", "openai", "gpt", "claude"])) {
        if (aiContent.length === 0) {
            return withOfflineNotice({ response: "【AI 工作流】板块暂时还没有内容，敬请期待。" }, options.includeOfflineNotice);
        }
        return withOfflineNotice({
            response: "这些是【AI 工作流】板块目前可以阅读的内容：",
            contentCards: aiContent,
            cardType: "ai",
        }, options.includeOfflineNotice);
    }

    if (includesAny(lower, ["月光渡口", "渡口", "老陈", "苏晴", "小说", "随笔", "日常随笔", "essays", "essay"])) {
        const cards = essaysContent.filter((item) => (
            item.title.includes("月光渡口") ||
            item.href.includes("moonlight-ferry") ||
            item.title.includes("随笔") ||
            item.description.includes("随笔")
        ));
        return withOfflineNotice({
            response: cards.length > 0
                ? "你要找的是 [月光渡口](/article/essays/moonlight-ferry)。它在【日常随笔】栏目里。"
                : "【日常随笔】栏目暂时没有匹配内容。",
            contentCards: cards.length > 0 ? cards : essaysContent,
            cardType: "essays",
        }, options.includeOfflineNotice);
    }

    if (includesAny(lower, ["财务", "建模", "模型", "金融", "finance", "估值", "驾驶舱"])) {
        if (financeContent.length === 0) {
            return withOfflineNotice({ response: "【财务建模】板块暂时还没有内容，敬请期待。" }, options.includeOfflineNotice);
        }
        return withOfflineNotice({
            response: "这些是【财务建模】板块目前可以使用的模型和工具：",
            contentCards: financeContent,
            cardType: "finance",
        }, options.includeOfflineNotice);
    }

    if (includesAny(lower, ["文章", "内容", "有什么", "推荐", "目录", "网站", "看什么", "入口", "板块"])) {
        return withOfflineNotice({
            response: "你可以先看三个入口：[财务建模](/finance)、[AI 工作流](/ai) 和 [日常随笔](/essays)。如果想读小说，可以直接看 [月光渡口](/article/essays/moonlight-ferry)。",
        }, options.includeOfflineNotice);
    }

    for (const pattern of allDialoguePatterns) {
        if (pattern.keywords.some((keyword) => lower.includes(keyword))) {
            return withOfflineNotice({
                response: pattern.responses[Math.floor(Math.random() * pattern.responses.length)],
            }, options.includeOfflineNotice);
        }
    }

    return withOfflineNotice({
        response: defaultResponses[Math.floor(Math.random() * defaultResponses.length)],
    }, options.includeOfflineNotice);
}
