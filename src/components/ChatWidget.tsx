"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
    const [initialized, setInitialized] = useState(false);
    const [viewportHeight, setViewportHeight] = useState<number | null>(null);
    const [viewportOffsetTop, setViewportOffsetTop] = useState(0);
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

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    useEffect(() => { scrollToBottom(); }, [messages]);

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

    const handleSend = async () => {
        if (!inputValue.trim() || isProcessing) return;
        const userMessage: Message = { id: `user-${Date.now()}`, role: "user", content: inputValue.trim() };
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
        if (!initialized) {
            setInitialized(true);
            setMessages([{
                id: "greeting",
                role: "assistant",
                content: "你好！我是 Lucas 的 AI 助手，搭载 Claude Opus 4.6 模型。\n\n你可以问我任何关于这个网站的问题，比如有什么文章、Lucas 是谁，或者随便聊聊也行。",
            }]);
        }
        setIsOpen(true);
    };

    const handleInputFocus = () => {
        if (!isMobileLike) return;

        setTimeout(() => {
            inputRef.current?.scrollIntoView({ block: "nearest" });
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }, 180);
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
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.25 }}
                        className="chat-panel"
                        style={{
                            position: "fixed",
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                            zIndex: 9999,
                            background: "var(--background)",
                            border: "1px solid var(--border)",
                            boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
                            top: isMobileLike ? viewportOffsetTop : undefined,
                            bottom: isMobileLike ? "auto" : undefined,
                            height: isMobileLike ? (viewportHeight ? `${viewportHeight}px` : "100dvh") : undefined,
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "14px 16px",
                            borderBottom: "1px solid var(--border)",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{
                                    width: 7, height: 7, borderRadius: "50%",
                                    background: "#10B981",
                                    boxShadow: "0 0 6px rgba(16,185,129,0.4)",
                                }} />
                                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>
                                    AI 助手
                                </span>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                style={{
                                    background: "none", border: "none",
                                    color: "var(--muted)", cursor: "pointer",
                                    padding: 4, display: "flex",
                                }}
                            >
                                <X style={{ width: 18, height: 18 }} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
                            <AnimatePresence mode="popLayout">
                                {messages.map((message) => (
                                    <motion.div
                                        key={message.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2 }}
                                        style={{ marginBottom: 16 }}
                                    >
                                        {message.role === "user" ? (
                                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                                <div style={{
                                                    background: "var(--accent)",
                                                    color: "white",
                                                    borderRadius: "16px 16px 4px 16px",
                                                    padding: "8px 14px",
                                                    maxWidth: "80%",
                                                    fontSize: 14,
                                                    lineHeight: 1.6,
                                                    wordBreak: "break-word",
                                                }}>
                                                    {message.content}
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                {message.isTyping ? (
                                                    <TypingIndicator />
                                                ) : (
                                                    <>
                                                        <div style={{
                                                            fontSize: 14,
                                                            lineHeight: 1.7,
                                                            color: "var(--foreground)",
                                                            wordBreak: "break-word",
                                                        }}>
                                                            <MessageContent text={message.content} />
                                                        </div>
                                                        {message.contentCards && message.contentCards.length > 0 && message.cardType && (
                                                            <ContentCardList
                                                                cards={message.contentCards}
                                                                cardType={message.cardType}
                                                                onCardClick={(card) => { setIsOpen(false); router.push(card.href); }}
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
                        <div style={{
                            flexShrink: 0,
                            borderTop: "1px solid var(--border)",
                            padding: isMobileLike
                                ? "12px 16px calc(12px + env(safe-area-inset-bottom, 0px))"
                                : "12px 16px",
                        }}>
                            <div style={{
                                display: "flex",
                                alignItems: "flex-end",
                                gap: 8,
                                background: "var(--card)",
                                border: "1px solid var(--border)",
                                borderRadius: 12,
                                padding: "10px 10px 10px 16px",
                            }}>
                                <textarea
                                    id="chat-input"
                                    name="chat-input"
                                    ref={inputRef}
                                    value={inputValue}
                                    onChange={handleInput}
                                    onFocus={handleInputFocus}
                                    onKeyDown={handleKeyDown}
                                    placeholder="输入消息..."
                                    rows={1}
                                    disabled={isProcessing}
                                    style={{
                                        flex: 1,
                                        background: "transparent",
                                        border: "none",
                                        outline: "none",
                                        fontSize: 14,
                                        lineHeight: "24px",
                                        height: 24,
                                        maxHeight: 100,
                                        color: "var(--foreground)",
                                        resize: "none",
                                        fontFamily: "inherit",
                                    }}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!inputValue.trim() || isProcessing}
                                    style={{
                                        width: 30,
                                        height: 30,
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
                )}
            </AnimatePresence>
        </>
    );
}
