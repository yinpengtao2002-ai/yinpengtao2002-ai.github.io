# 财务图表中枢

最后核对时间：2026-06-19

这份文档定义财务模型后续要收敛到的中枢系统。目标不是一次性重写所有页面，而是让重复的图表样式、计算口径和同步检查有一个共同来源。每次调整中枢图表、财务算法或模型图表组合，都要同步核对这里和 `docs/finance-model-inventory.md`。

## 中枢边界

计划中的中枢分两层：

- `src/lib/finance/core/`：字段识别、月份识别、数字清洗、筛选聚合、单车指标、PVM 结构/费率效应、FBP 利润链和预算实际差异。
- `src/lib/finance/charts/`：统一 `FinanceChartSpec`、Plotly 主题、图表尺寸、移动端规则、瀑布桥、趋势图、热力图、气泡散点图、横向排名图、Pareto 排名、小多图趋势、系列柱状图和明细表协议。

当前中心化进度：

- `src/lib/finance/charts/types.ts` 已承接 `FinanceChartSpec`、图表类型、明细表 variant/meta、直接图表输入和中心 builder 输入类型。
- `src/lib/finance/charts/index.ts` 已承接 `buildChartSpec`、`buildDirectChartSpec`、Plotly 主题、瀑布桥、趋势图、排名图、Pareto 排名、小多图趋势、热力图、气泡散点和明细表规格。
- `src/lib/finance-ai/charts.ts` 只保留兼容转发，旧 import 不再拥有单独图表实现。
- `src/lib/finance-ai/chart-demo.ts` 的能力展示只维护 `FinanceAIDirectChart` 示例输入，并统一通过 `buildDirectChartSpec` 生成，避免示例页和真实对话图表样式分叉。
- `finance-ai-assistant` 当前已接入 `pareto_rank` 和 `small_multiples_trend`；其它财务模型暂不接入，等各模型的业务场景和交互位确认后再迁移。
- `src/lib/finance-ai/metrics.ts` 仍是待迁移的通用聚合、趋势、排名、期间桥和单车结构/费率效应种子。

## 模型依赖地图

| 模型 slug | 当前主要图表 | 应接入的中枢图表族 | 应接入的中枢算法 |
| --- | --- | --- | --- |
| business-analysis | KPI、维度预算实际瀑布、单车净收入 x 单车边际气泡图、利润变动桥、利润桥 | metric-card、waterfall-bridge、scatter-bubble | FBP 利润链、预算实际差异、维度下钻聚合 |
| margin-analysis | 多层级单车指标归因瀑布、归因明细表 | waterfall-bridge、detail-table | PVM 结构效应、PVM 费率效应、Top N + 其他 |
| finance-ai-assistant | 趋势、横向排名、Pareto 排名、小多图趋势、瀑布桥、分组/堆叠柱、热力图、气泡散点、明细表 | 全部中枢图表族的当前种子 | schema 推断、聚合、趋势、排名、期间桥、PVM |
| monthly-trend | 多指标趋势、同期对比、环比/同比线、结构趋势、同比/环比热力图 | trend-line、series-share、heatmap | 月份识别、跨年月份轴、环比/同比、Top N + 其他 |
| profit-structure | KPI、诊断结论、维度解释力横向条、结构质量气泡图、拖累贡献清单 | metric-card、bar-rank、scatter-bubble、detail-table | 单位质量、维度解释力、拖累贡献、组合粒度聚合 |
| sensitivity-analysis | KPI、Tornado 条形图、目标利润曲线、双变量热力图、边际瀑布、利润瀑布 | metric-card、tornado-bar、target-line、heatmap、waterfall-bridge | FBP 利润链、目标利润倒推、双变量矩阵 |
| perspective-bi | Perspective 原生表格、柱状图、折线图、热力图、散点图 | 不强行替换原生 viewer；只复用字段治理和中枢说明 | 字段角色识别、派生指标建议、上传预检 |

## 中枢改动同步规则

改中枢时先判断影响类型：

- 改 `FinanceChartSpec`、主题、颜色、单位缩放、移动端密度或 Plotly config：同步检查所有使用同一图表族的模型页面、演示页、预览图和图表合同测试；如果图表只接入了 AI 助手，先检查 `finance-ai-assistant`、chart demo 和合同测试，不默认扩散到其它模型。
- 改瀑布桥规则：同步检查 `business-analysis`、`margin-analysis`、`finance-ai-assistant`、`sensitivity-analysis`。
- 改 PVM 结构/费率效应：同步检查 `margin-analysis` 和 `finance-ai-assistant`，并用同一组输入验证两边结果一致。
- 改 FBP 利润链：同步检查 `business-analysis` 和 `sensitivity-analysis`，同时确认零值科目不会生成无意义柱子。
- 改月份、字段识别、数字清洗或上传解析：同步检查 `monthly-trend`、`profit-structure`、`perspective-bi`、`finance-ai-assistant` 和所有上传模板说明。
- 改模型图表组合、交互模式或模板行为：同步更新 `docs/finance-model-inventory.md` 和本文件的模型依赖地图。

## 迁移顺序

1. 已完成：把 `FinanceChartSpec`、图表类型、Plotly 主题和渲染器从 `src/lib/finance-ai/` 提升到 `src/lib/finance/charts/`。
2. 已完成：将 Pareto 排名和小多图趋势加入中枢 direct chart 协议，并先接入财务分析 AI 助手。
3. 下一步：抽出 `waterfall-bridge`，让财务 AI、敏感性、预算实际先共用同一套桥图规格。
4. 抽出 `pvm.ts`，让单车归因和财务 AI 使用同一套结构效应 / 费率效应公式。
5. 抽出热力图、气泡散点、横向排名和 KPI 卡的模型接入规则。
6. 最后整理字段识别、上传解析和模型清单生成逻辑。

## AI 操作要求

后续 AI 修改财务模型时，必须先查本文件的模型依赖地图。若修改命中某个中枢图表族或中枢算法，要同步打开对应模型文件和测试，不能只改当前页面。
