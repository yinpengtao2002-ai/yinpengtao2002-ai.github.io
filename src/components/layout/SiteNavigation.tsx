"use client";

import { motion } from "framer-motion";
import { Home, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { scrollToSection } from "@/lib/scroll";
import { useViewportProfile } from "@/lib/useLowMotionMode";

const NAV_FONT =
    'var(--font-poppins), "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';

const NAV_ITEMS = [
    { label: "首页", href: "/", activePath: "/", sectionId: "home" },
    { label: "财务模型", href: "/#finance", activePath: "/finance", sectionId: "finance" },
    { label: "思考与方法", href: "/#thinking", activePath: "/thinking-lab", sectionId: "thinking" },
    { label: "联系", href: "/#contact", sectionId: "contact" },
];

function shouldHideNavigation(pathname: string) {
    return (
        pathname.startsWith("/finance/margin-analysis") ||
        pathname.startsWith("/finance/sensitivity-analysis") ||
        pathname.startsWith("/finance/business-analysis") ||
        pathname.startsWith("/finance/monthly-trend") ||
        pathname.startsWith("/tools/subtitle-workbench") ||
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
    const [activeSectionId, setActiveSectionId] = useState("home");
    const pendingSectionRef = useRef<{ id: string; until: number } | null>(null);

    const activateSectionFromClick = useCallback((sectionId: string) => {
        if (typeof window !== "undefined") {
            pendingSectionRef.current = {
                id: sectionId,
                until: window.performance.now() + 900,
            };
        }

        setActiveSectionId(sectionId);
    }, []);

    useEffect(() => {
        if (pathname !== "/" || typeof window === "undefined" || !("IntersectionObserver" in window)) {
            return;
        }

        const hashSectionId = window.location.hash.replace("#", "");
        const hashSection = NAV_ITEMS.find((item) => item.sectionId === hashSectionId)?.sectionId;
        pendingSectionRef.current = null;

        const getSections = () => NAV_ITEMS
            .map((item) => item.sectionId)
            .filter((sectionId): sectionId is string => Boolean(sectionId))
            .map((sectionId) => document.getElementById(sectionId))
            .filter((section): section is HTMLElement => Boolean(section));

        const setActiveSectionFromId = (sectionId: string) => {
            const pending = pendingSectionRef.current;
            if (pending && window.performance.now() < pending.until && sectionId !== pending.id) {
                return;
            }
            if (pending && sectionId === pending.id) {
                pendingSectionRef.current = null;
            }
            setActiveSectionId(sectionId);
        };

        const activateLastSectionAtPageBottom = () => {
            const sections = getSections();
            const lastSection = sections.at(-1);
            if (!lastSection?.id) return false;
            const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            const hasStableScrollRange = maxScroll > Math.max(160, window.innerHeight * 0.55);
            if (!hasStableScrollRange) return false;

            const lastRect = lastSection.getBoundingClientRect();
            const lastSectionVisible = lastRect.top < window.innerHeight - 2 && lastRect.bottom > 2;
            const isAtPageBottom = window.scrollY >= maxScroll - 2;
            if (!isAtPageBottom || !lastSectionVisible) return false;

            setActiveSectionFromId(lastSection.id);
            return true;
        };

        let scrollFrame: number | null = null;
        let settleFrame: number | null = null;
        let secondSettleFrame: number | null = null;
        let sectionRetry: number | null = null;
        let observer: IntersectionObserver | null = null;
        let sectionRetryCount = 0;

        const setupObserver = () => {
            const sections = getSections();
            if (!sections.length) return false;

            observer?.disconnect();
            observer = new IntersectionObserver(
                (entries) => {
                    if (activateLastSectionAtPageBottom()) return;

                    const visible = entries
                        .filter((entry) => entry.isIntersecting)
                        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

                    if (visible?.target.id) {
                        setActiveSectionFromId(visible.target.id);
                    }
                },
                {
                    rootMargin: "-34% 0px -48% 0px",
                    threshold: [0.16, 0.32, 0.48, 0.64],
                },
            );

            sections.forEach((section) => observer?.observe(section));
            sectionRetryCount = 0;
            return true;
        };

        const syncActiveSectionFromScroll = () => {
            if (scrollFrame !== null) return;

            scrollFrame = window.requestAnimationFrame(() => {
                scrollFrame = null;
                const sections = getSections();
                if (!sections.length) return;
                if (activateLastSectionAtPageBottom()) return;

                const viewportCenter = window.innerHeight / 2;
                const current = sections
                    .map((section) => {
                        const rect = section.getBoundingClientRect();
                        const containsCenter = rect.top <= viewportCenter && rect.bottom >= viewportCenter;
                        const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
                        const distance = containsCenter
                            ? 0
                            : Math.min(Math.abs(rect.top - viewportCenter), Math.abs(rect.bottom - viewportCenter));

                        return {
                            id: section.id,
                            containsCenter,
                            visibleHeight,
                            distance,
                        };
                    })
                    .filter((section) => section.visibleHeight > 0)
                    .sort((a, b) => {
                        if (a.containsCenter !== b.containsCenter) return a.containsCenter ? -1 : 1;
                        if (a.distance !== b.distance) return a.distance - b.distance;
                        return b.visibleHeight - a.visibleHeight;
                    })[0];

                if (current?.id) {
                    setActiveSectionFromId(current.id);
                }
            });
        };
        const scheduleSectionSync = () => {
            if (settleFrame !== null) window.cancelAnimationFrame(settleFrame);
            if (secondSettleFrame !== null) window.cancelAnimationFrame(secondSettleFrame);
            if (sectionRetry !== null) window.clearTimeout(sectionRetry);
            settleFrame = window.requestAnimationFrame(() => {
                settleFrame = null;
                secondSettleFrame = window.requestAnimationFrame(() => {
                    secondSettleFrame = null;
                    if (!setupObserver()) {
                        if (sectionRetryCount < 12) {
                            sectionRetryCount += 1;
                            sectionRetry = window.setTimeout(scheduleSectionSync, 120);
                        }
                        return;
                    }
                    syncActiveSectionFromScroll();
                });
            });
        };

        const hashFrame = hashSection
            ? window.requestAnimationFrame(() => {
                activateSectionFromClick(hashSection);
                scrollToSection(hashSection);
                scheduleSectionSync();
            })
            : null;

        scheduleSectionSync();
        window.addEventListener("scroll", syncActiveSectionFromScroll, { passive: true });
        window.addEventListener("resize", syncActiveSectionFromScroll);
        window.addEventListener("pageshow", scheduleSectionSync);
        window.addEventListener("hashchange", scheduleSectionSync);
        return () => {
            if (hashFrame) window.cancelAnimationFrame(hashFrame);
            if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame);
            if (settleFrame !== null) window.cancelAnimationFrame(settleFrame);
            if (secondSettleFrame !== null) window.cancelAnimationFrame(secondSettleFrame);
            if (sectionRetry !== null) window.clearTimeout(sectionRetry);
            window.removeEventListener("scroll", syncActiveSectionFromScroll);
            window.removeEventListener("resize", syncActiveSectionFromScroll);
            window.removeEventListener("pageshow", scheduleSectionSync);
            window.removeEventListener("hashchange", scheduleSectionSync);
            observer?.disconnect();
        };
    }, [activateSectionFromClick, pathname]);

    if (shouldHideNavigation(pathname)) return null;

    const itemIsActive = (item: (typeof NAV_ITEMS)[number]) => {
        if (pathname === "/" && item.sectionId) return activeSectionId === item.sectionId;
        return isActive(pathname, item.activePath);
    };

    const handleClick = (event: MouseEvent<HTMLAnchorElement>, item: (typeof NAV_ITEMS)[number]) => {
        setOpen(false);

        if (pathname === "/" && item.href === "/") {
            event.preventDefault();
            activateSectionFromClick("home");
            window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
            window.history.replaceState(window.history.state, "", "/");
            return;
        }

        if (pathname === "/" && item.sectionId && item.sectionId !== "home") {
            event.preventDefault();
            activateSectionFromClick(item.sectionId);
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
                            const active = itemIsActive(item);
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
                const active = itemIsActive(item);
                return (
                    <Link
                        key={item.label}
                        href={item.href}
                        onClick={(event) => handleClick(event, item)}
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
    );
}
