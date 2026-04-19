"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { allDialoguePatterns, defaultResponses } from "@/lib/data/dialoguePatterns";
import { aiContent as staticAI, financeContent as staticFinance } from "@/lib/data/generated/content";

/* Claude-style serif font for literary feel */
const serifFont = "'Palatino Linotype', 'Book Antiqua', Palatino, 'Times New Roman', serif";
const sansFont = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// Content card type for inline display
interface ContentCard {
    id: number;
    title: string;
    description: string;
    category?: string;
    date: string;
    href: string;
}

// Message type definition
interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    isTyping?: boolean;
    // NEW: Inline content cards
    contentCards?: ContentCard[];
    cardType?: "ai" | "finance";
}

// Typing indicator component
function TypingIndicator() {
    return (
        <div className="flex items-center gap-1 px-4 py-3">
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#d97757]"
                    animate={{
                        opacity: [0.3, 1, 0.3],
                        scale: [0.8, 1, 0.8],
                    }}
                    transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: i * 0.2,
                    }}
                />
            ))}
        </div>
    );
}

// Content Card List component - displays articles/projects inline
function ContentCardList({
    cards,
    cardType,
    onCardClick,
}: {
    cards: ContentCard[];
    cardType: "ai" | "finance";
    onCardClick: (card: ContentCard) => void;
}) {
    const isAI = cardType === "ai";
    const accentColor = isAI ? "#d97757" : "#6a9bcc";

    return (
        <div className="grid grid-cols-1 gap-3 mt-4">
            {cards.map((card, index) => (
                <motion.button
                    key={card.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    onClick={() => onCardClick(card)}
                    className="group text-left p-4 rounded-xl transition-all duration-300"
                    style={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    }}
                    whileHover={{
                        y: -2,
                        boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
                        borderColor: accentColor,
                    }}
                    whileTap={{ scale: 0.98 }}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h4
                                    className="text-[15px] font-semibold truncate"
                                    style={{ color: 'var(--foreground)', fontFamily: sansFont }}
                                >
                                    {card.title}
                                </h4>
                                {card.href && (
                                    <ExternalLink className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                                )}
                            </div>
                            <p
                                className="text-[13px] line-clamp-2"
                                style={{ color: 'var(--muted)', lineHeight: '1.5' }}
                            >
                                {card.description}
                            </p>
                            {card.category && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    <span
                                        className="text-[11px] px-2 py-0.5 rounded-full"
                                        style={{
                                            background: `${accentColor}15`,
                                            color: accentColor,
                                        }}
                                    >
                                        {card.category}
                                    </span>
                                </div>
                            )}
                        </div>
                        <span className="text-[11px] text-muted flex-shrink-0">{card.date}</span>
                    </div>
                </motion.button>
            ))}
        </div>
    );
}

// Chat bubble component - Claude magazine style
function ChatBubble({
    message,
    onCardClick,
}: {
    message: Message;
    isLast: boolean;
    onCardClick?: (card: ContentCard) => void;
}) {
    const isUser = message.role === "user";

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full"
        >
            {isUser ? (
                /* ===== USER MESSAGE - Right aligned gray box ===== */
                <div className="flex justify-end">
                    <div
                        style={{
                            background: 'var(--card)',
                            borderRadius: '12px',
                            padding: '12px 18px',
                            maxWidth: '70%',
                            border: '1px solid var(--border)',
                        }}
                    >
                        <p
                            style={{
                                fontSize: '15px',
                                lineHeight: '1.6',
                                color: 'var(--foreground)',
                                fontFamily: sansFont,
                                margin: 0,
                            }}
                        >
                            {message.content}
                        </p>
                    </div>
                </div>
            ) : (
                /* ===== AI MESSAGE - No bubble, centered content, literary style ===== */
                <div
                    className="mx-auto"
                    style={{
                        maxWidth: '650px',
                        paddingLeft: '20px',
                        paddingRight: '20px',
                    }}
                >
                    {message.isTyping ? (
                        <TypingIndicator />
                    ) : (
                        <>
                            <p
                                style={{
                                    fontSize: '16px',
                                    lineHeight: '1.85',
                                    color: 'var(--foreground)',
                                    fontFamily: serifFont,
                                    letterSpacing: '0.01em',
                                    margin: 0,
                                }}
                            >
                                {message.content}
                            </p>
                            {/* Inline content cards */}
                            {message.contentCards && message.contentCards.length > 0 && message.cardType && onCardClick && (
                                <ContentCardList
                                    cards={message.contentCards}
                                    cardType={message.cardType}
                                    onCardClick={onCardClick}
                                />
                            )}
                        </>
                    )}
                </div>
            )}
        </motion.div>
    );
}

// Intent recognition function - now returns contentCards for inline display
function recognizeIntent(
    input: string,
    aiContent: ContentCard[],
    financeContent: ContentCard[]
): { response: string; action?: string; contentCards?: ContentCard[]; cardType?: "ai" | "finance" } | null {
    const lowerInput = input.toLowerCase().trim();

    // Check chit-chat patterns from comprehensive dialogue library (100+ patterns)
    for (const pattern of allDialoguePatterns) {
        if (pattern.keywords.some(k => lowerInput.includes(k))) {
            const randomResponse = pattern.responses[Math.floor(Math.random() * pattern.responses.length)];
            return { response: randomResponse };
        }
    }

    // AI content - show inline cards instead of navigation
    if (lowerInput.includes("ai") || lowerInput.includes("人工智能") || lowerInput.includes("见闻") || lowerInput.includes("chatgpt") || lowerInput.includes("llm")) {
        if (aiContent.length === 0) {
            return {
                response: "【AI 见闻】板块暂时还没有内容哦，敬请期待！✨",
            };
        }
        return {
            response: "好的！以下是【AI 见闻】板块的内容，选择一个你感兴趣的话题：",
            contentCards: aiContent,
            cardType: "ai",
        };
    }

    // Finance content - show inline cards instead of navigation
    if (
        lowerInput.includes("财务") ||
        lowerInput.includes("建模") ||
        lowerInput.includes("模型") ||
        lowerInput.includes("金融") ||
        lowerInput.includes("finance") ||
        lowerInput.includes("估值")
    ) {
        if (financeContent.length === 0) {
            return {
                response: "【财务建模】板块暂时还没有内容哦，敬请期待！📊",
            };
        }
        return {
            response: "收到！以下是【财务建模】板块的内容，选择你感兴趣的项目：",
            contentCards: financeContent,
            cardType: "finance",
        };
    }

    // Default response - warmer fallback from comprehensive library (10 options)
    return {
        response: defaultResponses[Math.floor(Math.random() * defaultResponses.length)],
    };
}

// Main component
export default function ExplorePage() {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Content loaded from static generated data (prebuild script)
    // Convert from generated ContentItem to local ContentCard format
    const aiContent: ContentCard[] = staticAI.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        date: item.date,
        category: item.category ?? undefined,
        href: item.href,
    }));
    const financeContent: ContentCard[] = staticFinance.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        date: item.date,
        category: item.category ?? undefined,
        href: item.href,
    }));

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Auto-greeting on mount
    useEffect(() => {
        const greeting: Message = {
            id: "greeting-typing",
            role: "assistant",
            content: "",
            isTyping: true,
        };
        setMessages([greeting]);

        const timer = setTimeout(() => {
            setMessages([
                {
                    id: "greeting",
                    role: "assistant",
                    content:
                        "你好！我是 Lucas 的 AI 助手。\n\n你可以问我任何关于这个网站的问题，比如有什么文章、Lucas 是谁，或者随便聊聊也行 😊",
                },
            ]);
        }, 1200);

        return () => clearTimeout(timer);
    }, []);

    // Try calling Claude API with streaming
    const callClaudeAPI = async (
        allMessages: Message[],
        assistantMsgId: string
    ): Promise<boolean> => {
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

            // Mark AI as available
            if (aiAvailable === null) setAiAvailable(true);

            // Stream the response
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let fullText = "";

            // Replace typing indicator with empty assistant message
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === "typing"
                        ? { ...m, id: assistantMsgId, isTyping: false, content: "" }
                        : m
                )
            );

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split("\n");

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const data = line.slice(6);
                    if (data === "[DONE]") break;

                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.text) {
                            fullText += parsed.text;
                            const currentText = fullText;
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantMsgId
                                        ? { ...m, content: currentText }
                                        : m
                                )
                            );
                        }
                    } catch {
                        // Skip malformed chunks
                    }
                }
            }

            return fullText.length > 0;
        } catch {
            return false;
        }
    };

    // Handle send message
    const handleSend = async () => {
        if (!inputValue.trim() || isProcessing) return;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: "user",
            content: inputValue.trim(),
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInputValue("");
        setIsProcessing(true);

        // Add typing indicator
        setMessages((prev) => [
            ...prev,
            { id: "typing", role: "assistant", content: "", isTyping: true },
        ]);

        const assistantMsgId = `assistant-${Date.now()}`;

        // Try real AI first (skip if already known unavailable)
        if (aiAvailable !== false) {
            const success = await callClaudeAPI(updatedMessages, assistantMsgId);
            if (success) {
                setIsProcessing(false);
                return;
            }
            // Mark as unavailable so we don't retry every message
            setAiAvailable(false);
        }

        // Fallback to regex pattern matching
        await new Promise((resolve) =>
            setTimeout(resolve, 600 + Math.random() * 400)
        );

        const result = recognizeIntent(
            userMessage.content,
            aiContent,
            financeContent
        );

        setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== "typing");
            return [
                ...filtered,
                {
                    id: assistantMsgId,
                    role: "assistant" as const,
                    content: result?.response || "我不太明白你的意思。",
                    contentCards: result?.contentCards,
                    cardType: result?.cardType,
                },
            ];
        });

        setIsProcessing(false);
    };

    // Handle card click - navigate to article page
    const handleCardClick = (card: ContentCard) => {
        router.push(card.href);
    };

    // Handle key press
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        /* ========== LAYER 1: App Background Layer ========== */
        <div className="fixed inset-0 w-screen h-screen overflow-hidden" style={{ background: 'linear-gradient(to bottom right, var(--background), var(--border), var(--background))' }}>
            {/* Subtle decorative elements on background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Large ambient orb - top right */}
                <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-gradient-radial from-[#d97757]/8 via-[#d97757]/3 to-transparent rounded-full blur-3xl" />
                {/* Large ambient orb - bottom left */}
                <div className="absolute -bottom-48 -left-32 w-[500px] h-[500px] bg-gradient-radial from-[#6a9bcc]/10 via-[#6a9bcc]/4 to-transparent rounded-full blur-3xl" />
                {/* Subtle grid pattern overlay */}
                <div
                    className="absolute inset-0 opacity-[0.015]"
                    style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, #000 1px, transparent 0)`,
                        backgroundSize: '48px 48px'
                    }}
                />
            </div>

            {/* ========== LAYER 2: Floating Chat Window Container ========== */}
            <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-[900px] h-[85vh] max-h-[800px] flex flex-col overflow-hidden"
                style={{
                    boxShadow: `
                        0 0 0 1px rgba(0, 0, 0, 0.03),
                        0 4px 6px -1px rgba(0, 0, 0, 0.04),
                        0 10px 20px -5px rgba(0, 0, 0, 0.06),
                        0 25px 50px -12px rgba(0, 0, 0, 0.08)
                    `,
                    borderRadius: '20px',
                    /* Pure warm white - Claude's paper texture */
                    background: 'var(--background)',
                }}
            >
                {/* ========== LAYER 3: Window Internal Layout ========== */}

                {/* Window Header - minimal, elegant */}
                <header
                    className="flex-shrink-0"
                    style={{
                        borderBottom: '1px solid var(--border)',
                        background: 'var(--background)',
                        padding: '16px 28px',
                    }}
                >
                    <div className="relative flex items-center justify-between">
                        {/* Back button - left */}
                        <Link
                            href="/"
                            className="flex items-center gap-2 text-muted hover:text-foreground transition-colors group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                            <span style={{ fontSize: '13px', fontFamily: sansFont }}>返回</span>
                        </Link>

                        {/* Status indicator - right */}
                        <div className="flex items-center gap-2">
                            <div
                                className="w-2 h-2 rounded-full animate-pulse"
                                style={{ background: '#10B981', boxShadow: '0 0 6px rgba(16, 185, 129, 0.4)' }}
                            />
                            <span style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: sansFont }}>在线</span>
                        </div>
                    </div>
                </header>

                {/* Messages Area - Magazine style with generous whitespace */}
                <div
                    className="flex-1 overflow-y-auto"
                    style={{
                        background: 'var(--background)',
                        padding: '40px 24px',
                    }}
                >
                    <div className="space-y-8">
                        <AnimatePresence mode="popLayout">
                            {messages.map((message, index) => (
                                <ChatBubble
                                    key={message.id}
                                    message={message}
                                    isLast={index === messages.length - 1}
                                    onCardClick={handleCardClick}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div
                    className="flex-shrink-0"
                    style={{
                        padding: '16px 24px 24px 24px',
                        background: 'var(--background)',
                    }}
                >
                    {/* Floating input island */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        style={{
                            background: 'var(--card)',
                            borderRadius: '16px',
                            border: '1px solid var(--border)',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                        }}
                    >
                        <div className="flex items-center gap-4 px-5 py-4">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="Reply..."
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    fontSize: '15px',
                                    color: 'var(--foreground)',
                                    fontFamily: sansFont,
                                    outline: 'none',
                                    border: 'none',
                                }}
                                disabled={isProcessing}
                            />
                            <motion.button
                                onClick={handleSend}
                                disabled={!inputValue.trim() || isProcessing}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: inputValue.trim() && !isProcessing ? 'var(--accent)' : 'var(--border)',
                                    color: inputValue.trim() && !isProcessing ? '#FFFFFF' : 'var(--muted)',
                                    border: 'none',
                                    cursor: inputValue.trim() && !isProcessing ? 'pointer' : 'default',
                                    transition: 'all 0.2s ease',
                                }}
                                whileHover={
                                    inputValue.trim() && !isProcessing
                                        ? { scale: 1.05 }
                                        : {}
                                }
                                whileTap={
                                    inputValue.trim() && !isProcessing
                                        ? { scale: 0.95 }
                                        : {}
                                }
                            >
                                <ArrowUpRight className="w-4 h-4" />
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
