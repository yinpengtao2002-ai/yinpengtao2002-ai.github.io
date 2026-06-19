const OPERATING_DETAIL_HEADERS = [
  "月份",
  "数据口径",
  "大区",
  "国家",
  "品牌",
  "品牌市场",
  "经营模式",
  "业务单元",
  "车型",
  "燃油品类",
  "备注",
  "销量",
  "净收入",
  "成本",
  "边际",
];

const OPERATING_DETAIL_TEMPLATE_NOTE =
  "可直接修改标题行；请保留“月份”和“销量”。“数据口径”用于区分实际、预算、目标或预测；只做趋势或质量诊断时填“实际”即可。“备注”用于记录业务解释，不参与默认下钻。销量列之前的业务字段会按表头自动识别为维度，可新增、删除或改名；销量列之后的数值列会识别为上传指标。模板提供净收入、成本、边际作为示例，也可以替换成任意质量指标。成本等扣减项建议按负数填写。";

const FINANCE_TEMPLATE_FAMILIES = [
  {
    slug: "operating-detail",
    title: "经营明细事实表",
    description: "月份 + 数据口径 + 业务维度 + 销量 + 财务指标，适合预算实际、单车归因、连续趋势、利润质量诊断、BI 探索和 AI 会话分析。",
    modelSlugs: ["business-analysis", "margin-analysis", "monthly-trend", "profit-structure", "perspective-bi", "finance-ai-assistant"],
    defaultSample: "shared-operating-detail",
  },
  {
    slug: "profit-sensitivity-assumptions",
    title: "利润敏感性假设模板",
    description: "以科目假设行表达销量、收入、成本、固定扣减和利润贡献，用于情景推演。",
    modelSlugs: ["sensitivity-analysis"],
    defaultSample: "profit-sensitivity-demo",
  },
];

const OPERATING_DETAIL_MARKETS = [
  ["欧洲", "德国", 1.08],
  ["欧洲", "法国", 0.92],
  ["欧洲", "英国", 0.84],
  ["拉美", "墨西哥", 1.22],
  ["拉美", "巴西", 1.04],
  ["中东", "沙特", 0.72],
  ["亚太", "澳大利亚", 0.68],
  ["亚太", "泰国", 0.88],
];

const OPERATING_DETAIL_BRANDS = [
  {
    brand: "品牌A",
    brandMarket: "主品牌",
    mode: "经销",
    unit: "全球主销",
    variants: [
      ["Atlas", "燃油", 0.94, 12.4, -8.6],
      ["Atlas", "插混", 0.36, 15.8, -11.2],
    ],
  },
  {
    brand: "品牌B",
    brandMarket: "新能源品牌",
    mode: "直营",
    unit: "新能源业务",
    variants: [
      ["Nova", "纯电", 0.44, 17.6, -13.4],
      ["Nova", "插混", 0.28, 15.1, -11.1],
    ],
  },
  {
    brand: "品牌C",
    brandMarket: "高端品牌",
    mode: "大客户",
    unit: "高端 SUV",
    variants: [
      ["Summit", "燃油", 0.22, 21.5, -15.7],
      ["Summit", "纯电", 0.12, 24.8, -20.4],
    ],
  },
  {
    brand: "品牌D",
    brandMarket: "商用品牌",
    mode: "经销",
    unit: "商用车业务",
    variants: [
      ["Cargo", "燃油", 0.31, 10.4, -9.2],
      ["Cargo", "纯电", 0.16, 13.2, -12.1],
    ],
  },
];

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function createBudgetOperatingDetailRow(row, index = 0) {
  const volumeFactor = 0.94 + (index % 5) * 0.018;
  const revenueFactor = 0.96 + (index % 4) * 0.016;
  const costFactor = 0.95 + (index % 3) * 0.022;
  const revenue = round(Number(row["净收入"] || 0) * revenueFactor);
  const cost = round(Number(row["成本"] || 0) * costFactor);
  return {
    ...row,
    "数据口径": "预算",
    "备注": "预算口径，可替换为目标或预测",
    "销量": round(Number(row["销量"] || 0) * volumeFactor),
    "净收入": revenue,
    "成本": cost,
    "边际": round(revenue + cost),
  };
}

function buildMonthKeys(startYear, startMonth, count) {
  return Array.from({ length: count }, (_, index) => {
    const monthIndex = startMonth - 1 + index;
    const year = startYear + Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1;
    return `${year}-${String(month).padStart(2, "0")}`;
  });
}

function createOperatingDetailSampleRows(options = {}) {
  const months = options.months || buildMonthKeys(2025, 1, 18);
  const rows = [];

  months.forEach((month, monthIndex) => {
    OPERATING_DETAIL_MARKETS.forEach(([region, country, countryFactor], countryIndex) => {
      OPERATING_DETAIL_BRANDS.forEach((brandConfig, brandIndex) => {
        brandConfig.variants.forEach(([model, fuel, baseVolume, baseRevenue, baseCost], variantIndex) => {
          const yearLift = month.startsWith("2026") ? 1.08 : 1;
          const channelFactor = brandConfig.mode === "直营" ? 0.94 : brandConfig.mode === "大客户" ? 0.72 : 1;
          const monthOfYear = monthIndex % 12;
          const seasonal = 1 + monthOfYear * 0.022 + (countryIndex % 3) * 0.018 + variantIndex * 0.026;
          const mixShift = 1 + (brandIndex - 1.5) * 0.04 + (countryIndex % 2 ? -0.025 : 0.025);
          const currentYearMarginDrag = month.startsWith("2026") ? 1 + Math.max(0, monthOfYear - 2) * 0.006 : 1;
          const volume = round(baseVolume * countryFactor * channelFactor * seasonal * mixShift * yearLift, 3);
          const revenue = round(volume * baseRevenue * (1 + countryIndex * 0.012 + monthOfYear * 0.006), 3);
          const costDrag = country === "巴西" || country === "沙特" ? 1.08 : country === "德国" ? 0.96 : 1;
          const cost = round(volume * baseCost * costDrag * (1 + variantIndex * 0.018) * currentYearMarginDrag, 3);
          const margin = round(revenue + cost, 3);

          rows.push({
            "月份": month,
            "数据口径": "实际",
            "大区": region,
            "国家": country,
            "品牌": brandConfig.brand,
            "品牌市场": brandConfig.brandMarket,
            "经营模式": brandConfig.mode,
            "业务单元": brandConfig.unit,
            "车型": model,
            "燃油品类": fuel,
            "备注": "",
            "销量": volume,
            "净收入": revenue,
            "成本": cost,
            "边际": margin,
          });
        });
      });
    });
  });

  return rows;
}

function createBudgetOperatingDetailRows(actualRows = []) {
  return actualRows.flatMap((row, index) => {
    const actual = {
      ...row,
      "数据口径": "实际",
      "备注": row["备注"] || "",
    };
    return [actual, createBudgetOperatingDetailRow(actual, index)];
  });
}

function getOperatingDetailTemplateRows(limit = 24) {
  return createOperatingDetailSampleRows().slice(0, limit);
}

function getBudgetOperatingDetailTemplateRows(limit = 24) {
  return createBudgetOperatingDetailRows(getOperatingDetailTemplateRows(limit));
}

function getFinanceTemplateFamilies() {
  return FINANCE_TEMPLATE_FAMILIES.map((family) => ({
    ...family,
    modelSlugs: family.modelSlugs.slice(),
  }));
}

function getFinanceTemplateFamilyForModel(modelSlug) {
  const family = FINANCE_TEMPLATE_FAMILIES.find((item) => item.modelSlugs.includes(modelSlug));
  if (!family) return null;
  return {
    ...family,
    modelSlugs: family.modelSlugs.slice(),
  };
}

module.exports = {
  FINANCE_TEMPLATE_FAMILIES,
  OPERATING_DETAIL_HEADERS,
  OPERATING_DETAIL_TEMPLATE_NOTE,
  buildMonthKeys,
  createBudgetOperatingDetailRows,
  createOperatingDetailSampleRows,
  getFinanceTemplateFamilies,
  getFinanceTemplateFamilyForModel,
  getBudgetOperatingDetailTemplateRows,
  getOperatingDetailTemplateRows,
};
