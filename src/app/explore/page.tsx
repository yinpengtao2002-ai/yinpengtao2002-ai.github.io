"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUp, ExternalLink } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { allDialoguePatterns, defaultResponses } from "@/lib/data/dialoguePatterns";
import { aiContent as staticAI, financeContent as staticFinance } from "@/lib/data/generated/content";

function MessageContent({ text }: { text: string }) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
                a: ({ href, children }) => (
                    <Link
                        href={href || "#"}
                        style={{
                            color: "var(--accent)",
                            textDecoration: "underline",
                            textUnderlineOffset: 3,
                        }}
                    >
                        {children}
                    </Link>
                ),
                p: ({ children }) => (
                    <p style={{ margin: "0.5em 0" }}>{children}</p>
                ),
                strong: ({ children }) => (
                    <strong style={{ fontWeight: 700, color: "var(--foreground)" }}>{children}</strong>
                ),
                ul: ({ children }) => (
                    <ul style={{ paddingLeft: 20, margin: "0.5em 0" }}>{children}</ul>
                ),
                ol: ({ children }) => (
                    <ol style={{ paddingLeft: 20, margin: "0.5em 0" }}>{children}</ol>
                ),
                li: ({ children }) => (
                    <li style={{ marginBottom: 4 }}>{children}</li>
                ),
                code: ({ children, className }) => {
                    const isBlock = className?.startsWith("language-");
                    if (isBlock) {
                        return (
                            <code
                                style={{
                                    display: "block",
                                    background: "var(--card)",
                                    border: "1px solid var(--border)",
                                    borderRadius: 8,
                                    padding: "12px 16px",
                                    fontSize: 13,
                                    overflowX: "auto",
                                    whiteSpace: "pre",
                                }}
                            >
                                {children}
                            </code>
                        );
                    }
                    return (
                        <code
                            style={{
                                background: "var(--card)",
                                border: "1px solid var(--border)",
                                borderRadius: 4,
                                padding: "2px 6px",
                                fontSize: "0.9em",
                            }}
                        >
                            {children}
                        </code>
                    );
                },
                pre: ({ children }) => (
                    <pre style={{ margin: "0.75em 0", overflow: "auto" }}>{children}</pre>
                ),
                blockquote: ({ children }) => (
                    <blockquote
                        style={{
                            borderLeft: "3px solid var(--accent)",
                            paddingLeft: 12,
                            margin: "0.5em 0",
                            color: "var(--muted)",
                        }}
                    >
                        {children}
                    </blockquote>
                ),
                table: ({ children }) => (
                    <div style={{ overflowX: "auto", margin: "0.5em 0" }}>
                        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
                            {children}
                        </table>
                    </div>
                ),
                th: ({ children }) => (
                    <th style={{ border: "1px solid var(--border)", padding: "6px 12px", textAlign: "left", fontWeight: 600 }}>
                        {children}
                    </th>
                ),
                td: ({ children }) => (
                    <td style={{ border: "1px solid var(--border)", padding: "6px 12px" }}>
                        {children}
                    </td>
                ),
            }}
        >
            {text}
        </ReactMarkdown>
    );
}

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

const GREETING_TYPING_MESSAGE: Message = {
    id: "greeting-typing",
    role: "assistant",
    content: "",
    isTyping: true,
};

const GREETING_MESSAGE: Message = {
    id: "greeting",
    role: "assistant",
    content: "你好！我是 Lucas 的 AI 助手。\n\n你可以问我任何关于这个网站的问题，比如有什么文章、Lucas 是谁，或者随便聊聊也行。",
};

function TypingIndicator() {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 0" }}>
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--muted)" }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
            ))}
        </div>
    );
}

function ContentCardList({
    cards,
    cardType,
    onCardClick,
}: {
    cards: ContentCard[];
    cardType: "ai" | "finance";
    onCardClick: (card: ContentCard) => void;
}) {
    const accentColor = cardType === "ai" ? "var(--accent)" : "var(--accent-secondary)";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
            {cards.map((card, index) => (
                <motion.button
                    key={card.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.05 }}
                    onClick={() => onCardClick(card)}
                    style={{
                        textAlign: "left",
                        padding: "12px 16px",
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        cursor: "pointer",
                        transition: "border-color 0.2s",
                    }}
                    whileHover={{ borderColor: accentColor }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>
                                    {card.title}
                                </span>
                                <ExternalLink style={{ width: 12, height: 12, color: "var(--muted)", flexShrink: 0 }} />
                            </div>
                            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, margin: 0 }}>
                                {card.description}
                            </p>
                        </div>
                        <span style={{ fontSize: 11, color: "var(--muted)", opacity: 0.6, flexShrink: 0 }}>{card.date}</span>
                    </div>
                </motion.button>
            ))}
        </div>
    );
}

function recognizeIntent(
    input: string,
    aiContent: ContentCard[],
    financeContent: ContentCard[]
): { response: string; contentCards?: ContentCard[]; cardType?: "ai" | "finance" } | null {
    const lower = input.toLowerCase().trim();

    for (const pattern of allDialoguePatterns) {
        if (pattern.keywords.some((k) => lower.includes(k))) {
            return { response: pattern.responses[Math.floor(Math.random() * pattern.responses.length)] };
        }
    }

    if (lower.includes("ai") || lower.includes("人工智能") || lower.includes("见闻") || lower.includes("chatgpt") || lower.includes("llm")) {
        if (aiContent.length === 0) return { response: "【AI 见闻】板块暂时还没有内容，敬请期待！" };
        return { response: "以下是【AI 见闻】板块的内容：", contentCards: aiContent, cardType: "ai" };
    }

    if (lower.includes("财务") || lower.includes("建模") || lower.includes("模型") || lower.includes("金融") || lower.includes("finance") || lower.includes("估值")) {
        if (financeContent.length === 0) return { response: "【财务建模】板块暂时还没有内容，敬请期待！" };
        return { response: "以下是【财务建模】板块的内容：", contentCards: financeContent, cardType: "finance" };
    }

    return { response: defaultResponses[Math.floor(Math.random() * defaultResponses.length)] };
}

export default function ExplorePage() {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>(() => [GREETING_TYPING_MESSAGE]);
    const [inputValue, setInputValue] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
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
        const timer = setTimeout(() => {
            setMessages([GREETING_MESSAGE]);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    const callChatAPI = async (allMessages: Message[], assistantMsgId: string): Promise<boolean> => {
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

        // Reset textarea height
        if (inputRef.current) inputRef.current.style.height = "24px";

        setMessages((prev) => [...prev, { id: "typing", role: "assistant", content: "", isTyping: true }]);
        const assistantMsgId = `assistant-${Date.now()}`;

        if (aiAvailable !== false) {
            const success = await callChatAPI(updatedMessages, assistantMsgId);
            if (success) { setIsProcessing(false); return; }
            setAiAvailable(false);
        }

        await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
        const result = recognizeIntent(userMessage.content, aiContent, financeContent);

        setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== "typing");
            return [...filtered, {
                id: assistantMsgId,
                role: "assistant" as const,
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
        el.style.height = Math.min(el.scrollHeight, 120) + "px";
    };

    return (
        <div style={{
            position: "fixed", inset: 0,
            display: "flex", flexDirection: "column",
            background: "var(--background)",
        }}>
            {/* Header */}
            <header style={{
                flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0 24px",
                height: 56,
                borderBottom: "1px solid var(--border)",
            }}>
                <Link
                    href="/"
                    style={{
                        display: "flex", alignItems: "center", gap: 8,
                        color: "var(--muted)", textDecoration: "none",
                        fontSize: 14, transition: "color 0.2s",
                    }}
                >
                    <ArrowLeft style={{ width: 18, height: 18 }} />
                    <span>首页</span>
                </Link>

                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>
                    AI 助手
                </span>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{
                        width: 7, height: 7, borderRadius: "50%",
                        background: "#10B981",
                        boxShadow: "0 0 6px rgba(16,185,129,0.4)",
                    }} />
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>在线</span>
                </div>
            </header>

            {/* Messages */}
            <div style={{
                flex: 1, overflowY: "auto",
                padding: "32px 0",
            }}>
                <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>
                    <AnimatePresence mode="popLayout">
                        {messages.map((message) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25 }}
                                style={{ marginBottom: 24 }}
                            >
                                {message.role === "user" ? (
                                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                        <div style={{
                                            background: "var(--accent)",
                                            color: "white",
                                            borderRadius: "20px 20px 4px 20px",
                                            padding: "10px 16px",
                                            maxWidth: "75%",
                                            fontSize: 15,
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
                                                    fontSize: 15,
                                                    lineHeight: 1.8,
                                                    color: "var(--foreground)",
                                                    wordBreak: "break-word",
                                                }}>
                                                    <MessageContent text={message.content} />
                                                </div>
                                                {message.contentCards && message.contentCards.length > 0 && message.cardType && (
                                                    <ContentCardList
                                                        cards={message.contentCards}
                                                        cardType={message.cardType}
                                                        onCardClick={(card) => router.push(card.href)}
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
            </div>

            {/* Input */}
            <div style={{
                flexShrink: 0,
                borderTop: "1px solid var(--border)",
                padding: "16px 24px 24px",
            }}>
                <div style={{
                    maxWidth: 720,
                    margin: "0 auto",
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 12,
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    padding: "12px 12px 12px 20px",
                    transition: "border-color 0.2s",
                }}>
                    <textarea
                        ref={inputRef}
                        value={inputValue}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        placeholder="输入消息..."
                        rows={1}
                        disabled={isProcessing}
                        style={{
                            flex: 1,
                            background: "transparent",
                            border: "none",
                            outline: "none",
                            fontSize: 15,
                            lineHeight: "24px",
                            height: 24,
                            maxHeight: 120,
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
                        <ArrowUp style={{ width: 16, height: 16 }} />
                    </button>
                </div>
            </div>
        </div>
    );
}
