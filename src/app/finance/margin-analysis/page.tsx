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
                className="fixed right-16 top-4 z-50 sm:right-20"
            >
                <button
                    type="button"
                    onClick={handleBack}
                    className="group inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#e8e6dc]/90 bg-white/85 font-[inherit] text-sm font-semibold text-[#141413]/72 shadow-[0_12px_34px_rgba(20,20,19,0.10)] backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-[#d97757]/45 hover:bg-white hover:text-[#141413] hover:shadow-[0_16px_38px_rgba(217,119,87,0.14)] focus:outline-none focus:ring-2 focus:ring-[#d97757]/25 sm:h-11 sm:w-auto sm:gap-2 sm:px-3.5 sm:pr-4"
                    aria-label="返回上一页"
                >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#faf9f5] text-[#d97757] transition-colors group-hover:bg-[#fff3ee]">
                        <ArrowLeft className="h-4 w-4" />
                    </span>
                    <span className="hidden sm:inline">返回</span>
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
