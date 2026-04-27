/**
 * 企业 FBP 利润桥敏感性分析 - standalone browser tool.
 * Scope is intentionally limited to public/tools/sensitivity-analysis.
 */

const DRIVER_DEFINITIONS = [
    {
        key: "revenue",
        name: "收入",
        unit: "亿元",
        kind: "amount",
        step: 1,
        defaultValue: 1500,
        defaultRange: 150,
        impact: "positive",
        description: "含返利前的收入总额"
    },
    {
        key: "rebate",
        name: "返利",
        unit: "亿元",
        kind: "amount",
        step: 1,
        defaultValue: 180,
        defaultRange: 30,
        impact: "negative",
        description: "收入扣减项，收入减返利得到净收入"
    },
    {
        key: "materialCost",
        name: "材料成本",
        unit: "亿元",
        kind: "amount",
        step: 1,
        defaultValue: 780,
        defaultRange: 60,
        impact: "negative",
        description: "净收入下的直接材料成本"
    },
    {
        key: "variableManufacturingCost",
        name: "变动制造费用",
        unit: "亿元",
        kind: "amount",
        step: 1,
        defaultValue: 90,
        defaultRange: 15,
        impact: "negative",
        description: "随产销量变化的制造费用"
    },
    {
        key: "variableSalesCost",
        name: "变动销售费用等",
        unit: "亿元",
        kind: "amount",
        step: 1,
        defaultValue: 80,
        defaultRange: 15,
        impact: "negative",
        description: "随销售规模变化的销售费用等"
    },
    {
        key: "techDevelopmentFee",
        name: "技术开发费",
        unit: "亿元",
        kind: "amount",
        step: 1,
        defaultValue: 45,
        defaultRange: 10,
        impact: "negative",
        description: "固定口径下的技术开发投入"
    },
    {
        key: "internationalFixedCost",
        name: "国际固定费用",
        unit: "亿元",
        kind: "amount",
        step: 1,
        defaultValue: 35,
        defaultRange: 8,
        impact: "negative",
        description: "国际业务固定费用"
    },
    {
        key: "depreciationAmortization",
        name: "折旧加摊销",
        unit: "亿元",
        kind: "amount",
        step: 1,
        defaultValue: 42,
        defaultRange: 8,
        impact: "negative",
        description: "固定资产折旧与无形资产摊销"
    },
    {
        key: "backOfficeSharedCost",
        name: "后台公共费用",
        unit: "亿元",
        kind: "amount",
        step: 1,
        defaultValue: 55,
        defaultRange: 10,
        impact: "negative",
        description: "后台职能和公共分摊费用"
    },
    {
        key: "otherBusinessProfit",
        name: "其他业务利润",
        unit: "亿元",
        kind: "amount",
        step: 1,
        defaultValue: 18,
        defaultRange: 8,
        impact: "positive",
        description: "其他业务贡献的利润"
    },
    {
        key: "sparePartsProfit",
        name: "备件利润",
        unit: "亿元",
        kind: "amount",
        step: 1,
        defaultValue: 25,
        defaultRange: 8,
        impact: "positive",
        description: "备件业务贡献的利润"
    },
    {
        key: "subsidiaryProfit",
        name: "子公司利润",
        unit: "亿元",
        kind: "amount",
        step: 1,
        defaultValue: 12,
        defaultRange: 6,
        impact: "positive",
        description: "纳入本口径的子公司利润"
    }
];

const METRIC_DEFINITIONS = {
    profit: { label: "利润", unit: "amount", decimals: 1 },
    contributionMargin: { label: "边际总额", unit: "amount", decimals: 1 },
    netRevenue: { label: "净收入", unit: "amount", decimals: 1 },
    revenue: { label: "收入", unit: "amount", decimals: 1 },
    contributionMarginRate: { label: "边际率", unit: "%", decimals: 1 },
    profitRate: { label: "利润率", unit: "%", decimals: 1 }
};

const SCENARIO_LABELS = {
    bear: "悲观",
    base: "基准",
    bull: "乐观"
};

const AppState = {
    assumptions: getDefaultAssumptions(),
    ranges: getDefaultRanges(),
    scenarioOverrides: null,
    metric: "profit",
    displayUnit: "亿",
    xDriver: "revenue",
    yDriver: "materialCost",
    matrixSteps: 7
};

const driverByKey = Object.fromEntries(DRIVER_DEFINITIONS.map((driver) => [driver.key, driver]));

function getDefaultAssumptions() {
    return Object.fromEntries(DRIVER_DEFINITIONS.map((driver) => [driver.key, driver.defaultValue]));
}

function getDefaultRanges() {
    return Object.fromEntries(DRIVER_DEFINITIONS.map((driver) => [driver.key, driver.defaultRange]));
}

function clampNumber(value, min, max) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return min;
    return Math.min(max, Math.max(min, numeric));
}

function round(value, digits = 2) {
    if (!Number.isFinite(value)) return 0;
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function percentOf(value, denominator) {
    return denominator === 0 ? 0 : (value / denominator) * 100;
}

function sanitizeAssumptions(assumptions) {
    const next = { ...assumptions };
    DRIVER_DEFINITIONS.forEach((driver) => {
        next[driver.key] = Number(next[driver.key] || 0);
    });
    next.revenue = Math.max(0, next.revenue);
    next.rebate = Math.max(0, next.rebate);
    next.materialCost = Math.max(0, next.materialCost);
    next.variableManufacturingCost = Math.max(0, next.variableManufacturingCost);
    next.variableSalesCost = Math.max(0, next.variableSalesCost);
    next.techDevelopmentFee = Math.max(0, next.techDevelopmentFee);
    next.internationalFixedCost = Math.max(0, next.internationalFixedCost);
    next.depreciationAmortization = Math.max(0, next.depreciationAmortization);
    next.backOfficeSharedCost = Math.max(0, next.backOfficeSharedCost);
    return next;
}

function computeModel(assumptions) {
    const a = sanitizeAssumptions(assumptions);
    const netRevenue = a.revenue - a.rebate;
    const variableCostTotal = a.materialCost + a.variableManufacturingCost + a.variableSalesCost;
    const contributionMargin = netRevenue - variableCostTotal;
    const fixedDeductionTotal = (
        a.techDevelopmentFee +
        a.internationalFixedCost +
        a.depreciationAmortization +
        a.backOfficeSharedCost
    );
    const profitAdditionTotal = (
        a.otherBusinessProfit +
        a.sparePartsProfit +
        a.subsidiaryProfit
    );
    const profit = contributionMargin - fixedDeductionTotal + profitAdditionTotal;

    return {
        ...a,
        netRevenue,
        rebateRate: percentOf(a.rebate, a.revenue),
        materialCostRate: percentOf(a.materialCost, netRevenue),
        variableManufacturingCostRate: percentOf(a.variableManufacturingCost, netRevenue),
        variableSalesCostRate: percentOf(a.variableSalesCost, netRevenue),
        variableCostTotal,
        variableCostRate: percentOf(variableCostTotal, netRevenue),
        contributionMargin,
        contributionMarginRate: percentOf(contributionMargin, netRevenue),
        fixedDeductionTotal,
        profitAdditionTotal,
        profit,
        profitRate: percentOf(profit, netRevenue)
    };
}

function getMetricDefinition(metricKey = AppState.metric) {
    return METRIC_DEFINITIONS[metricKey] || METRIC_DEFINITIONS.profit;
}

function getMetricValue(result, metricKey = AppState.metric) {
    return Number(result[metricKey] || 0);
}

function formatNumber(value, decimals = 1) {
    if (!Number.isFinite(value)) return "-";
    return Number(value).toLocaleString("zh-CN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function formatAmount(value, decimals = 1) {
    const multiplier = AppState.displayUnit === "百万" ? 100 : 1;
    const unit = AppState.displayUnit === "百万" ? "百万元" : "亿元";
    return `${formatNumber(value * multiplier, decimals)} ${unit}`;
}

function formatMetric(value, metricKey = AppState.metric) {
    const definition = getMetricDefinition(metricKey);
    if (definition.unit === "amount") return formatAmount(value, definition.decimals);
    if (definition.unit === "%") return `${formatNumber(value, definition.decimals)}%`;
    return formatNumber(value, definition.decimals);
}

function formatDriverValue(key, value) {
    const driver = driverByKey[key];
    if (!driver) return formatNumber(value, 2);
    return `${formatNumber(value, driver.step < 1 ? 1 : 0)} ${driver.unit}`;
}

function getScenarioValue(key, scenario) {
    if (scenario === "base") return AppState.assumptions[key];
    const driver = driverByKey[key];
    const baseValue = AppState.assumptions[key];
    const imported = AppState.scenarioOverrides?.[scenario]?.[key];
    if (Number.isFinite(imported)) return imported;

    const range = Math.abs(Number(AppState.ranges[key] || 0));
    if (scenario === "bear") {
        return driver.impact === "negative" ? baseValue + range : baseValue - range;
    }
    return driver.impact === "negative" ? baseValue - range : baseValue + range;
}

function buildScenarioAssumptions(scenario) {
    const assumptions = { ...AppState.assumptions };
    DRIVER_DEFINITIONS.forEach((driver) => {
        assumptions[driver.key] = getScenarioValue(driver.key, scenario);
    });
    return sanitizeAssumptions(assumptions);
}

function calculateSensitivityRows() {
    const baseResult = computeModel(AppState.assumptions);
    const baseMetric = getMetricValue(baseResult);

    return DRIVER_DEFINITIONS.map((driver) => {
        const range = Math.abs(Number(AppState.ranges[driver.key] || 0));
        const lowAssumptions = sanitizeAssumptions({
            ...AppState.assumptions,
            [driver.key]: AppState.assumptions[driver.key] - range
        });
        const highAssumptions = sanitizeAssumptions({
            ...AppState.assumptions,
            [driver.key]: AppState.assumptions[driver.key] + range
        });
        const lowMetric = getMetricValue(computeModel(lowAssumptions));
        const highMetric = getMetricValue(computeModel(highAssumptions));

        return {
            key: driver.key,
            name: driver.name,
            lowValue: lowAssumptions[driver.key],
            highValue: highAssumptions[driver.key],
            lowMetric,
            baseMetric,
            highMetric,
            lowDelta: lowMetric - baseMetric,
            highDelta: highMetric - baseMetric,
            swing: Math.abs(highMetric - lowMetric)
        };
    }).sort((a, b) => b.swing - a.swing);
}

function sequenceAround(baseValue, range, steps) {
    if (steps <= 1 || range === 0) return [baseValue];
    const values = [];
    const start = baseValue - range;
    const step = (range * 2) / (steps - 1);
    for (let index = 0; index < steps; index++) {
        values.push(start + step * index);
    }
    return values;
}

function createMatrixData() {
    const xKey = AppState.xDriver;
    const yKey = AppState.yDriver;
    const steps = clampNumber(AppState.matrixSteps, 5, 9);
    const xValues = sequenceAround(
        Number(AppState.assumptions[xKey] || 0),
        Math.abs(Number(AppState.ranges[xKey] || 0)),
        steps
    );
    const yValues = sequenceAround(
        Number(AppState.assumptions[yKey] || 0),
        Math.abs(Number(AppState.ranges[yKey] || 0)),
        steps
    );

    const z = yValues.map((yValue) => (
        xValues.map((xValue) => {
            const assumptions = sanitizeAssumptions({
                ...AppState.assumptions,
                [xKey]: xValue,
                [yKey]: yValue
            });
            return getMetricValue(computeModel(assumptions));
        })
    ));

    return { xKey, yKey, xValues, yValues, z };
}

function initApp() {
    renderControlInputs();
    initControlEvents();
    initFileUpload();
    initResponsiveSidebar();
    renderAll();
}

function renderControlInputs() {
    const assumptionsContainer = document.getElementById("assumption-inputs");
    const rangesContainer = document.getElementById("range-inputs");
    const xSelect = document.getElementById("x-driver-select");
    const ySelect = document.getElementById("y-driver-select");

    assumptionsContainer.innerHTML = DRIVER_DEFINITIONS.map((driver) => `
        <label class="field" for="input-${driver.key}">
            <span>${driver.name}</span>
            <input
                id="input-${driver.key}"
                class="input assumption-input"
                type="number"
                step="${driver.step}"
                data-key="${driver.key}"
                value="${AppState.assumptions[driver.key]}"
            >
            <small class="field-note">${driver.unit}｜${driver.description}</small>
        </label>
    `).join("");

    rangesContainer.innerHTML = DRIVER_DEFINITIONS.map((driver) => `
        <label class="field" for="range-${driver.key}">
            <span>${driver.name}</span>
            <input
                id="range-${driver.key}"
                class="input range-input"
                type="number"
                min="0"
                step="${driver.step}"
                data-key="${driver.key}"
                value="${AppState.ranges[driver.key]}"
            >
            <small class="field-note">冲击幅度，单位同该科目</small>
        </label>
    `).join("");

    const options = DRIVER_DEFINITIONS.map((driver) => (
        `<option value="${driver.key}">${driver.name}</option>`
    )).join("");
    xSelect.innerHTML = options;
    ySelect.innerHTML = options;
    xSelect.value = AppState.xDriver;
    ySelect.value = AppState.yDriver;
}

function initControlEvents() {
    document.getElementById("metric-select").addEventListener("change", (event) => {
        AppState.metric = event.target.value;
        renderAll();
    });
    document.getElementById("unit-select").addEventListener("change", (event) => {
        AppState.displayUnit = event.target.value;
        renderAll();
    });
    document.getElementById("x-driver-select").addEventListener("change", (event) => {
        AppState.xDriver = event.target.value;
        if (AppState.xDriver === AppState.yDriver) {
            AppState.yDriver = DRIVER_DEFINITIONS.find((driver) => driver.key !== AppState.xDriver).key;
            document.getElementById("y-driver-select").value = AppState.yDriver;
        }
        renderAll();
    });
    document.getElementById("y-driver-select").addEventListener("change", (event) => {
        AppState.yDriver = event.target.value;
        if (AppState.xDriver === AppState.yDriver) {
            AppState.xDriver = DRIVER_DEFINITIONS.find((driver) => driver.key !== AppState.yDriver).key;
            document.getElementById("x-driver-select").value = AppState.xDriver;
        }
        renderAll();
    });
    document.getElementById("matrix-steps").addEventListener("change", (event) => {
        AppState.matrixSteps = Number(event.target.value);
        renderAll();
    });
    document.getElementById("btn-reset").addEventListener("click", resetModel);
    document.getElementById("btn-demo").addEventListener("click", () => {
        resetModel();
        showMessage("success", "已加载利润桥示例数据。");
    });
    document.getElementById("btn-csv-template").addEventListener("click", () => downloadTemplate("csv"));
    document.getElementById("btn-xlsx-template").addEventListener("click", () => downloadTemplate("xlsx"));
    document.getElementById("btn-download-results").addEventListener("click", downloadResultsWorkbook);
    document.getElementById("sidebar-toggle").addEventListener("click", () => toggleSidebar(true));
    document.getElementById("sidebar-expand").addEventListener("click", () => toggleSidebar(false));

    document.querySelectorAll(".assumption-input").forEach((input) => {
        input.addEventListener("input", (event) => {
            const key = event.target.dataset.key;
            AppState.assumptions[key] = Number(event.target.value);
            AppState.scenarioOverrides = null;
            renderAll();
        });
    });

    document.querySelectorAll(".range-input").forEach((input) => {
        input.addEventListener("input", (event) => {
            const key = event.target.dataset.key;
            AppState.ranges[key] = Math.abs(Number(event.target.value || 0));
            AppState.scenarioOverrides = null;
            renderAll();
        });
    });
}

function initFileUpload() {
    const uploadZone = document.getElementById("upload-zone");
    const fileInput = document.getElementById("file-input");

    uploadZone.addEventListener("dragover", (event) => {
        event.preventDefault();
        uploadZone.classList.add("drag-over");
    });
    uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("drag-over"));
    uploadZone.addEventListener("drop", (event) => {
        event.preventDefault();
        uploadZone.classList.remove("drag-over");
        const file = event.dataTransfer.files[0];
        if (file) handleFile(file);
    });
    fileInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) handleFile(file);
        event.target.value = "";
    });
}

function handleFile(file) {
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith(".csv")) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                applyImportedRows(parseCsv(event.target.result));
                showMessage("success", `已导入 ${file.name}。`);
            } catch (error) {
                showMessage("error", `导入失败：${error.message}`);
            }
        };
        reader.readAsText(file);
        return;
    }

    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const workbook = XLSX.read(new Uint8Array(event.target.result), { type: "array" });
                const sheetName = workbook.SheetNames.includes("Assumptions")
                    ? "Assumptions"
                    : workbook.SheetNames[0];
                const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
                applyImportedRows(rows);
                showMessage("success", `已导入 ${file.name}。`);
            } catch (error) {
                showMessage("error", `导入失败：${error.message}`);
            }
        };
        reader.readAsArrayBuffer(file);
        return;
    }

    showMessage("error", "请上传 CSV、XLSX 或 XLS 文件。");
}

function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let insideQuotes = false;

    for (let index = 0; index < text.length; index++) {
        const char = text[index];
        const next = text[index + 1];
        if (char === '"' && insideQuotes && next === '"') {
            cell += '"';
            index++;
        } else if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === "," && !insideQuotes) {
            row.push(cell);
            cell = "";
        } else if ((char === "\n" || char === "\r") && !insideQuotes) {
            if (char === "\r" && next === "\n") index++;
            row.push(cell);
            if (row.some((value) => String(value).trim() !== "")) rows.push(row);
            row = [];
            cell = "";
        } else {
            cell += char;
        }
    }

    row.push(cell);
    if (row.some((value) => String(value).trim() !== "")) rows.push(row);
    if (rows.length === 0) return [];

    const headers = rows[0].map((header) => String(header).trim());
    return rows.slice(1).map((values) => {
        const item = {};
        headers.forEach((header, index) => {
            item[header] = values[index] ?? "";
        });
        return item;
    });
}

function applyImportedRows(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error("文件中没有可读取的数据行");
    }

    const nextAssumptions = { ...AppState.assumptions };
    const nextRanges = { ...AppState.ranges };
    const nextScenarios = { bear: {}, base: {}, bull: {} };
    let matched = 0;
    let hasScenarioValues = false;

    rows.forEach((row) => {
        const driver = findDriverFromRow(row);
        if (!driver) return;
        matched++;

        const value = normalizeImportedValue(driver, getCell(row, ["Value", "Base", "基准值", "数值", "假设值"]));
        const range = normalizeImportedValue(driver, getCell(row, ["Range", "Sensitivity Range", "敏感性幅度", "冲击范围", "幅度"]));
        const bear = normalizeImportedValue(driver, getCell(row, ["Bear", "Downside", "悲观", "悲观情景"]));
        const base = normalizeImportedValue(driver, getCell(row, ["Base", "基准", "基准情景"]));
        const bull = normalizeImportedValue(driver, getCell(row, ["Bull", "Upside", "乐观", "乐观情景"]));

        if (Number.isFinite(value)) nextAssumptions[driver.key] = value;
        if (Number.isFinite(range)) nextRanges[driver.key] = Math.abs(range);
        if (Number.isFinite(bear)) {
            nextScenarios.bear[driver.key] = bear;
            hasScenarioValues = true;
        }
        if (Number.isFinite(base)) {
            nextScenarios.base[driver.key] = base;
            nextAssumptions[driver.key] = base;
            hasScenarioValues = true;
        }
        if (Number.isFinite(bull)) {
            nextScenarios.bull[driver.key] = bull;
            hasScenarioValues = true;
        }
    });

    if (matched === 0) {
        throw new Error("没有识别到模板中的 Key 或变量名称");
    }

    AppState.assumptions = sanitizeAssumptions(nextAssumptions);
    AppState.ranges = nextRanges;
    AppState.scenarioOverrides = hasScenarioValues ? nextScenarios : null;
    refreshInputValues();
    renderAll();
}

function canonical(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[\s_（）()：:./-]/g, "");
}

function getCell(row, candidates) {
    const entries = Object.entries(row);
    const candidateSet = new Set(candidates.map(canonical));
    for (const [key, value] of entries) {
        if (candidateSet.has(canonical(key))) return value;
    }
    return "";
}

function findDriverFromRow(row) {
    const keyCell = getCell(row, ["Key", "Variable", "Code", "变量代码", "代码", "字段"]);
    const nameCell = getCell(row, ["Name", "Variable Name", "变量", "变量名称", "名称", "科目"]);
    const key = canonical(keyCell);
    const name = canonical(nameCell);
    return DRIVER_DEFINITIONS.find((driver) => (
        canonical(driver.key) === key ||
        canonical(driver.name) === name ||
        canonical(driver.key) === name ||
        canonical(driver.name) === key
    ));
}

function parseNumeric(value) {
    if (value === null || value === undefined || value === "") return NaN;
    if (typeof value === "number") return value;
    const cleaned = String(value)
        .trim()
        .replace(/,/g, "")
        .replace(/%/g, "")
        .replace(/亿元|百万元|万元|元/g, "");
    if (cleaned === "") return NaN;
    return Number(cleaned);
}

function normalizeImportedValue(driver, value) {
    const numeric = parseNumeric(value);
    if (!Number.isFinite(numeric)) return NaN;
    if (driver.kind === "percent" && Math.abs(numeric) > 0 && Math.abs(numeric) <= 1) {
        return numeric * 100;
    }
    return numeric;
}

function refreshInputValues() {
    document.querySelectorAll(".assumption-input").forEach((input) => {
        input.value = AppState.assumptions[input.dataset.key];
    });
    document.querySelectorAll(".range-input").forEach((input) => {
        input.value = AppState.ranges[input.dataset.key];
    });
    document.getElementById("metric-select").value = AppState.metric;
    document.getElementById("unit-select").value = AppState.displayUnit;
    document.getElementById("x-driver-select").value = AppState.xDriver;
    document.getElementById("y-driver-select").value = AppState.yDriver;
    document.getElementById("matrix-steps").value = AppState.matrixSteps;
}

function renderAll() {
    AppState.assumptions = sanitizeAssumptions(AppState.assumptions);
    const result = computeModel(AppState.assumptions);
    renderMetrics(result);
    renderTornadoChart();
    renderScenarioChart();
    renderMatrixChart();
    renderBridgeChart(result);
    renderProfitTable(result);
    renderSensitivityTable();
}

function renderMetrics(result) {
    const cards = [
        {
            label: "收入",
            value: formatAmount(result.revenue, 1),
            sub: `返利 ${formatAmount(result.rebate, 1)}，返利率 ${formatNumber(result.rebateRate, 1)}%`
        },
        {
            label: "净收入",
            value: formatAmount(result.netRevenue, 1),
            sub: "收入减返利"
        },
        {
            label: "边际总额",
            value: formatAmount(result.contributionMargin, 1),
            sub: `边际率 ${formatNumber(result.contributionMarginRate, 1)}%`
        },
        {
            label: "利润",
            value: formatAmount(result.profit, 1),
            sub: `利润率 ${formatNumber(result.profitRate, 1)}%`
        },
        {
            label: "固定扣减项",
            value: formatAmount(result.fixedDeductionTotal, 1),
            sub: `利润加回项 ${formatAmount(result.profitAdditionTotal, 1)}`
        }
    ];

    document.getElementById("metrics-grid").innerHTML = cards.map((card) => `
        <div class="metric-card">
            <div class="metric-label">${card.label}</div>
            <div class="metric-value">${card.value}</div>
            <div class="metric-sub">${card.sub}</div>
        </div>
    `).join("");
}

function renderTornadoChart() {
    if (typeof Plotly === "undefined") return;
    const rows = calculateSensitivityRows().slice(0, 12).reverse();
    const metricLabel = getMetricDefinition().label;

    Plotly.react("tornado-chart", [
        {
            x: rows.map((row) => row.lowDelta),
            y: rows.map((row) => row.name),
            type: "bar",
            orientation: "h",
            name: "低位假设",
            marker: { color: "rgba(182, 95, 85, 0.78)" },
            hovertemplate: "%{hovertext}<extra></extra>",
            hovertext: rows.map((row) => `${row.name}<br>低位假设：${formatDriverValue(row.key, row.lowValue)}<br>${metricLabel}：${formatMetric(row.lowMetric)}`)
        },
        {
            x: rows.map((row) => row.highDelta),
            y: rows.map((row) => row.name),
            type: "bar",
            orientation: "h",
            name: "高位假设",
            marker: { color: "rgba(120, 140, 93, 0.82)" },
            hovertemplate: "%{hovertext}<extra></extra>",
            hovertext: rows.map((row) => `${row.name}<br>高位假设：${formatDriverValue(row.key, row.highValue)}<br>${metricLabel}：${formatMetric(row.highMetric)}`)
        }
    ], getLockedPlotLayout({
        margin: { l: 126, r: 28, t: 24, b: 46 },
        barmode: "overlay",
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: getPlotFont(),
        legend: { orientation: "h", y: 1.08, x: 0 },
        xaxis: {
            title: `${metricLabel}相对基准变化`,
            zeroline: true,
            zerolinecolor: "#141413",
            gridcolor: "#ece8de"
        },
        yaxis: { automargin: true }
    }), getPlotConfig());
}

function renderScenarioChart() {
    if (typeof Plotly === "undefined") return;
    const scenarios = ["bear", "base", "bull"];
    const results = scenarios.map((scenario) => computeModel(buildScenarioAssumptions(scenario)));
    const metricValues = results.map((result) => getMetricValue(result));

    Plotly.react("scenario-chart", [
        {
            x: scenarios.map((scenario) => SCENARIO_LABELS[scenario]),
            y: metricValues,
            type: "bar",
            marker: { color: ["#b65f55", "#5c8fba", "#788c5d"] },
            text: metricValues.map((value) => formatMetric(value)),
            textposition: "auto",
            hovertemplate: "%{x}<br>%{text}<extra></extra>"
        }
    ], getLockedPlotLayout({
        margin: { l: 54, r: 22, t: 26, b: 42 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: getPlotFont(),
        yaxis: {
            title: getMetricDefinition().label,
            gridcolor: "#ece8de"
        }
    }), getPlotConfig());
}

function renderMatrixChart() {
    if (typeof Plotly === "undefined") return;
    const matrix = createMatrixData();
    const xLabels = matrix.xValues.map((value) => formatDriverValue(matrix.xKey, value));
    const yLabels = matrix.yValues.map((value) => formatDriverValue(matrix.yKey, value));

    Plotly.react("matrix-chart", [
        {
            x: xLabels,
            y: yLabels,
            z: matrix.z,
            type: "heatmap",
            colorscale: [
                [0, "#b65f55"],
                [0.5, "#fffaf5"],
                [1, "#5c8fba"]
            ],
            hovertemplate: `${driverByKey[matrix.xKey].name}: %{x}<br>${driverByKey[matrix.yKey].name}: %{y}<br>${getMetricDefinition().label}: %{z:.2f}<extra></extra>`,
            colorbar: {
                title: getMetricDefinition().label,
                thickness: 14
            }
        }
    ], getLockedPlotLayout({
        margin: { l: 100, r: 64, t: 28, b: 86 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: getPlotFont(),
        xaxis: {
            title: driverByKey[matrix.xKey].name,
            tickangle: -32
        },
        yaxis: {
            title: driverByKey[matrix.yKey].name,
            automargin: true
        }
    }), getPlotConfig());
}

function renderBridgeChart(result) {
    if (typeof Plotly === "undefined") return;
    const labels = [
        "收入",
        "返利",
        "净收入",
        "材料成本",
        "变动制造费用",
        "变动销售费用等",
        "边际总额",
        "技术开发费",
        "国际固定费用",
        "折旧加摊销",
        "后台公共费用",
        "其他业务利润",
        "备件利润",
        "子公司利润",
        "利润"
    ];
    const values = [
        result.revenue,
        -result.rebate,
        result.netRevenue,
        -result.materialCost,
        -result.variableManufacturingCost,
        -result.variableSalesCost,
        result.contributionMargin,
        -result.techDevelopmentFee,
        -result.internationalFixedCost,
        -result.depreciationAmortization,
        -result.backOfficeSharedCost,
        result.otherBusinessProfit,
        result.sparePartsProfit,
        result.subsidiaryProfit,
        result.profit
    ];

    Plotly.react("bridge-chart", [
        {
            type: "waterfall",
            orientation: "v",
            measure: [
                "absolute",
                "relative",
                "total",
                "relative",
                "relative",
                "relative",
                "total",
                "relative",
                "relative",
                "relative",
                "relative",
                "relative",
                "relative",
                "relative",
                "total"
            ],
            x: labels,
            y: values,
            connector: { line: { color: "#cfcabe" } },
            increasing: { marker: { color: "#788c5d" } },
            decreasing: { marker: { color: "#b65f55" } },
            totals: { marker: { color: "#5c8fba" } },
            hovertemplate: "%{x}<br>%{y:.1f}<extra></extra>"
        }
    ], getLockedPlotLayout({
        margin: { l: 58, r: 24, t: 26, b: 112 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: getPlotFont(),
        yaxis: {
            title: AppState.displayUnit === "百万" ? "百万元" : "亿元",
            gridcolor: "#ece8de"
        },
        xaxis: { tickangle: -36 }
    }), getPlotConfig());
}

function renderProfitTable(result) {
    const rows = [
        ["收入", result.revenue, percentOf(result.revenue, result.netRevenue)],
        ["返利", -result.rebate, percentOf(-result.rebate, result.netRevenue)],
        ["净收入", result.netRevenue, 100],
        ["材料成本", -result.materialCost, percentOf(-result.materialCost, result.netRevenue)],
        ["变动制造费用", -result.variableManufacturingCost, percentOf(-result.variableManufacturingCost, result.netRevenue)],
        ["变动销售费用等", -result.variableSalesCost, percentOf(-result.variableSalesCost, result.netRevenue)],
        ["边际总额", result.contributionMargin, result.contributionMarginRate],
        ["技术开发费", -result.techDevelopmentFee, percentOf(-result.techDevelopmentFee, result.netRevenue)],
        ["国际固定费用", -result.internationalFixedCost, percentOf(-result.internationalFixedCost, result.netRevenue)],
        ["折旧加摊销", -result.depreciationAmortization, percentOf(-result.depreciationAmortization, result.netRevenue)],
        ["后台公共费用", -result.backOfficeSharedCost, percentOf(-result.backOfficeSharedCost, result.netRevenue)],
        ["其他业务利润", result.otherBusinessProfit, percentOf(result.otherBusinessProfit, result.netRevenue)],
        ["备件利润", result.sparePartsProfit, percentOf(result.sparePartsProfit, result.netRevenue)],
        ["子公司利润", result.subsidiaryProfit, percentOf(result.subsidiaryProfit, result.netRevenue)],
        ["利润", result.profit, result.profitRate]
    ];

    document.getElementById("profit-table").innerHTML = `
        <thead>
            <tr>
                <th>项目</th>
                <th>金额</th>
                <th>占净收入比例</th>
            </tr>
        </thead>
        <tbody>
            ${rows.map((row) => `
                <tr>
                    <td>${row[0]}</td>
                    <td class="${row[1] >= 0 ? "positive" : "negative"}">${formatAmount(row[1], 1)}</td>
                    <td>${formatNumber(row[2], 1)}%</td>
                </tr>
            `).join("")}
        </tbody>
    `;
}

function renderSensitivityTable() {
    const rows = calculateSensitivityRows();
    document.getElementById("sensitivity-table").innerHTML = `
        <thead>
            <tr>
                <th>科目</th>
                <th>低位假设</th>
                <th>低位结果</th>
                <th>基准结果</th>
                <th>高位假设</th>
                <th>高位结果</th>
                <th>结果摆幅</th>
            </tr>
        </thead>
        <tbody>
            ${rows.map((row) => `
                <tr>
                    <td>${row.name}</td>
                    <td>${formatDriverValue(row.key, row.lowValue)}</td>
                    <td class="${row.lowDelta >= 0 ? "positive" : "negative"}">${formatMetric(row.lowMetric)}</td>
                    <td>${formatMetric(row.baseMetric)}</td>
                    <td>${formatDriverValue(row.key, row.highValue)}</td>
                    <td class="${row.highDelta >= 0 ? "positive" : "negative"}">${formatMetric(row.highMetric)}</td>
                    <td>${formatMetric(row.swing)}</td>
                </tr>
            `).join("")}
        </tbody>
    `;
}

function resetModel() {
    AppState.assumptions = getDefaultAssumptions();
    AppState.ranges = getDefaultRanges();
    AppState.scenarioOverrides = null;
    AppState.metric = "profit";
    AppState.displayUnit = "亿";
    AppState.xDriver = "revenue";
    AppState.yDriver = "materialCost";
    AppState.matrixSteps = 7;
    refreshInputValues();
    renderAll();
}

function toggleSidebar(shouldCollapse) {
    const sidebar = document.getElementById("sidebar");
    const expand = document.getElementById("sidebar-expand");
    sidebar.classList.toggle("collapsed", shouldCollapse);
    expand.style.display = shouldCollapse ? "block" : "none";
}

function initResponsiveSidebar() {
    if (typeof window === "undefined") return;
    const isMobileViewport = window.matchMedia("(max-width: 820px)").matches;
    if (isMobileViewport) {
        toggleSidebar(true);
    }
}

function showMessage(type, text) {
    const area = document.getElementById("message-area");
    if (!area) return;
    area.innerHTML = `<div class="message ${type}">${text}</div>`;
    window.clearTimeout(showMessage.timer);
    if (type !== "error") {
        showMessage.timer = window.setTimeout(() => {
            area.innerHTML = "";
        }, 3200);
    }
}

function getTemplateRows() {
    return DRIVER_DEFINITIONS.map((driver) => {
        const value = AppState.assumptions[driver.key] ?? driver.defaultValue;
        return {
            Key: driver.key,
            Name: driver.name,
            Value: value,
            Range: AppState.ranges[driver.key] ?? driver.defaultRange,
            Bear: getScenarioValue(driver.key, "bear"),
            Base: value,
            Bull: getScenarioValue(driver.key, "bull"),
            Unit: driver.unit,
            Description: driver.description
        };
    });
}

function downloadTemplate(format) {
    const rows = getTemplateRows();
    if (format === "xlsx" && typeof XLSX !== "undefined") {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(rows);
        worksheet["!cols"] = [
            { wch: 26 }, { wch: 20 }, { wch: 12 }, { wch: 12 },
            { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 42 }
        ];
        const readme = XLSX.utils.aoa_to_sheet([
            ["字段", "说明"],
            ["Key", "科目代码，请不要改动。系统按 Key 识别字段。"],
            ["Value/Base", "基准假设金额。"],
            ["Range", "敏感性冲击幅度，单位同科目。"],
            ["Bear/Base/Bull", "可选三情景假设，留空时系统按 Range 自动生成。"]
        ]);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Assumptions");
        XLSX.utils.book_append_sheet(workbook, readme, "Readme");
        XLSX.writeFile(workbook, "profit-bridge-sensitivity-template.xlsx");
        return;
    }

    downloadBlob(
        new Blob(["\uFEFF" + toCsv(rows)], { type: "text/csv;charset=utf-8;" }),
        "profit-bridge-sensitivity-template.csv"
    );
}

function downloadResultsWorkbook() {
    const result = computeModel(AppState.assumptions);
    const sensitivityRows = calculateSensitivityRows();
    const matrix = createMatrixData();
    const profitRows = [
        { Item: "收入", Value: result.revenue, NetRevenuePct: percentOf(result.revenue, result.netRevenue) },
        { Item: "返利", Value: -result.rebate, NetRevenuePct: percentOf(-result.rebate, result.netRevenue) },
        { Item: "净收入", Value: result.netRevenue, NetRevenuePct: 100 },
        { Item: "材料成本", Value: -result.materialCost, NetRevenuePct: percentOf(-result.materialCost, result.netRevenue) },
        { Item: "变动制造费用", Value: -result.variableManufacturingCost, NetRevenuePct: percentOf(-result.variableManufacturingCost, result.netRevenue) },
        { Item: "变动销售费用等", Value: -result.variableSalesCost, NetRevenuePct: percentOf(-result.variableSalesCost, result.netRevenue) },
        { Item: "边际总额", Value: result.contributionMargin, NetRevenuePct: result.contributionMarginRate },
        { Item: "技术开发费", Value: -result.techDevelopmentFee, NetRevenuePct: percentOf(-result.techDevelopmentFee, result.netRevenue) },
        { Item: "国际固定费用", Value: -result.internationalFixedCost, NetRevenuePct: percentOf(-result.internationalFixedCost, result.netRevenue) },
        { Item: "折旧加摊销", Value: -result.depreciationAmortization, NetRevenuePct: percentOf(-result.depreciationAmortization, result.netRevenue) },
        { Item: "后台公共费用", Value: -result.backOfficeSharedCost, NetRevenuePct: percentOf(-result.backOfficeSharedCost, result.netRevenue) },
        { Item: "其他业务利润", Value: result.otherBusinessProfit, NetRevenuePct: percentOf(result.otherBusinessProfit, result.netRevenue) },
        { Item: "备件利润", Value: result.sparePartsProfit, NetRevenuePct: percentOf(result.sparePartsProfit, result.netRevenue) },
        { Item: "子公司利润", Value: result.subsidiaryProfit, NetRevenuePct: percentOf(result.subsidiaryProfit, result.netRevenue) },
        { Item: "利润", Value: result.profit, NetRevenuePct: result.profitRate }
    ];
    const sensitivityExport = sensitivityRows.map((row) => ({
        Key: row.key,
        Name: row.name,
        LowValue: row.lowValue,
        LowResult: row.lowMetric,
        BaseResult: row.baseMetric,
        HighValue: row.highValue,
        HighResult: row.highMetric,
        Swing: row.swing
    }));
    const matrixRows = matrix.yValues.map((yValue, rowIndex) => {
        const item = { [driverByKey[matrix.yKey].name]: yValue };
        matrix.xValues.forEach((xValue, columnIndex) => {
            item[`${driverByKey[matrix.xKey].name}=${round(xValue, 3)}`] = matrix.z[rowIndex][columnIndex];
        });
        return item;
    });

    if (typeof XLSX !== "undefined") {
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(getTemplateRows()), "Assumptions");
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(profitRows), "ProfitBridge");
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sensitivityExport), "Sensitivity");
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(matrixRows), "Matrix");
        XLSX.writeFile(workbook, "profit-bridge-sensitivity-results.xlsx");
        return;
    }

    downloadBlob(
        new Blob(["\uFEFF" + toCsv(sensitivityExport)], { type: "text/csv;charset=utf-8;" }),
        "profit-bridge-sensitivity-results.csv"
    );
}

function toCsv(rows) {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]);
    const body = rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(","));
    return [headers.join(","), ...body].join("\r\n");
}

function escapeCsv(value) {
    const text = String(value ?? "");
    if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function getPlotFont() {
    return {
        family: "PingFang SC, Microsoft YaHei, Helvetica Neue, Arial, sans-serif",
        color: "#141413",
        size: 12
    };
}

function getPlotConfig() {
    return {
        responsive: true,
        displayModeBar: false,
        displaylogo: false,
        scrollZoom: false,
        doubleClick: false,
        editable: false,
        staticPlot: false
    };
}

function getLockedPlotLayout(layout) {
    return {
        ...layout,
        dragmode: false,
        clickmode: "none",
        legend: {
            ...(layout.legend || {}),
            itemclick: false,
            itemdoubleclick: false
        },
        xaxis: {
            ...(layout.xaxis || {}),
            fixedrange: true
        },
        yaxis: {
            ...(layout.yaxis || {}),
            fixedrange: true
        }
    };
}

if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", initApp);
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        DRIVER_DEFINITIONS,
        METRIC_DEFINITIONS,
        getDefaultAssumptions,
        getDefaultRanges,
        computeModel,
        sanitizeAssumptions,
        sequenceAround,
        parseCsv,
        normalizeImportedValue,
        getPlotConfig,
        getLockedPlotLayout
    };
}
