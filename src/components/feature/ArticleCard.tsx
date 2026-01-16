"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import Badge from "../ui/Badge";

interface ArticleCardProps {
    id: number;
    title: string;
    description: string;
    icon: LucideIcon;
    category: string;
    date: string;
    index?: number;
    onClick?: () => void;
}

export default function ArticleCard({
    title,
    description,
    icon: Icon,
    category,
    date,
    index = 0,
    onClick,
}: ArticleCardProps) {
    return (
        <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 + index * 0.08 }}
            onClick={onClick}
            className="group p-6 rounded-2xl bg-white/80 border border-[#e8e6dc] 
                 hover:border-[#d97757]/40 hover:bg-white
                 transition-all duration-300 cursor-pointer text-left
                 hover:shadow-md"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-[#d97757]/10 text-[#d97757] group-hover:text-[#d97757] transition-colors">
                    <Icon size={22} />
                </div>
                <Badge>{category}</Badge>
            </div>

            {/* Content */}
            <h3 className="text-xl font-semibold mb-3 text-[#141413] group-hover:text-[#141413] transition-colors">
                {title}
            </h3>
            <p className="text-[#b0aea5] text-sm leading-relaxed mb-4 line-clamp-2">
                {description}
            </p>

            {/* Date */}
            <span className="text-xs text-[#b0aea5]/60">{date}</span>
        </motion.article>
    );
}
