"use client";

import { type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Layers,
  Loader2,
  RotateCcw,
  Trophy,
  Trash2,
  Volume2,
  WandSparkles,
} from "lucide-react";

type VocabularyCard = {
  word: string;
  phonetic?: string;
  translation: string;
  example: string;
  exampleTranslation?: string;
  source?: string;
  level?: string;
};

type StudyCardResult = {
  summary?: string;
  mode?: "article" | "word-list";
  cards: VocabularyCard[];
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

const SAMPLE_CONTENT = `In an age of algorithmic feeds, information feels ubiquitous but attention becomes fragmented. Students may skim dozens of articles without doing deep work or building durable understanding, because the most important ideas are often hidden inside unfamiliar vocabulary. A deliberate reading habit changes that: instead of rushing through every sentence, a reader pauses at words that carry nuance, ambiguity, or analytical weight.

Good vocabulary study is not about collecting obscure words for display. It is about noticing which words unlock the argument of a text. When a word like resilience, agency, or distortion appears in a paragraph, it often signals how the author frames a problem. Learning those words in context makes reading less mechanical and writing more precise.`;

const SAMPLE_RESULT: StudyCardResult = {
  summary: "短文高频难词",
  mode: "article",
  cards: [
    {
      word: "ubiquitous",
      phonetic: "/juːˈbɪkwɪtəs/",
      translation: "无处不在的，普遍存在的",
      example: "Smartphones have become ubiquitous in modern classrooms.",
      exampleTranslation: "智能手机在现代课堂里已经无处不在。",
      source: "information feels ubiquitous but attention becomes fragmented",
      level: "雅思 / 托福",
    },
    {
      word: "fragmented",
      phonetic: "/fræɡˈmentɪd/",
      translation: "碎片化的，支离破碎的",
      example: "A fragmented schedule makes deep work difficult.",
      exampleTranslation: "碎片化的日程会让深度工作变得困难。",
      source: "attention becomes fragmented",
      level: "CET-6",
    },
    {
      word: "deep work",
      phonetic: "/diːp wɜːrk/",
      translation: "深度工作，专注完成高价值任务",
      example: "A fragmented schedule makes deep work difficult.",
      exampleTranslation: "碎片化的日程会让深度工作变得困难。",
      source: "without doing deep work or building durable understanding",
      level: "高阶表达",
    },
    {
      word: "deliberate",
      phonetic: "/dɪˈlɪbərət/",
      translation: "有意的，审慎的",
      example: "She made a deliberate choice to slow down and read carefully.",
      exampleTranslation: "她有意识地选择放慢速度，认真阅读。",
      source: "A deliberate reading habit changes that",
      level: "雅思",
    },
    {
      word: "nuance",
      phonetic: "/ˈnjuːɑːns/",
      translation: "细微差别，微妙含义",
      example: "The translation missed the nuance of the original sentence.",
      exampleTranslation: "这段翻译漏掉了原句中的微妙含义。",
      source: "words that carry nuance, ambiguity, or analytical weight",
      level: "托福 / 高阶表达",
    },
    {
      word: "ambiguity",
      phonetic: "/ˌæmbɪˈɡjuːəti/",
      translation: "模糊性，歧义",
      example: "The policy left too much ambiguity for teachers.",
      exampleTranslation: "这项政策给教师留下了太多模糊空间。",
      source: "words that carry nuance, ambiguity, or analytical weight",
      level: "雅思 / 托福",
    },
    {
      word: "obscure",
      phonetic: "/əbˈskjʊə(r)/",
      translation: "晦涩的，不知名的",
      example: "The article uses obscure terms without explaining them.",
      exampleTranslation: "这篇文章使用了晦涩术语，却没有解释。",
      source: "collecting obscure words for display",
      level: "CET-6 / 雅思",
    },
    {
      word: "resilience",
      phonetic: "/rɪˈzɪliəns/",
      translation: "韧性，恢复力",
      example: "Resilience helps students recover from setbacks.",
      exampleTranslation: "韧性帮助学生从挫折中恢复过来。",
      source: "a word like resilience, agency, or distortion",
      level: "托福 / 学术",
    },
    {
      word: "analytical weight",
      phonetic: "/ˌænəˈlɪtɪkəl weɪt/",
      translation: "分析分量，论证中的关键意义",
      example: "The phrase carries analytical weight in the author's argument.",
      exampleTranslation: "这个短语在作者的论证中承载着关键分析意义。",
      source: "words that carry nuance, ambiguity, or analytical weight",
      level: "学术 / 高阶表达",
    },
    {
      word: "distortion",
      phonetic: "/dɪˈstɔːʃn/",
      translation: "扭曲，失真",
      example: "The chart created a distortion of the real trend.",
      exampleTranslation: "这张图扭曲了真实趋势。",
      source: "a word like resilience, agency, or distortion",
      level: "CET-6 / 学术",
    },
  ],
};

const DIFFICULTY_OPTIONS = [
  "日常阅读：适合英文文章精读",
  "考试进阶：适合 CET-6 / 雅思 / 托福",
  "高阶表达：偏学术、写作和表达",
];

const PROGRESS_STEPS = [
  { threshold: 28, label: "正在判断输入类型" },
  { threshold: 58, label: "正在筛选高价值单词" },
  { threshold: 82, label: "正在补充中文释义" },
  { threshold: 100, label: "正在校验输出格式" },
];

const VOCABULARY_CSV_HEADER = "单词/短语,音标,中文释义,英文例句,例句中文,来源,难度";
const HIGH_QUALITY_ENGLISH_VOICE_HINTS = [
  "samantha",
  "daniel",
  "karen",
  "moira",
  "tessa",
  "alex",
  "google us english",
  "google uk english",
  "microsoft aria",
  "microsoft jenny",
  "microsoft guy",
  "microsoft libby",
  "microsoft ryan",
  "natural",
  "enhanced",
  "premium",
];

function countEnglishWords(text: string) {
  return text.match(/[A-Za-z][A-Za-z'-]*/g)?.length ?? 0;
}

function getReadableInputLength(text: string) {
  return text.replace(/\s/g, "").length;
}

function hasEnoughVocabularyInput(text: string) {
  return countEnglishWords(text) >= 3 || getReadableInputLength(text) >= 80;
}

function compactText(text: string, maxLength: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).replace(/[，。；、：,.:\s]+$/, "")}...`;
}

function normalizeDisplayText(text = "") {
  return text.replace(/\s+/g, " ").trim();
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeCsvValue(value = "") {
  const normalized = normalizeDisplayText(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

function buildVocabularyCsv(cards: VocabularyCard[]) {
  const rows = cards.map((card) =>
    [
      card.word,
      card.phonetic || "",
      card.translation,
      card.example,
      card.exampleTranslation || "",
      card.source || "",
      card.level || "",
    ]
      .map(escapeCsvValue)
      .join(","),
  );

  return `\uFEFF${[VOCABULARY_CSV_HEADER, ...rows].join("\n")}`;
}

function renderHighlightedExample(example: string, target: string) {
  const normalizedExample = normalizeDisplayText(example);
  const normalizedTarget = normalizeDisplayText(target);
  if (!normalizedExample || !normalizedTarget) return normalizedExample;

  const targetPattern = normalizedTarget.split(/\s+/).map(escapeRegExp).join("\\s+");
  const matcher = new RegExp(`(^|[^A-Za-z])(${targetPattern})(?=$|[^A-Za-z])`, "gi");
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = matcher.exec(normalizedExample)) !== null) {
    const prefix = match[1] ?? "";
    const matchedText = match[2] ?? "";
    const targetStart = match.index + prefix.length;
    const targetEnd = targetStart + matchedText.length;

    if (targetStart > lastIndex) {
      parts.push(normalizedExample.slice(lastIndex, targetStart));
    }

    parts.push(
      <strong className="study-cards-example-highlight" key={`${targetStart}-${matchedText}`}>
        {normalizedExample.slice(targetStart, targetEnd)}
      </strong>,
    );
    lastIndex = targetEnd;
  }

  if (parts.length === 0) return normalizedExample;
  if (lastIndex < normalizedExample.length) {
    parts.push(normalizedExample.slice(lastIndex));
  }

  return parts;
}

function scoreEnglishVoice(voice: SpeechSynthesisVoice) {
  const lang = voice.lang.toLowerCase();
  const name = voice.name.toLowerCase();
  if (!lang.startsWith("en")) return -1;

  let score = 10;
  if (lang === "en-us") score += 28;
  else if (lang === "en-gb") score += 24;
  else if (lang === "en-au" || lang === "en-ca") score += 20;
  else if (lang.startsWith("en-")) score += 14;

  const hintIndex = HIGH_QUALITY_ENGLISH_VOICE_HINTS.findIndex((hint) => name.includes(hint));
  if (hintIndex >= 0) score += 50 - hintIndex;
  if (voice.localService) score += 4;
  if (voice.default) score += 2;
  if (name.includes("compact")) score -= 16;

  return score;
}

function getPreferredEnglishVoice(voices: SpeechSynthesisVoice[]) {
  return (
    voices
      .map((voice) => ({ voice, score: scoreEnglishVoice(voice) }))
      .filter(({ score }) => score >= 0)
      .sort((a, b) => b.score - a.score)[0]?.voice ?? null
  );
}

function formatCardBack(card: VocabularyCard) {
  const parts = [
    card.translation,
    card.example ? `例句：${card.example}` : "",
    card.exampleTranslation ? `例句中文：${card.exampleTranslation}` : "",
    card.source ? `来源：${card.source}` : "",
  ];

  return parts.filter(Boolean).join(" ");
}

function getCardTextDensity(card: VocabularyCard | null): CardTextDensity {
  if (!card) return "normal";

  const wordLength = compactText(card.word, 48).length;
  const translationLength = compactText(card.translation, 120).length;
  const exampleLength = normalizeDisplayText(card.example).length + normalizeDisplayText(card.exampleTranslation).length;
  const backLength = normalizeDisplayText(formatCardBack(card)).length;

  if (wordLength > 28 || translationLength > 62 || exampleLength > 120 || backLength > 210) {
    return "compact";
  }

  if (wordLength > 18 || translationLength > 38 || exampleLength > 86 || backLength > 150) {
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

function hasCompletedCheckRound(memoryStats: Record<number, CardMemoryState>, totalCards: number) {
  return (
    totalCards > 0 &&
    Array.from({ length: totalCards }, (_, index) => index).every((index) => {
      const memory = memoryStats[index];
      return memory?.lastRating === "remembered" && memory.remembered >= 2;
    })
  );
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
    return "当前本地环境没有配置 AI Key。线上页面可以直接使用；本地预览需要配置 DEEPSEEK_API_KEY。";
  }

  if (payload?.errorCode === "AI_TIMEOUT") {
    return "生成超时了。可以先缩短输入内容，或把卡片数调少一点再试。";
  }

  return payload?.error || "单词卡生成失败，请刷新页面后再试。";
}

export default function StudyCardsTool() {
  const [content, setContent] = useState("");
  const [difficulty, setDifficulty] = useState(DIFFICULTY_OPTIONS[0]);
  const [cardCount, setCardCount] = useState(10);
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
  const [speechVoices, setSpeechVoices] = useState<SpeechSynthesisVoice[]>([]);
  const transitionTimerRef = useRef<number | null>(null);
  const pointerStartXRef = useRef<number | null>(null);
  const draggingPointerIdRef = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);
  const wasDraggingRef = useRef(false);
  const outputPanelRef = useRef<HTMLElement | null>(null);
  const audioObjectUrlCacheRef = useRef<Record<string, string>>({});
  const currentPronunciationAudioRef = useRef<HTMLAudioElement | null>(null);

  const contentLength = useMemo(() => getReadableInputLength(content), [content]);
  const wordCount = useMemo(() => countEnglishWords(content), [content]);
  const canSubmit = hasEnoughVocabularyInput(content) && !loading;
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
  const isSessionComplete = practiceMode === "check" && hasCompletedCheckRound(memoryStats, totalCards);
  const practiceModeLabel = practiceMode === "learn" ? "先认词" : "回忆检查";
  const swipeHelp =
    practiceMode === "learn"
      ? "第一轮先看释义；左滑或点右箭头表示认识，陌生词会近期复现"
      : "先回忆中文释义；左滑或点右箭头表示认识，右滑回看上一张";
  const memoryPrompt =
    activeMemory?.lastRating === "shaky"
      ? "这个词会很快再出现"
      : practiceMode === "learn"
        ? "认识就左滑或点右箭头"
        : "认识就继续下一张";
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
      currentPronunciationAudioRef.current?.pause();
      Object.values(audioObjectUrlCacheRef.current).forEach((url) => URL.revokeObjectURL(url));
      audioObjectUrlCacheRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return undefined;

    const syncVoices = () => {
      setSpeechVoices(window.speechSynthesis.getVoices());
    };

    syncVoices();
    window.speechSynthesis.addEventListener("voiceschanged", syncVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", syncVoices);
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

  function restartCheckRound() {
    if (!result) return;

    const nextMemoryStats = Object.fromEntries(
      result.cards.map((_, index) => [
        index,
        {
          remembered: 1,
          shaky: memoryStats[index]?.shaky ?? 0,
          lastRating: "remembered" as const,
          lastReviewedTurn: reviewTurn,
        },
      ]),
    );

    clearCardTimer();
    resetCardDrag();
    setPracticeMode("check");
    setActiveCardIndex(0);
    setAnswerRevealed(false);
    setMemoryStats(nextMemoryStats);
    setReviewQueue(buildReviewQueue(result.cards.length, 0));
    setCardMotion("enter-prev");
    settleCardMotion();
  }

  function downloadVocabularyList() {
    if (!result?.cards.length) return;

    const blob = new Blob([buildVocabularyCsv(result.cards)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ai-vocabulary-cards-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function fallbackToBrowserPronunciation(word: string) {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const voicePool = speechVoices.length > 0 ? speechVoices : window.speechSynthesis.getVoices();
    const preferredVoice = getPreferredEnglishVoice(voicePool);
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = preferredVoice?.lang || "en-US";
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    utterance.rate = 0.82;
    utterance.pitch = 1.02;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  }

  async function playServerPronunciation(word: string) {
    const cacheKey = word.toLowerCase();
    let audioUrl = audioObjectUrlCacheRef.current[cacheKey];

    if (!audioUrl) {
      const response = await fetch("/api/tools/study-cards/pronunciation/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "audio/*",
        },
        body: JSON.stringify({ word }),
      });

      if (!response.ok) {
        throw new Error("Pronunciation API failed");
      }

      const blob = await response.blob();
      if (!blob.type.startsWith("audio/")) {
        throw new Error("Pronunciation API returned non-audio content");
      }

      audioUrl = URL.createObjectURL(blob);
      audioObjectUrlCacheRef.current[cacheKey] = audioUrl;
    }

    currentPronunciationAudioRef.current?.pause();
    const audio = new Audio(audioUrl);
    currentPronunciationAudioRef.current = audio;
    audio.playbackRate = 0.96;
    await audio.play();
  }

  async function playActiveCardPronunciation() {
    if (!activeCard) return;

    window.speechSynthesis?.cancel();

    try {
      await playServerPronunciation(activeCard.word);
    } catch {
      fallbackToBrowserPronunciation(activeCard.word);
    }
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
    if (rating === "remembered" && currentMemory.remembered >= 2) return queueWithoutCurrent;

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
    if (hasCompletedCheckRound(nextMemoryStats, totalCards)) {
      setReviewQueue([]);
      setAnswerRevealed(true);
      return;
    }

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
    if (rating === "remembered" && hasCompletedCheckRound(nextMemoryStats, totalCards)) {
      setReviewQueue([]);
      setAnswerRevealed(true);
      return;
    }

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

  function handleAnswerPanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    revealAnswer();
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
      setError("请先输入至少 3 个英文单词/短语，或一段 80 字以上英文文章。");
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
      setError(err instanceof Error ? err.message : "单词卡生成失败，请刷新页面后再试。");
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

      <section className="study-cards-shell" aria-label="AI 单词卡">
        <div className="study-cards-workspace">
          <section className="study-cards-input-panel" aria-label="输入英文文章或单词/短语清单">
            <div className="study-cards-title-row">
              <div>
                <p>AI Vocabulary Cards</p>
                <h1>AI 单词卡</h1>
              </div>
            </div>

            {!result && (
              <div className="study-cards-inline-preview" aria-hidden="true">
                <span>试试看单词卡</span>
                <strong>ubiquitous</strong>
                <small>先看英文，再翻中文</small>
              </div>
            )}

            <label className="study-cards-textarea-label" htmlFor="study-card-source">
              输入英文文章或逐行单词/短语
            </label>
            <textarea
              id="study-card-source"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="粘贴英文文章，AI 会挑出值得背的难词和短语；也可以每行输入一个单词或短语，AI 会补中文释义和例句。"
              className="study-cards-textarea"
            />

            <div className="study-cards-input-meta">
              <span>{wordCount} 个英文词 / {contentLength} 字符</span>
              <span>至少 3 个英文词或 80 字文章</span>
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
                {loading ? "生成中" : "生成背单词卡"}
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
                  aria-label="单词卡生成进度"
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

          <section ref={outputPanelRef} className="study-cards-output-panel" aria-label="背单词卡结果">
            {!result || !activeCard ? (
              <div className="study-cards-empty">
                <div className="study-cards-empty-copy">
                  <Layers aria-hidden="true" />
                  <span>试试看单词卡</span>
                  <h2>把英文文章变成可以背的单词卡</h2>
                  <p>点击示例内容，先看一遍释义和例句，再进入回忆检查。</p>
                </div>
                <div className="study-cards-empty-preview" aria-hidden="true">
                  <div className="study-cards-empty-card">
                    <span>01</span>
                    <div className="study-cards-empty-word-row">
                      <strong>ubiquitous</strong>
                      <span className="study-cards-empty-speak">
                        <Volume2 aria-hidden="true" />
                        <span className="study-cards-empty-speak-label">朗读</span>
                      </span>
                    </div>
                    <p>
                      <b>音标</b>
                      /juːˈbɪkwɪtəs/
                    </p>
                    <div className="study-cards-empty-answer">
                      <strong>无处不在的，普遍存在的</strong>
                      <span className="study-cards-empty-example">
                        Smartphones have become ubiquitous in modern classrooms.
                      </span>
                      <small>智能手机在现代课堂里已经无处不在。</small>
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
                  <div className="study-cards-result-actions">
                    <button type="button" onClick={downloadVocabularyList}>
                      <Download aria-hidden="true" />
                      导出词表
                    </button>
                    <span className="study-cards-result-count">
                      {practiceMode === "learn" ? `已认识 ${learnedCardCount} / ${totalCards}` : `第 ${activeCardIndex + 1} / ${totalCards} 张`}
                    </span>
                  </div>
                </div>

                {isSessionComplete ? (
                  <div className="study-cards-bingo" role="status" aria-live="polite">
                    <span className="study-cards-bingo-icon">
                      <Trophy aria-hidden="true" />
                    </span>
                    <p>BINGO</p>
                    <h3>这组单词通关了</h3>
                    <span>所有单词都完成了先认词和回忆检查，可以导出词表留作复习。</span>
                    <div className="study-cards-bingo-actions">
                      <button type="button" onClick={restartCheckRound}>
                        <RotateCcw aria-hidden="true" />
                        再复习一轮
                      </button>
                      <button type="button" onClick={downloadVocabularyList}>
                        <Download aria-hidden="true" />
                        导出词表
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
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
                            aria-label="当前单词卡片"
                          >
                            <div className="study-cards-question-block">
                              <div className="study-cards-practice-kicker">
                                <span>{String(activeCardIndex + 1).padStart(2, "0")}</span>
                                <span>{practiceModeLabel}</span>
                              </div>
                              <div className="study-cards-word-row">
                                <h3>{compactText(activeCard.word, 48)}</h3>
                                <button
                                  type="button"
                                  className="study-cards-speak-button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    playActiveCardPronunciation();
                                  }}
                                  aria-label="朗读单词"
                                >
                                  <Volume2 aria-hidden="true" />
                                  <span className="study-cards-speak-label">朗读</span>
                                </button>
                              </div>
                            </div>
                            <p className="study-cards-recall-hint">
                              <span>{activeCard.phonetic ? "音标" : "难度"}</span>
                              {compactText(activeCard.phonetic || activeCard.level || "先回忆中文释义", 96)}
                            </p>
                            <div
                              role="button"
                              tabIndex={0}
                              className={`study-cards-answer-panel${answerRevealed ? " is-revealed" : " is-hidden"}`}
                              onClick={revealAnswer}
                              onKeyDown={handleAnswerPanelKeyDown}
                              aria-expanded={answerRevealed}
                              aria-label={answerRevealed ? "释义已显示" : "显示释义"}
                            >
                              {answerRevealed ? (
                                <span className="study-cards-answer-copy">
                                  <strong>{compactText(activeCard.translation, 120)}</strong>
                                  {activeCard.example && (
                                    <span className="study-cards-example-line">
                                      {renderHighlightedExample(activeCard.example, activeCard.word)}
                                    </span>
                                  )}
                                  {activeCard.exampleTranslation && (
                                    <span className="study-cards-example-translation">
                                      {normalizeDisplayText(activeCard.exampleTranslation)}
                                    </span>
                                  )}
                                  {activeCard.level && (
                                    <span className="study-cards-answer-meta">
                                      <small>
                                        <b>难度</b>
                                        {compactText(activeCard.level, 48)}
                                      </small>
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="study-cards-answer-placeholder">
                                  <span className="study-cards-answer-placeholder-icon">
                                    <Eye aria-hidden="true" />
                                  </span>
                                  <span>先在心里说中文释义</span>
                                  <small>答完后点这里看释义</small>
                                </span>
                              )}
                            </div>
                            <div className="study-cards-memory-actions" aria-label="记忆反馈">
                              <button
                                type="button"
                                className="is-shaky"
                                onClick={() => rateActiveCard("shaky")}
                                disabled={cardMotion !== "idle"}
                              >
                                <RotateCcw aria-hidden="true" />
                                再记一次
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
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
