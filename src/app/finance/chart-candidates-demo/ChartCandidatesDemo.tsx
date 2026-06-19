"use client";

import styles from "./ChartCandidatesDemo.module.css";

type Tier = "priority";
type ChartKind = "pareto" | "multiples";

type Candidate = {
  id: string;
  title: string;
  family: string;
  tier: Tier;
  tierLabel: string;
  centerSuggestion: string;
  relation: string;
  modelFit: string;
  interaction: string;
  verdict: string;
  note: string;
  kind: ChartKind;
};

const candidates: Candidate[] = [
  {
    id: "pareto_rank",
    title: "利润缺口 Pareto",
    family: "Comparison & Concentration",
    tier: "priority",
    tierLabel: "优先入库",
    centerSuggestion: "新增 pareto_rank",
    relation: "bar_rank 的集中度增强版，唯一点是累计贡献线。",
    modelFit: "profit-structure、business-analysis、finance-ai-assistant",
    interaction: "悬浮看单项缺口和累计占比；后续可点击条形下钻明细。",
    verdict: "适合进中枢，专门回答 Top 拖累是否已经解释了大部分问题。",
    note: "比普通排名更适合判断先查谁，尤其适合利润拖累、异常损失、预算差异集中度。",
    kind: "pareto",
  },
  {
    id: "small_multiples_trend",
    title: "国家/车型小多图",
    family: "Trend Facets",
    tier: "priority",
    tierLabel: "优先入库",
    centerSuggestion: "新增 small_multiples_trend",
    relation: "trend_chart 的分面版本，唯一点是同尺度多对象扫描。",
    modelFit: "monthly-trend、profit-structure、finance-ai-assistant",
    interaction: "统一月份轴；后续可点某一小图放大或锁定为筛选条件。",
    verdict: "适合进中枢，能替代过度拥挤的多线趋势图。",
    note: "当一个指标要同时看多个国家、车型或业务单元时，小多图比一张多色折线更稳。",
    kind: "multiples",
  },
];

function ParetoChart() {
  const bars = [
    { label: "德国 BEV", value: 16.2, height: 132, color: "#d97757" },
    { label: "英国 PHEV", value: 12.8, height: 104, color: "#d97757" },
    { label: "巴西 SUV", value: 9.7, height: 79, color: "#d97757" },
    { label: "墨西哥 ICE", value: 6.4, height: 52, color: "#cfa24a" },
    { label: "泰国 Pickup", value: 4.9, height: 40, color: "#cfa24a" },
    { label: "其他长尾", value: 4.1, height: 34, color: "#c7c1b7" },
  ];
  const linePoints = "54,174 112,140 170,111 228,93 286,80 344,68";

  return (
    <svg className={styles.chartSvg} viewBox="0 0 400 260" role="img" aria-label="利润缺口 Pareto">
      <g className={styles.gridLines}>
        {[60, 100, 140, 180].map((y) => (
          <line key={y} x1="36" x2="372" y1={y} y2={y} />
        ))}
      </g>
      <g>
        {bars.map((bar, index) => {
          const x = 40 + index * 58;
          const y = 200 - bar.height;
          return (
            <g key={bar.label}>
              <rect x={x} y={y} width="42" height={bar.height} rx="2" fill={bar.color} />
              <text x={x + 21} y={y - 7} textAnchor="middle" className={styles.valueText}>
                {bar.value}
              </text>
              <text x={x + 21} y="222" textAnchor="end" transform={`rotate(-28 ${x + 21} 222)`} className={styles.axisText}>
                {bar.label}
              </text>
            </g>
          );
        })}
      </g>
      <polyline points={linePoints} className={styles.paretoLine} />
      {linePoints.split(" ").map((point) => {
        const [cx, cy] = point.split(",");
        return <circle key={point} cx={cx} cy={cy} r="4" className={styles.paretoDot} />;
      })}
      <text x="48" y="28" className={styles.legendText}>■ 利润缺口</text>
      <text x="150" y="28" className={styles.legendText}>● 累计占比</text>
    </svg>
  );
}

function MiniTrend({ title, values, color }: { title: string; values: number[]; color: string }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((value, index) => `${12 + index * 22},${58 - ((value - min) / span) * 42}`)
    .join(" ");

  return (
    <div className={styles.miniPanel}>
      <div className={styles.miniHeader}>
        <span>{title}</span>
        <strong>{values.at(-1)?.toFixed(1)}</strong>
      </div>
      <svg viewBox="0 0 130 70" className={styles.miniSvg} aria-label={`${title}趋势`}>
        <line x1="10" x2="120" y1="58" y2="58" />
        <polyline points={points} style={{ stroke: color }} />
        <circle cx="122" cy={58 - (((values.at(-1) ?? 0) - min) / span) * 42} r="4" style={{ fill: color }} />
      </svg>
      <div className={styles.miniFooter}>单车边际</div>
    </div>
  );
}

function SmallMultiplesChart() {
  return (
    <div className={styles.multiples}>
      <MiniTrend title="德国｜BEV" values={[2.4, 2.6, 2.8, 2.7, 3.1, 3.4]} color="#315f85" />
      <MiniTrend title="英国｜PHEV" values={[2.2, 2.0, 1.8, 1.9, 2.4, 2.6]} color="#d97757" />
      <MiniTrend title="巴西｜SUV" values={[1.2, 1.4, 1.5, 1.7, 1.9, 2.3]} color="#788c5d" />
      <MiniTrend title="墨西哥｜ICE" values={[2.8, 2.7, 2.6, 2.3, 2.0, 1.8]} color="#c97991" />
      <MiniTrend title="泰国｜Pickup" values={[1.4, 1.3, 1.6, 1.8, 2.1, 2.0]} color="#315f85" />
      <MiniTrend title="中东｜SUV" values={[3.2, 3.4, 3.1, 3.0, 3.3, 3.8]} color="#788c5d" />
    </div>
  );
}

function CandidateVisual({ kind }: { kind: ChartKind }) {
  if (kind === "pareto") return <ParetoChart />;
  return <SmallMultiplesChart />;
}

export default function ChartCandidatesDemo() {
  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Finance Chart Lab</p>
          <h1>财务图表保留候选</h1>
          <p>根据评审先保留两类真正有价值的中枢候选：集中度 Pareto 和多对象小多图趋势。</p>
        </div>
        <dl className={styles.summary}>
          <div><dt>保留候选</dt><dd>2</dd></div>
          <div><dt>暂缓候选</dt><dd>4</dd></div>
          <div><dt>现有中枢</dt><dd>10</dd></div>
        </dl>
      </header>

      <section className={styles.grid} aria-label="候选图表 Demo">
        {candidates.map((candidate) => (
          <article className={styles.card} key={candidate.id}>
            <div className={styles.cardHeader}>
              <div>
                <span className={styles.family}>{candidate.family}</span>
                <h2>{candidate.title}</h2>
              </div>
              <span className={`${styles.tier} ${styles[`tier-${candidate.tier}`]}`}>{candidate.tierLabel}</span>
            </div>

            <div className={styles.visualFrame}>
              <CandidateVisual kind={candidate.kind} />
            </div>

            <div className={styles.contract}>
              <div><span>中枢建议</span><strong>{candidate.centerSuggestion}</strong></div>
              <div><span>对应关系</span><strong>{candidate.relation}</strong></div>
              <div><span>适合模型</span><strong>{candidate.modelFit}</strong></div>
              <div><span>交互模式</span><strong>{candidate.interaction}</strong></div>
            </div>

            <div className={styles.verdict}>
              <strong>{candidate.verdict}</strong>
              <p>{candidate.note}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
