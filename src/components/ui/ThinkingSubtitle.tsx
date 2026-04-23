"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface ThinkingSubtitleProps {
    finalText: string;
    thoughts?: string[];
    className?: string;
    reducedMotion?: boolean;
}

export default function ThinkingSubtitle({
    finalText,
    thoughts = ["Thinking...", "Analyzing...", "Generating Identity..."],
    className = "",
    reducedMotion = false,
}: ThinkingSubtitleProps) {
    const [currentThoughtIndex, setCurrentThoughtIndex] = useState(0);
    const [isThinking, setIsThinking] = useState(true);
    const [displayedText, setDisplayedText] = useState("");

    useEffect(() => {
        if (!reducedMotion) return;

        setIsThinking(false);
        setDisplayedText(finalText);
    }, [finalText, reducedMotion]);

    // Cycle through thoughts
    useEffect(() => {
        if (!isThinking || reducedMotion) return;

        // Type out the current thought
        const currentThought = thoughts[currentThoughtIndex];
        let charIndex = 0;

        const typingInterval = setInterval(() => {
            if (charIndex <= currentThought.length) {
                setDisplayedText(currentThought.slice(0, charIndex));
                charIndex++;
            } else {
                // Though finished typing, wait a bit then move to next or finish
                clearInterval(typingInterval);
                setTimeout(() => {
                    if (currentThoughtIndex < thoughts.length - 1) {
                        setCurrentThoughtIndex(prev => prev + 1);
                        setDisplayedText(""); // Clear for next thought
                    } else {
                        setIsThinking(false); // Done thinking
                    }
                }, 800); // Pause between thoughts
            }
        }, 50); // Typing speed for thoughts

        return () => clearInterval(typingInterval);
    }, [currentThoughtIndex, isThinking, reducedMotion, thoughts]);

    // Final Text Typing
    useEffect(() => {
        if (isThinking || reducedMotion) return;

        let charIndex = 0;
        setDisplayedText(""); // Reset for final text

        const typingInterval = setInterval(() => {
            if (charIndex <= finalText.length) {
                setDisplayedText(finalText.slice(0, charIndex));
                charIndex++;
            } else {
                clearInterval(typingInterval);
            }
        }, 80); // Typing speed for final text (slower, more deliberate)

        return () => clearInterval(typingInterval);
    }, [isThinking, finalText, reducedMotion]);

    return (
        <div className={`relative inline-flex items-center justify-center min-h-[1.5em] ${className}`}>
            <AnimatePresence mode="wait">
                <motion.span
                    key={isThinking ? `thought-${currentThoughtIndex}` : "final"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`${isThinking ? "italic" : ""} transition-colors duration-500`}
                    style={{ color: isThinking ? 'var(--muted)' : 'var(--foreground)' }}
                >
                    {displayedText}
                </motion.span>
            </AnimatePresence>
            <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className={`ml-1 inline-block w-1.5 h-4 align-middle ${reducedMotion || (!isThinking && displayedText === finalText) ? "hidden" : ""}`}
                style={{ background: 'var(--accent)' }}
            />
        </div>
    );
}
