"use client";

import { motion } from "framer-motion";
import { Hero } from "@/components/layout";
import { siteConfig } from "@/lib/config/site";
import { sections } from "@/lib/data/sections";
import { aiContent, financeContent } from "@/lib/data/generated/content";
import SectionCard from "@/components/feature/SectionCard";
import Link from "next/link";
import { ArrowRight, Github, Mail, MessageCircle } from "lucide-react";

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <Hero name={siteConfig.name} subtitle={siteConfig.subtitle} />

      {/* About Section */}
      <section id="about" className="py-24 px-6 md:px-12 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-[#141413]">
            关于我
          </h2>
          <div className="w-16 h-1 bg-[#d97757] rounded-full mb-8" />
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div className="space-y-6 text-lg leading-relaxed text-[#5f5e5a]">
              <p>
                你好，我是{" "}
                <span className="text-[#141413] font-semibold">
                  {siteConfig.author.chineseName}
                </span>
                （{siteConfig.author.name}），对金融建模与人工智能充满热情。
              </p>
              <p>
                我相信技术的力量在于解决真实的问题。这个网站记录了我在金融分析、AI
                工具应用等领域的探索与思考。
              </p>
              <p className="text-[#d97757] font-medium italic">
                &ldquo;{siteConfig.description}&rdquo;
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "金融建模", value: "Financial Modeling" },
                { label: "数据分析", value: "Data Analysis" },
                { label: "人工智能", value: "AI & ML" },
                { label: "全栈开发", value: "Full Stack Dev" },
              ].map((skill) => (
                <div
                  key={skill.label}
                  className="p-4 rounded-xl bg-white/80 border border-[#e8e6dc] text-center hover:border-[#d97757]/40 transition-colors"
                >
                  <p className="text-sm text-[#b0aea5] mb-1">{skill.label}</p>
                  <p className="text-sm font-medium text-[#141413]">
                    {skill.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Sections (Projects) */}
      <section className="py-24 px-6 md:px-12 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-[#141413]">
            探索领域
          </h2>
          <div className="w-16 h-1 bg-[#6a9bcc] rounded-full mb-8" />
          <p className="text-lg text-[#b0aea5] mb-12 max-w-2xl">
            我主要专注于以下两个方向，点击卡片深入了解。
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            {sections.map((section, index) => (
              <SectionCard key={section.id} {...section} index={index} />
            ))}
          </div>
        </motion.div>
      </section>

      {/* Articles */}
      <section className="py-24 px-6 md:px-12 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-[#141413]">
            最新文章
          </h2>
          <div className="w-16 h-1 bg-[#788c5d] rounded-full mb-8" />
          <div className="space-y-6">
            {[...financeContent, ...aiContent].map((article) => (
              <Link key={article.slug} href={article.href}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="group p-6 rounded-2xl bg-white/80 border border-[#e8e6dc] hover:border-[#d97757]/40 hover:bg-white transition-all duration-300 hover:shadow-md flex items-center justify-between"
                >
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-[#141413] mb-2 group-hover:text-[#d97757] transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-[#b0aea5] text-sm line-clamp-1">
                      {article.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-6 shrink-0">
                    <span className="text-xs text-[#b0aea5]/60">
                      {article.date}
                    </span>
                    <ArrowRight className="w-5 h-5 text-[#b0aea5] group-hover:text-[#d97757] group-hover:translate-x-1 transition-all" />
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Explore CTA */}
      <section className="py-24 px-6 md:px-12 max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
        >
          <MessageCircle className="w-10 h-10 text-[#d97757] mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#141413]">
            想聊聊？
          </h2>
          <p className="text-lg text-[#b0aea5] mb-8 max-w-lg mx-auto">
            试试和我的 AI 助手对话，探索更多内容。
          </p>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#141413] text-white font-medium hover:bg-[#d97757] transition-colors duration-300"
          >
            进入对话
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 md:px-12 border-t border-[#e8e6dc]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <p className="text-lg font-semibold text-[#141413]">
              {siteConfig.name}
            </p>
            <p className="text-sm text-[#b0aea5] mt-1">
              {siteConfig.author.chineseName} &middot;{" "}
              {siteConfig.author.pinyinName}
            </p>
          </div>
          <div className="flex items-center gap-6">
            {siteConfig.links?.github && (
              <a
                href={siteConfig.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#b0aea5] hover:text-[#141413] transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
            )}
            {siteConfig.links?.email && (
              <a
                href={`mailto:${siteConfig.links.email}`}
                className="text-[#b0aea5] hover:text-[#141413] transition-colors"
              >
                <Mail className="w-5 h-5" />
              </a>
            )}
          </div>
          <p className="text-xs text-[#b0aea5]/50">
            &copy; {new Date().getFullYear()} {siteConfig.name}. All rights
            reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
