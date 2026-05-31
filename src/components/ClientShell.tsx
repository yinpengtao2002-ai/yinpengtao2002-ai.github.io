"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const MouseTrail = dynamic(() => import("@/components/ui/MouseTrail"), { ssr: false });
const ChatWidget = dynamic(() => import("@/components/ChatWidget"), { ssr: false });
const SiteNavigation = dynamic(() => import("@/components/layout/SiteNavigation"), { ssr: false });

function shouldHideDecorativeExtras(pathname: string) {
    return (
        pathname.startsWith("/finance/business-analysis") ||
        pathname.startsWith("/finance/profit-structure") ||
        pathname.startsWith("/finance/perspective-bi") ||
        pathname.startsWith("/tools/subtitle-workbench")
    );
}

function shouldHideAssistant(pathname: string) {
    return pathname.startsWith("/tools/subtitle-workbench");
}

export default function ClientShell() {
    const pathname = usePathname() || "/";
    const hideDecorativeExtras = shouldHideDecorativeExtras(pathname);
    const hideAssistant = shouldHideAssistant(pathname);

    return (
        <>
            {!hideDecorativeExtras && <MouseTrail />}
            <SiteNavigation />
            {!hideAssistant && <ChatWidget />}
        </>
    );
}
