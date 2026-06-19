# 财务模型清单

最后核对时间：2026-06-19

这份文档用于记录当前财务模型库里的模型入口、源码位置、已设计的可视化图表和交互模式。只要财务模型内容发生实质变化，都要同步更新这份文档，包括新增、删除、重命名、迁移模型，增加或移除图表，调整交互方式，调整内测门禁，调整上传模板，或修改模型库元数据。

主要源码入口：

- `src/lib/finance/model-registry.json`：财务模型库卡片、标题、摘要、路由和状态。
- `src/app/finance/page.tsx`：财务模型目录页。
- `src/app/finance/*`：各个财务模型的路由页面。
- `public/tools/margin-analysis/*`：单车指标变动归因模型的静态工具文件，由 `/finance/margin-analysis` 路由通过 iframe 加载。
- `src/app/tools/finance-ai-assistant/*` 和 `src/lib/finance-ai/*`：财务分析 AI 助手的共享实现。
- `src/lib/finance/charts/*`：财务模型共用图表协议、Plotly 主题、图表 builder 和明细表 spec。
- `src/lib/finance/filters/*`：财务模型共用筛选状态、搜索、include/exclude 判断和级联筛选修剪。
- `src/lib/finance/templates.js`：财务模型共用模板族登记、经营明细通用表头和共享示例数据生成器。
- `docs/finance-chart-system.md`：财务图表中枢、共享算法边界和模型依赖地图；改图表中枢或共享计算口径时要先核对这里。
- `docs/finance-interaction-system.md`：财务交互中枢、筛选器/下钻/明细表筛选依赖地图；改筛选和下钻交互时要先核对这里。
- `docs/finance-template-system.md`：财务模板中枢、上传模板和示例数据依赖地图；改模板族、示例数据或默认加载数据时要先核对这里。

同步要求：

- 改单个模型的图表、交互、上传模板或说明时，更新本文件。
- 改中枢图表、Plotly 主题、`FinanceChartSpec`、PVM、FBP 利润链、字段识别或上传解析时，同时更新 `docs/finance-chart-system.md`，并检查依赖地图里受影响的模型。
- 改中枢筛选、级联筛选、维度下钻、明细表列筛选或字段治理时，同时更新 `docs/finance-interaction-system.md`，并检查依赖地图里受影响的模型。
- 改中枢模板族、经营明细通用表头、示例数据或默认加载数据时，同时更新 `docs/finance-template-system.md`，并检查同模板族模型。

## 当前财务模型目录

当前 `/finance` 模型库共有 7 个入口：

| 模型 | 路由 | 主要源码 | 状态 |
| --- | --- | --- | --- |
| 预算实际对比模型 | `/finance/business-analysis` | `src/app/finance/business-analysis/` | 已上线 |
| 单车指标变动归因模型 | `/finance/margin-analysis` | `src/app/finance/margin-analysis/page.tsx` + `public/tools/margin-analysis/` | 已上线 |
| 财务分析 AI 助手 | `/finance/finance-ai-assistant` | `src/app/finance/finance-ai-assistant/page.tsx` + `src/app/tools/finance-ai-assistant/` | 公测中 |
| 分月指标趋势分析模型 | `/finance/monthly-trend` | `src/app/finance/monthly-trend/` | 已上线 |
| 多维利润质量诊断模型 | `/finance/profit-structure` | `src/app/finance/profit-structure/` | 测试中 |
| 利润敏感性分析 | `/finance/sensitivity-analysis` | `src/app/finance/sensitivity-analysis/` | 已上线 |
| Perspective BI 分析台 | `/finance/perspective-bi` | `src/app/finance/perspective-bi/` | 测试中 |

## 模型明细

### 预算实际对比模型

- 源码：`src/app/finance/business-analysis/BusinessAnalysisTool.tsx`、`src/app/finance/business-analysis/business-analysis-engine.js`、`src/app/finance/business-analysis/tool.css`
- 路由：`/finance/business-analysis`
- 用途：对比实际与预算下的销量、净收入、边际、固定扣减、利润贡献和利润总额，定位预算差异来源。

已设计图表：

- KPI 指标卡。
- 维度经营实绩瀑布图：从预算边际总额桥接到实际边际总额。
- 单车净收入 x 单车边际气泡散点图：横轴为单车净收入，纵轴为单车边际，气泡大小代表销量；悬停显示实际/预算销量、单车净收入和单车边际。
- 利润变动桥：从预算利润出发，按销量影响、单车净收入影响、单车材料成本影响、单车变动制造费用影响、单车变动销售费用影响和固定科目影响桥接到实际利润；维度筛选后固定科目不分摊，仅桥接预算边际到实际边际。
- 利润桥：从实际净收入出发，扣减成本和固定科目后得到实际利润。

交互模式：

- 左侧控制台 + 右侧滚动分析画布。
- 上传经营明细 CSV/XLS/XLSX，并在页面内维护边际以下固定科目和利润贡献科目。
- 支持示例数据和 CSV/XLSX 模板下载。
- 左侧将「下钻顺序」和「维度钻取」拆成两个轻量控制块；拖动维度胶囊调整下钻顺序。
- 维度经营实绩正文操作台只保留路径、当前层筛选、指标提示、退一层和清空下钻，避免重复的排序入口。
- 选择当前维度成员，点击瀑布柱下钻，用「退一层」返回上级。
- 当前层筛选的值清洗、搜索、反选、筛选命中和级联修剪复用 `src/lib/finance/filters/`。
- 桌面端瀑布图支持悬停查看实际、预算、差异，并点击下钻。
- 移动端瀑布图支持点击柱子进入明细层，并通过触控返回卡回到图表。
- 支持重置筛选和导出摘要。

### 单车指标变动归因模型

- 源码：`src/app/finance/margin-analysis/page.tsx`、`public/tools/margin-analysis/index.html`、`public/tools/margin-analysis/app.js`、`public/tools/margin-analysis/styles.css`
- 路由：`/finance/margin-analysis`
- 用途：比较两期单车指标变化，并拆解为结构效应和费率效应。

已设计图表：

- 每个启用下钻层级都会动态生成一张归因瀑布图。
- 瀑布图展示基期单车指标、各维度成员总贡献、可选「其他」项和当期单车指标。
- 每个层级配套一张可折叠明细表，包含基期/当期销量、基期/当期占比、基期/当期单车指标、结构效应、费率效应和总贡献。

交互模式：

- 静态工具通过 `public/tools/margin-analysis/index.html` iframe 加载。
- 支持上传 CSV/XLS/XLSX 或加载示例数据。
- 支持 CSV/XLSX 示例格式下载。
- 选择基期和当期。
- 选择单位名称、指标类型、分析指标和归因模式。
- 拖动维度卡片调整或移除下钻层级。
- 桌面端拖动绿色「基准」条切换影响基准；移动端点击路径卡片切换影响基准。
- 维度筛选使用类似 Excel 的多选筛选器。
- 维度 Excel-style 筛选器是 `docs/finance-interaction-system.md` 的当前行为参考源。
- 瀑布图支持悬停卡片、点击/触控下钻、触控明细卡和空白处关闭。
- 图表交互说明位于底部折叠区，和归因口径、模式说明并列。
- 明细表支持列筛选、排序、复制当前表格和导出当前表格。

### 财务分析 AI 助手

- 源码：`src/app/finance/finance-ai-assistant/page.tsx`、`src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx`、`src/lib/finance-ai/*`
- 路由：`/finance/finance-ai-assistant`
- 只读示例：`/finance/finance-ai-assistant/demo`
- 状态：公测中
- 用途：上传经营明细底稿后，通过连续聊天提出财务问题，并在回复中生成图表和可核对明细。

已设计图表：

- 趋势图。
- 横向排名图。
- Pareto 排名图：按维度排序并叠加累计占比，用于集中度、二八和主要贡献判断。
- 小多图趋势：按同一指标和同一尺度拆成多个维度成员趋势面板，用于替代拥挤的多线趋势图。
- 瀑布桥：支持两个期间之间的变化桥，也支持同一期间实际、预算、目标、预测等数据口径之间的差异桥；单车指标按结构效应和费率效应拆解。
- 分组柱状图：支持环比上期 / 本期对比，也支持实际、预算、目标等数据口径并列对比。
- 堆叠柱状图。
- 百分比堆叠柱状图。
- 热力图。
- 气泡散点图。
- 明细表：支持排名表、对比表、预算实际表、归因明细、异常清单和通用明细等业务类型。

交互模式：

- 公开访问，进入页面后可直接上传 CSV/XLS/XLSX；助手上传界面提供只读示例入口，示例页只展示模拟对话和图表，不支持追问、编辑、上传或模型调用。
- 上传前仅保留上传、下载示例格式和查看只读示例三个入口；模拟对话只在只读示例页展示。
- 上传数据只保存在当前浏览器页面会话中，刷新后清空。
- 用户在聊天输入框中直接用自然语言提问。
- AI 先生成可执行分析计划，前端再基于上传数据做确定性聚合和计算，最后由 AI 解读计算结果。
- 当前新增的 Pareto 排名图和小多图趋势只接入财务分析 AI 助手；其它财务模型的接入待定，后续按各模型业务场景单独确认。
- 用户没有明确期间的当前值、是否销售、排名、明细和普通图表问题，会默认使用底稿最新期间；例如“泰国有没有卖 S56EV，单车是多少”不应因未写月份而被拒绝。
- 当 AI 计划缺少可推断的期间或主维度时，系统会先补最新期间和默认业务维度；仍无法执行时，助手以业务口径追问用户补充指标、期间或拆分维度，不向用户暴露内部计划校验错误。
- 用户直接说出底稿里的维度成员时，例如“泰国”“S56EV”或“右舵”，执行前会用完整底稿做唯一匹配并补成筛选条件；如果同一个词可能属于多个维度，则追问用户到底指哪个维度。
- 生成的图表卡片会内嵌在助手回复中。
- 瀑布桥和结构占比图默认不额外塞大表；图形元素的悬浮明细会展示基期 / 本期销量、占比、单车或分子分母等复核字段，用户明确要求全量明细时再使用明细表。
- 单车指标构成、原因或变化来源类问题可以在同一轮回复中组合多张互补图，例如单车指标瀑布桥 + 销量分组柱状图 + 净收入分组柱状图；瀑布桥的中间贡献项应优先下钻到国家、车型等底稿维度成员，而不是停留在抽象原因词。
- 明细表支持类似 Excel 的表头筛选器；文本列可多选值，数字列可叠加大于、小于、介于等条件筛选，并在表格上保留轻量业务类型标识。
- 对话状态会保留近期问题、助手回复、图表历史和分析上下文；其中分析上下文会记录指标、期间、预算 / 实际等口径、对比方式、筛选和焦点成员，用于支持连续追问。
- 重置按钮会清空当前底稿和对话状态。

### 分月指标趋势分析模型

- 源码：`src/app/finance/monthly-trend/MonthlyTrendTool.tsx`、`src/app/finance/monthly-trend/monthly-trend-engine.js`、`src/app/finance/monthly-trend/tool.css`
- 路由：`/finance/monthly-trend`
- 用途：分析连续月份明细数据，观察趋势、环比、同比、同期对比、结构占比和热力图。

已设计图表：

- 多指标月度趋势：折线/散点趋势图。销量按原值展示，其他总额指标可自动折算为单车趋势。
- 同期月度对比：当前年度与上年同月对比折线图。
- 环比 / 同比变化：环比和同比变化率折线图。
- 结构趋势：维度占比趋势图，展示 Top 分类和可选「其他」项。
- 同比热力图：维度 x 月份的同比变化热力图。
- 环比热力图：维度 x 月份的环比变化热力图。

交互模式：

- 左侧控制台 + 右侧分析画布。
- 上传 CSV/XLS/XLSX 分月明细数据。
- 支持 CSV/XLSX 模板下载；模板族为 `operating-detail`，表头和示例数据来自 `src/lib/finance/templates.js`。
- 选择关注指标。
- 引擎会自动识别月份列、指标列和维度列。
- 根据识别出的维度生成下钻路径和上级筛选控件。
- 支持在控制台重置筛选。
- 图表锁定 Plotly 缩放和工具栏，主要通过指标选择和维度筛选完成业务交互。
- 移动端使用折叠式浮层控制台。

### 多维利润质量诊断模型

- 源码：`src/app/finance/profit-structure/ProfitStructureTool.tsx`、`src/app/finance/profit-structure/profit-structure-engine.js`、`src/app/finance/profit-structure/tool.css`
- 路由：`/finance/profit-structure`
- 状态：测试中
- 用途：上传一张经营明细底表后，按用户选择的质量指标和诊断粒度判断先看哪个维度，并定位拖累整体利润质量的组合。

已设计图表：

- KPI 指标卡。
- 诊断结论卡：展示优先下钻维度、整体单位质量和最大拖累组合。
- 维度解释力图：按单位质量差异和负向拖累判断哪个维度最值得优先下钻。
- 结构质量地图：横轴为销量占比，纵轴为质量指标的单位值相对整体的差异，气泡大小代表销量。
- 拖累贡献清单：按 `销量 x 单位质量差` 排出最拉低整体质量的组合。

交互模式：

- 通过共享财务内测访问接口进行密钥校验。
- 支持上传 CSV/XLS/XLSX 经营明细、加载示例数据、下载 CSV/XLSX 模板；模板族为 `operating-detail`，表头和示例数据来自 `src/lib/finance/templates.js`。
- 支持选择最多五个诊断维度作为组合粒度。
- 支持选择质量指标、参考指标和期间范围。
- 支持自动生成维度筛选器并重置筛选。
- 解锁后数据只保存在当前页面会话中。
- 移动端沿用折叠式控制台模式。

### 利润敏感性分析

- 源码：`src/app/finance/sensitivity-analysis/SensitivityTool.tsx`、`src/app/finance/sensitivity-analysis/sensitivity-engine.js`、`src/app/finance/sensitivity-analysis/tool.css`
- 路由：`/finance/sensitivity-analysis`
- 用途：调整销量、单车收入、成本、固定扣减、税费和利润贡献假设，观察利润敏感程度。

已设计图表：

- KPI 指标卡。
- 波动 10% 对利润的影响：Tornado 风格条形图。
- 目标利润分析：目标利润曲线图。
- 双变量影响矩阵：热力图矩阵。
- 边际瀑布图：从净收入扣减变动成本得到边际。
- 利润瀑布图：从边际扣减固定项和税费，并叠加利润贡献项得到利润总额。

交互模式：

- 支持上传 CSV/XLS/XLSX 假设表、加载示例数据、下载 CSV/XLSX 模板。
- 选择关注指标和显示单位。
- 输入目标利润。
- 选择双变量分析的横轴变量、纵轴变量和矩阵步数。
- 在生成的百分比控件里调整关键变量。
- 支持重置为默认假设。
- 图表锁定 Plotly 缩放和工具栏，用户主要通过假设调整、指标选择和矩阵变量切换完成交互。

### Perspective BI 分析台

- 源码：`src/app/finance/perspective-bi/PerspectiveBITool.tsx`、`src/app/finance/perspective-bi/perspective-bi-engine.js`、`src/app/finance/perspective-bi/tool.css`
- 路由：`/finance/perspective-bi`
- 状态：测试中
- 用途：在进入更专门的财务模型之前，先用 Perspective 原生工作台对 CSV/XLS/XLSX 明细进行自由探索。

已设计图表：

- Perspective 原生数据表。
- 柱状图。
- 折线图。
- 热力图。
- 散点图。
- 已本地化的 Perspective 插件名称还包括矩形树图、旭日图、面积图、OHLC 和蜡烛图等，具体可用范围以原生 viewer 实际支持为准。

交互模式：

- 通过共享财务内测访问接口进行密钥校验。
- 支持上传 CSV/XLS/XLSX 和下载 CSV/XLSX 模板；模板族为 `operating-detail`，表头和示例数据来自 `src/lib/finance/templates.js`。
- 默认示例数据和分月趋势、利润质量诊断共用同一套经营明细，便于在不同模型之间保持字段和业务样本一致。
- 上传后进入字段治理：按时间维度、业务维度、金额指标三类展示识别依据，并支持一键采用系统建议、单位/比率设平均、金额/规模设求和。
- 支持用 `[字段名]` 公式新增计算指标。
- 在 Perspective 原生 viewer 中拖拽字段、分组、拆分、筛选、排序和切换图表类型。
- Perspective 原生操作面板通过站内样式变量和 shadow 样式注入统一成白底、细边框和蓝绿橙强调色。
- 支持「放大工作台」按钮，扩大 BI 分析区域。
- 解锁后数据只保存在当前页面会话中。

## 共享交互约定

- 财务工具应当像实用的 BP / 经营分析工具，而不是装饰性演示页面。
- 标准全屏模型布局是克制的左侧控制台 + 右侧滚动分析画布。
- 移动端控制台默认折叠，必须有清晰的顶部控制按钮，并能通过遮罩或右侧空白区域关闭。
- 除非确实能提升业务工作流，否则 Plotly modebar、滚轮缩放和自由拖拽都应保持隐藏。
- 优先把上传、示例/模板文件、指标选择、期间/月度选择、维度筛选和下钻作为主要交互。
- 用户上传的维度和用户编辑过的业务名称要能进入图表和表格，不要被内部字段名覆盖。
