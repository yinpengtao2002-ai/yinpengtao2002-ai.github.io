"use client";

import { motion } from "framer-motion";
import ArtifactCard, { CodeArtifact, ChartArtifact, ImageArtifact } from "../ui/ArtifactCard";
import ThinkingSubtitle from "../ui/ThinkingSubtitle";
import { scrollToSection } from "@/lib/scroll";
import { useLowMotionMode } from "@/lib/useLowMotionMode";

interface HeroProps {
    name: string;
    subtitle?: string;
}

export default function Hero({
    name,
    subtitle,
}: HeroProps) {
    const lowMotion = useLowMotionMode();
    const showArtifacts = !lowMotion;

    return (
        <div className="full-viewport fixed-viewport relative w-full overflow-hidden">
            {/* Background Effects */}
            <BackgroundEffects lowMotion={lowMotion} />

            {/* Main Content Group */}
            <div className="full-viewport fixed-viewport relative z-10 w-full">

                {/* Name & Subtitle - Centered vertically (50% mark) */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full flex flex-col items-center">

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
                        <h1 className="text-6xl sm:text-8xl md:text-9xl font-bold tracking-tighter whitespace-nowrap" style={{ color: 'var(--foreground)' }}>
                            <span className="gradient-text">{name}</span>
                        </h1>
                    </motion.div>

                    {/* Subtitle / Chinese Name */}
                    {subtitle && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: lowMotion ? 0.4 : 1, delay: lowMotion ? 0.15 : 0.4 }}
                            className="relative z-20 mt-8 pt-6 border-t border-border w-full max-w-3xl flex flex-col items-center gap-4"
                        >
                            <ThinkingSubtitle
                                finalText={subtitle}
                                thoughts={["Thinking...", "Initializing Personality...", "Designing Portfolio..."]}
                                reducedMotion={lowMotion}
                                className="text-xl sm:text-2xl md:text-3xl font-light tracking-[0.3em] uppercase"
                            />

                            {/* Welcome Message */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: lowMotion ? 0.35 : 1, delay: lowMotion ? 0.25 : 3.5 }}
                            >
                                <ThinkingSubtitle
                                    finalText="欢迎参观我的个人网站"
                                    thoughts={["Loading content...", "Preparing welcome message..."]}
                                    reducedMotion={lowMotion}
                                    className="text-lg sm:text-xl font-light tracking-[0.2em] text-[#d97757]"
                                />
                            </motion.div>
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
                        onClick={() => scrollToSection("about")}
                        animate={lowMotion ? undefined : { y: [0, 8, 0] }}
                        transition={lowMotion ? undefined : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="flex flex-col items-center gap-2 text-muted hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0"
                        aria-label="滚动到 About 区域"
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
