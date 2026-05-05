const CODE_SEGMENT_PATTERN = /(```[\s\S]*?```|`[^`\n]*`)/g;

function normalizeMathSegment(segment: string) {
    return segment
        .replace(/\\\[([\s\S]*?)\\\]/g, (_, math: string) => {
            const body = math.trim();
            return body ? `$$\n${body}\n$$` : "";
        })
        .replace(/\\\(([\s\S]*?)\\\)/g, (_, math: string) => {
            const body = math.trim();
            return body ? `$${body}$` : "";
        });
}

export function normalizeChatMathMarkdown(markdown: string) {
    return markdown
        .split(CODE_SEGMENT_PATTERN)
        .map((segment) => {
            if (!segment) return segment;
            if (segment.startsWith("`")) return segment;
            return normalizeMathSegment(segment);
        })
        .join("");
}
