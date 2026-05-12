"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Bot, ChartSpline, NotebookTabs, Share2 } from "lucide-react";

const WORKFLOW_STEPS = [
  {
    title: "业务问题",
    label: "Question",
    copy: "先把经营问题写成可以计算的口径，而不是停在一句模糊判断。",
    signal: "收入超预算 10,622 万，利润只改善 2,180 万",
    resultLabel: "问题口径",
    result: "收入 / 利润脱钩",
    resultNote: "锁定收入桥、汇率和固定扣减三条线",
    appView: "经营追问",
    appMetric: "3 条解释路径",
    brief: "先不要直接给结论，先把收入、汇率和费用口径放到同一张复盘图里。",
    handoff: "形成分析任务",
    share: "让同一个问题进入同一套口径",
    codeWidths: ["74%", "58%", "88%"],
    bars: [46, 72, 58, 84],
  },
  {
    title: "模型单元",
    label: "Notebook",
    copy: "把销量、收入、边际、汇率、现金占用拆进同一套可复核的计算链。",
    signal: "销量贡献高，单车净收入和汇率在抵消利润",
    resultLabel: "收入桥",
    result: "+10,622 万",
    resultNote: "销量贡献高于价格贡献",
    appView: "计算链路",
    appMetric: "7 个驱动项",
    brief: "模型先把总差异拆成销量、价格、结构和汇率，再判断哪一项值得进入汇报。",
    handoff: "复核模型口径",
    share: "保留每个判断背后的计算过程",
    codeWidths: ["82%", "68%", "76%"],
    bars: [38, 84, 62, 54],
  },
  {
    title: "应用视图",
    label: "Data App",
    copy: "把分析过程发布成可点击的模型，让不同问题进入不同工作台。",
    signal: "欧洲、车型、渠道可以各自下钻，不只看总数",
    resultLabel: "应用视图",
    result: "4 个入口",
    resultNote: "预算、单车、趋势和利润模拟",
    appView: "可交互模型",
    appMetric: "按问题进入",
    brief: "把 Notebook 的过程变成可点击的工作台，其他人可以沿着同一条路径复盘。",
    handoff: "打开数据应用",
    share: "把分析过程变成可以使用的入口",
    codeWidths: ["64%", "88%", "72%"],
    bars: [52, 66, 88, 70],
  },
  {
    title: "AI 判断",
    label: "AI Brief",
    copy: "把图表结论整理成汇报语言，并保留回到模型继续追问的路径。",
    signal: "AI 只负责整理判断，不替代模型口径",
    resultLabel: "汇报判断",
    result: "优先拆汇率",
    resultNote: "再确认结构组合和固定扣减",
    appView: "结论草稿",
    appMetric: "可回溯",
    brief: "利润没有同步改善，优先拆结构组合和汇率口径，再回到固定扣减项确认真实经营质量。",
    handoff: "形成汇报判断",
    share: "让结论、图表和模型保持同一份上下文",
    codeWidths: ["70%", "78%", "62%"],
    bars: [44, 58, 76, 92],
  },
];

const WORKFLOW_CONTEXTS = [
  "业务问题",
  "模型口径",
  "应用视图",
  "汇报判断",
];

const WORKFLOW_EASE = [0.22, 1, 0.36, 1] as const;

export default function HomeWorkflowSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeStep = WORKFLOW_STEPS[activeIndex] ?? WORKFLOW_STEPS[0];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % WORKFLOW_STEPS.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section id="workflow" className="home-viewport home-section home-workflow-section" aria-labelledby="workflow-title">
      <div className="home-shell home-workflow-shell">
        <motion.div
          className="home-workflow-copy"
          initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.58, ease: WORKFLOW_EASE }}
        >
          <span className="home-workflow-kicker">Workspace Narrative</span>
          <h2 id="workflow-title">经营分析工作台</h2>
          <p>
            把一个业务问题带进工作台：先建模，再做成可使用的应用，最后让 AI 帮忙把图表变成可以汇报的判断。
          </p>
          <div className="home-workflow-context-strip" aria-label="工作台上下文">
            {WORKFLOW_CONTEXTS.map((context) => (
              <span key={context}>{context}</span>
            ))}
          </div>

          <div className="home-workflow-step-list" aria-label="经营分析工作流">
            {WORKFLOW_STEPS.map((step, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={step.title}
                  type="button"
                  className={`home-workflow-step${isActive ? " is-active" : ""}`}
                  aria-pressed={isActive}
                  onMouseEnter={() => setActiveIndex(index)}
                  onFocus={() => setActiveIndex(index)}
                  onClick={() => setActiveIndex(index)}
                >
                  <span>{step.label}</span>
                  <strong>{step.title}</strong>
                  <em>{step.copy}</em>
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          className="home-workflow-scene"
          initial={{ opacity: 0, y: 26, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.32 }}
          transition={{ duration: 0.7, delay: 0.08, ease: WORKFLOW_EASE }}
        >
          <div className="home-workflow-scene-header">
            <div>
              <span>Analysis Workspace</span>
              <strong>收入 - 利润复盘</strong>
            </div>
            <p>
              <i aria-hidden="true" />
              Live context
            </p>
          </div>

          <div className="home-workflow-dock" aria-label="工作台视图切换">
            {WORKFLOW_STEPS.map((step, index) => (
              <button
                key={`dock-${step.title}`}
                type="button"
                className={index === activeIndex ? "is-active" : undefined}
                aria-pressed={index === activeIndex}
                onClick={() => setActiveIndex(index)}
              >
                {step.label}
              </button>
            ))}
          </div>

          <div className="home-workflow-question">
            <span>{activeStep.label}</span>
            <strong>为什么欧洲区收入超预算，但利润没有同步改善？</strong>
            <em>{activeStep.signal}</em>
          </div>

          <div className="home-workflow-board home-workflow-layer-stack">
            <motion.div
              layoutId="workflow-notebook"
              className="home-workflow-notebook home-workflow-depth-card"
              transition={{ duration: 0.38, ease: WORKFLOW_EASE }}
            >
              <div className="home-workflow-panel-head">
                <NotebookTabs aria-hidden="true" />
                <span>Notebook</span>
              </div>
              <div className="home-workflow-code-lines" aria-hidden="true" key={`code-${activeStep.title}`}>
                {activeStep.codeWidths.map((width, index) => (
                  <span key={`${width}-${index}`} style={{ width }} />
                ))}
              </div>
              <div className="home-workflow-cell-result" key={`result-${activeStep.title}`}>
                <span>{activeStep.resultLabel}</span>
                <strong>{activeStep.result}</strong>
                <small>{activeStep.resultNote}</small>
              </div>
            </motion.div>

            <motion.div
              layoutId="workflow-data-app"
              className="home-workflow-app-card home-workflow-depth-card"
              transition={{ duration: 0.38, ease: WORKFLOW_EASE }}
            >
              <div className="home-workflow-panel-head">
                <ChartSpline aria-hidden="true" />
                <span>Data App</span>
              </div>
              <div className="home-workflow-bars" aria-label="模型输出图表" key={`bars-${activeStep.title}`}>
                {activeStep.bars.map((height, index) => (
                  <span key={`${height}-${index}`} style={{ height: `${height}%` }} />
                ))}
              </div>
              <div className="home-workflow-app-meta">
                <span>{activeStep.appView}</span>
                <strong>{activeStep.appMetric}</strong>
              </div>
              <div className="home-workflow-pills">
                <span>价量结构</span>
                <span>汇率敞口</span>
                <span>现金占用</span>
              </div>
            </motion.div>

            <motion.div
              layoutId="workflow-ai-brief"
              className="home-workflow-ai-card home-workflow-depth-card"
              transition={{ duration: 0.38, ease: WORKFLOW_EASE }}
            >
              <div className="home-workflow-panel-head">
                <Bot aria-hidden="true" />
                <span>AI Brief</span>
              </div>
              <p>
                {activeStep.brief}
              </p>
              <div className="home-workflow-ai-action">
                {activeStep.handoff} <ArrowRight aria-hidden="true" />
              </div>
            </motion.div>

            <div className="home-workflow-cursor" aria-hidden="true">
              click to switch
            </div>
          </div>

          <div className="home-workflow-share">
            <Share2 aria-hidden="true" />
            <span>Shareable context</span>
            <strong>{activeStep.share}</strong>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
