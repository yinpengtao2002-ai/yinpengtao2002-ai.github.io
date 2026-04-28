/**
 * 企业 FBP 经营利润敏感性分析 - official finance page engine.
 * Scope is intentionally limited to /finance/sensitivity-analysis.
 */

const DRIVER_DEFINITIONS = [
    {
        key: "salesVolume",
        name: "销量",
        aliases: ["volume", "sales", "销量", "销售量"],
        unit: "万辆",
        kind: "volume",
        group: "volume",
        step: 0.1,
        decimals: 1,
        defaultValue: 100,
        defaultRange: 10,
        impact: "positive",
        description: "边际以上项目的销量基础"
    },
    {
        key: "unitNetRevenue",
        name: "单车净收入",
        aliases: ["unitRevenue", "unitNetRevenue", "单车收入", "单车净收入"],
        unit: "万元/辆",
        kind: "unitAmount",
        group: "volume",
        step: 0.1,
        decimals: 2,
        defaultValue: 13.2,
        defaultRange: 1.2,
        impact: "positive",
        description: "每辆车贡献的净收入"
    },
    {
        key: "unitMaterialCost",
        name: "单车材料成本",
        aliases: ["unitMaterialCost", "单车材料成本"],
        unit: "万元/辆",
        kind: "unitAmount",
        group: "volume",
        step: 0.1,
        decimals: 2,
        defaultValue: 7.8,
        defaultRange: 0.6,
        impact: "negative",
        description: "每辆车对应的材料成本"
    },
    {
        key: "unitVariableManufacturingCost",
        name: "单车变动制造费用",
        aliases: ["unitVariableManufacturingCost", "单车变动制造费用"],
        unit: "万元/辆",
        kind: "unitAmount",
        group: "volume",
        step: 0.1,
        decimals: 2,
        defaultValue: 0.9,
        defaultRange: 0.15,
        impact: "negative",
        description: "每辆车对应的变动制造费用"
    },
    {
        key: "unitVariableSalesCost",
        name: "单车变动销售费用",
        aliases: ["unitVariableSalesCost", "单车变动销售费用"],
        unit: "万元/辆",
        kind: "unitAmount",
        group: "volume",
        step: 0.1,
        decimals: 2,
        defaultValue: 0.8,
        defaultRange: 0.15,
        impact: "negative",
        description: "每辆车对应的变动销售费用"
    },
    {
        key: "techDevelopmentFee",
        name: "技术开发费",
        unit: "亿元",
        kind: "amount",
        group: "fixedDeduction",
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
        group: "fixedDeduction",
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
        group: "fixedDeduction",
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
        group: "fixedDeduction",
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
        group: "profitAddition",
        step: 1,
        defaultValue: 18,
        defaultRange: 8,
        impact: "positive",
        description: "固定部分中的利润贡献项目"
    },
    {
        key: "sparePartsProfit",
        name: "备件利润",
        unit: "亿元",
        kind: "amount",
        group: "profitAddition",
        step: 1,
        defaultValue: 25,
        defaultRange: 8,
        impact: "positive",
        description: "固定部分中的利润贡献项目"
    },
    {
        key: "subsidiaryProfit",
        name: "子公司利润",
        unit: "亿元",
        kind: "amount",
        group: "profitAddition",
        step: 1,
        defaultValue: 12,
        defaultRange: 6,
        impact: "positive",
        description: "固定部分中的利润贡献项目"
    }
];

const METRIC_DEFINITIONS = {
    profit: { label: "利润总额", unit: "amount", decimals: 1 },
    contributionMargin: { label: "边际", unit: "amount", decimals: 1 },
    netRevenue: { label: "净收入", unit: "amount", decimals: 1 },
    salesVolume: { label: "销量", unit: "volume", decimals: 1 },
    unitContributionMargin: { label: "单车边际", unit: "unitAmount", decimals: 2 },
    contributionMarginRate: { label: "边际率", unit: "%", decimals: 1 },
    profitRate: { label: "利润总额率", unit: "%", decimals: 1 }
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
    xDriver: "salesVolume",
    yDriver: "unitMaterialCost",
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
    next.salesVolume = Math.max(0, next.salesVolume);
    next.unitNetRevenue = Math.max(0, next.unitNetRevenue);
    next.unitMaterialCost = Math.max(0, next.unitMaterialCost);
    next.unitVariableManufacturingCost = Math.max(0, next.unitVariableManufacturingCost);
    next.unitVariableSalesCost = Math.max(0, next.unitVariableSalesCost);
    next.techDevelopmentFee = Math.max(0, next.techDevelopmentFee);
    next.internationalFixedCost = Math.max(0, next.internationalFixedCost);
    next.depreciationAmortization = Math.max(0, next.depreciationAmortization);
    next.backOfficeSharedCost = Math.max(0, next.backOfficeSharedCost);
    return next;
}

function computeModel(assumptions) {
    const a = sanitizeAssumptions(assumptions);
    const netRevenue = a.salesVolume * a.unitNetRevenue;
    const materialCost = a.salesVolume * a.unitMaterialCost;
    const variableManufacturingCost = a.salesVolume * a.unitVariableManufacturingCost;
    const variableSalesCost = a.salesVolume * a.unitVariableSalesCost;
    const unitVariableCost = a.unitMaterialCost + a.unitVariableManufacturingCost + a.unitVariableSalesCost;
    const unitContributionMargin = a.unitNetRevenue - unitVariableCost;
    const variableCostTotal = materialCost + variableManufacturingCost + variableSalesCost;
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
    const fixedPartNet = fixedDeductionTotal - profitAdditionTotal;
    const profit = contributionMargin - fixedPartNet;

    return {
        ...a,
        netRevenue,
        materialCost,
        variableManufacturingCost,
        variableSalesCost,
        unitVariableCost,
        unitContributionMargin,
        materialCostRate: percentOf(materialCost, netRevenue),
        variableManufacturingCostRate: percentOf(variableManufacturingCost, netRevenue),
        variableSalesCostRate: percentOf(variableSalesCost, netRevenue),
        variableCostTotal,
        variableCostRate: percentOf(variableCostTotal, netRevenue),
        contributionMargin,
        contributionMarginRate: percentOf(contributionMargin, netRevenue),
        fixedDeductionTotal,
        profitAdditionTotal,
        fixedPartNet,
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

function formatSignedAmount(value, decimals = 1) {
    const sign = value > 0 ? "+" : "";
    return `${sign}${formatAmount(value, decimals)}`;
}

function formatVolume(value, decimals = 1) {
    return `${formatNumber(value, decimals)} 万辆`;
}

function formatUnitAmount(value, decimals = 2) {
    return `${formatNumber(value, decimals)} 万元/辆`;
}

function formatMetric(value, metricKey = AppState.metric) {
    const definition = getMetricDefinition(metricKey);
    if (definition.unit === "amount") return formatAmount(value, definition.decimals);
    if (definition.unit === "volume") return formatVolume(value, definition.decimals);
    if (definition.unit === "unitAmount") return formatUnitAmount(value, definition.decimals);
    if (definition.unit === "%") return `${formatNumber(value, definition.decimals)}%`;
    return formatNumber(value, definition.decimals);
}

function formatDriverValue(key, value) {
    const driver = driverByKey[key];
    if (!driver) return formatNumber(value, 2);
    const decimals = Number.isFinite(driver.decimals) ? driver.decimals : driver.step < 1 ? 1 : 0;
    return `${formatNumber(value, decimals)} ${driver.unit}`;
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
    const root = document.getElementById("sensitivity-tool-root");
    if (!root || root.dataset.initialized === "true") return;
    root.dataset.initialized = "true";

    renderControlInputs();
    initControlEvents();
    initFileUpload();
    initResponsiveSidebar();
    initChartResizeObserver();
    renderAll();
}

function renderControlInputs() {
    const assumptionsContainer = document.getElementById("assumption-inputs");
    const rangesContainer = document.getElementById("range-inputs");
    const xSelect = document.getElementById("x-driver-select");
    const ySelect = document.getElementById("y-driver-select");
    const groups = [
        { key: "volume", title: "边际以上：量价假设" },
        { key: "fixedDeduction", title: "边际以下：固定扣减项" },
        { key: "profitAddition", title: "边际以下：利润贡献项" }
    ];

    assumptionsContainer.innerHTML = groups.map((group) => {
        const drivers = DRIVER_DEFINITIONS.filter((driver) => driver.group === group.key);
        return `
            <div class="field-group">
                <div class="field-group-title">${group.title}</div>
                ${drivers.map((driver) => `
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
                `).join("")}
            </div>
        `;
    }).join("");

    rangesContainer.innerHTML = groups.map((group) => {
        const drivers = DRIVER_DEFINITIONS.filter((driver) => driver.group === group.key);
        return `
            <div class="field-group">
                <div class="field-group-title">${group.title}</div>
                ${drivers.map((driver) => `
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
                `).join("")}
            </div>
        `;
    }).join("");

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
        showMessage("success", "已加载经营利润示例数据。");
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
    return DRIVER_DEFINITIONS.find((driver) => {
        const driverNames = [driver.key, driver.name, ...(driver.aliases || [])].map(canonical);
        return driverNames.includes(key) || driverNames.includes(name);
    });
}

function parseNumeric(value) {
    if (value === null || value === undefined || value === "") return NaN;
    if (typeof value === "number") return value;
    const cleaned = String(value)
        .trim()
        .replace(/,/g, "")
        .replace(/%/g, "")
        .replace(/万元\/辆|万元\/台|万元每辆|万元每台/g, "")
        .replace(/万台|万辆|台|辆/g, "")
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
    renderWaterfallCharts(result);
    renderProfitTable(result);
    renderSensitivityTable();
}

function renderMetrics(result) {
    const cards = [
        {
            label: "销量",
            value: formatVolume(result.salesVolume, 1),
            sub: `单车净收入 ${formatUnitAmount(result.unitNetRevenue, 2)}`
        },
        {
            label: "单车边际",
            value: formatUnitAmount(result.unitContributionMargin, 2),
            sub: `单车变动成本 ${formatUnitAmount(result.unitVariableCost, 2)}`
        },
        {
            label: "净收入",
            value: formatAmount(result.netRevenue, 1),
            sub: "销量 × 单车净收入"
        },
        {
            label: "边际",
            value: formatAmount(result.contributionMargin, 1),
            sub: `边际率 ${formatNumber(result.contributionMarginRate, 1)}%`
        },
        {
            label: "利润总额",
            value: formatAmount(result.profit, 1),
            sub: `利润总额率 ${formatNumber(result.profitRate, 1)}%`
        },
        {
            label: "固定部分净额",
            value: formatAmount(result.fixedPartNet, 1),
            sub: "固定费用扣减利润项目后"
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

function toDisplayAmount(value) {
    return AppState.displayUnit === "百万" ? value * 100 : value;
}

function getDisplayAmountUnit() {
    return AppState.displayUnit === "百万" ? "百万元" : "亿元";
}

function renderWaterfallCharts(result) {
    if (typeof Plotly === "undefined") return;

    renderWaterfallChart("margin-bridge-chart", {
        labels: [
            "净收入",
            "材料成本",
            "变动制造费用",
            "变动销售费用",
            "边际"
        ],
        values: [
            result.netRevenue,
            -result.materialCost,
            -result.variableManufacturingCost,
            -result.variableSalesCost,
            result.contributionMargin
        ],
        measures: [
            "absolute",
            "relative",
            "relative",
            "relative",
            "total"
        ],
        bottomMargin: 76,
        tickAngle: -24,
        height: 340
    });

    renderWaterfallChart("profit-bridge-chart", {
        labels: [
            "边际",
            "技术开发费",
            "国际固定费用",
            "折旧加摊销",
            "后台公共费用",
            "其他业务利润",
            "备件利润",
            "子公司利润",
            "利润总额"
        ],
        values: [
            result.contributionMargin,
            -result.techDevelopmentFee,
            -result.internationalFixedCost,
            -result.depreciationAmortization,
            -result.backOfficeSharedCost,
            result.otherBusinessProfit,
            result.sparePartsProfit,
            result.subsidiaryProfit,
            result.profit
        ],
        measures: [
            "absolute",
            "relative",
            "relative",
            "relative",
            "relative",
            "relative",
            "relative",
            "relative",
            "total"
        ],
        bottomMargin: 82,
        tickAngle: -22,
        height: 430
    });
}

function renderWaterfallChart(targetId, options) {
    const labels = options.labels;
    const values = options.values.map(toDisplayAmount);
    const textLabels = options.values.map((value, index) => (
        options.measures[index] === "relative"
            ? formatSignedAmount(value, 1)
            : formatAmount(value, 1)
    ));
    const hoverTexts = options.labels.map((label, index) => (
        `${label}<br>${formatAmount(options.values[index], 1)}`
    ));

    Plotly.react(targetId, [
        {
            type: "waterfall",
            orientation: "v",
            measure: options.measures,
            x: labels,
            y: values,
            text: textLabels,
            textposition: "outside",
            textfont: { family: getPlotFont().family, size: 11, color: "#141413" },
            cliponaxis: false,
            connector: { line: { color: "#cfcabe" } },
            increasing: { marker: { color: "#788c5d" } },
            decreasing: { marker: { color: "#b65f55" } },
            totals: { marker: { color: "#5c8fba" } },
            hovertemplate: "%{hovertext}<extra></extra>",
            hovertext: hoverTexts
        }
    ], getLockedPlotLayout({
        height: options.height,
        margin: { l: 58, r: 32, t: 42, b: options.bottomMargin },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: getPlotFont(),
        yaxis: {
            title: getDisplayAmountUnit(),
            gridcolor: "#ece8de"
        },
        xaxis: { tickangle: options.tickAngle }
    }), getPlotConfig());
}

function renderProfitTable(result) {
    const rows = [
        { label: "销量", display: formatVolume(result.salesVolume, 1), value: result.salesVolume, pct: null },
        { label: "单车净收入", display: formatUnitAmount(result.unitNetRevenue, 2), value: result.unitNetRevenue, pct: null },
        { label: "净收入", display: formatAmount(result.netRevenue, 1), value: result.netRevenue, pct: 100 },
        { label: "单车材料成本", display: formatUnitAmount(-result.unitMaterialCost, 2), value: -result.unitMaterialCost, pct: null },
        { label: "材料成本", display: formatAmount(-result.materialCost, 1), value: -result.materialCost, pct: percentOf(-result.materialCost, result.netRevenue) },
        { label: "单车变动制造费用", display: formatUnitAmount(-result.unitVariableManufacturingCost, 2), value: -result.unitVariableManufacturingCost, pct: null },
        { label: "变动制造费用", display: formatAmount(-result.variableManufacturingCost, 1), value: -result.variableManufacturingCost, pct: percentOf(-result.variableManufacturingCost, result.netRevenue) },
        { label: "单车变动销售费用", display: formatUnitAmount(-result.unitVariableSalesCost, 2), value: -result.unitVariableSalesCost, pct: null },
        { label: "变动销售费用", display: formatAmount(-result.variableSalesCost, 1), value: -result.variableSalesCost, pct: percentOf(-result.variableSalesCost, result.netRevenue) },
        { label: "单车边际", display: formatUnitAmount(result.unitContributionMargin, 2), value: result.unitContributionMargin, pct: null },
        { label: "边际", display: formatAmount(result.contributionMargin, 1), value: result.contributionMargin, pct: result.contributionMarginRate },
        { label: "技术开发费", display: formatAmount(-result.techDevelopmentFee, 1), value: -result.techDevelopmentFee, pct: percentOf(-result.techDevelopmentFee, result.netRevenue) },
        { label: "国际固定费用", display: formatAmount(-result.internationalFixedCost, 1), value: -result.internationalFixedCost, pct: percentOf(-result.internationalFixedCost, result.netRevenue) },
        { label: "折旧加摊销", display: formatAmount(-result.depreciationAmortization, 1), value: -result.depreciationAmortization, pct: percentOf(-result.depreciationAmortization, result.netRevenue) },
        { label: "后台公共费用", display: formatAmount(-result.backOfficeSharedCost, 1), value: -result.backOfficeSharedCost, pct: percentOf(-result.backOfficeSharedCost, result.netRevenue) },
        { label: "其他业务利润", display: formatAmount(result.otherBusinessProfit, 1), value: result.otherBusinessProfit, pct: percentOf(result.otherBusinessProfit, result.netRevenue) },
        { label: "备件利润", display: formatAmount(result.sparePartsProfit, 1), value: result.sparePartsProfit, pct: percentOf(result.sparePartsProfit, result.netRevenue) },
        { label: "子公司利润", display: formatAmount(result.subsidiaryProfit, 1), value: result.subsidiaryProfit, pct: percentOf(result.subsidiaryProfit, result.netRevenue) },
        { label: "固定部分净额", display: formatAmount(-result.fixedPartNet, 1), value: -result.fixedPartNet, pct: percentOf(-result.fixedPartNet, result.netRevenue) },
        { label: "利润总额", display: formatAmount(result.profit, 1), value: result.profit, pct: result.profitRate }
    ];

    document.getElementById("profit-table").innerHTML = `
        <thead>
            <tr>
                <th>项目</th>
                <th>数值</th>
                <th>占净收入比例</th>
            </tr>
        </thead>
        <tbody>
            ${rows.map((row) => `
                <tr>
                    <td>${row.label}</td>
                    <td class="${row.value >= 0 ? "positive" : "negative"}">${row.display}</td>
                    <td>${row.pct === null ? "-" : `${formatNumber(row.pct, 1)}%`}</td>
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
    AppState.xDriver = "salesVolume";
    AppState.yDriver = "unitMaterialCost";
    AppState.matrixSteps = 7;
    refreshInputValues();
    renderAll();
}

function toggleSidebar(shouldCollapse) {
    const sidebar = document.getElementById("sidebar");
    const expand = document.getElementById("sidebar-expand");
    sidebar.classList.toggle("collapsed", shouldCollapse);
    expand.style.display = shouldCollapse ? "block" : "none";
    schedulePlotResize();
}

function initResponsiveSidebar() {
    if (typeof window === "undefined") return;
    const isMobileViewport = window.matchMedia("(max-width: 820px)").matches;
    if (isMobileViewport) {
        toggleSidebar(true);
    }
}

function resizePlotlyCharts() {
    if (typeof Plotly === "undefined") return;
    document.querySelectorAll(".sensitivity-tool .js-plotly-plot").forEach((plot) => {
        Plotly.Plots.resize(plot);
    });
}

function schedulePlotResize() {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(resizePlotlyCharts);
    window.setTimeout(resizePlotlyCharts, 280);
}

function initChartResizeObserver() {
    if (typeof window === "undefined") return;
    const mainContent = document.querySelector(".sensitivity-tool .main-content");
    if (mainContent && typeof ResizeObserver !== "undefined") {
        const observer = new ResizeObserver(schedulePlotResize);
        observer.observe(mainContent);
    }
    window.addEventListener("resize", schedulePlotResize);
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
            ["Value/Base", "基准假设值，单位见 Unit。"],
            ["Range", "敏感性冲击幅度，单位同科目。"],
            ["Bear/Base/Bull", "可选三情景假设，留空时系统按 Range 自动生成。"]
        ]);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Assumptions");
        XLSX.utils.book_append_sheet(workbook, readme, "Readme");
        XLSX.writeFile(workbook, "operating-profit-sensitivity-template.xlsx");
        return;
    }

    downloadBlob(
        new Blob(["\uFEFF" + toCsv(rows)], { type: "text/csv;charset=utf-8;" }),
        "operating-profit-sensitivity-template.csv"
    );
}

function downloadResultsWorkbook() {
    const result = computeModel(AppState.assumptions);
    const sensitivityRows = calculateSensitivityRows();
    const matrix = createMatrixData();
    const profitRows = [
        { Item: "销量", Value: result.salesVolume, Unit: "万辆", NetRevenuePct: "" },
        { Item: "单车净收入", Value: result.unitNetRevenue, Unit: "万元/辆", NetRevenuePct: "" },
        { Item: "净收入", Value: result.netRevenue, NetRevenuePct: 100 },
        { Item: "单车材料成本", Value: -result.unitMaterialCost, Unit: "万元/辆", NetRevenuePct: "" },
        { Item: "材料成本", Value: -result.materialCost, NetRevenuePct: percentOf(-result.materialCost, result.netRevenue) },
        { Item: "单车变动制造费用", Value: -result.unitVariableManufacturingCost, Unit: "万元/辆", NetRevenuePct: "" },
        { Item: "变动制造费用", Value: -result.variableManufacturingCost, NetRevenuePct: percentOf(-result.variableManufacturingCost, result.netRevenue) },
        { Item: "单车变动销售费用", Value: -result.unitVariableSalesCost, Unit: "万元/辆", NetRevenuePct: "" },
        { Item: "变动销售费用", Value: -result.variableSalesCost, NetRevenuePct: percentOf(-result.variableSalesCost, result.netRevenue) },
        { Item: "单车边际", Value: result.unitContributionMargin, Unit: "万元/辆", NetRevenuePct: "" },
        { Item: "边际", Value: result.contributionMargin, NetRevenuePct: result.contributionMarginRate },
        { Item: "技术开发费", Value: -result.techDevelopmentFee, NetRevenuePct: percentOf(-result.techDevelopmentFee, result.netRevenue) },
        { Item: "国际固定费用", Value: -result.internationalFixedCost, NetRevenuePct: percentOf(-result.internationalFixedCost, result.netRevenue) },
        { Item: "折旧加摊销", Value: -result.depreciationAmortization, NetRevenuePct: percentOf(-result.depreciationAmortization, result.netRevenue) },
        { Item: "后台公共费用", Value: -result.backOfficeSharedCost, NetRevenuePct: percentOf(-result.backOfficeSharedCost, result.netRevenue) },
        { Item: "其他业务利润", Value: result.otherBusinessProfit, NetRevenuePct: percentOf(result.otherBusinessProfit, result.netRevenue) },
        { Item: "备件利润", Value: result.sparePartsProfit, NetRevenuePct: percentOf(result.sparePartsProfit, result.netRevenue) },
        { Item: "子公司利润", Value: result.subsidiaryProfit, NetRevenuePct: percentOf(result.subsidiaryProfit, result.netRevenue) },
        { Item: "固定部分净额", Value: -result.fixedPartNet, NetRevenuePct: percentOf(-result.fixedPartNet, result.netRevenue) },
        { Item: "利润总额", Value: result.profit, NetRevenuePct: result.profitRate }
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
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(profitRows), "ProfitStructure");
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sensitivityExport), "Sensitivity");
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(matrixRows), "Matrix");
        XLSX.writeFile(workbook, "operating-profit-sensitivity-results.xlsx");
        return;
    }

    downloadBlob(
        new Blob(["\uFEFF" + toCsv(sensitivityExport)], { type: "text/csv;charset=utf-8;" }),
        "operating-profit-sensitivity-results.csv"
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

if (typeof window !== "undefined") {
    window.ProfitBridgeSensitivity = {
        initApp
    };
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
        getLockedPlotLayout,
        initApp
    };
}
