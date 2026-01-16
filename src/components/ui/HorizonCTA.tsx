"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

interface HorizonCTAProps {
    href: string;
    text: string;
}

export default function HorizonCTA({ href, text }: HorizonCTAProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Link
            href={href}
            className="group relative flex flex-col items-center justify-center w-full cursor-pointer py-12"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* The Floating Text */}
            <motion.span
                animate={{
                    y: isHovered ? -15 : 0,
                    color: isHovered ? "#141413" : "#5f5e5a",
                    letterSpacing: isHovered ? "0.5em" : "0.3em"
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="text-sm font-medium uppercase tracking-[0.3em] text-[#5f5e5a] mb-4 relative z-10"
            >
                {text}
            </motion.span>

            {/* The Horizon Line Container */}
            <div className="relative w-full h-[1px] bg-[#e8e6dc] overflow-visible">
                {/* The "Active" Horizon Line (Expands on Hover) */}
                <motion.div
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{
                        scaleX: isHovered ? 1 : 0,
                        opacity: isHovered ? 1 : 0
                    }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-[#d97757] via-[#6a9bcc] to-[#788c5d] origin-center"
                />

                {/* The "Glow" under the line */}
                <motion.div
                    animate={{
                        opacity: isHovered ? 0.3 : 0
                    }}
                    transition={{ duration: 0.5 }}
                    className="absolute top-[-1px] left-0 w-full h-[3px] bg-gradient-to-r from-[#d97757] via-[#6a9bcc] to-[#788c5d] blur-sm"
                />
            </div>

            {/* Down Arrow indicator (Optional, appears on hover) */}
            <motion.div
                animate={{
                    opacity: isHovered ? 1 : 0,
                    y: isHovered ? 10 : 0
                }}
                className="absolute text-[#d97757] mt-8 opacity-0"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-6 h-6">
                    <path d="M7 13L12 18L17 13M12 6L12 17" />
                </svg>
            </motion.div>

        </Link>
    );
}
