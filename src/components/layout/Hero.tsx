"use client";

import { motion } from "framer-motion";
import ArtifactCard, { CodeArtifact, ChartArtifact, ImageArtifact } from "../ui/ArtifactCard";
import ThinkingSubtitle from "../ui/ThinkingSubtitle";
import { scrollToSection } from "@/lib/scroll";
import { useViewportProfile } from "@/lib/useLowMotionMode";

const HERO_SUBTITLE_FONT = 'var(--font-hero-display), "Songti SC", "STSong", "Noto Serif CJK SC", serif';

interface HeroProps {
    name: string;
    description?: string;
    profileLine?: string;
    subtitle?: string;
}

export default function Hero({
    description,
    name,
    profileLine,
    subtitle,
}: HeroProps) {
    const { lowMotion, isMobileLike } = useViewportProfile();
    const showArtifacts = !lowMotion;

    return (
        <div className="full-viewport fixed-viewport relative w-full overflow-hidden">
            {/* Background Effects */}
            <BackgroundEffects lowMotion={lowMotion} />

            {/* Main Content Group */}
            <div className="full-viewport fixed-viewport relative z-10 w-full">

                {/* Name & Subtitle - Centered vertically (50% mark) */}
                <div
                    className="absolute left-1/2 w-full flex flex-col items-center px-5 sm:px-6"
                    style={{
                        top: isMobileLike ? "47%" : "50%",
                        transform: "translate(-50%, -50%)",
                    }}
                >

                    {/* Artifact 1: Code Snippet - Floating Top Right */}
                    {showArtifacts && (
                        <div className="absolute -top-32 right-[10%] md:right-[20%] hidden sm:block">
                            <ArtifactCard delay={0.5} rotate={6} initialY={-20}>
                                <CodeArtifact />
                            </ArtifactCard>
                        </div>
                    )}

                    {/* Artifact 2: Chart - Floating Bottom Left */}
                    {showArtifacts && (
                        <div className="absolute -bottom-24 left-[5%] md:left-[15%] hidden sm:block">
                            <ArtifactCard delay={1.2} rotate={-4} initialY={0}>
                                <ChartArtifact />
                            </ArtifactCard>
                        </div>
                    )}

                    {/* Artifact 3: Image/Icon - Floating Top Left (Farther out) */}
                    {showArtifacts && (
                        <div className="absolute -top-20 left-[2%] md:left-[10%] hidden md:block">
                            <ArtifactCard delay={2.5} rotate={-8} initialY={-40}>
                                <ImageArtifact />
                            </ArtifactCard>
                        </div>
                    )}

                    {/* Name */}
                    <motion.div
                        initial={lowMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 20 }}
                        animate={lowMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: lowMotion ? 0.4 : 0.8, ease: "easeOut" }}
                        className="text-center w-full relative z-20"
                    >
                        <h1
                            className="text-6xl sm:text-8xl md:text-9xl font-bold tracking-tighter"
                            style={{
                                color: "var(--foreground)",
                                fontSize: isMobileLike ? "clamp(3.1rem, 15vw, 4.8rem)" : undefined,
                                lineHeight: isMobileLike ? 0.94 : 1,
                                whiteSpace: isMobileLike ? "normal" : "nowrap",
                                paddingInline: isMobileLike ? "0.5rem" : 0,
                            }}
                        >
                            <span className="gradient-text">{name}</span>
                        </h1>
                    </motion.div>

                    {/* Subtitle / Chinese Name */}
                    {subtitle && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: lowMotion ? 0.4 : 1, delay: lowMotion ? 0.15 : 0.4 }}
                            className="relative z-20 border-t border-border w-full flex flex-col items-center"
                            style={{
                                maxWidth: "42rem",
                                marginTop: isMobileLike ? "1.25rem" : "2rem",
                                paddingTop: isMobileLike ? "1rem" : "1.5rem",
                                gap: isMobileLike ? "0.6rem" : "1rem",
                                fontFamily: HERO_SUBTITLE_FONT,
                            }}
                        >
                            <ThinkingSubtitle
                                finalText={subtitle}
                                thoughts={["Thinking...", "Tuning...", "Designing..."]}
                                reducedMotion={lowMotion}
                                className={isMobileLike
                                    ? "text-base font-normal tracking-[0.16em] uppercase"
                                    : "text-xl sm:text-2xl md:text-3xl font-normal tracking-[0.34em] uppercase"}
                            />

                            {profileLine && (
                                <motion.p
                                    initial={{ opacity: 0, y: lowMotion ? 0 : 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: lowMotion ? 0.35 : 0.7, delay: lowMotion ? 0.2 : 2.4 }}
                                    style={{
                                        margin: 0,
                                        color: "var(--accent)",
                                        fontFamily:
                                            'var(--font-poppins), "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif',
                                        fontSize: isMobileLike ? "0.8rem" : "0.95rem",
                                        fontWeight: 600,
                                        letterSpacing: 0,
                                        lineHeight: 1.6,
                                        textAlign: "center",
                                    }}
                                >
                                    {profileLine}
                                </motion.p>
                            )}

                            {/* Welcome Message */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: lowMotion ? 0.35 : 1, delay: lowMotion ? 0.25 : 3.5 }}
                            >
                                <ThinkingSubtitle
                                    finalText="这里记录我的财务模型、文章和工具实践。"
                                    thoughts={["Loading content...", "Preparing welcome message..."]}
                                    reducedMotion={lowMotion}
                                    className={isMobileLike
                                        ? "text-sm font-normal tracking-[0.12em] text-[#d97757]"
                                        : "text-lg sm:text-xl font-normal tracking-[0.24em] text-[#d97757]"}
                                />
                            </motion.div>

                            {description && (
                                <motion.p
                                    initial={{ opacity: 0, y: lowMotion ? 0 : 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: lowMotion ? 0.35 : 0.8, delay: lowMotion ? 0.35 : 4.1 }}
                                    style={{
                                        maxWidth: isMobileLike ? "20rem" : "34rem",
                                        margin: 0,
                                        color: "var(--muted)",
                                        fontFamily:
                                            'var(--font-poppins), "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif',
                                        fontSize: isMobileLike ? "0.8rem" : "0.95rem",
                                        lineHeight: 1.8,
                                        textAlign: "center",
                                    }}
                                >
                                    &ldquo;{description}&rdquo;
                                </motion.p>
                            )}
                        </motion.div>
                    )}
                </div>

                {/* Scroll Down Indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 2 }}
                    className="absolute bottom-[8%] left-0 w-full flex justify-center"
                >
                    <motion.button
                        type="button"
                        onClick={() => scrollToSection("finance-articles")}
                        animate={lowMotion ? undefined : { y: [0, 8, 0] }}
                        transition={lowMotion ? undefined : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="font-sans flex flex-col items-center gap-2 text-muted hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0"
                        aria-label="滚动到财务模型区域"
                    >
                        <span className="text-xs tracking-[0.2em]">向下滑动 探索更多</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M12 5v14M5 12l7 7 7-7" />
                        </svg>
                    </motion.button>
                </motion.div>
            </div>
        </div>
    );
}

function BackgroundEffects({ lowMotion }: { lowMotion: boolean }) {
    return (
        <div className="fixed inset-0 pointer-events-none -z-10">
            {/* Anthropic Orange glow */}
            <motion.div
                animate={lowMotion ? { opacity: 0.55 } : {
                    x: [0, 30, 0],
                    y: [0, -30, 0],
                }}
                transition={lowMotion ? { duration: 0.3 } : {
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className={lowMotion
                    ? "absolute top-[18%] left-[10%] w-[320px] h-[320px] bg-[#d97757]/8 rounded-full blur-[72px]"
                    : "absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#d97757]/10 rounded-full blur-[100px]"}
            />
            {/* Anthropic Blue glow */}
            <motion.div
                animate={lowMotion ? { opacity: 0.5 } : {
                    x: [0, -30, 0],
                    y: [0, 30, 0],
                }}
                transition={lowMotion ? { duration: 0.3 } : {
                    duration: 25,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className={lowMotion
                    ? "absolute bottom-[14%] right-[8%] w-[340px] h-[340px] bg-[#6a9bcc]/8 rounded-full blur-[80px]"
                    : "absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#6a9bcc]/10 rounded-full blur-[120px]"}
            />
        </div>
    );
}
