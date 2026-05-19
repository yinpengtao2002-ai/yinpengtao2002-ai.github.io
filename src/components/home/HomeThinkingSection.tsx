"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState, type CSSProperties } from "react";
import { thinkingLabContent } from "@/lib/data/thinkingLabContent";
import type { ContentItem } from "@/lib/data/generated/content";

type ThinkingTrackId = "tool" | "ai" | "record";

const THINKING_TRACKS: Array<{
  id: ThinkingTrackId;
  label: string;
  source: string;
  summary: string;
  action: string;
}> = [
  {
    id: "tool",
    label: "工具",
    source: "代码型 / iframe / 独立工具",
    summary: "把重复处理、资料整理和内容转换沉淀成可以直接打开的工作台。",
    action: "打开工具",
  },
  {
    id: "ai",
    label: "AI 工作流",
    source: "Notion AI 数据源",
    summary: "记录 AI 怎样进入真实任务：材料处理、流程拆解、质量校对和方法复用。",
    action: "查看工作流",
  },
  {
    id: "record",
    label: "思考记录",
    source: "Notion 财务 / 观察数据源",
    summary: "沉淀经营分析、市场观察和判断过程，让观点背后的链路被看见。",
    action: "阅读记录",
  },
];

function itemBelongsToTrack(item: ContentItem, trackId: ThinkingTrackId) {
  if (trackId === "tool") {
    return item.source === "hosted-tool";
  }

  if (trackId === "ai") {
    return item.legacyCategory === "ai";
  }

  return item.legacyCategory === "finance" || item.legacyCategory === "essays";
}

export default function HomeThinkingSection() {
  const trackCards = useMemo(() => {
    return THINKING_TRACKS.map((track) => {
      const item =
        thinkingLabContent.find((candidate) => itemBelongsToTrack(candidate, track.id)) ??
        thinkingLabContent[0];

      return item ? { ...track, item } : null;
    }).filter((track): track is (typeof THINKING_TRACKS)[number] & { item: ContentItem } => Boolean(track));
  }, []);
  const [activeTrackId, setActiveTrackId] = useState<ThinkingTrackId>("tool");
  const activeTrack = trackCards.find((track) => track.id === activeTrackId) ?? trackCards[0];

  if (!activeTrack) return null;

  return (
    <section id="thinking" className="home-viewport home-section home-thinking-section">
      <motion.div
        className="home-shell home-thinking-method-index home-thinking-reveal"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.28 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="home-thinking-visual-card">
          <Image
            src="/images/home/thinking-methods-tech.png"
            alt="工具与思考内容预览"
            fill
            sizes="(max-width: 768px) 100vw, 420px"
            className="home-thinking-visual-image"
          />
          <div className="home-thinking-visual-shade" aria-hidden="true" />
          <div className="home-thinking-visual-copy">
            <p className="home-thinking-kicker">Tools & Thinking</p>
            <h2>工具与思考</h2>
            <p className="home-thinking-featured-intro">
              把日常工作里沉淀下来的工具、AI 用法和判断方法，放成可以直接打开的入口。
            </p>
            <div className="home-thinking-featured-meta" aria-label="工具与思考分类">
              {trackCards.map((track) => (
                <span key={track.id} className={track.id === activeTrack.id ? "is-active" : ""}>
                  {track.label}
                </span>
              ))}
            </div>
            <div className="home-thinking-featured-entry">
              <span className="home-thinking-source-pill">{activeTrack.source}</span>
              <h3>{activeTrack.item.title}</h3>
              <p>{activeTrack.item.description}</p>
              <Link href={activeTrack.item.href} className="home-thinking-featured-link">
                {activeTrack.action} <ArrowRight style={{ width: 14, height: 14 }} />
              </Link>
            </div>
            <Link href="/thinking-lab" className="home-thinking-all-link">
              查看全部工具与思考 <ArrowRight style={{ width: 15, height: 15 }} />
            </Link>
          </div>
        </div>

        <div className="home-thinking-track-rail" aria-label="工具与思考入口">
          {trackCards.map((track, index) => (
            <Link
              key={track.id}
              href={track.item.href}
              className={`home-thinking-track-card${track.id === activeTrack.id ? " is-active" : ""}`}
              style={{ "--thinking-track-index": index } as CSSProperties}
              onMouseEnter={() => setActiveTrackId(track.id)}
              onFocus={() => setActiveTrackId(track.id)}
            >
              <div className="home-thinking-track-head">
                <span className="home-thinking-track-label">{track.label}</span>
                <span className="home-thinking-track-date">{track.item.date}</span>
              </div>
              <h3>{track.item.title}</h3>
              <p>{track.summary}</p>
              <div className="home-thinking-track-foot">
                <span className="home-thinking-source-pill">{track.source}</span>
                <strong>
                  {track.action} <ArrowRight style={{ width: 13, height: 13 }} />
                </strong>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
