"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useDragControls, type PanInfo } from "framer-motion";
import { useRouter } from "next/navigation";
import { MessageCircle, X, ArrowUp, ExternalLink } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { allDialoguePatterns, defaultResponses } from "@/lib/data/dialoguePatterns";
import { aiContent as staticAI, financeContent as staticFinance } from "@/lib/data/generated/content";
import { useViewportProfile } from "@/lib/useLowMotionMode";

interface ContentCard {
    id: number;
    title: string;
    description: string;
    category?: string;
    date: string;
    href: string;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    isTyping?: boolean;
    contentCards?: ContentCard[];
    cardType?: "ai" | "finance";
}

const MOBILE_QUICK_PROMPTS = [
    "有什么文章值得看？",
    "Lucas 是谁？",
    "推荐一篇财务建模文章",
];

const CHAT_UI_FONT =
    'var(--font-poppins), "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';

function getGreetingMessage() {
    return "你好，我是 Lucas AI。\n\n想了解文章、Lucas，或者本站内容，都可以直接问我。";
}

function MessageContent({ text }: { text: string }) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
                a: ({ href, children }) => (
                    <Link href={href || "#"} style={{ color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: 3 }}>
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
            {text}
        </ReactMarkdown>
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
                        background: "rgba(255,255,255,0.82)",
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
    cardType: "ai" | "finance";
    onCardClick: (card: ContentCard) => void;
}) {
    const accentColor = cardType === "ai" ? "var(--accent)" : "var(--accent-secondary)";
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

function recognizeIntent(input: string, aiContent: ContentCard[], financeContent: ContentCard[]) {
    const lower = input.toLowerCase().trim();
    for (const pattern of allDialoguePatterns) {
        if (pattern.keywords.some((k) => lower.includes(k))) {
            return { response: pattern.responses[Math.floor(Math.random() * pattern.responses.length)] };
        }
    }
    if (lower.includes("ai") || lower.includes("人工智能") || lower.includes("见闻") || lower.includes("chatgpt") || lower.includes("llm")) {
        if (aiContent.length === 0) return { response: "【AI 见闻】板块暂时还没有内容，敬请期待！" };
        return { response: "以下是【AI 见闻】板块的内容：", contentCards: aiContent, cardType: "ai" as const };
    }
    if (lower.includes("财务") || lower.includes("建模") || lower.includes("模型") || lower.includes("金融") || lower.includes("finance") || lower.includes("估值")) {
        if (financeContent.length === 0) return { response: "【财务建模】板块暂时还没有内容，敬请期待！" };
        return { response: "以下是【财务建模】板块的内容：", contentCards: financeContent, cardType: "finance" as const };
    }
    return { response: defaultResponses[Math.floor(Math.random() * defaultResponses.length)] };
}

export default function ChatWidget() {
    const router = useRouter();
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
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const aiContent: ContentCard[] = staticAI.map((item) => ({
        id: item.id, title: item.title, description: item.description,
        date: item.date, category: item.category ?? undefined, href: item.href,
    }));
    const financeContent: ContentCard[] = staticFinance.map((item) => ({
        id: item.id, title: item.title, description: item.description,
        date: item.date, category: item.category ?? undefined, href: item.href,
    }));

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
        if (isOpen && !isMobileLike) inputRef.current?.focus();
    }, [isMobileLike, isOpen]);

    useEffect(() => {
        if (!isOpen || !isMobileLike || typeof window === "undefined") return;

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
    }, [isMobileLike, isOpen]);

    const callClaudeAPI = async (allMessages: Message[], assistantMsgId: string): Promise<boolean> => {
        try {
            const apiMessages = allMessages
                .filter((m) => !m.isTyping && m.content)
                .map((m) => ({ role: m.role, content: m.content }));
            const res = await fetch("/api/chat/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: apiMessages }),
            });
            if (!res.ok || !res.body) return false;
            if (aiAvailable === null) setAiAvailable(true);
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let fullText = "";
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
        } catch { return false; }
    };

    const sendMessage = async (content: string) => {
        const trimmed = content.trim();
        if (!trimmed || isProcessing) return;
        const userMessage: Message = { id: `user-${Date.now()}`, role: "user", content: trimmed };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInputValue("");
        setIsProcessing(true);
        if (inputRef.current) inputRef.current.style.height = "24px";
        setMessages((prev) => [...prev, { id: "typing", role: "assistant", content: "", isTyping: true }]);
        const assistantMsgId = `assistant-${Date.now()}`;
        if (aiAvailable !== false) {
            const success = await callClaudeAPI(updatedMessages, assistantMsgId);
            if (success) { setIsProcessing(false); return; }
            setAiAvailable(false);
        }
        await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
        const result = recognizeIntent(userMessage.content, aiContent, financeContent);
        setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== "typing");
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
        const el = e.target;
        el.style.height = "24px";
        el.style.height = Math.min(el.scrollHeight, 100) + "px";
    };

    const handleOpen = () => {
        setKeyboardOpen(false);
        setMobileExpanded(false);
        if (!initialized) {
            setInitialized(true);
            setMessages([{
                id: "greeting",
                role: "assistant",
                content: getGreetingMessage(),
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
    const inputMaxHeight = compactMobileChat ? 72 : 100;
    const inputFontSize = isMobileLike ? 16 : 14;
    const inputLineHeight = isMobileLike ? "26px" : "24px";
    const introState = messages.length === 1 && messages[0]?.id === "greeting" && !isProcessing;
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
        : {};
    const handleClose = () => {
        setKeyboardOpen(false);
        setMobileExpanded(false);
        setIsOpen(false);
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
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={handleOpen}
                        style={{
                            position: "fixed",
                            bottom: 24,
                            right: 24,
                            height: 48,
                            borderRadius: 24,
                            border: "none",
                            background: "var(--accent)",
                            color: "white",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "0 18px 0 14px",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                            zIndex: 9999,
                            fontSize: 14,
                            fontWeight: 600,
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <MessageCircle style={{ width: 20, height: 20 }} />
                        <span>AI 助手</span>
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
                                        : "rgba(250, 249, 245, 0.96)"
                                    : "var(--background)",
                                fontFamily: isMobileLike ? undefined : CHAT_UI_FONT,
                                border: isMobileLike
                                    ? mobileFullscreenMode && keyboardOpen
                                        ? "none"
                                        : "1px solid rgba(232, 230, 220, 0.95)"
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
                                                background: "rgba(20,20,19,0.14)",
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
                                                站内文章与人物信息
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={handleClose}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "var(--muted)",
                                        cursor: "pointer",
                                        padding: 4,
                                        display: "flex",
                                    }}
                                >
                                    <X style={{ width: 18, height: 18 }} />
                                </button>
                            </div>

                            {/* Messages */}
                            <div
                                ref={messagesContainerRef}
                                style={{
                                    flex: 1,
                                    minHeight: 0,
                                    overflowY: "auto",
                                    padding: messagesPadding,
                                    scrollPaddingBottom: compactMobileChat ? 20 : 32,
                                }}
                            >
                                <AnimatePresence mode="popLayout">
                                    {messages.map((message) => (
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
                                                                    background: "rgba(255,255,255,0.78)",
                                                                    border: "1px solid rgba(232,230,220,0.95)",
                                                                    borderRadius: 20,
                                                                    padding: compactMobileChat ? "10px 12px" : isMobileLike ? "14px 16px" : "16px 18px",
                                                                    boxShadow: "0 10px 24px rgba(20,20,19,0.05)",
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
                                                                <MessageContent text={message.content} />
                                                            </div>
                                                            {message.id === "greeting" && introState && !compactMobileChat && (
                                                                <QuickPromptRow
                                                                    prompts={MOBILE_QUICK_PROMPTS}
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
                                                                        setIsOpen(false);
                                                                        router.push(card.href);
                                                                    }}
                                                                />
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
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
                                    : "rgba(250,249,245,0.9)"
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
                                            height: 24,
                                            maxHeight: inputMaxHeight,
                                            color: "var(--foreground)",
                                            resize: "none",
                                            fontFamily: "inherit",
                                        }}
                                    />
                                    <button
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
