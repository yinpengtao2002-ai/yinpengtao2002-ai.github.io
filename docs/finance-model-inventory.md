# 财务模型清单

最后核对时间：2026-06-09

这份文档用于记录当前财务模型库里的模型入口、源码位置、已设计的可视化图表和交互模式。只要财务模型内容发生实质变化，都要同步更新这份文档，包括新增、删除、重命名、迁移模型，增加或移除图表，调整交互方式，调整内测门禁，调整上传模板，或修改模型库元数据。

主要源码入口：

- `src/lib/finance/model-registry.json`：财务模型库卡片、标题、摘要、路由和状态。
- `src/app/finance/page.tsx`：财务模型目录页。
- `src/app/finance/*`：各个财务模型的路由页面。
- `public/tools/margin-analysis/*`：单车指标变动归因模型的静态工具文件，由 `/finance/margin-analysis` 路由通过 iframe 加载。
- `src/app/tools/finance-ai-assistant/*` 和 `src/lib/finance-ai/*`：财务分析 AI 助手的共享实现和图表协议。

## 当前财务模型目录

当前 `/finance` 模型库共有 7 个入口：

| 模型 | 路由 | 主要源码 | 状态 |
| --- | --- | --- | --- |
| 预算实际对比模型 | `/finance/business-analysis` | `src/app/finance/business-analysis/` | 已上线 |
| 单车指标变动归因模型 | `/finance/margin-analysis` | `src/app/finance/margin-analysis/page.tsx` + `public/tools/margin-analysis/` | 已上线 |
| 财务分析 AI 助手 | `/finance/finance-ai-assistant` | `src/app/finance/finance-ai-assistant/page.tsx` + `src/app/tools/finance-ai-assistant/` | 测试中 |
| 分月指标趋势分析模型 | `/finance/monthly-trend` | `src/app/finance/monthly-trend/` | 已上线 |
| 多维结构关系分析模型 | `/finance/profit-structure` | `src/app/finance/profit-structure/` | 测试中 |
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
- 单车净收入 x 单车边际气泡散点图：横轴为单车净收入，纵轴为单车边际，气泡大小代表销量。
- 利润变动桥：从预算利润桥接到实际利润。
- 利润桥：从实际净收入出发，扣减成本和固定科目后得到实际利润。

交互模式：

- 左侧控制台 + 右侧滚动分析画布。
- 上传经营明细 CSV/XLS/XLSX，并在页面内维护边际以下固定科目和利润贡献科目。
- 支持示例数据和 CSV/XLSX 模板下载。
- 拖动维度胶囊调整下钻顺序。
- 选择当前维度成员，点击瀑布柱下钻，用「退一层」返回上级。
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
- 瀑布图支持悬停卡片、点击/触控下钻、触控明细卡和空白处关闭。
- 明细表支持列筛选、排序、复制当前表格和导出当前表格。

### 财务分析 AI 助手

- 源码：`src/app/finance/finance-ai-assistant/page.tsx`、`src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx`、`src/lib/finance-ai/*`
- 路由：`/finance/finance-ai-assistant`
- 状态：测试中
- 用途：上传经营明细底稿后，通过连续聊天提出财务问题，并在回复中生成图表和可核对明细。

已设计图表：

- 指标卡。
- 趋势图。
- 横向排名图。
- 瀑布桥。
- 分组柱状图。
- 堆叠柱状图。
- 百分比堆叠柱状图。
- 热力图。
- 气泡散点图。
- 明细表：支持排名表、对比表、预算实际表、归因明细、异常清单和通用明细等业务类型。

交互模式：

- 通过 `/api/tools/finance-ai-assistant/access` 进行内测密钥校验。
- 解锁后上传 CSV/XLS/XLSX。
- 上传数据只保存在当前浏览器页面会话中，刷新后清空。
- 用户在聊天输入框中直接用自然语言提问。
- AI 先生成可执行分析计划，前端再基于上传数据做确定性聚合和计算，最后由 AI 解读计算结果。
- 生成的图表卡片会内嵌在助手回复中。
- 明细表支持类似 Excel 的表头筛选器，并在表格上保留轻量业务类型标识。
- 对话状态会保留近期问题、助手回复、图表历史和分析上下文；其中表格上下文会记录指标、期间、对比方式、筛选和焦点成员，用于支持连续追问。
- 重置按钮会清空当前底稿和对话状态。

### 分月指标趋势分析模型

- 源码：`src/app/finance/monthly-trend/MonthlyTrendTool.tsx`、`src/app/finance/monthly-trend/monthly-trend-engine.js`、`src/app/finance/monthly-trend/tool.css`
- 路由：`/finance/monthly-trend`
- 用途：分析连续月份明细数据，观察趋势、环比、同比、同期对比、结构占比、热力图和集中度。

已设计图表：

- 多指标月度趋势：折线/散点趋势图。销量按原值展示，其他总额指标可自动折算为单车趋势。
- 同期月度对比：当前年度与上年同月对比折线图。
- 环比 / 同比变化：环比和同比变化率折线图。
- 结构趋势：维度占比趋势图，展示 Top 分类和可选「其他」项。
- 结构集中度：头部占比柱状图 + 集中度指数折线图。
- 同比热力图：维度 x 月份的同比变化热力图。
- 环比热力图：维度 x 月份的环比变化热力图。

交互模式：

- 左侧控制台 + 右侧分析画布。
- 上传 CSV/XLS/XLSX 分月明细数据。
- 支持 CSV/XLSX 模板下载。
- 选择关注指标。
- 引擎会自动识别月份列、指标列和维度列。
- 根据识别出的维度生成筛选控件。
- 支持在控制台重置筛选。
- 图表锁定 Plotly 缩放和工具栏，主要通过指标选择和维度筛选完成业务交互。
- 移动端使用折叠式浮层控制台。

### 多维结构关系分析模型

- 源码：`src/app/finance/profit-structure/ProfitStructureTool.tsx`、`src/app/finance/profit-structure/profit-structure-engine.js`、`src/app/finance/profit-structure/tool.css`
- 路由：`/finance/profit-structure`
- 状态：测试中
- 用途：上传一张经营明细底表后，按任意维度路径和用户上传指标查看多层维度之间的结构关系。

已设计图表：

- KPI 指标卡。
- 维度路径流向图：基于所选权重指标生成 Sankey 流向图。
- 结构定位散点图：基于所选横轴指标和纵轴指标生成定位散点/气泡图。

交互模式：

- 通过共享财务内测访问接口进行密钥校验。
- 支持上传 CSV/XLS/XLSX 经营明细、加载示例数据、下载 CSV/XLSX 模板。
- 支持选择最多五层维度路径。
- 支持选择权重/横轴指标、纵轴指标和期间范围。
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
- 支持上传 CSV/XLS/XLSX 和下载 CSV/XLSX 模板。
- 上传后先确认字段角色：维度、指标或忽略。
- 支持用 `[字段名]` 公式新增计算指标。
- 在 Perspective 原生 viewer 中拖拽字段、分组、拆分、筛选、排序和切换图表类型。
- 支持「放大工作台」按钮，扩大 BI 分析区域。
- 解锁后数据只保存在当前页面会话中。

## 共享交互约定

- 财务工具应当像实用的 BP / 经营分析工具，而不是装饰性演示页面。
- 标准全屏模型布局是克制的左侧控制台 + 右侧滚动分析画布。
- 移动端控制台默认折叠，必须有清晰的顶部控制按钮，并能通过遮罩或右侧空白区域关闭。
- 除非确实能提升业务工作流，否则 Plotly modebar、滚轮缩放和自由拖拽都应保持隐藏。
- 优先把上传、示例/模板文件、指标选择、期间/月度选择、维度筛选和下钻作为主要交互。
- 用户上传的维度和用户编辑过的业务名称要能进入图表和表格，不要被内部字段名覆盖。
