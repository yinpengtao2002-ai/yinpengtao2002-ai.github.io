/**
 * 企业 FBP 利润敏感性分析 - official finance page engine.
 * Scope is intentionally limited to /finance/sensitivity-analysis.
 */

let DRIVER_DEFINITIONS = [
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
        key: "incomeTax",
        name: "所得税",
        aliases: ["incomeTax", "tax", "incomeTaxExpense", "所得税", "税费", "税"],
        unit: "亿元",
        kind: "amount",
        group: "fixedDeduction",
        step: 1,
        defaultValue: 0,
        defaultRange: 0,
        impact: "negative",
        description: "利润口径中的税费扣减项"
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

const BASE_DRIVER_DEFINITIONS = DRIVER_DEFINITIONS.map(cloneDriverDefinition);

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
    targetProfit: null,
    xDriver: "salesVolume",
    yDriver: "unitMaterialCost",
    matrixSteps: 7
};

let driverByKey = Object.fromEntries(DRIVER_DEFINITIONS.map((driver) => [driver.key, driver]));

function cloneDriverDefinition(driver) {
    return {
        ...driver,
        aliases: [...(driver.aliases || [])]
    };
}

function cloneBaseDriverDefinitions() {
    return BASE_DRIVER_DEFINITIONS.map(cloneDriverDefinition);
}

function refreshDriverIndex() {
    driverByKey = Object.fromEntries(DRIVER_DEFINITIONS.map((driver) => [driver.key, driver]));
}

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

function isSalesVolumeDriver(driver) {
    return driver.key === "salesVolume";
}

function isUnitRevenueDriver(driver) {
    return driver.group === "volume" && driver.impact === "positive" && driver.kind === "unitAmount";
}

function isUnitVariableCostDriver(driver) {
    return driver.group === "volume" && driver.impact === "negative" && driver.kind === "unitAmount";
}

function getDriversBy(predicate) {
    return DRIVER_DEFINITIONS.filter(predicate);
}

function sanitizeAssumptions(assumptions) {
    const next = { ...assumptions };
    DRIVER_DEFINITIONS.forEach((driver) => {
        next[driver.key] = Math.max(0, Number(next[driver.key] || 0));
    });
    return next;
}

function computeModel(assumptions) {
    const a = sanitizeAssumptions(assumptions);
    const unitRevenueDrivers = getDriversBy(isUnitRevenueDriver);
    const unitVariableCostDrivers = getDriversBy(isUnitVariableCostDriver);
    const fixedDeductionDrivers = getDriversBy((driver) => driver.group === "fixedDeduction");
    const profitAdditionDrivers = getDriversBy((driver) => driver.group === "profitAddition");
    const unitNetRevenue = unitRevenueDrivers.reduce((sum, driver) => sum + a[driver.key], 0);
    const unitVariableCost = unitVariableCostDrivers.reduce((sum, driver) => sum + a[driver.key], 0);
    const netRevenue = a.salesVolume * unitNetRevenue;
    const materialCost = a.salesVolume * (a.unitMaterialCost || 0);
    const variableManufacturingCost = a.salesVolume * (a.unitVariableManufacturingCost || 0);
    const variableSalesCost = a.salesVolume * (a.unitVariableSalesCost || 0);
    const unitContributionMargin = unitNetRevenue - unitVariableCost;
    const variableCostTotal = a.salesVolume * unitVariableCost;
    const contributionMargin = netRevenue - variableCostTotal;
    const fixedDeductionTotal = fixedDeductionDrivers.reduce((sum, driver) => sum + a[driver.key], 0);
    const profitAdditionTotal = profitAdditionDrivers.reduce((sum, driver) => sum + a[driver.key], 0);
    const fixedPartNet = fixedDeductionTotal - profitAdditionTotal;
    const profit = contributionMargin - fixedPartNet;

    return {
        ...a,
        unitNetRevenue,
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
    const normalizedValue = Math.abs(value) < 1e-9 ? 0 : value;
    return Number(normalizedValue).toLocaleString("zh-CN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).replace("-0", "0");
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

function formatSignedVolume(value, decimals = 1) {
    const sign = value > 0 ? "+" : "";
    return `${sign}${formatVolume(value, decimals)}`;
}

function formatSignedUnitAmount(value, decimals = 2) {
    const sign = value > 0 ? "+" : "";
    return `${sign}${formatUnitAmount(value, decimals)}`;
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

function computeTargetProfitAnalysis(result, targetProfit = AppState.targetProfit) {
    const profitTarget = Number.isFinite(Number(targetProfit)) ? Number(targetProfit) : 0;
    const requiredContributionMargin = profitTarget + result.fixedPartNet;
    const canSolveByVolume = result.unitContributionMargin > 0;
    const canSolveByRevenue = result.salesVolume > 0;
    const breakEvenVolume = canSolveByVolume ? result.fixedPartNet / result.unitContributionMargin : NaN;
    const requiredTargetVolume = canSolveByVolume ? requiredContributionMargin / result.unitContributionMargin : NaN;
    const requiredUnitContributionMargin = canSolveByRevenue ? requiredContributionMargin / result.salesVolume : NaN;
    const requiredUnitNetRevenue = canSolveByRevenue
        ? result.unitVariableCost + requiredUnitContributionMargin
        : NaN;

    return {
        targetProfit: profitTarget,
        currentProfit: result.profit,
        profitGap: profitTarget - result.profit,
        requiredContributionMargin,
        breakEvenVolume,
        requiredTargetVolume,
        targetVolumeGap: requiredTargetVolume - result.salesVolume,
        requiredUnitContributionMargin,
        requiredUnitNetRevenue,
        requiredUnitRevenueGap: requiredUnitNetRevenue - result.unitNetRevenue
    };
}

function hasTargetProfit() {
    return AppState.targetProfit !== null && Number.isFinite(Number(AppState.targetProfit));
}

function createProfitVolumeCurve(result, targetProfit = AppState.targetProfit) {
    const analysis = computeTargetProfitAnalysis(result, targetProfit);
    const candidateVolumes = [
        result.salesVolume,
        analysis.breakEvenVolume,
        analysis.requiredTargetVolume
    ].filter((value) => Number.isFinite(value) && value >= 0);
    const maxVolume = Math.max(10, ...candidateVolumes.map((value) => value * 1.2));
    const steps = 28;
    const volumes = [];
    const profits = [];

    for (let index = 0; index < steps; index++) {
        const volume = (maxVolume / (steps - 1)) * index;
        volumes.push(volume);
        profits.push(volume * result.unitContributionMargin - result.fixedPartNet);
    }

    return { ...analysis, volumes, profits };
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

    if (assumptionsContainer) {
        assumptionsContainer.innerHTML = "";
    }

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
    document.getElementById("target-profit-input").addEventListener("input", (event) => {
        const value = String(event.target.value || "").trim();
        AppState.targetProfit = value === "" ? null : Number(value);
        renderAll();
    });
    document.getElementById("btn-reset").addEventListener("click", resetModel);
    document.getElementById("btn-demo").addEventListener("click", () => {
        resetModel();
        showMessage("success", "已加载利润示例数据。");
    });
    document.getElementById("btn-csv-template").addEventListener("click", () => downloadTemplate("csv"));
    document.getElementById("btn-xlsx-template").addEventListener("click", () => downloadTemplate("xlsx"));
    document.getElementById("sidebar-toggle").addEventListener("click", () => toggleSidebar(true));
    document.getElementById("sidebar-expand").addEventListener("click", () => toggleSidebar(false));

    const assumptionsContainer = document.getElementById("assumption-inputs");
    if (assumptionsContainer) {
        assumptionsContainer.addEventListener("input", (event) => {
            if (!event.target.classList.contains("assumption-input")) return;
            const key = event.target.dataset.key;
            AppState.assumptions[key] = Number(event.target.value);
            AppState.scenarioOverrides = null;
            renderAll();
        });
    }

    document.getElementById("range-inputs").addEventListener("input", (event) => {
        if (!event.target.classList.contains("range-input")) return;
        const key = event.target.dataset.key;
        AppState.ranges[key] = Math.abs(Number(event.target.value || 0));
        AppState.scenarioOverrides = null;
        renderAll();
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

    const nextDefinitions = cloneBaseDriverDefinitions();
    const nextAssumptions = Object.fromEntries(
        nextDefinitions.map((driver) => [driver.key, AppState.assumptions[driver.key] ?? driver.defaultValue])
    );
    const nextRanges = Object.fromEntries(
        nextDefinitions.map((driver) => [driver.key, AppState.ranges[driver.key] ?? driver.defaultRange])
    );
    const nextScenarios = { bear: {}, base: {}, bull: {} };
    const usedKeys = new Set();
    let matched = 0;
    let hasScenarioValues = false;
    let importedSalesVolume = nextAssumptions.salesVolume;

    rows.forEach((row, rowIndex) => {
        const rowNumber = getRowNumber(row, rowIndex);
        const name = canonical(getImportedName(row));
        const part = canonical(getImportedPart(row));
        const rawValue = getCell(row, ["基准值", "Value", "Base", "数值", "假设值"]);
        const numericValue = parseNumeric(rawValue);
        if (Number.isFinite(numericValue) && (rowNumber === 1 || name.includes("销量") || part.includes("销量"))) {
            importedSalesVolume = numericValue;
        }
    });

    rows.forEach((row, rowIndex) => {
        let driver = findDriverFromRow(row, rowIndex, nextDefinitions, usedKeys);
        if (!driver) {
            driver = inferCustomDriver(row, rowIndex, usedKeys);
            if (driver) nextDefinitions.push(driver);
        }
        if (!driver) return;
        matched++;
        usedKeys.add(driver.key);

        const importedName = getImportedName(row);
        if (importedName) {
            driver.name = importedName;
            driver.aliases = [...new Set([...(driver.aliases || []), importedName])];
        }

        if (!(driver.key in nextAssumptions)) nextAssumptions[driver.key] = driver.defaultValue;
        if (!(driver.key in nextRanges)) nextRanges[driver.key] = driver.defaultRange;

        const value = normalizeImportedDriverValue(driver, row, getCell(row, ["基准值", "Value", "Base", "数值", "假设值"]), importedSalesVolume);
        const range = normalizeImportedDriverValue(driver, row, getCell(row, ["敏感性幅度", "Range", "Sensitivity Range", "冲击范围", "幅度"]), importedSalesVolume);
        const bear = normalizeImportedDriverValue(driver, row, getCell(row, ["Bear", "Downside", "悲观", "悲观情景"]), importedSalesVolume);
        const base = normalizeImportedDriverValue(driver, row, getCell(row, ["Base", "基准情景"]), importedSalesVolume);
        const bull = normalizeImportedDriverValue(driver, row, getCell(row, ["Bull", "Upside", "乐观", "乐观情景"]), importedSalesVolume);

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
        throw new Error("没有识别到模板中的序号或名称");
    }

    DRIVER_DEFINITIONS = nextDefinitions;
    refreshDriverIndex();
    AppState.assumptions = sanitizeAssumptions(nextAssumptions);
    AppState.ranges = Object.fromEntries(
        DRIVER_DEFINITIONS.map((driver) => [driver.key, Math.abs(Number(nextRanges[driver.key] ?? driver.defaultRange ?? 0))])
    );
    AppState.scenarioOverrides = hasScenarioValues ? nextScenarios : null;
    if (!driverByKey[AppState.xDriver]) AppState.xDriver = "salesVolume";
    if (!driverByKey[AppState.yDriver] || AppState.yDriver === AppState.xDriver) {
        AppState.yDriver = DRIVER_DEFINITIONS.find((driver) => driver.key !== AppState.xDriver)?.key || "salesVolume";
    }
    renderControlInputs();
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

function findDriverFromRow(row, rowIndex = 0, definitions = DRIVER_DEFINITIONS, usedKeys = new Set()) {
    const keyCell = getCell(row, ["Key", "Variable", "Code", "变量代码", "代码", "字段"]);
    const nameCell = getCell(row, ["Name", "Variable Name", "变量", "变量名称", "名称", "科目"]);
    const key = canonical(keyCell);
    const name = canonical(nameCell);
    const byKey = key ? definitions.find((driver) => {
        const driverNames = [driver.key, ...(driver.aliases || [])].map(canonical);
        return driverNames.includes(key);
    }) : null;
    if (byKey && !usedKeys.has(byKey.key)) return byKey;

    const rowNumber = getRowNumber(row, rowIndex);
    const bySequence = definitions[rowNumber - 1];
    if (bySequence && !usedKeys.has(bySequence.key)) return bySequence;

    const byName = definitions.find((driver) => {
        const driverNames = [driver.key, driver.name, ...(driver.aliases || [])].map(canonical);
        return driverNames.includes(name);
    });
    return byName;
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

function getTemplatePart(driver) {
    if (isSalesVolumeDriver(driver)) return "销量";
    if (isUnitRevenueDriver(driver)) return "变动收入";
    if (isUnitVariableCostDriver(driver)) return "变动成本";
    if (driver.group === "fixedDeduction") return "固定扣减";
    if (driver.group === "profitAddition") return "利润贡献";
    return "其他";
}

function getTemplateBasis(driver) {
    if (driver.kind === "volume") return "总量";
    return "总额";
}

function getTemplateName(driver) {
    const names = {
        unitNetRevenue: "净收入总额",
        unitMaterialCost: "材料成本总额",
        unitVariableManufacturingCost: "变动制造费用总额",
        unitVariableSalesCost: "变动销售费用总额"
    };
    return names[driver.key] || driver.name;
}

function getTemplateUnit(driver) {
    if (driver.kind === "unitAmount") return "亿元";
    return driver.unit;
}

function getTemplateDisplayValue(driver, value) {
    if (driver.kind !== "unitAmount") return value;
    const salesVolume = Number(AppState.assumptions.salesVolume || 0);
    if (!Number.isFinite(salesVolume) || salesVolume <= 0) return 0;
    return round(Number(value || 0) * salesVolume, 2);
}

function getRowNumber(row, fallbackIndex) {
    const value = parseNumeric(getCell(row, ["序号", "No", "Line", "行号"]));
    if (Number.isFinite(value) && value > 0) return Math.round(value);
    return fallbackIndex + 1;
}

function getImportedName(row) {
    return String(getCell(row, ["名称", "Name", "变量", "变量名称", "科目"]) || "").trim();
}

function getImportedPart(row) {
    return String(getCell(row, ["部分", "分类", "类型", "科目分类", "Part", "Category"]) || "").trim();
}

function getImportedBasis(row) {
    return String(getCell(row, ["口径", "数据口径", "填写口径", "Basis"]) || "").trim();
}

function getImportedUnit(row) {
    return String(getCell(row, ["单位", "Unit"]) || "").trim();
}

function normalizeAmountUnit(value, unit) {
    if (!Number.isFinite(value)) return NaN;
    const unitKey = canonical(unit);
    if (unitKey.includes("百万元")) return value / 100;
    if (unitKey.includes("万元")) return value / 10000;
    return value;
}

function isTotalBasisRow(row, driver) {
    if (driver.kind !== "unitAmount") return false;
    const basis = canonical(getImportedBasis(row));
    const unit = canonical(getImportedUnit(row));
    return basis.includes("总") || basis.includes("合计") || unit.includes("亿元") || unit.includes("百万元");
}

function normalizeImportedDriverValue(driver, row, value, salesVolume) {
    const numeric = normalizeImportedValue(driver, value);
    if (!Number.isFinite(numeric)) return NaN;
    if (!isTotalBasisRow(row, driver)) return numeric;
    const amountInYi = normalizeAmountUnit(numeric, getImportedUnit(row));
    if (!Number.isFinite(amountInYi) || salesVolume <= 0) return NaN;
    return amountInYi / salesVolume;
}

function makeCustomKey(name, index, usedKeys) {
    const safeName = canonical(name).replace(/[^a-z0-9]/g, "").slice(0, 20);
    let key = `custom_${index + 1}${safeName ? `_${safeName}` : ""}`;
    let suffix = 2;
    while (usedKeys.has(key)) {
        key = `custom_${index + 1}_${suffix}`;
        suffix++;
    }
    return key;
}

function inferCustomDriver(row, index, usedKeys) {
    const name = getImportedName(row) || `新增科目 ${index + 1}`;
    const part = canonical(getImportedPart(row));
    const basis = canonical(getImportedBasis(row));
    const unit = getImportedUnit(row);
    const nameKey = canonical(name);

    if (part.includes("销量")) {
        return null;
    }

    const isRevenue = part.includes("收入") || part.includes("售价") || nameKey.includes("收入") || nameKey.includes("售价");
    const isVariable = part.includes("变动") || part.includes("边际") || basis.includes("单车") || unit.includes("万元/辆") || unit.includes("万元/台");
    const isProfitAddition = part.includes("贡献") || part.includes("加项") || nameKey.includes("利润") || nameKey.includes("收益");
    const isFixed = part.includes("固定") || part.includes("扣减") || part.includes("费用") || nameKey.includes("费用") || nameKey.includes("税");

    if (isVariable || isRevenue) {
        return {
            key: makeCustomKey(name, index, usedKeys),
            name,
            aliases: [name],
            unit: "万元/辆",
            kind: "unitAmount",
            group: "volume",
            step: 0.1,
            decimals: 2,
            defaultValue: 0,
            defaultRange: 0,
            impact: isRevenue ? "positive" : "negative",
            description: name
        };
    }

    return {
        key: makeCustomKey(name, index, usedKeys),
        name,
        aliases: [name],
        unit: unit || "亿元",
        kind: "amount",
        group: isProfitAddition && !isFixed ? "profitAddition" : "fixedDeduction",
        step: 1,
        defaultValue: 0,
        defaultRange: 0,
        impact: isProfitAddition && !isFixed ? "positive" : "negative",
        description: name
    };
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
    document.getElementById("target-profit-input").value = AppState.targetProfit ?? "";
    document.getElementById("x-driver-select").value = AppState.xDriver;
    document.getElementById("y-driver-select").value = AppState.yDriver;
    document.getElementById("matrix-steps").value = AppState.matrixSteps;
}

function renderAll() {
    AppState.assumptions = sanitizeAssumptions(AppState.assumptions);
    const result = computeModel(AppState.assumptions);
    renderMetrics(result);
    renderTargetProfitAnalysis(result);
    renderTornadoChart();
    renderScenarioChart();
    renderMatrixChart();
    renderWaterfallCharts(result);
}

function renderMetrics(result) {
    const cards = [
        {
            label: "销量",
            value: formatVolume(result.salesVolume, 1),
            sub: "当前销量假设"
        },
        {
            label: "单车净收入",
            value: formatUnitAmount(result.unitNetRevenue, 2),
            sub: "每辆车确认的净收入"
        },
        {
            label: "净收入总额",
            value: formatAmount(result.netRevenue, 1),
            sub: "销量 × 单车净收入"
        },
        {
            label: "边际总额",
            value: formatAmount(result.contributionMargin, 1),
            sub: `边际率 ${formatNumber(result.contributionMarginRate, 1)}%`
        },
        {
            label: "单车边际",
            value: formatUnitAmount(result.unitContributionMargin, 2),
            sub: `单车变动成本 ${formatUnitAmount(result.unitVariableCost, 2)}`
        },
        {
            label: "利润总额",
            value: formatAmount(result.profit, 1),
            sub: `利润总额率 ${formatNumber(result.profitRate, 1)}%`
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

function renderTargetProfitAnalysis(result) {
    if (!hasTargetProfit()) {
        renderTargetProfitPrompt();
        return;
    }
    renderTargetProfitSummary(result);
    renderTargetProfitChart(result);
}

function renderTargetProfitPrompt() {
    const summary = document.getElementById("target-summary");
    const chart = document.getElementById("target-profit-chart");
    if (summary) {
        summary.innerHTML = `
            <div class="target-empty">
                <strong>填写目标利润后显示反推结果</strong>
                <span>请在左侧输入目标利润。系统会计算目标销量、所需单车净收入和盈亏平衡销量。</span>
            </div>
        `;
    }
    if (chart) {
        if (typeof Plotly !== "undefined") Plotly.purge(chart);
        chart.innerHTML = `
            <div class="chart-empty">
                请在左侧填写目标利润后查看平衡点曲线。
            </div>
        `;
    }
}

function renderTargetProfitSummary(result) {
    const analysis = computeTargetProfitAnalysis(result);
    const formatFiniteVolume = (value) => (
        Number.isFinite(value) && value >= 0 ? formatVolume(value, 1) : "暂不可计算"
    );
    const formatFiniteUnit = (value) => (
        Number.isFinite(value) && value >= 0 ? formatUnitAmount(value, 2) : "暂不可计算"
    );
    const cards = [
        {
            label: "目标利润",
            value: formatAmount(analysis.targetProfit, 1),
            sub: `当前差额 ${formatSignedAmount(analysis.profitGap, 1)}`
        },
        {
            label: "目标销量",
            value: formatFiniteVolume(analysis.requiredTargetVolume),
            sub: Number.isFinite(analysis.targetVolumeGap)
                ? `较当前 ${formatSignedVolume(analysis.targetVolumeGap, 1)}`
                : "单车边际需先转正"
        },
        {
            label: "所需单车净收入",
            value: formatFiniteUnit(analysis.requiredUnitNetRevenue),
            sub: Number.isFinite(analysis.requiredUnitRevenueGap)
                ? `较当前 ${formatSignedUnitAmount(analysis.requiredUnitRevenueGap, 2)}`
                : "销量需大于 0"
        },
        {
            label: "盈亏平衡销量",
            value: formatFiniteVolume(analysis.breakEvenVolume),
            sub: "利润为 0 时的销量"
        }
    ];

    document.getElementById("target-summary").innerHTML = cards.map((card) => `
        <div class="target-card">
            <div class="target-label">${card.label}</div>
            <div class="target-value">${card.value}</div>
            <div class="target-sub">${card.sub}</div>
        </div>
    `).join("");
}

function renderTargetProfitChart(result) {
    if (typeof Plotly === "undefined") return;
    const curve = createProfitVolumeCurve(result);
    const pointX = [];
    const pointY = [];
    const pointLabels = [];
    const addPoint = (label, x, y) => {
        if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0) return;
        pointX.push(x);
        pointY.push(y);
        pointLabels.push(label);
    };

    addPoint("当前", result.salesVolume, result.profit);
    addPoint("盈亏平衡", curve.breakEvenVolume, 0);
    addPoint("目标", curve.requiredTargetVolume, curve.targetProfit);

    Plotly.react("target-profit-chart", [
        {
            x: curve.volumes,
            y: curve.profits.map(toDisplayAmount),
            type: "scatter",
            mode: "lines",
            name: "利润曲线",
            line: { color: "#5c8fba", width: 3 },
            hovertemplate: `销量：%{x:.1f} 万辆<br>利润：%{y:.1f} ${getDisplayAmountUnit()}<extra></extra>`
        },
        {
            x: pointX,
            y: pointY.map(toDisplayAmount),
            type: "scatter",
            mode: "markers+text",
            name: "关键点",
            text: pointLabels,
            textposition: "top center",
            marker: {
                color: ["#141413", "#d97757", "#788c5d"].slice(0, pointX.length),
                size: 10
            },
            hovertemplate: `%{text}<br>销量：%{x:.1f} 万辆<br>利润：%{y:.1f} ${getDisplayAmountUnit()}<extra></extra>`
        }
    ], getLockedPlotLayout({
        height: 350,
        margin: { l: 58, r: 24, t: 28, b: 54 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: getPlotFont(),
        showlegend: false,
        shapes: [
            {
                type: "line",
                xref: "paper",
                x0: 0,
                x1: 1,
                y0: 0,
                y1: 0,
                line: { color: "#d97757", width: 1, dash: "dot" }
            },
            {
                type: "line",
                xref: "paper",
                x0: 0,
                x1: 1,
                y0: toDisplayAmount(curve.targetProfit),
                y1: toDisplayAmount(curve.targetProfit),
                line: { color: "#788c5d", width: 1, dash: "dot" }
            }
        ],
        xaxis: {
            title: "销量（万辆）",
            gridcolor: "#ece8de"
        },
        yaxis: {
            title: getDisplayAmountUnit(),
            gridcolor: "#ece8de",
            zeroline: true,
            zerolinecolor: "#d97757"
        }
    }), getPlotConfig());
}

function renderTornadoChart() {
    if (typeof Plotly === "undefined") return;
    const rows = calculateSensitivityRows().reverse();
    const chartHeight = Math.max(440, rows.length * 34 + 110);
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
        height: chartHeight,
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

function getDriverTotalAmount(result, driver) {
    if (driver.kind === "unitAmount") return result.salesVolume * Number(result[driver.key] || 0);
    return Number(result[driver.key] || 0);
}

function hasWaterfallValue(result, driver) {
    return Math.abs(getDriverTotalAmount(result, driver)) > 1e-9;
}

function renderWaterfallCharts(result) {
    if (typeof Plotly === "undefined") return;
    const variableCostDrivers = getDriversBy(isUnitVariableCostDriver).filter((driver) => hasWaterfallValue(result, driver));
    const fixedDeductionDrivers = getDriversBy((driver) => driver.group === "fixedDeduction").filter((driver) => hasWaterfallValue(result, driver));
    const profitAdditionDrivers = getDriversBy((driver) => driver.group === "profitAddition").filter((driver) => hasWaterfallValue(result, driver));

    renderWaterfallChart("margin-bridge-chart", {
        labels: [
            "净收入",
            ...variableCostDrivers.map((driver) => driver.name),
            "边际"
        ],
        values: [
            result.netRevenue,
            ...variableCostDrivers.map((driver) => -getDriverTotalAmount(result, driver)),
            result.contributionMargin
        ],
        measures: [
            "absolute",
            ...variableCostDrivers.map(() => "relative"),
            "total"
        ],
        bottomMargin: 76,
        tickAngle: -24,
        height: 340
    });

    renderWaterfallChart("profit-bridge-chart", {
        labels: [
            "边际",
            ...fixedDeductionDrivers.map((driver) => driver.name),
            ...profitAdditionDrivers.map((driver) => driver.name),
            "利润总额"
        ],
        values: [
            result.contributionMargin,
            ...fixedDeductionDrivers.map((driver) => -getDriverTotalAmount(result, driver)),
            ...profitAdditionDrivers.map((driver) => getDriverTotalAmount(result, driver)),
            result.profit
        ],
        measures: [
            "absolute",
            ...fixedDeductionDrivers.map(() => "relative"),
            ...profitAdditionDrivers.map(() => "relative"),
            "total"
        ],
        bottomMargin: 112,
        leftMargin: 66,
        rightMargin: 42,
        topMargin: 52,
        tickAngle: -18,
        height: 450
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
        margin: {
            l: options.leftMargin ?? 58,
            r: options.rightMargin ?? 32,
            t: options.topMargin ?? 42,
            b: options.bottomMargin
        },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: getPlotFont(),
        yaxis: {
            title: getDisplayAmountUnit(),
            gridcolor: "#ece8de"
        },
        xaxis: {
            tickangle: options.tickAngle,
            automargin: true,
            tickfont: { size: 11 }
        }
    }), getPlotConfig());
}

function resetModel() {
    DRIVER_DEFINITIONS = cloneBaseDriverDefinitions();
    refreshDriverIndex();
    AppState.assumptions = getDefaultAssumptions();
    AppState.ranges = getDefaultRanges();
    AppState.scenarioOverrides = null;
    AppState.metric = "profit";
    AppState.displayUnit = "亿";
    AppState.targetProfit = null;
    AppState.xDriver = "salesVolume";
    AppState.yDriver = "unitMaterialCost";
    AppState.matrixSteps = 7;
    renderControlInputs();
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
    return DRIVER_DEFINITIONS.map((driver, index) => {
        const value = AppState.assumptions[driver.key] ?? driver.defaultValue;
        const range = AppState.ranges[driver.key] ?? driver.defaultRange;
        return {
            "序号": index + 1,
            "部分": getTemplatePart(driver),
            "名称": getTemplateName(driver),
            "口径": getTemplateBasis(driver),
            "基准值": getTemplateDisplayValue(driver, value),
            "敏感性幅度": getTemplateDisplayValue(driver, range),
            "单位": getTemplateUnit(driver)
        };
    });
}

function downloadTemplate(format) {
    const rows = getTemplateRows();
    if (format === "xlsx" && typeof XLSX !== "undefined") {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(rows);
        worksheet["!cols"] = [
            { wch: 8 }, { wch: 12 }, { wch: 20 }, { wch: 10 },
            { wch: 12 }, { wch: 14 }, { wch: 12 }
        ];
        const readme = XLSX.utils.aoa_to_sheet([
            ["字段", "说明"],
            ["序号", "用于识别已有科目。修改名称时请保留原序号。"],
            ["部分", "可填写：销量、变动收入、变动成本、固定扣减、利润贡献。新增行按该列进入模型。"],
            ["名称", "图表和控制台显示的科目名称，可修改。"],
            ["口径", "销量填总量；其余边际以上科目填总额，系统按销量反算单车。"],
            ["基准值", "当前方案的基准假设值。边际以上金额口径为亿元总额。"],
            ["敏感性幅度", "用于自动生成悲观、乐观情景和敏感性排序。边际以上金额口径为亿元总额。"]
        ]);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Assumptions");
        XLSX.utils.book_append_sheet(workbook, readme, "Readme");
        XLSX.writeFile(workbook, "profit-sensitivity-template.xlsx");
        return;
    }

    downloadBlob(
        new Blob(["\uFEFF" + toCsv(rows)], { type: "text/csv;charset=utf-8;" }),
        "profit-sensitivity-template.csv"
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
        computeTargetProfitAnalysis,
        createProfitVolumeCurve,
        getTemplateRows,
        sanitizeAssumptions,
        sequenceAround,
        parseCsv,
        normalizeImportedValue,
        getPlotConfig,
        getLockedPlotLayout,
        initApp
    };
}
