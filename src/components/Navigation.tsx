"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, TrendingUp, Sparkles } from "lucide-react";

const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/finance", label: "Financial Modeling", icon: TrendingUp },
    { href: "/ai", label: "AI Insights", icon: Sparkles },
];

export default function Navigation() {
    const pathname = usePathname();

    return (
        <motion.nav
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/30 border-b border-white/5"
        >
            <div className="max-w-6xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    {/* Navigation Links - Centered */}
                    <div className="flex items-center gap-1 sm:gap-2 mx-auto">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`
                    relative px-3 py-2 sm:px-4 rounded-full text-sm font-medium
                    transition-all duration-300 flex items-center gap-2
                    ${isActive
                                            ? "text-white"
                                            : "text-white/60 hover:text-white/90"
                                        }
                  `}
                                >
                                    <Icon size={16} />
                                    <span className="hidden sm:inline">{item.label}</span>

                                    {/* Active indicator */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-0 bg-white/10 rounded-full -z-10"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </motion.nav>
    );
}
