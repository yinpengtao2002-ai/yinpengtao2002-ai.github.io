"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";

export default function MarginAnalysisPage() {
    const streamlitUrl = "https://marginanalysis0103-dc3khcc79ja82phpgnvpav.streamlit.app/?embed=true&embed_options=dark_theme&embed_options=hide_footer&embed_options=hide_toolbar";
    const [showControls, setShowControls] = useState(true);

    return (
        <div className="fixed inset-0 bg-[#0E1117] overflow-hidden">
            {/* Floating Controls - shows on hover or when visible */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: showControls ? 1 : 0 }}
                className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none"
                onMouseEnter={() => setShowControls(true)}
            >
                {/* Left - Back button */}
                <div className="pointer-events-auto">
                    <Link
                        href="/explore"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full 
                             bg-white/90 backdrop-blur-md border border-[#e8e6dc]
                             text-[#141413]/70 hover:text-[#141413] hover:bg-white
                             shadow-sm hover:shadow-md transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm">返回</span>
                    </Link>
                </div>

                {/* Right controls */}
                <div className="pointer-events-auto flex items-center gap-2">
                    {/* Toggle visibility button */}
                    <button
                        onClick={() => setShowControls(!showControls)}
                        className="p-2 rounded-full bg-white/90 backdrop-blur-md border border-[#e8e6dc] 
                             text-[#141413]/70 hover:text-[#141413] hover:bg-white 
                             shadow-sm hover:shadow-md transition-all"
                        title={showControls ? "隐藏控制栏" : "显示控制栏"}
                    >
                        {showControls ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>

                    {/* Open in new tab */}
                    <a
                        href="https://marginanalysis0103-dc3khcc79ja82phpgnvpav.streamlit.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-full bg-white/90 backdrop-blur-md border border-[#e8e6dc] 
                             text-[#141413]/70 hover:text-[#141413] hover:bg-white 
                             shadow-sm hover:shadow-md transition-all"
                        title="新窗口打开"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
            </motion.div>

            {/* Hover zone to show controls */}
            {!showControls && (
                <div
                    className="fixed top-0 left-0 right-0 h-16 z-40"
                    onMouseEnter={() => setShowControls(true)}
                />
            )}

            {/* Full screen iframe container */}
            <div className="absolute inset-0">
                {/* iframe positioned to hide top padding and push footer off-screen */}
                <iframe
                    src={streamlitUrl}
                    title="单车边际变动归因分析"
                    className="absolute border-0 w-full"
                    style={{
                        top: "-55px",
                        left: 0,
                        height: "calc(100vh + 110px)",
                    }}
                    allow="clipboard-read; clipboard-write"
                    loading="lazy"
                />
            </div>
        </div>
    );
}
