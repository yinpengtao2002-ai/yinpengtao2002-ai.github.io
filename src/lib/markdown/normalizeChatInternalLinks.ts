const CODE_SEGMENT_PATTERN = /(```[\s\S]*?```|`[^`\n]*`)/g;
const LABELED_INTERNAL_ROUTE_PATTERN =
    /(财务模型库|财务模型|思考与方法|日常随笔)\s*[（(]\s*(\/(?:finance|thinking-lab)\/?)\s*[）)]/g;
const INTERNAL_ROUTE_PATTERN =
    /(^|[^\w\]])((?:\/(?:finance|thinking-lab)(?:\/[A-Za-z0-9-]+)*\/?))(?![A-Za-z0-9/_-])/g;

const ROUTE_LABELS: Record<string, string> = {
    "/finance": "财务模型库",
    "/thinking-lab": "思考与方法",
};

function normalizeHref(href: string) {
    return href.length > 1 && href.endsWith("/") ? href.slice(0, -1) : href;
}

function normalizeRouteSegment(segment: string) {
    return segment.replace(
        LABELED_INTERNAL_ROUTE_PATTERN,
        (_match: string, label: string, href: string) => `[${label}](${normalizeHref(href)})`,
    ).replace(
        INTERNAL_ROUTE_PATTERN,
        (match: string, prefix: string, href: string, offset: number, source: string) => {
            const routeStart = offset + prefix.length;
            const isMarkdownLinkTarget =
                source[routeStart - 1] === "(" && source[routeStart - 2] === "]";
            if (isMarkdownLinkTarget) return match;

            const normalizedHref = normalizeHref(href);
            const label = ROUTE_LABELS[normalizedHref] ?? normalizedHref;
            return `${prefix}[${label}](${normalizedHref})`;
        },
    );
}

export function normalizeChatInternalLinks(markdown: string) {
    return markdown
        .split(CODE_SEGMENT_PATTERN)
        .map((segment) => {
            if (!segment) return segment;
            if (segment.startsWith("`")) return segment;
            return normalizeRouteSegment(segment);
        })
        .join("");
}
