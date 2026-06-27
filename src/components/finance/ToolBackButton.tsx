"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ToolBackButton() {
    const router = useRouter();

    const handleBack = () => {
        if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
            return;
        }

        router.push("/finance");
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="finance-tool-back-shell"
        >
            <button
                type="button"
                onClick={handleBack}
                className="finance-tool-back-button"
                aria-label="返回上一页"
            >
                <span className="finance-tool-back-icon">
                    <ArrowLeft className="finance-tool-back-icon-svg" />
                </span>
                <span className="finance-tool-back-label">返回上一页</span>
            </button>
        </motion.div>
    );
}
