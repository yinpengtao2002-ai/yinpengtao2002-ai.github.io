import { LucideIcon } from "lucide-react";

interface IconProps {
    icon: LucideIcon;
    size?: "sm" | "md" | "lg" | "xl";
    variant?: "default" | "accent" | "gradient";
    className?: string;
}

const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
    xl: "w-10 h-10",
};

const wrapperSizes = {
    sm: "p-2",
    md: "p-3",
    lg: "p-4",
    xl: "p-5",
};

const variantClasses = {
    default: "text-[#141413]",
    accent: "bg-[#d97757]/10 text-[#d97757] rounded-lg",
    gradient: "bg-gradient-to-br from-[#d97757] to-[#6a9bcc] text-white rounded-2xl",
};

export default function Icon({
    icon: IconComponent,
    size = "md",
    variant = "default",
    className = "",
}: IconProps) {
    if (variant === "default") {
        return <IconComponent className={`${sizeClasses[size]} ${className}`} />;
    }

    return (
        <div className={`inline-flex ${wrapperSizes[size]} ${variantClasses[variant]} ${className}`}>
            <IconComponent className={sizeClasses[size]} />
        </div>
    );
}
