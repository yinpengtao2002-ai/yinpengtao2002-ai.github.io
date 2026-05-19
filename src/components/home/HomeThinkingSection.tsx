"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from "react";
import { thinkingLabContent } from "@/lib/data/thinkingLabContent";
import type { ContentItem } from "@/lib/data/generated/content";

type ThinkingTrackId = "tool" | "ai" | "record";

const THINKING_TRACKS: Array<{
  id: ThinkingTrackId;
  label: string;
  summary: string;
  accent: string;
  soft: string;
  countUnit: string;
}> = [
  {
    id: "tool",
    label: "工具",
    summary: "把重复处理、资料整理和内容转换沉淀成可以直接打开的工作台。",
    accent: "#3f8f9f",
    soft: "rgba(63, 143, 159, 0.13)",
    countUnit: "个入口",
  },
  {
    id: "ai",
    label: "AI创作",
    summary: "收录 AI 小说和内容实验，关注叙事、设定、表达和创作过程。",
    accent: "#b46b8d",
    soft: "rgba(180, 107, 141, 0.14)",
    countUnit: "篇创作",
  },
  {
    id: "record",
    label: "思考记录",
    summary: "沉淀经营分析、市场观察和判断过程，让观点背后的链路被看见。",
    accent: "#7d8c45",
    soft: "rgba(125, 140, 69, 0.14)",
    countUnit: "篇记录",
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

function categoryHref(label: string) {
  return `/thinking-lab?category=${encodeURIComponent(label)}`;
}

export default function HomeThinkingSection() {
  const router = useRouter();
  const trackCards = useMemo(() => {
    return THINKING_TRACKS.map((track) => {
      const items = thinkingLabContent.filter((candidate) => itemBelongsToTrack(candidate, track.id));
      const trackItems = items.length > 0 ? items : thinkingLabContent.slice(0, 1);
      const item = trackItems[0];

      return item ? { ...track, item, items: trackItems, categoryHref: categoryHref(track.label) } : null;
    }).filter((track): track is (typeof THINKING_TRACKS)[number] & {
      item: ContentItem;
      items: ContentItem[];
      categoryHref: string;
    } => Boolean(track));
  }, []);
  const [activeTrackId, setActiveTrackId] = useState<ThinkingTrackId>("tool");
  const activeTrack = trackCards.find((track) => track.id === activeTrackId) ?? trackCards[0];

  if (!activeTrack) return null;
  const activePreviewItems = activeTrack.items.slice(0, 4);
  const openCategoryFromCard = (event: MouseEvent<HTMLElement>, href: string) => {
    if ((event.target as HTMLElement).closest("a")) return;
    router.push(href);
  };
  const openCategoryFromKeyboard = (event: KeyboardEvent<HTMLElement>, href: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if ((event.target as HTMLElement).closest("a")) return;
    event.preventDefault();
    router.push(href);
  };

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
            <div className="home-thinking-featured-meta" aria-label="工具与思考分类">
              {trackCards.map((track) => (
                <span key={track.id} className={track.id === activeTrack.id ? "is-active" : ""}>
                  {track.label}
                </span>
              ))}
            </div>
            <div
              className="home-thinking-preview-panel"
              style={{
                "--thinking-track-accent": activeTrack.accent,
                "--thinking-track-soft": activeTrack.soft,
              } as CSSProperties}
            >
              <div className="home-thinking-featured-row">
                <span className="home-thinking-preview-label">{activeTrack.label}</span>
                <span className="home-thinking-count-pill">
                  {activeTrack.items.length} {activeTrack.countUnit}
                </span>
              </div>
              <p className="home-thinking-preview-summary">{activeTrack.summary}</p>
              <div className="home-thinking-preview-list" aria-label={`${activeTrack.label}代表内容`}>
                {activePreviewItems.map((item, index) => (
                  <Link
                    key={item.slug}
                    href={item.href}
                    className="home-thinking-preview-item"
                    style={{
                      "--thinking-item-index": index,
                    } as CSSProperties}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{item.title}</strong>
                  </Link>
                ))}
              </div>
              <Link href={activeTrack.categoryHref} className="home-thinking-preview-action">
                查看全部 {activeTrack.label} <ArrowRight style={{ width: 14, height: 14 }} />
              </Link>
            </div>
            <Link href="/thinking-lab" className="home-thinking-all-link">
              查看全部工具与思考 <ArrowRight style={{ width: 15, height: 15 }} />
            </Link>
          </div>
        </div>

        <div className="home-thinking-track-rail" aria-label="工具与思考入口">
          {trackCards.map((track, index) => (
            <article
              key={track.id}
              tabIndex={0}
              aria-label={`查看全部 ${track.label}`}
              className={`home-thinking-track-card${track.id === activeTrack.id ? " is-active" : ""}`}
              style={{
                "--thinking-track-index": index,
                "--thinking-track-accent": track.accent,
                "--thinking-track-soft": track.soft,
              } as CSSProperties}
              onClick={(event) => openCategoryFromCard(event, track.categoryHref)}
              onKeyDown={(event) => openCategoryFromKeyboard(event, track.categoryHref)}
              onMouseEnter={() => setActiveTrackId(track.id)}
              onFocusCapture={() => setActiveTrackId(track.id)}
            >
              <span className="home-thinking-track-orbit" aria-hidden="true" />
              <div className="home-thinking-track-head">
                <span className="home-thinking-track-label">{track.label}</span>
                <span className="home-thinking-count-pill">
                  {track.items.length} {track.countUnit}
                </span>
              </div>
              <p>{track.summary}</p>
              <div className="home-thinking-track-foot">
                <Link href={track.categoryHref} className="home-thinking-category-link">
                  查看全部 {track.label} <ArrowRight style={{ width: 13, height: 13 }} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
