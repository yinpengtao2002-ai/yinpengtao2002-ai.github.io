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
const DERIVED_METRICS = [
    { field: "单车净收入", numerator: "净收入", denominator: "销量" },
    { field: "单车边际", numerator: "边际总额", denominator: "销量" },
];

const state = {
    initialized: false,
    perspectiveReady: null,
    worker: null,
    table: null,
    rows: SAMPLE_ROWS,
    fieldRoles: {},
    fieldRolesCollapsed: false,
    workbenchFocusMode: false,
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

function safeRatio(numerator, denominator) {
    if (typeof numerator !== "number" || typeof denominator !== "number") return "";
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return "";
    return Number((numerator / denominator).toFixed(4));
}

function enrichDerivedMetrics(rows) {
    return rows.map((row) => {
        const enriched = { ...row };
        DERIVED_METRICS.forEach(({ field, numerator, denominator }) => {
            const value = safeRatio(row[numerator], row[denominator]);
            if (value !== "") enriched[field] = value;
        });
        return enriched;
    });
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

function isDerivedMetric(column) {
    return DERIVED_METRICS.some(({ field }) => field === column);
}

function defaultAggregationForColumn(column) {
    if (/率|单车|均|占比|margin|rate|avg/i.test(column)) return "avg";
    return "sum";
}

function inferFieldRole(rows, column) {
    if (isDerivedMetric(column)) {
        return { role: "metric", aggregation: "avg", derived: true };
    }

    if (isTimeDimensionColumn(column) || isIdentifierDimensionColumn(column)) {
        return { role: "dimension", aggregation: "sum", derived: false };
    }

    if (isNumericColumn(rows, column)) {
        return { role: "metric", aggregation: defaultAggregationForColumn(column), derived: false };
    }

    return { role: "dimension", aggregation: "sum", derived: false };
}

function inferFieldRoles(rows) {
    const columns = getColumns(rows);
    return Object.fromEntries(columns.map((column) => {
        const inferred = inferFieldRole(rows, column);
        const current = state.fieldRoles[column];
        if (!current || inferred.derived) return [column, inferred];
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
        plugin: "Datagrid",
        group_by: [region].filter(Boolean),
        split_by: [],
        columns: [revenue ?? margin].filter(Boolean),
        aggregates,
        sort: revenue ? [[revenue, "desc"]] : [],
        settings: true,
    };
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
    toggle.textContent = state.fieldRolesCollapsed ? "重新确认" : "收起字段";
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
        const note = document.createElement("span");

        row.className = `field-role-row role-${config.role}${config.derived ? " derived" : ""}`;
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
        roleSelect.disabled = config.derived;

        aggregateSelect.className = "field-role-select";
        aggregateSelect.setAttribute("aria-label", `${column} 聚合方式`);
        aggregateSelect.setAttribute("data-aggregate-select", column);
        AGGREGATION_OPTIONS.forEach((aggregation) => {
            aggregateSelect.append(createOption(aggregation, AGGREGATION_LABELS[aggregation], aggregation === config.aggregation));
        });
        aggregateSelect.disabled = config.role !== "metric" || config.derived;

        note.className = "field-role-note";
        note.textContent = config.derived ? "派生指标" : ROLE_LABELS[config.role];

        row.append(fieldName, roleSelect, aggregateSelect, note);
        return row;
    });

    fieldRoles.replaceChildren(...items);
    renderFieldRoleSummary(rows);
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
    state.table = table;
    await viewer.load(table);
    await viewer.restore(buildConfig(analysisRows));

    try {
        await previousTable?.delete();
    } catch (error) {
        console.warn("Previous Perspective table cleanup was deferred.", error);
    }

    updateSummary(state.rows);
    renderFieldRoles(state.rows);
    showMessage(`${sourceLabel}已载入，可以在右侧 Perspective 面板继续分析。`);
}

async function loadRows(rows, sourceLabel = "示例数据") {
    const normalizedRows = enrichDerivedMetrics(normalizeRows(rows));
    if (!normalizedRows.length) {
        showMessage("没有读取到可分析的数据。", "error");
        return;
    }

    state.rows = normalizedRows;
    state.fieldRoles = inferFieldRoles(normalizedRows);
    state.fieldRolesCollapsed = false;
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

async function exportCurrentCsv() {
    const viewer = byId("perspective-viewer");
    const view = await viewer?.getView?.();
    if (!view) return;
    const csv = await view.to_csv();
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "perspective-bi-current-view.csv");
}

function handleFieldRoleChange(event) {
    const select = event.target;
    const field = select?.getAttribute?.("data-role-select");
    if (!field || !FIELD_ROLE_OPTIONS.includes(select.value)) return;

    const current = state.fieldRoles[field] ?? inferFieldRole(state.rows, field);
    if (current.derived) {
        renderFieldRoles(state.rows);
        return;
    }

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
    if (current.derived || current.role !== "metric") {
        renderFieldRoles(state.rows);
        return;
    }

    state.fieldRoles[field] = { ...current, aggregation: select.value };
    void reloadViewer("聚合方式");
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
    byId("perspective-field-roles-toggle")?.addEventListener("click", toggleFieldRoles);
    byId("perspective-btn-focus-workbench")?.addEventListener("click", toggleWorkbenchFocus);
    byId("perspective-btn-reset-view")?.addEventListener("click", () => {
        const viewer = byId("perspective-viewer");
        void viewer?.restore?.(buildConfig(getAnalysisRows(state.rows)));
    });
    byId("perspective-preset-select")?.addEventListener("change", (event) => {
        state.preset = event.target.value;
        const viewer = byId("perspective-viewer");
        void viewer?.restore?.(buildConfig(getAnalysisRows(state.rows)));
    });
}

async function initApp() {
    ensurePerspectiveStyles();
    const root = byId("perspective-bi-root");
    if (root?.dataset.controlsBound !== "true") {
        bindUpload();
        bindControls();
        bindFieldRoleControls();
        if (root) root.dataset.controlsBound = "true";
    }
    await loadRows(SAMPLE_ROWS, "示例数据");
    state.initialized = true;
}

if (typeof window !== "undefined") {
    window.PerspectiveBIModel = { initApp };
}
