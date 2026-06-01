"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers,
  ListChecks,
  Loader2,
  RotateCcw,
  Sparkles,
  Trash2,
  WandSparkles,
} from "lucide-react";

type StudyCard = {
  front: string;
  back: string;
  note?: string;
};

type StudyQuiz = {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
};

type StudyCardResult = {
  summary: string;
  concept: {
    title: string;
    explanation: string;
    example: string;
  };
  cards: StudyCard[];
  quiz: StudyQuiz[];
};

const SAMPLE_CONTENT = `间隔重复是一种学习方法，它的核心思想是在记忆即将遗忘之前进行复习。相比一次性反复阅读，间隔重复会把复习分散到多个时间点，让大脑在“努力回忆”的过程中重新巩固知识。

主动回忆是间隔重复的关键。学习者不只是重新看答案，而是先尝试回答问题，再对照答案修正理解。这样可以暴露自己真正没有掌握的地方。

Anki 这类卡片工具通常会把知识拆成正反两面：正面是问题或提示，背面是答案。好的卡片应该短小、清晰、只考一个知识点。`;

const DIFFICULTY_OPTIONS = [
  "基础：解释更直白，适合第一次接触",
  "进阶：保留关键术语，适合复习巩固",
  "高级：强调迁移、辨析和易错点",
];

const PROGRESS_STEPS = [
  { threshold: 28, label: "正在梳理材料结构" },
  { threshold: 58, label: "正在生成问答卡片" },
  { threshold: 82, label: "正在整理概念和例题" },
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

  const contentLength = useMemo(() => countChineseText(content), [content]);
  const canSubmit = contentLength >= 80 && !loading;
  const progressLabel = getProgressLabel(progressValue);
  const activeCard = useMemo(() => result?.cards[activeCardIndex] ?? null, [activeCardIndex, result]);
  const totalCards = result?.cards.length ?? 0;
  const cardProgress = totalCards > 0 ? ((activeCardIndex + 1) / totalCards) * 100 : 0;
  const isFirstCard = activeCardIndex === 0;
  const isLastCard = activeCardIndex >= totalCards - 1;

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

  function resetPracticeDeck() {
    setActiveCardIndex(0);
    setAnswerRevealed(false);
  }

  function goToPreviousCard() {
    setActiveCardIndex((index) => Math.max(0, index - 1));
    setAnswerRevealed(false);
  }

  function goToNextCard() {
    setActiveCardIndex((index) => Math.min(totalCards - 1, index + 1));
    setAnswerRevealed(false);
  }

  async function generateCards() {
    if (!canSubmit) {
      setError("请先输入至少 80 个字的学习内容。");
      return;
    }

    setLoading(true);
    setProgressValue(8);
    setError("");
    resetPracticeDeck();

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
      resetPracticeDeck();
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
              <span>
                <Sparkles aria-hidden="true" />
                独立工具
              </span>
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
              <button type="button" onClick={() => setContent(SAMPLE_CONTENT)}>
                <BookOpen aria-hidden="true" />
                示例内容
              </button>
              <button
                type="button"
                onClick={() => {
                  setContent("");
                  setResult(null);
                  setError("");
                  resetPracticeDeck();
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
                <p>生成结果会包含问答卡片、核心概念解释、一个理解例子和三道测试题。</p>
              </div>
            ) : (
              <div className="study-cards-result">
                <div className="study-cards-practice-top">
                  <div>
                    <p>问答卡片</p>
                    <h2>先想，再翻面</h2>
                  </div>
                  <span>第 {activeCardIndex + 1} / {totalCards} 张</span>
                </div>

                <div className="study-cards-card-progress" aria-hidden="true">
                  <span style={{ width: `${cardProgress}%` }} />
                </div>

                <article className="study-cards-practice-card" aria-label="当前问答卡片">
                  <div className="study-cards-practice-kicker">
                    <span>{String(activeCardIndex + 1).padStart(2, "0")}</span>
                    <span>主动回忆</span>
                  </div>
                  <h3>{compactText(activeCard.front, 58)}</h3>
                  <div
                    className={`study-cards-practice-answer${answerRevealed ? "" : " is-hidden"}`}
                    aria-live="polite"
                  >
                    {answerRevealed ? (
                      <>
                        <strong>答案</strong>
                        <p>{compactText(activeCard.back, 86)}</p>
                        {activeCard.note && <small>{compactText(activeCard.note, 48)}</small>}
                      </>
                    ) : (
                      <p>答案已隐藏</p>
                    )}
                  </div>
                </article>

                <div className="study-cards-practice-actions" aria-label="卡片练习操作">
                  <button type="button" onClick={goToPreviousCard} disabled={isFirstCard}>
                    <ChevronLeft aria-hidden="true" />
                    上一张
                  </button>
                  {answerRevealed ? (
                    <button
                      type="button"
                      className="is-primary"
                      onClick={isLastCard ? resetPracticeDeck : goToNextCard}
                    >
                      {isLastCard ? <RotateCcw aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
                      {isLastCard ? "重新开始" : "下一张"}
                    </button>
                  ) : (
                    <button type="button" className="is-primary" onClick={() => setAnswerRevealed(true)}>
                      <Eye aria-hidden="true" />
                      显示答案
                    </button>
                  )}
                  <button type="button" onClick={resetPracticeDeck}>
                    <RotateCcw aria-hidden="true" />
                    重新开始
                  </button>
                </div>

                <section className="study-cards-concept" aria-label="概念解释">
                  <div className="study-cards-section-title">
                    <BookOpen aria-hidden="true" />
                    <h3>概念解释</h3>
                  </div>
                  <strong>{result.concept.title}</strong>
                  <p>{compactText(result.concept.explanation, 64)}</p>
                  <details>
                    <summary>看例子</summary>
                    <p>{compactText(result.concept.example, 88)}</p>
                  </details>
                </section>

                <section aria-label="测试题">
                  <div className="study-cards-section-title">
                    <ListChecks aria-hidden="true" />
                    <h3>测试题</h3>
                  </div>
                  <div className="study-cards-quiz-list">
                    {result.quiz.map((item, index) => (
                      <article key={`${item.question}-${index}`} className="study-cards-quiz">
                        <details>
                          <summary>
                            <span>{String(index + 1).padStart(2, "0")}</span>
                            {compactText(item.question, 70)}
                          </summary>
                          <ol>
                            {item.options.map((option) => (
                              <li key={option}>{option}</li>
                            ))}
                          </ol>
                          <p>
                            <strong>答案：</strong>
                            {item.answer}
                          </p>
                          <p>{compactText(item.explanation, 88)}</p>
                        </details>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
