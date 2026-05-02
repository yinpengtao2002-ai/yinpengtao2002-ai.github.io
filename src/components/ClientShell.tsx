"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const MouseTrail = dynamic(() => import("@/components/ui/MouseTrail"), { ssr: false });
const ThemeToggle = dynamic(() => import("@/components/ui/ThemeToggle"), { ssr: false });
const ChatWidget = dynamic(() => import("@/components/ChatWidget"), { ssr: false });
const SiteNavigation = dynamic(() => import("@/components/layout/SiteNavigation"), { ssr: false });

function shouldHideShellExtras(pathname: string) {
    return pathname.startsWith("/finance/business-analysis");
}

export default function ClientShell() {
    const pathname = usePathname() || "/";
    const hideShellExtras = shouldHideShellExtras(pathname);

    return (
        <>
            {!hideShellExtras && <MouseTrail />}
            <SiteNavigation />
            {!hideShellExtras && <ThemeToggle />}
            {!hideShellExtras && <ChatWidget />}
        </>
    );
}
