/**
 * Prebuild script: Generate static content from markdown files + Notion databases
 * Run this before next build to create content data for static export
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const contentDirectory = path.join(process.cwd(), 'content');
const outputDirectory = path.join(process.cwd(), 'src', 'lib', 'data', 'generated');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_AI_DB = process.env.NOTION_AI_DATABASE_ID;
const NOTION_FINANCE_DB = process.env.NOTION_FINANCE_DATABASE_ID;

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

async function getNotionContent(category, databaseId) {
    if (!NOTION_TOKEN || !databaseId) {
        console.log(`  ⏭️  Skipping Notion ${category} (no token or database ID)`);
        return [];
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
        return [];
    }
}

async function getMergedContent(category, databaseId) {
    const local = getMarkdownContent(category);
    const notion = await getNotionContent(category, databaseId);
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
    return merged.map((item, i) => ({ id: i + 1, ...item }));
}

async function main() {
    console.log('📚 Generating content from markdown + Notion...');

    if (!fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory, { recursive: true });
    }

    const aiContent = await getMergedContent('ai', NOTION_AI_DB);
    console.log(`  ✅ Total AI articles: ${aiContent.length}`);

    const financeContent = await getMergedContent('finance', NOTION_FINANCE_DB);
    console.log(`  ✅ Total Finance articles: ${financeContent.length}`);

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

export function getContentBySlug(category: 'ai' | 'finance', slug: string): ContentItem | undefined {
    const content = category === 'ai' ? aiContent : financeContent;
    return content.find(item => item.slug === slug);
}
`;

    const tsOutputPath = path.join(outputDirectory, 'content.ts');
    fs.writeFileSync(tsOutputPath, tsContent);
    console.log(`  📄 Generated: ${tsOutputPath}`);
    console.log('✨ Content generation complete!');
}

main().catch((err) => {
    console.error('❌ Content generation failed:', err);
    process.exit(1);
});
