import { ReactNode } from "react";

interface BadgeProps {
    children: ReactNode;
    variant?: "default" | "accent" | "muted";
    size?: "sm" | "md";
    className?: string;
}

const variantClasses = {
    default: "bg-[#faf9f5] text-[#b0aea5] border-[#e8e6dc]",
    accent: "bg-[#d97757]/10 text-[#d97757] border-transparent",
    muted: "bg-[#e8e6dc]/50 text-[#b0aea5] border-transparent",
};

const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
};

export default function Badge({
    children,
    variant = "default",
    size = "sm",
    className = "",
}: BadgeProps) {
    return (
        <span
            className={`
        inline-flex items-center rounded-full border font-medium
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
        >
            {children}
        </span>
    );
}
