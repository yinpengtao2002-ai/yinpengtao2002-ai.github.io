"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

interface ButtonProps {
    children: ReactNode;
    variant?: "primary" | "secondary" | "ghost" | "glow" | "outline";
    size?: "sm" | "md" | "lg";
    href?: string;
    onClick?: () => void;
    className?: string;
    disabled?: boolean;
}

const variantClasses = {
    primary:
        "bg-[#d97757] text-white hover:bg-[#c56646] border-transparent shadow-sm hover:shadow-md",
    secondary:
        "bg-white/80 text-[#141413] border-[#e8e6dc] hover:bg-white hover:border-[#d97757]/40",
    ghost:
        "bg-transparent text-[#b0aea5] hover:text-[#141413] border-transparent hover:bg-white/50",
    outline: "bg-transparent text-[#141413] border border-[#141413]/20 hover:bg-[#141413]/5 hover:border-[#141413]/40",
    glow: "relative",
};

const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
};

function GlowButton({
    children,
    href,
    onClick,
    size = "lg",
    className = "",
}: ButtonProps) {
    const ButtonContent = (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="relative z-10"
        >
            <div className="group relative inline-flex items-center justify-center">
                {/* 旋转光束边框 */}
                <div className="absolute inset-0 rounded-full p-[2px]">
                    <div className="absolute inset-0 rounded-full overflow-hidden">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                                duration: 4,
                                repeat: Infinity,
                                ease: "linear",
                            }}
                            className="absolute"
                            style={{
                                background:
                                    "conic-gradient(from 0deg, transparent 0deg 300deg, rgba(217,119,87,0.7) 330deg, rgba(106,155,204,0.8) 345deg, rgba(217,119,87,0.7) 360deg)",
                                width: "200%",
                                height: "200%",
                                left: "-50%",
                                top: "-50%",
                            }}
                        />
                    </div>
                </div>

                {/* 光束尾迹光晕 */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    className="absolute inset-0"
                >
                    <div
                        className="absolute w-16 h-16 rounded-full blur-xl"
                        style={{
                            background:
                                "radial-gradient(circle, rgba(217,119,87,0.3) 0%, transparent 70%)",
                            top: "-20px",
                            left: "50%",
                            transform: "translateX(-50%)",
                        }}
                    />
                </motion.div>

                {/* 按钮主体 */}
                <div
                    className={`relative min-w-[280px] h-[64px] rounded-full 
            bg-white/70 backdrop-blur-md 
            border border-[#e8e6dc]
            group-hover:bg-white/90
            group-hover:border-[#d97757]/40
            transition-all duration-300
            shadow-sm group-hover:shadow-md
            flex items-center justify-center gap-3 ${className}`}
                >
                    <span className="text-xl font-medium tracking-widest text-[#141413]/80 group-hover:text-[#141413] transition-colors">
                        {children}
                    </span>

                    <motion.span
                        animate={{ x: [0, 4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="text-[#d97757] text-lg"
                    >
                        →
                    </motion.span>
                </div>
            </div>
        </motion.div>
    );

    if (href) {
        return <Link href={href}>{ButtonContent}</Link>;
    }

    return (
        <button onClick={onClick} type="button">
            {ButtonContent}
        </button>
    );
}

export default function Button({
    children,
    variant = "primary",
    size = "md",
    href,
    onClick,
    className = "",
    disabled = false,
}: ButtonProps) {
    // 对于 glow 变体，使用特殊的发光按钮
    if (variant === "glow") {
        return (
            <GlowButton href={href} onClick={onClick} size={size} className={className}>
                {children}
            </GlowButton>
        );
    }

    const baseClasses =
        "inline-flex items-center justify-center rounded-full border font-medium transition-all duration-300";

    const buttonClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

    if (href) {
        return (
            <Link href={href} className={buttonClasses}>
                {children}
            </Link>
        );
    }

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${buttonClasses} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            type="button"
        >
            {children}
        </button>
    );
}
