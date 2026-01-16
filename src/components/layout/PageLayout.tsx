"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Container from "../ui/Container";

interface PageLayoutProps {
    children: ReactNode;
    backHref?: string;
    backText?: string;
    title: string;
    subtitle?: string;
    centerContent?: boolean;
}

export default function PageLayout({
    children,
    backHref,
    backText = "返回",
    title,
    subtitle,
    centerContent = true,
}: PageLayoutProps) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
            {/* Back button */}
            {backHref && (
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute top-28 left-8"
                >
                    <Link
                        href={backHref}
                        className="inline-flex items-center gap-2 text-[#b0aea5] hover:text-[#141413] transition-colors group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span>{backText}</span>
                    </Link>
                </motion.div>
            )}

            {/* Main Content */}
            <Container size="lg" className={centerContent ? "text-center" : ""}>
                {/* Title */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-12"
                >
                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6">
                        <span className="gradient-text">{title}</span>
                    </h1>
                    {subtitle && (
                        <p className="text-lg sm:text-xl text-[#b0aea5]">{subtitle}</p>
                    )}
                </motion.div>

                {/* Content */}
                {children}
            </Container>
        </div>
    );
}
