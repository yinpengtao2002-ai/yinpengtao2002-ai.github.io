# 财务模板中枢

这份文档记录财务模型共用上传模板、示例数据和字段顺序的依赖关系。模板逻辑集中在 `src/lib/finance/templates.js`，避免每个模型各自维护一份经营明细表头和示例数据。

## 模板族

| 模板族 | 适用场景 | 维护位置 |
| --- | --- | --- |
| operating-detail | 月份 + 业务维度 + 销量 + 财务指标，适合趋势、质量诊断、BI 探索和 AI 会话分析。 | `src/lib/finance/templates.js` |
| budget-actual | 实际/预算经营明细 + 固定科目，适合预算实际对比。 | `src/app/finance/business-analysis/` |
| unit-attribution | 两期单车归因明细，适合结构效应和费率效应拆解。 | `public/tools/margin-analysis/` |
| profit-sensitivity | 利润敏感性假设行，适合利润情景推演。 | `src/app/finance/sensitivity-analysis/` |

## 模型依赖

| 模型 | 模板族 | 说明 |
| --- | --- | --- |
| monthly-trend | operating-detail | 使用共享经营明细表头和示例数据生成模板。 |
| profit-structure | operating-detail | 使用共享经营明细表头和示例数据做利润质量诊断。 |
| perspective-bi | operating-detail | 使用共享经营明细模板作为 BI 探索入口。 |
| finance-ai-assistant | operating-detail | 上传经营明细后由 AI 规划图表，确定性代码计算结果。 |
| business-analysis | budget-actual | 使用预算和实际双口径数据构建预算对比与利润桥。 |
| margin-analysis | unit-attribution | 使用两期单车明细拆分量、结构和单车影响。 |
| sensitivity-analysis | profit-sensitivity | 使用假设行驱动利润敏感性测算。 |

## 维护规则

- 改经营明细通用表头、示例数据、模板说明时，先改 `src/lib/finance/templates.js`。
- 改模板族和模型映射时，同时更新本文档、`docs/finance-model-inventory.md` 和相关合同测试。
- 模板字段应保持业务可读：月份、维度、销量、净收入、成本、边际等，不暴露内部实现键名。
