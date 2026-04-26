"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
    const [dark, setDark] = useState(() => {
        if (typeof window === "undefined") return false;
        return localStorage.getItem("theme") === "dark";
    });

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    }, [dark]);

    const toggle = () => {
        const next = !dark;
        setDark(next);
        localStorage.setItem("theme", next ? "dark" : "light");
    };

    return (
        <button
            onClick={toggle}
            className="fixed top-4 right-4 z-50 p-2.5 rounded-full border transition-all duration-300 hover:scale-110"
            style={{
                background: "var(--card)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
            aria-label="切换深色模式"
        >
            {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
    );
}
