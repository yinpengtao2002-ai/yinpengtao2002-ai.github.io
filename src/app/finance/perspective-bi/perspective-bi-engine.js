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

const state = {
    initialized: false,
    perspectiveReady: null,
    worker: null,
    table: null,
    rows: SAMPLE_ROWS,
    fieldRoles: {},
    fieldRolesCollapsed: false,
    workbenchFocusMode: false,
    workbenchDataset: "raw",
    calculatedRows: [],
    preset: "revenue-by-region",
    calculatedMetric: {
        panelOpen: false,
        generated: false,
        name: "",
        formula: "[净收入] / [销量]",
        type: "unit",
        dimensions: [],
        format: "unit",
    },
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

function classifyCalculatedColumns(rows) {
    const columns = getColumns(rows);
    const metricName = getCalculatedMetricName();
    const metricColumns = columns.filter((column) => column === metricName || /合计$/.test(column));
    const dimensions = columns.filter((column) => !metricColumns.includes(column));
    return { columns, metrics: metricColumns, dimensions };
}

function pickColumn(candidates, available, fallback) {
    return candidates.find((candidate) => available.includes(candidate)) ?? fallback;
}

function buildAggregates(rows) {
    const { metrics } = classifyColumns(rows);
    return Object.fromEntries(metrics.map((metric) => [metric, state.fieldRoles[metric]?.aggregation ?? defaultAggregationForColumn(metric)]));
}

function buildCalculatedAggregates(rows) {
    const { metrics } = classifyCalculatedColumns(rows);
    const metricName = getCalculatedMetricName();
    return Object.fromEntries(metrics.map((metric) => [
        metric,
        metric === metricName ? (state.calculatedMetric.type === "additive" ? "sum" : "avg") : "sum",
    ]));
}

function buildConfig(rows, preset = state.preset) {
    if (state.workbenchDataset === "calculated") {
        return buildCalculatedConfig(rows);
    }

    const { columns, metrics, dimensions } = classifyColumns(rows);
    const month = pickColumn(["月份", "年月", "期间", "Month", "month"], dimensions, dimensions[0]);
    const region = pickColumn(["大区", "区域", "地区", "Region", "region"], dimensions, dimensions[0]);
    const country = pickColumn(["国家", "市场", "Country", "country"], dimensions, dimensions[1] ?? dimensions[0]);
    const model = pickColumn(["车型", "产品", "车系", "Model", "model"], dimensions, dimensions[2] ?? dimensions[0]);
    const revenue = pickColumn(["净收入", "收入", "Revenue", "revenue"], metrics, metrics[0]);
    const margin = pickColumn(["边际总额", "边际", "毛利", "Margin", "margin"], metrics, metrics[1] ?? metrics[0]);
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

    if (preset === "margin-by-region") {
        return {
            title: "边际按区域",
            plugin: "Datagrid",
            group_by: [region, model].filter(Boolean),
            split_by: [],
            columns: [margin ?? revenue].filter(Boolean),
            aggregates,
            sort: margin ? [[margin, "desc"]] : [],
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

function buildCalculatedConfig(rows) {
    const { columns, metrics, dimensions } = classifyCalculatedColumns(rows);
    const metricName = getCalculatedMetricName();
    const columnsForView = [metricName, ...metrics.filter((metric) => metric !== metricName)].filter((column) => columns.includes(column));

    return {
        title: metricName,
        plugin: "Datagrid",
        group_by: dimensions.slice(0, 1),
        split_by: [],
        columns: columnsForView,
        aggregates: buildCalculatedAggregates(rows),
        sort: columns.includes(metricName) ? [[metricName, "desc"]] : [],
        group_rollup_mode: "flat",
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

function getDimensionColumns(rows) {
    return getColumns(rows).filter((column) => state.fieldRoles[column]?.role === "dimension");
}

function ensureCalculatedMetricDefaults(rows) {
    const metricColumns = getMetricColumns(rows);
    const dimensionColumns = getDimensionColumns(rows);
    const calculatedMetric = state.calculatedMetric;

    const formulaFields = getCalculatedFormulaFields(calculatedMetric.formula);
    const formulaHasMissingFields = formulaFields.some((field) => !metricColumns.includes(field));
    if (!calculatedMetric.formula.trim() || formulaHasMissingFields) {
        calculatedMetric.formula = buildDefaultCalculatedFormula(metricColumns);
    }

    calculatedMetric.dimensions = calculatedMetric.dimensions.filter((dimension) => dimensionColumns.includes(dimension));
    if (!calculatedMetric.dimensions.length && dimensionColumns.length) {
        calculatedMetric.dimensions = [pickColumn(["大区", "区域", "地区", "Region", "region"], dimensionColumns, dimensionColumns[0])];
    }

    if (!CALCULATED_FORMAT_LABELS[calculatedMetric.format]) {
        calculatedMetric.format = "unit";
    }

    if (!CALCULATED_METRIC_TYPE_LABELS[calculatedMetric.type]) {
        calculatedMetric.type = "unit";
    }
}

function buildDefaultCalculatedFormula(metricColumns) {
    const numerator = pickColumn(["净收入", "收入", "Revenue", "revenue"], metricColumns, metricColumns[0] ?? "");
    const fallbackDenominator = metricColumns.find((column) => column !== numerator) ?? metricColumns[0] ?? "";
    const denominator = pickColumn(["销量", "销售量", "Volume", "volume"], metricColumns, fallbackDenominator);

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

function buildCalculatedFormulaContext(rows, formulaFields) {
    const context = Object.fromEntries(formulaFields.map((field) => [field, 0]));
    rows.forEach((row) => {
        formulaFields.forEach((field) => {
            const value = row[field];
            if (typeof value === "number" && Number.isFinite(value)) context[field] += value;
        });
    });
    return context;
}

function evaluateCalculatedFormula(rpn, context) {
    const stack = [];

    rpn.forEach((token) => {
        if (token.type === "number") {
            stack.push(token.value);
            return;
        }

        if (token.type === "field") {
            stack.push(context[token.value] ?? 0);
            return;
        }

        const right = stack.pop();
        const left = stack.pop();
        if (left === undefined || right === undefined) throw new Error("公式结构不完整。");

        if (token.value === "+") stack.push(left + right);
        if (token.value === "-") stack.push(left - right);
        if (token.value === "*") stack.push(left * right);
        if (token.value === "/") stack.push(right === 0 ? Number.NaN : left / right);
    });

    if (stack.length !== 1) throw new Error("公式结构不完整。");
    const result = stack[0];
    return typeof result === "number" && Number.isFinite(result) ? result : "";
}

function validateCalculatedFormula(rows) {
    const formula = state.calculatedMetric.formula.trim();
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

function renderCalculatedMetricControls(rows) {
    const panel = byId("perspective-calculated-metric-panel");
    const toggle = byId("perspective-calculated-metric-toggle");
    const nameInput = byId("perspective-calculated-metric-name");
    const formulaInput = byId("perspective-calculated-formula");
    const typeSelect = byId("perspective-calculated-metric-type");
    const formatSelect = byId("perspective-calculated-format");
    const formulaFieldsArea = byId("perspective-calculated-formula-fields");
    const dimensionArea = byId("perspective-calculated-dimensions");
    const generateButton = byId("perspective-calculated-generate");

    if (!panel || !toggle || !dimensionArea || !formulaFieldsArea) return;

    ensureCalculatedMetricDefaults(rows);
    const calculatedMetric = state.calculatedMetric;
    const metricColumns = getMetricColumns(rows);
    const dimensionColumns = getDimensionColumns(rows);
    let canGenerate = false;
    try {
        validateCalculatedFormula(rows);
        canGenerate = true;
    } catch {
        canGenerate = false;
    }

    panel.classList.toggle("collapsed", !calculatedMetric.panelOpen);
    toggle.textContent = calculatedMetric.panelOpen ? "收起计算指标" : "添加计算指标";
    toggle.setAttribute("aria-expanded", String(calculatedMetric.panelOpen));

    if (nameInput && document.activeElement !== nameInput) {
        nameInput.value = calculatedMetric.name;
    }
    if (formulaInput && document.activeElement !== formulaInput) {
        formulaInput.value = calculatedMetric.formula;
    }
    if (typeSelect) typeSelect.value = calculatedMetric.type;
    if (formatSelect) formatSelect.value = calculatedMetric.format;
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

    const dimensionNodes = dimensionColumns.length
        ? dimensionColumns.map((dimension) => {
            const label = document.createElement("label");
            const checkbox = document.createElement("input");
            const text = document.createElement("span");

            label.className = "dimension-chip";
            checkbox.type = "checkbox";
            checkbox.checked = calculatedMetric.dimensions.includes(dimension);
            checkbox.setAttribute("data-calculated-dimension", dimension);
            text.textContent = dimension;
            label.append(checkbox, text);
            return label;
        })
        : [document.createTextNode("未识别到维度，计算结果将按全表汇总。")];
    dimensionArea.replaceChildren(...dimensionNodes);
}

function formatNumber(value) {
    if (value === "" || value === null || value === undefined || Number.isNaN(value)) return "-";
    return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 4 }).format(value);
}

function formatCalculatedValue(value, format) {
    if (value === "" || value === null || value === undefined) return "-";
    if (format === "percent") return `${formatNumber(value * 100)}%`;
    if (format === "unit") return `${formatNumber(value)} 元/台`;
    return formatNumber(value);
}

function getCalculatedMetricName() {
    return state.calculatedMetric.name.trim() || "计算指标";
}

function calculateMetricRows(rows) {
    ensureCalculatedMetricDefaults(rows);
    const { dimensions } = state.calculatedMetric;
    const { formulaFields, rpn } = validateCalculatedFormula(rows);

    const groups = new Map();
    rows.forEach((row) => {
        const dimensionValues = dimensions.map((dimension) => String(row[dimension] ?? ""));
        const key = dimensionValues.length ? dimensionValues.join("\u0001") : "__total__";
        const current = groups.get(key) ?? {
            dimensionValues,
            rows: [],
        };
        current.rows.push(row);
        groups.set(key, current);
    });

    return Array.from(groups.values())
        .map((group) => {
            const fieldTotals = buildCalculatedFormulaContext(group.rows, formulaFields);
            return {
                dimensionValues: group.dimensionValues,
                fieldTotals,
                calculatedValue: evaluateCalculatedFormula(rpn, fieldTotals),
            };
        })
        .sort((a, b) => (b.fieldTotals[formulaFields[0]] ?? 0) - (a.fieldTotals[formulaFields[0]] ?? 0));
}

function buildCalculatedWorkbenchRows(rows) {
    const calculatedRows = calculateMetricRows(rows);
    const { dimensions } = state.calculatedMetric;
    const formulaFields = getCalculatedFormulaFields(state.calculatedMetric.formula);
    const metricName = getCalculatedMetricName();
    const dimensionColumns = dimensions.length ? dimensions : ["范围"];

    return calculatedRows.map((row) => {
        const dimensionValues = dimensions.length ? row.dimensionValues : ["全部"];
        const dimensionEntries = Object.fromEntries(dimensionColumns.map((dimension, index) => [dimension, dimensionValues[index] || "全部"]));
        const formulaFieldEntries = Object.fromEntries(formulaFields.map((field) => [`${field}合计`, row.fieldTotals[field] ?? 0]));
        return {
            ...dimensionEntries,
            ...formulaFieldEntries,
            [metricName]: row.calculatedValue === "" ? null : Number(row.calculatedValue.toFixed(6)),
        };
    });
}

function appendTableCell(row, text, tagName = "td") {
    const cell = document.createElement(tagName);
    cell.textContent = text;
    row.append(cell);
}

function renderCalculatedMetricTable(rows) {
    const host = byId("perspective-calculated-metric-table");
    if (!host) return;

    host.replaceChildren();
    if (!state.calculatedMetric.generated) {
        const empty = document.createElement("div");
        empty.className = "calculated-empty";
        empty.textContent = "填写公式、选择指标分类和分组维度后，可以在这里生成计算结果。";
        host.append(empty);
        return;
    }

    let calculatedRows = [];
    let formulaFields = [];
    try {
        calculatedRows = calculateMetricRows(rows);
        formulaFields = getCalculatedFormulaFields(state.calculatedMetric.formula);
    } catch (error) {
        const empty = document.createElement("div");
        empty.className = "calculated-empty";
        empty.textContent = error.message || "公式暂时无法计算。";
        host.append(empty);
        return;
    }

    const { name, dimensions, format, formula: formulaText, type } = state.calculatedMetric;
    const metricName = name.trim() || "计算指标";
    const formula = document.createElement("div");
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const tbody = document.createElement("tbody");

    formula.className = "calculated-formula";
    formula.textContent = `${metricName}: ${formulaText} · ${CALCULATED_METRIC_TYPE_LABELS[type]} · 字段先汇总后计算`;

    const headers = [
        ...(dimensions.length ? dimensions : ["范围"]),
        ...formulaFields.map((field) => `${field}合计`),
        metricName,
    ];
    headers.forEach((header) => appendTableCell(headerRow, header, "th"));
    thead.append(headerRow);

    calculatedRows.forEach((row) => {
        const tableRow = document.createElement("tr");
        const dimensionValues = dimensions.length ? row.dimensionValues : ["全部"];
        dimensionValues.forEach((value) => appendTableCell(tableRow, value || "-"));
        formulaFields.forEach((field) => appendTableCell(tableRow, formatNumber(row.fieldTotals[field])));
        appendTableCell(tableRow, formatCalculatedValue(row.calculatedValue, format));
        tbody.append(tableRow);
    });

    table.append(thead, tbody);
    host.append(formula, table);
}

function getAnalysisRows(rows) {
    const activeColumns = getColumns(rows).filter((column) => state.fieldRoles[column]?.role !== "ignore");
    return rows.map((row) => Object.fromEntries(activeColumns.map((column) => [column, row[column] ?? ""])));
}

function getWorkbenchRows() {
    if (state.workbenchDataset === "calculated" && state.calculatedRows.length) {
        return state.calculatedRows;
    }

    return getAnalysisRows(state.rows);
}

function renderWorkbenchDatasetControl() {
    const select = byId("perspective-workbench-dataset-select");
    if (!select) return;

    const hasCalculatedRows = state.calculatedRows.length > 0;
    const calculatedOption = select.querySelector('option[value="calculated"]');
    select.value = state.workbenchDataset === "calculated" && hasCalculatedRows ? "calculated" : "raw";
    if (calculatedOption) {
        calculatedOption.disabled = !hasCalculatedRows;
        calculatedOption.textContent = hasCalculatedRows ? `计算指标：${getCalculatedMetricName()}` : "计算指标结果";
    }
}

function invalidateCalculatedWorkbenchRows() {
    const shouldReloadRawWorkbench = state.workbenchDataset === "calculated";
    state.calculatedMetric.generated = false;
    state.calculatedRows = [];
    state.workbenchDataset = "raw";
    renderWorkbenchDatasetControl();
    if (shouldReloadRawWorkbench) void reloadViewer("原始明细");
}

async function reloadViewer(sourceLabel) {
    const viewer = byId("perspective-viewer");
    if (!viewer) return;

    await ensurePerspectiveRuntime();
    state.worker = state.worker ?? await perspective.worker();

    const workbenchRows = getWorkbenchRows();
    const previousTable = state.table;
    const table = await state.worker.table(workbenchRows);
    state.table = table;
    await viewer.load(table);
    await viewer.restore(buildConfig(workbenchRows));

    try {
        await previousTable?.delete();
    } catch (error) {
        console.warn("Previous Perspective table cleanup was deferred.", error);
    }

    updateSummary(state.rows);
    renderFieldRoles(state.rows);
    renderCalculatedMetricControls(state.rows);
    renderCalculatedMetricTable(state.rows);
    renderWorkbenchDatasetControl();
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
    state.workbenchDataset = "raw";
    state.calculatedRows = [];
    state.calculatedMetric.generated = false;
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
    state.calculatedMetric.panelOpen = !state.calculatedMetric.panelOpen;
    renderCalculatedMetricControls(state.rows);
    renderCalculatedMetricTable(state.rows);
}

function handleCalculatedMetricChange(event) {
    const target = event.target;
    if (!target) return;

    if (target.id === "perspective-calculated-metric-name") {
        state.calculatedMetric.name = target.value;
        if (state.calculatedMetric.generated) state.calculatedRows = buildCalculatedWorkbenchRows(state.rows);
        renderWorkbenchDatasetControl();
        if (state.workbenchDataset === "calculated") void reloadViewer("计算指标");
        renderCalculatedMetricTable(state.rows);
        return;
    }

    if (target.id === "perspective-calculated-formula") {
        state.calculatedMetric.formula = target.value;
        invalidateCalculatedWorkbenchRows();
        renderCalculatedMetricTable(state.rows);
        return;
    }

    if (target.id === "perspective-calculated-metric-type" && CALCULATED_METRIC_TYPE_LABELS[target.value]) {
        state.calculatedMetric.type = target.value;
        renderCalculatedMetricTable(state.rows);
        if (state.workbenchDataset === "calculated") void reloadViewer("计算指标口径");
        return;
    }

    if (target.id === "perspective-calculated-format" && CALCULATED_FORMAT_LABELS[target.value]) {
        state.calculatedMetric.format = target.value;
        renderCalculatedMetricTable(state.rows);
        return;
    }

    const dimension = target.getAttribute?.("data-calculated-dimension");
    if (!dimension) return;

    const dimensions = new Set(state.calculatedMetric.dimensions);
    if (target.checked) {
        dimensions.add(dimension);
    } else {
        dimensions.delete(dimension);
    }
    state.calculatedMetric.dimensions = Array.from(dimensions);
    invalidateCalculatedWorkbenchRows();
    renderCalculatedMetricTable(state.rows);
}

async function handleCalculatedMetricGenerate(event) {
    event.preventDefault();
    ensureCalculatedMetricDefaults(state.rows);

    try {
        validateCalculatedFormula(state.rows);
    } catch (error) {
        showMessage(error.message || "请先确认计算公式。", "error");
        return;
    }

    state.calculatedMetric.generated = true;
    state.calculatedMetric.panelOpen = true;
    state.calculatedRows = buildCalculatedWorkbenchRows(state.rows);
    state.workbenchDataset = "calculated";
    renderCalculatedMetricControls(state.rows);
    renderCalculatedMetricTable(state.rows);
    await reloadViewer("计算指标");
}

function handleWorkbenchDatasetChange(event) {
    const value = event.target?.value;
    if (value === "calculated" && !state.calculatedRows.length) {
        state.workbenchDataset = "raw";
        renderWorkbenchDatasetControl();
        return;
    }

    state.workbenchDataset = value === "calculated" ? "calculated" : "raw";
    void reloadViewer(state.workbenchDataset === "calculated" ? "计算指标" : "原始明细");
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
        state.calculatedMetric.formula = `${state.calculatedMetric.formula} ${reference}`.trim();
        invalidateCalculatedWorkbenchRows();
        renderCalculatedMetricControls(state.rows);
        renderCalculatedMetricTable(state.rows);
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
    state.calculatedMetric.formula = nextValue;
    invalidateCalculatedWorkbenchRows();
    renderCalculatedMetricControls(state.rows);
    renderCalculatedMetricTable(state.rows);
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
        if (target?.matches?.("#perspective-calculated-metric-type, #perspective-calculated-format, [data-calculated-dimension]")) {
            handleCalculatedMetricChange(event);
        }
    });
    panel?.addEventListener("click", (event) => {
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
    byId("perspective-btn-reset-view")?.addEventListener("click", () => {
        const viewer = byId("perspective-viewer");
        void viewer?.restore?.(buildConfig(getWorkbenchRows()));
    });
    byId("perspective-preset-select")?.addEventListener("change", (event) => {
        state.preset = event.target.value;
        const viewer = byId("perspective-viewer");
        void viewer?.restore?.(buildConfig(getWorkbenchRows()));
    });
    byId("perspective-workbench-dataset-select")?.addEventListener("change", handleWorkbenchDatasetChange);
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
    await loadRows(SAMPLE_ROWS, "示例数据");
    state.initialized = true;
}

if (typeof window !== "undefined") {
    window.PerspectiveBIModel = { initApp };
}
