// eslint-disable-next-line @typescript-eslint/no-require-imports -- Shared browser-safe template source is CommonJS for static tools and Node tests.
const operatingDetailTemplates = require("../../../public/tools/shared/operating-detail-templates.js");

const FINANCE_TEMPLATE_FAMILIES = [
  {
    slug: "operating-detail",
    title: "经营明细事实表",
    description: "月份 + 业务维度 + 销量 + 财务指标；预算和实际在用户工作簿中使用独立工作表表达。",
    modelSlugs: ["business-analysis", "margin-analysis", "monthly-trend", "profit-structure", "finance-ai-assistant"],
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
  ...operatingDetailTemplates,
  FINANCE_TEMPLATE_FAMILIES,
  getFinanceTemplateFamilies,
  getFinanceTemplateFamilyForModel,
};
