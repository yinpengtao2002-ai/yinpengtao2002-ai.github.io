"use client";

import dynamic from "next/dynamic";

const MouseTrail = dynamic(() => import("@/components/ui/MouseTrail"), { ssr: false });
const ThemeToggle = dynamic(() => import("@/components/ui/ThemeToggle"), { ssr: false });
const ChatWidget = dynamic(() => import("@/components/ChatWidget"), { ssr: false });

export default function ClientShell() {
    return (
        <>
            <MouseTrail />
            <ThemeToggle />
            <ChatWidget />
        </>
    );
}
