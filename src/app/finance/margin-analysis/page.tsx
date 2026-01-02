"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

export default function MarginAnalysisPage() {
    const streamlitUrl = "https://marginanalysis0103-dc3khcc79ja82phpgnvpav.streamlit.app/?embed=true";

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header Bar */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10"
            >
                <div className="flex items-center justify-between px-6 py-4">
                    {/* Back button */}
                    <Link
                        href="/finance"
                        className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span>返回 Finance</span>
                    </Link>

                    {/* Title */}
                    <h1 className="text-lg font-semibold text-white/90">
                        单车边际变动归因分析
                    </h1>

                    {/* Open in new tab */}
                    <a
                        href="https://marginanalysis0103-dc3khcc79ja82phpgnvpav.streamlit.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
                    >
                        <span className="hidden sm:inline">新窗口打开</span>
                        <ExternalLink className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </a>
                </div>
            </motion.div>

            {/* Iframe Container - Full height below header */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex-1 pt-[65px]"
            >
                <iframe
                    src={streamlitUrl}
                    title="单车边际变动归因分析"
                    className="w-full h-[calc(100vh-65px)] border-0"
                    allow="clipboard-read; clipboard-write"
                    loading="lazy"
                />
            </motion.div>
        </div>
    );
}
