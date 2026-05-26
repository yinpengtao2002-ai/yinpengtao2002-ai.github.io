import perspective from "@perspective-dev/client";
import perspectiveViewer from "@perspective-dev/viewer";
import "@perspective-dev/viewer-datagrid";
import "@perspective-dev/viewer-d3fc";
import * as XLSX from "xlsx";

const SAMPLE_ROWS = [
    { 月份: "2026-01", 大区: "欧洲", 国家: "德国", 车型: "Alpha", 渠道: "经销", 销量: 1280, 净收入: 16840, 单车净收入: 13.16, 边际总额: 4120, 单车边际: 3.22, 预算达成率: 0.94 },
    { 月份: "2026-01", 大区: "欧洲", 国家: "法国", 车型: "Alpha", 渠道: "直营", 销量: 960, 净收入: 12620, 单车净收入: 13.15, 边际总额: 2980, 单车边际: 3.1, 预算达成率: 0.9 },
    { 月份: "2026-01", 大区: "拉美", 国家: "巴西", 车型: "Beta", 渠道: "经销", 销量: 1420, 净收入: 15650, 单车净收入: 11.02, 边际总额: 3540, 单车边际: 2.49, 预算达成率: 1.04 },
    { 月份: "2026-02", 大区: "欧洲", 国家: "德国", 车型: "Gamma", 渠道: "经销", 销量: 1360, 净收入: 18940, 单车净收入: 13.93, 边际总额: 4860, 单车边际: 3.57, 预算达成率: 1.02 },
    { 月份: "2026-02", 大区: "中东", 国家: "阿联酋", 车型: "Beta", 渠道: "直营", 销量: 820, 净收入: 10890, 单车净收入: 13.28, 边际总额: 2680, 单车边际: 3.27, 预算达成率: 0.97 },
    { 月份: "2026-02", 大区: "拉美", 国家: "墨西哥", 车型: "Alpha", 渠道: "经销", 销量: 1190, 净收入: 13780, 单车净收入: 11.58, 边际总额: 2910, 单车边际: 2.45, 预算达成率: 0.88 },
    { 月份: "2026-03", 大区: "欧洲", 国家: "西班牙", 车型: "Beta", 渠道: "直营", 销量: 1040, 净收入: 13490, 单车净收入: 12.97, 边际总额: 3310, 单车边际: 3.18, 预算达成率: 0.99 },
    { 月份: "2026-03", 大区: "中东", 国家: "沙特", 车型: "Gamma", 渠道: "经销", 销量: 910, 净收入: 13240, 单车净收入: 14.55, 边际总额: 3860, 单车边际: 4.24, 预算达成率: 1.08 },
    { 月份: "2026-03", 大区: "拉美", 国家: "巴西", 车型: "Gamma", 渠道: "经销", 销量: 1510, 净收入: 18480, 单车净收入: 12.24, 边际总额: 4380, 单车边际: 2.9, 预算达成率: 1.06 },
    { 月份: "2026-04", 大区: "欧洲", 国家: "法国", 车型: "Gamma", 渠道: "直营", 销量: 1120, 净收入: 16130, 单车净收入: 14.4, 边际总额: 4210, 单车边际: 3.76, 预算达成率: 1.03 },
    { 月份: "2026-04", 大区: "中东", 国家: "阿联酋", 车型: "Alpha", 渠道: "经销", 销量: 990, 净收入: 12120, 单车净收入: 12.24, 边际总额: 2860, 单车边际: 2.89, 预算达成率: 0.92 },
    { 月份: "2026-04", 大区: "拉美", 国家: "墨西哥", 车型: "Beta", 渠道: "直营", 销量: 1320, 净收入: 15690, 单车净收入: 11.89, 边际总额: 3620, 单车边际: 2.74, 预算达成率: 1.01 },
];

const TEMPLATE_ROWS = [
    { 月份: "2026-01", 大区: "欧洲", 国家: "德国", 车型: "Alpha", 渠道: "经销", 销量: 1000, 净收入: 12000, 单车净收入: 12, 边际总额: 3200, 单车边际: 3.2, 预算达成率: 0.96 },
    { 月份: "2026-02", 大区: "拉美", 国家: "巴西", 车型: "Beta", 渠道: "直营", 销量: 900, 净收入: 10350, 单车净收入: 11.5, 边际总额: 2520, 单车边际: 2.8, 预算达成率: 1.02 },
];

const state = {
    initialized: false,
    perspectiveReady: null,
    worker: null,
    table: null,
    rows: SAMPLE_ROWS,
    preset: "revenue-by-region",
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

function normalizeValue(value, key = "") {
    if (value === null || value === undefined) return "";
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (isTimeDimensionColumn(key)) return String(value).trim();
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
    return rows.length ? Object.keys(rows[0]) : [];
}

function isNumericColumn(rows, column) {
    const values = rows.map((row) => row[column]).filter((value) => value !== "" && value !== null && value !== undefined);
    return values.length > 0 && values.every((value) => typeof value === "number" && Number.isFinite(value));
}

function classifyColumns(rows) {
    const columns = getColumns(rows);
    const metrics = columns.filter((column) => isNumericColumn(rows, column));
    const dimensions = columns.filter((column) => !metrics.includes(column));
    return { columns, metrics, dimensions };
}

function pickColumn(candidates, available, fallback) {
    return candidates.find((candidate) => available.includes(candidate)) ?? fallback;
}

function buildAggregates(rows) {
    const { metrics } = classifyColumns(rows);
    return Object.fromEntries(metrics.map((metric) => {
        if (/率|单车|均|占比|margin|rate|avg/i.test(metric)) return [metric, "avg"];
        return [metric, "sum"];
    }));
}

function buildConfig(rows, preset = state.preset) {
    const { columns, metrics, dimensions } = classifyColumns(rows);
    const month = pickColumn(["月份", "年月", "期间", "Month", "month"], dimensions, dimensions[0]);
    const region = pickColumn(["大区", "区域", "地区", "Region", "region"], dimensions, dimensions[0]);
    const country = pickColumn(["国家", "市场", "Country", "country"], dimensions, dimensions[1] ?? dimensions[0]);
    const model = pickColumn(["车型", "产品", "车系", "Model", "model"], dimensions, dimensions[2] ?? dimensions[0]);
    const revenue = pickColumn(["净收入", "收入", "Revenue", "revenue"], metrics, metrics[0]);
    const margin = pickColumn(["边际总额", "边际", "毛利", "Margin", "margin"], metrics, metrics[1] ?? metrics[0]);
    const unitRevenue = pickColumn(["单车净收入", "单车收入", "Unit Revenue"], metrics, metrics[0]);
    const unitMargin = pickColumn(["单车边际", "Unit Margin"], metrics, metrics[1] ?? metrics[0]);
    const aggregates = buildAggregates(rows);

    if (preset === "detail-table") {
        return {
            title: "明细透视表",
            plugin: "Datagrid",
            group_by: dimensions.slice(0, 2),
            columns: columns.slice(0, 8),
            aggregates,
            settings: true,
        };
    }

    if (preset === "unit-quality") {
        return {
            title: "单车质量矩阵",
            plugin: "X/Y Scatter",
            group_by: [region, model].filter(Boolean),
            columns: [unitRevenue, unitMargin, revenue].filter(Boolean),
            aggregates,
            settings: true,
        };
    }

    if (preset === "monthly-heatmap") {
        return {
            title: "月份热力图",
            plugin: "Heatmap",
            group_by: [month, region].filter(Boolean),
            split_by: country ? [country] : [],
            columns: [margin ?? revenue].filter(Boolean),
            aggregates,
            settings: true,
        };
    }

    return {
        title: "收入按区域",
        plugin: "Y Bar",
        group_by: [region, model].filter(Boolean),
        split_by: model ? [model] : [],
        columns: [revenue ?? margin].filter(Boolean),
        aggregates,
        sort: revenue ? [[revenue, "desc"]] : [],
        settings: true,
    };
}

function updateSummary(rows) {
    const { columns, metrics, dimensions } = classifyColumns(rows);
    const summary = byId("perspective-data-summary");
    const fieldList = byId("perspective-field-list");
    const status = byId("perspective-data-status");

    if (status) status.textContent = `${rows.length} 行`;
    if (summary) {
        const cards = [
            ["行数", rows.length],
            ["维度", dimensions.length],
            ["指标", metrics.length],
            ["字段", columns.length],
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

    if (fieldList) {
        const fieldPills = [
            ...dimensions.slice(0, 8).map((field) => ({ field, type: "dimension" })),
            ...metrics.slice(0, 8).map((field) => ({ field, type: "metric" })),
        ].map(({ field, type }) => {
            const pill = document.createElement("span");
            pill.className = `field-pill ${type}`;
            pill.textContent = field;
            return pill;
        });
        fieldList.replaceChildren(...fieldPills);
    }
}

async function loadRows(rows, sourceLabel = "示例数据") {
    const viewer = byId("perspective-viewer");
    if (!viewer) return;

    const normalizedRows = normalizeRows(rows);
    if (!normalizedRows.length) {
        showMessage("没有读取到可分析的数据。", "error");
        return;
    }

    await ensurePerspectiveRuntime();
    state.worker = state.worker ?? await perspective.worker();

    const previousTable = state.table;
    const table = await state.worker.table(normalizedRows);
    state.table = table;
    state.rows = normalizedRows;
    await viewer.load(table);
    await viewer.restore(buildConfig(normalizedRows));

    try {
        await previousTable?.delete();
    } catch (error) {
        console.warn("Previous Perspective table cleanup was deferred.", error);
    }

    updateSummary(normalizedRows);
    showMessage(`${sourceLabel}已载入，可以在右侧拖动字段继续分析。`);
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

async function exportCurrentCsv() {
    const viewer = byId("perspective-viewer");
    const view = await viewer?.getView?.();
    if (!view) return;
    const csv = await view.to_csv();
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "perspective-bi-current-view.csv");
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
    byId("perspective-btn-demo")?.addEventListener("click", () => void loadRows(SAMPLE_ROWS, "示例数据"));
    byId("perspective-btn-csv-template")?.addEventListener("click", downloadCsvTemplate);
    byId("perspective-btn-xlsx-template")?.addEventListener("click", downloadXlsxTemplate);
    byId("perspective-btn-export-csv")?.addEventListener("click", () => void exportCurrentCsv());
    byId("perspective-btn-reset-view")?.addEventListener("click", () => {
        const viewer = byId("perspective-viewer");
        void viewer?.restore?.(buildConfig(state.rows));
    });
    byId("perspective-preset-select")?.addEventListener("change", (event) => {
        state.preset = event.target.value;
        const viewer = byId("perspective-viewer");
        void viewer?.restore?.(buildConfig(state.rows));
    });
}

function initSidebar() {
    const root = byId("perspective-bi-root");
    const sidebar = byId("perspective-sidebar");
    const toggle = byId("perspective-sidebar-toggle");
    const expand = byId("perspective-sidebar-expand");
    const backdrop = byId("perspective-sidebar-backdrop");

    const setOpen = (open) => {
        sidebar?.classList.toggle("collapsed", !open);
        backdrop?.classList.toggle("visible", open && window.innerWidth <= 860);
        if (expand) expand.style.display = open ? "none" : "inline-flex";
        toggle?.setAttribute("title", open ? "收起控制台" : "展开控制台");
        toggle?.setAttribute("aria-label", open ? "收起控制台" : "展开控制台");
        root?.classList.toggle("sidebar-open", open);
    };

    toggle?.addEventListener("click", () => setOpen(sidebar?.classList.contains("collapsed") ?? true));
    expand?.addEventListener("click", () => setOpen(true));
    backdrop?.addEventListener("click", () => setOpen(false));
    setOpen(window.innerWidth > 860);
}

async function initApp() {
    ensurePerspectiveStyles();
    initSidebar();
    bindUpload();
    bindControls();
    await loadRows(SAMPLE_ROWS, "示例数据");
    state.initialized = true;
}

if (typeof window !== "undefined") {
    window.PerspectiveBIModel = { initApp };
}
