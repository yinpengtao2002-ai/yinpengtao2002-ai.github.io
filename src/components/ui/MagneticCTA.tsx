"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

interface MagneticCTAProps {
    href: string;
    text: string;
}

export default function MagneticCTA({ href, text }: MagneticCTAProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Link
            href={href}
            className="group relative flex items-center justify-center w-full cursor-pointer py-16" // Large hit area
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* The "Magnetic Aura" Background - Wide dispersion */}
            <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[600px] rounded-full blur-[100px] bg-gradient-to-r from-[#d97757] via-[#6a9bcc] to-[#788c5d] opacity-0"
                animate={{
                    opacity: isHovered ? 0.15 : 0,
                    scale: isHovered ? 1.2 : 0.8,
                }}
                transition={{ duration: 1.2, ease: "easeOut" }}
            />

            {/* The Concentrated Center Glow */}
            <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-24 rounded-full blur-[40px] bg-gradient-to-r from-[#d97757] via-[#6a9bcc] to-[#788c5d] opacity-0"
                animate={{
                    opacity: isHovered ? 0.3 : 0,
                    scale: isHovered ? 1.1 : 0.5,
                }}
                transition={{ duration: 0.8 }}
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-6">
                <motion.span
                    className="text-lg md:text-xl font-medium uppercase tracking-[0.3em]"
                    animate={{
                        letterSpacing: isHovered ? "0.6em" : "0.3em",
                        color: isHovered ? "#141413" : "#5f5e5a",
                        scale: isHovered ? 1.1 : 1
                    }}
                    transition={{ duration: 0.5 }}
                >
                    {text}
                </motion.span>

                {/* Minimal indicator dot/line that morphs */}
                <motion.div
                    className="bg-[#141413]"
                    initial={{ width: 8, height: 8, borderRadius: "50%" }}
                    animate={{
                        width: isHovered ? 60 : 8,
                        height: isHovered ? 1 : 8,
                        borderRadius: isHovered ? "0%" : "50%",
                        opacity: isHovered ? 0.4 : 0.2
                    }}
                    transition={{ duration: 0.5 }}
                />
            </div>
        </Link>
    );
}
