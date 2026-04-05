"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
    const [dark, setDark] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("theme");
        if (saved === "dark") {
            setDark(true);
            document.documentElement.setAttribute("data-theme", "dark");
        }
    }, []);

    const toggle = () => {
        const next = !dark;
        setDark(next);
        document.documentElement.setAttribute(
            "data-theme",
            next ? "dark" : "light"
        );
        localStorage.setItem("theme", next ? "dark" : "light");
    };

    return (
        <button
            onClick={toggle}
            className="fixed bottom-6 right-6 z-50 p-3 rounded-full border transition-all duration-300 hover:scale-110"
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
