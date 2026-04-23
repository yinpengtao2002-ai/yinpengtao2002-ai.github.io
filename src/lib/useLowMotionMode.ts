"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

export function useViewportProfile() {
    const prefersReducedMotion = useReducedMotion();
    const [isMobileLike, setIsMobileLike] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const mediaQuery = window.matchMedia("(pointer: coarse), (hover: none), (max-width: 768px)");

        const update = () => {
            const hasTouch = window.navigator.maxTouchPoints > 0;
            setIsMobileLike(mediaQuery.matches || hasTouch);
        };

        update();

        if (typeof mediaQuery.addEventListener === "function") {
            mediaQuery.addEventListener("change", update);
            return () => mediaQuery.removeEventListener("change", update);
        }

        mediaQuery.addListener(update);
        return () => mediaQuery.removeListener(update);
    }, []);

    return {
        isMobileLike,
        prefersReducedMotion: Boolean(prefersReducedMotion),
        lowMotion: Boolean(prefersReducedMotion || isMobileLike),
    };
}

export function useLowMotionMode() {
    return useViewportProfile().lowMotion;
}
