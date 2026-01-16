"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface SectionCardProps {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    icon: LucideIcon;
    href: string;
    gradient: string;
    iconBg: string;
    index?: number;
}

export default function SectionCard({
    title,
    subtitle,
    description,
    icon: Icon,
    href,
    gradient,
    iconBg,
    index = 0,
}: SectionCardProps) {
    return (
        <Link href={href}>
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.15 }}
                className="group relative p-12 rounded-3xl bg-white/80 border border-[#e8e6dc] 
                   hover:border-[#d97757]/40 hover:bg-white
                   transition-all duration-500 overflow-hidden
                   hover:shadow-[0_0_60px_rgba(217,119,87,0.1)]
                   hover:scale-105"
            >
                {/* Background gradient */}
                <div
                    className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 
                      group-hover:opacity-5 transition-opacity duration-500`}
                />

                {/* Icon */}
                <div className={`inline-flex p-5 rounded-2xl ${iconBg} mb-8`}>
                    <Icon className="w-10 h-10 text-white" />
                </div>

                {/* Title */}
                <h2 className="text-3xl font-bold mb-4 text-[#141413] group-hover:text-[#141413] transition-colors">
                    {title}
                </h2>

                {/* Subtitle */}
                <p className="text-[#b0aea5] text-lg mb-4">{subtitle}</p>

                {/* Description */}
                <p className="text-[#b0aea5]/80 leading-relaxed">{description}</p>

                {/* Arrow indicator */}
                <div
                    className="absolute bottom-10 right-10 opacity-0 group-hover:opacity-100 
                     translate-x-4 group-hover:translate-x-0 transition-all duration-300"
                >
                    <svg
                        className="w-8 h-8 text-[#d97757]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                    </svg>
                </div>
            </motion.div>
        </Link>
    );
}
