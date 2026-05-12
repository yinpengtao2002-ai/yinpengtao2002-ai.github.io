"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  BarChart3,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Table2,
} from "lucide-react";
import {
  getScenarioModel,
  type ScenarioInput,
  type ScenarioModelSlug,
} from "@/lib/finance/scenarioModels";

interface ScenarioModelToolProps {
  slug: ScenarioModelSlug;
}

export default function ScenarioModelTool({ slug }: ScenarioModelToolProps) {
  const model = getScenarioModel(slug);
  const defaults = useMemo(() => getDefaultValues(model.inputs), [model.inputs]);
  const [values, setValues] = useState<Record<string, number>>(defaults);
  const [activePreset, setActivePreset] = useState(model.scenarioPresets[0]?.label ?? "自定义");
  const result = useMemo(() => model.compute(values), [model, values]);
  const maxBridgeValue = Math.max(...result.bridge.map((item) => Math.abs(item.value)), 1);

  const updateValue = (key: string, value: number) => {
    setActivePreset("自定义");
    setValues((current) => ({ ...current, [key]: value }));
  };

  const applyPreset = (label: string, presetValues: Partial<Record<string, number>>) => {
    setActivePreset(label);
    const nextValues = { ...defaults };
    for (const [key, value] of Object.entries(presetValues)) {
      if (typeof value === "number" && Number.isFinite(value)) {
        nextValues[key] = value;
      }
    }
    setValues(nextValues);
  };

  return (
    <main
      className="scenario-model-page"
      style={{ "--scenario-accent": model.accent } as CSSProperties}
    >
      <aside className="scenario-model-console" aria-label="模型参数控制台">
        <div className="scenario-console-header">
          <span className="scenario-console-kicker">
            <SlidersHorizontal aria-hidden="true" />
            参数工作台
          </span>
          <h2>{model.shortTitle}</h2>
          <p>{model.question}</p>
        </div>

        <div className="scenario-preset-grid" aria-label="情景预设">
          {model.scenarioPresets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={preset.label === activePreset ? "is-active" : undefined}
              aria-pressed={preset.label === activePreset}
              onClick={() => applyPreset(preset.label, preset.values)}
            >
              <strong>{preset.label}</strong>
              <span>{preset.description}</span>
            </button>
          ))}
        </div>

        <div className="scenario-input-list">
          {model.inputs.map((input) => (
            <ScenarioInputControl
              key={input.key}
              input={input}
              value={values[input.key] ?? input.defaultValue}
              onChange={updateValue}
            />
          ))}
        </div>

        <button
          type="button"
          className="scenario-reset-button"
          onClick={() => applyPreset(model.scenarioPresets[0]?.label ?? "示例口径", {})}
        >
          <RotateCcw aria-hidden="true" />
          恢复示例口径
        </button>
      </aside>

      <section className="scenario-model-workspace" aria-live="polite">
        <header className="scenario-model-hero">
          <div>
            <span className="scenario-model-eyebrow">{model.categoryLabel}</span>
            <h1>{model.title}</h1>
            <p>{model.description}</p>
          </div>
          <div className="scenario-model-summary">
            <Sparkles aria-hidden="true" />
            <span>{result.headline}</span>
          </div>
        </header>

        <div className="scenario-operations-ribbon" aria-label="经营判断摘要">
          {result.decisionCards.map((card) => (
            <article key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.note}</p>
            </article>
          ))}
        </div>

        <div className="scenario-metric-grid">
          {result.metrics.map((metric) => (
            <article key={metric.label} className="scenario-metric-card">
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <p>{metric.note}</p>
            </article>
          ))}
        </div>

        <div className="scenario-main-grid">
          <section className="scenario-model-bridge" aria-labelledby="scenario-bridge-title">
            <div className="scenario-panel-heading">
              <BarChart3 aria-hidden="true" />
              <h2 id="scenario-bridge-title">差异拆解</h2>
            </div>
            <div className="scenario-waterfall-chart" aria-label="差异瀑布图">
              {result.bridge.map((item, index) => (
                <div
                  key={`${item.label}-waterfall`}
                  className={item.value >= 0 ? "positive" : "negative"}
                  style={{
                    "--scenario-bar-size": `${Math.max((Math.abs(item.value) / maxBridgeValue) * 100, 8)}%`,
                    "--scenario-bar-index": index,
                  } as CSSProperties}
                >
                  <span>{item.label}</span>
                  <strong>{item.valueLabel}</strong>
                  <i aria-hidden="true" />
                </div>
              ))}
            </div>
            <div className="scenario-bridge-list">
              {result.bridge.map((item) => {
                const width = `${Math.max((Math.abs(item.value) / maxBridgeValue) * 100, 6)}%`;
                return (
                  <div key={item.label} className="scenario-bridge-row">
                    <div className="scenario-bridge-row-head">
                      <span>{item.label}</span>
                      <strong>{item.valueLabel}</strong>
                    </div>
                    <div className="scenario-bridge-track" aria-hidden="true">
                      <span
                        className={item.value >= 0 ? "positive" : "negative"}
                        style={{ width }}
                      />
                    </div>
                    <p>{item.detail}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="scenario-model-table" aria-labelledby="scenario-table-title">
            <div className="scenario-panel-heading">
              <Table2 aria-hidden="true" />
              <h2 id="scenario-table-title">关键口径</h2>
            </div>
            <div className="scenario-result-list">
              {result.rows.map((row) => (
                <div key={row.label} className="scenario-result-row">
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                  <p>{row.detail}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="scenario-analysis-grid">
          <section className="scenario-comparison-table" aria-labelledby="scenario-comparison-title">
            <div className="scenario-panel-heading">
              <Table2 aria-hidden="true" />
              <h2 id="scenario-comparison-title">口径对比</h2>
            </div>
            <table>
              <thead>
                <tr>
                  <th>指标</th>
                  <th>基准</th>
                  <th>当前</th>
                  <th>差异</th>
                </tr>
              </thead>
              <tbody>
                {result.comparisonRows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td>{row.base}</td>
                    <td>{row.current}</td>
                    <td>{row.delta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="scenario-assumption-matrix" aria-labelledby="scenario-assumption-title">
            <div className="scenario-panel-heading">
              <SlidersHorizontal aria-hidden="true" />
              <h2 id="scenario-assumption-title">假设矩阵</h2>
            </div>
            <div className="scenario-assumption-list">
              {result.assumptions.map((row) => (
                <article key={row.driver}>
                  <div>
                    <span>{row.driver}</span>
                    <strong>{row.current}</strong>
                  </div>
                  <div>
                    <span>目标 / 口径</span>
                    <strong>{row.target}</strong>
                  </div>
                  <div>
                    <span>责任线</span>
                    <strong>{row.owner}</strong>
                  </div>
                  <p>{row.note}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="scenario-analysis-grid secondary">
          <section className="scenario-sensitivity-grid" aria-labelledby="scenario-sensitivity-title">
            <div className="scenario-panel-heading">
              <BarChart3 aria-hidden="true" />
              <h2 id="scenario-sensitivity-title">敏感性测试</h2>
            </div>
            <div className="scenario-sensitivity-list">
              {result.sensitivity.map((item) => (
                <article key={item.label}>
                  <span>{item.label}</span>
                  <div>
                    <small>{item.low}</small>
                    <strong>{item.base}</strong>
                    <small>{item.high}</small>
                  </div>
                  <p>{item.note}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="scenario-timeline" aria-labelledby="scenario-timeline-title">
            <div className="scenario-panel-heading">
              <Sparkles aria-hidden="true" />
              <h2 id="scenario-timeline-title">分析路径</h2>
            </div>
            <div className="scenario-timeline-list">
              {result.timeline.map((item) => (
                <article
                  key={item.label}
                  style={{ "--scenario-timeline-size": `${item.intensity}%` } as CSSProperties}
                >
                  <div>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                  <i aria-hidden="true" />
                  <p>{item.note}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <section className="scenario-model-insight" aria-labelledby="scenario-insight-title">
          <div className="scenario-panel-heading">
            <Sparkles aria-hidden="true" />
            <h2 id="scenario-insight-title">汇报判断</h2>
          </div>
          <div className="scenario-insight-list">
            {result.insights.map((insight) => (
              <p key={insight}>
                <ArrowRight aria-hidden="true" />
                {insight}
              </p>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function ScenarioInputControl({
  input,
  value,
  onChange,
}: {
  input: ScenarioInput;
  value: number;
  onChange: (key: string, value: number) => void;
}) {
  return (
    <label className="scenario-input-card">
      <span className="scenario-input-label">
        <span>{input.label}</span>
        <strong>
          {formatInputValue(value)} {input.unit}
        </strong>
      </span>
      <input
        type="range"
        min={input.min}
        max={input.max}
        step={input.step}
        value={value}
        onChange={(event) => onChange(input.key, Number(event.currentTarget.value))}
      />
      <input
        type="number"
        min={input.min}
        max={input.max}
        step={input.step}
        value={value}
        aria-label={input.label}
        onChange={(event) => onChange(input.key, Number(event.currentTarget.value))}
      />
      <small>{input.hint}</small>
    </label>
  );
}

function getDefaultValues(inputs: ScenarioInput[]) {
  return Object.fromEntries(inputs.map((input) => [input.key, input.defaultValue]));
}

function formatInputValue(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: Math.abs(value) < 10 ? 2 : 0,
  }).format(value);
}
