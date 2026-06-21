"use client";

import { useState, useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties } from "react";
import { motion, AnimatePresence, useDragControls, type PanInfo } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { MessageCircle, X, ArrowUp, ExternalLink } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { CHAT_API_TIMEOUT_MS, getLocalFallbackResponse } from "@/lib/chatFallback";
import { financeContent as staticFinance, type ContentItem } from "@/lib/data/generated/content";
import { thinkingLabContent as staticThinking } from "@/lib/data/thinkingLabContent";
import { financeModels, type FinanceModelItem } from "@/lib/finance/modelRegistry";
import { normalizeChatInternalLinks } from "@/lib/markdown/normalizeChatInternalLinks";
import { normalizeChatMathMarkdown } from "@/lib/markdown/normalizeChatMathMarkdown";
import {
    getMarkdownRouteBlocks,
    normalizeInternalHref,
    type InternalRouteCard,
} from "@/lib/chatRouteCards";
import { useViewportProfile } from "@/lib/useLowMotionMode";

type ContentCardType = "finance" | "thinking";

interface ContentCard {
    id: number;
    title: string;
    description: string;
    category?: string;
    date: string;
    href: string;
    content?: string;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    isTyping?: boolean;
    contentCards?: ContentCard[];
    cardType?: ContentCardType;
}

const MOBILE_QUICK_PROMPTS = [
    "哪个模型适合预算复盘？",
    "我该先看哪个模型？",
    "推荐一篇思考文章",
];
const MODEL_ASSISTANT_QUICK_PROMPTS = [
    "适用场景",
    "操作步骤",
    "字段说明",
    "常见误区",
];
const ARTICLE_ASSISTANT_QUICK_PROMPTS = [
    "总结这篇文章",
    "核心观点",
    "段落逻辑",
    "相关模型",
];
const AI_ASSISTANT_SCOPE = "模型选择、使用说明、图表阅读和文章推荐";

const CHAT_UI_FONT =
    'var(--font-poppins), "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';

const focusableSelectors = [
    "a[href]",
    "button:not([disabled])",
    "textarea:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
].join(",");

function resizeChatInput(element: HTMLTextAreaElement | null, maxHeight: number) {
    if (!element) return;

    element.style.height = "auto";
    const nextHeight = Math.min(element.scrollHeight, maxHeight);
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = element.scrollHeight > maxHeight ? "auto" : "hidden";
}

function getCurrentFinanceModelSlug(pathname: string) {
    const normalizedPathname = normalizeInternalHref(pathname);
    return financeModels.find((model) => normalizeInternalHref(model.href) === normalizedPathname)?.slug ?? null;
}

function getCurrentThinkingArticle(pathname: string, thinkingContent: ContentItem[]) {
    const normalizedPathname = normalizeInternalHref(pathname);
    if (!normalizedPathname.startsWith("/thinking-lab/")) return undefined;

    return thinkingContent.find((item) => (
        normalizeInternalHref(item.href) === normalizedPathname ||
        item.aliases?.some((alias) => normalizeInternalHref(`/thinking-lab/${alias}`) === normalizedPathname)
    ));
}

function getGreetingMessage(currentFinanceModel?: FinanceModelItem, currentThinkingArticle?: ContentCard) {
    if (currentFinanceModel) {
        return getModelAssistantGreeting(currentFinanceModel);
    }

    if (currentThinkingArticle) {
        return getArticleAssistantGreeting(currentThinkingArticle);
    }

    return `你好，我是 Lucas AI。\n\n我可以帮你选择财务模型、说明模型用法、梳理图表阅读顺序，也可以推荐工具与思考里的文章。\n\n当前支持范围：${AI_ASSISTANT_SCOPE}。`;
}

function getModelAssistantGreeting(currentFinanceModel: FinanceModelItem) {
    return [
        "当前模型助手",
        `当前模型：${currentFinanceModel.title}`,
        currentFinanceModel.aiGuide.purpose,
        "我可以直接解释适用场景、操作步骤、字段说明、图表阅读和常见误区。",
    ].join("\n\n");
}

function getArticleAssistantGreeting(currentThinkingArticle: ContentCard) {
    return [
        "当前文章助手",
        `当前文章：${currentThinkingArticle.title}`,
        currentThinkingArticle.description,
        "我可以帮你总结这篇文章、提炼核心观点、解释段落逻辑，也可以关联到站内模型或其他文章。",
    ].join("\n\n");
}

function getInternalHref(href: string | undefined) {
    if (!href) return null;
    if (href.startsWith("/") && !href.startsWith("//")) return href;
    if (href.startsWith("#")) return href;

    if (typeof window === "undefined") return null;

    try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return null;
        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return null;
    }
}

function MessageContent({
    text,
    onInternalLinkClick,
    onRouteCardClick,
}: {
    text: string;
    onInternalLinkClick?: (href: string) => void;
    onRouteCardClick?: (card: InternalRouteCard) => void;
}) {
    const normalizedText = normalizeChatInternalLinks(normalizeChatMathMarkdown(text));
    const routeBlocks = getMarkdownRouteBlocks(normalizedText);

    return (
        <div className="chat-markdown">
            {routeBlocks.map((block, index) => (
                <div key={`${block.markdown.slice(0, 24)}-${index}`} className="chat-markdown-block">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                            a: ({ href, children }) => (
                                <Link
                                    href={href || "#"}
                                    onClick={() => {
                                        const internalHref = getInternalHref(href);
                                        if (internalHref) onInternalLinkClick?.(internalHref);
                                    }}
                                    style={{ color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: 3 }}
                                >
                                    {children}
                                </Link>
                            ),
                            p: ({ children }) => <p style={{ margin: "0.4em 0" }}>{children}</p>,
                            strong: ({ children }) => <strong style={{ fontWeight: 700, color: "var(--foreground)" }}>{children}</strong>,
                            ul: ({ children }) => <ul style={{ paddingLeft: 18, margin: "0.4em 0" }}>{children}</ul>,
                            ol: ({ children }) => <ol style={{ paddingLeft: 18, margin: "0.4em 0" }}>{children}</ol>,
                            li: ({ children }) => <li style={{ marginBottom: 2 }}>{children}</li>,
                            code: ({ children, className }) => {
                                if (className?.startsWith("language-")) {
                                    return (
                                        <code style={{
                                            display: "block", background: "var(--card)", border: "1px solid var(--border)",
                                            borderRadius: 6, padding: "10px 14px", fontSize: 12, overflowX: "auto", whiteSpace: "pre",
                                        }}>
                                            {children}
                                        </code>
                                    );
                                }
                                return (
                                    <code style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 3, padding: "1px 4px", fontSize: "0.85em" }}>
                                        {children}
                                    </code>
                                );
                            },
                            pre: ({ children }) => <pre style={{ margin: "0.5em 0", overflow: "auto" }}>{children}</pre>,
                            blockquote: ({ children }) => (
                                <blockquote style={{ borderLeft: "3px solid var(--accent)", paddingLeft: 10, margin: "0.4em 0", color: "var(--muted)" }}>
                                    {children}
                                </blockquote>
                            ),
                        }}
                    >
                        {block.markdown}
                    </ReactMarkdown>
                    {block.cards.length > 0 && onRouteCardClick && (
                        <InternalRouteCardList
                            cards={block.cards}
                            onCardClick={onRouteCardClick}
                        />
                    )}
                </div>
            ))}
            {routeBlocks.length === 0 && (
                <ReactMarkdown
                    remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]}
                    rehypePlugins={[rehypeKatex]}
                >
                    {normalizedText}
                </ReactMarkdown>
            )}
        </div>
    );
}

function TypingIndicator() {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 0" }}>
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--muted)" }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
            ))}
        </div>
    );
}

function QuickPromptRow({
    prompts,
    onSelect,
}: {
    prompts: string[];
    onSelect: (prompt: string) => void;
}) {
    return (
        <div
            style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 14,
            }}
        >
            {prompts.map((prompt) => (
                <button
                    key={prompt}
                    onClick={() => onSelect(prompt)}
                    type="button"
                    style={{
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        color: "var(--foreground)",
                        borderRadius: 999,
                        padding: "8px 12px",
                        fontSize: 13,
                        lineHeight: 1.35,
                        cursor: "pointer",
                        fontFamily: "inherit",
                    }}
                >
                    {prompt}
                </button>
            ))}
        </div>
    );
}

function ContentCardList({ cards, cardType, onCardClick }: {
    cards: ContentCard[];
    cardType: ContentCardType;
    onCardClick: (card: ContentCard) => void;
}) {
    const accentColor =
        cardType === "finance"
            ? "var(--accent-secondary)"
            : "var(--accent)";
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
            {cards.map((card, index) => (
                <motion.button
                    key={card.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.04 }}
                    onClick={() => onCardClick(card)}
                    style={{
                        textAlign: "left", padding: "10px 12px", borderRadius: 10,
                        border: "1px solid var(--border)", background: "var(--card)",
                        cursor: "pointer", transition: "border-color 0.2s",
                        fontFamily: "inherit",
                    }}
                    whileHover={{ borderColor: accentColor }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{card.title}</span>
                                <ExternalLink style={{ width: 10, height: 10, color: "var(--muted)", flexShrink: 0 }} />
                            </div>
                            <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4, margin: 0 }}>{card.description}</p>
                        </div>
                        <span style={{ fontSize: 10, color: "var(--muted)", opacity: 0.5, flexShrink: 0 }}>{card.date}</span>
                    </div>
                </motion.button>
            ))}
        </div>
    );
}

function InternalRouteCardList({
    cards,
    onCardClick,
}: {
    cards: InternalRouteCard[];
    onCardClick: (card: InternalRouteCard) => void;
}) {
    return (
        <div className="chat-route-card-list">
            {cards.map((card, index) => (
                <motion.button
                    key={card.href}
                    type="button"
                    className="chat-route-card"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: index * 0.04 }}
                    onClick={() => onCardClick(card)}
                    style={{ "--route-card-accent": card.accent } as CSSProperties}
                >
                    <span className="chat-route-card-marker" />
                    <span className="chat-route-card-copy">
                        <strong>{card.title}</strong>
                        <span>{card.description}</span>
                    </span>
                    <ExternalLink className="chat-route-card-icon" aria-hidden="true" />
                </motion.button>
            ))}
        </div>
    );
}

export default function ChatWidget() {
    const router = useRouter();
    const pathname = usePathname() || "/";
    const { isMobileLike } = useViewportProfile();
    const dragControls = useDragControls();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
    const [initialized, setInitialized] = useState(false);
    const [viewportHeight, setViewportHeight] = useState<number | null>(null);
    const [viewportOffsetTop, setViewportOffsetTop] = useState(0);
    const [keyboardOpen, setKeyboardOpen] = useState(false);
    const [mobileExpanded, setMobileExpanded] = useState(false);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const launcherButtonRef = useRef<HTMLButtonElement>(null);
    const chatPanelRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const currentFinanceModelSlugRef = useRef<string | null>(null);
    const currentThinkingArticleHrefRef = useRef<string | null>(null);

    const financeContent: ContentCard[] = staticFinance.map((item) => ({
        id: item.id, title: item.title, description: item.description,
        date: item.date, category: item.category ?? undefined, href: item.href,
    }));
    const thinkingContent: ContentCard[] = staticThinking.map((item) => ({
        id: item.id, title: item.title, description: item.description,
        date: item.date, category: item.category ?? undefined, href: item.href, content: item.content,
    }));
    const currentFinanceModelSlug = getCurrentFinanceModelSlug(pathname);
    const currentFinanceModel =
        currentFinanceModelSlug ? financeModels.find((model) => model.slug === currentFinanceModelSlug) : undefined;
    const currentThinkingArticle = getCurrentThinkingArticle(pathname, staticThinking);
    const currentThinkingArticleCard = useMemo<ContentCard | undefined>(
        () => currentThinkingArticle
            ? {
            id: currentThinkingArticle.id,
            title: currentThinkingArticle.title,
            description: currentThinkingArticle.description,
            date: currentThinkingArticle.date,
            category: currentThinkingArticle.category ?? undefined,
            href: currentThinkingArticle.href,
            content: currentThinkingArticle.content,
        }
            : undefined,
        [currentThinkingArticle],
    );
    const quickPrompts = currentFinanceModel
        ? MODEL_ASSISTANT_QUICK_PROMPTS
        : currentThinkingArticleCard
            ? ARTICLE_ASSISTANT_QUICK_PROMPTS
            : MOBILE_QUICK_PROMPTS;

    const currentViewportHeight =
        viewportHeight ?? (typeof window !== "undefined" ? window.innerHeight : null);
    const mobileFullscreenMode = isOpen && isMobileLike && mobileExpanded;
    const mobileKeyboardMode = isOpen && isMobileLike && keyboardOpen && !mobileExpanded;
    const mobileSheetMode = isOpen && isMobileLike && !mobileExpanded && !keyboardOpen;
    const mobileFullscreenTopInset = mobileFullscreenMode && keyboardOpen ? 0 : 10;
    const mobileHorizontalInset = mobileFullscreenMode
        ? (keyboardOpen ? 0 : 8)
        : mobileKeyboardMode
            ? 10
            : 14;
    const mobileSheetHeight = currentViewportHeight ? Math.min(Math.max(currentViewportHeight * 0.6, 440), 580) : null;
    const mobileFocusHeight = currentViewportHeight ? Math.max(currentViewportHeight - mobileFullscreenTopInset, 320) : null;
    const mobileKeyboardHeight = currentViewportHeight ? Math.max(currentViewportHeight - 18, 320) : null;
    const mobileBackdropBackground = mobileKeyboardMode
        ? "rgba(20,20,19,0.22)"
        : mobileFullscreenMode
            ? "rgba(20,20,19,0.12)"
            : "rgba(20,20,19,0.18)";

    const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
        const container = messagesContainerRef.current;
        if (!container) return;

        if (behavior === "smooth") {
            container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
            return;
        }

        container.scrollTop = container.scrollHeight;
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (!isOpen) return;

        window.requestAnimationFrame(() => {
            if (isMobileLike) {
                chatPanelRef.current?.focus({ preventScroll: true });
                return;
            }

            inputRef.current?.focus({ preventScroll: true });
        });
    }, [isMobileLike, isOpen]);

    useEffect(() => {
        const previousSlug = currentFinanceModelSlugRef.current;
        if (previousSlug === currentFinanceModelSlug) return;

        currentFinanceModelSlugRef.current = currentFinanceModelSlug;
        if (!initialized || !currentFinanceModel) return;

        setMessages((prev) => {
            if (prev.length === 0 || (prev.length === 1 && prev[0]?.id === "greeting")) {
                return [{
                    id: "greeting",
                    role: "assistant",
                    content: getModelAssistantGreeting(currentFinanceModel),
                }];
            }

            return [
                ...prev,
                {
                    id: `model-switch-${Date.now()}`,
                    role: "assistant",
                    content: `已切换到「${currentFinanceModel.title}」。接下来我会按这个模型回答字段、步骤、图表和常见误区。`,
                },
            ];
        });
    }, [currentFinanceModel, currentFinanceModelSlug, initialized]);

    useEffect(() => {
        const currentHref = currentThinkingArticleCard?.href ?? null;
        const previousHref = currentThinkingArticleHrefRef.current;
        if (previousHref === currentHref) return;

        currentThinkingArticleHrefRef.current = currentHref;
        if (!initialized || !currentThinkingArticleCard || currentFinanceModel) return;

        setMessages((prev) => {
            if (prev.length === 0 || (prev.length === 1 && prev[0]?.id === "greeting")) {
                return [{
                    id: "greeting",
                    role: "assistant",
                    content: getArticleAssistantGreeting(currentThinkingArticleCard),
                }];
            }

            return [
                ...prev,
                {
                    id: `article-switch-${Date.now()}`,
                    role: "assistant",
                    content: `已切换到「${currentThinkingArticleCard.title}」。接下来我会围绕这篇文章回答总结、观点、结构和相关内容。`,
                },
            ];
        });
    }, [currentFinanceModel, currentThinkingArticleCard, initialized]);

    useEffect(() => {
        if (!isMobileLike || typeof window === "undefined") return;

        const viewport = window.visualViewport;
        if (!viewport) return;

        const updateViewport = () => {
            setViewportHeight(viewport.height);
            setViewportOffsetTop(viewport.offsetTop);
            const heightLoss = window.innerHeight - viewport.height - viewport.offsetTop;
            setKeyboardOpen(heightLoss > 160);
        };

        updateViewport();
        viewport.addEventListener("resize", updateViewport);
        viewport.addEventListener("scroll", updateViewport);

        return () => {
            viewport.removeEventListener("resize", updateViewport);
            viewport.removeEventListener("scroll", updateViewport);
        };
    }, [isMobileLike]);

    const callChatAPI = async (allMessages: Message[], assistantMsgId: string): Promise<boolean> => {
        let fullText = "";
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), CHAT_API_TIMEOUT_MS);

        try {
            const apiMessages = allMessages
                .filter((m) => !m.isTyping && m.content)
                .map((m) => ({ role: m.role, content: m.content }));
            const res = await fetch("/api/chat/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: apiMessages,
                    currentFinanceModelSlug: currentFinanceModel?.slug ?? null,
                    currentThinkingArticleHref: currentThinkingArticleCard?.href ?? null,
                }),
                signal: controller.signal,
            });
            if (!res.ok || !res.body) return false;
            if (aiAvailable === null) setAiAvailable(true);
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            setMessages((prev) =>
                prev.map((m) => (m.id === "typing" ? { ...m, id: assistantMsgId, isTyping: false, content: "" } : m))
            );
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                for (const line of chunk.split("\n")) {
                    if (!line.startsWith("data: ")) continue;
                    const data = line.slice(6);
                    if (data === "[DONE]") break;
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.text) {
                            fullText += parsed.text;
                            const text = fullText;
                            setMessages((prev) => prev.map((m) => (m.id === assistantMsgId ? { ...m, content: text } : m)));
                        }
                    } catch { /* skip */ }
                }
            }
            return fullText.length > 0;
        } catch {
            return fullText.length > 0;
        } finally {
            window.clearTimeout(timeoutId);
        }
    };

    const sendMessage = async (content: string) => {
        const trimmed = content.trim();
        if (!trimmed || isProcessing) return;
        const userMessage: Message = { id: `user-${Date.now()}`, role: "user", content: trimmed };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInputValue("");
        setIsProcessing(true);
        window.requestAnimationFrame(() => resizeChatInput(inputRef.current, inputMaxHeight));
        setMessages((prev) => [...prev, { id: "typing", role: "assistant", content: "", isTyping: true }]);
        const assistantMsgId = `assistant-${Date.now()}`;
        let includeOfflineNotice = false;
        if (aiAvailable !== false) {
            const success = await callChatAPI(updatedMessages, assistantMsgId);
            if (success) { setIsProcessing(false); return; }
            setAiAvailable(false);
            includeOfflineNotice = true;
        }
        await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
        const result = getLocalFallbackResponse(userMessage.content, financeContent, thinkingContent, {
            includeOfflineNotice,
            currentFinanceModel,
            currentThinkingArticle: currentThinkingArticleCard,
        });
        setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== "typing" && m.id !== assistantMsgId);
            return [...filtered, {
                id: assistantMsgId, role: "assistant" as const,
                content: result?.response || "我不太明白你的意思。",
                contentCards: result?.contentCards,
                cardType: result?.cardType,
            }];
        });
        setIsProcessing(false);
    };

    const handleSend = async () => {
        await sendMessage(inputValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputValue(e.target.value);
        resizeChatInput(e.target, inputMaxHeight);
    };

    const handleOpen = () => {
        setKeyboardOpen(false);
        setMobileExpanded(false);
        if (!initialized) {
            setInitialized(true);
            setMessages([{
                id: "greeting",
                role: "assistant",
                content: getGreetingMessage(currentFinanceModel, currentThinkingArticleCard),
            }]);
        }
        setIsOpen(true);
    };

    const handleInputFocus = () => {
        if (!isMobileLike) return;

        setTimeout(() => {
            inputRef.current?.scrollIntoView({ block: "nearest" });
            scrollToBottom("smooth");
        }, 180);
    };

    const compactMobileChat = isOpen && isMobileLike && keyboardOpen;
    const canDragPanel = isMobileLike;
    const headerPadding = compactMobileChat ? "10px 12px" : "14px 18px 12px";
    const headerFontSize = compactMobileChat ? 13 : 14;
    const messagesPadding = compactMobileChat ? "10px 12px 8px" : isMobileLike ? "8px 18px 12px" : "16px";
    const messageGap = compactMobileChat ? 10 : 16;
    const bodyFontSize = compactMobileChat ? 13 : 14;
    const bodyLineHeight = compactMobileChat ? 1.55 : 1.7;
    const dragHandleHotzoneWidth = mobileFullscreenMode ? 260 : 300;
    const dragHandleHotzoneHeight = mobileFullscreenMode ? 44 : 58;
    const inputSectionPadding = isMobileLike
        ? compactMobileChat
            ? "8px 12px calc(8px + env(safe-area-inset-bottom, 0px))"
            : "12px 16px calc(12px + env(safe-area-inset-bottom, 0px))"
        : "12px 16px";
    const inputWrapperPadding = compactMobileChat ? "8px 8px 8px 12px" : "10px 10px 10px 16px";
    const inputMaxHeight = compactMobileChat ? 96 : isMobileLike ? 128 : 120;
    const inputFontSize = isMobileLike ? 16 : 14;
    const inputLineHeight = isMobileLike ? "26px" : "24px";
    const introState = messages.length === 1 && messages[0]?.id === "greeting" && !isProcessing;

    useLayoutEffect(() => {
        resizeChatInput(inputRef.current, inputMaxHeight);
    }, [inputValue, inputMaxHeight, isOpen]);

    const mobileLauncherHeight = 48;
    const mobileLauncherStyle = isMobileLike
        ? {
            right: 16,
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 18px)",
            width: 62,
            height: mobileLauncherHeight,
        }
        : {
            right: 24,
            bottom: 24,
            width: undefined,
            height: 48,
        };
    const panelStyle = isMobileLike
        ? mobileFullscreenMode
            ? {
                top: viewportOffsetTop + mobileFullscreenTopInset,
                left: mobileHorizontalInset,
                right: mobileHorizontalInset,
                bottom: "auto" as const,
                width: "auto" as const,
                height: mobileFocusHeight ? `${mobileFocusHeight}px` : `calc(100dvh - ${mobileFullscreenTopInset}px)`,
                borderRadius: keyboardOpen ? 0 : 24,
            }
            : mobileKeyboardMode
                ? {
                    top: viewportOffsetTop + 10,
                    left: mobileHorizontalInset,
                    right: mobileHorizontalInset,
                    bottom: "auto" as const,
                    width: "auto" as const,
                    height: mobileKeyboardHeight ? `${mobileKeyboardHeight}px` : "calc(100dvh - 20px)",
                    borderRadius: 28,
                }
            : {
                left: mobileHorizontalInset,
                right: mobileHorizontalInset,
                bottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)",
                top: "auto" as const,
                width: "auto" as const,
                height: mobileSheetHeight ? `${mobileSheetHeight}px` : "60dvh",
                borderRadius: 28,
            }
        : {
            right: 20,
            bottom: 20,
            width: "min(380px, calc(100vw - 40px))",
            height: "min(500px, calc(100dvh - 88px))",
        };
    const handleClose = () => {
        setKeyboardOpen(false);
        setMobileExpanded(false);
        setIsOpen(false);
        window.setTimeout(() => {
            launcherButtonRef.current?.focus();
        }, 0);
    };

    const handlePanelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            handleClose();
            return;
        }

        if (event.key !== "Tab") return;

        const panel = chatPanelRef.current;
        if (!panel) return;

        const focusableElements = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelectors)).filter((element) => {
            const style = window.getComputedStyle(element);
            return style.display !== "none" && style.visibility !== "hidden";
        });

        if (focusableElements.length === 0) {
            event.preventDefault();
            panel.focus();
            return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement;

        if (activeElement === panel) {
            event.preventDefault();
            (event.shiftKey ? lastElement : firstElement).focus();
            return;
        }

        if (event.shiftKey && activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
            return;
        }

        if (!event.shiftKey && activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
            return;
        }

        if (!panel.contains(activeElement)) {
            event.preventDefault();
            (event.shiftKey ? lastElement : firstElement).focus();
        }
    };
    const handlePanelDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (!isMobileLike) return;

        if (mobileSheetMode) {
            if (info.offset.y > 110 || info.velocity.y > 700) {
                handleClose();
                return;
            }

            if (info.offset.y < -90 || info.velocity.y < -700) {
                setMobileExpanded(true);
            }
            return;
        }

        if (mobileKeyboardMode && (info.offset.y > 110 || info.velocity.y > 700)) {
            inputRef.current?.blur();
            setKeyboardOpen(false);
            return;
        }

        if (mobileFullscreenMode && (info.offset.y > 110 || info.velocity.y > 700)) {
            inputRef.current?.blur();
            setKeyboardOpen(false);
            setMobileExpanded(false);
        }
    };

    return (
        <>
            {/* Floating Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        ref={launcherButtonRef}
                        type="button"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={handleOpen}
                        aria-label="打开 Lucas AI 助手"
                        style={{
                            position: "fixed",
                            ...mobileLauncherStyle,
                            borderRadius: 24,
                            border: "none",
                            background: "var(--accent)",
                            color: "white",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: isMobileLike ? 5 : 8,
                            padding: isMobileLike ? "0 11px" : "0 18px 0 14px",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                            zIndex: 9999,
                            fontSize: 14,
                            fontWeight: 600,
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <MessageCircle style={{ width: isMobileLike ? 17 : 20, height: isMobileLike ? 17 : 20 }} />
                        {isMobileLike && <span className="chat-floating-ai-badge">AI</span>}
                        {!isMobileLike && <span>AI 助手</span>}
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {isMobileLike && (
                            <motion.button
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.22 }}
                                onClick={handleClose}
                                type="button"
                                aria-label="关闭 AI 助手"
                                style={{
                                    position: "fixed",
                                    inset: 0,
                                    zIndex: 9998,
                                    border: "none",
                                    background: mobileBackdropBackground,
                                    cursor: "pointer",
                                }}
                            />
                        )}
                        <motion.div
                            ref={chatPanelRef}
                            initial={{ opacity: 0, y: isMobileLike ? 28 : 20, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.97 }}
                            transition={{ duration: 0.25 }}
                            drag={canDragPanel ? "y" : false}
                            dragListener={false}
                            dragControls={dragControls}
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={0.18}
                            dragMomentum={false}
                            onDragEnd={handlePanelDragEnd}
                            className="chat-panel"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="chat-panel-title"
                            aria-describedby="chat-panel-description"
                            tabIndex={-1}
                            onKeyDown={handlePanelKeyDown}
                            style={{
                                position: "fixed",
                                display: "flex",
                                flexDirection: "column",
                                overflow: "hidden",
                                overscrollBehavior: "contain",
                                zIndex: 9999,
                                background: isMobileLike
                                    ? mobileFullscreenMode && keyboardOpen
                                        ? "var(--background)"
                                        : "var(--background)"
                                    : "var(--background)",
                                fontFamily: isMobileLike ? undefined : CHAT_UI_FONT,
                                border: isMobileLike
                                    ? mobileFullscreenMode && keyboardOpen
                                        ? "none"
                                        : "1px solid var(--border)"
                                    : "1px solid var(--border)",
                                boxShadow: isMobileLike
                                    ? mobileFullscreenMode && keyboardOpen
                                        ? "none"
                                        : "0 24px 60px rgba(20,20,19,0.18)"
                                    : "0 8px 40px rgba(0,0,0,0.12)",
                                backdropFilter: isMobileLike && !(mobileFullscreenMode && keyboardOpen) ? "blur(18px)" : undefined,
                                WebkitBackdropFilter: isMobileLike && !(mobileFullscreenMode && keyboardOpen) ? "blur(18px)" : undefined,
                                transition: isMobileLike
                                    ? "top 260ms cubic-bezier(0.22, 1, 0.36, 1), bottom 260ms cubic-bezier(0.22, 1, 0.36, 1), height 260ms cubic-bezier(0.22, 1, 0.36, 1), left 260ms cubic-bezier(0.22, 1, 0.36, 1), right 260ms cubic-bezier(0.22, 1, 0.36, 1), border-radius 260ms cubic-bezier(0.22, 1, 0.36, 1)"
                                    : undefined,
                                ...panelStyle,
                            }}
                        >
                            <p id="chat-panel-description" className="sr-only">
                                Lucas AI 助手，可以帮你选择财务模型、说明模型用法、梳理图表阅读顺序和推荐文章。
                            </p>
                            {isMobileLike && (
                                <>
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            left: "50%",
                                            transform: "translateX(-50%)",
                                            width: dragHandleHotzoneWidth,
                                            maxWidth: "100%",
                                            height: dragHandleHotzoneHeight,
                                            zIndex: 2,
                                            cursor: "grab",
                                            touchAction: "none",
                                        }}
                                        onPointerDown={(event) => {
                                            dragControls.start(event);
                                        }}
                                    />
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "center",
                                            alignItems: "center",
                                            minHeight: mobileFullscreenMode ? 26 : 34,
                                            paddingTop: mobileFullscreenMode ? 8 : 10,
                                            paddingBottom: mobileFullscreenMode ? 6 : 8,
                                            flexShrink: 0,
                                            pointerEvents: "none",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 42,
                                                height: 4,
                                                borderRadius: 999,
                                                background: "var(--border)",
                                            }}
                                        />
                                    </div>
                                </>
                            )}

                            {/* Header */}
                            <div
                                style={{
                                    flexShrink: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: headerPadding,
                                    borderBottom: "1px solid var(--border)",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div
                                        style={{
                                            width: 7,
                                            height: 7,
                                            borderRadius: "50%",
                                            background: "#10B981",
                                            boxShadow: "0 0 6px rgba(16,185,129,0.4)",
                                        }}
                                    />
                                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                        <span
                                            id="chat-panel-title"
                                            style={{
                                                fontSize: headerFontSize,
                                                fontWeight: 600,
                                                color: "var(--foreground)",
                                                lineHeight: 1.2,
                                            }}
                                        >
                                            Lucas AI
                                        </span>
                                        {!compactMobileChat && (
                                            <span style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.1 }}>
                                                {currentFinanceModel ? "当前模型助手" : currentThinkingArticleCard ? "当前文章助手" : "模型与思考入口"}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    aria-label="关闭 Lucas AI 助手"
                                    onClick={handleClose}
                                    style={{
                                        position: "relative",
                                        zIndex: 3,
                                        width: isMobileLike ? 38 : 30,
                                        height: isMobileLike ? 38 : 30,
                                        flexShrink: 0,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        border: isMobileLike ? "1px solid var(--border)" : "none",
                                        borderRadius: 999,
                                        background: isMobileLike ? "var(--card)" : "none",
                                        color: "var(--muted)",
                                        cursor: "pointer",
                                        display: "flex",
                                        padding: 0,
                                        touchAction: "manipulation",
                                    }}
                                >
                                    <X style={{ width: 18, height: 18 }} aria-hidden="true" />
                                </button>
                            </div>

                            {/* Messages */}
                            <div
                                ref={messagesContainerRef}
                                aria-live="polite"
                                aria-relevant="additions text"
                                aria-busy={isProcessing}
                                style={{
                                    flex: 1,
                                    minHeight: 0,
                                    overflowY: "auto",
                                    padding: messagesPadding,
                                    scrollPaddingBottom: compactMobileChat ? 20 : 32,
                                }}
                            >
                                <AnimatePresence mode="popLayout">
                                    {messages.map((message) => {
                                        return (
                                            <motion.div
                                                key={message.id}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.2 }}
                                                style={{ marginBottom: messageGap }}
                                            >
                                            {message.role === "user" ? (
                                                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                                    <div
                                                        style={{
                                                            background: "var(--accent)",
                                                            color: "white",
                                                            borderRadius: "16px 16px 4px 16px",
                                                            padding: "8px 14px",
                                                            maxWidth: "80%",
                                                            fontSize: bodyFontSize,
                                                            lineHeight: compactMobileChat ? 1.5 : 1.6,
                                                            wordBreak: "break-word",
                                                            overflowWrap: "anywhere",
                                                        }}
                                                    >
                                                        {message.content}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    {message.isTyping ? (
                                                        <TypingIndicator />
                                                    ) : (
                                                        <>
                                                            <div
                                                                style={message.id === "greeting" ? {
                                                                    fontSize: bodyFontSize,
                                                                    lineHeight: 1.6,
                                                                    color: "var(--foreground)",
                                                                    wordBreak: "break-word",
                                                                    overflowWrap: "anywhere",
                                                                    background: "var(--card)",
                                                                    border: "1px solid var(--border)",
                                                                    borderRadius: 20,
                                                                    padding: compactMobileChat ? "10px 12px" : isMobileLike ? "14px 16px" : "16px 18px",
                                                                    boxShadow: isMobileLike ? "0 10px 24px rgba(20,20,19,0.05)" : "none",
                                                                } : {
                                                                    fontSize: bodyFontSize,
                                                                    lineHeight: bodyLineHeight,
                                                                    color: "var(--foreground)",
                                                                    wordBreak: "break-word",
                                                                    overflowWrap: "anywhere",
                                                                }}
                                                            >
                                                                {message.id === "greeting" && !compactMobileChat && (
                                                                    <div
                                                                        style={{
                                                                            fontSize: 11,
                                                                            letterSpacing: "0.08em",
                                                                            textTransform: "uppercase",
                                                                            color: "var(--muted)",
                                                                            marginBottom: 8,
                                                                        }}
                                                                    >
                                                                        Ask Lucas AI
                                                                    </div>
                                                                )}
                                                                <MessageContent
                                                                    text={message.content}
                                                                    onInternalLinkClick={() => {
                                                                        if (isMobileLike) handleClose();
                                                                    }}
                                                                    onRouteCardClick={
                                                                        message.contentCards && message.contentCards.length > 0
                                                                            ? undefined
                                                                            : (card) => {
                                                                                handleClose();
                                                                                router.push(card.href);
                                                                            }
                                                                    }
                                                                />
                                                            </div>
                                                            {message.id === "greeting" && introState && !compactMobileChat && (
                                                                <QuickPromptRow
                                                                    prompts={quickPrompts}
                                                                    onSelect={(prompt) => {
                                                                        setInputValue(prompt);
                                                                        setTimeout(() => {
                                                                            void sendMessage(prompt);
                                                                        }, 0);
                                                                    }}
                                                                />
                                                            )}
                                                            {message.contentCards && message.contentCards.length > 0 && message.cardType && (
                                                                <ContentCardList
                                                                    cards={message.contentCards}
                                                                    cardType={message.cardType}
                                                                    onCardClick={(card) => {
                                                                        handleClose();
                                                                        router.push(card.href);
                                                                    }}
                                                                />
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div
                                style={{
                                    flexShrink: 0,
                                    borderTop: "1px solid var(--border)",
                            padding: inputSectionPadding,
                            background: isMobileLike
                                ? mobileFullscreenMode && keyboardOpen
                                    ? "var(--background)"
                                    : "var(--background)"
                                : "transparent",
                            fontFamily: "inherit",
                        }}
                    >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "flex-end",
                                        gap: 8,
                                        background: "var(--card)",
                                        border: "1px solid var(--border)",
                                        borderRadius: isMobileLike ? 16 : 12,
                                        padding: inputWrapperPadding,
                                        boxShadow: isMobileLike ? "0 4px 14px rgba(20,20,19,0.04)" : "none",
                                    }}
                                >
                                    <textarea
                                        id="chat-input"
                                        name="chat-input"
                                        ref={inputRef}
                                        value={inputValue}
                                        onChange={handleInput}
                                        onFocus={handleInputFocus}
                                        onKeyDown={handleKeyDown}
                                        placeholder={isMobileLike ? "问点什么..." : "输入消息..."}
                                        rows={1}
                                        disabled={isProcessing}
                                        style={{
                                            flex: 1,
                                            minWidth: 0,
                                            background: "transparent",
                                            border: "none",
                                            outline: "none",
                                            fontSize: inputFontSize,
                                            lineHeight: inputLineHeight,
                                            minHeight: inputLineHeight,
                                            maxHeight: inputMaxHeight,
                                            overflowY: "hidden",
                                            overscrollBehavior: "contain",
                                            scrollbarWidth: "thin",
                                            color: "var(--foreground)",
                                            resize: "none",
                                            fontFamily: "inherit",
                                            display: "block",
                                            padding: 0,
                                        }}
                                    />
                                    <button
                                        type="button"
                                        aria-label="发送消息"
                                        onClick={handleSend}
                                        disabled={!inputValue.trim() || isProcessing}
                                        style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: "50%",
                                            border: "none",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background: inputValue.trim() && !isProcessing ? "var(--foreground)" : "var(--border)",
                                            color: inputValue.trim() && !isProcessing ? "var(--background)" : "var(--muted)",
                                            cursor: inputValue.trim() && !isProcessing ? "pointer" : "default",
                                            transition: "all 0.2s",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <ArrowUp style={{ width: 14, height: 14 }} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
