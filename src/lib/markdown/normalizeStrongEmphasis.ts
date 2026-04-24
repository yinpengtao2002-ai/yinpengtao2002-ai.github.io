const ZERO_WIDTH_SPACE = "\u200B";
const FENCE_LINE_PATTERN = /^[ \t]{0,3}(`{3,}|~{3,})/;
const STRONG_SPAN_PATTERN = /\*\*((?:\\.|(?!\*\*)[\s\S])+?)\*\*/g;

function isBoundaryCharacter(char: string | undefined) {
    return !char || /\s|\p{P}/u.test(char);
}

function isPunctuation(char: string | undefined) {
    return !!char && /\p{P}/u.test(char);
}

function normalizeStrongSpans(segment: string) {
    return segment.replace(STRONG_SPAN_PATTERN, (match, content: string, offset: number, source: string) => {
        const before = source[offset - 1];
        const after = source[offset + match.length];
        const first = content[0];
        const last = content[content.length - 1];
        let nextContent = content;

        if (isPunctuation(first) && !isBoundaryCharacter(before) && !content.startsWith(ZERO_WIDTH_SPACE)) {
            nextContent = `${ZERO_WIDTH_SPACE}${nextContent}`;
        }

        if (isPunctuation(last) && !isBoundaryCharacter(after) && !content.endsWith(ZERO_WIDTH_SPACE)) {
            nextContent = `${nextContent}${ZERO_WIDTH_SPACE}`;
        }

        return `**${nextContent}**`;
    });
}

function normalizeInlineMarkdown(line: string) {
    let result = "";
    let normalStart = 0;
    let index = 0;

    while (index < line.length) {
        if (line[index] !== "`") {
            index += 1;
            continue;
        }

        const tickMatch = /^`+/.exec(line.slice(index));
        if (!tickMatch) {
            index += 1;
            continue;
        }

        const tickRun = tickMatch[0];
        const codeEnd = line.indexOf(tickRun, index + tickRun.length);

        if (codeEnd === -1) {
            break;
        }

        result += normalizeStrongSpans(line.slice(normalStart, index));
        result += line.slice(index, codeEnd + tickRun.length);
        index = codeEnd + tickRun.length;
        normalStart = index;
    }

    return result + normalizeStrongSpans(line.slice(normalStart));
}

export function normalizeMarkdownStrongEmphasis(markdown: string) {
    let inFence = false;

    return markdown
        .split(/(?<=\n)/)
        .map((line) => {
            const fenceMatch = line.match(FENCE_LINE_PATTERN);

            if (fenceMatch) {
                inFence = !inFence;
                return line;
            }

            if (inFence) {
                return line;
            }

            return normalizeInlineMarkdown(line);
        })
        .join("");
}
