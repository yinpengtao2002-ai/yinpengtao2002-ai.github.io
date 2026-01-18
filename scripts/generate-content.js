/**
 * Prebuild script: Generate static JSON from markdown files
 * Run this before next build to create content data for static export
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const contentDirectory = path.join(process.cwd(), 'content');
const outputDirectory = path.join(process.cwd(), 'src', 'lib', 'data', 'generated');

function getContentByCategory(category) {
    const categoryPath = path.join(contentDirectory, category);

    if (!fs.existsSync(categoryPath)) {
        return [];
    }

    const filenames = fs.readdirSync(categoryPath).filter(f => f.endsWith('.md'));

    const items = filenames.map((filename, index) => {
        const filePath = path.join(categoryPath, filename);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const { data, content } = matter(fileContent);

        const slug = filename.replace(/\.md$/, '');

        // Auto-generate href if not specified - use dynamic article route
        const autoHref = data.href || `/article/${category}/${slug}`;

        return {
            id: index + 1,
            slug,
            title: data.title || slug,
            description: data.description || '',
            date: data.date || '',
            category: data.category || null,
            href: autoHref,
            content: content.trim(), // Include markdown content for article pages
        };
    });

    // Sort by date descending (newest first)
    return items.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.localeCompare(a.date);
    });
}

function main() {
    console.log('📚 Generating content data from markdown files...');

    // Ensure output directory exists
    if (!fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory, { recursive: true });
    }

    // Generate AI content
    const aiContent = getContentByCategory('ai');
    console.log(`  ✅ Found ${aiContent.length} AI articles`);

    // Generate Finance content
    const financeContent = getContentByCategory('finance');
    console.log(`  ✅ Found ${financeContent.length} Finance projects`);

    // Write combined data file
    const contentData = {
        ai: aiContent,
        finance: financeContent,
        generatedAt: new Date().toISOString(),
    };

    const outputPath = path.join(outputDirectory, 'content.json');
    fs.writeFileSync(outputPath, JSON.stringify(contentData, null, 2));
    console.log(`  📄 Generated: ${outputPath}`);

    // Also write TypeScript module for type-safe imports
    const tsContent = `// Auto-generated content data from markdown files
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
}

export const aiContent: ContentItem[] = ${JSON.stringify(aiContent, null, 2)};

export const financeContent: ContentItem[] = ${JSON.stringify(financeContent, null, 2)};

// Helper to find content by slug
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

main();
