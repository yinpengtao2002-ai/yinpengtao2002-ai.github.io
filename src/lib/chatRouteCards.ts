export type InternalRouteCard = {
    href: string;
    title: string;
    description: string;
    accent: string;
};

export type MarkdownRouteBlock = {
    markdown: string;
    cards: InternalRouteCard[];
};

export const INTERNAL_ROUTE_CARDS: Record<string, InternalRouteCard> = {
    "/finance": {
        href: "/finance",
        title: "财务模型库",
        description: "预算复盘、单车归因、趋势监控和利润敏感性。",
        accent: "var(--accent-secondary)",
    },
    "/thinking-lab": {
        href: "/thinking-lab",
        title: "思考与方法",
        description: "AI 使用、市场观察和方法复盘。",
        accent: "var(--accent-tertiary)",
    },
    "/finance/margin-analysis": {
        href: "/finance/margin-analysis",
        title: "单车指标变动归因模型",
        description: "拆解两期单车指标变化里的结构效应和费率效应。",
        accent: "var(--accent-secondary)",
    },
    "/finance/business-analysis": {
        href: "/finance/business-analysis",
        title: "预算实际对比模型",
        description: "从预算与实际差异定位销量、收入、边际和利润问题。",
        accent: "var(--accent-secondary)",
    },
    "/finance/monthly-trend": {
        href: "/finance/monthly-trend",
        title: "分月指标趋势分析模型",
        description: "观察连续月份的趋势、结构和集中度变化。",
        accent: "var(--accent-secondary)",
    },
    "/finance/sensitivity-analysis": {
        href: "/finance/sensitivity-analysis",
        title: "利润敏感性分析",
        description: "调整关键变量并快速判断利润影响。",
        accent: "var(--accent-secondary)",
    },
};

const MARKDOWN_INTERNAL_LINK_PATTERN =
    /\[([^\]]+)\]\((\/(?:finance|thinking-lab)(?:\/[A-Za-z0-9-]+)*\/?)\)/g;

export function normalizeInternalHref(href: string) {
    return href.length > 1 && href.endsWith("/") ? href.slice(0, -1) : href;
}

export function getInternalRouteCards(markdown: string, limit = 3) {
    const cards: InternalRouteCard[] = [];
    const seen = new Set<string>();

    for (const match of markdown.matchAll(MARKDOWN_INTERNAL_LINK_PATTERN)) {
        const label = match[1] ?? "";
        const href = normalizeInternalHref(match[2] ?? "");
        const card = INTERNAL_ROUTE_CARDS[href] ?? getFallbackRouteCard(href, label);
        if (card && !seen.has(card.href)) {
            cards.push(card);
            seen.add(card.href);
        }
        if (cards.length >= limit) break;
    }

    return cards;
}

function getFallbackRouteCard(href: string, label: string): InternalRouteCard | null {
    if (href.startsWith("/thinking-lab/")) {
        return {
            href,
            title: label,
            description: "查看这篇思考与方法文章。",
            accent: "var(--accent-tertiary)",
        };
    }

    return null;
}

export function getMarkdownRouteBlocks(markdown: string): MarkdownRouteBlock[] {
    return splitMarkdownBlocks(markdown).map((block) => ({
        markdown: block,
        cards: getInternalRouteCards(block),
    }));
}

function splitMarkdownBlocks(markdown: string) {
    const blocks: string[] = [];
    const current: string[] = [];
    let inFence = false;

    const flush = () => {
        const block = current.join("\n").trim();
        if (block) blocks.push(block);
        current.length = 0;
    };

    for (const line of markdown.split("\n")) {
        if (/^\s*```/.test(line)) inFence = !inFence;
        if (!inFence && line.trim() === "") {
            flush();
            continue;
        }
        current.push(line);
    }

    flush();
    return blocks;
}
