"use client";

import { motion } from "framer-motion";
import TypewriterText from "@/components/TypewriterText";
import GlowingButton from "@/components/GlowingButton";

export default function Home() {
  return (
    <div className="min-h-screen relative px-6 overflow-hidden">

      {/* Background Elements */}
      <BackgroundEffects />

      {/* Name Section */}
      <div className="absolute top-[35%] left-0 right-0 text-center z-10">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <h1 className="text-7xl sm:text-8xl md:text-9xl font-bold tracking-tighter">
            <span className="gradient-text">Lucas Yin</span>
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-10"
        >
          <p className="text-xl sm:text-2xl text-white/50 tracking-[0.3em]">
            Yinpengtao <span className="mx-4 text-white/20">•</span> 殷鹏焘
          </p>
        </motion.div>
      </div>

      {/* Button Section */}
      <div className="absolute top-[58%] left-0 right-0 flex justify-center z-20">
        <GlowingButton href="/explore" text="探索更多" />
      </div>

      {/* Motto Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
        className="absolute bottom-[12%] left-0 right-0 text-center z-10"
      >
        <p className="text-lg sm:text-xl md:text-2xl text-white/60 font-light whitespace-nowrap">
          <TypewriterText
            text="我们需要的是对技术有极致热情的人，而不是习惯用经验找答案的人"
            delay={1200}
            speed={40}
            className="gradient-text font-medium"
          />
        </p>
      </motion.div>
    </div>
  );
}

function BackgroundEffects() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10">
      <motion.div
        animate={{
          x: [0, 30, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          x: [0, -30, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"
      />
    </div>
  );
}
