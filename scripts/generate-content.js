/**
 * Prebuild script: Generate static content from markdown files + Notion databases
 * Run this before next build to create content data for static export
 */

const fs = require('fs');
const path = require('path');

const outputDirectory = path.join(process.cwd(), 'src', 'lib', 'data', 'generated');
const tsOutputPath = path.join(outputDirectory, 'content.ts');
const financeRegistryPath = path.join(process.cwd(), 'src', 'lib', 'finance', 'model-registry.json');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_AI_DB = process.env.NOTION_AI_DATABASE_ID;
const NOTION_FINANCE_DB = process.env.NOTION_FINANCE_DATABASE_ID;

const SEMANTIC_SLUG_OVERRIDES = {
    ai: {
        'notion-24ae349d753a': 'humanities-ai-guide',
        '给人文工作者的 AI 使用指南': 'humanities-ai-guide',
    },
    finance: {
        'notion-fbde349d753a': 'gold-stock-selloff-iran-war-2026',
        '当避险失灵：2026美伊战争后股市与黄金双杀的深层逻辑': 'gold-stock-selloff-iran-war-2026',
    },
    essays: {
        'notion-fbde349d753a': 'gold-stock-selloff-iran-war-2026',
        '当避险失灵：2026美伊战争后股市与黄金双杀的深层逻辑': 'gold-stock-selloff-iran-war-2026',
        'notion-355e349d753a': 'moonlight-ferry',
        '月光渡口': 'moonlight-ferry',
    },
};

function getSemanticSlug(category, item) {
    const overrides = SEMANTIC_SLUG_OVERRIDES[category] || {};
    return overrides[item.slug] || overrides[item.title] || item.slug;
}

function extractGeneratedArray(source, exportName) {
    const marker = `export const ${exportName}: ContentItem[] = `;
    const markerIndex = source.indexOf(marker);
    if (markerIndex === -1) return [];

    const arrayStart = source.indexOf('[', markerIndex + marker.length);
    if (arrayStart === -1) return [];

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = arrayStart; i < source.length; i++) {
        const char = source[i];

        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === '"') {
                inString = false;
            }
            continue;
        }

        if (char === '"') {
            inString = true;
        } else if (char === '[') {
            depth++;
        } else if (char === ']') {
            depth--;
            if (depth === 0) {
                return JSON.parse(source.slice(arrayStart, i + 1));
            }
        }
    }

    return [];
}

function loadExistingGeneratedContent() {
    if (!fs.existsSync(tsOutputPath)) {
        return { ai: [], finance: [], essays: [], thinking: [] };
    }

    try {
        const source = fs.readFileSync(tsOutputPath, 'utf-8');
        const ai = extractGeneratedArray(source, 'aiContent');
        const essays = extractGeneratedArray(source, 'essaysContent');
        const finance = extractGeneratedArray(source, 'financeContent');
        return {
            ai: ai.filter((item) => !isEssayItem(item)),
            finance: finance.filter((item) => !isEssayItem(item)),
            thinking: extractGeneratedArray(source, 'thinkingContent'),
            essays: dedupeContentItems([
                ...essays,
                ...ai.filter(isEssayItem),
                ...finance.filter(isEssayItem),
            ]),
        };
    } catch (err) {
        console.warn(`  ⚠️  Could not read existing generated content: ${err.message}`);
        return { ai: [], finance: [], essays: [], thinking: [] };
    }
}

function hasLegacyGeneratedExports() {
    if (!fs.existsSync(tsOutputPath)) return false;
    const source = fs.readFileSync(tsOutputPath, 'utf-8');
    return /export const (aiContent|essaysContent)|export function getContentBySlug/.test(source);
}

function withoutGeneratedId(item) {
    const copy = { ...item };
    delete copy.id;
    return copy;
}

function isEssayItem(item) {
    const category = String(item.category || '').toLowerCase();
    return category === 'essay' ||
        category === 'essays' ||
        category === '随笔' ||
        item.title === '月光渡口' ||
        item.title === '当避险失灵：2026美伊战争后股市与黄金双杀的深层逻辑' ||
        item.slug === 'notion-fbde349d753a' ||
        item.slug === 'gold-stock-selloff-iran-war-2026';
}

function normalizeThinkingHref(item, legacyCategory) {
    const previousSlug = item.slug;
    const slug = getSemanticSlug(legacyCategory, item);
    const aliases = new Set(item.aliases || []);

    if (previousSlug !== slug) {
        aliases.add(previousSlug);
    }

    return {
        ...item,
        slug,
        legacyCategory,
        href: `/thinking-lab/${slug}`,
        ...(aliases.size > 0 ? { aliases: Array.from(aliases) } : {}),
    };
}

function renumberContent(items) {
    return items.map((item, index) => ({ ...item, id: index + 1 }));
}

function dedupeContentItems(items) {
    const seen = new Set();
    const result = [];
    for (const item of items) {
        const key = item.slug || item.title;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(item);
    }
    return result;
}

function sortContentByDateDesc(a, b) {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
}

const existingGeneratedContent = loadExistingGeneratedContent();

function getFinanceRegistryContent() {
    const registry = JSON.parse(fs.readFileSync(financeRegistryPath, 'utf-8'));
    return registry.models.map((model) => ({
        slug: model.slug,
        title: model.title,
        description: model.summary,
        date: model.date,
        category: model.categoryId,
        href: model.href,
        content: [
            model.aiGuide.purpose,
            '',
            '使用步骤：',
            ...model.aiGuide.steps.map((step, index) => `${index + 1}. ${step}`),
        ].join('\n'),
        source: 'registry',
    }));
}

async function getNotionContent(category, databaseId, fallbackArticles) {
    if (!NOTION_TOKEN || !databaseId) {
        console.log(`  ⏭️  Skipping Notion ${category} (no token or database ID)`);
        if (fallbackArticles.length > 0) {
            console.log(`  ↩️  Reusing ${fallbackArticles.length} existing Notion ${category} articles`);
        }
        return fallbackArticles;
    }

    const { Client } = require('@notionhq/client');
    const { NotionToMarkdown } = require('notion-to-md');
    const notion = new Client({ auth: NOTION_TOKEN });
    const n2m = new NotionToMarkdown({ notionClient: notion });

    try {
        const response = await notion.databases.query({
            database_id: databaseId,
            filter: {
                property: '已发布',
                checkbox: { equals: true },
            },
            sorts: [{ property: '日期', direction: 'descending' }],
        });

        const articles = [];
        for (const page of response.results) {
            const props = page.properties;
            const titleProp = props['名称']?.title || [];
            const title = titleProp.map((t) => t.plain_text).join('').trim();
            if (!title) continue;

            const descProp = props['描述']?.rich_text || [];
            const description = descProp.map((t) => t.plain_text).join('').trim();
            const date = props['日期']?.date?.start || page.created_time.slice(0, 10);

            const slug = 'notion-' + page.id.replace(/-/g, '').slice(0, 12);

            // Convert page blocks to markdown
            const mdBlocks = await n2m.pageToMarkdown(page.id);
            const mdString = n2m.toMarkdownString(mdBlocks);
            const content = (mdString.parent || '').trim().replace(/\n{3,}/g, '\n\n');

            articles.push({
                slug,
                title,
                description: description || title,
                date,
                category: null,
                href: `/article/${category}/${slug}`,
                content,
                source: 'notion',
            });
        }

        console.log(`  ✅ Fetched ${articles.length} ${category} articles from Notion`);
        return articles;
    } catch (err) {
        console.error(`  ⚠️  Notion ${category} fetch failed:`, err.message);
        if (fallbackArticles.length > 0) {
            console.log(`  ↩️  Reusing ${fallbackArticles.length} existing Notion ${category} articles`);
        }
        return fallbackArticles;
    }
}

async function main() {
    console.log('📚 Generating content from markdown + Notion...');

    if (!fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory, { recursive: true });
    }

    const financeContent = renumberContent(getFinanceRegistryContent());
    console.log(`  ✅ Total Finance models: ${financeContent.length}`);

    const existingThinking = (existingGeneratedContent.thinking || [])
        .filter((item) => item.source === 'notion')
        .map(withoutGeneratedId);
    const existingAiThinking = existingThinking.filter((item) => item.legacyCategory === 'ai');
    const existingFinanceThinking = existingThinking.filter((item) => item.legacyCategory === 'finance');
    const existingEssayThinking = existingThinking.filter((item) => item.legacyCategory === 'essays');

    const aiFallback = dedupeContentItems([
        ...existingAiThinking,
        ...(existingGeneratedContent.ai || [])
            .filter((item) => item.source === 'notion')
            .map(withoutGeneratedId),
    ]);
    const aiThinkingContent = (await getNotionContent('ai', NOTION_AI_DB, aiFallback))
        .map((item) => normalizeThinkingHref(item, 'ai'));

    const financeFallback = dedupeContentItems([
        ...existingFinanceThinking,
        ...(existingGeneratedContent.finance || [])
            .filter((item) => item.source === 'notion')
            .map(withoutGeneratedId),
    ]);
    const financeThinkingContent = (await getNotionContent('finance', NOTION_FINANCE_DB, financeFallback))
        .filter((item) => item.source === 'notion')
        .map((item) => normalizeThinkingHref(item, 'finance'));

    const essayFallback = dedupeContentItems([
        ...existingEssayThinking,
        ...(existingGeneratedContent.essays || [])
            .filter((item) => item.source === 'notion')
            .map(withoutGeneratedId),
    ]);
    const essayThinkingContent = essayFallback.map((item) => normalizeThinkingHref(item, 'essays'));

    const thinkingContent = renumberContent(dedupeContentItems([
        ...aiThinkingContent,
        ...financeThinkingContent,
        ...essayThinkingContent,
    ]).sort(sortContentByDateDesc));
    console.log(`  ✅ Total Thinking Lab articles: ${thinkingContent.length}`);

    const tsContent = `// Auto-generated content data from markdown + Notion
// Generated at: ${new Date().toISOString()}
// DO NOT EDIT MANUALLY - run 'npm run prebuild' to regenerate

export interface ContentItem {
    id: number;
    slug: string;
    aliases?: string[];
    legacyCategory?: string;
    title: string;
    description: string;
    date: string;
    category: string | null;
    href: string;
    content: string;
    source?: string;
}

export const financeContent: ContentItem[] = ${JSON.stringify(financeContent, null, 2)};

export const thinkingContent: ContentItem[] = ${JSON.stringify(thinkingContent, null, 2)};

export function getThinkingBySlug(slug: string): ContentItem | undefined {
    return thinkingContent.find(item => item.slug === slug || item.aliases?.includes(slug));
}
`;

    if (
        JSON.stringify(existingGeneratedContent.finance) === JSON.stringify(financeContent) &&
        JSON.stringify(existingGeneratedContent.thinking || []) === JSON.stringify(thinkingContent) &&
        !hasLegacyGeneratedExports()
    ) {
        console.log('  ✅ Content unchanged; keeping existing generated file');
        console.log('✨ Content generation complete!');
        return;
    }

    fs.writeFileSync(tsOutputPath, tsContent);
    console.log(`  📄 Generated: ${tsOutputPath}`);
    console.log('✨ Content generation complete!');
}

main().catch((err) => {
    console.error('❌ Content generation failed:', err);
    process.exit(1);
});
