"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
    href: string;
    text?: string;
}

export default function BackButton({ href, text = "返回" }: BackButtonProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute top-28 left-8"
        >
            <Link
                href={href}
                className="inline-flex items-center gap-2 text-[#b0aea5] hover:text-[#141413] transition-colors group"
            >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span>{text}</span>
            </Link>
        </motion.div>
    );
}
