"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

interface GlassDockCTAProps {
    href: string;
    text: string;
}

export default function GlassDockCTA({ href, text }: GlassDockCTAProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Link
            href={href}
            className="group relative flex items-center justify-center w-full cursor-pointer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* The "Glass Dock" Container */}
            <motion.div
                className="relative overflow-hidden w-full h-24 rounded-full border border-white/40 shadow-xl backdrop-blur-xl bg-white/20 transition-all duration-500"
                animate={{
                    borderColor: isHovered ? "rgba(255, 255, 255, 0.8)" : "rgba(255, 255, 255, 0.4)",
                    backgroundColor: isHovered ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.2)",
                    scale: isHovered ? 1.01 : 1,
                    boxShadow: isHovered
                        ? "0 20px 40px rgba(0,0,0,0.1), 0 0 20px rgba(255,255,255,0.2)"
                        : "0 10px 30px rgba(0,0,0,0.05)"
                }}
            >
                {/* Shimmer Effect */}
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
                    initial={{ x: "-150%" }}
                    animate={{ x: isHovered ? "150%" : "-150%" }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                />

                {/* Inner Content Wrapper */}
                <div className="absolute inset-0 flex items-center justify-between px-12">
                    {/* Left Brand Gradient Line */}
                    <motion.div
                        className="h-[1px] w-24 bg-gradient-to-r from-[#d97757] via-[#6a9bcc] to-[#788c5d] opacity-50"
                        animate={{ width: isHovered ? 80 : 24, opacity: isHovered ? 1 : 0.5 }}
                        transition={{ duration: 0.5 }}
                    />

                    {/* Text */}
                    <motion.span
                        className="text-lg md:text-xl font-medium uppercase tracking-[0.3em] text-[#141413]"
                        animate={{
                            letterSpacing: isHovered ? "0.4em" : "0.3em",
                            textShadow: isHovered ? "0 0 10px rgba(255,255,255,0.5)" : "none"
                        }}
                    >
                        {text}
                    </motion.span>

                    {/* Right Brand Gradient Line */}
                    <motion.div
                        className="h-[1px] w-24 bg-gradient-to-l from-[#d97757] via-[#6a9bcc] to-[#788c5d] opacity-50"
                        animate={{ width: isHovered ? 80 : 24, opacity: isHovered ? 1 : 0.5 }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
            </motion.div>
        </Link>
    );
}
