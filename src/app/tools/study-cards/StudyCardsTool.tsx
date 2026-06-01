"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clipboard,
  Layers,
  ListChecks,
  Loader2,
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

function cardToTsv(card: StudyCard) {
  return [card.front, card.back, card.note || ""]
    .map((value) => value.replace(/\t/g, " ").replace(/\n+/g, " ").trim())
    .join("\t");
}

function countChineseText(text: string) {
  return text.replace(/\s/g, "").length;
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
  const [copied, setCopied] = useState("");
  const [progressValue, setProgressValue] = useState(0);

  const contentLength = useMemo(() => countChineseText(content), [content]);
  const ankiTsv = useMemo(() => {
    if (!result) return "";
    return result.cards.map(cardToTsv).join("\n");
  }, [result]);

  const canSubmit = contentLength >= 80 && !loading;
  const progressLabel = getProgressLabel(progressValue);

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

  async function generateCards() {
    if (!canSubmit) {
      setError("请先输入至少 80 个字的学习内容。");
      return;
    }

    setLoading(true);
    setProgressValue(8);
    setError("");
    setCopied("");

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "学习卡片生成失败，请刷新页面后再试。");
    } finally {
      setLoading(false);
    }
  }

  async function copyText(value: string, label: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setCopied("");
      setError("复制失败，可以手动选中内容复制。");
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
            {!result ? (
              <div className="study-cards-empty">
                <Layers aria-hidden="true" />
                <h2>把材料变成可以复习的卡片</h2>
                <p>生成结果会包含 Anki 风格问答卡、核心概念解释、一个理解例子和三道测试题。</p>
              </div>
            ) : (
              <div className="study-cards-result">
                <div className="study-cards-result-head">
                  <div>
                    <p>生成结果</p>
                    <h2>{result.summary}</h2>
                  </div>
                  <button type="button" onClick={() => copyText(ankiTsv, "anki")}>
                    {copied === "anki" ? <CheckCircle2 aria-hidden="true" /> : <Clipboard aria-hidden="true" />}
                    {copied === "anki" ? "已复制" : "复制 Anki TSV"}
                  </button>
                </div>

                <section className="study-cards-concept" aria-label="概念解释">
                  <div className="study-cards-section-title">
                    <BookOpen aria-hidden="true" />
                    <h3>概念解释</h3>
                  </div>
                  <strong>{result.concept.title}</strong>
                  <p>{result.concept.explanation}</p>
                  <p>{result.concept.example}</p>
                </section>

                <section aria-label="Anki 风格问答卡">
                  <div className="study-cards-section-title">
                    <Layers aria-hidden="true" />
                    <h3>Anki 风格问答卡</h3>
                  </div>
                  <div className="study-cards-card-grid">
                    {result.cards.map((card, index) => (
                      <article key={`${card.front}-${index}`} className="study-cards-flash-card">
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <h4>{card.front}</h4>
                        <p>{card.back}</p>
                        {card.note && <small>{card.note}</small>}
                      </article>
                    ))}
                  </div>
                </section>

                <section aria-label="测试题">
                  <div className="study-cards-section-title">
                    <ListChecks aria-hidden="true" />
                    <h3>测试题</h3>
                  </div>
                  <div className="study-cards-quiz-list">
                    {result.quiz.map((item, index) => (
                      <article key={`${item.question}-${index}`} className="study-cards-quiz">
                        <h4>{index + 1}. {item.question}</h4>
                        <ol>
                          {item.options.map((option) => (
                            <li key={option} className={option === item.answer ? "is-answer" : undefined}>
                              {option}
                            </li>
                          ))}
                        </ol>
                        <p>{item.explanation}</p>
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
