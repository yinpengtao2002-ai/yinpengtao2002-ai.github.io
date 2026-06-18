# 财务交互中枢

最后核对时间：2026-06-18

这份文档记录财务模型里可以复用的交互逻辑。图表已经开始进入 `src/lib/finance/charts/`，筛选、下钻、表格列筛选也要逐步进入统一中枢，避免每个模型重新做一套相似逻辑。

## 当前边界

- `src/lib/finance/filters/`：共享筛选状态逻辑，包括筛选值标准化、搜索、全选/反选/清空、include/exclude 判断、级联筛选修剪。
- `public/tools/margin-analysis/app.js`：单车指标变动归因模型目前保留最成熟的 Excel-style 筛选器交互，是筛选器中枢的行为参考来源。
- `src/app/finance/business-analysis/business-analysis-engine.js`：预算实际对比模型优先接入共享筛选状态逻辑，现有 UI 外壳先保留，减少一次性改动风险。

## 筛选器复用规则

- 新模型不要重新手写筛选值标准化、搜索、反选、include/exclude 判断和级联修剪，先复用 `src/lib/finance/filters/`。
- 静态模型和 Next 模型都可以有自己的 UI 外壳，但筛选状态变化必须尽量走同一套纯函数。
- 如果前一层维度筛选变化，后一层筛选项要按当前数据域修剪；仍然有效的选择可以保留，已经不存在的值必须移除。
- 明细表列筛选后续也要收敛到同一交互中枢，包含文本筛选、数字筛选、排序、复制当前表和导出当前视图。

## 模型依赖地图

| 模型 slug | 当前筛选/下钻交互 | 应接入的中枢能力 |
| --- | --- | --- |
| margin-analysis | 侧边栏维度 Excel-style 筛选、级联筛选、瀑布图下钻、明细表列筛选 | filter-state、cascading-filter、detail-table-filter、drill-path |
| business-analysis | 当前层 Excel-style 筛选、维度路径、瀑布图下钻、侧栏维度顺序 | filter-state、cascading-filter、drill-path |
| monthly-trend | 多维度筛选卡、联动候选项 | filter-state、cascading-filter |
| profit-structure | 维度/组合粒度筛选、诊断下钻 | filter-state、cascading-filter |
| finance-ai-assistant | 明细表列筛选、聊天上下文中的过滤条件 | detail-table-filter、filter-state |
| perspective-bi | 字段角色确认和原生 viewer 筛选 | 只复用字段治理和上传预检，不强行替换 Perspective 原生筛选 |

## 迁移顺序

1. 先抽 `filter-state` 纯函数，供预算实际对比模型使用。
2. 再处理单车指标变动归因模型的静态脚本加载方式，让它也能直接引用同一个中枢。
3. 抽明细表列筛选，把单车归因明细表和财务 AI 明细表的文本/数字筛选统一。
4. 最后抽 `drill-path`，让维度路径、返回上一层、清空筛选和当前层提示统一。

## AI 操作要求

后续 AI 修改任意财务模型筛选器、明细表筛选、维度下钻、筛选菜单样式或上传后的字段治理时，必须先查本文件。若命中共享交互能力，要同步检查依赖地图里的模型和 `docs/finance-model-inventory.md`。
