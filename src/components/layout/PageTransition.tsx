"use client";

import { motion, useAnimationControls } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useViewportProfile } from "@/lib/useLowMotionMode";

export default function PageTransition({ children }: { children: ReactNode }) {
    const pathname = usePathname() || "/";
    const { prefersReducedMotion } = useViewportProfile();
    const controls = useAnimationControls();

    useEffect(() => {
        if (pathname === "/" || prefersReducedMotion) {
            controls.set({ opacity: 1, y: 0 });
        } else {
            controls.set({ opacity: 0, y: 12 });
            void controls.start({
                opacity: 1,
                y: 0,
                transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
            });
        }
        return () => controls.stop();
    }, [controls, pathname, prefersReducedMotion]);

    // Next owns route mounting. Keying this wrapper by pathname remounts the
    // new route a second time and can erase input or restart browser engines.
    return (
        <motion.div initial={false} animate={controls} className="page-transition-shell">
            {children}
        </motion.div>
    );
}
