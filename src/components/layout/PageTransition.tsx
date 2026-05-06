"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useViewportProfile } from "@/lib/useLowMotionMode";

export default function PageTransition({ children }: { children: ReactNode }) {
    const pathname = usePathname() || "/";
    const { prefersReducedMotion } = useViewportProfile();

    return (
        <AnimatePresence mode="wait" initial={false}>
            <motion.div
                key={pathname}
                initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="page-transition-shell"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}
