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
  RotateCcw,
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
type PracticeMode = "learn" | "check";
type CardMemoryRating = "remembered" | "shaky";
type CardTextDensity = "normal" | "dense" | "compact";
type CardMemoryState = {
  remembered: number;
  shaky: number;
  lastRating?: CardMemoryRating;
  lastReviewedTurn?: number;
};

const DRAG_THRESHOLD = 90;
const MAX_DRAG_OFFSET = 150;

const SAMPLE_CONTENT = `近年来，在社会结构变化、学业竞争加剧等多重冲击下，青少年心理健康危机日益凸显：中国接近五分之一的儿童青少年患有精神障碍，休学、花式上学现象逐年增多，约一成青少年曾产生自杀念头。与此同时，当AI以前所未有的深度嵌入生活，作为“数字原住民”一代的青少年，正面临真实社交与生命体验被稀释的困境。当“为何而学？为何而活？”的追问愈发迫切，生命教育正从教育理念的边缘地带走向社会关注的焦点。

在此背景下，中国教育发展战略学会生命教育专业委员会5月24日在中国人民大学正式成立，清华大学心理与认知科学系教授、中国积极心理学发起人彭凯平当选为生命教育专业委员会首届理事会理事长。

他在发言中指出，生命教育专业委员会的成立具有时代的必然性，“当代青少年生长在物质丰裕但信息爆炸、变化剧烈的时代，常陷入迷茫、焦虑、脆弱和无助。如果教育不能让孩子懂得生命的价值、存在的价值及爱的能力，高分仅是建立在冰山上的高楼。”

近年来，彭凯平团队追踪调查中国42万多中小学生发现，当代青少年出现了让人担心的“四无”现象，即学习无动力、对真实世界无兴趣、社交无能力和生命无意义感。他在会上表示，生命教育不是教育改革的一个选项，而是教育之为教育的题中应有之义，其最终使命是帮助每一个独特的生命找到属于自己的“为什么要活着”的答案。`;

const SAMPLE_RESULT: StudyCardResult = {
  summary: "生命教育与青少年危机",
  cards: [
    {
      front: "生命教育为何走向焦点？",
      back: "材料提到，青少年心理健康危机日益凸显，同时 AI 深度嵌入生活，数字原住民面临真实社交与生命体验被稀释的困境；在“为何而学？为何而活？”的追问更迫切时，生命教育走向社会关注的焦点。",
      note: "先看两重背景",
    },
    {
      front: "专委会何时何地成立？",
      back: "中国教育发展战略学会生命教育专业委员会于 5 月 24 日在中国人民大学正式成立，彭凯平当选为生命教育专业委员会首届理事会理事长。",
      note: "抓住时间、地点和人选",
    },
    {
      front: "彭凯平为何说成立有必然性？",
      back: "彭凯平指出，当代青少年生长在物质丰裕但信息爆炸、变化剧烈的时代，常陷入迷茫、焦虑、脆弱和无助；如果教育不能让孩子懂得生命价值、存在价值及爱的能力，高分仅是建立在冰山上的高楼。",
      note: "看时代处境与教育缺口",
    },
    {
      front: "彭凯平团队发现哪“四无”？",
      back: "彭凯平团队追踪 42 万多名中小学生，发现当代青少年有学习无动力、对真实世界无兴趣、社交无能力和生命无意义感这四类现象。",
      note: "按四个“无”回忆",
    },
    {
      front: "生命教育不是哪种定位？",
      back: "材料明确说，生命教育不是教育改革的一个选项，而是教育之为教育的题中应有之义。这一定位来自彭凯平在会上对生命教育意义的表述。",
      note: "抓住两句原文定位",
    },
    {
      front: "生命教育最终使命是什么？",
      back: "它的最终使命是帮助每一个独特的生命找到属于自己的“为什么要活着”的答案。材料把这个使命放在“为何而学？为何而活？”的追问和生命无意义感的背景下。",
      note: "回到最后一句使命",
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
  { threshold: 82, label: "正在打磨卡片答案" },
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

function getCardTextDensity(card: StudyCard | null): CardTextDensity {
  if (!card) return "normal";

  const frontLength = compactText(card.front, 72).length;
  const noteLength = compactText(card.note ?? "", 96).length;
  const backLength = compactText(card.back, 240).length;

  if (frontLength > 42 || noteLength > 62 || backLength > 180) {
    return "compact";
  }

  if (frontLength > 28 || noteLength > 38 || backLength > 132) {
    return "dense";
  }

  return "normal";
}

function getProgressLabel(value: number) {
  return PROGRESS_STEPS.find((step) => value <= step.threshold)?.label ?? PROGRESS_STEPS.at(-1)!.label;
}

function buildReviewQueue(totalCards: number, startIndex: number) {
  return Array.from({ length: Math.max(totalCards - 1, 0) }, (_, offset) => (startIndex + offset + 1) % totalCards);
}

function hasCardBeenRemembered(memoryStats: Record<number, CardMemoryState>, cardIndex: number) {
  return (memoryStats[cardIndex]?.remembered ?? 0) > 0;
}

function hasCompletedLearningRound(memoryStats: Record<number, CardMemoryState>, totalCards: number) {
  return totalCards > 0 && Array.from({ length: totalCards }, (_, index) => index).every((index) => hasCardBeenRemembered(memoryStats, index));
}

function buildLearningQueue(
  totalCards: number,
  startIndex: number,
  memoryStats: Record<number, CardMemoryState>,
) {
  return buildReviewQueue(totalCards, startIndex).filter((index) => !hasCardBeenRemembered(memoryStats, index));
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
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("learn");
  const [memoryStats, setMemoryStats] = useState<Record<number, CardMemoryState>>({});
  const [reviewQueue, setReviewQueue] = useState<number[]>([]);
  const [reviewTurn, setReviewTurn] = useState(0);
  const [mobilePracticeActive, setMobilePracticeActive] = useState(false);
  const transitionTimerRef = useRef<number | null>(null);
  const pointerStartXRef = useRef<number | null>(null);
  const draggingPointerIdRef = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);
  const wasDraggingRef = useRef(false);
  const outputPanelRef = useRef<HTMLElement | null>(null);

  const contentLength = useMemo(() => countChineseText(content), [content]);
  const canSubmit = contentLength >= 80 && !loading;
  const progressLabel = getProgressLabel(progressValue);
  const activeCard = useMemo(() => result?.cards[activeCardIndex] ?? null, [activeCardIndex, result]);
  const activeCardDensity = useMemo(() => getCardTextDensity(activeCard), [activeCard]);
  const totalCards = result?.cards.length ?? 0;
  const learnedCardCount = useMemo(() => {
    if (!totalCards) return 0;
    return Array.from({ length: totalCards }, (_, index) => index).filter((index) => hasCardBeenRemembered(memoryStats, index)).length;
  }, [memoryStats, totalCards]);
  const cardProgress =
    totalCards > 0
      ? practiceMode === "learn"
        ? (learnedCardCount / totalCards) * 100
        : ((activeCardIndex + 1) / totalCards) * 100
      : 0;
  const activeMemory = memoryStats[activeCardIndex];
  const practiceModeLabel = practiceMode === "learn" ? "第一轮学习" : "翻看检查";
  const swipeHelp =
    practiceMode === "learn"
      ? "第一轮先看答案；左滑或点右箭头表示通过，不熟练会近期复现"
      : "先回忆再翻答案；左滑或点右箭头表示通过，右滑回看上一张";
  const memoryPrompt =
    activeMemory?.lastRating === "shaky"
      ? "这张会很快再出现"
      : practiceMode === "learn"
        ? "会了就左滑或点右箭头"
        : "答对就继续下一张";
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
  const pageClassName = [
    "study-cards-page",
    result ? "has-result" : "",
    mobilePracticeActive && result ? "is-mobile-practice" : "",
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

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px) and (orientation: portrait)");
    const syncMobilePracticeMode = () => {
      if (!media.matches) {
        setMobilePracticeActive(false);
      }
    };

    syncMobilePracticeMode();
    media.addEventListener("change", syncMobilePracticeMode);

    return () => media.removeEventListener("change", syncMobilePracticeMode);
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

  function isMobilePracticeViewport() {
    return window.matchMedia("(max-width: 760px) and (orientation: portrait)").matches;
  }

  function focusCardsOnMobile() {
    window.setTimeout(() => {
      if (isMobilePracticeViewport()) {
        setMobilePracticeActive(true);
        return;
      }

      if (window.matchMedia("(max-width: 900px) and (orientation: portrait)").matches) {
        outputPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 120);
  }

  function returnToInputOnMobile() {
    setMobilePracticeActive(false);
    window.setTimeout(() => {
      document.getElementById("study-card-source")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  function resetPracticeDeck(nextTotalCards = totalCards) {
    clearCardTimer();
    resetCardDrag();
    setPracticeMode("learn");
    setActiveCardIndex(0);
    setAnswerRevealed(true);
    setMemoryStats({});
    setReviewTurn(0);
    setReviewQueue(buildLearningQueue(nextTotalCards, 0, {}));
    setCardMotion("enter-prev");
    settleCardMotion();
  }

  function loadSampleContent() {
    setContent(SAMPLE_CONTENT);
    setDifficulty(DIFFICULTY_OPTIONS[2]);
    setCardCount(SAMPLE_RESULT.cards.length);
    setResult(SAMPLE_RESULT);
    setError("");
    setProgressValue(0);
    resetPracticeDeck(SAMPLE_RESULT.cards.length);
    focusCardsOnMobile();
  }

  function moveToCard(
    targetIndex: number,
    direction: CardDirection,
    nextReviewQueue?: number[],
    nextPracticeMode = practiceMode,
  ) {
    if (!result || cardMotion !== "idle" || targetIndex < 0 || targetIndex >= totalCards) return;

    clearCardTimer();
    resetCardDrag();
    setAnswerRevealed(nextPracticeMode === "learn");
    setCardMotion(direction === "next" ? "exit-next" : "exit-prev");
    transitionTimerRef.current = window.setTimeout(() => {
      setPracticeMode(nextPracticeMode);
      setActiveCardIndex(targetIndex);
      setAnswerRevealed(nextPracticeMode === "learn");
      setReviewQueue(
        nextReviewQueue ??
          (nextPracticeMode === "learn"
            ? buildLearningQueue(totalCards, targetIndex, memoryStats)
            : buildReviewQueue(totalCards, targetIndex)),
      );
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
    advanceActiveCard();
  }

  function scheduleRatedCard(rating: CardMemoryRating, nextMemoryStats: Record<number, CardMemoryState>) {
    const currentMemory = nextMemoryStats[activeCardIndex] ?? { remembered: 0, shaky: 0 };
    const queueWithoutCurrent = reviewQueue.filter((index) => index !== activeCardIndex);
    const insertAt =
      rating === "shaky"
        ? Math.min(1, queueWithoutCurrent.length)
        : Math.min(2 + Math.min(currentMemory.remembered, 3), queueWithoutCurrent.length);

    return [
      ...queueWithoutCurrent.slice(0, insertAt),
      activeCardIndex,
      ...queueWithoutCurrent.slice(insertAt),
    ];
  }

  function scheduleLearningCard(rating: CardMemoryRating, nextMemoryStats: Record<number, CardMemoryState>) {
    const queueWithoutCurrent = reviewQueue.filter(
      (index) => index !== activeCardIndex && !hasCardBeenRemembered(nextMemoryStats, index),
    );
    if (rating === "remembered") return queueWithoutCurrent;

    const insertAt = Math.min(1, queueWithoutCurrent.length);
    return [
      ...queueWithoutCurrent.slice(0, insertAt),
      activeCardIndex,
      ...queueWithoutCurrent.slice(insertAt),
    ];
  }

  function transitionToCheckRound(nextMemoryStats: Record<number, CardMemoryState>, nextTurn: number) {
    clearCardTimer();
    resetCardDrag();
    setMemoryStats(nextMemoryStats);
    setReviewTurn(nextTurn);
    setReviewQueue(buildReviewQueue(totalCards, 0));
    setCardMotion("exit-next");
    transitionTimerRef.current = window.setTimeout(() => {
      setPracticeMode("check");
      setActiveCardIndex(0);
      setAnswerRevealed(false);
      setCardMotion("enter-next");
      settleCardMotion();
    }, 220);
  }

  function buildNextMemoryStats(rating: CardMemoryRating) {
    const nextTurn = reviewTurn + 1;
    const previousMemory = memoryStats[activeCardIndex] ?? { remembered: 0, shaky: 0 };

    return {
      nextTurn,
      nextMemoryStats: {
        ...memoryStats,
        [activeCardIndex]: {
          remembered: previousMemory.remembered + (rating === "remembered" ? 1 : 0),
          shaky: previousMemory.shaky + (rating === "shaky" ? 1 : 0),
          lastRating: rating,
          lastReviewedTurn: nextTurn,
        },
      },
    };
  }

  function advanceActiveCard() {
    if (!result || cardMotion !== "idle") return;

    const { nextTurn, nextMemoryStats } = buildNextMemoryStats("remembered");
    setMemoryStats(nextMemoryStats);
    setReviewTurn(nextTurn);

    if (practiceMode === "learn") {
      if (hasCompletedLearningRound(nextMemoryStats, totalCards)) {
        transitionToCheckRound(nextMemoryStats, nextTurn);
        return;
      }

      const learningQueue = scheduleLearningCard("remembered", nextMemoryStats);
      setReviewQueue(learningQueue);
      setAnswerRevealed(true);

      if (totalCards <= 1) return;

      moveToCard(learningQueue[0] ?? getNextCardIndex(), "next", learningQueue.slice(1), "learn");
      return;
    }

    const scheduledQueue = scheduleRatedCard("remembered", nextMemoryStats);
    if (totalCards <= 1) {
      setReviewQueue(scheduledQueue);
      setAnswerRevealed(false);
      return;
    }

    moveToCard(scheduledQueue[0] ?? getNextCardIndex(), "next", scheduledQueue.slice(1));
  }

  function rateActiveCard(rating: CardMemoryRating) {
    if (!result || cardMotion !== "idle") return;

    const { nextTurn, nextMemoryStats } = buildNextMemoryStats(rating);

    setMemoryStats(nextMemoryStats);
    setReviewTurn(nextTurn);

    if (practiceMode === "learn") {
      if (rating === "remembered" && hasCompletedLearningRound(nextMemoryStats, totalCards)) {
        transitionToCheckRound(nextMemoryStats, nextTurn);
        return;
      }

      const learningQueue = scheduleLearningCard(rating, nextMemoryStats);
      setReviewQueue(learningQueue);
      setAnswerRevealed(true);

      if (totalCards <= 1) return;

      moveToCard(learningQueue[0] ?? getNextCardIndex(), "next", learningQueue.slice(1), "learn");
      return;
    }

    const scheduledQueue = scheduleRatedCard(rating, nextMemoryStats);

    if (totalCards <= 1) {
      setReviewQueue(scheduledQueue);
      setAnswerRevealed(false);
      return;
    }

    moveToCard(scheduledQueue[0] ?? getNextCardIndex(), "next", scheduledQueue.slice(1));
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
    setPracticeMode("learn");
    setActiveCardIndex(0);
    setAnswerRevealed(true);
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
      setPracticeMode("learn");
      setActiveCardIndex(0);
      setAnswerRevealed(true);
      setMemoryStats({});
      setReviewTurn(0);
      setReviewQueue(buildLearningQueue(payload.cards?.length ?? cardCount, 0, {}));
      setCardMotion("enter-next");
      settleCardMotion();
      focusCardsOnMobile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "学习卡片生成失败，请刷新页面后再试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={pageClassName}>
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

            {!result && (
              <div className="study-cards-inline-preview" aria-hidden="true">
                <span>试试看这种卡片</span>
                <strong>生命教育为何走向焦点？</strong>
                <small>先判断，再翻面</small>
              </div>
            )}

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
                  setMobilePracticeActive(false);
                  setPracticeMode("learn");
                  setActiveCardIndex(0);
                  setAnswerRevealed(false);
                  setMemoryStats({});
                  setReviewTurn(0);
                  setReviewQueue([]);
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

          <section ref={outputPanelRef} className="study-cards-output-panel" aria-label="学习卡片结果">
            {!result || !activeCard ? (
              <div className="study-cards-empty">
                <div className="study-cards-empty-copy">
                  <Layers aria-hidden="true" />
                  <span>试试看这种卡片</span>
                  <h2>把材料变成可以翻看的闪卡</h2>
                  <p>点击示例内容，先看一遍带答案的卡片，再进入回忆检查。</p>
                </div>
                <div className="study-cards-empty-preview" aria-hidden="true">
                  <div className="study-cards-empty-card">
                    <span>01</span>
                    <strong>生命教育为何走向焦点？</strong>
                    <p>提示 · 先看两重背景</p>
                    <div className="study-cards-empty-answer">
                      先判断，再翻面
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="study-cards-result">
                <div className="study-cards-practice-top">
                  <div>
                    <button type="button" className="study-cards-mobile-edit-button" onClick={returnToInputOnMobile}>
                      <ArrowLeft aria-hidden="true" />
                      编辑内容
                    </button>
                    <p>{practiceModeLabel}</p>
                    <h2>{result.summary || "先想，再翻面"}</h2>
                  </div>
                  <span>
                    {practiceMode === "learn" ? `已通过 ${learnedCardCount} / ${totalCards}` : `第 ${activeCardIndex + 1} / ${totalCards} 张`}
                  </span>
                </div>

                <p className="study-cards-swipe-help">{swipeHelp}</p>

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
                        className={`study-cards-practice-card is-${cardMotion} is-density-${activeCardDensity}`}
                        aria-label="当前问答卡片"
                      >
                        <div className="study-cards-question-block">
                          <div className="study-cards-practice-kicker">
                            <span>{String(activeCardIndex + 1).padStart(2, "0")}</span>
                            <span>{practiceModeLabel}</span>
                          </div>
                          <h3>{compactText(activeCard.front, 72)}</h3>
                        </div>
                        {activeCard.note && (
                          <p className="study-cards-recall-hint">
                            <span>提示</span>
                            {compactText(activeCard.note, 96)}
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
                              <strong>背面答案</strong>
                              <span>{compactText(activeCard.back, 240)}</span>
                            </span>
                          ) : (
                            <span className="study-cards-answer-placeholder">
                              <span className="study-cards-answer-placeholder-icon">
                                <Eye aria-hidden="true" />
                              </span>
                              <span>先在心里回答</span>
                              <small>轻点这里翻开答案</small>
                            </span>
                          )}
                        </button>
                        <div className="study-cards-memory-actions" aria-label="记忆反馈">
                          <button
                            type="button"
                            className="is-shaky"
                            onClick={() => rateActiveCard("shaky")}
                            disabled={cardMotion !== "idle"}
                          >
                            <RotateCcw aria-hidden="true" />
                            不熟练
                          </button>
                          <small>{memoryPrompt}</small>
                        </div>
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
