"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ArtifactCardProps {
    children: ReactNode;
    className?: string;
    delay?: number;
    initialX?: number;
    initialY?: number;
    rotate?: number;
}

export default function ArtifactCard({
    children,
    className = "",
    delay = 0,
    initialX = 0,
    initialY = 0,
    rotate = 0
}: ArtifactCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: initialX, y: initialY + 20, rotate: rotate - 5 }}
            animate={{
                opacity: 0.9,
                x: initialX,
                y: [initialY, initialY - 15, initialY], // Floating effect
                rotate: rotate
            }}
            transition={{
                opacity: { duration: 1, delay: delay },
                y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: delay }, // Continuous float
                default: { duration: 1, delay: delay }
            }}
            whileHover={{
                scale: 1.05,
                rotate: 0,
                boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1)",
                zIndex: 50,
                opacity: 1
            }}
            className={`absolute backdrop-blur-md bg-white/60 border border-white/50 shadow-sm rounded-xl overflow-hidden cursor-pointer ${className}`}
        >
            <div className="relative w-full h-full p-4">
                {/* Header bar mimicking window chrome */}
                <div className="absolute top-0 left-0 w-full h-6 bg-white/40 border-b border-white/20 flex items-center px-2 gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-300/60" />
                    <div className="w-2 h-2 rounded-full bg-yellow-300/60" />
                    <div className="w-2 h-2 rounded-full bg-green-300/60" />
                </div>

                {/* Content Area */}
                <div className="mt-4">
                    {children}
                </div>

                {/* Glass reflection shine */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 pointer-events-none opacity-50" />
            </div>
        </motion.div>
    );
}

// Pre-defined visual components for the "Artifacts"
export function CodeArtifact() {
    return (
        <div className="space-y-2 opacity-80">
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
        <div className="flex items-end gap-2 h-16 w-24 px-1 pb-1 border-l border-b border-gray-400/20">
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
        <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-md border border-white/40 shadow-inner flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-white/50 blur-[2px]" />
            </div>
            <div className="w-16 h-1.5 bg-gray-300/30 rounded-full" />
            <div className="w-10 h-1.5 bg-gray-300/30 rounded-full" />
        </div>
    );
}
