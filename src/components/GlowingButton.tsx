"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

interface GlowingButtonProps {
    href: string;
    text: string;
}

export default function GlowingButton({ href, text }: GlowingButtonProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="relative z-10"
        >
            <Link
                href={href}
                className="group relative inline-flex items-center justify-center"
            >
                {/* 旋转光束边框 - Anthropic Orange */}
                <div className="absolute inset-0 rounded-full p-[2px]">
                    <div className="absolute inset-0 rounded-full overflow-hidden">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                                duration: 4,
                                repeat: Infinity,
                                ease: "linear",
                            }}
                            className="absolute"
                            style={{
                                background: "conic-gradient(from 0deg, transparent 0deg 300deg, rgba(217,119,87,0.7) 330deg, rgba(106,155,204,0.8) 345deg, rgba(217,119,87,0.7) 360deg)",
                                width: "200%",
                                height: "200%",
                                left: "-50%",
                                top: "-50%",
                            }}
                        />
                    </div>
                </div>

                {/* 光束尾迹光晕 - 跟随旋转 */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    className="absolute inset-0"
                >
                    <div
                        className="absolute w-16 h-16 rounded-full blur-xl"
                        style={{
                            background: "radial-gradient(circle, rgba(217,119,87,0.3) 0%, transparent 70%)",
                            top: "-20px",
                            left: "50%",
                            transform: "translateX(-50%)"
                        }}
                    />
                </motion.div>

                {/* 按钮主体 - 浅色半透明背景 */}
                <div className="relative min-w-[280px] h-[64px] rounded-full 
                        bg-white/70 backdrop-blur-md 
                        border border-[#e8e6dc]
                        group-hover:bg-white/90
                        group-hover:border-[#d97757]/40
                        transition-all duration-300
                        shadow-sm group-hover:shadow-md
                        flex items-center justify-center gap-3">

                    <span className="text-xl font-medium tracking-widest text-[#141413]/80 group-hover:text-[#141413] transition-colors">
                        {text}
                    </span>

                    <motion.span
                        animate={{ x: [0, 4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="text-[#d97757] text-lg"
                    >
                        →
                    </motion.span>
                </div>
            </Link>
        </motion.div>
    );
}
