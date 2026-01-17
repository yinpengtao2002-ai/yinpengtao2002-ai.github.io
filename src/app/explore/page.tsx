"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Send, Sparkles, TrendingUp, ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { allDialoguePatterns, defaultResponses } from "@/lib/data/dialoguePatterns";

/* Claude-style serif font for literary feel */
const serifFont = "'Palatino Linotype', 'Book Antiqua', Palatino, 'Times New Roman', serif";
const sansFont = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// Message type definition
interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    buttons?: { label: string; href: string; icon: "ai" | "finance" }[];
    isTyping?: boolean;
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

// Feature Card component (fka NavButton)
function FeatureCard({
    label,
    href,
    icon,
}: {
    label: string;
    href: string;
    icon: "ai" | "finance";
}) {
    const router = useRouter();

    const handleClick = () => {
        router.push(href);
    };

    const isAI = icon === "ai";
    const hoverBorderColor = isAI ? "#d97757" : "#6a9bcc";

    return (
        <motion.button
            onClick={handleClick}
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

// Chat bubble component - Claude magazine style
function ChatBubble({ message, isLast }: { message: Message; isLast: boolean }) {
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
                            {message.buttons && message.buttons.length > 0 && isLast && (
                                <div className="flex flex-wrap gap-4 mt-6">
                                    {message.buttons.map((btn, idx) => (
                                        <FeatureCard
                                            key={idx}
                                            label={btn.label}
                                            href={btn.href}
                                            icon={btn.icon}
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

// Intent recognition function
function recognizeIntent(
    input: string
): { response: string; action?: string } | null {
    const lowerInput = input.toLowerCase().trim();

    // Check chit-chat patterns from comprehensive dialogue library (100+ patterns)
    for (const pattern of allDialoguePatterns) {
        if (pattern.keywords.some(k => lowerInput.includes(k))) {
            const randomResponse = pattern.responses[Math.floor(Math.random() * pattern.responses.length)];
            return { response: randomResponse };
        }
    }

    // AI navigation
    if (lowerInput.includes("ai") || lowerInput.includes("人工智能") || lowerInput.includes("见闻") || lowerInput.includes("chatgpt") || lowerInput.includes("llm")) {
        return {
            response: "明白，带你去探索 AI 的前沿见闻！🚀",
            action: "/ai",
        };
    }

    // Finance navigation
    if (
        lowerInput.includes("财务") ||
        lowerInput.includes("建模") ||
        lowerInput.includes("模型") ||
        lowerInput.includes("金融") ||
        lowerInput.includes("finance") ||
        lowerInput.includes("估值")
    ) {
        return {
            response: "收到，让我们一起开启财务建模之旅。📊",
            action: "/finance",
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
                        { label: "AI 见闻", href: "/ai", icon: "ai" },
                        { label: "财务建模", href: "/finance", icon: "finance" },
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

        // Recognize intent
        const result = recognizeIntent(userMessage.content);

        // Remove typing indicator and add response
        setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== "typing");
            return [
                ...filtered,
                {
                    id: `assistant-${Date.now()}`,
                    role: "assistant",
                    content: result?.response || "我不太明白你的意思。",
                    buttons: !result?.action
                        ? [
                            { label: "AI 见闻", href: "/ai", icon: "ai" },
                            { label: "财务建模", href: "/finance", icon: "finance" },
                        ]
                        : undefined,
                },
            ];
        });

        setIsProcessing(false);

        // Navigate if action exists
        if (result?.action) {
            setTimeout(() => {
                router.push(result.action!);
            }, 1500);
        }
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
