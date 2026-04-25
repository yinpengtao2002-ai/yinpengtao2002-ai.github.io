"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MarginAnalysisPage() {
    const router = useRouter();

    const handleBack = () => {
        if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
            return;
        }

        router.push("/finance");
    };

    return (
        <div className="fixed inset-0 bg-[#faf9f5] overflow-hidden">
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                className="fixed top-4 right-4 z-50 rounded-full border border-[#e8e6dc]/90 bg-[#faf9f5]/88 px-2 py-2 shadow-[0_10px_30px_rgba(20,20,19,0.08)] backdrop-blur-md"
            >
                <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border-0 bg-transparent px-3 py-2 font-[inherit] text-sm font-medium text-[#141413]/70 transition-colors hover:bg-white/80 hover:text-[#141413]"
                    aria-label="返回上一页"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>返回</span>
                </button>
            </motion.div>

            {/* Full screen iframe container */}
            <div className="absolute inset-0">
                <iframe
                    src="/tools/margin-analysis/index.html"
                    title="单车边际变动归因分析"
                    className="absolute inset-0 border-0 w-full h-full"
                    style={{
                        left: 0,
                    }}
                    allow="clipboard-read; clipboard-write"
                />
            </div>
        </div>
    );
}
