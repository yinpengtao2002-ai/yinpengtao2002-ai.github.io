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
    cardType?: "finance" | "thinking";
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
    financeContent: LocalContentCard[],
    thinkingContent: LocalContentCard[] = [],
    options: { includeOfflineNotice?: boolean } = {}
): LocalFallbackResult {
    const lower = input.toLowerCase().trim();

    if (includesAny(lower, ["lucas", "卢卡斯", "站长", "博主", "作者", "yinpengtao", "殷鹏焘", "殷鹏涛"])) {
        return withOfflineNotice({
            response: "Lucas Yin（殷鹏焘）关注经营分析、财务模型和 AI 工作流，目前也在奇瑞汽车国际财务 BP 岗位努力工作。你可以先看 [财务模型](/finance)，也可以进入 [思考与方法](/thinking-lab)。",
        }, options.includeOfflineNotice);
    }

    if (includesAny(lower, ["预算", "实际", "复盘", "经营看板", "预算复盘", "business"])) {
        const cards = financeContent.filter((item) => item.href.includes("business-analysis") || item.title.includes("预算"));
        return withOfflineNotice({
            response: "预算复盘可以先打开 [预算实际对比模型](/finance/business-analysis)。它适合对比实际与预算的销量、收入、边际和利润表现，再按国家、车型等维度下钻定位差异。",
            contentCards: cards.length > 0 ? cards : undefined,
            cardType: cards.length > 0 ? "finance" : undefined,
        }, options.includeOfflineNotice);
    }

    if (includesAny(lower, ["单车", "边际", "归因", "结构效应", "费率效应", "变动分析", "margin"])) {
        const cards = financeContent.filter((item) => item.href.includes("margin-analysis") || item.title.includes("单车"));
        return withOfflineNotice({
            response: "你要找的是 [单车指标变动归因模型](/finance/margin-analysis)。它用于上传两期财务数据，并按用户选择的分析维度拆解结构效应和费率效应；在用户设置中填写“边际”时会识别为单车边际。",
            contentCards: cards.length > 0 ? cards : undefined,
            cardType: cards.length > 0 ? "finance" : undefined,
        }, options.includeOfflineNotice);
    }

    if (includesAny(lower, ["趋势", "分月", "月度", "同比", "环比", "monthly", "trend"])) {
        const cards = financeContent.filter((item) => item.href.includes("monthly-trend") || item.title.includes("趋势"));
        return withOfflineNotice({
            response: "连续月份走势可以看 [分月指标趋势分析模型](/finance/monthly-trend)。它适合观察销量、单车质量、同比环比、结构占比和集中度。",
            contentCards: cards.length > 0 ? cards : undefined,
            cardType: cards.length > 0 ? "finance" : undefined,
        }, options.includeOfflineNotice);
    }

    if (includesAny(lower, ["敏感性", "利润", "模拟", "测算", "预测", "sensitivity"])) {
        const cards = financeContent.filter((item) => item.href.includes("sensitivity-analysis") || item.title.includes("敏感性"));
        return withOfflineNotice({
            response: "利润假设推演可以用 [利润敏感性分析](/finance/sensitivity-analysis)。它适合调整销量、收入、成本、费用和税费假设，快速看利润影响。",
            contentCards: cards.length > 0 ? cards : undefined,
            cardType: cards.length > 0 ? "finance" : undefined,
        }, options.includeOfflineNotice);
    }

    if (includesAny(lower, ["ai", "人工智能", "见闻", "chatgpt", "llm", "openai", "gpt", "claude"])) {
        if (thinkingContent.length === 0) {
            return withOfflineNotice({ response: "【思考与方法】暂时还没有内容，敬请期待。" }, options.includeOfflineNotice);
        }
        return withOfflineNotice({
            response: "这些是【思考与方法】里可以先看的内容：",
            contentCards: thinkingContent,
            cardType: "thinking",
        }, options.includeOfflineNotice);
    }

    if (includesAny(lower, ["月光渡口", "渡口", "老陈", "苏晴", "小说", "随笔", "日常随笔", "essays", "essay"])) {
        const cards = thinkingContent.filter((item) => (
            item.title.includes("月光渡口") ||
            item.href.includes("moonlight-ferry") ||
            item.title.includes("随笔") ||
            item.description.includes("随笔")
        ));
        return withOfflineNotice({
            response: cards.length > 0
                ? "你要找的是 [月光渡口](/thinking-lab/moonlight-ferry)。它现在放在【思考与方法】里。"
                : "【思考与方法】暂时没有匹配内容。",
            contentCards: cards.length > 0 ? cards : thinkingContent,
            cardType: "thinking",
        }, options.includeOfflineNotice);
    }

    if (includesAny(lower, ["财务", "建模", "模型", "金融", "finance", "估值", "驾驶舱"])) {
        if (financeContent.length === 0) {
            return withOfflineNotice({ response: "【财务模型】暂时还没有内容，敬请期待。" }, options.includeOfflineNotice);
        }
        return withOfflineNotice({
            response: "这些是【财务模型】里目前可以使用的模型和工具：",
            contentCards: financeContent,
            cardType: "finance",
        }, options.includeOfflineNotice);
    }

    if (includesAny(lower, ["文章", "内容", "有什么", "推荐", "目录", "网站", "看什么", "入口", "板块"])) {
        return withOfflineNotice({
            response: "你可以先看两个入口：[财务模型](/finance) 和 [思考与方法](/thinking-lab)。如果想直接体验工具，可以先打开 [预算实际对比模型](/finance/business-analysis)。",
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
