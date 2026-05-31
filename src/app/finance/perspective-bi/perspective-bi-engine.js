import perspective from "@perspective-dev/client";
import perspectiveViewer from "@perspective-dev/viewer";
import "@perspective-dev/viewer-datagrid";
import "@perspective-dev/viewer-d3fc";
import * as XLSX from "xlsx";

const SAMPLE_ROWS = [
    { 月份: "2026-01", 大区: "欧洲", 国家: "德国", 车型: "Alpha", 渠道: "经销", 销量: 1280, 净收入: 16840, 边际总额: 4120 },
    { 月份: "2026-01", 大区: "欧洲", 国家: "法国", 车型: "Alpha", 渠道: "直营", 销量: 960, 净收入: 12620, 边际总额: 2980 },
    { 月份: "2026-01", 大区: "拉美", 国家: "巴西", 车型: "Beta", 渠道: "经销", 销量: 1420, 净收入: 15650, 边际总额: 3540 },
    { 月份: "2026-02", 大区: "欧洲", 国家: "德国", 车型: "Gamma", 渠道: "经销", 销量: 1360, 净收入: 18940, 边际总额: 4860 },
    { 月份: "2026-02", 大区: "中东", 国家: "阿联酋", 车型: "Beta", 渠道: "直营", 销量: 820, 净收入: 10890, 边际总额: 2680 },
    { 月份: "2026-02", 大区: "拉美", 国家: "墨西哥", 车型: "Alpha", 渠道: "经销", 销量: 1190, 净收入: 13780, 边际总额: 2910 },
    { 月份: "2026-03", 大区: "欧洲", 国家: "西班牙", 车型: "Beta", 渠道: "直营", 销量: 1040, 净收入: 13490, 边际总额: 3310 },
    { 月份: "2026-03", 大区: "中东", 国家: "沙特", 车型: "Gamma", 渠道: "经销", 销量: 910, 净收入: 13240, 边际总额: 3860 },
    { 月份: "2026-03", 大区: "拉美", 国家: "巴西", 车型: "Gamma", 渠道: "经销", 销量: 1510, 净收入: 18480, 边际总额: 4380 },
    { 月份: "2026-04", 大区: "欧洲", 国家: "法国", 车型: "Gamma", 渠道: "直营", 销量: 1120, 净收入: 16130, 边际总额: 4210 },
    { 月份: "2026-04", 大区: "中东", 国家: "阿联酋", 车型: "Alpha", 渠道: "经销", 销量: 990, 净收入: 12120, 边际总额: 2860 },
    { 月份: "2026-04", 大区: "拉美", 国家: "墨西哥", 车型: "Beta", 渠道: "直营", 销量: 1320, 净收入: 15690, 边际总额: 3620 },
];

const TEMPLATE_ROWS = [
    { 月份: "2026-01", 大区: "欧洲", 国家: "德国", 车型: "Alpha", 渠道: "经销", 销量: 1000, 净收入: 12000, 边际总额: 3200 },
    { 月份: "2026-02", 大区: "拉美", 国家: "巴西", 车型: "Beta", 渠道: "直营", 销量: 900, 净收入: 10350, 边际总额: 2520 },
];

const FIELD_ROLE_OPTIONS = ["dimension", "metric", "ignore"];
const AGGREGATION_OPTIONS = ["sum", "avg", "count", "min", "max"];
const ROLE_LABELS = {
    dimension: "维度",
    metric: "指标",
    ignore: "忽略",
};
const AGGREGATION_LABELS = {
    sum: "求和",
    avg: "平均",
    count: "计数",
    min: "最小",
    max: "最大",
};
const CALCULATED_FORMAT_LABELS = {
    unit: "元每台",
    number: "数值",
    percent: "百分比",
};
const CALCULATED_METRIC_TYPE_LABELS = {
    unit: "单位/比率指标",
    additive: "累计指标",
};
const calculatedFormulaOperators = new Set(["+", "-", "*", "/"]);
const volumeMetricCandidates = ["销量", "销售量", "销售台数", "批发销量", "零售销量", "Volume", "volume", "Sales Volume", "sales volume"];
const unitMetricBlueprints = [
    { name: "单车净收入", numerators: ["净收入", "收入", "营业收入", "销售收入", "Revenue", "revenue"] },
    { name: "单车边际", numerators: ["边际总额", "边际", "贡献边际", "毛利", "Margin", "margin"] },
    { name: "单车成本", numerators: ["成本", "总成本", "变动成本", "Cost", "cost"] },
];
const WORKBENCH_GUIDES = {
    Datagrid: {
        title: "数据表",
        tips: [
            ["分组", "拖入月份、大区、国家等维度，形成透视表行层级。"],
            ["拆分", "拖入渠道、车型等维度，把同一指标横向展开。"],
            ["字段", "拖入销量、净收入、单车指标等字段，决定表格展示内容。"],
            ["筛选/排序", "拖入字段后收窄范围，或固定指标、维度的排列顺序。"],
        ],
    },
    "Y Bar": {
        title: "纵向柱状图",
        tips: [
            ["纵轴", "拖入净收入、边际、单车指标等数值字段，决定柱子高度。"],
            ["分组", "拖入月份、大区等维度，作为横轴分类。"],
            ["拆分", "拖入车型、渠道等维度，把柱子拆成多个系列。"],
            ["筛选", "拖入国家、车型等字段，只保留当前关注范围。"],
        ],
    },
    "X Bar": {
        title: "横向柱状图",
        tips: [
            ["横轴", "拖入销量、收入、边际等数值字段，决定条形长度。"],
            ["分组", "拖入国家、车型等维度，作为纵向分类。"],
            ["拆分", "拖入渠道、大区等维度，对每个分类继续拆系列。"],
            ["排序", "拖入核心指标后可按大小排列，适合做排名。"],
        ],
    },
    "Y Line": {
        title: "折线图",
        tips: [
            ["纵轴", "拖入收入、边际、单车等指标，决定折线数值。"],
            ["分组", "拖入月份或日期字段，形成时间序列。"],
            ["拆分", "拖入大区、车型等维度，对比多条趋势线。"],
            ["筛选", "限定国家、渠道或车型，避免趋势线过密。"],
        ],
    },
    "X/Y Line": {
        title: "双轴折线图",
        tips: [
            ["横轴", "拖入一个连续数值或时间字段，决定横向位置。"],
            ["纵轴", "拖入要观察的指标，决定纵向高度。"],
            ["拆分", "拖入维度后分系列观察关系变化。"],
            ["筛选", "保留一个区域或车型，让关系更清楚。"],
        ],
    },
    "Y Scatter": {
        title: "纵轴散点图",
        tips: [
            ["纵轴", "拖入一个或多个数值字段，观察点位分布。"],
            ["分组", "拖入维度后按类别铺开点位。"],
            ["拆分", "拖入车型、渠道等维度，形成不同颜色或系列。"],
            ["筛选", "缩小样本范围，避免点位挤在一起。"],
        ],
    },
    "X/Y Scatter": {
        title: "散点图",
        tips: [
            ["横轴", "拖入销量、单车收入等数值字段，决定横向位置。"],
            ["纵轴", "拖入边际、利润等数值字段，决定纵向位置。"],
            ["拆分", "拖入大区、车型等维度，比较不同系列的分布。"],
            ["筛选", "限定样本范围后，更容易看出相关性和离群点。"],
        ],
    },
    "Y Area": {
        title: "面积图",
        tips: [
            ["纵轴", "拖入收入、销量、边际等指标，决定面积高度。"],
            ["分组", "拖入月份或期间字段，形成连续走势。"],
            ["拆分", "拖入大区、车型等维度，观察结构贡献。"],
            ["筛选", "减少系列数量，避免面积堆叠难读。"],
        ],
    },
    Heatmap: {
        title: "热力图",
        tips: [
            ["行/列", "在分组和拆分中放入两个维度，形成交叉矩阵。"],
            ["颜色", "拖入收入、边际、单车等指标，用颜色深浅表达高低。"],
            ["筛选", "限定月份或区域，让矩阵规模保持可读。"],
            ["排序", "按核心指标排序，突出热区和冷区。"],
        ],
    },
    Treemap: {
        title: "矩形树图",
        tips: [
            ["分组", "拖入大区、国家、车型等层级维度，形成矩形分层。"],
            ["大小", "拖入销量、收入或边际，决定矩形面积。"],
            ["颜色", "再拖入边际率、单车指标等字段，标记质量差异。"],
            ["筛选", "先筛出重点市场，层级会更干净。"],
        ],
    },
    Sunburst: {
        title: "旭日图",
        tips: [
            ["分组", "按大区、国家、车型等顺序拖入层级维度。"],
            ["大小", "拖入销量、收入或边际，决定扇区占比。"],
            ["拆分", "用于增加层级时要克制，层级太多会变难读。"],
            ["筛选", "聚焦一个期间或市场后，更适合看结构。"],
        ],
    },
};
const PERSPECTIVE_WORKBENCH_TEXT = {
    Rollup: "折叠汇总",
    Flat: "明细展开",
    Total: "总计",
    Group: "分组",
    Columns: "字段",
    "X Axis": "横轴",
    "Y Axis": "纵轴",
    Color: "颜色",
    Size: "大小",
    Symbol: "标记",
    Label: "标签",
    Tooltip: "提示",
    Open: "开盘",
    Close: "收盘",
    High: "最高",
    Low: "最低",
    Sum: "求和",
    sum: "求和",
    Avg: "平均",
    avg: "平均",
    Count: "计数",
    count: "计数",
    Mean: "平均",
    mean: "平均",
    "Weighted Mean": "加权平均",
    "weighted mean": "加权平均",
    Distinct: "去重计数",
    distinct: "去重计数",
    Min: "最小",
    min: "最小",
    Max: "最大",
    max: "最大",
    "Read Only": "只读",
    "Text Edit": "文本编辑",
    "Select Row": "选择行",
    "Select Column": "选择列",
    "Select Region": "选择区域",
    Style: "样式",
    Attributes: "属性",
    "Debug JSON": "调试配置",
    Copy: "复制",
    Export: "导出",
    Reset: "重置",
    Format: "格式",
    Timezone: "时区",
    Search: "搜索",
    "New Column": "新建字段",
    "No Results": "无匹配字段",
};
const PERSPECTIVE_LOCALIZATION_VARS = {
    "--psp-label--group-by--content": "\"分组\"",
    "--psp-label--split-by--content": "\"拆分\"",
    "--psp-label--sort--content": "\"排序\"",
    "--psp-label--filter--content": "\"筛选\"",
    "--psp-label--transpose-button--content": "\"交换行列\"",
    "--psp-label--config-button--content": "\"配置\"",
    "--psp-label--all-columns--content": "\"全部字段\"",
    "--psp-label--untitled--content": "\"未命名图表\"",
    "--psp-plugin-name--datagrid--content": "\"数据表\"",
    "--psp-plugin-name--treemap--content": "\"矩形树图\"",
    "--psp-plugin-name--sunburst--content": "\"旭日图\"",
    "--psp-plugin-name--heatmap--content": "\"热力图\"",
    "--psp-plugin-name--x-bar--content": "\"横向柱状图\"",
    "--psp-plugin-name--y-bar--content": "\"纵向柱状图\"",
    "--psp-plugin-name--y-line--content": "\"折线图\"",
    "--psp-plugin-name--x-y-line--content": "\"双轴折线图\"",
    "--psp-plugin-name--x-y-scatter--content": "\"散点图\"",
    "--psp-plugin-name--y-scatter--content": "\"纵轴散点图\"",
    "--psp-plugin-name--y-area--content": "\"面积图\"",
    "--psp-plugin-name--ohlc--content": "\"价格图\"",
    "--psp-plugin-name--candlestick--content": "\"蜡烛图\"",
    "--psp-label--column-columns--content": "\"字段\"",
    "--psp-label--column-x-axis--content": "\"横轴\"",
    "--psp-label--column-y-axis--content": "\"纵轴\"",
    "--psp-label--column-color--content": "\"颜色\"",
    "--psp-label--column-size--content": "\"大小\"",
    "--psp-label--column-symbol--content": "\"标记\"",
    "--psp-label--column-label--content": "\"标签\"",
    "--psp-label--column-tooltip--content": "\"提示\"",
    "--psp-label--add-expression-button--content": "\"新建字段\"",
    "--psp-label--no-results--content": "\"无匹配字段\"",
    "--psp-datagrid--column-edit-button--content": "\"编辑\"",
    "--psp-label--copy-button--content": "\"复制\"",
    "--psp-label--export-button--content": "\"导出\"",
    "--psp-label--reset-button--content": "\"重置\"",
    "--psp-label--edit-mode-read-only--content": "\"只读\"",
    "--psp-label--edit-mode-edit--content": "\"文本编辑\"",
    "--psp-label--edit-mode-select-row--content": "\"选择行\"",
    "--psp-label--edit-mode-select-column--content": "\"选择列\"",
    "--psp-label--edit-mode-select-region--content": "\"选择区域\"",
    "--psp-label--scroll-lock-toggle--content": "\"自由滚动\"",
    "--psp-label--scroll-lock-alt-toggle--content": "\"对齐滚动\"",
    "--psp-label--color--content": "\"颜色\"",
    "--psp-label--format--content": "\"格式\"",
    "--psp-label--timezone--content": "\"时区\"",
    "--psp-label--date-style--content": "\"日期样式\"",
    "--psp-label--time-style--content": "\"时间样式\"",
    "--psp-label--foreground--content": "\"前景\"",
    "--psp-label--background--content": "\"背景\"",
    "--psp-label--series--content": "\"系列\"",
    "--psp-label--color-range--content": "\"颜色范围\"",
    "--psp-label--style--content": "\"样式\"",
    "--psp-label--minimum-integer-digits--content": "\"最少整数位\"",
    "--psp-label--rounding-increment--content": "\"舍入步长\"",
    "--psp-label--notation--content": "\"记数方式\"",
    "--psp-label--use-grouping--content": "\"使用千分位\"",
    "--psp-label--sign-display--content": "\"符号显示\"",
    "--psp-label--max-value--content": "\"最大值\"",
    "--psp-label--rounding-priority--content": "\"舍入优先级\"",
    "--psp-label--rounding-mode--content": "\"舍入模式\"",
    "--psp-label--trailing-zero-display--content": "\"尾零显示\"",
    "--psp-label--fractional-digits--content": "\"小数位\"",
    "--psp-label--significant-digits--content": "\"有效位\"",
    "--psp-label--year--content": "\"年\"",
    "--psp-label--month--content": "\"月\"",
    "--psp-label--day--content": "\"日\"",
    "--psp-label--weekday--content": "\"星期\"",
    "--psp-label--hour--content": "\"小时\"",
    "--psp-label--minute--content": "\"分钟\"",
    "--psp-label--second--content": "\"秒\"",
    "--psp-label--fractional-seconds--content": "\"小数秒\"",
    "--psp-label--hours--content": "\"小时制\"",
    "--psp-label--aggregate-depth--content": "\"聚合层级\"",
    "--psp-label--style-tab--content": "\"样式\"",
    "--psp-label--attributes-tab--content": "\"属性\"",
    "--psp-label--debug-tab--content": "\"调试配置\"",
    "--column-selector-column-columns--content": "\"字段\"",
    "--column-selector-column-x-axis--content": "\"横轴\"",
    "--column-selector-column-y-axis--content": "\"纵轴\"",
    "--column-selector-column-color--content": "\"颜色\"",
    "--column-selector-column-size--content": "\"大小\"",
    "--column-selector-column-symbol--content": "\"标记\"",
    "--column-selector-column-label--content": "\"标签\"",
    "--column-selector-column-tooltip--content": "\"提示\"",
};
const PERSPECTIVE_LOCALIZATION_SELECTOR = [
    "perspective-viewer",
    "perspective-dropdown",
    "perspective-copy-menu",
    "perspective-export-menu",
    "perspective-date-column-style",
    "perspective-datetime-column-style",
    "perspective-number-column-style",
    "perspective-string-column-style",
].join(",");
const PERSPECTIVE_SHADOW_LOCALIZATION_STYLE_ID = "perspective-shadow-localization-css";
const PERSPECTIVE_SHADOW_LOCALIZATION_CSS = `
.group_rollup_wrapper[data-value="Rollup"]::after { content: "折叠汇总 " !important; }
.group_rollup_wrapper[data-value="Flat"]::after { content: "明细展开 " !important; }
.group_rollup_wrapper[data-value="Total"]::after { content: "总计 " !important; }
.column-selector-column[data-label="Columns"]::before { content: "字段" !important; }
.column-selector-column[data-label="X Axis"]::before { content: "横轴" !important; }
.column-selector-column[data-label="Y Axis"]::before { content: "纵轴" !important; }
.column-selector-column[data-label="Color"]::before { content: "颜色" !important; }
.column-selector-column[data-label="Size"]::before { content: "大小" !important; }
.column-selector-column[data-label="Symbol"]::before { content: "标记" !important; }
.column-selector-column[data-label="Label"]::before { content: "标签" !important; }
.column-selector-column[data-label="Tooltip"]::before { content: "提示" !important; }
`;
const perspectiveLocalizationRoots = new WeakSet();
let workbenchGuideSyncScheduled = false;

const state = {
    initialized: false,
    perspectiveReady: null,
    worker: null,
    table: null,
    rows: SAMPLE_ROWS,
    fieldRoles: {},
    fieldRolesCollapsed: false,
    workbenchFocusMode: false,
    calculatedMetricDraft: {
        panelOpen: false,
        name: "",
        formula: "[净收入] / [销量]",
        type: "unit",
        format: "unit",
    },
    calculatedFields: [],
};

function byId(id) {
    return document.getElementById(id);
}

function ensurePerspectiveStyles() {
    [
        ["/vendor/perspective/pro.css", "perspective-pro-css"],
        ["/vendor/perspective/zh.css", "perspective-zh-css"],
    ].forEach(([href, id]) => {
        if (document.getElementById(id)) return;
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = href;
        document.head.appendChild(link);
    });
    ensurePerspectiveLocalizationStyle();
}

function ensurePerspectiveLocalizationStyle() {
    if (document.getElementById("perspective-localization-css")) return;

    const style = document.createElement("style");
    const vars = Object.entries(PERSPECTIVE_LOCALIZATION_VARS)
        .map(([name, value]) => `    ${name}: ${value};`)
        .join("\n");
    style.id = "perspective-localization-css";
    style.textContent = `${PERSPECTIVE_LOCALIZATION_SELECTOR.replaceAll(",", ",\n")} {\n${vars}\n}`;
    document.head.appendChild(style);
}

function applyPerspectiveLocalizationVariables(root = byId("perspective-viewer")) {
    const targets = new Set();

    function collect(node) {
        if (!node) return;

        if (node.host?.style) targets.add(node.host);
        if (node.matches?.(PERSPECTIVE_LOCALIZATION_SELECTOR)) targets.add(node);
        node.querySelectorAll?.(PERSPECTIVE_LOCALIZATION_SELECTOR).forEach((element) => targets.add(element));

        if (node.shadowRoot) collect(node.shadowRoot);
        node.querySelectorAll?.("*").forEach((element) => {
            if (element.shadowRoot) collect(element.shadowRoot);
        });
    }

    collect(root);
    document.querySelectorAll?.(PERSPECTIVE_LOCALIZATION_SELECTOR).forEach(collect);

    targets.forEach((element) => {
        Object.entries(PERSPECTIVE_LOCALIZATION_VARS).forEach(([name, value]) => {
            element.style.setProperty(name, value);
        });
    });
}

function ensurePerspectiveShadowLocalizationStyle(root) {
    if (!root?.host || root.getElementById?.(PERSPECTIVE_SHADOW_LOCALIZATION_STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = PERSPECTIVE_SHADOW_LOCALIZATION_STYLE_ID;
    style.textContent = PERSPECTIVE_SHADOW_LOCALIZATION_CSS;
    root.appendChild(style);
}

function ensurePerspectiveRuntime() {
    if (!state.perspectiveReady) {
        state.perspectiveReady = Promise.all([
            perspective.init_server(fetch("/vendor/perspective/perspective-server.wasm")),
            perspectiveViewer.init_client(fetch("/vendor/perspective/perspective-viewer.wasm")),
            customElements.whenDefined("perspective-viewer"),
            customElements.whenDefined("perspective-viewer-datagrid"),
            customElements.whenDefined("perspective-viewer-d3fc-ybar"),
            customElements.whenDefined("perspective-viewer-d3fc-xyscatter"),
            customElements.whenDefined("perspective-viewer-d3fc-heatmap"),
        ]);
    }

    return state.perspectiveReady;
}

function showMessage(text, type = "success") {
    const area = byId("perspective-message-area");
    if (!area) return;
    const message = document.createElement("div");
    message.className = `message ${type === "error" ? "error" : "success"}`;
    message.textContent = text;
    area.replaceChildren(message);
}

function isTimeDimensionColumn(key) {
    return /月份|年月|期间|日期|month|period|date/i.test(key);
}

function isIdentifierDimensionColumn(key) {
    return /id|编号|编码|代码|sku|code|no\.?$/i.test(key);
}

function normalizeValue(value, key = "") {
    if (value === null || value === undefined) return "";
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (isTimeDimensionColumn(key) || isIdentifierDimensionColumn(key)) return String(value).trim();
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return "";
        if (/^-?\d+(?:\.\d+)?%$/.test(trimmed)) return Number(trimmed.replace("%", "")) / 100;
        if (/^-?\d+(?:\.\d+)?$/.test(trimmed) && !/^0\d+/.test(trimmed)) return Number(trimmed);
        return trimmed;
    }
    return value;
}

function normalizeRows(rows) {
    return rows
        .map((row) => Object.fromEntries(
            Object.entries(row).map(([key, value]) => {
                const columnName = String(key).trim();
                return [columnName, normalizeValue(value, columnName)];
            })
        ))
        .filter((row) => Object.values(row).some((value) => value !== ""));
}

function getColumns(rows) {
    return Array.from(rows.reduce((columns, row) => {
        Object.keys(row).forEach((column) => columns.add(column));
        return columns;
    }, new Set()));
}

function isNumericColumn(rows, column) {
    const values = rows.map((row) => row[column]).filter((value) => value !== "" && value !== null && value !== undefined);
    return values.length > 0 && values.every((value) => typeof value === "number" && Number.isFinite(value));
}

function defaultAggregationForColumn(column) {
    if (/率|单车|均|占比|margin|rate|avg/i.test(column)) return "avg";
    return "sum";
}

function inferFieldRole(rows, column) {
    if (isTimeDimensionColumn(column) || isIdentifierDimensionColumn(column)) {
        return { role: "dimension", aggregation: "sum" };
    }

    if (isNumericColumn(rows, column)) {
        return { role: "metric", aggregation: defaultAggregationForColumn(column) };
    }

    return { role: "dimension", aggregation: "sum" };
}

function inferFieldRoles(rows) {
    const columns = getColumns(rows);
    return Object.fromEntries(columns.map((column) => {
        const inferred = inferFieldRole(rows, column);
        const current = state.fieldRoles[column];
        if (!current) return [column, inferred];
        return [column, {
            ...inferred,
            role: FIELD_ROLE_OPTIONS.includes(current.role) ? current.role : inferred.role,
            aggregation: AGGREGATION_OPTIONS.includes(current.aggregation) ? current.aggregation : inferred.aggregation,
        }];
    }));
}

function classifyColumns(rows) {
    const columns = getColumns(rows);
    const fieldRoles = state.fieldRoles;
    const metrics = columns.filter((column) => fieldRoles[column]?.role === "metric");
    const dimensions = columns.filter((column) => fieldRoles[column]?.role === "dimension");
    return { columns, metrics, dimensions };
}

function pickColumn(candidates, available, fallback) {
    return candidates.find((candidate) => available.includes(candidate)) ?? fallback;
}

function buildAggregates(rows) {
    const { metrics } = classifyColumns(rows);
    return Object.fromEntries(metrics.map((metric) => [metric, state.fieldRoles[metric]?.aggregation ?? defaultAggregationForColumn(metric)]));
}

function buildConfig(rows) {
    const { columns, metrics } = classifyColumns(rows);
    const aggregates = buildAggregates(rows);
    const expressions = buildCalculatedExpressions();
    const expressionColumns = Object.keys(expressions);
    expressionColumns.forEach((column) => {
        const field = state.calculatedFields.find((item) => item.name === column);
        aggregates[column] = field ? inferCalculatedMetricAggregate(field) : "avg";
    });
    const visibleColumns = columns.length ? [...columns] : [...metrics];
    expressionColumns.forEach((column) => {
        if (!visibleColumns.includes(column)) visibleColumns.push(column);
    });

    return {
        title: "BI 工作台",
        plugin: "Datagrid",
        group_by: [],
        split_by: [],
        columns: visibleColumns,
        aggregates,
        expressions,
        sort: [],
        settings: true,
    };
}

function getWorkbenchGuide(plugin) {
    if (plugin && WORKBENCH_GUIDES[plugin]) return WORKBENCH_GUIDES[plugin];
    return WORKBENCH_GUIDES.Datagrid;
}

function renderWorkbenchGuide(plugin = "Datagrid") {
    const guide = byId("perspective-workbench-guide");
    if (!guide) return;

    const guideConfig = getWorkbenchGuide(plugin);
    const title = document.createElement("div");
    const titleLabel = document.createElement("span");
    const titleName = document.createElement("strong");
    const items = document.createElement("div");

    title.className = "workbench-guide-title";
    titleLabel.textContent = "当前图表";
    titleName.textContent = guideConfig.title;
    items.className = "workbench-guide-items";

    const tipNodes = guideConfig.tips.map(([label, text]) => {
        const item = document.createElement("span");
        const itemLabel = document.createElement("b");
        item.className = "workbench-guide-item";
        itemLabel.textContent = label;
        item.append(itemLabel, document.createTextNode(text));
        return item;
    });

    title.append(titleLabel, titleName);
    items.replaceChildren(...tipNodes);
    guide.replaceChildren(title, items);
}

function getActiveWorkbenchPluginFromDom(viewer = byId("perspective-viewer")) {
    return viewer?.shadowRoot
        ?.querySelector("#plugin_selector_container > .plugin-select-item[data-plugin]")
        ?.getAttribute("data-plugin") ?? "";
}

function getWorkbenchPluginFromEvent(event) {
    return typeof event?.detail === "string" ? event.detail : event?.detail?.plugin ?? event?.detail?.name ?? event?.detail?.config?.plugin ?? "";
}

async function syncWorkbenchGuideFromViewer(event) {
    const viewer = byId("perspective-viewer");
    let plugin = getActiveWorkbenchPluginFromDom(viewer) || getWorkbenchPluginFromEvent(event);

    if (!plugin && viewer?.save) {
        try {
            plugin = (await viewer.save())?.plugin;
        } catch (error) {
            console.warn("Perspective chart guide could not read viewer state.", error);
        }
    }

    renderWorkbenchGuide(plugin);
}

async function updateWorkbenchGuideFromViewer(event) {
    await syncWorkbenchGuideFromViewer(event);
}

function scheduleWorkbenchGuideSync(root = byId("perspective-viewer"), event) {
    if (!root && !byId("perspective-viewer")) return;
    if (workbenchGuideSyncScheduled) return;

    workbenchGuideSyncScheduled = true;
    requestAnimationFrame(() => {
        workbenchGuideSyncScheduled = false;
        void updateWorkbenchGuideFromViewer(event);
        setTimeout(() => {
            void updateWorkbenchGuideFromViewer(event);
        }, 80);
    });
}

function bindWorkbenchGuide() {
    const viewer = byId("perspective-viewer");
    if (!viewer || viewer.dataset.workbenchGuideBound === "true") return;

    const syncGuide = (event) => {
        scheduleWorkbenchGuideSync(viewer, event);
    };
    viewer.addEventListener("perspective-config-update", syncGuide);
    viewer.addEventListener("perspective-plugin-update", syncGuide);
    viewer.addEventListener("click", syncGuide, true);
    viewer.addEventListener("keyup", syncGuide, true);
    viewer.dataset.workbenchGuideBound = "true";
}

function translatePerspectiveWorkbenchText(value) {
    if (!value) return "";
    const compact = String(value).replace(/\s+/g, " ").trim();
    return PERSPECTIVE_WORKBENCH_TEXT[compact] ?? "";
}

function replacePerspectiveWorkbenchTextNode(node) {
    const original = node.nodeValue ?? "";
    const replacement = translatePerspectiveWorkbenchText(original);
    if (!replacement) return;

    const leading = original.match(/^\s*/)?.[0] ?? "";
    const trailing = original.match(/\s*$/)?.[0] ?? "";
    node.nodeValue = `${leading}${replacement}${trailing}`;
}

function getPerspectiveWorkbenchRoots(root) {
    const roots = [];
    const visited = new WeakSet();

    function visit(node) {
        if (!node || visited.has(node)) return;
        visited.add(node);
        roots.push(node);

        if (node.shadowRoot) visit(node.shadowRoot);
        node.querySelectorAll?.("*").forEach((element) => {
            if (element.shadowRoot) visit(element.shadowRoot);
        });
    }

    visit(root);
    return roots;
}

function localizePerspectiveWorkbench(root = byId("perspective-viewer")) {
    if (!root || typeof document === "undefined" || !document.createTreeWalker) return;

    ensurePerspectiveLocalizationStyle();
    applyPerspectiveLocalizationVariables(root);

    getPerspectiveWorkbenchRoots(root).forEach((currentRoot) => {
        ensurePerspectiveShadowLocalizationStyle(currentRoot);

        const textNodes = [];
        const textFilter = window.NodeFilter?.SHOW_TEXT ?? 4;
        const walker = document.createTreeWalker(currentRoot, textFilter);
        while (walker.nextNode()) textNodes.push(walker.currentNode);
        textNodes.forEach(replacePerspectiveWorkbenchTextNode);

        currentRoot.querySelectorAll?.("option,optgroup,[aria-label],[title],[placeholder],[label]").forEach((element) => {
            if (element.tagName === "OPTION") {
                const replacement = translatePerspectiveWorkbenchText(element.textContent);
                if (replacement) element.textContent = replacement;
            }

            if (element.tagName === "OPTGROUP") {
                const replacement = translatePerspectiveWorkbenchText(element.getAttribute("label"));
                if (replacement) element.setAttribute("label", replacement);
            }

            ["aria-label", "title", "placeholder", "label"].forEach((attribute) => {
                const replacement = translatePerspectiveWorkbenchText(element.getAttribute(attribute));
                if (replacement) element.setAttribute(attribute, replacement);
            });
        });
    });
}

function observePerspectiveWorkbenchLocalization(root = byId("perspective-viewer")) {
    if (!root || typeof MutationObserver === "undefined") return;

    getPerspectiveWorkbenchRoots(root).forEach((currentRoot) => {
        if (perspectiveLocalizationRoots.has(currentRoot)) return;
        perspectiveLocalizationRoots.add(currentRoot);

        const observer = new MutationObserver(() => {
            localizePerspectiveWorkbench(root);
            scheduleWorkbenchGuideSync(root);
            observePerspectiveWorkbenchLocalization(root);
        });
        observer.observe(currentRoot, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ["aria-label", "title", "placeholder", "label", "data-plugin"],
        });
    });
}

function updateSummary(rows) {
    const { columns, metrics, dimensions } = classifyColumns(rows);
    const summary = byId("perspective-data-summary");
    const status = byId("perspective-data-status");

    if (status) status.textContent = `${rows.length} 行`;
    if (summary) {
        const cards = [
            ["行数", rows.length],
            ["维度", dimensions.length],
            ["指标", metrics.length],
            ["忽略", columns.length - metrics.length - dimensions.length],
        ].map(([label, value]) => {
            const card = document.createElement("div");
            const labelNode = document.createElement("span");
            const valueNode = document.createElement("strong");
            card.className = "summary-card";
            labelNode.textContent = label;
            valueNode.textContent = String(value);
            card.append(labelNode, valueNode);
            return card;
        });
        summary.replaceChildren(...cards);
    }
}

function renderFieldRoleSummary(rows) {
    const panel = byId("perspective-field-role-panel");
    const summary = byId("perspective-field-role-summary");
    const toggle = byId("perspective-field-roles-toggle");
    if (!panel || !summary || !toggle) return;

    const { columns, metrics, dimensions } = classifyColumns(rows);
    const ignored = columns.length - metrics.length - dimensions.length;
    summary.textContent = `${dimensions.length} 个维度 / ${metrics.length} 个指标 / ${ignored} 个忽略`;
    panel.classList.toggle("collapsed", state.fieldRolesCollapsed);
    toggle.textContent = state.fieldRolesCollapsed ? "重新确认字段" : "完成字段确认";
    toggle.setAttribute("aria-expanded", String(!state.fieldRolesCollapsed));
}

function createOption(value, label, selected = false) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = selected;
    return option;
}

function renderFieldRoles(rows) {
    const fieldRoles = byId("perspective-field-roles");
    if (!fieldRoles) return;

    const columns = getColumns(rows);
    const items = columns.map((column) => {
        const config = state.fieldRoles[column] ?? inferFieldRole(rows, column);
        const row = document.createElement("div");
        const fieldName = document.createElement("div");
        const roleSelect = document.createElement("select");
        const aggregateSelect = document.createElement("select");

        row.className = `field-role-row role-${config.role}`;
        fieldName.className = "field-role-name";
        fieldName.textContent = column;

        roleSelect.className = "field-role-select";
        roleSelect.setAttribute("aria-label", `${column} 字段类型`);
        roleSelect.setAttribute("data-role-select", column);
        FIELD_ROLE_OPTIONS.forEach((role) => {
            const option = createOption(role, ROLE_LABELS[role], role === config.role);
            if (role === "metric" && !isNumericColumn(rows, column)) option.disabled = true;
            roleSelect.append(option);
        });

        aggregateSelect.className = "field-role-select";
        aggregateSelect.setAttribute("aria-label", `${column} 聚合方式`);
        aggregateSelect.setAttribute("data-aggregate-select", column);
        AGGREGATION_OPTIONS.forEach((aggregation) => {
            aggregateSelect.append(createOption(aggregation, AGGREGATION_LABELS[aggregation], aggregation === config.aggregation));
        });
        aggregateSelect.disabled = config.role !== "metric";

        row.append(fieldName, roleSelect, aggregateSelect);
        return row;
    });

    fieldRoles.replaceChildren(...items);
    renderFieldRoleSummary(rows);
}

function getMetricColumns(rows) {
    return getColumns(rows).filter((column) => state.fieldRoles[column]?.role === "metric" && isNumericColumn(rows, column));
}

function ensureCalculatedMetricDefaults(rows) {
    const metricColumns = getMetricColumns(rows);
    const draft = state.calculatedMetricDraft;

    const formulaFields = getCalculatedFormulaFields(draft.formula);
    const formulaHasMissingFields = formulaFields.some((field) => !metricColumns.includes(field));
    if (!draft.formula.trim() || formulaHasMissingFields) {
        draft.formula = buildDefaultCalculatedFormula(metricColumns);
    }

    if (!CALCULATED_FORMAT_LABELS[draft.format]) {
        draft.format = "unit";
    }

    if (!CALCULATED_METRIC_TYPE_LABELS[draft.type]) {
        draft.type = "unit";
    }
}

function buildDefaultCalculatedFormula(metricColumns) {
    const numerator = pickColumn(["净收入", "收入", "Revenue", "revenue"], metricColumns, metricColumns[0] ?? "");
    const fallbackDenominator = metricColumns.find((column) => column !== numerator) ?? metricColumns[0] ?? "";
    const denominator = pickColumn(volumeMetricCandidates, metricColumns, fallbackDenominator);

    if (numerator && denominator && numerator !== denominator) return `[${numerator}] / [${denominator}]`;
    return numerator ? `[${numerator}]` : "";
}

function getCalculatedFormulaFields(formula) {
    try {
        return Array.from(new Set(tokenizeCalculatedFormula(formula).filter((token) => token.type === "field").map((token) => token.value)));
    } catch {
        return [];
    }
}

function tokenizeCalculatedFormula(formula) {
    const tokens = [];
    let index = 0;
    let expectValue = true;

    while (index < formula.length) {
        const char = formula[index];
        if (/\s/.test(char)) {
            index += 1;
            continue;
        }

        if (char === "[") {
            const end = formula.indexOf("]", index + 1);
            if (end === -1) throw new Error("字段引用需要用 [字段名] 写完整。");
            const field = formula.slice(index + 1, end).trim();
            if (!field) throw new Error("字段引用不能为空。");
            tokens.push({ type: "field", value: field });
            index = end + 1;
            expectValue = false;
            continue;
        }

        if (/\d|\./.test(char)) {
            const match = formula.slice(index).match(/^\d+(?:\.\d+)?|^\.\d+/);
            if (!match) throw new Error("数字格式不正确。");
            tokens.push({ type: "number", value: Number(match[0]) });
            index += match[0].length;
            expectValue = false;
            continue;
        }

        if (char === "(") {
            tokens.push({ type: "leftParen", value: char });
            index += 1;
            expectValue = true;
            continue;
        }

        if (char === ")") {
            tokens.push({ type: "rightParen", value: char });
            index += 1;
            expectValue = false;
            continue;
        }

        if (calculatedFormulaOperators.has(char)) {
            if (expectValue && char !== "-") throw new Error("运算符前需要有字段或数字。");
            if (expectValue && char === "-") tokens.push({ type: "number", value: 0 });
            tokens.push({ type: "operator", value: char });
            index += 1;
            expectValue = true;
            continue;
        }

        throw new Error(`公式里有无法识别的字符：${char}`);
    }

    if (!tokens.length) throw new Error("请先填写计算公式。");
    if (tokens.at(-1)?.type === "operator") throw new Error("公式不能以运算符结尾。");
    return tokens;
}

function toReversePolishNotation(tokens) {
    const precedence = { "+": 1, "-": 1, "*": 2, "/": 2 };
    const output = [];
    const operators = [];

    tokens.forEach((token) => {
        if (token.type === "number" || token.type === "field") {
            output.push(token);
            return;
        }

        if (token.type === "operator") {
            while (operators.length) {
                const previous = operators.at(-1);
                if (previous.type !== "operator" || precedence[previous.value] < precedence[token.value]) break;
                output.push(operators.pop());
            }
            operators.push(token);
            return;
        }

        if (token.type === "leftParen") {
            operators.push(token);
            return;
        }

        if (token.type === "rightParen") {
            while (operators.length && operators.at(-1).type !== "leftParen") {
                output.push(operators.pop());
            }
            if (!operators.length) throw new Error("括号不匹配。");
            operators.pop();
        }
    });

    while (operators.length) {
        const operator = operators.pop();
        if (operator.type === "leftParen") throw new Error("括号不匹配。");
        output.push(operator);
    }

    return output;
}

function validateCalculatedFormula(rows, field = state.calculatedMetricDraft) {
    const formula = field.formula.trim();
    const metricColumns = getMetricColumns(rows);
    const tokens = tokenizeCalculatedFormula(formula);
    const formulaFields = Array.from(new Set(tokens.filter((token) => token.type === "field").map((token) => token.value)));
    if (!formulaFields.length) throw new Error("公式至少要引用一个指标字段。");

    const missingFields = formulaFields.filter((field) => !metricColumns.includes(field));
    if (missingFields.length) {
        throw new Error(`公式里的字段不是可用指标：${missingFields.join("、")}`);
    }

    return {
        formula,
        formulaFields,
        rpn: toReversePolishNotation(tokens),
    };
}

function createCalculatedFieldId(source, name) {
    return `${source}:${name}`.replace(/\s+/g, "-");
}

function getCalculatedMetricName(field = state.calculatedMetricDraft) {
    return field.name.trim();
}

function hasCalculatedFieldName(name, currentId = "") {
    return state.calculatedFields.some((field) => field.id !== currentId && field.name === name);
}

function validateCalculatedFieldDraft(rows) {
    const name = getCalculatedMetricName();
    if (!name) throw new Error("请先填写指标名称。");
    if (getColumns(rows).includes(name)) throw new Error("计算指标名称不能和已有字段重复。");
    if (hasCalculatedFieldName(name)) throw new Error("计算指标名称不能和已创建字段重复。");

    const { formula } = validateCalculatedFormula(rows, state.calculatedMetricDraft);
    return {
        id: createCalculatedFieldId("custom", `${Date.now()}:${name}`),
        name,
        formula,
        type: state.calculatedMetricDraft.type,
        format: state.calculatedMetricDraft.format,
        source: "custom",
    };
}

function canGenerateCalculatedField(rows) {
    try {
        validateCalculatedFieldDraft(rows);
        return true;
    } catch {
        return false;
    }
}

function updateCalculatedGenerateAvailability(rows) {
    const generateButton = byId("perspective-calculated-generate");
    if (generateButton) generateButton.disabled = !canGenerateCalculatedField(rows);
}

function buildAutoCalculatedFields(rows) {
    const metricColumns = getMetricColumns(rows);
    const denominator = pickColumn(volumeMetricCandidates, metricColumns, "");
    if (!denominator) return [];

    const fields = [];
    unitMetricBlueprints.forEach((blueprint) => {
        const numerator = pickColumn(blueprint.numerators, metricColumns, "");
        if (!numerator) return;
        if (numerator === denominator) return;
        if (getColumns(rows).includes(blueprint.name)) return;
        if (fields.some((field) => field.name === blueprint.name)) return;

        fields.push({
            id: createCalculatedFieldId("auto", blueprint.name),
            name: blueprint.name,
            formula: `[${numerator}] / [${denominator}]`,
            type: "unit",
            format: "unit",
            source: "auto",
        });
    });

    return fields;
}

function escapePerspectiveColumnName(column) {
    return column.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function toPerspectiveExpressionFormula(formula) {
    return tokenizeCalculatedFormula(formula).map((token) => {
        if (token.type === "field") return `"${escapePerspectiveColumnName(token.value)}"`;
        return String(token.value);
    }).join(" ");
}

function inferCalculatedMetricDenominator(field) {
    const tokens = tokenizeCalculatedFormula(field.formula);
    const metricColumns = getMetricColumns(state.rows);

    for (let index = 0; index < tokens.length - 1; index += 1) {
        const token = tokens[index];
        const nextToken = tokens[index + 1];
        if (token.type === "operator" && token.value === "/" && nextToken?.type === "field" && metricColumns.includes(nextToken.value)) {
            return nextToken.value;
        }
    }

    return "";
}

function inferCalculatedMetricAggregate(field) {
    if (field.type === "additive") {
        return "sum";
    }

    try {
        const denominator = inferCalculatedMetricDenominator(field);
        if (denominator) return ["weighted mean", [denominator]];
    } catch {
        return "avg";
    }

    return "avg";
}

function buildCalculatedExpressions() {
    return state.calculatedFields.reduce((expressions, field) => {
        try {
            const { formula } = validateCalculatedFormula(state.rows, field);
            if (!getColumns(state.rows).includes(field.name)) {
                expressions[field.name] = toPerspectiveExpressionFormula(formula);
            }
        } catch {
            return expressions;
        }
        return expressions;
    }, {});
}

function renderCalculatedMetricControls(rows) {
    const panel = byId("perspective-calculated-metric-panel");
    const toggle = byId("perspective-calculated-metric-toggle");
    const nameInput = byId("perspective-calculated-metric-name");
    const formulaInput = byId("perspective-calculated-formula");
    const typeSelect = byId("perspective-calculated-metric-type");
    const formatSelect = byId("perspective-calculated-format");
    const formulaFieldsArea = byId("perspective-calculated-formula-fields");
    const generateButton = byId("perspective-calculated-generate");

    if (!panel || !toggle || !formulaFieldsArea) return;

    ensureCalculatedMetricDefaults(rows);
    const draft = state.calculatedMetricDraft;
    const metricColumns = getMetricColumns(rows);
    const canGenerate = canGenerateCalculatedField(rows);

    panel.classList.toggle("collapsed", !draft.panelOpen);
    toggle.textContent = draft.panelOpen ? "收起字段管理" : "管理计算字段";
    toggle.setAttribute("aria-expanded", String(draft.panelOpen));

    if (nameInput && document.activeElement !== nameInput) {
        nameInput.value = draft.name;
    }
    if (formulaInput && document.activeElement !== formulaInput) {
        formulaInput.value = draft.formula;
    }
    if (typeSelect) typeSelect.value = draft.type;
    if (formatSelect) formatSelect.value = draft.format;
    if (generateButton) generateButton.disabled = !canGenerate;

    const formulaFieldNodes = metricColumns.length
        ? metricColumns.map((field) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "formula-field-chip";
            button.setAttribute("data-calculated-field", field);
            button.textContent = field;
            return button;
        })
        : [document.createTextNode("未识别到可用于公式的数字指标。")];
    formulaFieldsArea.replaceChildren(...formulaFieldNodes);
    renderCalculatedFieldList();
    renderCalculatedMetricStatus();
}

function renderCalculatedFieldList() {
    const list = byId("perspective-calculated-field-list");
    const count = byId("perspective-calculated-field-count");
    if (count) count.textContent = `${state.calculatedFields.length} 个计算字段`;
    if (!list) return;

    if (!state.calculatedFields.length) {
        const empty = document.createElement("div");
        empty.className = "calculated-empty-state";
        empty.textContent = "当前还没有计算字段。上传包含销量和金额的数据后，系统会自动补充常用单车指标。";
        list.replaceChildren(empty);
        return;
    }

    const items = state.calculatedFields.map((field) => {
        const card = document.createElement("article");
        const main = document.createElement("div");
        const top = document.createElement("div");
        const name = document.createElement("strong");
        const source = document.createElement("span");
        const meta = document.createElement("span");
        const formula = document.createElement("code");
        const remove = document.createElement("button");

        card.className = `calculated-field-card source-${field.source}`;
        main.className = "calculated-field-main";
        top.className = "calculated-field-top";
        source.className = "calculated-source-pill";
        meta.className = "calculated-field-meta";
        formula.className = "calculated-field-formula";
        remove.type = "button";
        remove.className = "btn btn-secondary calculated-delete-btn";
        remove.setAttribute("data-calculated-field-remove", field.id);

        name.textContent = field.name;
        source.textContent = field.source === "auto" ? "系统自动" : "手动创建";
        meta.textContent = `${CALCULATED_METRIC_TYPE_LABELS[field.type] ?? "计算指标"} / ${CALCULATED_FORMAT_LABELS[field.format] ?? "数值"}`;
        formula.textContent = field.formula;
        remove.textContent = "删除";

        top.append(name, source);
        main.append(top, meta, formula);
        card.append(main, remove);
        return card;
    });
    list.replaceChildren(...items);
}

function renderCalculatedMetricStatus(message = "", type = "info") {
    const status = byId("perspective-calculated-metric-status");
    if (!status) return;

    status.classList.toggle("error", type === "error");
    status.classList.toggle("success", type !== "error" && state.calculatedFields.length > 0);

    if (message) {
        status.textContent = message;
        return;
    }

    if (state.calculatedFields.length) {
        const autoCount = state.calculatedFields.filter((field) => field.source === "auto").length;
        const customCount = state.calculatedFields.length - autoCount;
        status.textContent = `下方 BI 工作台已可使用 ${state.calculatedFields.length} 个计算字段（自动 ${autoCount} 个，手动 ${customCount} 个）。`;
        return;
    }

    status.textContent = "填写名称和公式后添加到字段池；字段会进入下方 Perspective 工作台，在右侧字段列表中拖拽使用。";
}

function getAnalysisRows(rows) {
    const activeColumns = getColumns(rows).filter((column) => state.fieldRoles[column]?.role !== "ignore");
    return rows.map((row) => Object.fromEntries(activeColumns.map((column) => [column, row[column] ?? ""])));
}

async function reloadViewer(sourceLabel) {
    const viewer = byId("perspective-viewer");
    if (!viewer) return;

    await ensurePerspectiveRuntime();
    state.worker = state.worker ?? await perspective.worker();

    const analysisRows = getAnalysisRows(state.rows);
    const previousTable = state.table;
    const table = await state.worker.table(analysisRows);
    const config = buildConfig(analysisRows);
    state.table = table;
    applyPerspectiveLocalizationVariables(viewer);
    await viewer.load(table);
    applyPerspectiveLocalizationVariables(viewer);
    await viewer.restore(config);
    renderWorkbenchGuide(config.plugin);
    applyPerspectiveLocalizationVariables(viewer);
    observePerspectiveWorkbenchLocalization(viewer);
    localizePerspectiveWorkbench(viewer);
    requestAnimationFrame(() => {
        applyPerspectiveLocalizationVariables(viewer);
        observePerspectiveWorkbenchLocalization(viewer);
        localizePerspectiveWorkbench(viewer);
    });

    try {
        await previousTable?.delete();
    } catch (error) {
        console.warn("Previous Perspective table cleanup was deferred.", error);
    }

    updateSummary(state.rows);
    renderFieldRoles(state.rows);
    renderCalculatedMetricControls(state.rows);
    showMessage(`${sourceLabel}已载入，可以在右侧 Perspective 面板继续分析。`);
}

async function loadRows(rows, sourceLabel = "示例数据") {
    const normalizedRows = normalizeRows(rows);
    if (!normalizedRows.length) {
        showMessage("没有读取到可分析的数据。", "error");
        return;
    }

    state.rows = normalizedRows;
    state.fieldRoles = inferFieldRoles(normalizedRows);
    state.fieldRolesCollapsed = false;
    state.calculatedFields = buildAutoCalculatedFields(normalizedRows);
    state.calculatedMetricDraft.panelOpen = state.calculatedFields.length > 0;
    state.calculatedMetricDraft.name = "";
    await reloadViewer(sourceLabel);
}

async function parseFile(file) {
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "csv") {
        const text = await file.text();
        const workbook = XLSX.read(text, { type: "string", raw: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        return XLSX.utils.sheet_to_json(sheet, { defval: "" });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

async function handleFile(file) {
    try {
        const rows = await parseFile(file);
        await loadRows(rows, file.name);
    } catch (error) {
        console.error(error);
        showMessage("文件读取失败，请确认第一张表包含表头和明细数据。", "error");
    }
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function downloadCsvTemplate() {
    const sheet = XLSX.utils.json_to_sheet(TEMPLATE_ROWS);
    const csv = XLSX.utils.sheet_to_csv(sheet);
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "perspective-bi-template.csv");
}

function downloadXlsxTemplate() {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(TEMPLATE_ROWS);
    XLSX.utils.book_append_sheet(workbook, sheet, "BI数据模板");
    XLSX.writeFile(workbook, "perspective-bi-template.xlsx");
}

function handleFieldRoleChange(event) {
    const select = event.target;
    const field = select?.getAttribute?.("data-role-select");
    if (!field || !FIELD_ROLE_OPTIONS.includes(select.value)) return;

    const current = state.fieldRoles[field] ?? inferFieldRole(state.rows, field);

    if (select.value === "metric" && !isNumericColumn(state.rows, field)) {
        showMessage("这个字段不是纯数字列，不能作为指标。", "error");
        renderFieldRoles(state.rows);
        return;
    }

    state.fieldRoles[field] = {
        ...current,
        role: select.value,
        aggregation: select.value === "metric" ? (current.aggregation ?? defaultAggregationForColumn(field)) : "sum",
    };
    void reloadViewer("字段口径");
}

function handleAggregationChange(event) {
    const select = event.target;
    const field = select?.getAttribute?.("data-aggregate-select");
    if (!field || !AGGREGATION_OPTIONS.includes(select.value)) return;

    const current = state.fieldRoles[field] ?? inferFieldRole(state.rows, field);
    if (current.role !== "metric") {
        renderFieldRoles(state.rows);
        return;
    }

    state.fieldRoles[field] = { ...current, aggregation: select.value };
    void reloadViewer("聚合方式");
}

function toggleCalculatedMetricPanel() {
    state.calculatedMetricDraft.panelOpen = !state.calculatedMetricDraft.panelOpen;
    renderCalculatedMetricControls(state.rows);
}

function handleCalculatedMetricChange(event) {
    const target = event.target;
    if (!target) return;

    if (target.id === "perspective-calculated-metric-name") {
        state.calculatedMetricDraft.name = target.value;
        updateCalculatedGenerateAvailability(state.rows);
        renderCalculatedMetricStatus();
        return;
    }

    if (target.id === "perspective-calculated-formula") {
        state.calculatedMetricDraft.formula = target.value;
        updateCalculatedGenerateAvailability(state.rows);
        renderCalculatedMetricStatus();
        return;
    }

    if (target.id === "perspective-calculated-metric-type" && CALCULATED_METRIC_TYPE_LABELS[target.value]) {
        state.calculatedMetricDraft.type = target.value;
        updateCalculatedGenerateAvailability(state.rows);
        renderCalculatedMetricStatus();
        return;
    }

    if (target.id === "perspective-calculated-format" && CALCULATED_FORMAT_LABELS[target.value]) {
        state.calculatedMetricDraft.format = target.value;
        updateCalculatedGenerateAvailability(state.rows);
        renderCalculatedMetricStatus();
    }
}

async function handleCalculatedMetricGenerate(event) {
    event.preventDefault();
    ensureCalculatedMetricDefaults(state.rows);

    let field;
    try {
        field = validateCalculatedFieldDraft(state.rows);
    } catch (error) {
        renderCalculatedMetricStatus(error.message || "请先确认计算公式。", "error");
        showMessage(error.message || "请先确认计算公式。", "error");
        return;
    }

    state.calculatedFields = [...state.calculatedFields, field];
    state.calculatedMetricDraft.panelOpen = true;
    state.calculatedMetricDraft.name = "";
    renderCalculatedMetricControls(state.rows);
    await reloadViewer("计算指标");
    renderCalculatedMetricStatus(`已加入下方 BI 工作台字段：${field.name}。`);
}

async function handleCalculatedFieldRemove(event) {
    const button = event.target?.closest?.("[data-calculated-field-remove]");
    if (!button) return;
    event.preventDefault();

    const fieldId = button.getAttribute("data-calculated-field-remove");
    const removedField = state.calculatedFields.find((field) => field.id === fieldId);
    if (!removedField) return;

    state.calculatedFields = state.calculatedFields.filter((field) => field.id !== fieldId);
    state.calculatedMetricDraft.panelOpen = true;
    await reloadViewer("计算字段移除");
    renderCalculatedMetricStatus(`已从下方 BI 工作台移除：${removedField.name}。`);
}

function toggleFieldRoles() {
    state.fieldRolesCollapsed = !state.fieldRolesCollapsed;
    renderFieldRoleSummary(state.rows);
}

function refreshWorkbenchSize() {
    requestAnimationFrame(() => {
        window.dispatchEvent(new Event("resize"));
        byId("perspective-viewer")?.notifyResize?.();
    });
}

function toggleWorkbenchFocus() {
    state.workbenchFocusMode = !state.workbenchFocusMode;
    const root = byId("perspective-bi-root");
    const button = byId("perspective-btn-focus-workbench");
    root?.classList.toggle("workspace-focus-mode", state.workbenchFocusMode);
    document.body.classList.toggle("perspective-bi-workspace-focus", state.workbenchFocusMode);
    if (button) {
        button.textContent = state.workbenchFocusMode ? "退出放大" : "放大工作台";
        button.setAttribute("aria-pressed", String(state.workbenchFocusMode));
    }
    refreshWorkbenchSize();
}

function bindFieldRoleControls() {
    byId("perspective-field-roles")?.addEventListener("change", (event) => {
        const target = event.target;
        if (target?.matches?.("[data-role-select]")) {
            handleFieldRoleChange(event);
            return;
        }
        if (target?.matches?.("[data-aggregate-select]")) {
            handleAggregationChange(event);
        }
    });
}

function insertCalculatedFieldReference(field) {
    if (!field) return;
    const input = byId("perspective-calculated-formula");
    const reference = `[${field}]`;
    if (!input) {
        state.calculatedMetricDraft.formula = `${state.calculatedMetricDraft.formula} ${reference}`.trim();
        renderCalculatedMetricControls(state.rows);
        return;
    }

    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const prefix = input.value.slice(0, start);
    const suffix = input.value.slice(end);
    const nextValue = `${prefix}${reference}${suffix}`;
    input.value = nextValue;
    input.focus();
    input.setSelectionRange(start + reference.length, start + reference.length);
    state.calculatedMetricDraft.formula = nextValue;
    renderCalculatedMetricControls(state.rows);
}

function bindCalculatedMetricControls() {
    const panel = byId("perspective-calculated-metric-panel");
    byId("perspective-calculated-metric-toggle")?.addEventListener("click", toggleCalculatedMetricPanel);
    byId("perspective-calculated-generate")?.addEventListener("click", handleCalculatedMetricGenerate);
    panel?.addEventListener("input", (event) => {
        const target = event.target;
        if (target?.matches?.("#perspective-calculated-metric-name, #perspective-calculated-formula")) handleCalculatedMetricChange(event);
    });
    panel?.addEventListener("change", (event) => {
        const target = event.target;
        if (target?.matches?.("#perspective-calculated-metric-type, #perspective-calculated-format")) {
            handleCalculatedMetricChange(event);
        }
    });
    panel?.addEventListener("click", (event) => {
        if (event.target?.closest?.("[data-calculated-field-remove]")) {
            void handleCalculatedFieldRemove(event);
            return;
        }
        const button = event.target?.closest?.("[data-calculated-field]");
        if (!button) return;
        insertCalculatedFieldReference(button.getAttribute("data-calculated-field"));
    });
}

function bindUpload() {
    const input = byId("perspective-file-input");
    const zone = byId("perspective-upload-zone");

    input?.addEventListener("change", (event) => {
        const file = event.target.files?.[0];
        if (file) void handleFile(file);
        event.target.value = "";
    });

    ["dragenter", "dragover"].forEach((eventName) => {
        zone?.addEventListener(eventName, (event) => {
            event.preventDefault();
            zone.classList.add("drag-over");
        });
    });

    ["dragleave", "drop"].forEach((eventName) => {
        zone?.addEventListener(eventName, (event) => {
            event.preventDefault();
            zone.classList.remove("drag-over");
        });
    });

    zone?.addEventListener("drop", (event) => {
        const file = event.dataTransfer?.files?.[0];
        if (file) void handleFile(file);
    });
}

function bindControls() {
    byId("perspective-btn-csv-template")?.addEventListener("click", downloadCsvTemplate);
    byId("perspective-btn-xlsx-template")?.addEventListener("click", downloadXlsxTemplate);
    byId("perspective-field-roles-toggle")?.addEventListener("click", toggleFieldRoles);
    byId("perspective-btn-focus-workbench")?.addEventListener("click", toggleWorkbenchFocus);
}

async function initApp() {
    ensurePerspectiveStyles();
    document.body.classList.remove("perspective-bi-workspace-focus");
    const root = byId("perspective-bi-root");
    if (root?.dataset.controlsBound !== "true") {
        bindUpload();
        bindControls();
        bindFieldRoleControls();
        bindCalculatedMetricControls();
        if (root) root.dataset.controlsBound = "true";
    }
    bindWorkbenchGuide();
    renderWorkbenchGuide("Datagrid");
    applyPerspectiveLocalizationVariables();
    observePerspectiveWorkbenchLocalization();
    localizePerspectiveWorkbench();
    await loadRows(SAMPLE_ROWS, "示例数据");
    state.initialized = true;
}

if (typeof window !== "undefined") {
    window.PerspectiveBIModel = { initApp };
}
