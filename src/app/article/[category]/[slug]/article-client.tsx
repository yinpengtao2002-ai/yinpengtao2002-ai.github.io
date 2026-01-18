"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Check, Info, AlertTriangle, XCircle, Flame, Quote, FileText, HelpCircle, AlertCircle, Bookmark, PenTool, Lightbulb, Calendar, Tag, Link as LinkIcon, Hash } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ContentItem } from "@/lib/data/generated/content";
import mermaid from "mermaid";
import { useLayoutEffect, useRef, useState, ReactNode } from "react";
// Import Widgets from Hero
import ArtifactCard, { CodeArtifact, ChartArtifact, ImageArtifact, MusicArtifact, SecureArtifact } from "@/components/ui/ArtifactCard";

// Obsidian Font Stack (Inter preferred, then system)
const obsidianFont = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const monoFont = "'JetBrains Mono', 'Fira Code', monospace";

interface ArticleClientProps {
    article: ContentItem;
    category: 'ai' | 'finance';
}

// ----------------------------------------------------------------------
// 1. Obsidian Callout Colors (Pastel / Morandi - Light Mode)
// ----------------------------------------------------------------------
// No left border, full background, gentle colors
const calloutStyles: Record<string, { bg: string, text: string, icon: any, title?: string, iconColor: string }> = {
    // Note - Blue/Grayish
    note: { bg: "bg-[#eef9fd]", text: "text-[#404040]", iconColor: "text-[rgb(8,109,221)]", icon: PenTool, title: "Note" },

    // Abstract/Summary - Cyan/Teal
    abstract: { bg: "bg-[#eef9fd]", text: "text-[#404040]", iconColor: "text-[rgb(0,184,212)]", icon: FileText, title: "Abstract" },
    summary: { bg: "bg-[#eef9fd]", text: "text-[#404040]", iconColor: "text-[rgb(0,184,212)]", icon: FileText, title: "Summary" },
    tldr: { bg: "bg-[#eef9fd]", text: "text-[#404040]", iconColor: "text-[rgb(0,184,212)]", icon: FileText, title: "TL;DR" },

    // Info - Blue
    info: { bg: "bg-[#eef9fd]", text: "text-[#404040]", iconColor: "text-[rgb(8,109,221)]", icon: Info, title: "Info" },
    todo: { bg: "bg-[#eef9fd]", text: "text-[#404040]", iconColor: "text-[rgb(8,109,221)]", icon: Check, title: "To Do" },

    // Tip/Hint - Greenish/Mint
    tip: { bg: "bg-[#effcf6]", text: "text-[#404040]", iconColor: "text-[rgb(0,191,188)]", icon: Lightbulb, title: "Tip" },
    hint: { bg: "bg-[#effcf6]", text: "text-[#404040]", iconColor: "text-[rgb(0,191,188)]", icon: Lightbulb, title: "Hint" },

    // Important - Yellow/Orangeish fit
    important: { bg: "bg-[#fffbe6]", text: "text-[#404040]", iconColor: "text-[rgb(255,169,77)]", icon: Flame, title: "Important" },

    // Success/Check - Green
    success: { bg: "bg-[#effcf6]", text: "text-[#404040]", iconColor: "text-[rgb(8,185,78)]", icon: Check, title: "Success" },
    check: { bg: "bg-[#effcf6]", text: "text-[#404040]", iconColor: "text-[rgb(8,185,78)]", icon: Check, title: "Check" },
    done: { bg: "bg-[#effcf6]", text: "text-[#404040]", iconColor: "text-[rgb(8,185,78)]", icon: Check, title: "Done" },

    // Question/Help - Yellow
    question: { bg: "bg-[#fffbe6]", text: "text-[#404040]", iconColor: "text-[rgb(236,193,0)]", icon: HelpCircle, title: "Question" },
    help: { bg: "bg-[#fffbe6]", text: "text-[#404040]", iconColor: "text-[rgb(236,193,0)]", icon: HelpCircle, title: "Help" },
    faq: { bg: "bg-[#fffbe6]", text: "text-[#404040]", iconColor: "text-[rgb(236,193,0)]", icon: HelpCircle, title: "FAQ" },

    // Warning - Orange
    warning: { bg: "bg-[#fff7e6]", text: "text-[#404040]", iconColor: "text-[rgb(236,117,0)]", icon: AlertTriangle, title: "Warning" },
    caution: { bg: "bg-[#fff7e6]", text: "text-[#404040]", iconColor: "text-[rgb(236,117,0)]", icon: AlertTriangle, title: "Caution" },
    attention: { bg: "bg-[#fff7e6]", text: "text-[#404040]", iconColor: "text-[rgb(236,117,0)]", icon: AlertTriangle, title: "Attention" },

    // Failure/Bug - Red
    failure: { bg: "bg-[#fff1f0]", text: "text-[#404040]", iconColor: "text-[rgb(233,49,71)]", icon: XCircle, title: "Failure" },
    missing: { bg: "bg-[#fff1f0]", text: "text-[#404040]", iconColor: "text-[rgb(233,49,71)]", icon: XCircle, title: "Missing" },
    bug: { bg: "bg-[#fff1f0]", text: "text-[#404040]", iconColor: "text-[rgb(233,49,71)]", icon: XCircle, title: "Bug" },
    danger: { bg: "bg-[#fff1f0]", text: "text-[#404040]", iconColor: "text-[rgb(233,49,71)]", icon: Flame, title: "Danger" },
    error: { bg: "bg-[#fff1f0]", text: "text-[#404040]", iconColor: "text-[rgb(233,49,71)]", icon: XCircle, title: "Error" },

    // Example - Purple
    example: { bg: "bg-[#f9f0ff]", text: "text-[#404040]", iconColor: "text-[rgb(120,82,238)]", icon: FileText, title: "Example" },

    // Quote - Simple gray
    quote: { bg: "bg-transparent", text: "text-gray-600", iconColor: "text-gray-400", icon: Quote, title: "Quote" },
};

// Helper: Render Callout Logic
const renderCallout = (type: string, contentChildren: ReactNode[]) => {
    // Normalize type
    const normalizedType = type.toLowerCase();
    const style = calloutStyles[normalizedType] || calloutStyles['note'];
    const title = style.title || normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1);
    const Icon = style.icon || Info;

    // Remove the [!type] text from the first child if it's there
    const processedChildren = contentChildren.map((child, index) => {
        if (index === 0) {
            if (typeof child === 'string') {
                return child.replace(/^\[!(\w+)\](?:\s+[^\n]*)?\n?/, '');
            }
            if (child && typeof child === 'object' && 'props' in child) {
                const props = (child as any).props;
                if (props && props.children) {
                    const pContent = Array.isArray(props.children) ? props.children : [props.children];
                    const newContent = pContent.map((c: any) => {
                        if (typeof c === 'string') return c.replace(/^\[!(\w+)\](?:\s+[^\n]*)?\n?/, '');
                        return c;
                    });
                    return <span key={index}>{newContent}</span>;
                }
            }
        }
        return child;
    });

    return (
        <div className={`my-6 rounded-md ${style.bg} p-4 shadow-sm border border-transparent`}>
            {/* Title Line: Compact, Icon + Title */}
            <div className={`flex items-center gap-2 mb-2 font-bold ${style.iconColor} text-[15px]`}>
                <Icon className="w-4 h-4 fill-current opacity-90" />
                <span className="text-[#2e2e2e]">{title}</span>
            </div>
            {/* Content */}
            <div className={`ml-0 text-[#2e2e2e] leading-[1.7] ${style.text}`}>
                {processedChildren}
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// 2. Mermaid Chart Component (Clean White)
// ----------------------------------------------------------------------
const MermaidChart = ({ chart }: { chart: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState<string>("");

    useLayoutEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'base',
            themeVariables: {
                fontFamily: obsidianFont,
                primaryColor: '#ffffff',
                primaryTextColor: '#333333',
                primaryBorderColor: '#7e22ce', // Purple borders
                lineColor: '#9f7aea', // lighter purple lines
                secondaryColor: '#fafafa',
                tertiaryColor: '#ffffff',
                background: '#ffffff'
            },
            securityLevel: 'loose',
            fontFamily: obsidianFont
        });

        const renderChart = async () => {
            if (ref.current) {
                try {
                    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                    const { svg } = await mermaid.render(id, chart);
                    setSvg(svg);
                } catch (error) {
                    console.error("Mermaid rendering failed:", error);
                }
            }
        };

        renderChart();
    }, [chart]);

    return (
        <div
            ref={ref}
            className="my-10 flex justify-center bg-white rounded-lg border border-gray-100 p-6 shadow-sm overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
};

// ----------------------------------------------------------------------
// 3. Metadata Property Component
// ----------------------------------------------------------------------
const PropertyRow = ({ icon: Icon, label, children }: { icon: any, label: string, children: ReactNode }) => (
    <div className="flex items-start gap-4 py-1.5 text-[13px]">
        {/* Left: Icon + Label (Fixed width) */}
        <div className="flex items-center gap-2 w-[120px] shrink-0 text-gray-400 font-medium">
            <Icon className="w-4 h-4 text-gray-300" />
            <span>{label}</span>
        </div>
        {/* Right: Value */}
        <div className="flex-1 text-[#2e2e2e]">
            {children}
        </div>
    </div>
);

// ----------------------------------------------------------------------
// 4. Highlight Helper (Text Marker)
// ----------------------------------------------------------------------
const renderTextWithHighlights = (text: string) => {
    // Lazy match ==content== to avoid greedily grabbing multiple highlights as one
    const parts = text.split(/(==.+?==)/g);
    return parts.map((part, index) => {
        if (part.startsWith("==") && part.endsWith("==")) {
            return <mark key={index} className="bg-[#fff88f] text-[#222] px-0.5 rounded-sm mx-0.5 font-normal">{part.slice(2, -2)}</mark>;
        }
        return part;
    });
};


export default function ArticleClient({ article, category }: ArticleClientProps) {
    const accentColor = "#7e22ce";

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-[#f5f3ef] via-[#ebe7e0] to-[#e2ddd4] text-[#222] flex flex-col items-center" style={{ fontFamily: obsidianFont }}>

            {/* -----------------------------------------------------------------
                Dynamic Side Widgets (Fixed) - CENTERED ANCHOR FRAME
                ----------------------------------------------------------------- */}
            <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden hidden lg:flex">
                {/* 
                    Constrained Frame: 
                    - max-w-[1250px]: SLIGHTLY WIDER to push widgets away from paper (Breathing Room)
                    - w-full: Keeps widgets at edges on laptop screens
                    - px-4: Safety padding for edges
                */}
                <div className="relative w-full h-full max-w-[1250px] px-4">

                    {/* --- Left Side Widgets (Origin: LEFT) --- */}

                    {/* 1. Code Artifact: Top Left */}
                    <div className="absolute top-[15%] left-0 origin-left transition-transform duration-500 hover:scale-[1.6]">
                        <ArtifactCard delay={0.5} rotate={-6} initialY={-20} className="scale-110 xl:scale-135 2xl:scale-[1.8] opacity-60 hover:opacity-100 transition-opacity">
                            <CodeArtifact />
                        </ArtifactCard>
                    </div>

                    {/* 2. Image Artifact: CENTER Left */}
                    <div className="absolute top-[45%] left-2 origin-left transition-transform duration-500 hover:scale-[1.6]">
                        <ArtifactCard delay={1.2} rotate={3} initialY={10} className="scale-110 xl:scale-135 2xl:scale-[1.6] opacity-50 hover:opacity-100 transition-opacity">
                            <ImageArtifact />
                        </ArtifactCard>
                    </div>

                    {/* 3. Secure Widget: Bottom Left */}
                    <div className="absolute top-[75%] left-4 origin-left transition-transform duration-500 hover:scale-[1.6]">
                        <ArtifactCard delay={2.0} rotate={-2} initialY={0} className="scale-100 xl:scale-110 2xl:scale-[1.6] opacity-40 hover:opacity-100 transition-opacity">
                            <SecureArtifact />
                        </ArtifactCard>
                    </div>

                    {/* --- Right Side Widgets (Origin: RIGHT) --- */}

                    {/* 4. Chart Artifact: Top Right */}
                    <div className="absolute top-[20%] right-0 origin-right transition-transform duration-500 hover:scale-[1.6]">
                        <ArtifactCard delay={0.8} rotate={4} initialY={-10} className="scale-110 xl:scale-135 2xl:scale-[1.8] opacity-60 hover:opacity-100 transition-opacity">
                            <ChartArtifact />
                        </ArtifactCard>
                    </div>

                    {/* 5. Music Widget: MID-LOWER Right */}
                    <div className="absolute top-[60%] right-4 origin-right transition-transform duration-500 hover:scale-[1.6]">
                        <ArtifactCard delay={1.5} rotate={-3} initialY={15} className="scale-110 xl:scale-135 2xl:scale-[1.6] opacity-50 hover:opacity-100 transition-opacity">
                            <MusicArtifact />
                        </ArtifactCard>
                    </div>

                </div>
            </div>

            {/* Header - Transparent/Paper Logic */}
            <header className="sticky top-0 z-50 w-full flex justify-center pointer-events-none">
                {/* 900px Width to match Subtle Paper */}
                <div className="w-full max-w-[900px] bg-[#FBF9F6]/95 backdrop-blur-sm px-8 py-4 flex items-center justify-between pointer-events-auto border-b border-gray-100 transition-all duration-300">
                    <Link
                        href="/explore"
                        className="group inline-flex items-center gap-1.5 text-gray-400 hover:text-[#7e22ce] transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        <span className="text-[13px] font-medium text-gray-500 group-hover:text-[#7e22ce]">Back</span>
                    </Link>
                    <span className="text-[11px] font-mono text-gray-300 tracking-wider uppercase">
                        {category === 'ai' ? 'AI / Insights' : 'Finance / Models'}
                    </span>
                </div>
            </header>

            {/* Main Content Area */}
            <motion.main
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="relative z-10 w-full max-w-[900px] bg-[#FBF9F6] min-h-screen px-8 py-12 md:py-16 flex flex-col items-center shadow-[0_2px_20px_rgba(0,0,0,0.04)]"
            >
                {/* 
                    CONSTRAINED wrapper for content 
                    Keeps text width at ~760px while Paper is 900px 
                */}
                <div className="w-full max-w-[760px] mx-auto">

                    {/* Title */}
                    <h1 className="text-3xl md:text-4xl font-extrabold text-[#1a1a1a] mb-8 tracking-tight leading-[1.2] text-center">
                        {article.title}
                    </h1>

                    {/* Obsidian Properties Module (Metadata) */}
                    <div className="mb-12 pb-6 border-b border-gray-100 flex flex-col gap-1">

                        {/* Tags - Show Mock if empty for visuals */}
                        {(article.category || true) && (
                            <PropertyRow icon={Tag} label="tags">
                                <div className="flex flex-wrap gap-2">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f0f0ff] text-[#7e22ce]">
                                        #{article.category || 'finance'}
                                    </span>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f0f0ff] text-[#7e22ce]">
                                        #Obsidian
                                    </span>
                                </div>
                            </PropertyRow>
                        )}

                        {/* Date */}
                        {article.date && (
                            <PropertyRow icon={Calendar} label="created">
                                <span className="text-gray-600 font-mono text-xs">{article.date}</span>
                            </PropertyRow>
                        )}

                        {/* Link/Source (Mock for description) */}
                        {article.description && (
                            <PropertyRow icon={LinkIcon} label="source">
                                <span className="text-[#7e22ce] opacity-80 underline decoration-dotted underline-offset-4 cursor-pointer">
                                    {article.description}
                                </span>
                            </PropertyRow>
                        )}
                    </div>

                    <article className="
                        prose prose-lg max-w-none
                        text-[#2e2e2e]
                        mx-auto
                        
                        /* Typography & Spacing Overrides */
                        !leading-loose
                        prose-p:!text-[17px] md:prose-p:!text-[18px] 
                        prose-p:!mb-12
                        prose-p:text-justify
                        
                        /* Headings - Bolder */
                        prose-headings:text-[#111] prose-headings:tracking-tight
                        prose-h1:font-extrabold
                        
                        /* H2: ULTRA AGGRESSIVE SPACING (Major Blocks) */
                        prose-h2:!text-[28px] prose-h2:!font-bold prose-h2:!mt-32 prose-h2:!mb-10 prose-h2:border-b-0
                        
                        /* H3: Medium Spacing (Sub Blocks) */
                        prose-h3:!text-[22px] prose-h3:!font-bold prose-h3:!mt-20 prose-h3:!mb-6
                        
                        /* Links */
                        prose-a:text-[#7e22ce] prose-a:no-underline hover:prose-a:underline hover:prose-a:decoration-2
                        
                        /* Lists - Spacious, No markers if desired or subtle */
                        prose-li:!my-3 prose-li:text-[#2e2e2e] prose-li:!leading-[2.2]
                        
                        /* Blockquotes - Gray rounded block */
                        prose-blockquote:!border-l-0 prose-blockquote:bg-gray-50 prose-blockquote:rounded-lg prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:text-gray-500 prose-blockquote:italic prose-blockquote:mx-0
                        
                        /* Code */
                        prose-code:text-[#d33a6f] prose-code:bg-transparent prose-code:px-0 prose-code:font-medium
                        prose-pre:bg-[#1e1e1e] prose-pre:text-[#dedede] prose-pre:rounded-lg prose-pre:shadow-md
                        
                        /* Images */
                        prose-img:rounded-md prose-img:shadow-sm
                        prose-hr:my-20 prose-hr:border-gray-100
                    ">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                code({ node, inline, className, children, ...props }: any) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    const codeContent = String(children).replace(/\n$/, '');
                                    if (!inline && match && match[1] === 'mermaid') {
                                        return <MermaidChart chart={codeContent} />;
                                    }
                                    return !inline && match ? (
                                        <pre className={className} style={{ fontFamily: monoFont }}>
                                            <code className={className} {...props}>{children}</code>
                                        </pre>
                                    ) : (
                                        <code className={className} style={{ fontFamily: monoFont }} {...props}>{children}</code>
                                    );
                                },

                                blockquote({ className, children, ...props }: any) {
                                    const childrenArray = Array.isArray(children) ? children : [children];
                                    let match = null;

                                    // Same logic for callout detection
                                    for (let i = 0; i < childrenArray.length; i++) {
                                        const child = childrenArray[i];
                                        if (child?.type === 'p' && child.props?.children) {
                                            const pContent = Array.isArray(child.props.children) ? child.props.children[0] : child.props.children;
                                            if (typeof pContent === 'string') {
                                                const m = pContent.match(/^\[!(\w+)\](?:\s+([^\n]*))?/);
                                                if (m) match = m;
                                            }
                                        }
                                    }

                                    if (match) {
                                        return renderCallout(match[1], childrenArray);
                                    }

                                    // Custom Blockquote Style (if not callout)
                                    return (
                                        <div className="my-8 bg-gray-50 rounded-lg p-6 border border-gray-100 text-gray-600 italic">
                                            {children}
                                        </div>
                                    );
                                },

                                p({ children, ...props }: any) {
                                    const childrenArray = Array.isArray(children) ? children : [children];
                                    const firstChild = childrenArray[0];

                                    // Handle orphaned callouts
                                    if (typeof firstChild === 'string') {
                                        const match = firstChild.match(/^\[!(\w+)\](?:\s+([^\n]*))?/);
                                        if (match) {
                                            return renderCallout(match[1], childrenArray);
                                        }
                                    }

                                    // Process Highlights (==text==)
                                    // We need to verify if children contain highlight syntax
                                    // If children is a string, process it.
                                    // If array, map it.
                                    const processContent = (content: any): any => {
                                        if (typeof content === 'string') {
                                            return renderTextWithHighlights(content);
                                        }
                                        if (Array.isArray(content)) {
                                            return content.map((c, i) => <span key={i}>{processContent(c)}</span>);
                                        }
                                        if (content?.props?.children) {
                                            return <span className={content.props.className}>{processContent(content.props.children)}</span>;
                                        }
                                        return content;
                                    }

                                    return <p {...props}>{processContent(children)}</p>;
                                },

                                // Table Styling - Minimalist
                                table({ children }) {
                                    return (
                                        <div className="overflow-x-auto my-8">
                                            <table className="w-full text-left border-collapse">{children}</table>
                                        </div>
                                    );
                                },
                                thead({ children }) {
                                    return <thead className="border-b border-gray-200 text-gray-800 font-bold bg-transparent">{children}</thead>
                                },
                                tbody({ children }) {
                                    return <tbody className="text-gray-600">{children}</tbody>
                                },
                                tr({ children }) {
                                    return <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">{children}</tr>
                                },
                                th({ children }) {
                                    return <th className="py-3 px-4 whitespace-nowrap font-bold text-sm tracking-wide">{children}</th>
                                },
                                td({ children }) {
                                    return <td className="py-4 px-4 text-[16px]">{children}</td>
                                }
                            }}
                        >
                            {article.content}
                        </ReactMarkdown>
                    </article>

                    <div className="mt-28 pt-8 border-t border-gray-100 flex flex-col items-center">
                        <p className="text-[11px] text-gray-300 font-mono tracking-widest uppercase">Obsidian Mode</p>
                    </div>
                </div>
            </motion.main>
        </div>
    );
}
