"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ArtifactCardProps {
    children: ReactNode;
    className?: string;
    delay?: number;
    initialX?: number;
    initialY?: number;
    lowMotion?: boolean;
    rotate?: number;
}

export default function ArtifactCard({
    children,
    className = "",
    delay = 0,
    initialX = 0,
    initialY = 0,
    lowMotion = false,
    rotate = 0
}: ArtifactCardProps) {
    return (
        <motion.div
            initial={lowMotion ? { opacity: 0, x: initialX, y: initialY, rotate } : { opacity: 0, x: initialX, y: initialY + 20, rotate: rotate - 5 }}
            animate={lowMotion ? {
                opacity: 0.72,
                x: initialX,
                y: initialY,
                rotate,
            } : {
                opacity: 0.9,
                x: initialX,
                y: [initialY, initialY - 15, initialY],
                rotate,
            }}
            transition={lowMotion ? {
                opacity: { duration: 0.4, delay },
                default: { duration: 0.4, delay },
            } : {
                opacity: { duration: 1, delay },
                y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay },
                default: { duration: 1, delay },
            }}
            whileHover={lowMotion ? undefined : {
                scale: 1.05,
                rotate: 0,
                boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1)",
                zIndex: 50,
                opacity: 1
            }}
            className={`artifact-card absolute backdrop-blur-md bg-white/60 border border-white/50 shadow-sm rounded-xl overflow-hidden cursor-pointer ${className}`}
        >
            <div className="artifact-card-inner relative w-full h-full">
                <div className="artifact-window-chrome absolute top-0 left-0 w-full bg-white/40 border-b border-white/20 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-300/60" />
                    <div className="w-2 h-2 rounded-full bg-yellow-300/60" />
                    <div className="w-2 h-2 rounded-full bg-green-300/60" />
                </div>

                <div className="artifact-card-content">
                    {children}
                </div>

                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 pointer-events-none opacity-50" />
            </div>
        </motion.div>
    );
}

// Pre-defined visual components for the "Artifacts"
export function CodeArtifact() {
    return (
        <div className="artifact-code space-y-2 opacity-80">
            <div className="flex gap-2">
                <div className="w-8 h-2 bg-blue-400/30 rounded" />
                <div className="w-16 h-2 bg-gray-400/30 rounded" />
            </div>
            <div className="ml-4 w-24 h-2 bg-orange-400/30 rounded" />
            <div className="ml-4 w-20 h-2 bg-gray-400/30 rounded" />
            <div className="flex gap-2">
                <div className="w-6 h-2 bg-purple-400/30 rounded" />
                <div className="w-12 h-2 bg-gray-400/30 rounded" />
            </div>
        </div>
    );
}

export function ChartArtifact() {
    return (
        <div className="artifact-chart flex items-end gap-2 px-1 pb-1 border-l border-b border-gray-400/20">
            <motion.div
                className="w-4 bg-[#d97757]/60 rounded-t-sm"
                animate={{ height: ["40%", "70%", "40%"] }}
                transition={{ duration: 4, repeat: Infinity }}
            />
            <motion.div
                className="w-4 bg-[#6a9bcc]/60 rounded-t-sm"
                animate={{ height: ["80%", "50%", "80%"] }}
                transition={{ duration: 5, repeat: Infinity, delay: 0.5 }}
            />
            <motion.div
                className="w-4 bg-[#788c5d]/60 rounded-t-sm"
                animate={{ height: ["30%", "60%", "30%"] }}
                transition={{ duration: 3, repeat: Infinity, delay: 1 }}
            />
            <motion.div
                className="w-4 bg-gray-400/40 rounded-t-sm"
                animate={{ height: ["60%", "90%", "60%"] }}
                transition={{ duration: 6, repeat: Infinity, delay: 1.5 }}
            />
        </div>
    );
}

export function ImageArtifact() {
    return (
        <div className="artifact-image flex flex-col items-center gap-2">
            <div className="w-20 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-md border border-white/40 shadow-inner flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-white/50 blur-[2px]" />
            </div>
            <div className="w-16 h-1.5 bg-gray-300/30 rounded-full" />
            <div className="w-10 h-1.5 bg-gray-300/30 rounded-full" />
        </div>
    );
}

export function MusicArtifact() {
    return (
        <div className="flex items-center gap-3 w-32">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-200 to-rose-200 border border-white/40 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
            </div>
            <div className="flex-1 space-y-1.5">
                <div className="w-full h-1.5 bg-gray-400/20 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-pink-400/40"
                        animate={{ width: ["0%", "100%"] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    />
                </div>
                <div className="flex gap-1">
                    <div className="w-1/2 h-1 bg-gray-300/20 rounded-full" />
                    <div className="w-1/3 h-1 bg-gray-300/20 rounded-full" />
                </div>
            </div>
        </div>
    );
}

export function SecureArtifact() {
    return (
        <div className="flex flex-col items-center gap-2 w-20">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-400/30 flex items-center justify-center">
                <Check className="w-4 h-4 text-emerald-500/50" />
            </div>
            <div className="w-12 h-1 bg-emerald-400/20 rounded-full" />
        </div>
    );
}

import { Check } from "lucide-react";
