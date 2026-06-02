"use client";

import { type CSSProperties, type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers,
  Loader2,
  Trash2,
  WandSparkles,
} from "lucide-react";

type StudyCard = {
  front: string;
  back: string;
  note?: string;
};

type StudyCardResult = {
  summary?: string;
  cards: StudyCard[];
};

type CardMotion = "idle" | "exit-next" | "enter-next" | "exit-prev" | "enter-prev";
type CardDirection = "next" | "prev";
type DragIntent = "idle" | "next" | "prev";

const DRAG_THRESHOLD = 90;
const MAX_DRAG_OFFSET = 150;

const SAMPLE_CONTENT = `间隔重复是一种学习方法，它的核心思想是在记忆即将遗忘之前进行复习。相比一次性反复阅读，间隔重复会把复习分散到多个时间点，让大脑在“努力回忆”的过程中重新巩固知识。

主动回忆是间隔重复的关键。学习者不只是重新看答案，而是先尝试回答问题，再对照答案修正理解。这样可以暴露自己真正没有掌握的地方。

Anki 这类卡片工具通常会把知识拆成正反两面：正面是问题或提示，背面是答案。好的卡片应该短小、清晰、只考一个知识点。`;

const SAMPLE_RESULT: StudyCardResult = {
  summary: "间隔重复入门",
  cards: [
    {
      front: "间隔重复解决什么问题？",
      back: "它把复习分散到多个时间点，让大脑在快遗忘时重新提取并加固记忆。",
      note: "想想为什么复习要分散。",
    },
    {
      front: "主动回忆为什么重要？",
      back: "因为先尝试回答会暴露薄弱点，再看答案修正，比直接阅读更能巩固理解。",
      note: "先答再看，不是反过来。",
    },
    {
      front: "好卡片应该怎样写？",
      back: "一张卡只考一个知识点，问题短、答案清楚，复习时能立刻判断自己是否掌握。",
      note: "避免把多个概念塞一起。",
    },
    {
      front: "Anki 正反面怎么用？",
      back: "正面放问题或提示，背面放可复述的答案，让学习者先回忆再验证。",
      note: "正面负责提问，背面负责校对。",
    },
  ],
};

const DIFFICULTY_OPTIONS = [
  "基础：解释更直白，适合第一次接触",
  "进阶：保留关键术语，适合复习巩固",
  "高级：强调迁移、辨析和易错点",
];

const PROGRESS_STEPS = [
  { threshold: 28, label: "正在梳理材料结构" },
  { threshold: 58, label: "正在生成问答卡片" },
  { threshold: 82, label: "正在压缩卡片答案" },
  { threshold: 100, label: "正在校验输出格式" },
];

function countChineseText(text: string) {
  return text.replace(/\s/g, "").length;
}

function compactText(text: string, maxLength: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).replace(/[，。；、：,.:\s]+$/, "")}...`;
}

function getProgressLabel(value: number) {
  return PROGRESS_STEPS.find((step) => value <= step.threshold)?.label ?? PROGRESS_STEPS.at(-1)!.label;
}

function getStudyCardErrorMessage(payload: { error?: string; errorCode?: string } | null) {
  if (payload?.errorCode === "API_NOT_CONFIGURED") {
    return "当前本地环境没有配置 AI Key。线上页面可以直接使用；本地预览需要配置 CHAT_API_KEY 或 DEEPSEEK_API_KEY。";
  }

  if (payload?.errorCode === "AI_TIMEOUT") {
    return "生成超时了。可以先缩短输入内容，或把卡片数调少一点再试。";
  }

  return payload?.error || "学习卡片生成失败，请刷新页面后再试。";
}

export default function StudyCardsTool() {
  const [content, setContent] = useState("");
  const [difficulty, setDifficulty] = useState(DIFFICULTY_OPTIONS[0]);
  const [cardCount, setCardCount] = useState(8);
  const [result, setResult] = useState<StudyCardResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progressValue, setProgressValue] = useState(0);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [cardMotion, setCardMotion] = useState<CardMotion>("idle");
  const [dragOffset, setDragOffset] = useState(0);
  const [dragIntent, setDragIntent] = useState<DragIntent>("idle");
  const transitionTimerRef = useRef<number | null>(null);
  const pointerStartXRef = useRef<number | null>(null);
  const draggingPointerIdRef = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);
  const wasDraggingRef = useRef(false);

  const contentLength = useMemo(() => countChineseText(content), [content]);
  const canSubmit = contentLength >= 80 && !loading;
  const progressLabel = getProgressLabel(progressValue);
  const activeCard = useMemo(() => result?.cards[activeCardIndex] ?? null, [activeCardIndex, result]);
  const totalCards = result?.cards.length ?? 0;
  const cardProgress = totalCards > 0 ? ((activeCardIndex + 1) / totalCards) * 100 : 0;
  const cardStageStyle = {
    "--drag-x": `${dragOffset}px`,
    "--drag-rotate": `${dragOffset * 0.035}deg`,
  } as CSSProperties;
  const cardStageClassName = [
    "study-cards-card-stage",
    dragOffset !== 0 ? "is-dragging" : "",
    dragIntent === "next" ? "is-drag-next" : "",
    dragIntent === "prev" ? "is-drag-prev" : "",
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    if (!loading) return undefined;

    setProgressValue(8);
    const timer = window.setInterval(() => {
      setProgressValue((value) => {
        if (value < 40) return value + 5;
        if (value < 72) return value + 3;
        if (value < 92) return value + 1;
        return value;
      });
    }, 650);

    return () => window.clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  function resetCardDrag() {
    pointerStartXRef.current = null;
    draggingPointerIdRef.current = null;
    dragOffsetRef.current = 0;
    setDragOffset(0);
    setDragIntent("idle");
  }

  function clearDragClickGuard() {
    window.setTimeout(() => {
      wasDraggingRef.current = false;
    }, 120);
  }

  function clearCardTimer() {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }

  function settleCardMotion(delay = 260) {
    clearCardTimer();
    transitionTimerRef.current = window.setTimeout(() => {
      setCardMotion("idle");
      transitionTimerRef.current = null;
    }, delay);
  }

  function resetPracticeDeck() {
    clearCardTimer();
    resetCardDrag();
    setActiveCardIndex(0);
    setAnswerRevealed(false);
    setCardMotion("enter-prev");
    settleCardMotion();
  }

  function loadSampleContent() {
    setContent(SAMPLE_CONTENT);
    setResult(SAMPLE_RESULT);
    setError("");
    setProgressValue(0);
    resetPracticeDeck();
  }

  function moveToCard(targetIndex: number, direction: CardDirection) {
    if (!result || cardMotion !== "idle" || targetIndex < 0 || targetIndex >= totalCards) return;

    clearCardTimer();
    resetCardDrag();
    setAnswerRevealed(false);
    setCardMotion(direction === "next" ? "exit-next" : "exit-prev");
    transitionTimerRef.current = window.setTimeout(() => {
      setActiveCardIndex(targetIndex);
      setCardMotion(direction === "next" ? "enter-next" : "enter-prev");
      settleCardMotion();
    }, 220);
  }

  function getNextCardIndex() {
    if (totalCards <= 1) return activeCardIndex;
    return (activeCardIndex + 1) % totalCards;
  }

  function getPreviousCardIndex() {
    if (totalCards <= 1) return activeCardIndex;
    return activeCardIndex === 0 ? totalCards - 1 : activeCardIndex - 1;
  }

  function goToPreviousCard() {
    if (totalCards <= 1) return;
    moveToCard(getPreviousCardIndex(), "prev");
  }

  function goToNextCard() {
    if (totalCards <= 1) return;
    moveToCard(getNextCardIndex(), "next");
  }

  function revealAnswer() {
    if (wasDraggingRef.current) return;
    setAnswerRevealed(true);
  }

  function handleCardPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!result || cardMotion !== "idle") return;

    pointerStartXRef.current = event.clientX;
    draggingPointerIdRef.current = event.pointerId;
    wasDraggingRef.current = false;
  }

  function handleCardPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (pointerStartXRef.current === null || draggingPointerIdRef.current !== event.pointerId) return;

    const rawOffset = event.clientX - pointerStartXRef.current;
    const offset = Math.sign(rawOffset) * Math.min(Math.abs(rawOffset), MAX_DRAG_OFFSET);
    dragOffsetRef.current = offset;
    setDragOffset(offset);
    setDragIntent(offset < -36 ? "next" : offset > 36 ? "prev" : "idle");

    if (Math.abs(rawOffset) > 6) {
      wasDraggingRef.current = true;
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }
  }

  function handleCardPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (draggingPointerIdRef.current !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const finalOffset = dragOffsetRef.current;
    const shouldGoNext = finalOffset <= -DRAG_THRESHOLD;
    const shouldGoPrev = finalOffset >= DRAG_THRESHOLD;
    resetCardDrag();
    clearDragClickGuard();

    if (shouldGoNext) {
      goToNextCard();
      return;
    }

    if (shouldGoPrev) {
      goToPreviousCard();
    }
  }

  function handleCardPointerCancel(event: PointerEvent<HTMLDivElement>) {
    if (draggingPointerIdRef.current === event.pointerId && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    resetCardDrag();
    clearDragClickGuard();
  }

  async function generateCards() {
    if (!canSubmit) {
      setError("请先输入至少 80 个字的学习内容。");
      return;
    }

    setLoading(true);
    setProgressValue(8);
    setError("");
    clearCardTimer();
    resetCardDrag();
    setActiveCardIndex(0);
    setAnswerRevealed(false);
    setCardMotion("idle");

    try {
      const response = await fetch("/api/tools/study-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, difficulty, cardCount }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(getStudyCardErrorMessage(payload));
      }

      setProgressValue(100);
      setResult(payload);
      setActiveCardIndex(0);
      setAnswerRevealed(false);
      setCardMotion("enter-next");
      settleCardMotion();
    } catch (err) {
      setError(err instanceof Error ? err.message : "学习卡片生成失败，请刷新页面后再试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="study-cards-page">
      <Link href="/thinking-lab" className="study-cards-back-link" aria-label="返回工具与思考">
        <ArrowLeft aria-hidden="true" />
        <span>返回</span>
      </Link>

      <section className="study-cards-shell" aria-label="AI 学习卡片生成器">
        <div className="study-cards-workspace">
          <section className="study-cards-input-panel" aria-label="输入学习内容">
            <div className="study-cards-title-row">
              <div>
                <p>AI Study Cards</p>
                <h1>AI 学习卡片生成器</h1>
              </div>
            </div>

            <label className="study-cards-textarea-label" htmlFor="study-card-source">
              输入知识内容
            </label>
            <textarea
              id="study-card-source"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="粘贴课程笔记、文章段落、视频字幕或教材片段..."
              className="study-cards-textarea"
            />

            <div className="study-cards-input-meta">
              <span>{contentLength} 字</span>
              <span>至少 80 字</span>
            </div>

            <div className="study-cards-control-grid" aria-label="生成设置">
              <label>
                难度
                <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                  {DIFFICULTY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                卡片数
                <input
                  type="number"
                  min={4}
                  max={12}
                  value={cardCount}
                  onChange={(event) => setCardCount(Number(event.target.value))}
                />
              </label>
            </div>

            <div className="study-cards-actions">
              <button type="button" className="study-cards-primary" onClick={generateCards} disabled={!canSubmit}>
                {loading ? <Loader2 aria-hidden="true" /> : <WandSparkles aria-hidden="true" />}
                {loading ? "生成中" : "生成学习卡片"}
              </button>
              <button type="button" onClick={loadSampleContent}>
                <BookOpen aria-hidden="true" />
                示例内容
              </button>
              <button
                type="button"
                onClick={() => {
                  setContent("");
                  setResult(null);
                  setError("");
                  clearCardTimer();
                  setActiveCardIndex(0);
                  setAnswerRevealed(false);
                  setCardMotion("idle");
                }}
              >
                <Trash2 aria-hidden="true" />
                清空
              </button>
            </div>

            {loading && (
              <div className="study-cards-progress" aria-live="polite">
                <div className="study-cards-progress-top">
                  <span>{progressLabel}</span>
                  <span>{Math.round(progressValue)}%</span>
                </div>
                <div
                  className="study-cards-progress-track"
                  role="progressbar"
                  aria-label="学习卡片生成进度"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progressValue)}
                >
                  <span style={{ width: `${progressValue}%` }} />
                </div>
              </div>
            )}

            {error && <p className="study-cards-error">{error}</p>}
          </section>

          <section className="study-cards-output-panel" aria-label="学习卡片结果">
            {!result || !activeCard ? (
              <div className="study-cards-empty">
                <Layers aria-hidden="true" />
                <h2>把材料变成可以复习的卡片</h2>
                <p>点击示例内容，右侧会出现一组可翻动的小卡片。</p>
              </div>
            ) : (
              <div className="study-cards-result">
                <div className="study-cards-practice-top">
                  <div>
                    <p>闪卡练习</p>
                    <h2>{result.summary || "先想，再翻面"}</h2>
                  </div>
                  <span>第 {activeCardIndex + 1} / {totalCards} 张</span>
                </div>

                <p className="study-cards-swipe-help">先看提示回忆答案；卡片左滑下一张，右滑上一张</p>

                <div className="study-cards-card-progress" aria-hidden="true">
                  <span style={{ width: `${cardProgress}%` }} />
                </div>

                <div className="study-cards-deck-shell">
                  <button
                    type="button"
                    className="study-cards-nav-arrow is-prev"
                    onClick={goToPreviousCard}
                    disabled={cardMotion !== "idle" || totalCards <= 1}
                    aria-label="上一张卡片"
                  >
                    <ChevronLeft aria-hidden="true" />
                  </button>

                  <div className="study-cards-deck" aria-live="polite">
                    <div
                      className={cardStageClassName}
                      style={cardStageStyle}
                      onPointerDown={handleCardPointerDown}
                      onPointerMove={handleCardPointerMove}
                      onPointerUp={handleCardPointerUp}
                      onPointerCancel={handleCardPointerCancel}
                    >
                      <article
                        key={activeCardIndex}
                        className={`study-cards-practice-card is-${cardMotion}`}
                        aria-label="当前问答卡片"
                      >
                        <div className="study-cards-question-block">
                          <div className="study-cards-practice-kicker">
                            <span>{String(activeCardIndex + 1).padStart(2, "0")}</span>
                            <span>主动回忆</span>
                          </div>
                          <h3>{compactText(activeCard.front, 42)}</h3>
                        </div>
                        {activeCard.note && (
                          <p className="study-cards-recall-hint">
                            <span>提示</span>
                            {compactText(activeCard.note, 52)}
                          </p>
                        )}
                        <button
                          type="button"
                          className={`study-cards-answer-panel${answerRevealed ? " is-revealed" : " is-hidden"}`}
                          onClick={revealAnswer}
                          aria-expanded={answerRevealed}
                          aria-label={answerRevealed ? "答案已显示" : "显示答案"}
                        >
                          {answerRevealed ? (
                            <span className="study-cards-answer-copy">
                              <strong>参考答案</strong>
                              <span>{compactText(activeCard.back, 110)}</span>
                            </span>
                          ) : (
                            <span className="study-cards-answer-placeholder">
                              <Eye aria-hidden="true" />
                              轻点这里翻开答案
                            </span>
                          )}
                        </button>
                      </article>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="study-cards-nav-arrow is-next"
                    onClick={goToNextCard}
                    disabled={cardMotion !== "idle" || totalCards <= 1}
                    aria-label="下一张卡片"
                  >
                    <ChevronRight aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
