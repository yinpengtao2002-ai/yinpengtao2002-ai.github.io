import type { FinanceAIDataSelection, FinanceRawWorkbook, FinanceSchema } from "./types";

export type FinanceAIChatState = {
  recentQuestions?: string[];
  recentAssistantMessages?: string[];
  currentMetric?: string;
  currentFilters?: Record<string, string[]>;
  chartHistory?: Array<{ type: string; title: string }>;
  analysisContext?: Array<{
    type: string;
    chartKind?: string;
    title: string;
    tableVariant?: string;
    metric?: string;
    metrics?: string[];
    dimension?: string;
    period?: string;
    periods?: string[];
    fromPeriod?: string;
    toPeriod?: string;
    fromScenario?: string;
    toScenario?: string;
    comparison?: string;
    filters?: Record<string, string[]>;
    focusValues?: Array<{ dimension: string; value: string }>;
  }>;
};

type ExplanationPromptInput = {
  userQuestion: string;
  computedSummary: unknown;
};

type DirectAnalyzePromptInput = {
  userQuestion: string;
  workbook: FinanceRawWorkbook;
  state?: FinanceAIChatState;
};

type DataRequestPromptInput = {
  userQuestion: string;
  workbook: FinanceRawWorkbook;
  state?: FinanceAIChatState;
};

type SelectedRowsAnalyzePromptInput = {
  userQuestion: string;
  workbook: FinanceRawWorkbook;
  selection: FinanceAIDataSelection;
  state?: FinanceAIChatState;
};

const MAX_LIST_ITEMS = 24;
const MAX_RECENT_QUESTIONS = 4;
const MAX_RECENT_ASSISTANT_MESSAGES = 2;
const MAX_CHART_HISTORY = 4;
const MAX_ANALYSIS_CONTEXT_ITEMS = 4;
const MAX_FOCUS_VALUES = 6;
const MAX_FILTER_FIELDS = 12;
const MAX_FILTER_VALUES = 8;
const MAX_SUMMARY_ARRAY_ITEMS = 24;
const MAX_SUMMARY_OBJECT_KEYS = 28;
const MAX_SUMMARY_DEPTH = 8;
const MAX_STRING_CHARS = 240;
const MAX_SUMMARY_JSON_CHARS = 16000;
const MAX_WORKBOOK_CELL_CHARS = 180;
const MAX_CATALOG_SAMPLE_ROWS = 3;
const MAX_CATALOG_VALUE_SAMPLES = 16;
const OMIT_PROMPT_VALUE = Symbol("omit-prompt-value");
const DIRECT_CHART_PROTOCOL_LINES = [
  "charts 最多 3 个，可使用以下图表类型：",
  "1. trend: {type,title,xLabel,yLabel,points:[{label,value}],note}",
  "2. bar_rank: {type,title,xLabel,yLabel,items:[{label,value,share,changeValue,detail}],note}",
  "3. waterfall: {type,title,startLabel,startValue,endLabel,endValue,items:[{label,value}],note}",
  "4. grouped_bar: {type,title,xLabel,yLabel,series:[{name,items:[{label,value}]}],note}",
  "5. stacked_bar: {type,title,xLabel,yLabel,series:[{name,items:[{label,value}]}],note}",
  "6. percent_stacked_bar: {type,title,xLabel,yLabel,series:[{name,items:[{label,value}]}],note}",
  "7. heatmap: {type,title,xLabels,yLabels,values,note}",
  "8. scatter_bubble: {type,title,xLabel,yLabel,items:[{label,x,y,size}],note}",
  "9. detail_table: {type,title,variant,meta,columns,rows,note}，variant 可用 rank、comparison、budget_actual、attribution_detail、exception_list、generic；meta 可写 primaryDimension、metrics、period、periods、comparison、filters、focusValues；适合承接用户要求全量列出的明细，最多约 120 行；表格至少 4 列，优先包含关键维度、当前值、对比值、变化值、变化率、占比或口径，不要只返回一两列",
  "单点纯数字不要生成图表卡，直接写在 answer 文字里。",
  "预算、目标、实际、预测、计划、达成率或同一指标不同口径的并列对比，优先用 grouped_bar；差异来源、贡献拆解或归因可用 waterfall；不要用 stacked_bar 或 percent_stacked_bar，因为这些口径不能相加。",
  "单车指标构成、原因或变化来源可以同时返回 2-3 张图：单车指标 waterfall + 销量 grouped_bar + 净收入/收入 grouped_bar；除非底稿缺少销量或收入字段，不要因为已有瀑布图就省略有助解释的量、收入对比。",
];
const UNIT_ASSUMPTION_RULE_LINES = [
  "不要根据国家、市场或地区推断币种；底稿字段或用户没有明确单位时，只称为原始单位或省略单位。",
  "没有明确单位时，答案和图表标题不要写人民币、元、美元、欧元等币种；图表数值只使用原始单位、万、亿、万亿这类数量级缩放。",
];
const PERIOD_LABEL_RULE_LINES = [
  "内部计算可以使用期间 key；用户可见月份请使用可用期间里的 label 或底稿原始月份写法，不要把 M04/M05 这类内部期间 key 写给用户。",
];

function compactList(values: string[], emptyLabel = "无") {
  const normalized = values.map((value) => value.trim()).filter(Boolean);

  if (normalized.length === 0) {
    return emptyLabel;
  }

  const visible = normalized.slice(0, MAX_LIST_ITEMS).join(" / ");
  const hiddenCount = normalized.length - MAX_LIST_ITEMS;
  return hiddenCount > 0 ? `${visible} / 另有 ${hiddenCount} 项` : visible;
}

function formatPeriods(schema: FinanceSchema) {
  return compactList(schema.profile.periods.map((period) => (
    period.key === period.label ? period.key : `${period.key}（${period.label}）`
  )));
}

function truncateText(value: string, maxLength = MAX_STRING_CHARS) {
  const normalized = value.trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

function compactFilters(filters: Record<string, string[]> | undefined) {
  const entries = Object.entries(filters ?? {})
    .filter(([, values]) => Array.isArray(values) && values.length > 0);
  const visibleEntries = entries.slice(0, MAX_FILTER_FIELDS).map(([field, values]) => {
    const visibleValues = values
      .map((value) => String(value).trim())
      .filter(Boolean)
      .slice(0, MAX_FILTER_VALUES);
    const hiddenValueCount = values.length - MAX_FILTER_VALUES;
    return [
      field,
      hiddenValueCount > 0 ? [...visibleValues, `另有 ${hiddenValueCount} 项`] : visibleValues,
    ];
  });
  const hiddenFieldCount = entries.length - MAX_FILTER_FIELDS;

  return {
    ...Object.fromEntries(visibleEntries),
    ...(hiddenFieldCount > 0 ? { "__moreFilterFields": hiddenFieldCount } : {}),
  };
}

function compactAnalysisContext(items: NonNullable<FinanceAIChatState["analysisContext"]>) {
  return JSON.stringify(items.slice(-MAX_ANALYSIS_CONTEXT_ITEMS).map((item) => ({
    type: truncateText(item.type, 40),
    ...(item.chartKind ? { chartKind: truncateText(item.chartKind, 40) } : {}),
    title: truncateText(item.title, 80),
    ...(item.tableVariant ? { tableVariant: truncateText(item.tableVariant, 40) } : {}),
    ...(item.metric ? { metric: truncateText(item.metric, 60) } : {}),
    ...(item.metrics?.length ? { metrics: item.metrics.slice(0, 8).map((metric) => truncateText(metric, 60)) } : {}),
    ...(item.dimension ? { dimension: truncateText(item.dimension, 60) } : {}),
    ...(item.period ? { period: truncateText(item.period, 40) } : {}),
    ...(item.periods?.length ? { periods: item.periods.slice(0, 8).map((period) => truncateText(period, 40)) } : {}),
    ...(item.fromPeriod ? { fromPeriod: truncateText(item.fromPeriod, 40) } : {}),
    ...(item.toPeriod ? { toPeriod: truncateText(item.toPeriod, 40) } : {}),
    ...(item.fromScenario ? { fromScenario: truncateText(item.fromScenario, 40) } : {}),
    ...(item.toScenario ? { toScenario: truncateText(item.toScenario, 40) } : {}),
    ...(item.comparison ? { comparison: truncateText(item.comparison, 40) } : {}),
    ...(item.filters ? { filters: compactFilters(item.filters) } : {}),
    ...(item.focusValues?.length ? {
      focusValues: item.focusValues.slice(0, MAX_FOCUS_VALUES).map((focus) => ({
        dimension: truncateText(focus.dimension, 60),
        value: truncateText(focus.value, 80),
      })),
    } : {}),
  })));
}

function isRawRowsKey(key: string) {
  return /^(rawRows|rows|records|dataRows|sourceRows|uploadedRows|rawData)$/i.test(key);
}

function looksLikeLargeRecordArray(value: unknown[]) {
  return value.length > 20 &&
    value.slice(0, 5).every((item) => (
      item !== null &&
      typeof item === "object" &&
      !Array.isArray(item) &&
      Object.keys(item).length >= 4
    ));
}

function sanitizePromptValue(value: unknown, key = "", depth = 0): unknown | typeof OMIT_PROMPT_VALUE {
  if (typeof value === "string") {
    return truncateText(value);
  }

  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    if (isRawRowsKey(key) || looksLikeLargeRecordArray(value)) {
      return OMIT_PROMPT_VALUE;
    }

    const visibleItems = value
      .slice(0, MAX_SUMMARY_ARRAY_ITEMS)
      .flatMap((item) => {
        const nextValue = sanitizePromptValue(item, key, depth + 1);
        return nextValue === OMIT_PROMPT_VALUE ? [] : [nextValue];
      });
    const hiddenCount = value.length - MAX_SUMMARY_ARRAY_ITEMS;
    return hiddenCount > 0
      ? [...visibleItems, { "__moreItems": hiddenCount }]
      : visibleItems;
  }

  if (typeof value !== "object" || value === undefined) {
    return null;
  }

  if (depth >= MAX_SUMMARY_DEPTH) {
    return null;
  }

  const entries = Object.entries(value as Record<string, unknown>);
  const sanitizedEntries = entries
    .slice(0, MAX_SUMMARY_OBJECT_KEYS)
    .flatMap(([entryKey, entryValue]) => {
      const nextValue = sanitizePromptValue(entryValue, entryKey, depth + 1);
      return nextValue === OMIT_PROMPT_VALUE ? [] : [[entryKey, nextValue]];
    });
  const hiddenKeyCount = entries.length - MAX_SUMMARY_OBJECT_KEYS;

  return {
    ...Object.fromEntries(sanitizedEntries),
    ...(hiddenKeyCount > 0 ? { "__moreFields": hiddenKeyCount } : {}),
  };
}

function safeBoundedJson(value: unknown) {
  const sanitizedValue = sanitizePromptValue(value ?? {});
  const json = JSON.stringify(sanitizedValue === OMIT_PROMPT_VALUE ? {} : sanitizedValue);
  return json.length > MAX_SUMMARY_JSON_CHARS
    ? json.slice(0, MAX_SUMMARY_JSON_CHARS)
    : json;
}

function normalizeWorkbookCell(value: unknown): unknown {
  if (typeof value === "string") {
    return truncateText(value, MAX_WORKBOOK_CELL_CHARS);
  }

  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value ?? "");
}

function safeWorkbookJson(workbook: FinanceRawWorkbook) {
  return JSON.stringify({
    format: "compact_workbook_v1",
    note: "Each sheet.rows item is an array of cell values in the same order as sheet.headers.",
    fileName: workbook.fileName,
    totalRowCount: workbook.totalRowCount,
    sheets: workbook.sheets.map((sheet) => ({
      name: sheet.name,
      headers: sheet.headers,
      rowCount: sheet.rowCount,
      rows: sheet.rows.map((row) => (
        sheet.headers.map((header) => normalizeWorkbookCell(row[header]))
      )),
    })),
  });
}

function uniqueSamples(values: unknown[]) {
  const seen = new Set<string>();
  const samples: string[] = [];

  for (const value of values) {
    const text = String(normalizeWorkbookCell(value) ?? "").trim();
    if (!text || seen.has(text)) {
      continue;
    }

    seen.add(text);
    samples.push(text);
    if (samples.length >= MAX_CATALOG_VALUE_SAMPLES) {
      break;
    }
  }

  return samples;
}

function buildWorkbookCatalog(workbook: FinanceRawWorkbook) {
  return JSON.stringify({
    fileName: workbook.fileName,
    totalRowCount: workbook.totalRowCount,
    sheets: workbook.sheets.map((sheet) => ({
      name: sheet.name,
      headers: sheet.headers,
      rowCount: sheet.rowCount,
      sampleRows: sheet.rows.slice(0, MAX_CATALOG_SAMPLE_ROWS).map((row) => (
        sheet.headers.map((header) => normalizeWorkbookCell(row[header]))
      )),
      valueSamples: Object.fromEntries(sheet.headers.map((header) => [
        header,
        uniqueSamples(sheet.rows.slice(0, MAX_CATALOG_SAMPLE_ROWS).map((row) => row[header])),
      ])),
    })),
  });
}

function safeSelectionJson(selection: FinanceAIDataSelection) {
  return JSON.stringify({
    format: "selected_raw_rows_v1",
    note: "Rows are raw uploaded detail rows selected by the AI data request. Each row is an array in headers order. The client did not aggregate, rank, or calculate metrics.",
    request: selection.request,
    sheetName: selection.sheetName,
    headers: selection.headers,
    rowCount: selection.rowCount,
    totalMatchedRowCount: selection.totalMatchedRowCount,
    omittedRowCount: selection.omittedRowCount,
    rows: selection.rows.map((row) => (
      selection.headers.map((header) => normalizeWorkbookCell(row[header]))
    )),
  });
}

export function buildFinanceAIPlanningContext(
  schema: FinanceSchema,
  state: FinanceAIChatState = {},
) {
  const recentQuestions = (state.recentQuestions ?? [])
    .slice(-MAX_RECENT_QUESTIONS)
    .map((question) => question.trim())
    .filter(Boolean);
  const recentAssistantMessages = (state.recentAssistantMessages ?? [])
    .slice(-MAX_RECENT_ASSISTANT_MESSAGES)
    .map((message) => truncateText(message, 180))
    .filter(Boolean);
  const chartHistory = (state.chartHistory ?? [])
    .slice(-MAX_CHART_HISTORY)
    .map((chart) => `${chart.type}:${chart.title}`)
    .filter(Boolean);
  const analysisContext = state.analysisContext ?? [];

  return [
    "你是财务分析 AI 助手，只负责把用户问题转成结构化分析动作。",
    "AI 不负责计算数字；所有数值、环比、同比、排名和图表数据都由前端确定性计算。",
    "不要要求用户发送上传数据明细，也不要在计划里引用未出现在 schema/state 里的字段。",
    "每轮最少 1 个模块，最多生成 3 个模块；复杂经营问题可以输出多张互补图，不要默认压缩成一张图。",
    "只允许这些动作：metric_snapshot、trend_chart、bar_rank、waterfall_bridge、grouped_bar、stacked_bar、percent_stacked_bar、heatmap、scatter_bubble、detail_table。",
    "metric_snapshot 只用于计算某个期间某个指标的当前值、环比和同比，前端不会把它渲染成纯数字图表卡；结论里的单点数字直接用文字表达。",
    "图表模块会渲染在聊天消息内部，所以模块标题要像对话回复的一部分。",
    "如果用户要求可视化、图表、占比、结构、构成、变化来源，必须生成至少一个图表模块，不要只返回 metric_snapshot。",
    "用户问所有维度成员的环比情况时，优先用 grouped_bar 搭配 comparison:\"mom\"，展示上期和本期两组柱，不要用单柱后面写环比数字。",
    "用户问预算、目标、实际、预测、计划、达成率或同一指标不同口径的并列对比时，优先用 grouped_bar，dimension 放业务维度，seriesDimension 放数据口径；不要用 stacked_bar 或 percent_stacked_bar，因为实际和预算不能相加。",
    "用户问占比、结构或构成时，可用 stacked_bar 或 percent_stacked_bar；但预算、目标、实际、预测、计划这类口径对比不是结构构成。用户问二维交叉高低表现时用 heatmap；用户问规模和质量关系时用 scatter_bubble；用户要求全部列出时用 detail_table。",
    "用户问多个指标是否都增长、均增长、同时增长、都下降或同时变化时，必须用 detail_table，metrics 放入这些指标，comparison:\"mom\"，dimension 放用户询问的维度；detail_table 会展开上期、本期、变化、变化率等列，解释阶段按每个指标的环比变化列判断交集。",
    "用户问变化来源、差异来源、贡献拆解或归因时，优先用 waterfall_bridge；如果是在同一期间比较实际/预算/目标/预测/计划等口径，使用口径瀑布桥。",
    "waterfall_bridge 可用于两个期间之间的 period bridge，也可用于同一期间不同数据口径之间的 scenario bridge；总额指标按维度拆差，单车指标按结构效应和费率效应生成归因瀑布桥。",
    "如果维度字段包含“数据口径”，说明上传工作簿可能用 sheet 名区分实际、预算、目标或预测；用户说实际、预算、目标、预测时，必须用 filters.{\"数据口径\":[对应值]}，不要把这些词写进月份 period。",
    "如果存在“数据口径”且用户只问本月/当月/当前表现，默认按实际口径规划；只有用户明确问预算、目标、预测或对比时才切换或展开数据口径维度。",
    "用户说“维度成员 + 维度字段”（如 MBT大区）并追问自身、内部、构成、下面有哪些时，把该成员写入 filters，并把 dimension 切到下一层可用维度（如 国家或车型）。",
    "用户只给出维度成员简称但没有说明维度时，不要强行猜成品牌、车型或大区；无法从上下文唯一确定时，应让用户补充它到底属于哪个维度。",
    "最近助手结论和最近计算模块只用于理解“它、其中、这个、刚才那个”等指代；每一轮仍然要围绕当前上传底稿重新规划可计算模块。",
    "如果用户说这张表、这个表、上张表、表里的这些、刚才这些国家或继续问为什么，优先从最近计算模块的 tableVariant、metrics、periods、comparison、filters、focusValues 解析指代。",
    "解析追问时可继承刚才的指标 metrics、期间 periods、对比 comparison、维度 dimension、筛选 filters 和表格焦点 focusValues；但不要只围绕上一轮可见表格或可见图表回答。",
    "不要因为上一轮结果没包含某个切片，就输出会导致解释阶段说看不到结果的计划；需要的切片应在本轮用 filters、dimension、metric 重新计算。",
    ...UNIT_ASSUMPTION_RULE_LINES,
    ...PERIOD_LABEL_RULE_LINES,
    "用户没有明确期间、但问题是当前值/是否销售/单点查询/排名/明细/普通图表时，默认使用可用期间里的最新 key；不要因为用户没写月份就返回不可计算。",
    "可用字段：",
    `月份列：${schema.monthColumn || "未识别"}`,
    `销量列：${schema.salesColumn || "未识别"}`,
    `维度字段：${compactList(schema.dimensionColumns)}`,
    `维度成员数：${JSON.stringify(schema.profile.dimensionValueCounts)}`,
    `总额指标：${compactList(schema.totalMetrics.map((metric) => metric.name))}`,
    `单车指标：${compactList(schema.unitMetrics.map((metric) => metric.name))}`,
    `可用期间：${formatPeriods(schema)}`,
    `最近问题：${compactList(recentQuestions)}`,
    `最近助手结论：${compactList(recentAssistantMessages)}`,
    `当前指标：${state.currentMetric || "无"}`,
    `当前筛选：${JSON.stringify(compactFilters(state.currentFilters))}`,
    `最近图表：${compactList(chartHistory)}`,
    `最近计算模块：${analysisContext.length ? compactAnalysisContext(analysisContext) : "无"}`,
    "输出规则：",
    "- 只输出 JSON，不输出 Markdown。",
    "- modules 数组必须有 1 到 3 项。",
    "- metric 只能使用总额指标或单车指标里的名称。",
    "- detail_table 使用 metrics 数组，最多 6 个指标；comparison:\"mom\" 时前端会自动生成上期、本期、变化、变化率列；表格至少应有 4 列以上可核对信息。scatter_bubble 使用 xMetric/yMetric/sizeMetric。",
    "- dimension 只能使用维度字段里的名称。",
    "- grouped_bar 用于环比时填 comparison:\"mom\"；用于预算/目标/实际/预测/计划口径并列对比时填 seriesDimension:\"数据口径\"，不要填 comparison。",
    "- stacked_bar/percent_stacked_bar 使用 dimension 作为横轴主维度，seriesDimension 作为堆叠系列维度；不要用于预算/目标/实际/预测/计划口径对比。",
    "- heatmap 使用 xDimension 和 yDimension。",
    "- period/fromPeriod/toPeriod/highlightPeriod 只能使用可用期间里的 key，例如 M04 或 2026-03，不要自造年份。",
    "- 用户没写期间时，metric_snapshot、bar_rank、grouped_bar、stacked_bar、percent_stacked_bar、heatmap、scatter_bubble、detail_table 默认填最新可用期间 key。",
    "- waterfall_bridge 做两个期间变化桥时填 fromPeriod/toPeriod；做同一期间预算/实际/目标/预测/计划差异来源时填 period、comparison:\"scenario\"、fromScenario、toScenario，不要填 fromPeriod/toPeriod。",
    "- filters 只能使用维度字段和值数组。",
    "- 如果使用“数据口径”筛选，常见值为“实际”“预算”“目标”“预测”“计划”；用户没有指定口径且该字段存在时，优先 filters:{\"数据口径\":[\"实际\"]}。",
    "- bar_rank 必须设置 sort：用户说 Top/前五/最高/最多时用 value_desc；用户说最低/最少/倒数/bottom 时用 value_asc。",
    "- 用户问环比下降最多/减少最多/负贡献/拖累/增长最多/正贡献等排名时，必须用 bar_rank，comparison 填 mom，sort 分别用 change_asc 或 change_desc；不要用 grouped_bar。",
    "- grouped_bar 可用于环比对比或实际/预算/目标等口径并列对比；口径并列对比时 seriesDimension 必须是“数据口径”。",
    "- 用户要求所有/全部/全量维度成员环比，且该维度成员数不超过 16 时，grouped_bar 的 limit 设置为该维度成员数；高基数全量列出用 detail_table。",
    "- 用户问“哪些国家销量和单车边际都增长”这类多个指标同时增长/下降时，用 detail_table，metrics 同时包含销量和单车指标，comparison:\"mom\"，不要只返回当前期数值。",
    "- 如果用户明确要求“全部/所有/全量/剩下也列出”，bar_rank 可以给出超过 10 的 limit；前端会把图表限制为前 10 项，并自动补充完整明细表。",
    "- 单车指标问“哪些车型/国家/维度影响环比/变化来源”时，优先用 waterfall_bridge，metric 填单车指标，dimension 填对应维度；期间桥填 fromPeriod/toPeriod，口径桥填 period/comparison/fromScenario/toScenario。",
    "- 用户问单车指标构成、原因、影响或变化来源时，优先生成 2-3 个互补模块：单车指标 waterfall_bridge + 销量 grouped_bar + 净收入或收入 grouped_bar；除非 schema 里缺少销量或收入指标，不要只给一张瀑布图。",
    "- 同一句里要求多个排名时，分别为每个指标生成独立 bar_rank 模块，不要把销量 Top 和单车指标最低混成一个模块。",
    "JSON 结构示例：",
    '{"modules":[{"type":"metric_snapshot","metric":"单车边际","period":"2026-03","filters":{"国家":["巴西"]},"comparisons":["mom","yoy"]},{"type":"grouped_bar","metric":"净收入总额","dimension":"大区","period":"M04","comparison":"mom","limit":10},{"type":"heatmap","metric":"单车净收入","xDimension":"车型","yDimension":"国家","period":"M04","limit":8}]}',
  ].join("\n");
}

export function buildFinanceAIDirectAnalyzePrompt(input: DirectAnalyzePromptInput) {
  const recentQuestions = (input.state?.recentQuestions ?? [])
    .slice(-MAX_RECENT_QUESTIONS)
    .map((question) => question.trim())
    .filter(Boolean);
  const chartHistory = (input.state?.chartHistory ?? [])
    .slice(-MAX_CHART_HISTORY)
    .map((chart) => `${chart.type}:${chart.title}`)
    .filter(Boolean);

  return [
    "你是财务分析 AI 助手。用户已经上传底稿，你需要直接基于底稿回答问题并在适合时生成图表数据。",
    "底稿会以紧凑 JSON 形式提供，包含 sheet 名、原始表头和数据行；每一行是按 headers 顺序排列的单元格数组。你负责识别字段含义、判断口径、计算数值，并说明必要假设。",
    "如果 sheet 名为实际、预算、目标、预测或英文 Actual/Budget/Target/Forecast，优先把 sheet 名当作数据口径；月份字段只代表月份，不要把实际/预算/目标拼进月份。",
    "只输出严格 JSON，不要输出 Markdown 代码块，不要在 JSON 外写任何文字。",
    "返回结构必须是：",
    '{"answer":"给用户看的中文分析结论，可包含 Markdown 加粗","assumptions":["字段、口径或计算假设"],"charts":[]}',
    ...UNIT_ASSUMPTION_RULE_LINES,
    ...PERIOD_LABEL_RULE_LINES,
    ...DIRECT_CHART_PROTOCOL_LINES,
    "图表规则：value/startValue/endValue/changeValue/share/x/y/size/values 必须是数字，不要写成带逗号或单位的字符串；share 和 percent_stacked_bar 的 value 使用 0 到 1 的小数；detail_table 要给关键维度、当前值、对比值、变化值/变化率等可核对列，不要只返回一两列；不确定时少出图，不要硬造图。",
    "分析规则：不要声称看不到底稿；如果字段口径不明确，先说明你的假设，再给结论；计算过程要和 answer、charts 保持一致。",
    "用户只给出维度成员简称但没有说明维度时，不要强行猜成品牌、车型或大区；无法唯一确定时要追问用户它属于哪个维度。",
    "用户问多个指标是否都增长或同时变化时，要按当前期和上期分别计算每个指标的变化，再回答同时满足条件的维度成员；不要只看当前期明细列。",
    `最近问题：${compactList(recentQuestions)}`,
    `最近图表：${compactList(chartHistory)}`,
    `用户问题：${input.userQuestion.trim() || "无"}`,
    "上传底稿：",
    safeWorkbookJson(input.workbook),
  ].join("\n");
}

export function buildFinanceAIDataRequestPrompt(input: DataRequestPromptInput) {
  const recentQuestions = (input.state?.recentQuestions ?? [])
    .slice(-MAX_RECENT_QUESTIONS)
    .map((question) => question.trim())
    .filter(Boolean);

  return [
    "你是财务分析 AI 助手。你现在不是回答问题，而是先决定需要读取哪些上传底稿原始明细行。",
    "客户端只能按你的请求筛选原始行和列；客户端不会汇总、排名、计算环比或生成任何分析结论。",
    "请根据用户问题和数据目录，返回一个 JSON 取数请求。优先选择最少必要列、必要期间和必要维度，避免要求整张表。",
    "如果用户问环比、同比、Top、排名、变化来源，要包含当前期和对比期所需原始行。",
    ...UNIT_ASSUMPTION_RULE_LINES,
    ...PERIOD_LABEL_RULE_LINES,
    "返回结构必须是：",
    '{"sheetName":"可选工作表名","columns":["需要的原始列"],"filters":{"列名":["原始值"]},"rowLimit":10000,"reason":"为什么需要这些原始行"}',
    "规则：",
    "- 只输出 JSON，不输出 Markdown。",
    "- columns 必须来自数据目录的 headers。",
    "- filters 的字段必须来自 headers，值必须尽量使用 valueSamples 或 sampleRows 里出现的原始值。",
    "- 不确定 sheetName 时可省略；不确定筛选值时可以省略 filters，但不要编造字段。",
    "- rowLimit 默认 10000，除非用户问题明显只需要更少行。",
    `最近问题：${compactList(recentQuestions)}`,
    `用户问题：${input.userQuestion.trim() || "无"}`,
    "数据目录：",
    buildWorkbookCatalog(input.workbook),
  ].join("\n");
}

export function buildFinanceAISelectedRowsAnalyzePrompt(input: SelectedRowsAnalyzePromptInput) {
  const recentQuestions = (input.state?.recentQuestions ?? [])
    .slice(-MAX_RECENT_QUESTIONS)
    .map((question) => question.trim())
    .filter(Boolean);
  const chartHistory = (input.state?.chartHistory ?? [])
    .slice(-MAX_CHART_HISTORY)
    .map((chart) => `${chart.type}:${chart.title}`)
    .filter(Boolean);

  return [
    "你是财务分析 AI 助手。你需要基于客户端按你的取数请求返回的原始明细行，完成计算、分析和图表数据生成。",
    "客户端没有做汇总、排名、环比或指标计算；下面的数据切片仍是上传底稿的原始明细行。",
    "只输出严格 JSON，不要输出 Markdown 代码块，不要在 JSON 外写任何文字。",
    "返回结构必须是：",
    '{"answer":"给用户看的中文分析结论，可包含 Markdown 加粗","assumptions":["字段、口径或计算假设"],"charts":[]}',
    ...UNIT_ASSUMPTION_RULE_LINES,
    ...PERIOD_LABEL_RULE_LINES,
    ...DIRECT_CHART_PROTOCOL_LINES,
    "图表规则：value/startValue/endValue/changeValue/share/x/y/size/values 必须是数字，不要写成带逗号或单位的字符串；share 和 percent_stacked_bar 的 value 使用 0 到 1 的小数。",
    "如果 omittedRowCount 大于 0，必须在 assumptions 里说明本次只收到部分匹配明细，不能把结果说成全量。",
    `最近问题：${compactList(recentQuestions)}`,
    `最近图表：${compactList(chartHistory)}`,
    `用户问题：${input.userQuestion.trim() || "无"}`,
    `底稿文件：${input.workbook.fileName}，总行数：${input.workbook.totalRowCount}`,
    "AI 请求的数据切片：",
    safeSelectionJson(input.selection),
  ].join("\n");
}

export function buildFinanceAIExplanationPrompt(input: ExplanationPromptInput) {
  return [
    "你是财务分析 AI 助手。请基于前端已经计算好的结果，用中文给出简短解释。",
    "不要重新计算数字，不要编造字段，不要引入计算结果之外的数据。",
    "计算结果是前端确定性计算后的聚合结果，聚合结果足够回答本轮问题。",
    ...UNIT_ASSUMPTION_RULE_LINES,
    ...PERIOD_LABEL_RULE_LINES,
    "排名、占比、变化贡献等明细如果出现在计算结果里，就必须直接使用这些结果回答，不要说看不到明细、无法分析或无法出图。",
    "bar_rank 里的 items 是图表可见 Top N；如果同时有 fullScan，它基于所有维度成员计算，判断最大上涨、最大下降、最大负贡献时必须优先使用 fullScan，不要把图表 Top N 误认为全量名单。",
    "bar_rank 如果有 allItems 或 answerItems，代表完整明细表会在消息下方展示；不要说“只返回了前 N”“只能看到 Top N”“明细只给了可见项”。",
    "用户指定 Top/Bottom N 时，按 answerItems 或 allItems 的前 N 项回答；正文只给结论和口径，不要再手写完整 Markdown 表格，以免和下方表格重复。",
    "如果结果里出现不可计算、缺少上月或缺少年同期，需要直接说明。",
    "不要把本轮没有覆盖的切片说成“看不到底稿”或“结果里未包含”；本工具上传后始终可以围绕当前底稿重新规划计算。",
    "回复应像聊天消息，先给结论，再补一句口径。可以用 Markdown 加粗关键数字，必要时可用 LaTeX 公式。",
    `用户问题：${input.userQuestion.trim() || "无"}`,
    "计算结果：",
    safeBoundedJson(input.computedSummary ?? {}),
  ].join("\n");
}
