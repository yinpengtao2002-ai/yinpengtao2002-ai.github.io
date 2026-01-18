"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Send, Sparkles, TrendingUp, ArrowLeft, ArrowUpRight, ExternalLink } from "lucide-react";
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
    buttons?: { label: string; icon: "ai" | "finance" }[];
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

// Feature Card component - now uses onClick callback instead of navigation
function FeatureCard({
    label,
    icon,
    onClick,
}: {
    label: string;
    icon: "ai" | "finance";
    onClick: () => void;
}) {
    const isAI = icon === "ai";
    const hoverBorderColor = isAI ? "#d97757" : "#6a9bcc";

    return (
        <motion.button
            onClick={onClick}
            className="flex items-center gap-3 px-6 py-4 rounded-xl transition-all duration-300 group text-left"
            style={{
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                minWidth: '160px',
            }}
            whileHover={{
                y: -2,
                boxShadow: '0 8px 15px rgba(0,0,0,0.1)',
                borderColor: hoverBorderColor
            }}
            whileTap={{ scale: 0.98 }}
        >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 group-hover:bg-white transition-colors" style={{ fontSize: '20px' }}>
                {isAI ? "✨" : "📈"}
            </div>
            <div className="flex flex-col">
                <span
                    className="text-[15px] font-semibold"
                    style={{ color: '#374151', fontFamily: sansFont }}
                >
                    {label}
                </span>
                <span className="text-[11px] text-gray-400 font-medium">Click to explore</span>
            </div>
        </motion.button>
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
                        background: '#FFFFFF',
                        border: '1px solid #E5E7EB',
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
                                    style={{ color: '#1F2937', fontFamily: sansFont }}
                                >
                                    {card.title}
                                </h4>
                                {card.href && (
                                    <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                )}
                            </div>
                            <p
                                className="text-[13px] line-clamp-2"
                                style={{ color: '#6B7280', lineHeight: '1.5' }}
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
                        <span className="text-[11px] text-gray-400 flex-shrink-0">{card.date}</span>
                    </div>
                </motion.button>
            ))}
        </div>
    );
}

// Chat bubble component - Claude magazine style
function ChatBubble({
    message,
    isLast,
    onCardClick,
    onFeatureClick
}: {
    message: Message;
    isLast: boolean;
    onCardClick?: (card: ContentCard) => void;
    onFeatureClick?: (icon: "ai" | "finance") => void;
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
                            background: '#F3F4F6',
                            borderRadius: '12px',
                            padding: '12px 18px',
                            maxWidth: '70%',
                            border: '1px solid #E5E7EB',
                        }}
                    >
                        <p
                            style={{
                                fontSize: '15px',
                                lineHeight: '1.6',
                                color: '#1F2937',
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
                                    color: '#374151',
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
                            {/* FeatureButtons (for greeting) */}
                            {message.buttons && message.buttons.length > 0 && isLast && onFeatureClick && (
                                <div className="flex flex-wrap gap-4 mt-6">
                                    {message.buttons.map((btn, idx) => (
                                        <FeatureCard
                                            key={idx}
                                            label={btn.label}
                                            icon={btn.icon}
                                            onClick={() => onFeatureClick(btn.icon)}
                                        />
                                    ))}
                                </div>
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
                        "你好！我是 Lucas。\n\n你可以点击下方按钮，或者直接告诉我带你去【AI 见闻】还是【财务建模】板块。试试输入 \"带我去AI\"？",
                    buttons: [
                        { label: "AI 见闻", icon: "ai" as const },
                        { label: "财务建模", icon: "finance" as const },
                    ],
                },
            ]);
        }, 1200);

        return () => clearTimeout(timer);
    }, []);

    // Handle send message
    const handleSend = async () => {
        if (!inputValue.trim() || isProcessing) return;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: "user",
            content: inputValue.trim(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue("");
        setIsProcessing(true);

        // Add typing indicator
        const typingMessage: Message = {
            id: "typing",
            role: "assistant",
            content: "",
            isTyping: true,
        };
        setMessages((prev) => [...prev, typingMessage]);

        // Simulate processing delay
        await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 600));

        // Recognize intent with dynamic content
        const result = recognizeIntent(userMessage.content, aiContent, financeContent);

        // Remove typing indicator and add response
        setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== "typing");
            return [
                ...filtered,
                {
                    id: `assistant-${Date.now()}`,
                    role: "assistant",
                    content: result?.response || "我不太明白你的意思。",
                    // Include content cards if available
                    contentCards: result?.contentCards,
                    cardType: result?.cardType,
                    // Show buttons only if no content cards
                    buttons: !result?.contentCards
                        ? [
                            { label: "AI 见闻", href: "/ai", icon: "ai" as const },
                            { label: "财务建模", href: "/finance", icon: "finance" as const },
                        ]
                        : undefined,
                },
            ];
        });

        setIsProcessing(false);
    };

    // Handle card click - navigate to article page
    const handleCardClick = (card: ContentCard) => {
        router.push(card.href);
    };

    // Handle feature card click - show content cards inline (same as typing)
    const handleFeatureClick = (icon: "ai" | "finance") => {
        // Simulate user input for the clicked section
        const userInput = icon === "ai" ? "AI 见闻" : "财务建模";

        // Add user message bubble
        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: "user",
            content: userInput,
        };
        setMessages((prev) => [...prev, userMessage]);

        // Then add content cards as response using dynamic content state
        setTimeout(() => {
            if (icon === "ai") {
                if (aiContent.length === 0) {
                    setMessages((prev) => [...prev, {
                        id: `assistant-${Date.now()}`,
                        role: "assistant",
                        content: "【AI 见闻】板块暂时还没有内容哦，敬请期待！✨",
                    }]);
                    return;
                }
                setMessages((prev) => [...prev, {
                    id: `assistant-${Date.now()}`,
                    role: "assistant",
                    content: "好的！以下是【AI 见闻】板块的内容，选择一个你感兴趣的话题：",
                    contentCards: aiContent,
                    cardType: "ai" as const,
                }]);
            } else {
                if (financeContent.length === 0) {
                    setMessages((prev) => [...prev, {
                        id: `assistant-${Date.now()}`,
                        role: "assistant",
                        content: "【财务建模】板块暂时还没有内容哦，敬请期待！📊",
                    }]);
                    return;
                }
                setMessages((prev) => [...prev, {
                    id: `assistant-${Date.now()}`,
                    role: "assistant",
                    content: "收到！以下是【财务建模】板块的内容，选择你感兴趣的项目：",
                    contentCards: financeContent,
                    cardType: "finance" as const,
                }]);
            }
        }, 400);
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
        <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-[#f5f3ef] via-[#ebe7e0] to-[#e2ddd4] overflow-hidden">
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
                    background: '#FBF9F6',
                }}
            >
                {/* ========== LAYER 3: Window Internal Layout ========== */}

                {/* Window Header - minimal, elegant */}
                <header
                    className="flex-shrink-0"
                    style={{
                        borderBottom: '1px solid #EBE8E3',
                        background: '#FBF9F6',
                        padding: '16px 28px',
                    }}
                >
                    <div className="relative flex items-center justify-between">
                        {/* Back button - left */}
                        <Link
                            href="/"
                            className="flex items-center gap-2 text-[#9A9488] hover:text-[#5C5549] transition-colors group"
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
                            <span style={{ fontSize: '12px', color: '#9A9488', fontFamily: sansFont }}>在线</span>
                        </div>
                    </div>
                </header>

                {/* Messages Area - Magazine style with generous whitespace */}
                <div
                    className="flex-1 overflow-y-auto"
                    style={{
                        background: '#FBF9F6',
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
                                    onFeatureClick={handleFeatureClick}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area - Floating island at bottom */}
                <div
                    className="flex-shrink-0"
                    style={{
                        padding: '16px 24px 24px 24px',
                        background: '#FBF9F6',
                    }}
                >
                    {/* Quick Access Cards (Grand Style) */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <motion.button
                            onClick={() => handleFeatureClick("ai")}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 group text-left relative overflow-hidden"
                            style={{
                                background: '#FFFFFF',
                                borderColor: '#E5E7EB',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                            }}
                            whileHover={{
                                y: -2,
                                boxShadow: '0 8px 12px rgba(217, 119, 87, 0.1)',
                                borderColor: '#d97757'
                            }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-[#FFF0EB] text-[#d97757] group-hover:scale-110 transition-transform duration-300">
                                <span className="text-xl">✨</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[14px] font-bold text-gray-700 group-hover:text-[#d97757] transition-colors">AI 见闻</span>
                                <span className="text-[10px] text-gray-400">探索前沿科技</span>
                            </div>
                        </motion.button>

                        <motion.button
                            onClick={() => handleFeatureClick("finance")}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 group text-left relative overflow-hidden"
                            style={{
                                background: '#FFFFFF',
                                borderColor: '#E5E7EB',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                            }}
                            whileHover={{
                                y: -2,
                                boxShadow: '0 8px 12px rgba(106, 155, 204, 0.1)',
                                borderColor: '#6a9bcc'
                            }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-[#F0F7FF] text-[#6a9bcc] group-hover:scale-110 transition-transform duration-300">
                                <span className="text-xl">📈</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[14px] font-bold text-gray-700 group-hover:text-[#6a9bcc] transition-colors">财务建模</span>
                                <span className="text-[10px] text-gray-400">洞察商业价值</span>
                            </div>
                        </motion.button>
                    </div>

                    {/* Floating input island */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        style={{
                            background: '#FFFFFF',
                            borderRadius: '16px',
                            border: '1px solid #E5E7EB',
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
                                    color: '#374151',
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
                                    background: inputValue.trim() && !isProcessing ? '#D97757' : '#E5E7EB',
                                    color: inputValue.trim() && !isProcessing ? '#FFFFFF' : '#9CA3AF',
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
