"use client";

import { motion } from "framer-motion";
import { Home, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { scrollToSection } from "@/lib/scroll";
import { useViewportProfile } from "@/lib/useLowMotionMode";

const NAV_FONT =
    'var(--font-poppins), "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';

const NAV_ITEMS = [
    { label: "首页", href: "/", activePath: "/", sectionId: "home" },
    { label: "财务模型", href: "/finance", activePath: "/finance" },
    { label: "工具与思考", href: "/thinking-lab", activePath: "/thinking-lab" },
    { label: "联系", href: "/#contact", sectionId: "contact" },
];

function shouldHideNavigation(pathname: string) {
    return (
        pathname.startsWith("/finance/margin-analysis") ||
        pathname.startsWith("/finance/sensitivity-analysis") ||
        pathname.startsWith("/finance/business-analysis") ||
        pathname.startsWith("/finance/monthly-trend") ||
        pathname.startsWith("/finance/profit-structure") ||
        pathname.startsWith("/finance/perspective-bi") ||
        pathname.startsWith("/tools/study-cards") ||
        pathname.startsWith("/tools/subtitle-workbench") ||
        pathname.startsWith("/tools/goalkeeper-landscape") ||
        (pathname.startsWith("/thinking-lab/") && pathname !== "/thinking-lab/")
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
    const navigationHidden = shouldHideNavigation(pathname);
    const mobileToggleRef = useRef<HTMLButtonElement>(null);
    const firstMobileLinkRef = useRef<HTMLAnchorElement>(null);

    useEffect(() => {
        if (!open || !isMobileLike || navigationHidden) return;

        const focusFrame = window.requestAnimationFrame(() => {
            firstMobileLinkRef.current?.focus();
        });
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
                mobileToggleRef.current?.focus();
            }
        };

        window.addEventListener("keydown", handleEscape);
        return () => {
            window.cancelAnimationFrame(focusFrame);
            window.removeEventListener("keydown", handleEscape);
        };
    }, [isMobileLike, navigationHidden, open]);

    if (navigationHidden) return null;

    const itemIsActive = (item: (typeof NAV_ITEMS)[number]) => {
        return isActive(pathname, item.activePath);
    };

    const handleClick = (event: MouseEvent<HTMLAnchorElement>, item: (typeof NAV_ITEMS)[number]) => {
        setOpen(false);

        if (pathname === "/" && item.href === "/") {
            event.preventDefault();
            window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
            window.history.replaceState(window.history.state, "", "/");
            return;
        }

        if (pathname === "/" && item.sectionId === "contact") {
            event.preventDefault();
            scrollToSection("contact");
            window.history.pushState(window.history.state, "", "#contact");
        }
    };

    if (isMobileLike) {
        return (
            <header aria-label="网站导航" style={{ position: "fixed", top: 16, left: 16, zIndex: 45, fontFamily: NAV_FONT }}>
                <button
                    ref={mobileToggleRef}
                    type="button"
                    onClick={() => setOpen((value) => !value)}
                    aria-expanded={open}
                    aria-label={open ? "关闭网站导航" : "打开网站导航"}
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
                        boxShadow: "var(--site-nav-button-shadow)",
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
                            boxShadow: "var(--site-nav-menu-shadow)",
                            backdropFilter: "blur(16px)",
                            WebkitBackdropFilter: "blur(16px)",
                        }}
                    >
                        {NAV_ITEMS.map((item, index) => {
                            const active = itemIsActive(item);
                            return (
                                <Link
                                    ref={index === 0 ? firstMobileLinkRef : undefined}
                                    key={item.label}
                                    href={item.href}
                                    onClick={(event) => handleClick(event, item)}
                                    aria-current={active ? "page" : undefined}
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
            </header>
        );
    }

    return (
        <header
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
                boxShadow: "var(--site-nav-shell-shadow)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                fontFamily: NAV_FONT,
            }}
        >
            <nav aria-label="网站导航" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {NAV_ITEMS.map((item) => {
                    const active = itemIsActive(item);
                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            onClick={(event) => handleClick(event, item)}
                            aria-current={active ? "page" : undefined}
                            style={{
                                position: "relative",
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
                            {active && (
                                <motion.span
                                    layoutId="home-nav-active-pill"
                                    className="home-nav-active-pill"
                                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                                />
                            )}
                            {item.href === "/" && <Home style={{ position: "relative", zIndex: 1, width: 14, height: 14 }} />}
                            <span style={{ position: "relative", zIndex: 1 }}>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </header>
    );
}
