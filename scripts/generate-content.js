/**
 * Prebuild script: Generate static content from markdown files + Notion databases
 * Run this before next build to create content data for static export
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const contentDirectory = path.join(process.cwd(), 'content');
const outputDirectory = path.join(process.cwd(), 'src', 'lib', 'data', 'generated');
const tsOutputPath = path.join(outputDirectory, 'content.ts');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_AI_DB = process.env.NOTION_AI_DATABASE_ID;
const NOTION_FINANCE_DB = process.env.NOTION_FINANCE_DATABASE_ID;

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
        return { ai: [], finance: [], essays: [] };
    }

    try {
        const source = fs.readFileSync(tsOutputPath, 'utf-8');
        const ai = extractGeneratedArray(source, 'aiContent');
        const essays = extractGeneratedArray(source, 'essaysContent');
        return {
            ai: ai.filter((item) => !isEssayItem(item)),
            finance: extractGeneratedArray(source, 'financeContent'),
            essays: essays.length > 0 ? essays : ai.filter(isEssayItem),
        };
    } catch (err) {
        console.warn(`  ⚠️  Could not read existing generated content: ${err.message}`);
        return { ai: [], finance: [], essays: [] };
    }
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
        item.title === '月光渡口';
}

function normalizeCategoryHref(item, category) {
    if ((category === 'ai' || category === 'essays') && (!item.href || item.href.startsWith('/article/'))) {
        return { ...item, href: `/article/${category}/${item.slug}` };
    }
    return item;
}

function renumberContent(items) {
    return items.map((item, index) => ({ ...item, id: index + 1 }));
}

const existingGeneratedContent = loadExistingGeneratedContent();

function getMarkdownContent(category) {
    const categoryPath = path.join(contentDirectory, category);
    if (!fs.existsSync(categoryPath)) return [];

    const filenames = fs.readdirSync(categoryPath).filter(f => f.endsWith('.md'));
    return filenames.map((filename) => {
        const filePath = path.join(categoryPath, filename);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const { data, content } = matter(fileContent);
        const slug = filename.replace(/\.md$/, '');
        return {
            slug,
            title: data.title || slug,
            description: data.description || '',
            date: data.date || '',
            category: data.category || null,
            href: data.href || `/article/${category}/${slug}`,
            content: content.trim(),
            source: 'markdown',
        };
    });
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

async function getMergedContent(category, databaseId) {
    const local = getMarkdownContent(category);
    const fallback = (existingGeneratedContent[category] || [])
        .filter((item) => item.source === 'notion')
        .map(withoutGeneratedId);
    const notion = await getNotionContent(category, databaseId, fallback);
    const seen = new Set(local.map((a) => a.slug));
    const merged = [...local];
    for (const article of notion) {
        if (!seen.has(article.slug)) merged.push(article);
    }
    merged.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.localeCompare(a.date);
    });
    return merged.map((item) => normalizeCategoryHref(item, category))
        .map((item, i) => ({ id: i + 1, ...item }));
}

async function main() {
    console.log('📚 Generating content from markdown + Notion...');

    if (!fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory, { recursive: true });
    }

    const aiContent = renumberContent((await getMergedContent('ai', NOTION_AI_DB)).filter((item) => !isEssayItem(item)));
    console.log(`  ✅ Total AI articles: ${aiContent.length}`);

    const financeContent = await getMergedContent('finance', NOTION_FINANCE_DB);
    console.log(`  ✅ Total Finance articles: ${financeContent.length}`);

    const essaysContent = await getMergedContent('essays', null);
    console.log(`  ✅ Total Essays: ${essaysContent.length}`);

    const tsContent = `// Auto-generated content data from markdown + Notion
// Generated at: ${new Date().toISOString()}
// DO NOT EDIT MANUALLY - run 'npm run prebuild' to regenerate

export interface ContentItem {
    id: number;
    slug: string;
    title: string;
    description: string;
    date: string;
    category: string | null;
    href: string;
    content: string;
    source?: string;
}

export const aiContent: ContentItem[] = ${JSON.stringify(aiContent, null, 2)};

export const financeContent: ContentItem[] = ${JSON.stringify(financeContent, null, 2)};

export const essaysContent: ContentItem[] = ${JSON.stringify(essaysContent, null, 2)};

export function getContentBySlug(category: 'ai' | 'finance' | 'essays', slug: string): ContentItem | undefined {
    const content = category === 'ai' ? aiContent : category === 'finance' ? financeContent : essaysContent;
    return content.find(item => item.slug === slug);
}
`;

    if (
        JSON.stringify(existingGeneratedContent.ai) === JSON.stringify(aiContent) &&
        JSON.stringify(existingGeneratedContent.finance) === JSON.stringify(financeContent) &&
        JSON.stringify(existingGeneratedContent.essays) === JSON.stringify(essaysContent)
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
