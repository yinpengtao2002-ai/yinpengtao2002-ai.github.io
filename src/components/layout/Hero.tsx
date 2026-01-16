"use client";

import { motion } from "framer-motion";
import TypewriterText from "../TypewriterText";
import MagneticCTA from "../ui/MagneticCTA";
import ArtifactCard, { CodeArtifact, ChartArtifact, ImageArtifact } from "../ui/ArtifactCard";
import ThinkingSubtitle from "../ui/ThinkingSubtitle";

interface HeroProps {
    name: string;
    subtitle?: string;
    buttonText?: string;
    buttonHref?: string;
}

export default function Hero({
    name,
    subtitle,
    buttonText = "探索更多",
    buttonHref = "/explore",
}: HeroProps) {
    return (
        <div className="h-screen relative w-full overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#faf9f6] via-[#f4f1ea] to-[#e6e2d6]">
            {/* Background Effects */}
            <BackgroundEffects />

            {/* Main Content Group */}
            <div className="relative z-10 w-full h-full">

                {/* Name & Subtitle - Centered vertically (50% mark) */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full flex flex-col items-center">

                    {/* Artifact 1: Code Snippet - Floating Top Right */}
                    <div className="absolute -top-32 right-[10%] md:right-[20%] hidden sm:block">
                        <ArtifactCard delay={0.5} rotate={6} initialY={-20}>
                            <CodeArtifact />
                        </ArtifactCard>
                    </div>

                    {/* Artifact 2: Chart - Floating Bottom Left */}
                    <div className="absolute -bottom-24 left-[5%] md:left-[15%] hidden sm:block">
                        <ArtifactCard delay={1.2} rotate={-4} initialY={0}>
                            <ChartArtifact />
                        </ArtifactCard>
                    </div>

                    {/* Artifact 3: Image/Icon - Floating Top Left (Farther out) */}
                    <div className="absolute -top-20 left-[2%] md:left-[10%] hidden md:block">
                        <ArtifactCard delay={2.5} rotate={-8} initialY={-40}>
                            <ImageArtifact />
                        </ArtifactCard>
                    </div>

                    {/* Name */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="text-center w-full relative z-20"
                    >
                        <h1 className="text-6xl sm:text-8xl md:text-9xl font-bold tracking-tighter text-[#141413] drop-shadow-sm whitespace-nowrap">
                            <span className="gradient-text">{name}</span>
                        </h1>
                    </motion.div>

                    {/* Subtitle / Chinese Name */}
                    {subtitle && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, delay: 0.4 }}
                            className="relative z-20 mt-8 pt-6 border-t border-[#e8e6dc] w-full max-w-3xl flex flex-col items-center gap-4"
                        >
                            <ThinkingSubtitle
                                finalText={subtitle}
                                thoughts={["Thinking...", "Initializing Personality...", "Designing Portfolio..."]}
                                className="text-xl sm:text-2xl md:text-3xl font-light tracking-[0.3em] uppercase"
                            />

                            {/* Welcome Message */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 1, delay: 3.5 }}
                            >
                                <ThinkingSubtitle
                                    finalText="欢迎参观我的个人网站"
                                    thoughts={["Loading content...", "Preparing welcome message..."]}
                                    className="text-lg sm:text-xl font-light tracking-[0.2em] text-[#d97757]"
                                />
                            </motion.div>
                        </motion.div>
                    )}
                </div>

                {/* Explore Button (Magnetic CTA) - Bottom 15% (Lower Third) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                    className="absolute bottom-[15%] left-0 w-full flex justify-center"
                >
                    <div className="w-[85%] sm:w-[70%] max-w-4xl">
                        <MagneticCTA href={buttonHref} text={buttonText} />
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

function BackgroundEffects() {
    return (
        <div className="fixed inset-0 pointer-events-none -z-10">
            {/* Anthropic Orange glow */}
            <motion.div
                animate={{
                    x: [0, 30, 0],
                    y: [0, -30, 0],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#d97757]/10 rounded-full blur-[100px]"
            />
            {/* Anthropic Blue glow */}
            <motion.div
                animate={{
                    x: [0, -30, 0],
                    y: [0, 30, 0],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#6a9bcc]/10 rounded-full blur-[120px]"
            />
        </div>
    );
}
