"use client";

import { motion } from "framer-motion";
import { Home, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { MouseEvent } from "react";
import { scrollToSection } from "@/lib/scroll";
import { useViewportProfile } from "@/lib/useLowMotionMode";

const NAV_FONT =
    'var(--font-poppins), "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';

const NAV_ITEMS = [
    { label: "首页", href: "/", activePath: "/" },
    { label: "财务模型", href: "/finance", activePath: "/finance" },
    { label: "AI 工作流", href: "/ai", activePath: "/ai" },
    { label: "日常随笔", href: "/essays", activePath: "/essays" },
    { label: "联系", href: "/#footer", sectionId: "footer" },
];

function shouldHideNavigation(pathname: string) {
    return (
        pathname.startsWith("/article/") ||
        pathname.startsWith("/explore") ||
        pathname.startsWith("/finance/margin-analysis") ||
        pathname.startsWith("/finance/sensitivity-analysis") ||
        pathname.startsWith("/finance/business-analysis") ||
        pathname.startsWith("/finance/monthly-trend")
    );
}

function isActive(pathname: string, activePath?: string) {
    if (!activePath) return false;
    if (activePath === "/") return pathname === "/";
    return pathname === activePath || pathname.startsWith(`${activePath}/`);
}

export default function SiteNavigation() {
    const pathname = usePathname() || "/";
    const { isMobileLike } = useViewportProfile();
    const [open, setOpen] = useState(false);

    if (shouldHideNavigation(pathname)) return null;

    const handleClick = (event: MouseEvent<HTMLAnchorElement>, item: (typeof NAV_ITEMS)[number]) => {
        setOpen(false);

        if (pathname === "/" && item.href === "/") {
            event.preventDefault();
            window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
            window.history.replaceState(window.history.state, "", "/");
            return;
        }

        if (pathname === "/" && item.sectionId) {
            event.preventDefault();
            scrollToSection(item.sectionId);
        }
    };

    if (isMobileLike) {
        return (
            <div style={{ position: "fixed", top: 16, left: 16, zIndex: 45, fontFamily: NAV_FONT }}>
                <button
                    type="button"
                    onClick={() => setOpen((value) => !value)}
                    aria-expanded={open}
                    aria-label="打开网站导航"
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        minHeight: 40,
                        padding: "0 12px",
                        borderRadius: 999,
                        border: "1px solid var(--border)",
                        background: "color-mix(in srgb, var(--card) 86%, transparent)",
                        color: "var(--foreground)",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                        backdropFilter: "blur(14px)",
                        WebkitBackdropFilter: "blur(14px)",
                        fontSize: 13,
                        fontWeight: 600,
                    }}
                >
                    {open ? <X style={{ width: 16, height: 16 }} /> : <Menu style={{ width: 16, height: 16 }} />}
                    目录
                </button>

                {open && (
                    <motion.nav
                        aria-label="网站导航"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18 }}
                        style={{
                            marginTop: 10,
                            width: 168,
                            padding: 6,
                            borderRadius: 12,
                            border: "1px solid var(--border)",
                            background: "color-mix(in srgb, var(--card) 92%, transparent)",
                            boxShadow: "0 18px 44px rgba(0,0,0,0.12)",
                            backdropFilter: "blur(16px)",
                            WebkitBackdropFilter: "blur(16px)",
                        }}
                    >
                        {NAV_ITEMS.map((item) => {
                            const active = isActive(pathname, item.activePath);
                            return (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    onClick={(event) => handleClick(event, item)}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        width: "100%",
                                        padding: "10px 10px",
                                        borderRadius: 8,
                                        color: active ? "var(--foreground)" : "color-mix(in srgb, var(--foreground) 68%, var(--muted) 32%)",
                                        textDecoration: "none",
                                        textAlign: "left",
                                        fontSize: 13,
                                        fontWeight: active ? 700 : 500,
                                        fontFamily: NAV_FONT,
                                    }}
                                >
                                    {item.href === "/" && <Home style={{ width: 14, height: 14 }} />}
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </motion.nav>
                )}
            </div>
        );
    }

    return (
        <nav
            aria-label="网站导航"
            style={{
                position: "fixed",
                top: 18,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 45,
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: 5,
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "color-mix(in srgb, var(--card) 82%, transparent)",
                boxShadow: "0 12px 32px rgba(0,0,0,0.08)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                fontFamily: NAV_FONT,
            }}
        >
            {NAV_ITEMS.map((item) => {
                const active = isActive(pathname, item.activePath);
                return (
                    <Link
                        key={item.label}
                        href={item.href}
                        onClick={(event) => handleClick(event, item)}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            borderRadius: 999,
                            color: active ? "var(--foreground)" : "var(--muted)",
                            textDecoration: "none",
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: active ? 700 : 600,
                            padding: "8px 14px",
                            whiteSpace: "nowrap",
                            fontFamily: NAV_FONT,
                        }}
                    >
                        {item.href === "/" && <Home style={{ width: 14, height: 14 }} />}
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
