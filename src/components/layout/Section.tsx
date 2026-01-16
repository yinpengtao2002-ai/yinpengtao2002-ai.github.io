"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import Container from "../ui/Container";

interface SectionProps {
    children: ReactNode;
    title?: string;
    subtitle?: string;
    className?: string;
    delay?: number;
}

export default function Section({
    children,
    title,
    subtitle,
    className = "",
    delay = 0,
}: SectionProps) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay }}
            className={`py-12 ${className}`}
        >
            {(title || subtitle) && (
                <div className="mb-8 text-center">
                    {title && (
                        <h2 className="text-3xl sm:text-4xl font-bold mb-3 text-[#141413]">
                            {title}
                        </h2>
                    )}
                    {subtitle && <p className="text-[#b0aea5]">{subtitle}</p>}
                </div>
            )}
            {children}
        </motion.section>
    );
}
