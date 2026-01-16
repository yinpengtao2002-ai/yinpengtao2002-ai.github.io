"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";

export default function AudioPlayer() {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);

    useEffect(() => {
        // 创建音频元素（只创建一次）
        if (!audioRef.current) {
            audioRef.current = new Audio("/background-music.mp3");
            audioRef.current.loop = true;
            audioRef.current.volume = 0.3;
        }

        // 用户首次交互后自动播放
        const handleFirstInteraction = () => {
            if (!hasInteracted && audioRef.current) {
                setHasInteracted(true);
                audioRef.current.play().then(() => {
                    setIsPlaying(true);
                }).catch(() => {
                    // 浏览器阻止自动播放时静默处理
                });
            }
        };

        // 监听首次点击
        document.addEventListener("click", handleFirstInteraction, { once: true });

        return () => {
            document.removeEventListener("click", handleFirstInteraction);
        };
    }, [hasInteracted]);

    const togglePlay = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().then(() => {
                setIsPlaying(true);
            });
        }
    };

    return (
        <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 2, duration: 0.5 }}
            onClick={togglePlay}
            className="fixed bottom-6 right-6 z-50 p-4 rounded-full 
                 bg-white/80 backdrop-blur-md border border-[#e8e6dc]
                 hover:bg-white hover:border-[#d97757]/40
                 shadow-sm hover:shadow-md
                 transition-all duration-300 group"
            title={isPlaying ? "暂停音乐" : "播放音乐"}
        >
            {isPlaying ? (
                <Volume2 className="w-5 h-5 text-[#141413]/80 group-hover:text-[#141413]" />
            ) : (
                <VolumeX className="w-5 h-5 text-[#b0aea5] group-hover:text-[#141413]" />
            )}

            {/* 播放中的动画指示器 - Anthropic Orange */}
            {isPlaying && (
                <motion.div
                    className="absolute inset-0 rounded-full border-2 border-[#d97757]/50"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
            )}
        </motion.button>
    );
}
