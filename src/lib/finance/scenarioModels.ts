export type ScenarioModelSlug = "price-volume-mix" | "fx-exposure" | "working-capital";

type ScenarioValues = Record<string, number>;

export interface ScenarioInput {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  hint: string;
}

export interface ScenarioPreset {
  label: string;
  description: string;
  values: Partial<ScenarioValues>;
}

export interface ScenarioMetric {
  label: string;
  value: string;
  note: string;
}

export interface ScenarioBridgeItem {
  label: string;
  value: number;
  valueLabel: string;
  detail: string;
}

export interface ScenarioResultRow {
  label: string;
  value: string;
  detail: string;
}

export interface ScenarioComparisonRow {
  label: string;
  base: string;
  current: string;
  delta: string;
}

export interface ScenarioAssumptionRow {
  driver: string;
  current: string;
  target: string;
  owner: string;
  note: string;
}

export interface ScenarioSensitivityItem {
  label: string;
  low: string;
  base: string;
  high: string;
  note: string;
}

export interface ScenarioTimelineItem {
  label: string;
  value: string;
  note: string;
  intensity: number;
}

export interface ScenarioDecisionCard {
  label: string;
  value: string;
  note: string;
}

export interface ScenarioResult {
  headline: string;
  metrics: ScenarioMetric[];
  bridge: ScenarioBridgeItem[];
  rows: ScenarioResultRow[];
  comparisonRows: ScenarioComparisonRow[];
  assumptions: ScenarioAssumptionRow[];
  sensitivity: ScenarioSensitivityItem[];
  timeline: ScenarioTimelineItem[];
  decisionCards: ScenarioDecisionCard[];
  insights: string[];
}

export interface ScenarioModelDefinition {
  slug: ScenarioModelSlug;
  categoryLabel: string;
  title: string;
  shortTitle: string;
  question: string;
  description: string;
  accent: string;
  inputs: ScenarioInput[];
  scenarioPresets: ScenarioPreset[];
  projectDescription: {
    scenarios: string[];
    inputs: string[];
    outputs: string[];
  };
  compute: (values: ScenarioValues) => ScenarioResult;
}

const millionCny = (value: number) => `${formatNumber(value)} 万元`;
const percent = (value: number) => `${formatNumber(value)}%`;
const rate = (value: number) => formatNumber(value, 2);
const signedMillionCny = (value: number) => `${value >= 0 ? "+" : ""}${millionCny(value)}`;
const signedPercent = (value: number) => `${value >= 0 ? "+" : ""}${percent(value)}`;

function readValue(values: ScenarioValues, key: string, fallback: number) {
  const value = values[key];
  return Number.isFinite(value) ? value : fallback;
}

function formatNumber(value: number, fractionDigits = 1) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: Math.abs(value) < 10 && fractionDigits > 1 ? 2 : 0,
  }).format(value);
}

function clampIntensity(value: number) {
  return Math.max(14, Math.min(100, Math.round(value)));
}

export const scenarioModels: ScenarioModelDefinition[] = [
  {
    slug: "price-volume-mix",
    categoryLabel: "收入桥接",
    title: "价量结构收入桥模型",
    shortTitle: "价量结构桥",
    question: "收入差异从哪来？",
    description: "把收入变化拆成销量、单价和结构组合三类贡献，适合解释预算、预测或实际之间的收入差距。",
    accent: "#6a9bcc",
    scenarioPresets: [
      {
        label: "预算复盘",
        description: "收入超预算，但需要拆清销量、单价和结构的真实贡献。",
        values: {},
      },
      {
        label: "价格压力",
        description: "销量兑现较好，但单车净收入承压，需要量价分开汇报。",
        values: { currentVolume: 4100, currentAsp: 8.9, mixEffect: -1.5 },
      },
      {
        label: "结构升级",
        description: "高单价车型或国家占比上升，单车收入和结构都贡献正向。",
        values: { currentVolume: 3720, currentAsp: 11.1, mixEffect: 5.5 },
      },
    ],
    inputs: [
      {
        key: "baseVolume",
        label: "基准销量",
        unit: "台",
        min: 800,
        max: 8000,
        step: 100,
        defaultValue: 3200,
        hint: "预算或上期销量口径。",
      },
      {
        key: "currentVolume",
        label: "当前销量",
        unit: "台",
        min: 800,
        max: 9000,
        step: 100,
        defaultValue: 3860,
        hint: "实际或滚动预测销量。",
      },
      {
        key: "baseAsp",
        label: "基准单车净收入",
        unit: "万元/台",
        min: 4,
        max: 18,
        step: 0.2,
        defaultValue: 9.6,
        hint: "基准期平均净收入。",
      },
      {
        key: "currentAsp",
        label: "当前单车净收入",
        unit: "万元/台",
        min: 4,
        max: 18,
        step: 0.2,
        defaultValue: 10.4,
        hint: "当前期平均净收入。",
      },
      {
        key: "mixEffect",
        label: "结构组合影响",
        unit: "%",
        min: -12,
        max: 12,
        step: 0.5,
        defaultValue: 2.5,
        hint: "车型、国家或渠道结构带来的额外影响。",
      },
    ],
    projectDescription: {
      scenarios: ["预算收入差异解释", "滚动预测拆桥", "车型或国家结构变化复盘"],
      inputs: ["基准销量与当前销量", "基准单车净收入与当前单车净收入", "结构组合影响百分比"],
      outputs: ["收入差异桥", "销量、价格和结构贡献", "适合汇报的一句话判断"],
    },
    compute(values) {
      const baseVolume = readValue(values, "baseVolume", 3200);
      const currentVolume = readValue(values, "currentVolume", 3860);
      const baseAsp = readValue(values, "baseAsp", 9.6);
      const currentAsp = readValue(values, "currentAsp", 10.4);
      const mixEffect = readValue(values, "mixEffect", 2.5) / 100;

      const baseRevenue = baseVolume * baseAsp;
      const volumeImpact = (currentVolume - baseVolume) * baseAsp;
      const priceImpact = currentVolume * (currentAsp - baseAsp);
      const mixImpact = currentVolume * currentAsp * mixEffect;
      const currentRevenue = currentVolume * currentAsp + mixImpact;
      const totalImpact = currentRevenue - baseRevenue;
      const growthRate = baseRevenue === 0 ? 0 : (totalImpact / baseRevenue) * 100;
      const strongestDriver =
        Math.abs(volumeImpact) >= Math.abs(priceImpact) && Math.abs(volumeImpact) >= Math.abs(mixImpact)
          ? "销量贡献"
          : Math.abs(priceImpact) >= Math.abs(mixImpact)
            ? "价格贡献"
            : "结构贡献";

      return {
        headline: `收入差异 ${millionCny(totalImpact)}，增幅 ${percent(growthRate)}`,
        metrics: [
          { label: "基准收入", value: millionCny(baseRevenue), note: "销量 × 单车净收入" },
          { label: "当前收入", value: millionCny(currentRevenue), note: "含结构组合影响" },
          { label: "收入差异", value: signedMillionCny(totalImpact), note: `较基准 ${signedPercent(growthRate)}` },
        ],
        bridge: [
          { label: "销量贡献", value: volumeImpact, valueLabel: signedMillionCny(volumeImpact), detail: "销量变化按基准单车收入折算。" },
          { label: "价格贡献", value: priceImpact, valueLabel: signedMillionCny(priceImpact), detail: "当前销量口径下的单车净收入变化。" },
          { label: "结构贡献", value: mixImpact, valueLabel: signedMillionCny(mixImpact), detail: "车型、国家或渠道组合带来的额外影响。" },
        ],
        rows: [
          { label: "销量变化", value: `${formatNumber(currentVolume - baseVolume)} 台`, detail: "当前销量 - 基准销量" },
          { label: "单车净收入变化", value: `${formatNumber(currentAsp - baseAsp, 2)} 万元/台`, detail: "当前 ASP - 基准 ASP" },
          { label: "结构组合影响", value: percent(mixEffect * 100), detail: "对当前收入口径的修正" },
        ],
        comparisonRows: [
          { label: "销量", base: `${formatNumber(baseVolume)} 台`, current: `${formatNumber(currentVolume)} 台`, delta: `${formatNumber(currentVolume - baseVolume)} 台` },
          { label: "单车净收入", base: `${formatNumber(baseAsp, 2)} 万元/台`, current: `${formatNumber(currentAsp, 2)} 万元/台`, delta: `${formatNumber(currentAsp - baseAsp, 2)} 万元/台` },
          { label: "收入规模", base: millionCny(baseRevenue), current: millionCny(currentRevenue), delta: signedMillionCny(totalImpact) },
          { label: "结构修正", base: "0%", current: percent(mixEffect * 100), delta: signedMillionCny(mixImpact) },
        ],
        assumptions: [
          { driver: "销量口径", current: `${formatNumber(currentVolume)} 台`, target: `${formatNumber(baseVolume)} 台`, owner: "销售 / 区域", note: "先确认实际销量是否同预算、预测或上期口径一致。" },
          { driver: "单车净收入", current: `${formatNumber(currentAsp, 2)} 万元/台`, target: `${formatNumber(baseAsp, 2)} 万元/台`, owner: "产品 / 定价", note: "拆到车型、渠道和折扣，避免把价格压力误判为销量问题。" },
          { driver: "结构组合", current: percent(mixEffect * 100), target: "0%", owner: "经营分析", note: "用高低单价车型、国家或渠道占比解释结构贡献。" },
        ],
        sensitivity: [
          { label: "销量 +300 台", low: signedMillionCny(-300 * baseAsp), base: "当前口径", high: signedMillionCny(300 * baseAsp), note: "按基准单车净收入折算规模弹性。" },
          { label: "单车净收入 +0.5 万元", low: signedMillionCny(-currentVolume * 0.5), base: "当前口径", high: signedMillionCny(currentVolume * 0.5), note: "价格或折扣变化对收入桥最直接。" },
          { label: "结构 +2 pct", low: signedMillionCny(-currentVolume * currentAsp * 0.02), base: "当前口径", high: signedMillionCny(currentVolume * currentAsp * 0.02), note: "高单价组合占比变化的近似影响。" },
        ],
        timeline: [
          { label: "基准口径", value: millionCny(baseRevenue), note: "预算或上期收入盘子", intensity: 52 },
          { label: "销量兑现", value: signedMillionCny(volumeImpact), note: "先锁规模差异", intensity: clampIntensity(Math.abs(volumeImpact / Math.max(totalImpact, 1)) * 100) },
          { label: "单价复核", value: signedMillionCny(priceImpact), note: "再拆净收入变化", intensity: clampIntensity(Math.abs(priceImpact / Math.max(totalImpact, 1)) * 100) },
          { label: "汇报结论", value: signedMillionCny(totalImpact), note: strongestDriver, intensity: 86 },
        ],
        decisionCards: [
          { label: "主驱动", value: strongestDriver, note: "按绝对金额排序" },
          { label: "汇报重点", value: totalImpact >= 0 ? "解释增量质量" : "解释收入缺口", note: "先给桥，再给动作" },
          { label: "下钻路径", value: "车型 / 国家 / 渠道", note: "回到可执行责任线" },
        ],
        insights: [
          Math.abs(volumeImpact) >= Math.abs(priceImpact)
            ? "当前差异首先要解释销量兑现和区域结构，而不是先讨论单价。"
            : "当前差异首先要解释单车净收入变化，再回到销量规模。",
          mixImpact >= 0
            ? "结构组合正在提供正向贡献，汇报时可以拆到高单价车型或高质量市场。"
            : "结构组合形成拖累，需要下钻到低单价车型、渠道或国家组合。",
        ],
      };
    },
  },
  {
    slug: "fx-exposure",
    categoryLabel: "汇率风险",
    title: "汇率敞口敏感性模型",
    shortTitle: "汇率敞口",
    question: "汇率变动影响多少？",
    description: "把外币收入敞口、预算汇率、实际汇率和锁汇比例放在同一张表里，快速估算汇率对利润的影响。",
    accent: "#788c5d",
    scenarioPresets: [
      {
        label: "月度重估",
        description: "按当前汇率重估预算口径，拆纯汇率影响和锁汇影响。",
        values: {},
      },
      {
        label: "美元走弱",
        description: "实际汇率低于预算，检验未锁敞口的利润压力。",
        values: { actualRate: 6.82, hedgeRatio: 35, hedgeRate: 7.06 },
      },
      {
        label: "高锁汇",
        description: "锁汇比例提高，观察保护效果和机会成本。",
        values: { actualRate: 7.36, hedgeRatio: 75, hedgeRate: 7.14 },
      },
    ],
    inputs: [
      {
        key: "exposure",
        label: "外币收入敞口",
        unit: "万美元",
        min: 200,
        max: 6000,
        step: 100,
        defaultValue: 1800,
        hint: "未折算成人民币的收入或利润敞口。",
      },
      {
        key: "budgetRate",
        label: "预算汇率",
        unit: "CNY/USD",
        min: 6.2,
        max: 8.2,
        step: 0.02,
        defaultValue: 7.05,
        hint: "预算或报价使用的汇率。",
      },
      {
        key: "actualRate",
        label: "实际汇率",
        unit: "CNY/USD",
        min: 6.2,
        max: 8.2,
        step: 0.02,
        defaultValue: 7.28,
        hint: "当前结算或预测汇率。",
      },
      {
        key: "hedgeRatio",
        label: "锁汇比例",
        unit: "%",
        min: 0,
        max: 100,
        step: 5,
        defaultValue: 45,
        hint: "已锁定或自然对冲的敞口比例。",
      },
      {
        key: "hedgeRate",
        label: "锁汇汇率",
        unit: "CNY/USD",
        min: 6.2,
        max: 8.2,
        step: 0.02,
        defaultValue: 7.18,
        hint: "锁汇部分使用的汇率。",
      },
    ],
    projectDescription: {
      scenarios: ["汇率敏感性测算", "锁汇策略复盘", "海外市场报价风险提示"],
      inputs: ["外币敞口", "预算汇率与实际汇率", "锁汇比例与锁汇汇率"],
      outputs: ["预算口径与当前口径差异", "锁汇保护或机会成本", "未锁敞口风险提示"],
    },
    compute(values) {
      const exposure = readValue(values, "exposure", 1800);
      const budgetRate = readValue(values, "budgetRate", 7.05);
      const actualRate = readValue(values, "actualRate", 7.28);
      const hedgeRatio = readValue(values, "hedgeRatio", 45) / 100;
      const hedgeRate = readValue(values, "hedgeRate", 7.18);

      const budgetValue = exposure * budgetRate;
      const unhedgedValue = exposure * (1 - hedgeRatio) * actualRate;
      const hedgedValue = exposure * hedgeRatio * hedgeRate;
      const currentValue = unhedgedValue + hedgedValue;
      const pureFxImpact = exposure * (actualRate - budgetRate);
      const hedgeImpact = exposure * hedgeRatio * (hedgeRate - actualRate);
      const netImpact = currentValue - budgetValue;
      const openExposure = exposure * (1 - hedgeRatio);
      const openRateRisk = openExposure * 0.1;

      return {
        headline: `汇率净影响 ${signedMillionCny(netImpact)}，未锁敞口 ${formatNumber(openExposure)} 万美元`,
        metrics: [
          { label: "预算折算", value: millionCny(budgetValue), note: `预算汇率 ${rate(budgetRate)}` },
          { label: "当前折算", value: millionCny(currentValue), note: `实际汇率 ${rate(actualRate)}` },
          { label: "未锁敞口", value: `${formatNumber(openExposure)} 万美元`, note: `锁汇 ${percent(hedgeRatio * 100)}` },
        ],
        bridge: [
          { label: "纯汇率影响", value: pureFxImpact, valueLabel: signedMillionCny(pureFxImpact), detail: "全部敞口按实际汇率重估。" },
          { label: "锁汇保护", value: hedgeImpact, valueLabel: signedMillionCny(hedgeImpact), detail: "锁汇汇率与实际汇率的差异。" },
          { label: "净影响", value: netImpact, valueLabel: signedMillionCny(netImpact), detail: "当前折算值 - 预算折算值。" },
        ],
        rows: [
          { label: "实际 - 预算汇率", value: rate(actualRate - budgetRate), detail: "正数代表美元升值" },
          { label: "锁汇敞口", value: `${formatNumber(exposure * hedgeRatio)} 万美元`, detail: "锁汇比例 × 总敞口" },
          { label: "未锁敞口", value: `${formatNumber(openExposure)} 万美元`, detail: "仍受现货汇率影响" },
        ],
        comparisonRows: [
          { label: "总敞口", base: `${formatNumber(exposure)} 万美元`, current: `${formatNumber(exposure)} 万美元`, delta: "口径一致" },
          { label: "折算汇率", base: rate(budgetRate), current: rate(actualRate), delta: rate(actualRate - budgetRate) },
          { label: "折算金额", base: millionCny(budgetValue), current: millionCny(currentValue), delta: signedMillionCny(netImpact) },
          { label: "锁汇敞口", base: "0", current: `${formatNumber(exposure * hedgeRatio)} 万美元`, delta: percent(hedgeRatio * 100) },
        ],
        assumptions: [
          { driver: "预算汇率", current: rate(budgetRate), target: "年度预算", owner: "预算 / 财务", note: "用于区分预算假设和实际汇率贡献。" },
          { driver: "实际汇率", current: rate(actualRate), target: "结算 / 预测", owner: "资金 / 业务", note: "月末重估时优先核对汇率来源和结算时点。" },
          { driver: "锁汇策略", current: percent(hedgeRatio * 100), target: rate(hedgeRate), owner: "资金管理", note: "同时看保护效果和机会成本，避免只看净额。" },
        ],
        sensitivity: [
          { label: "现货 +0.10", low: signedMillionCny(-openRateRisk), base: "当前未锁口径", high: signedMillionCny(openRateRisk), note: "只影响未锁敞口。" },
          { label: "锁汇 +10 pct", low: signedMillionCny(exposure * 0.1 * (budgetRate - actualRate)), base: "当前策略", high: signedMillionCny(exposure * 0.1 * (hedgeRate - actualRate)), note: "看新增锁汇在当前汇率下的保护或机会成本。" },
          { label: "敞口 +500 万美元", low: signedMillionCny(500 * (budgetRate - actualRate)), base: "当前汇率", high: signedMillionCny(500 * (actualRate - budgetRate)), note: "新增收入或利润敞口的汇率弹性。" },
        ],
        timeline: [
          { label: "预算定价", value: rate(budgetRate), note: "报价或预算汇率", intensity: 44 },
          { label: "现货重估", value: rate(actualRate), note: signedMillionCny(pureFxImpact), intensity: clampIntensity(Math.abs(pureFxImpact / Math.max(Math.abs(netImpact), 1)) * 72) },
          { label: "锁汇抵消", value: percent(hedgeRatio * 100), note: signedMillionCny(hedgeImpact), intensity: clampIntensity(Math.abs(hedgeImpact / Math.max(Math.abs(netImpact), 1)) * 72) },
          { label: "净敞口", value: `${formatNumber(openExposure)} 万美元`, note: "继续盯未锁风险", intensity: clampIntensity((1 - hedgeRatio) * 100) },
        ],
        decisionCards: [
          { label: "风险口径", value: `${formatNumber(openExposure)} 万美元`, note: "剩余未锁敞口" },
          { label: "策略判断", value: hedgeImpact < 0 ? "有机会成本" : "形成保护", note: "锁汇影响单列" },
          { label: "汇报位置", value: "汇率桥", note: "与经营利润拆开看" },
        ],
        insights: [
          netImpact >= 0
            ? "当前汇率口径对收入或利润有正向影响，但仍要区分经营改善和汇率贡献。"
            : "当前汇率口径形成压力，汇报时需要单独列示汇率桥，避免误判业务单车质量。",
          hedgeImpact < 0
            ? "锁汇部分产生机会成本，下一轮策略应比较锁汇保护与潜在收益让渡。"
            : "锁汇正在提供保护，适合继续跟踪未锁敞口的边际风险。",
        ],
      };
    },
  },
  {
    slug: "working-capital",
    categoryLabel: "现金占用",
    title: "库存周转与现金占用模型",
    shortTitle: "现金占用",
    question: "现金被占在哪里？",
    description: "用库存天数、应收天数和应付天数搭出现金周转链，估算资金占用和可释放空间。",
    accent: "#d97757",
    scenarioPresets: [
      {
        label: "当前复盘",
        description: "看现金转换周期和资金占用，定位库存、应收、应付哪条线最重。",
        values: {},
      },
      {
        label: "库存改善",
        description: "模拟库存天数下降后的现金释放空间。",
        values: { inventoryDays: 42, receivableDays: 40, payableDays: 35 },
      },
      {
        label: "回款压力",
        description: "应收天数拉长，观察资金占用被哪条责任线放大。",
        values: { inventoryDays: 54, receivableDays: 72, payableDays: 30, targetCycle: 52 },
      },
    ],
    inputs: [
      {
        key: "monthlyCogs",
        label: "月均成本消耗",
        unit: "万元",
        min: 1000,
        max: 50000,
        step: 500,
        defaultValue: 16800,
        hint: "近月主营成本或采购消耗。",
      },
      {
        key: "inventoryDays",
        label: "库存天数",
        unit: "天",
        min: 10,
        max: 180,
        step: 2,
        defaultValue: 58,
        hint: "从采购到出库的平均占用天数。",
      },
      {
        key: "receivableDays",
        label: "应收天数",
        unit: "天",
        min: 0,
        max: 180,
        step: 2,
        defaultValue: 42,
        hint: "销售后回款的平均天数。",
      },
      {
        key: "payableDays",
        label: "应付天数",
        unit: "天",
        min: 0,
        max: 180,
        step: 2,
        defaultValue: 35,
        hint: "供应商账期形成的资金缓冲。",
      },
      {
        key: "targetCycle",
        label: "目标现金周期",
        unit: "天",
        min: 10,
        max: 140,
        step: 2,
        defaultValue: 48,
        hint: "管理层希望达到的现金转换周期。",
      },
    ],
    projectDescription: {
      scenarios: ["库存周转专项复盘", "资金占用改善测算", "销售回款和供应链账期联动分析"],
      inputs: ["月均成本消耗", "库存天数、应收天数、应付天数", "目标现金转换周期"],
      outputs: ["现金转换周期", "资金占用规模", "相对目标的释放空间"],
    },
    compute(values) {
      const monthlyCogs = readValue(values, "monthlyCogs", 16800);
      const inventoryDays = readValue(values, "inventoryDays", 58);
      const receivableDays = readValue(values, "receivableDays", 42);
      const payableDays = readValue(values, "payableDays", 35);
      const targetCycle = readValue(values, "targetCycle", 48);

      const cashCycle = inventoryDays + receivableDays - payableDays;
      const dailyCogs = monthlyCogs / 30;
      const capitalUsed = dailyCogs * cashCycle;
      const targetCapital = dailyCogs * targetCycle;
      const releasePotential = capitalUsed - targetCapital;
      const inventoryCapital = dailyCogs * inventoryDays;
      const receivableCapital = dailyCogs * receivableDays;
      const payableBuffer = -dailyCogs * payableDays;
      const mainPressure = inventoryDays >= receivableDays ? "库存周转" : "回款周期";

      return {
        headline: `现金转换周期 ${formatNumber(cashCycle)} 天，可释放空间 ${signedMillionCny(releasePotential)}`,
        metrics: [
          { label: "现金转换周期", value: `${formatNumber(cashCycle)} 天`, note: "库存 + 应收 - 应付" },
          { label: "资金占用", value: millionCny(capitalUsed), note: "月均成本按日折算" },
          { label: "释放空间", value: signedMillionCny(releasePotential), note: `目标 ${formatNumber(targetCycle)} 天` },
        ],
        bridge: [
          { label: "库存占用", value: inventoryCapital, valueLabel: millionCny(inventoryCapital), detail: "库存天数带来的资金占用。" },
          { label: "应收占用", value: receivableCapital, valueLabel: millionCny(receivableCapital), detail: "回款周期形成的资金占用。" },
          { label: "应付缓冲", value: payableBuffer, valueLabel: signedMillionCny(payableBuffer), detail: "供应商账期抵消部分占用。" },
          { label: "释放空间", value: releasePotential, valueLabel: signedMillionCny(releasePotential), detail: "当前占用相对目标口径的差异。" },
        ],
        rows: [
          { label: "库存 + 应收", value: `${formatNumber(inventoryDays + receivableDays)} 天`, detail: "业务端形成的总占用天数" },
          { label: "应付抵消", value: `${formatNumber(payableDays)} 天`, detail: "供应链账期形成的缓冲" },
          { label: "日均成本消耗", value: millionCny(dailyCogs), detail: "月均成本 / 30" },
        ],
        comparisonRows: [
          { label: "现金周期", base: `${formatNumber(targetCycle)} 天`, current: `${formatNumber(cashCycle)} 天`, delta: `${formatNumber(cashCycle - targetCycle)} 天` },
          { label: "资金占用", base: millionCny(targetCapital), current: millionCny(capitalUsed), delta: signedMillionCny(releasePotential) },
          { label: "库存责任线", base: "目标待拆", current: `${formatNumber(inventoryDays)} 天`, delta: millionCny(inventoryCapital) },
          { label: "应收责任线", base: "目标待拆", current: `${formatNumber(receivableDays)} 天`, delta: millionCny(receivableCapital) },
        ],
        assumptions: [
          { driver: "库存天数", current: `${formatNumber(inventoryDays)} 天`, target: "按库龄拆", owner: "供应链 / 销售", note: "库存压力要进一步拆备货、滞销车型和在途。" },
          { driver: "应收天数", current: `${formatNumber(receivableDays)} 天`, target: "按客户拆", owner: "销售 / 信控", note: "回款周期拉长时优先看逾期和账期结构。" },
          { driver: "应付天数", current: `${formatNumber(payableDays)} 天`, target: "供应稳定", owner: "采购 / 财务", note: "账期缓冲不能以破坏供应安全为代价。" },
        ],
        sensitivity: [
          { label: "库存 -7 天", low: signedMillionCny(-dailyCogs * 7), base: "当前口径", high: signedMillionCny(dailyCogs * 7), note: "库存改善直接释放资金占用。" },
          { label: "应收 -7 天", low: signedMillionCny(-dailyCogs * 7), base: "当前口径", high: signedMillionCny(dailyCogs * 7), note: "回款改善与库存改善同等口径折算。" },
          { label: "应付 +7 天", low: signedMillionCny(-dailyCogs * 7), base: "当前口径", high: signedMillionCny(dailyCogs * 7), note: "供应链账期增加形成缓冲，但需要约束风险。" },
        ],
        timeline: [
          { label: "采购入库", value: `${formatNumber(inventoryDays)} 天`, note: millionCny(inventoryCapital), intensity: clampIntensity(inventoryDays / 1.8) },
          { label: "销售回款", value: `${formatNumber(receivableDays)} 天`, note: millionCny(receivableCapital), intensity: clampIntensity(receivableDays / 1.8) },
          { label: "供应账期", value: `${formatNumber(payableDays)} 天`, note: signedMillionCny(payableBuffer), intensity: clampIntensity(payableDays / 1.8) },
          { label: "现金周期", value: `${formatNumber(cashCycle)} 天`, note: signedMillionCny(releasePotential), intensity: clampIntensity(cashCycle / 1.4) },
        ],
        decisionCards: [
          { label: "主要压力", value: mainPressure, note: "按天数口径判断" },
          { label: "释放空间", value: signedMillionCny(releasePotential), note: `目标 ${formatNumber(targetCycle)} 天` },
          { label: "责任线", value: "库存 / 应收 / 应付", note: "分别给动作" },
        ],
        insights: [
          inventoryDays >= receivableDays
            ? "现金压力主要来自库存周转，优先看备货节奏、库龄和滞销车型。"
            : "现金压力主要来自回款周期，优先看客户账期、逾期和区域回款动作。",
          releasePotential > 0
            ? "当前周期高于目标，适合把释放空间拆到库存、应收和应付三条责任线。"
            : "当前周期已经优于目标，下一步重点是保持周转质量，不要牺牲供应稳定性。",
        ],
      };
    },
  },
];

export function getScenarioModel(slug: ScenarioModelSlug) {
  return scenarioModels.find((model) => model.slug === slug) ?? scenarioModels[0];
}
