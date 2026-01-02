"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface TypewriterTextProps {
    text: string;
    delay?: number;
    speed?: number;
    className?: string;
    showCursor?: boolean;
}

export default function TypewriterText({
    text,
    delay = 0,
    speed = 50,
    className = "",
    showCursor = true,
}: TypewriterTextProps) {
    const [displayedText, setDisplayedText] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        const startTimeout = setTimeout(() => {
            setIsTyping(true);
        }, delay);

        return () => clearTimeout(startTimeout);
    }, [delay]);

    useEffect(() => {
        if (!isTyping) return;

        if (displayedText.length < text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText(text.slice(0, displayedText.length + 1));
            }, speed);

            return () => clearTimeout(timeout);
        } else {
            setIsComplete(true);
        }
    }, [displayedText, isTyping, speed, text]);

    return (
        <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className={className}
        >
            {displayedText}
            {showCursor && !isComplete && (
                <span className="cursor-blink ml-0.5">|</span>
            )}
        </motion.span>
    );
}
