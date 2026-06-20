"use client";

import { Calculator, Gauge, ShieldCheck, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import styles from "./Lucas.module.css";

type NumericState = {
  accountCapital: number;
  price: number;
  winProbability: number;
  upside: number;
  downside: number;
  kellyScale: number;
  maxPosition: number;
  riskBudget: number;
};

const defaultState: NumericState = {
  accountCapital: 100000,
  price: 20,
  winProbability: 52,
  upside: 18,
  downside: 8,
  kellyScale: 0.5,
  maxPosition: 20,
  riskBudget: 2,
};

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 0,
  }).format(value);
}

export default function LucasPrivateWorkbench() {
  const [inputs, setInputs] = useState<NumericState>(defaultState);

  const result = useMemo(() => {
    const capital = Math.max(0, inputs.accountCapital);
    const price = Math.max(0.01, inputs.price);
    const p = clampNumber(inputs.winProbability / 100, 0, 1);
    const upside = Math.max(0.01, inputs.upside / 100);
    const downside = Math.max(0.01, inputs.downside / 100);
    const odds = upside / downside;
    const rawKelly = Math.max(0, p - (1 - p) / odds);
    const scaledKelly = rawKelly * inputs.kellyScale;
    const maxPositionValue = capital * clampNumber(inputs.maxPosition / 100, 0, 1);
    const kellyValue = capital * scaledKelly;
    const riskCapValue = (capital * clampNumber(inputs.riskBudget / 100, 0, 1)) / downside;
    const suggestedValue = Math.max(0, Math.min(kellyValue, maxPositionValue, riskCapValue));
    const suggestedShares = Math.floor(suggestedValue / price / 100) * 100;
    const roundedValue = suggestedShares * price;
    const expectedReturn = p * upside - (1 - p) * downside;

    return {
      odds,
      rawKelly,
      scaledKelly,
      suggestedShares,
      roundedValue,
      positionRatio: capital > 0 ? roundedValue / capital : 0,
      maxLoss: roundedValue * downside,
      expectedReturn,
      riskReward: upside / downside,
    };
  }, [inputs]);

  function updateField(field: keyof NumericState, value: number) {
    setInputs((current) => ({ ...current, [field]: value }));
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="lucas-title">
        <div>
          <p className={styles.eyebrow}>Lucas Lab</p>
          <h1 id="lucas-title">股票决策与仓位分析</h1>
        </div>
        <div className={styles.heroBadge}>
          <ShieldCheck aria-hidden="true" />
          <span>Private Route</span>
        </div>
      </section>

      <section className={styles.workspace} aria-label="凯利仓位分析">
        <aside className={styles.controlPanel}>
          <div className={styles.panelTitle}>
            <Calculator aria-hidden="true" />
            <h2>凯利仓位分析</h2>
          </div>

          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span>账户资金</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={inputs.accountCapital}
                onChange={(event) => updateField("accountCapital", Number(event.target.value))}
              />
            </label>
            <label className={styles.field}>
              <span>买入价格</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={inputs.price}
                onChange={(event) => updateField("price", Number(event.target.value))}
              />
            </label>
            <label className={styles.field}>
              <span>胜率</span>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={inputs.winProbability}
                onChange={(event) => updateField("winProbability", Number(event.target.value))}
              />
            </label>
            <label className={styles.field}>
              <span>目标涨幅</span>
              <input
                type="number"
                min="0.1"
                step="0.5"
                value={inputs.upside}
                onChange={(event) => updateField("upside", Number(event.target.value))}
              />
            </label>
            <label className={styles.field}>
              <span>止损跌幅</span>
              <input
                type="number"
                min="0.1"
                step="0.5"
                value={inputs.downside}
                onChange={(event) => updateField("downside", Number(event.target.value))}
              />
            </label>
            <label className={styles.field}>
              <span>最大仓位</span>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={inputs.maxPosition}
                onChange={(event) => updateField("maxPosition", Number(event.target.value))}
              />
            </label>
            <label className={styles.field}>
              <span>单笔风险</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={inputs.riskBudget}
                onChange={(event) => updateField("riskBudget", Number(event.target.value))}
              />
            </label>
            <label className={styles.field}>
              <span>凯利折扣</span>
              <select
                value={inputs.kellyScale}
                onChange={(event) => updateField("kellyScale", Number(event.target.value))}
              >
                <option value={1}>全 Kelly</option>
                <option value={0.5}>半 Kelly</option>
                <option value={0.25}>四分之一 Kelly</option>
              </select>
            </label>
          </div>
        </aside>

        <section className={styles.resultPanel}>
          <div className={styles.metricGrid}>
            <article className={styles.metricCard}>
              <span className={styles.metricIcon}>
                <Gauge aria-hidden="true" />
              </span>
              <p>建议仓位</p>
              <strong>{formatPercent(result.positionRatio)}</strong>
              <small>{formatMoney(result.roundedValue)}</small>
            </article>
            <article className={styles.metricCard}>
              <span className={styles.metricIcon}>
                <Calculator aria-hidden="true" />
              </span>
              <p>建议股数</p>
              <strong>{formatNumber(result.suggestedShares)}</strong>
              <small>按 100 股取整</small>
            </article>
            <article className={styles.metricCard}>
              <span className={styles.metricIcon}>
                <ShieldCheck aria-hidden="true" />
              </span>
              <p>最大亏损</p>
              <strong>{formatMoney(result.maxLoss)}</strong>
              <small>触发止损口径</small>
            </article>
            <article className={styles.metricCard}>
              <span className={styles.metricIcon}>
                <TrendingUp aria-hidden="true" />
              </span>
              <p>期望收益</p>
              <strong>{formatPercent(result.expectedReturn)}</strong>
              <small>盈亏比 {result.riskReward.toFixed(2)}</small>
            </article>
          </div>

          <div className={styles.detailTable}>
            <div>
              <span>原始 Kelly</span>
              <strong>{formatPercent(result.rawKelly)}</strong>
            </div>
            <div>
              <span>折扣后 Kelly</span>
              <strong>{formatPercent(result.scaledKelly)}</strong>
            </div>
            <div>
              <span>赔率</span>
              <strong>{result.odds.toFixed(2)}</strong>
            </div>
            <div>
              <span>风险约束</span>
              <strong>{inputs.riskBudget.toFixed(1)}%</strong>
            </div>
          </div>

          <p className={styles.privateNote}>仅作个人测算，不构成投资建议。</p>
        </section>
      </section>
    </main>
  );
}
