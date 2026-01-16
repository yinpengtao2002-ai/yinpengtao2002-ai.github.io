"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface CardProps {
    children: ReactNode;
    variant?: "default" | "elevated" | "outlined";
    interactive?: boolean;
    href?: string;
    className?: string;
    delay?: number;
}

const variantClasses = {
    default: "bg-white/80 border-[#e8e6dc]",
    elevated: "bg-white border-[#e8e6dc] shadow-md",
    outlined: "bg-transparent border-[#e8e6dc]",
};

export default function Card({
    children,
    variant = "default",
    interactive = false,
    href,
    className = "",
    delay = 0,
}: CardProps) {
    const interactiveClasses = interactive
        ? "hover:border-[#d97757]/40 hover:bg-white hover:shadow-md cursor-pointer hover:scale-[1.02]"
        : "";

    const cardClasses = `
    rounded-2xl border p-6
    transition-all duration-300
    ${variantClasses[variant]}
    ${interactiveClasses}
    ${className}
  `;

    const CardWrapper = ({ children: wrapperChildren }: { children: ReactNode }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className={cardClasses}
        >
            {wrapperChildren}
        </motion.div>
    );

    if (href) {
        return (
            <Link href={href}>
                <CardWrapper>{children}</CardWrapper>
            </Link>
        );
    }

    return <CardWrapper>{children}</CardWrapper>;
}
