/* global Plotly, XLSX */

(function () {
    const DEFAULT_DIMENSIONS = ["大区", "国家", "品牌市场", "经营模式", "业务单元", "车型"];
    const RESERVED_LONG_TABLE_COLUMNS = [
        "年度", "year", "Year",
        "数据口径", "口径", "版本", "scenario", "Scenario",
        "数据类型", "类型", "dataType",
        "科目", "项目", "指标", "subject", "lineItem",
        "金额", "数量", "值", "amount", "Amount", "value",
        "实际", "实际值", "实际数据", "actual", "Actual",
        "预算", "预算值", "budget", "Budget",
        "单位", "unit",
        "说明", "备注", "note"
    ];

    const VARIANCE_DRIVERS = [
        { key: "profitGap", label: "利润总额", gapLabel: "利润差异", actualKey: "profit", budgetKey: "profit", unit: "amount", value: (summary) => summary.profitGap },
        { key: "salesVolume", label: "销量", gapLabel: "销量差异", actualKey: "salesVolume", budgetKey: "salesVolume", unit: "volume", value: (summary) => summary.actual.salesVolume - summary.budget.salesVolume },
        { key: "netRevenue", label: "净收入总额", gapLabel: "净收入差异", actualKey: "netRevenue", budgetKey: "netRevenue", unit: "amount", value: (summary) => summary.revenueGap },
        { key: "contributionMargin", label: "边际总额", gapLabel: "边际差异", actualKey: "contributionMargin", budgetKey: "contributionMargin", unit: "amount", value: (summary) => summary.contributionMarginGap },
        { key: "contributionMarginRate", label: "边际率", gapLabel: "边际率差异", actualKey: "contributionMarginRate", budgetKey: "contributionMarginRate", unit: "percent", value: (summary) => summary.actual.contributionMarginRate - summary.budget.contributionMarginRate },
        { key: "unitNetRevenue", label: "单车净收入", gapLabel: "单车净收入差异", actualKey: "unitNetRevenue", budgetKey: "unitNetRevenue", unit: "unitAmount", value: (summary) => summary.actual.unitNetRevenue - summary.budget.unitNetRevenue },
        { key: "unitContributionMargin", label: "单车边际", gapLabel: "单车边际差异", actualKey: "unitContributionMargin", budgetKey: "unitContributionMargin", unit: "unitAmount", value: (summary) => summary.actual.unitContributionMargin - summary.budget.unitContributionMargin },
        { key: "materialCost", label: "材料成本", gapLabel: "材料成本影响", actualKey: "materialCost", budgetKey: "materialCost", unit: "amount", value: (summary) => summary.materialCostImpact },
        { key: "variableManufacturingCost", label: "变动制造费用", gapLabel: "变动制造费用影响", actualKey: "variableManufacturingCost", budgetKey: "variableManufacturingCost", unit: "amount", value: (summary) => summary.variableManufacturingCostImpact },
        { key: "variableSalesCost", label: "变动销售费用", gapLabel: "变动销售费用影响", actualKey: "variableSalesCost", budgetKey: "variableSalesCost", unit: "amount", value: (summary) => summary.variableSalesCostImpact },
        { key: "fixedSubjectTotal", label: "固定科目", gapLabel: "固定科目影响", actualKey: "fixedSubjectTotal", budgetKey: "fixedSubjectTotal", unit: "amount", value: (summary) => summary.fixedSubjectImpact }
    ];

    const VARIANCE_DRIVER_BY_KEY = VARIANCE_DRIVERS.reduce((map, driver) => {
        map[driver.key] = driver;
        return map;
    }, {});

    const DASHBOARD_METRICS = [
        { key: "salesVolume", ratioKey: "volumeAchievement", ratioLabel: "达成率", compare: "higher" },
        { key: "netRevenue", ratioKey: "revenueAchievement", ratioLabel: "达成率", compare: "higher" },
        { key: "unitNetRevenue", ratioLabel: "达成率", compare: "higher" },
        { key: "contributionMargin", ratioKey: "contributionMarginAchievement", ratioLabel: "达成率", compare: "higher" },
        { key: "unitContributionMargin", ratioLabel: "达成率", compare: "higher" },
        { key: "profitGap", ratioKey: "profitAchievement", ratioLabel: "达成率", compare: "higher" }
    ];

    const MAX_PERFORMANCE_CARDS = 8;

    const SUBJECT_DEFINITIONS = [
        { key: "salesVolume", section: "variable", mode: "add", labels: ["发车量", "发车", "销量", "销售量", "Sales Volume", "volume"] },
        { key: "unitNetRevenue", section: "variable", mode: "replace", labels: ["单车净收入", "单车收入", "单车净售价", "unitNetRevenue", "unitRevenue"] },
        { key: "unitMaterialCost", section: "variable", mode: "replace", labels: ["单车材料成本", "材料成本单车", "unitMaterialCost"] },
        { key: "unitVariableManufacturingCost", section: "variable", mode: "replace", labels: ["单车变动制造费用", "变动制造费用单车", "unitVariableManufacturingCost"] },
        { key: "unitVariableSalesCost", section: "variable", mode: "replace", labels: ["单车变动销售费用", "变动销售费用单车", "unitVariableSalesCost"] },
        { key: "netRevenueAmount", section: "variable", mode: "add", labels: ["净收入", "营业收入", "收入", "revenue", "netRevenue"] },
        { key: "materialCostAmount", section: "variable", mode: "add", labels: ["材料成本", "直接材料", "materialCost"] },
        { key: "variableManufacturingCostAmount", section: "variable", mode: "add", labels: ["变动制造费用", "制造变动费用", "variableManufacturingCost"] },
        { key: "variableSalesCostAmount", section: "variable", mode: "add", labels: ["变动销售费用", "销售变动费用", "variableSalesCost"] },
        { key: "contributionMarginAmount", section: "variable", mode: "add", labels: ["边际", "边际总额", "贡献边际", "毛利额", "contributionMargin", "Total Margin"] },
        { key: "profitAmount", section: "result", mode: "add", labels: ["利润总额", "净利润", "profit", "netProfit"] }
    ];

    const SUBJECT_LOOKUP = SUBJECT_DEFINITIONS.reduce((map, definition) => {
        definition.labels.forEach((label) => {
            map[normalizeToken(label)] = definition;
        });
        return map;
    }, {});

    const TEMPLATE_HEADERS = [
        "科目",
        "大区",
        "国家",
        "品牌市场",
        "经营模式",
        "业务单元",
        "车型",
        "金额",
        "单位",
        "说明"
    ];
    const MANUAL_SUBJECT_FIELDS = ["subject", "actual", "budget"];

    const state = {
        rawData: [],
        filteredData: [],
        operationSourceRows: [],
        subjectSourceRows: [],
        manualSubjectRows: [],
        manualSubjectDrafts: [],
        availableDimensions: DEFAULT_DIMENSIONS.slice(),
        selectedDimensions: DEFAULT_DIMENSIONS.slice(),
        lastSummary: null,
        activeVarianceKey: "contributionMargin"
    };

    const COLORS = {
        orange: "#d97757",
        blue: "#5c8fba",
        green: "#788c5d",
        red: "#b65f55",
        text: "#141413",
        muted: "#747168",
        grid: "#e8e6dc",
        paper: "rgba(0,0,0,0)"
    };

    function byId(id) {
        return document.getElementById(id);
    }

    function bindOnce(element, eventName, handler, key = eventName) {
        if (!element) return;
        const bindKey = `bound${normalizeToken(key) || eventName}`;
        if (element.dataset?.[bindKey] === "true") return;
        element.addEventListener(eventName, handler);
        if (element.dataset) element.dataset[bindKey] = "true";
    }

    function safeArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function normalizeToken(value) {
        return String(value || "")
            .replace(/[\s_\-（）()]/g, "")
            .trim()
            .toLowerCase();
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function toNumber(value) {
        if (typeof value === "number") return Number.isFinite(value) ? value : 0;
        if (value === null || value === undefined) return 0;

        const raw = String(value).trim();
        if (!raw) return 0;

        const isNegative = raw.includes("(") && raw.includes(")");
        const cleaned = raw
            .replace(/[,%￥¥元辆台]/g, "")
            .replace(/[万亿]/g, "")
            .replace(/[()]/g, "")
            .trim();
        const numeric = Number(cleaned);
        if (!Number.isFinite(numeric)) return 0;
        return isNegative ? -numeric : numeric;
    }

    function pick(row, aliases) {
        for (const alias of aliases) {
            if (row[alias] !== undefined && row[alias] !== null && row[alias] !== "") {
                return row[alias];
            }
        }
        return undefined;
    }

    function normalizeRowKeys(row) {
        const normalized = {};
        Object.keys(row || {}).forEach((key) => {
            normalized[String(key).replace(/^\uFEFF/, "").trim()] = row[key];
        });
        return normalized;
    }

    function currentDimensions() {
        const available = state.availableDimensions.length ? state.availableDimensions : DEFAULT_DIMENSIONS;
        const selected = safeArray(state.selectedDimensions).filter((dimension) => available.includes(dimension));
        return selected.length ? selected : defaultSelectedDimensions(available);
    }

    function dimensionLabel(dimension) {
        return dimension || "维度";
    }

    function dimensionFilterId(dimension) {
        const fallback = currentDimensions().indexOf(dimension);
        return `filter-dimension-${normalizeToken(dimension) || fallback}`;
    }

    function hasDimensionValue(row, dimension) {
        const dimensions = row?.dimensions || {};
        return Object.prototype.hasOwnProperty.call(dimensions, dimension)
            && String(dimensions[dimension] || "").trim();
    }

    function rowsForDimension(rows, dimension) {
        return safeArray(rows).filter((row) => hasDimensionValue(row, dimension));
    }

    function orderedDimensions(dimensions) {
        const unique = Array.from(new Set(safeArray(dimensions).filter(Boolean)));
        return [
            ...DEFAULT_DIMENSIONS.filter((dimension) => unique.includes(dimension)),
            ...unique.filter((dimension) => !DEFAULT_DIMENSIONS.includes(dimension)).sort((a, b) => a.localeCompare(b, "zh-CN"))
        ];
    }

    function defaultSelectedDimensions(dimensions) {
        const ordered = orderedDimensions(dimensions.length ? dimensions : DEFAULT_DIMENSIONS);
        if (ordered.length <= 6) return ordered;
        const primary = DEFAULT_DIMENSIONS.filter((dimension) => ordered.includes(dimension));
        const extras = ordered.filter((dimension) => !primary.includes(dimension));
        const selected = [...primary, ...extras].slice(0, 5);
        return selected.length ? selected : ordered.slice(0, 5);
    }

    function reconcileSelectedDimensions(preferred = state.selectedDimensions) {
        const available = state.availableDimensions.length ? state.availableDimensions : DEFAULT_DIMENSIONS;
        const selected = orderedDimensions(preferred).filter((dimension) => available.includes(dimension));
        return selected.length ? selected : defaultSelectedDimensions(available);
    }

    function inferAvailableDimensions(parsedRows) {
        const dimensions = [];
        safeArray(parsedRows).forEach((row) => {
            Object.keys(row.dimensions || {}).forEach((dimension) => {
                if (!dimensions.includes(dimension)) dimensions.push(dimension);
            });
        });
        return orderedDimensions(dimensions);
    }

    function reservedColumnSet() {
        return new Set(RESERVED_LONG_TABLE_COLUMNS.map(normalizeToken));
    }

    function groupBy(rows, keyFn) {
        const map = new Map();
        safeArray(rows).forEach((row) => {
            const key = keyFn(row) || "未分类";
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(row);
        });
        return map;
    }

    function currentUnit() {
        return byId("unit-select")?.value || "yi";
    }

    function displayAmount(value) {
        return currentUnit() === "million" ? value * 100 : value;
    }

    function amountAxisLabel() {
        return currentUnit() === "million" ? "百万元" : "亿元";
    }

    function formatNumber(value, digits = 1) {
        if (!Number.isFinite(value)) return "-";
        const normalized = Math.abs(value) < 1e-9 ? 0 : value;
        return normalized.toLocaleString("zh-CN", {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        }).replace("-0", "0");
    }

    function formatAmount(value, digits = 2) {
        if (!Number.isFinite(value)) return "-";
        return `${formatNumber(displayAmount(value), digits)} ${amountAxisLabel()}`;
    }

    function formatGap(value, digits = 2) {
        if (!Number.isFinite(value)) return "-";
        const sign = value > 0 ? "+" : value < 0 ? "-" : "";
        return `${sign}${formatAmount(Math.abs(value), digits)}`;
    }

    function formatSignedValue(value, formatter) {
        if (!Number.isFinite(value)) return "-";
        const sign = value > 0 ? "+" : value < 0 ? "-" : "";
        return `${sign}${formatter(Math.abs(value))}`;
    }

    function formatPercent(value, digits = 1) {
        if (!Number.isFinite(value)) return "-";
        return `${formatNumber(value * 100, digits)}%`;
    }

    function formatVolume(value) {
        if (!Number.isFinite(value)) return "-";
        return `${formatNumber(value, 2)} 万辆`;
    }

    function formatUnitAmount(value) {
        if (!Number.isFinite(value)) return "-";
        return `${formatNumber(value, 2)} 万元/辆`;
    }

    function bridgeAxisLabel(value) {
        const labels = {
            "预算边际总额": "预算边际<br>总额",
            "实际边际总额": "实际边际<br>总额",
            "预算单车边际": "预算单车<br>边际",
            "实际单车边际": "实际单车<br>边际",
            "实际利润总额": "实际利润<br>总额",
            "净收入差异": "净收入<br>差异",
            "材料成本影响": "材料成本<br>影响",
            "变动制造费用影响": "变动制造<br>影响",
            "变动销售费用影响": "变动销售<br>影响",
            "变动制造影响": "变动制造<br>影响",
            "变动销售影响": "变动销售<br>影响",
            "单车净收入": "单车净<br>收入",
            "边际差额": "边际<br>差额",
            "净收入": "净收入",
            "材料成本": "材料<br>成本",
            "变动制造": "变动<br>制造",
            "变动销售": "变动<br>销售",
            "边际总额": "边际<br>总额"
        };
        const text = String(value || "");
        if (labels[text]) return labels[text];
        if (text.length <= 4) return text;
        if (text.length <= 6) return `${text.slice(0, 2)}<br>${text.slice(2)}`;
        if (text.length <= 9) return `${text.slice(0, 3)}<br>${text.slice(3, 6)}<br>${text.slice(6)}`;
        return `${text.slice(0, 3)}<br>${text.slice(3, 6)}<br>${text.slice(6, 9)}<br>${text.slice(9)}`;
    }

    function isCompactBridgeViewport() {
        return typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
    }

    function compactBridgeAxisLabel(value) {
        const labels = {
            "预算边际总额": "预算边际",
            "实际边际总额": "实际边际",
            "预算利润": "预算利润",
            "实际利润总额": "实际利润",
            "净收入差异": "净收入",
            "材料成本影响": "材料成本",
            "变动制造费用影响": "变动制造",
            "变动销售费用影响": "变动销售",
            "边际差额": "边际差额",
            "边际总额": "边际总额",
            "利润总额": "利润总额"
        };
        const text = String(value || "");
        const normalized = labels[text] || text.replace(/影响$/, "").replace(/总额$/, "");
        if (normalized.length <= 6) return normalized;
        if (normalized.length <= 10) return `${normalized.slice(0, 5)}<br>${normalized.slice(5)}`;
        return `${normalized.slice(0, 5)}<br>${normalized.slice(5, 9)}…`;
    }

    function currentVarianceDriver() {
        const key = byId("variance-metric-select")?.value
            || state.activeVarianceKey
            || "contributionMargin";
        return VARIANCE_DRIVER_BY_KEY[key] || VARIANCE_DRIVER_BY_KEY.contributionMargin;
    }

    function currentAnalysisDimension() {
        const dimensions = currentDimensions();
        const filters = currentControlValues().dimensionFilters;
        const deepestFilteredIndex = dimensions.reduce((deepest, dimension, index) => {
            return filters[dimension] ? Math.max(deepest, index) : deepest;
        }, -1);
        if (deepestFilteredIndex >= 0 && dimensions[deepestFilteredIndex + 1]) {
            return dimensions[deepestFilteredIndex + 1];
        }

        return dimensions[0] || "";
    }

    function driverByKey(key, fallback = "profitGap") {
        return VARIANCE_DRIVER_BY_KEY[key] || VARIANCE_DRIVER_BY_KEY[fallback];
    }

    function driverGapLabel(driver) {
        return driver.gapLabel || `${driver.label}差异`;
    }

    function formatDriverValue(value, driver, digits = 2) {
        if (driver.unit === "volume") return formatVolume(value);
        if (driver.unit === "unitAmount") return formatUnitAmount(value);
        if (driver.unit === "percent") return formatPercent(value);
        return formatAmount(value, digits);
    }

    function formatDriverGap(value, driver, digits = 2) {
        if (!Number.isFinite(value)) return "-";
        const sign = value > 0 ? "+" : value < 0 ? "-" : "";
        return `${sign}${formatDriverValue(Math.abs(value), driver, digits)}`;
    }

    function driverValue(summary, driver = currentVarianceDriver()) {
        return Number(driver.value(summary) || 0);
    }

    function driverActual(summary, driver = currentVarianceDriver()) {
        return Number(summary.actual[driver.actualKey] || 0);
    }

    function driverBudget(summary, driver = currentVarianceDriver()) {
        return Number(summary.budget[driver.budgetKey] || 0);
    }

    function varianceClass(value) {
        return value >= 0 ? "positive" : "negative";
    }

    function ratioValue(actual, budget) {
        if (!Number.isFinite(actual) || !Number.isFinite(budget)) return 0;
        if (!budget) return actual ? 1 : 0;
        return actual / budget;
    }

    function fixedSubjectName(subject) {
        const name = String(subject || "").trim();
        return name || "固定科目";
    }

    function ensureFixedSubjects(assumptions) {
        if (!assumptions.fixedSubjects || typeof assumptions.fixedSubjects !== "object") {
            assumptions.fixedSubjects = {};
        }
        return assumptions.fixedSubjects;
    }

    function addFixedSubject(assumptions, subject, value) {
        if (!Number.isFinite(value) || Math.abs(value) < 1e-9) return;
        const fixedSubjects = ensureFixedSubjects(assumptions);
        const name = fixedSubjectName(subject);
        fixedSubjects[name] = Number(fixedSubjects[name] || 0) + value;
    }

    function fixedSubjectEntries(value) {
        return Object.entries(value?.fixedSubjects || {})
            .map(([subject, amount]) => ({ subject, amount: Number(amount || 0) }))
            .filter((item) => Math.abs(item.amount) > 1e-9);
    }

    function fixedSubjectTotal(value) {
        return fixedSubjectEntries(value).reduce((sum, item) => sum + item.amount, 0);
    }

    function fixedSubjectNames(summary) {
        const names = [];
        [summary?.actual?.fixedSubjects, summary?.budget?.fixedSubjects].forEach((subjects) => {
            Object.keys(subjects || {}).forEach((name) => {
                if (!names.includes(name)) names.push(name);
            });
        });
        return names;
    }

    function fixedSubjectVarianceRows(summary) {
        return fixedSubjectNames(summary).map((name) => {
            const actual = Number(summary.actual.fixedSubjects?.[name] || 0);
            const budget = Number(summary.budget.fixedSubjects?.[name] || 0);
            return {
                key: "fixedSubjectTotal",
                name,
                actual,
                budget,
                group: "fixed",
                value: -(actual - budget)
            };
        });
    }

    function profitVarianceBridgeRows(summary, { includeFixed = true } = {}) {
        const variableRows = [
            { key: "netRevenue", name: "净收入差异", group: "variable", value: summary.revenueGap },
            { key: "materialCost", name: "材料成本影响", group: "variable", value: summary.materialCostImpact },
            { key: "variableManufacturingCost", name: "变动制造费用影响", group: "variable", value: summary.variableManufacturingCostImpact },
            { key: "variableSalesCost", name: "变动销售费用影响", group: "variable", value: summary.variableSalesCostImpact }
        ];
        const variableImpact = variableRows.reduce((sum, row) => sum + row.value, 0);
        const marginResidual = summary.contributionMarginGap - variableImpact;
        const residualRows = Math.abs(marginResidual) > 1e-9
            ? [{ key: "contributionMargin", name: "边际差额", group: "variable", value: marginResidual }]
            : [];

        return [
            ...variableRows,
            ...residualRows,
            ...(includeFixed ? fixedSubjectVarianceRows(summary) : [])
        ];
    }

    function mergeFixedSubjects(target, source) {
        fixedSubjectEntries({ fixedSubjects: source }).forEach((item) => {
            target[item.subject] = Number(target[item.subject] || 0) + item.amount;
        });
        return target;
    }

    function showMessage(type, text) {
        const area = byId("message-area");
        if (!area) return;
        area.innerHTML = `<div class="message ${type}">${text}</div>`;
        window.clearTimeout(showMessage.timer);
        showMessage.timer = window.setTimeout(() => {
            area.innerHTML = "";
        }, 3600);
    }

    function computePnl(assumptions) {
        const salesVolume = Math.max(0, Number(assumptions.salesVolume || 0));
        const unitNetRevenueInput = Math.max(0, Number(assumptions.unitNetRevenue || 0));
        const unitMaterialCostInput = Math.max(0, Number(assumptions.unitMaterialCost || 0));
        const unitVariableManufacturingCostInput = Math.max(0, Number(assumptions.unitVariableManufacturingCost || 0));
        const unitVariableSalesCostInput = Math.max(0, Number(assumptions.unitVariableSalesCost || 0));
        const directNetRevenue = Math.max(0, Number(assumptions.netRevenueAmount || 0));
        const directMaterialCost = Math.max(0, Number(assumptions.materialCostAmount || 0));
        const directManufacturingCost = Math.max(0, Number(assumptions.variableManufacturingCostAmount || 0));
        const directSalesCost = Math.max(0, Number(assumptions.variableSalesCostAmount || 0));
        const directContributionMargin = Number(assumptions.contributionMarginAmount || 0);
        const hasDirectContributionMargin = Math.abs(directContributionMargin) > 1e-9;
        const netRevenue = directNetRevenue || salesVolume * unitNetRevenueInput;
        let materialCost = directMaterialCost || salesVolume * unitMaterialCostInput;
        const variableManufacturingCost = directManufacturingCost || salesVolume * unitVariableManufacturingCostInput;
        const variableSalesCost = directSalesCost || salesVolume * unitVariableSalesCostInput;
        const hasAnyVariableCost = Boolean(directMaterialCost || directManufacturingCost || directSalesCost || unitMaterialCostInput || unitVariableManufacturingCostInput || unitVariableSalesCostInput);

        if (hasDirectContributionMargin && netRevenue && !hasAnyVariableCost) {
            materialCost = Math.max(0, netRevenue - directContributionMargin);
        }

        const variableCostTotal = materialCost + variableManufacturingCost + variableSalesCost;
        const contributionMargin = hasDirectContributionMargin ? directContributionMargin : netRevenue - variableCostTotal;
        const unitNetRevenue = salesVolume ? netRevenue / salesVolume : unitNetRevenueInput;
        const unitMaterialCost = salesVolume ? materialCost / salesVolume : unitMaterialCostInput;
        const unitVariableManufacturingCost = salesVolume ? variableManufacturingCost / salesVolume : unitVariableManufacturingCostInput;
        const unitVariableSalesCost = salesVolume ? variableSalesCost / salesVolume : unitVariableSalesCostInput;
        const unitVariableCost = unitMaterialCost + unitVariableManufacturingCost + unitVariableSalesCost;
        const unitContributionMargin = unitNetRevenue - unitVariableCost;
        const fixedSubjects = { ...(assumptions.fixedSubjects || {}) };
        const fixedSubjectTotalValue = fixedSubjectTotal({ fixedSubjects });
        const profit = contributionMargin - fixedSubjectTotalValue;

        return {
            salesVolume,
            unitNetRevenue,
            unitMaterialCost,
            unitVariableManufacturingCost,
            unitVariableSalesCost,
            unitVariableCost,
            unitContributionMargin,
            netRevenue,
            materialCost,
            variableManufacturingCost,
            variableSalesCost,
            variableCostTotal,
            contributionMargin,
            fixedSubjects,
            fixedSubjectTotal: fixedSubjectTotalValue,
            profit,
            contributionMarginRate: netRevenue ? contributionMargin / netRevenue : 0,
            profitRate: netRevenue ? profit / netRevenue : 0,
            materialCostRate: netRevenue ? materialCost / netRevenue : 0,
            variableCostRate: netRevenue ? variableCostTotal / netRevenue : 0
        };
    }

    function summarize(rows) {
        const actual = safeArray(rows).reduce((sum, row) => addPnl(sum, row.actual), emptyPnl());
        const budget = safeArray(rows).reduce((sum, row) => addPnl(sum, row.budget), emptyPnl());
        return enrichSummary(actual, budget);
    }

    function emptyPnl() {
        return {
            salesVolume: 0,
            netRevenue: 0,
            materialCost: 0,
            variableManufacturingCost: 0,
            variableSalesCost: 0,
            variableCostTotal: 0,
            contributionMargin: 0,
            fixedSubjects: {},
            fixedSubjectTotal: 0,
            profit: 0
        };
    }

    function addPnl(sum, result) {
        Object.keys(sum).forEach((key) => {
            if (key === "fixedSubjects") return;
            sum[key] += Number(result[key] || 0);
        });
        mergeFixedSubjects(sum.fixedSubjects, result.fixedSubjects || {});
        sum.fixedSubjectTotal = fixedSubjectTotal(sum);
        sum.profit = sum.contributionMargin - sum.fixedSubjectTotal;
        return sum;
    }

    function finalizePnl(result) {
        const fixedSubjects = { ...(result.fixedSubjects || {}) };
        const fixedSubjectTotalValue = fixedSubjectTotal({ fixedSubjects }) || Number(result.fixedSubjectTotal || 0);
        const profit = result.contributionMargin - fixedSubjectTotalValue;
        return {
            ...result,
            fixedSubjects,
            fixedSubjectTotal: fixedSubjectTotalValue,
            profit,
            unitNetRevenue: result.salesVolume ? result.netRevenue / result.salesVolume : 0,
            unitMaterialCost: result.salesVolume ? result.materialCost / result.salesVolume : 0,
            unitVariableManufacturingCost: result.salesVolume ? result.variableManufacturingCost / result.salesVolume : 0,
            unitVariableSalesCost: result.salesVolume ? result.variableSalesCost / result.salesVolume : 0,
            unitVariableCost: result.salesVolume ? result.variableCostTotal / result.salesVolume : 0,
            unitContributionMargin: result.salesVolume ? result.contributionMargin / result.salesVolume : 0,
            contributionMarginRate: result.netRevenue ? result.contributionMargin / result.netRevenue : 0,
            profitRate: result.netRevenue ? profit / result.netRevenue : 0,
            materialCostRate: result.netRevenue ? result.materialCost / result.netRevenue : 0,
            variableCostRate: result.netRevenue ? result.variableCostTotal / result.netRevenue : 0
        };
    }

    function enrichSummary(actualInput, budgetInput) {
        const actual = finalizePnl(actualInput);
        const budget = finalizePnl(budgetInput);
        return {
            actual,
            budget,
            volumeAchievement: budget.salesVolume ? actual.salesVolume / budget.salesVolume : 0,
            revenueAchievement: budget.netRevenue ? actual.netRevenue / budget.netRevenue : 0,
            contributionMarginAchievement: budget.contributionMargin ? actual.contributionMargin / budget.contributionMargin : 0,
            profitAchievement: budget.profit ? actual.profit / budget.profit : 0,
            revenueGap: actual.netRevenue - budget.netRevenue,
            materialCostImpact: -(actual.materialCost - budget.materialCost),
            variableManufacturingCostImpact: -(actual.variableManufacturingCost - budget.variableManufacturingCost),
            variableSalesCostImpact: -(actual.variableSalesCost - budget.variableSalesCost),
            variableCostImpact: -(actual.variableCostTotal - budget.variableCostTotal),
            contributionMarginGap: actual.contributionMargin - budget.contributionMargin,
            fixedSubjectImpact: -(actual.fixedSubjectTotal - budget.fixedSubjectTotal),
            profitGap: actual.profit - budget.profit,
            hasBudget: Boolean(budget.salesVolume || budget.netRevenue || budget.contributionMargin || budget.profit)
        };
    }

    function buildAssumptions(row, prefix = "") {
        const p = prefix ? `${prefix}` : "";
        const assumptions = {
            salesVolume: valueByAliases(row, p, ["发车量", "发车", "销量", "salesVolume", "Sales Volume", "volume"]),
            unitNetRevenue: valueByAliases(row, p, ["单车净收入", "单车收入", "unitNetRevenue", "unitRevenue"]),
            unitMaterialCost: valueByAliases(row, p, ["单车材料成本", "unitMaterialCost"]),
            unitVariableManufacturingCost: valueByAliases(row, p, ["单车变动制造费用", "unitVariableManufacturingCost"]),
            unitVariableSalesCost: valueByAliases(row, p, ["单车变动销售费用", "unitVariableSalesCost"]),
            netRevenueAmount: valueByAliases(row, p, ["净收入", "营业收入", "收入", "netRevenue", "revenue"]),
            materialCostAmount: valueByAliases(row, p, ["材料成本", "直接材料", "materialCost"]),
            variableManufacturingCostAmount: valueByAliases(row, p, ["变动制造费用", "制造变动费用", "variableManufacturingCost"]),
            variableSalesCostAmount: valueByAliases(row, p, ["变动销售费用", "销售变动费用", "variableSalesCost"]),
            contributionMarginAmount: valueByAliases(row, p, ["边际", "边际总额", "贡献边际", "毛利额", "contributionMargin", "Total Margin"]),
            profitAmount: valueByAliases(row, p, ["利润总额", "净利润", "profit", "netProfit"]),
            fixedSubjects: {}
        };

        [
            { subject: "固定费用", aliases: ["固定科目", "固定费用", "期间费用", "fixedCost", "opex"] },
            { subject: "技术开发费", aliases: ["技术开发费", "techDevelopmentFee"] },
            { subject: "国际固定费用", aliases: ["国际固定费用", "internationalFixedCost"] },
            { subject: "折旧加摊销", aliases: ["折旧加摊销", "depreciationAmortization"] },
            { subject: "后台公共费用", aliases: ["后台公共费用", "backOfficeSharedCost"] },
            { subject: "所得税", aliases: ["所得税", "税费", "incomeTax"] }
        ].forEach((item) => addFixedSubject(assumptions, item.subject, valueByAliases(row, p, item.aliases)));

        return assumptions;
    }

    function valueByAliases(row, prefix, aliases) {
        const prefixes = prefix ? [prefix] : ["", "实际"];
        const prefixedAliases = prefixes.flatMap((item) => item ? aliases.map((alias) => `${item}${alias}`) : aliases);
        return toNumber(pick(row, Array.from(new Set([...prefixedAliases, ...aliases]))));
    }

    function applyAggregateFallback(row, assumptions, prefix = "") {
        const p = prefix ? `${prefix}` : "";
        const netRevenue = valueByAliases(row, p, ["净收入", "营业收入", "netRevenue", "revenue"]);
        const contributionMargin = valueByAliases(row, p, ["边际", "边际总额", "毛利额", "contributionMargin", "Total Margin"]);
        const fixedCost = valueByAliases(row, p, ["固定费用", "期间费用", "fixedCost", "opex"]);
        const profit = valueByAliases(row, p, ["利润总额", "净利润", "profit", "netProfit"]);

        if (!assumptions.netRevenueAmount && netRevenue) assumptions.netRevenueAmount = netRevenue;
        if (!assumptions.contributionMarginAmount && contributionMargin) assumptions.contributionMarginAmount = contributionMargin;
        if (!assumptions.profitAmount && profit) assumptions.profitAmount = profit;

        if (!fixedSubjectEntries(assumptions).some((item) => item.subject === "固定费用")) {
            addFixedSubject(assumptions, "固定费用", fixedCost);
        }

        return assumptions;
    }

    function applyAggregateAssumptions(assumptions) {
        const salesVolume = assumptions.salesVolume || 1;

        if (!assumptions.unitNetRevenue && assumptions.netRevenueAmount) {
            assumptions.unitNetRevenue = assumptions.netRevenueAmount / salesVolume;
        }
        if (!assumptions.unitMaterialCost && assumptions.materialCostAmount) {
            assumptions.unitMaterialCost = assumptions.materialCostAmount / salesVolume;
        }
        if (!assumptions.unitVariableManufacturingCost && assumptions.variableManufacturingCostAmount) {
            assumptions.unitVariableManufacturingCost = assumptions.variableManufacturingCostAmount / salesVolume;
        }
        if (!assumptions.unitVariableSalesCost && assumptions.variableSalesCostAmount) {
            assumptions.unitVariableSalesCost = assumptions.variableSalesCostAmount / salesVolume;
        }
        if (!assumptions.materialCostAmount && assumptions.contributionMarginAmount && assumptions.netRevenueAmount) {
            assumptions.materialCostAmount = Math.max(0, assumptions.netRevenueAmount - assumptions.contributionMarginAmount);
        }
        if (Math.abs(Number(assumptions.profitAmount || 0)) > 1e-9) {
            const preview = computePnl(assumptions);
            const fixedSubjectDelta = preview.profit - assumptions.profitAmount;
            addFixedSubject(assumptions, "利润总额差额", fixedSubjectDelta);
        }

        return assumptions;
    }

    function hasMeaningfulAssumptions(assumptions) {
        return [
            "salesVolume",
            "unitNetRevenue",
            "unitMaterialCost",
            "unitVariableManufacturingCost",
            "unitVariableSalesCost",
            "netRevenueAmount",
            "materialCostAmount",
            "variableManufacturingCostAmount",
            "variableSalesCostAmount",
            "contributionMarginAmount",
            "profitAmount"
        ].some((key) => Math.abs(Number(assumptions[key] || 0)) > 1e-9)
            || fixedSubjectEntries(assumptions).length > 0;
    }

    function hasLongFormat(rows) {
        return safeArray(rows).some((sourceRow) => {
            const row = normalizeRowKeys(sourceRow);
            const amount = pick(row, ["金额", "数量", "值", "amount", "Amount", "value"]);
            const scenario = pick(row, ["数据口径", "口径", "版本", "scenario", "Scenario"]);
            return pick(row, ["科目", "项目", "指标", "subject", "lineItem"]) !== undefined
                && (pick(row, ["实际", "实际值", "实际数据", "actual", "Actual"]) !== undefined
                    || pick(row, ["预算", "预算值", "budget", "Budget"]) !== undefined
                    || (amount !== undefined && scenario !== undefined));
        });
    }

    function dimensionValue(row, aliases, fallback) {
        const value = pick(row, aliases);
        return String(value || fallback);
    }

    function inferDimensionColumns(rows) {
        const reserved = reservedColumnSet();
        const columns = [];
        safeArray(rows).forEach((row) => {
            Object.keys(row || {}).forEach((column) => {
                if (!column || reserved.has(normalizeToken(column))) return;
                if (!columns.includes(column)) columns.push(column);
            });
        });
        return orderedDimensions(columns);
    }

    function dimensionsFromRow(row, dimensionColumns, fallback = "未分类") {
        return dimensionColumns.reduce((dimensions, column) => {
            dimensions[column] = String(row[column] || fallback);
            return dimensions;
        }, {});
    }

    function hasOperatingAssumptions(assumptions) {
        return [
            "salesVolume",
            "unitNetRevenue",
            "unitMaterialCost",
            "unitVariableManufacturingCost",
            "unitVariableSalesCost",
            "netRevenueAmount",
            "materialCostAmount",
            "variableManufacturingCostAmount",
            "variableSalesCostAmount",
            "contributionMarginAmount"
        ].some((key) => Math.abs(Number(assumptions?.[key] || 0)) > 1e-9);
    }

    function assignDimensions(target, dimensions) {
        target.dimensions = dimensions;
        Object.entries(dimensions).forEach(([dimension, value]) => {
            target[dimension] = value;
        });
        return target;
    }

    function subjectDefinition(row) {
        const subject = pick(row, ["科目", "项目", "指标", "subject", "lineItem"]);
        const known = SUBJECT_LOOKUP[normalizeToken(subject)];
        if (known) return known;

        if (subject !== undefined && String(subject).trim()) {
            return { key: "fixedSubject", subject: fixedSubjectName(subject), section: "fixed", mode: "add", labels: [] };
        }

        return undefined;
    }

    function applySubjectValue(assumptions, definition, value) {
        if (!definition || !Number.isFinite(value)) return;
        if (definition.key === "fixedSubject") {
            addFixedSubject(assumptions, definition.subject, value);
            return;
        }
        if (definition.mode === "replace") {
            assumptions[definition.key] = value || assumptions[definition.key] || 0;
            return;
        }
        assumptions[definition.key] = Number(assumptions[definition.key] || 0) + value;
    }

    function scenarioFromRow(row) {
        const scenario = String(pick(row, ["数据口径", "口径", "版本", "scenario", "Scenario"]) || "").trim();
        if (/预算|budget|plan|target/i.test(scenario)) return "budget";
        if (/实际|actual|fact/i.test(scenario)) return "actual";
        return "";
    }

    function valuesFromLongRow(row) {
        const actualValue = pick(row, ["实际", "实际值", "实际数据", "actual", "Actual"]);
        const budgetValue = pick(row, ["预算", "预算值", "budget", "Budget"]);
        const amountValue = pick(row, ["金额", "数量", "值", "amount", "Amount", "value"]);
        const scenario = scenarioFromRow(row);
        return {
            actual: actualValue !== undefined ? toNumber(actualValue) : scenario === "actual" ? toNumber(amountValue) : 0,
            budget: budgetValue !== undefined ? toNumber(budgetValue) : scenario === "budget" ? toNumber(amountValue) : 0
        };
    }

    function groupKey(parts, dimensions) {
        return dimensions.map((dimension) => parts.dimensions[dimension] || "").join("||");
    }

    function parseLongRows(rows, dimensionColumns) {
        const groups = new Map();

        safeArray(rows).forEach((sourceRow) => {
            const row = normalizeRowKeys(sourceRow);
            const definition = subjectDefinition(row);
            if (!definition) return;

            const isDetail = definition.section === "variable";
            const dimensions = isDetail ? dimensionsFromRow(row, dimensionColumns, "未分类") : {};
            const parts = {
                dimensions
            };
            const key = groupKey(parts, dimensionColumns);
            if (!groups.has(key)) {
                groups.set(key, {
                    dimensions,
                    actualAssumptions: {},
                    budgetAssumptions: {}
                });
            }

            const group = groups.get(key);
            const values = valuesFromLongRow(row);
            applySubjectValue(group.actualAssumptions, definition, values.actual);
            applySubjectValue(group.budgetAssumptions, definition, values.budget);
        });

        return Array.from(groups.values())
            .filter((group) => hasMeaningfulAssumptions(group.actualAssumptions) || hasMeaningfulAssumptions(group.budgetAssumptions))
            .map((group) => assignDimensions({
                actual: computePnl(applyAggregateAssumptions(group.actualAssumptions)),
                budget: computePnl(applyAggregateAssumptions(group.budgetAssumptions))
            }, group.dimensions))
            .sort((a, b) => Object.values(a.dimensions || {}).join("").localeCompare(Object.values(b.dimensions || {}).join(""), "zh-CN"));
    }

    function parseWideRows(rows) {
        const parsed = [];

        safeArray(rows).forEach((sourceRow) => {
            const row = normalizeRowKeys(sourceRow);
            const actualAssumptions = applyAggregateFallback(row, buildAssumptions(row), "");
            const budgetAssumptions = applyAggregateFallback(row, buildAssumptions(row, "预算"), "预算");
            if (!hasMeaningfulAssumptions(actualAssumptions) && !hasMeaningfulAssumptions(budgetAssumptions)) return;

            const isDetail = hasOperatingAssumptions(actualAssumptions) || hasOperatingAssumptions(budgetAssumptions);
            const dimensions = isDetail
                ? {
                    "大区": dimensionValue(row, ["大区", "区域", "region", "Region"], "未分类"),
                    "国家": dimensionValue(row, ["国家", "市场国家", "国家品牌", "country", "Country"], "未分类"),
                    "品牌市场": dimensionValue(row, ["品牌市场", "品牌", "品牌类型", "市场品牌", "brandMarket", "Brand Market", "brand", "Brand"], "未分类"),
                    "经营模式": dimensionValue(row, ["经营模式", "渠道", "channel", "Channel"], "未分类"),
                    "业务单元": dimensionValue(row, ["业务单元", "事业部", "BU", "businessUnit"], "未分类"),
                    "车型": dimensionValue(row, ["车型", "model", "Model"], "未分类")
                }
                : {};

            parsed.push(assignDimensions({
                actual: computePnl(actualAssumptions),
                budget: computePnl(budgetAssumptions)
            }, dimensions));
        });

        return parsed.sort((a, b) => Object.values(a.dimensions || {}).join("").localeCompare(Object.values(b.dimensions || {}).join(""), "zh-CN"));
    }

    function parseRows(rows) {
        const parsed = hasLongFormat(rows) ? parseLongRows(rows, inferDimensionColumns(rows.map(normalizeRowKeys))) : parseWideRows(rows);
        parsed.availableDimensions = inferAvailableDimensions(parsed);
        return parsed;
    }

    function buildSampleData() {
        const templates = [
            { region: "欧洲", mode: "经销", country: "德国", brandMarket: "主品牌", businessUnit: "燃油乘用车", model: "T1D", volume: 0.68, unitRevenue: 12.6, material: 7.45, manufacturing: 0.72, sales: 0.55, fixed: 0.29, growth: 0.018, volumeFactor: 1.08, revenueFactor: 1.03, costFactor: 0.98, fixedFactor: 0.90 },
            { region: "欧洲", mode: "经销", country: "英国", brandMarket: "高端品牌", businessUnit: "燃油乘用车", model: "T1E", volume: 0.56, unitRevenue: 12.1, material: 7.4, manufacturing: 0.78, sales: 0.58, fixed: 0.24, growth: 0.016, volumeFactor: 0.86, revenueFactor: 0.96, costFactor: 1.07, fixedFactor: 0.97 },
            { region: "拉美", mode: "批售", country: "巴西", brandMarket: "主品牌", businessUnit: "燃油乘用车", model: "T1D", volume: 0.76, unitRevenue: 10.8, material: 6.85, manufacturing: 0.66, sales: 0.50, fixed: 0.22, growth: 0.021, volumeFactor: 1.04, revenueFactor: 1.01, costFactor: 1.02, fixedFactor: 0.95 },
            { region: "拉美", mode: "经销", country: "墨西哥", brandMarket: "新能源品牌", businessUnit: "插混业务", model: "PHEV", volume: 0.52, unitRevenue: 13.2, material: 7.9, manufacturing: 0.82, sales: 0.63, fixed: 0.23, growth: 0.019, volumeFactor: 0.74, revenueFactor: 0.93, costFactor: 1.13, fixedFactor: 1.00 },
            { region: "中东非", mode: "直营", country: "阿联酋", brandMarket: "高端品牌", businessUnit: "SUV 业务", model: "SUV", volume: 0.43, unitRevenue: 14.5, material: 8.15, manufacturing: 0.86, sales: 0.72, fixed: 0.26, growth: 0.024, volumeFactor: 0.97, revenueFactor: 1.04, costFactor: 1.00, fixedFactor: 0.97 },
            { region: "中东非", mode: "经销", country: "南非", brandMarket: "经济型品牌", businessUnit: "燃油乘用车", model: "T1E", volume: 0.47, unitRevenue: 9.9, material: 6.55, manufacturing: 0.72, sales: 0.54, fixed: 0.18, growth: 0.014, volumeFactor: 0.78, revenueFactor: 0.91, costFactor: 1.10, fixedFactor: 0.98 },
            { region: "亚太", mode: "直营", country: "澳大利亚", brandMarket: "SUV 品牌", businessUnit: "SUV 业务", model: "SUV", volume: 0.39, unitRevenue: 13.8, material: 8.05, manufacturing: 0.81, sales: 0.63, fixed: 0.21, growth: 0.017, volumeFactor: 1.14, revenueFactor: 1.05, costFactor: 0.96, fixedFactor: 0.90 },
            { region: "亚太", mode: "经销", country: "泰国", brandMarket: "新能源品牌", businessUnit: "纯电业务", model: "EV", volume: 0.61, unitRevenue: 11.4, material: 7.15, manufacturing: 0.70, sales: 0.56, fixed: 0.20, growth: 0.026, volumeFactor: 0.82, revenueFactor: 0.95, costFactor: 1.12, fixedFactor: 1.00 }
        ];

        const rows = [];
        const actualFixedSubjects = {};
        const budgetFixedSubjects = {};

        templates.forEach((tpl, index) => {
            const actualGrowth = 1 + tpl.growth;
            const budgetGrowth = 1 + tpl.growth * 1.05;
            const mixPulse = 1 + ((index % 3) - 1) * 0.015;
            const salesVolume = tpl.volume * actualGrowth * mixPulse * tpl.volumeFactor;
            const budgetSalesVolume = tpl.volume * budgetGrowth * 1.02;
            const actualUnitRevenue = tpl.unitRevenue * (1.018 + (index % 2 ? -0.006 : 0.004)) * tpl.revenueFactor;
            const budgetUnitRevenue = tpl.unitRevenue * 1.016 * 1.015;
            const actualMaterial = tpl.material * 1.012 * tpl.costFactor;
            const budgetMaterial = tpl.material * 1.010 * 0.99;
            const actualManufacturing = tpl.manufacturing * 1.011 * tpl.costFactor;
            const budgetManufacturing = tpl.manufacturing * 1.007;
            const actualSales = tpl.sales * (1.010 + (index % 2 ? 0.01 : 0)) * tpl.costFactor;
            const budgetSales = tpl.sales * 1.007;
            const actualFixed = tpl.fixed * 1.03 * tpl.fixedFactor;
            const budgetFixed = tpl.fixed * 1.025;
            [
                ["国际固定费用", 0.58],
                ["折旧加摊销", 0.27],
                ["技术开发费", 0.15]
            ].forEach(([subject, weight]) => {
                actualFixedSubjects[subject] = Number(actualFixedSubjects[subject] || 0) + actualFixed * weight;
                budgetFixedSubjects[subject] = Number(budgetFixedSubjects[subject] || 0) + budgetFixed * weight;
            });

            rows.push(assignDimensions({
                actual: computePnl({
                    salesVolume,
                    unitNetRevenue: actualUnitRevenue,
                    unitMaterialCost: actualMaterial,
                    unitVariableManufacturingCost: actualManufacturing,
                    unitVariableSalesCost: actualSales
                }),
                budget: computePnl({
                    salesVolume: budgetSalesVolume,
                    unitNetRevenue: budgetUnitRevenue,
                    unitMaterialCost: budgetMaterial,
                    unitVariableManufacturingCost: budgetManufacturing,
                    unitVariableSalesCost: budgetSales
                })
            }, {
                "大区": tpl.region,
                "国家": tpl.country,
                "品牌市场": tpl.brandMarket,
                "经营模式": tpl.mode,
                "业务单元": tpl.businessUnit,
                "车型": tpl.model
            }));
        });

        rows.push(assignDimensions({
            actual: computePnl({
                fixedSubjects: actualFixedSubjects
            }),
            budget: computePnl({
                fixedSubjects: budgetFixedSubjects
            })
        }, {}));

        return rows;
    }

    function initSelectOptions(select, values, allLabel, selectedValue) {
        if (!select) return;
        select.innerHTML = "";
        const allOption = document.createElement("option");
        allOption.value = "";
        allOption.textContent = allLabel;
        select.appendChild(allOption);

        values.forEach((value) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        });

        if (selectedValue && values.includes(selectedValue)) {
            select.value = selectedValue;
        }
    }

    function currentControlValues() {
        const dimensionFilters = currentDimensions().reduce((filters, dimension) => {
            filters[dimension] = byId(dimensionFilterId(dimension))?.value || "";
            return filters;
        }, {});
        return {
            dimensionFilters
        };
    }

    function hasActiveDimensionFilter() {
        return Object.values(currentControlValues().dimensionFilters).some(Boolean);
    }

    function applyTimeFilters(rows) {
        return rows;
    }

    function filterRowsForControls({ ignoreDimension = "" } = {}) {
        const controls = currentControlValues();
        let rows = applyTimeFilters(state.rawData.slice());

        currentDimensions().forEach((dimension) => {
            if (dimension === ignoreDimension) return;
            const selected = controls.dimensionFilters[dimension];
            if (selected) rows = rows.filter((row) => row.dimensions?.[dimension] === selected);
        });

        return rows;
    }

    function initDimensionOptions(selectedValue) {
        const select = byId("dimension-select");
        if (!select) return;
        if (select) select.innerHTML = "";
        currentDimensions().forEach((dimension) => {
            const option = document.createElement("option");
            option.value = dimension;
            option.textContent = dimensionLabel(dimension);
            if (select) select.appendChild(option);
        });
        if (selectedValue && currentDimensions().includes(selectedValue)) {
            if (select) select.value = selectedValue;
        } else {
            const fallback = currentDimensions()[0] || "";
            if (select) select.value = fallback;
        }
    }

    function renderDimensionFilterControls(controls = currentControlValues()) {
        const container = byId("dimension-filter-grid");
        if (!container) return;
        container.innerHTML = currentDimensions().map((dimension) => `
            <label class="field">
                <span>${dimensionLabel(dimension)}</span>
                <select id="${dimensionFilterId(dimension)}" class="input" data-dimension-filter="${dimension}"></select>
            </label>
        `).join("");

        Array.from(container.querySelectorAll("[data-dimension-filter]")).forEach((select) => {
            const dimension = select.getAttribute("data-dimension-filter");
            if (dimension && controls.dimensionFilters[dimension]) {
                select.value = controls.dimensionFilters[dimension];
            }
            select.addEventListener("change", () => {
                if (dimension) {
                    downstreamDimensions(dimension).forEach((nextDimension) => {
                        const nextSelect = byId(dimensionFilterId(nextDimension));
                        if (nextSelect) nextSelect.value = "";
                    });
                }
                updateAll();
            });
        });
    }

    function renderDimensionDisplayControls() {
        const container = byId("dimension-display-grid");
        const summary = byId("dimension-display-summary");
        if (!container) return;

        const available = state.availableDimensions.length ? state.availableDimensions : DEFAULT_DIMENSIONS;
        const selected = new Set(currentDimensions());
        if (summary) summary.textContent = `${selected.size}/${available.length}`;

        container.innerHTML = available.map((dimension) => {
            const checked = selected.has(dimension);
            return `
                <label class="dimension-toggle ${checked ? "selected" : ""}">
                    <input type="checkbox" data-dimension-toggle="${dimension}" ${checked ? "checked" : ""} />
                    <span>${dimensionLabel(dimension)}</span>
                </label>
            `;
        }).join("");

        Array.from(container.querySelectorAll("[data-dimension-toggle]")).forEach((input) => {
            input.addEventListener("change", () => {
                const selectedDimensions = Array.from(container.querySelectorAll("[data-dimension-toggle]:checked"))
                    .map((item) => item.getAttribute("data-dimension-toggle"))
                    .filter(Boolean);

                if (!selectedDimensions.length) {
                    input.checked = true;
                    showMessage("error", "至少保留一个展示维度。");
                    return;
                }

                const currentOrder = currentDimensions();
                state.selectedDimensions = [
                    ...currentOrder.filter((dimension) => selectedDimensions.includes(dimension)),
                    ...available.filter((dimension) => selectedDimensions.includes(dimension) && !currentOrder.includes(dimension))
                ];
                const dimensionSelect = byId("dimension-select");
                const fallback = currentDimensions()[0] || "";
                if (dimensionSelect && !currentDimensions().includes(dimensionSelect.value)) dimensionSelect.value = fallback;
                updateAll();
            });
        });
    }

    function selectedDimensionItems() {
        return currentDimensions()
            .map((dimension) => ({ dimension, value: byId(dimensionFilterId(dimension))?.value || "" }))
            .filter((item) => item.value);
    }

    function moveDimensionInOrder(fromIndex, toIndex) {
        const dimensions = currentDimensions();
        if (fromIndex === toIndex) return;
        if (fromIndex < 0 || toIndex < 0 || fromIndex >= dimensions.length || toIndex >= dimensions.length) return;
        const lockThroughIndex = selectedDimensionItems().length ? dimensions.indexOf(currentAnalysisDimension()) : -1;
        if (lockThroughIndex >= 0 && (fromIndex <= lockThroughIndex || toIndex <= lockThroughIndex)) {
            showMessage("error", "已下钻层级已锁定，可拖动当前层后面的维度。");
            return;
        }

        const [moved] = dimensions.splice(fromIndex, 1);
        dimensions.splice(toIndex, 0, moved);
        state.selectedDimensions = dimensions;
        updateAll();
    }

    function renderDimensionTrain() {
        const containers = Array.from(document.querySelectorAll("[data-dimension-train]"));
        const summaries = Array.from(document.querySelectorAll("[data-dimension-train-summary]"));
        if (!containers.length) return;

        const dimensions = currentDimensions();
        const activeDimension = currentAnalysisDimension();
        const filters = currentControlValues().dimensionFilters;
        const lockThroughIndex = selectedDimensionItems().length ? dimensions.indexOf(activeDimension) : -1;
        summaries.forEach((summary) => {
            summary.textContent = activeDimension ? `当前层：${dimensionLabel(activeDimension)}` : "";
        });

        const markup = dimensions.map((dimension, index) => `
            <button
                type="button"
                class="dimension-train-car ${filters[dimension] ? "filtered" : ""} ${dimension === activeDimension ? "active" : ""} ${lockThroughIndex >= 0 && index <= lockThroughIndex ? "locked" : ""}"
                draggable="${lockThroughIndex < 0 || index > lockThroughIndex ? "true" : "false"}"
                data-dimension-index="${index}"
                title="${lockThroughIndex >= 0 && index <= lockThroughIndex ? "已下钻层级已锁定" : "拖动调整后续顺序"}"
                aria-current="${dimension === activeDimension ? "step" : "false"}"
            >
                <span>${filters[dimension] ? "已选" : dimension === activeDimension ? "当前" : `${index + 1}`}</span>
                <strong>${escapeHtml(dimensionLabel(dimension))}</strong>
            </button>
        `).join("");

        containers.forEach((container) => {
            container.innerHTML = markup;

            Array.from(container.querySelectorAll("[data-dimension-index]")).forEach((button) => {
                button.addEventListener("dragstart", (event) => {
                    button.classList.add("dragging");
                    event.dataTransfer?.setData("text/plain", button.getAttribute("data-dimension-index") || "0");
                    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
                });
                button.addEventListener("dragend", () => {
                    button.classList.remove("dragging");
                });
                button.addEventListener("dragover", (event) => {
                    event.preventDefault();
                    button.classList.add("drop-target");
                    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
                });
                button.addEventListener("dragleave", () => {
                    button.classList.remove("drop-target");
                });
                button.addEventListener("drop", (event) => {
                    event.preventDefault();
                    button.classList.remove("drop-target");
                    const fromIndex = Number(event.dataTransfer?.getData("text/plain"));
                    const toIndex = Number(button.getAttribute("data-dimension-index"));
                    moveDimensionInOrder(fromIndex, toIndex);
                });
            });
        });
    }

    function refreshCascadingFilters() {
        if (!state.rawData.length) return;
        const controls = currentControlValues();

        renderDimensionDisplayControls();
        renderDimensionTrain();
        renderDimensionFilterControls(controls);

        currentDimensions().forEach((dimension) => {
            const rows = filterRowsForControls({ ignoreDimension: dimension });
            const values = Array.from(new Set(rowsForDimension(rows, dimension).map((row) => row.dimensions[dimension]))).sort();
            initSelectOptions(byId(dimensionFilterId(dimension)), values, `全部${dimensionLabel(dimension)}`, controls.dimensionFilters[dimension]);
        });
    }

    function initFilterOptions() {
        const previous = {
            dimension: currentAnalysisDimension(),
            dimensionFilters: currentControlValues().dimensionFilters
        };

        state.selectedDimensions = reconcileSelectedDimensions();
        initDimensionOptions(previous.dimension);
        refreshCascadingFilters();
    }

    function filterData() {
        return filterRowsForControls();
    }

    function buildDimensionRows(rows) {
        const dimension = currentAnalysisDimension();
        const map = groupBy(rowsForDimension(rows, dimension), (row) => row.dimensions[dimension]);
        return Array.from(map.entries())
            .map(([name, group]) => ({ name, sourceRows: group, ...summarize(group) }))
            .sort((a, b) => Math.abs(b.contributionMarginGap) - Math.abs(a.contributionMarginGap));
    }

    function dimensionContributionGap(summary) {
        return Number(summary?.contributionMarginGap || 0);
    }

    function sortDimensionContributionRows(rows) {
        return safeArray(rows).slice().sort((a, b) => {
            const aGap = dimensionContributionGap(a);
            const bGap = dimensionContributionGap(b);
            const aMiss = aGap < -1e-9;
            const bMiss = bGap < -1e-9;
            if (aMiss !== bMiss) return aMiss ? -1 : 1;
            return Math.abs(bGap) - Math.abs(aGap);
        });
    }

    function dimensionRowsWithLimit(rows) {
        const sorted = sortDimensionContributionRows(rows);
        if (sorted.length <= MAX_PERFORMANCE_CARDS + 1) {
            return { rows: sorted, hiddenCount: 0 };
        }

        const visible = sorted.slice(0, MAX_PERFORMANCE_CARDS);
        const rest = sorted.slice(MAX_PERFORMANCE_CARDS);
        const restRows = rest.flatMap((item) => safeArray(item.sourceRows));
        const aggregate = {
            name: `其他 ${rest.length} 项`,
            isAggregate: true,
            sourceRows: restRows,
            ...summarize(restRows)
        };
        return { rows: [...visible, aggregate], hiddenCount: rest.length };
    }

    function plotLayout(extra = {}) {
        return {
            paper_bgcolor: COLORS.paper,
            plot_bgcolor: COLORS.paper,
            font: {
                family: "PingFang SC, Hiragino Sans GB, Microsoft YaHei, Helvetica Neue, Arial, sans-serif",
                color: COLORS.muted,
                size: 12
            },
            margin: { l: 58, r: 44, t: 92, b: 54 },
            hoverlabel: {
                bgcolor: "#ffffff",
                bordercolor: COLORS.grid,
                font: { color: COLORS.text }
            },
            legend: {
                orientation: "h",
                x: 0,
                y: 1.24,
                yanchor: "bottom",
                bgcolor: "rgba(255,255,255,0)",
                itemclick: false,
                itemdoubleclick: false
            },
            dragmode: false,
            clickmode: "none",
            xaxis: { gridcolor: COLORS.grid, zerolinecolor: COLORS.grid },
            yaxis: { gridcolor: COLORS.grid, zerolinecolor: COLORS.grid },
            ...extra
        };
    }

    function plotConfig() {
        return {
            responsive: true,
            displayModeBar: false,
            displaylogo: false,
            scrollZoom: false,
            doubleClick: false,
            editable: false,
            staticPlot: true
        };
    }

    function drillPlotConfig() {
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

    function downstreamDimensions(dimension) {
        const dimensions = currentDimensions();
        const index = dimensions.indexOf(dimension);
        return index >= 0 ? dimensions.slice(index + 1) : [];
    }

    function drillToDimensionValue(dimension, value) {
        if (!dimension || !value || !currentDimensions().includes(dimension)) return;
        const target = byId(dimensionFilterId(dimension));
        if (!target) return;

        const isSameSelection = target.value === value;
        target.value = isSameSelection ? "" : value;
        downstreamDimensions(dimension).forEach((nextDimension) => {
            const nextFilter = byId(dimensionFilterId(nextDimension));
            if (nextFilter) nextFilter.value = "";
        });

        const nextDimension = isSameSelection ? dimension : downstreamDimensions(dimension)[0];
        const dimensionSelect = byId("dimension-select");
        if (dimensionSelect) dimensionSelect.value = nextDimension || dimension;

        updateAll();
    }

    function clearDimensionFilter(dimension) {
        if (!currentDimensions().includes(dimension)) return;
        [dimension, ...downstreamDimensions(dimension)].forEach((item) => {
            const select = byId(dimensionFilterId(item));
            if (select) select.value = "";
        });
        const dimensionSelect = byId("dimension-select");
        if (dimensionSelect) dimensionSelect.value = dimension;
        updateAll();
    }

    function clearLastDimensionFilter() {
        const items = selectedDimensionItems();
        if (!items.length) return;
        clearDimensionFilter(items[items.length - 1].dimension);
    }

    function renderDrillPath() {
        const container = byId("drill-path");
        if (!container) return;

        const activeDimension = currentAnalysisDimension();
        const selectedItems = selectedDimensionItems();

        const chips = selectedItems.map((item) => `
            <button type="button" class="drill-chip" data-clear-dimension="${item.dimension}">
                <span>${dimensionLabel(item.dimension)}</span>
                <strong>${item.value}</strong>
                <b aria-hidden="true">×</b>
            </button>
        `).join("");

        container.innerHTML = `
            <div class="drill-path-meta">
                <span>当前维度：${dimensionLabel(activeDimension)}</span>
                <span>指标：边际总额</span>
            </div>
            <div class="drill-chip-row">
                ${chips || '<span class="drill-empty">未选择维度筛选</span>'}
                ${selectedItems.length ? '<button type="button" class="drill-clear" data-clear-last="true">退一层</button>' : ""}
            </div>
        `;

        Array.from(container.querySelectorAll("[data-clear-dimension]")).forEach((button) => {
            button.addEventListener("click", () => clearDimensionFilter(button.getAttribute("data-clear-dimension")));
        });
        container.querySelector("[data-clear-last]")?.addEventListener("click", clearLastDimensionFilter);
    }

    function budgetGapLine(actual, budget, driver) {
        const rawGap = actual - budget;
        if (Math.abs(rawGap) < 1e-9) return "与预算持平";
        return `${rawGap > 0 ? "超预算" : "低于预算"} ${formatDriverGap(rawGap, driver)}`;
    }

    function gaugeBand(ratio, hasBudget) {
        if (!hasBudget) return { className: "neutral", label: "无预算" };
        if (ratio >= 1) return { className: "green", label: ratio > 1 ? "超预算" : "达标" };
        if (ratio < 0.8) return { className: "red", label: "低于 80%" };
        return { className: "orange", label: "追预算" };
    }

    function metricComparisonMeta(summary, metric, driver) {
        const actual = driverActual(summary, driver);
        const budget = driverBudget(summary, driver);
        const rawGap = actual - budget;
        const impact = driverValue(summary, driver);
        const hasBudget = Math.abs(budget) > 1e-9;
        const favorable = metric.compare === "lower" ? rawGap <= 0 : impact >= 0;
        const ratio = metric.ratioKey ? summary[metric.ratioKey] : ratioValue(actual, budget);
        const band = gaugeBand(ratio, hasBudget);

        return {
            actual,
            budget,
            rawGap,
            impact,
            favorable,
            ratio,
            status: band.label,
            statusClass: band.className,
            gaugeClass: band.className,
            gaugeProgress: hasBudget ? Math.max(0, Math.min(100, ratio * 100)) : 0,
            gapLine: hasBudget ? budgetGapLine(actual, budget, driver) : "预算为 0"
        };
    }

    function renderMetrics(summary) {
        const activeDriver = currentVarianceDriver();
        const metrics = DASHBOARD_METRICS.map((metric) => {
            const driver = driverByKey(metric.key);
            return {
                ...metric,
                driver,
                meta: metricComparisonMeta(summary, metric, driver)
            };
        });

        const grid = byId("metrics-grid");
        if (!grid) return;
        grid.innerHTML = metrics.map((metric) => `
            <article class="metric-card gauge-card gauge-${metric.meta.gaugeClass} ${metric.driver.key === activeDriver.key ? "active" : ""}" data-driver-key="${metric.driver.key}">
                <div class="metric-topline">
                    <div class="metric-label">${metric.driver.label}</div>
                    <span class="metric-status ${metric.meta.statusClass}">${metric.meta.status}</span>
                </div>
                <div class="metric-gauge-wrap" aria-label="${metric.driver.label}完成率 ${formatPercent(metric.meta.ratio)}">
                    <div class="gauge-budget-line">
                        <span>预算</span>
                        <strong>${formatDriverValue(metric.meta.budget, metric.driver)}</strong>
                    </div>
                    <div class="gauge-canvas">
                        <svg class="metric-gauge" viewBox="0 0 240 136" role="img" aria-hidden="true">
                            <path class="gauge-track" pathLength="100" d="M 30 112 A 90 90 0 0 1 210 112"></path>
                            <path class="gauge-fill" pathLength="100" style="stroke-dasharray: ${metric.meta.gaugeProgress} 100;" d="M 30 112 A 90 90 0 0 1 210 112"></path>
                        </svg>
                        <div class="gauge-center">
                            <strong>${formatPercent(metric.meta.ratio)}</strong>
                            <span>完成率</span>
                        </div>
                    </div>
                    <div class="gauge-actual-line">
                        <span>实际</span>
                        <strong>${formatDriverValue(metric.meta.actual, metric.driver)}</strong>
                    </div>
                </div>
                <div class="metric-foot">
                    <span class="${varianceClass(metric.meta.impact)}">${metric.compare === "lower" ? "利润影响" : "预算差异"} ${formatDriverGap(metric.meta.impact, metric.driver)}</span>
                    <span>${metric.meta.gapLine}</span>
                </div>
            </article>
        `).join("");
    }

    function renderUnitMarginChart(rows) {
        const summary = summarize(rows);
        const dimension = currentAnalysisDimension();
        const dimRows = buildDimensionRows(rows)
            .filter((item) => Math.abs(item.actual.unitNetRevenue) > 1e-9 || Math.abs(item.actual.unitContributionMargin) > 1e-9)
            .slice(0, 12);
        const maxVolume = Math.max(...dimRows.map((item) => Math.abs(item.actual.salesVolume)), 0.1);

        Plotly.react("unit-margin-chart", [
            {
                type: "scatter",
                mode: "markers+text",
                name: "实际单车表现",
                x: dimRows.map((item) => item.actual.unitNetRevenue),
                y: dimRows.map((item) => item.actual.unitContributionMargin),
                text: dimRows.map((item) => item.name),
                textposition: "top center",
                textfont: { size: 11, color: COLORS.text },
                marker: {
                    color: dimRows.map((item) => item.contributionMarginGap >= 0 ? COLORS.green : COLORS.red),
                    size: dimRows.map((item) => 12 + Math.sqrt(Math.abs(item.actual.salesVolume) / maxVolume) * 24),
                    opacity: 0.72,
                    line: { color: "#ffffff", width: 1 }
                },
                customdata: dimRows.map((item) => [
                    formatVolume(item.actual.salesVolume),
                    formatAmount(item.actual.netRevenue),
                    formatAmount(item.actual.contributionMargin),
                    formatGap(item.contributionMarginGap)
                ]),
                hovertemplate: `${dimension}：%{text}<br>单车净收入：%{x:.2f} 万元/辆<br>单车边际：%{y:.2f} 万元/辆<br>销量规模：%{customdata[0]}<br>净收入总额：%{customdata[1]}<br>边际总额：%{customdata[2]}<br>边际差异：%{customdata[3]}<extra></extra>`
            }
        ], plotLayout({
            showlegend: false,
            margin: { l: 58, r: 24, t: 58, b: 96 },
            annotations: [{
                xref: "x",
                yref: "paper",
                x: summary.budget.unitNetRevenue,
                y: 1.04,
                xanchor: "center",
                yanchor: "bottom",
                showarrow: false,
                text: "预算单车净收入",
                font: { size: 11, color: COLORS.muted },
                bgcolor: "#ffffff",
                bordercolor: "rgba(232, 230, 220, 0.95)",
                borderpad: 4
            }, {
                xref: "paper",
                yref: "y",
                x: 1.01,
                y: summary.budget.unitContributionMargin,
                xanchor: "right",
                yanchor: "middle",
                showarrow: false,
                text: "预算单车边际",
                font: { size: 11, color: COLORS.muted },
                bgcolor: "#ffffff",
                bordercolor: "rgba(232, 230, 220, 0.95)",
                borderpad: 4
            }],
            shapes: [
                {
                    type: "line",
                    xref: "x",
                    yref: "paper",
                    x0: summary.budget.unitNetRevenue,
                    x1: summary.budget.unitNetRevenue,
                    y0: 0,
                    y1: 1,
                    line: { color: "rgba(116, 113, 104, 0.38)", width: 1, dash: "dash" }
                },
                {
                    type: "line",
                    xref: "paper",
                    yref: "y",
                    x0: 0,
                    x1: 1,
                    y0: summary.budget.unitContributionMargin,
                    y1: summary.budget.unitContributionMargin,
                    line: { color: "rgba(116, 113, 104, 0.38)", width: 1, dash: "dash" }
                }
            ],
            xaxis: { title: "单车净收入（万元/辆）", gridcolor: COLORS.grid, zerolinecolor: COLORS.grid },
            yaxis: { title: "单车边际（万元/辆）", gridcolor: COLORS.grid, zerolinecolor: COLORS.grid }
        }), plotConfig());

    }

    function updateBridgeTitles(isMarginScope) {
        const varianceTitle = byId("variance-bridge-title");
        const varianceSubtitle = byId("variance-bridge-subtitle");
        const profitTitle = byId("profit-bridge-title");
        const profitSubtitle = byId("profit-bridge-subtitle");

        if (varianceTitle) varianceTitle.textContent = isMarginScope ? "利润变动桥（边际口径）" : "利润变动桥";
        if (varianceSubtitle) {
            varianceSubtitle.textContent = isMarginScope
                ? "当前筛选为维度口径，固定科目不分摊，仅桥接预算边际到实际边际。"
                : "从预算利润出发，按收入、变动成本和固定科目差异桥接到实际利润。";
        }
        if (profitTitle) profitTitle.textContent = isMarginScope ? "利润桥（边际口径）" : "利润桥";
        if (profitSubtitle) {
            profitSubtitle.textContent = isMarginScope
                ? "当前筛选为维度口径，仅展示净收入扣减变动成本后的边际桥。"
                : "从实际净收入扣减变动成本和固定科目得到实际利润。";
        }
    }

    function variableDifferenceFrame(startValue, rows, labels) {
        if (isCompactBridgeViewport()) return null;
        const variableRows = rows.filter((row) => row.group === "variable");
        if (!variableRows.length) return null;

        let current = startValue;
        let minValue = Infinity;
        let maxValue = -Infinity;
        let lastVariableIndex = -1;
        rows.forEach((row, index) => {
            const next = current + row.value;
            if (row.group === "variable") {
                minValue = Math.min(minValue, current, next);
                maxValue = Math.max(maxValue, current, next);
                lastVariableIndex = index;
            }
            current = next;
        });

        if (!Number.isFinite(minValue) || !Number.isFinite(maxValue) || lastVariableIndex < 0) return null;
        const displayMin = displayAmount(minValue);
        const displayMax = displayAmount(maxValue);
        const range = Math.max(0.08, Math.abs(displayMax - displayMin));
        const pad = Math.max(0.04, range * 0.12);

        const x0 = 1 / labels.length;
        const x1 = (lastVariableIndex + 2) / labels.length;
        const y1 = displayMax + pad;

        return {
            shape: {
                type: "rect",
                xref: "paper",
                yref: "y",
                x0,
                x1,
                y0: displayMin - pad,
                y1,
                fillcolor: "rgba(0,0,0,0)",
                line: { color: "rgba(116, 113, 104, 0.55)", width: 1, dash: "dash" },
                layer: "above"
            },
            annotation: {
                xref: "paper",
                yref: "y",
                x: (x0 + x1) / 2,
                y: y1,
                text: "边际部分",
                showarrow: false,
                xanchor: "center",
                yanchor: "bottom",
                bgcolor: "#faf9f5",
                bordercolor: "rgba(116, 113, 104, 0.32)",
                borderpad: 3,
                font: { size: 11, color: COLORS.muted }
            }
        };
    }

    function bridgeTrace({ measures, labels, values, text }) {
        const compact = isCompactBridgeViewport();
        const compactText = text.map((item) => String(item || "")
            .split("<br>")[0]
            .replace(new RegExp(`\\s*${amountAxisLabel()}$`), ""));
        return {
            type: "waterfall",
            orientation: compact ? "h" : "v",
            measure: measures,
            ...(compact ? { y: labels, x: values } : { x: labels, y: values }),
            connector: { line: { color: "#d9d6cb" } },
            increasing: { marker: { color: COLORS.green } },
            decreasing: { marker: { color: COLORS.red } },
            totals: { marker: { color: COLORS.orange } },
            text: compact ? compactText : text,
            textposition: "outside",
            textfont: { size: compact ? 9 : 12 },
            cliponaxis: false,
            hovertemplate: `${compact ? "%{y}" : "%{x}"}<br>%{text}<extra></extra>`
        };
    }

    function bridgeLayout(labels, { margin, shapes = [], annotations = [], axisRange } = {}) {
        if (isCompactBridgeViewport()) {
            return plotLayout({
                showlegend: false,
                height: Math.max(360, labels.length * 42 + 110),
                margin: { l: 102, r: 18, t: 18, b: 42 },
                xaxis: {
                    title: amountAxisLabel(),
                    tickfont: { size: 10 },
                    automargin: true,
                    range: axisRange,
                    gridcolor: COLORS.grid,
                    zerolinecolor: COLORS.grid
                },
                yaxis: {
                    automargin: true,
                    autorange: "reversed",
                    tickfont: { size: 10 },
                    gridcolor: COLORS.grid,
                    zerolinecolor: COLORS.grid
                }
            });
        }

        return plotLayout({
            showlegend: false,
            margin,
            shapes,
            annotations,
            xaxis: { tickangle: -24, tickfont: { size: 10 }, automargin: true, gridcolor: COLORS.grid, zerolinecolor: COLORS.grid },
            yaxis: { title: amountAxisLabel(), range: axisRange, gridcolor: COLORS.grid, zerolinecolor: COLORS.grid }
        });
    }

    function renderVarianceChart(summary) {
        const isMarginScope = hasActiveDimensionFilter();
        updateBridgeTitles(isMarginScope);
        const rows = profitVarianceBridgeRows(summary, { includeFixed: !isMarginScope });
        const startValue = isMarginScope ? summary.budget.contributionMargin : summary.budget.profit;
        const endValue = isMarginScope ? summary.actual.contributionMargin : summary.actual.profit;
        const startText = `${formatAmount(startValue)}<br>${isMarginScope ? "预算边际率" : "预算利润率"} ${formatPercent(isMarginScope ? summary.budget.contributionMarginRate : summary.budget.profitRate)}`;
        const endText = `${formatAmount(endValue)}<br>${isMarginScope ? "实际边际率" : "实际利润率"} ${formatPercent(isMarginScope ? summary.actual.contributionMarginRate : summary.actual.profitRate)}`;
        const labeler = isCompactBridgeViewport() ? compactBridgeAxisLabel : bridgeAxisLabel;
        const labels = [
            labeler(isMarginScope ? "预算边际总额" : "预算利润"),
            ...rows.map((row) => labeler(row.name)),
            labeler(isMarginScope ? "实际边际总额" : "实际利润总额")
        ];
        const variableFrame = variableDifferenceFrame(startValue, rows, labels);
        const measures = ["absolute", ...rows.map(() => "relative"), "total"];
        const values = [
            displayAmount(startValue),
            ...rows.map((row) => displayAmount(row.value)),
            0
        ];
        const axisRange = waterfallAxisRange(
            displayAmount(startValue),
            rows.map((row) => displayAmount(row.value)),
            displayAmount(endValue)
        );
        const text = [
            startText,
            ...rows.map((row) => formatGap(row.value)),
            endText
        ];

        Plotly.react("variance-chart", [
            bridgeTrace({ measures, labels, values, text })
        ], bridgeLayout(labels, {
            margin: { l: 64, r: 24, t: 54, b: 96 },
            shapes: variableFrame ? [variableFrame.shape] : [],
            annotations: variableFrame ? [variableFrame.annotation] : [],
            axisRange
        }), plotConfig());

    }

    function renderProfitBridge(summary) {
        const isMarginScope = hasActiveDimensionFilter();
        const actual = summary.actual;
        const fixedRows = isMarginScope ? [] : fixedSubjectEntries(actual);
        const fixedMeasures = fixedRows.map(() => "relative");
        const fixedLabels = fixedRows.map((row) => row.subject);
        const fixedValues = fixedRows.map((row) => -displayAmount(row.amount));
        const fixedText = fixedRows.map((row) => formatGap(-row.amount));
        const measures = ["absolute", "relative", "relative", "relative", "total", ...fixedMeasures, ...(isMarginScope ? [] : ["total"])];
        const labeler = isCompactBridgeViewport() ? compactBridgeAxisLabel : bridgeAxisLabel;
        const labels = ["净收入", "材料成本", "变动制造", "变动销售", "边际总额", ...fixedLabels, ...(isMarginScope ? [] : ["利润总额"])].map(labeler);
        const values = [
            displayAmount(actual.netRevenue),
            -displayAmount(actual.materialCost),
            -displayAmount(actual.variableManufacturingCost),
            -displayAmount(actual.variableSalesCost),
            0,
            ...fixedValues,
            ...(isMarginScope ? [] : [0])
        ];
        const text = [
            formatAmount(actual.netRevenue),
            `-${formatAmount(actual.materialCost)}`,
            `-${formatAmount(actual.variableManufacturingCost)}`,
            `-${formatAmount(actual.variableSalesCost)}`,
            formatAmount(actual.contributionMargin),
            ...fixedText,
            ...(isMarginScope ? [] : [formatAmount(actual.profit)])
        ];

        Plotly.react("profit-bridge-chart", [
            bridgeTrace({ measures, labels, values, text })
        ], bridgeLayout(labels, {
            margin: { l: 58, r: 24, t: 58, b: 64 }
        }), plotConfig());

    }

    function waterfallAxisLabel(value) {
        const text = String(value || "");
        if (text.length <= 8) return text;
        if (text.length <= 12) return `${text.slice(0, 6)}<br>${text.slice(6)}`;
        return `${text.slice(0, 6)}<br>${text.slice(6, 11)}…`;
    }

    function waterfallHeight(itemCount) {
        return Math.max(420, Math.min(560, 320 + itemCount * 22));
    }

    function waterfallAxisRange(startValue, deltas, endValue) {
        const points = [startValue];
        let cumulative = startValue;
        safeArray(deltas).forEach((delta) => {
            cumulative += delta;
            points.push(cumulative);
        });
        points.push(endValue);

        const finitePoints = points.filter(Number.isFinite);
        if (finitePoints.length < 2) return undefined;

        const min = Math.min(...finitePoints);
        const max = Math.max(...finitePoints);
        const span = max - min;
        if (span < 1e-9) return undefined;

        const reference = Math.max(Math.abs(min), Math.abs(max), 1);
        const upperPadding = Math.max(span * 0.18, reference * 0.025);

        if (min > 0 && max > 0) {
            const visibleBase = Math.max(span * 0.65, reference * 0.16);
            return [Math.max(0, min - visibleBase), max + upperPadding];
        }

        if (min < 0 && max < 0) {
            const visibleBase = Math.max(span * 0.65, reference * 0.16);
            return [min - upperPadding, Math.min(0, max + visibleBase)];
        }

        const mixedPadding = Math.max(span * 0.2, reference * 0.035);
        return [min - mixedPadding, max + mixedPadding];
    }

    function isTouchLikeViewport() {
        return typeof window !== "undefined"
            && window.matchMedia("(hover: none), (pointer: coarse)").matches;
    }

    function waterfallCompareRow({ label, actual, budget, formatter }) {
        const gap = actual - budget;
        return `
            <div class="waterfall-compare-row">
                <span>${label}</span>
                <strong>${formatter(actual)}</strong>
                <em>预算 ${formatter(budget)}</em>
                <b class="${varianceClass(gap)}">${formatSignedValue(gap, formatter)}</b>
            </div>
        `;
    }

    function waterfallComparisonHtml(item) {
        const rows = [
            { label: "销量", actual: item.actual.salesVolume, budget: item.budget.salesVolume, formatter: formatVolume },
            { label: "净收入", actual: item.actual.netRevenue, budget: item.budget.netRevenue, formatter: formatAmount },
            { label: "边际", actual: item.actual.contributionMargin, budget: item.budget.contributionMargin, formatter: formatAmount }
        ].map(waterfallCompareRow).join("");

        const unitRows = [
            { label: "单车净收入", actual: item.actual.unitNetRevenue, budget: item.budget.unitNetRevenue, formatter: formatUnitAmount },
            { label: "单车边际", actual: item.actual.unitContributionMargin, budget: item.budget.unitContributionMargin, formatter: formatUnitAmount }
        ].map(waterfallCompareRow).join("");

        return `
            <div class="waterfall-tooltip-compare">
                <div class="waterfall-compare-title">
                    <span>总额口径</span>
                    <small>实际 / 预算 / 差异</small>
                </div>
                <div class="waterfall-compare-rows">${rows}</div>
                <div class="waterfall-compare-title compact">
                    <span>单车口径</span>
                    <small>用于判断结构变化</small>
                </div>
                <div class="waterfall-compare-rows unit">${unitRows}</div>
            </div>
        `;
    }

    function waterfallTooltipHtml(item, dimension) {
        if (!item) return "";
        const gapClass = varianceClass(item.contributionMarginGap);
        const achievement = ratioValue(item.actual.contributionMargin, item.budget.contributionMargin);
        const actionText = item.isAggregate ? "合并项可用上方筛选器进入具体项目" : "点击柱子进入下一层";

        return `
            <div class="waterfall-tooltip-card">
                <div class="waterfall-tooltip-top">
                    <span>${escapeHtml(dimensionLabel(dimension))}</span>
                    <strong>${escapeHtml(item.name)}</strong>
                    <b class="${gapClass}">${formatGap(item.contributionMarginGap)}</b>
                </div>
                <div class="waterfall-tooltip-hero">
                    <span>边际达成率</span>
                    <strong>${formatPercent(achievement)}</strong>
                    <em class="${gapClass}">${item.contributionMarginGap >= 0 ? "优于预算" : "低于预算"}</em>
                </div>
                ${waterfallComparisonHtml(item)}
                <div class="waterfall-tooltip-foot">${actionText}</div>
            </div>
        `;
    }

    function positionWaterfallTooltip(tooltip, event) {
        if (!tooltip || !event) return;
        const margin = 14;
        const viewportPadding = 12;
        let left = event.clientX + margin;
        let top = event.clientY + margin;

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;

        const rect = tooltip.getBoundingClientRect();
        if (left + rect.width + viewportPadding > window.innerWidth) {
            left = Math.max(viewportPadding, event.clientX - rect.width - margin);
        }
        if (top + rect.height + viewportPadding > window.innerHeight) {
            top = Math.max(viewportPadding, event.clientY - rect.height - margin);
        }

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }

    function showWaterfallTooltip(item, dimension, event) {
        const tooltip = byId("dimension-waterfall-tooltip");
        if (!tooltip || !item || isTouchLikeViewport()) return;
        tooltip.innerHTML = waterfallTooltipHtml(item, dimension);
        tooltip.classList.add("visible");
        tooltip.setAttribute("aria-hidden", "false");
        positionWaterfallTooltip(tooltip, event);
    }

    function hideWaterfallTooltip() {
        const tooltip = byId("dimension-waterfall-tooltip");
        if (!tooltip) return;
        tooltip.classList.remove("visible");
        tooltip.setAttribute("aria-hidden", "true");
    }

    function waterfallPointIndexFromEvent(visual, event) {
        if (!visual || !event) return -1;
        const paths = Array.from(visual.querySelectorAll(".waterfalllayer .point path"));
        return paths.findIndex((path) => {
            const rect = path.getBoundingClientRect();
            return event.clientX >= rect.left
                && event.clientX <= rect.right
                && event.clientY >= rect.top
                && event.clientY <= rect.bottom;
        });
    }

    function renderWaterfallTouchCard(item, dimension) {
        const container = byId("dimension-waterfall-touch-card");
        if (!container) return;
        if (!item) {
            container.innerHTML = "";
            return;
        }

        container.innerHTML = `
            <div class="waterfall-touch-card">
                <div class="waterfall-touch-head">
                    <span>${escapeHtml(dimensionLabel(dimension))}</span>
                    <strong>${escapeHtml(item.name)}</strong>
                </div>
                <div class="waterfall-touch-summary">
                    <span>边际达成率 <strong>${formatPercent(ratioValue(item.actual.contributionMargin, item.budget.contributionMargin))}</strong></span>
                    <b class="${varianceClass(item.contributionMarginGap)}">${formatGap(item.contributionMarginGap)}</b>
                </div>
                ${waterfallComparisonHtml(item)}
                ${item.isAggregate ? '<p>合并项不可直接下钻，可通过上方筛选器进入具体项目。</p>' : `<button type="button" class="btn btn-primary" data-touch-drill="${escapeHtml(item.name)}">进入下一层</button>`}
            </div>
        `;

        container.querySelector("[data-touch-drill]")?.addEventListener("click", () => {
            drillToDimensionValue(dimension, item.name);
        });
    }

    function bindWaterfallDrill(visual, dimension, rows) {
        if (!visual || typeof visual.on !== "function") return;
        visual.removeAllListeners?.("plotly_click");
        visual.removeAllListeners?.("plotly_hover");
        visual.removeAllListeners?.("plotly_unhover");
        let activeHoverIndex = -1;
        visual.on("plotly_hover", (event) => {
            const point = event?.points?.[0];
            const index = Number(point?.pointNumber);
            const row = rows[index - 1];
            if (!row) {
                hideWaterfallTooltip();
                return;
            }
            showWaterfallTooltip(row, dimension, event?.event);
        });
        visual.on("plotly_unhover", hideWaterfallTooltip);
        visual.addEventListener("mouseleave", hideWaterfallTooltip);
        visual.addEventListener("mousemove", (event) => {
            if (isTouchLikeViewport()) return;
            const index = waterfallPointIndexFromEvent(visual, event);
            const row = rows[index - 1];
            if (!row) {
                activeHoverIndex = -1;
                hideWaterfallTooltip();
                return;
            }
            if (index !== activeHoverIndex) {
                activeHoverIndex = index;
                showWaterfallTooltip(row, dimension, event);
                return;
            }
            const tooltip = byId("dimension-waterfall-tooltip");
            if (tooltip?.classList.contains("visible")) positionWaterfallTooltip(tooltip, event);
        });
        visual.on("plotly_click", (event) => {
            const point = event?.points?.[0];
            const index = Number(point?.pointNumber);
            const row = rows[index - 1];
            if (!row) return;
            if (isTouchLikeViewport()) {
                renderWaterfallTouchCard(row, dimension);
                return;
            }
            if (row.isAggregate) return;
            drillToDimensionValue(dimension, row.name);
        });
    }

    function renderRankingDimensionFilter(dimension, rows) {
        const selects = Array.from(document.querySelectorAll("[data-ranking-dimension-filter]"));
        if (!selects.length) return;
        const selected = byId(dimensionFilterId(dimension))?.value || "";
        const sortedRows = sortDimensionContributionRows(rows);
        const options = [
            `<option value="">选择${escapeHtml(dimensionLabel(dimension))}</option>`,
            ...sortedRows.map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)} ｜ ${formatGap(item.contributionMarginGap)}</option>`)
        ].join("");

        selects.forEach((select) => {
            select.innerHTML = options;
            select.value = selected;
            select.disabled = !sortedRows.length;
        });
    }

    function renderRankingTable(rows) {
        const dimension = currentAnalysisDimension();
        const rankingStatus = byId("ranking-filter-status");
        const allDimRows = buildDimensionRows(rows);
        const limited = dimensionRowsWithLimit(allDimRows);
        const summary = summarize(rows);
        renderRankingDimensionFilter(dimension, allDimRows);

        if (rankingStatus) {
            const selectedItems = selectedDimensionItems();
            const statusChips = selectedItems.length
                ? selectedItems.map((item) => `<span>${dimensionLabel(item.dimension)}：<strong>${item.value}</strong></span>`)
                : [`<span>当前维度：<strong>${dimensionLabel(dimension)}</strong></span>`];
            statusChips.push(`<span>指标：<strong>边际总额</strong></span>`);
            if (limited.hiddenCount) {
                statusChips.push(`<span>展示策略：<strong>主要 ${MAX_PERFORMANCE_CARDS} 项 + 其他 ${limited.hiddenCount} 项</strong></span>`);
            } else {
                statusChips.push(`<span>展示策略：<strong>${limited.rows.length} 项全部展示</strong></span>`);
            }
            rankingStatus.innerHTML = statusChips.join("");
        }

        const visual = byId("ranking-visual");
        if (!visual) return;
        if (!limited.rows.length) {
            visual.innerHTML = `<div class="waterfall-empty">当前筛选下没有可展示的维度数据。</div>`;
            return;
        }

        visual.innerHTML = `
            <div id="dimension-waterfall-chart" class="waterfall-chart"></div>
            <div id="dimension-waterfall-tooltip" class="waterfall-tooltip" aria-hidden="true"></div>
            <div id="dimension-waterfall-touch-card" class="waterfall-touch-host" aria-live="polite"></div>
        `;

        const waterfallRows = limited.rows;
        const labels = [
            "预算边际总额",
            ...waterfallRows.map((item) => item.name),
            "实际边际总额"
        ];
        const values = [
            displayAmount(summary.budget.contributionMargin),
            ...waterfallRows.map((item) => displayAmount(item.contributionMarginGap)),
            0
        ];
        const deltaValues = waterfallRows.map((item) => displayAmount(item.contributionMarginGap));
        const axisRange = waterfallAxisRange(
            displayAmount(summary.budget.contributionMargin),
            deltaValues,
            displayAmount(summary.actual.contributionMargin)
        );
        const text = [
            formatAmount(summary.budget.contributionMargin),
            ...waterfallRows.map((item) => formatGap(item.contributionMarginGap)),
            formatAmount(summary.actual.contributionMargin)
        ];
        const customdata = [
            { drillable: false, name: "" },
            ...waterfallRows.map((item) => ({ drillable: !item.isAggregate, name: item.name })),
            { drillable: false, name: "" }
        ];
        const chart = byId("dimension-waterfall-chart");

        Plotly.react("dimension-waterfall-chart", [{
            type: "waterfall",
            measure: ["absolute", ...waterfallRows.map(() => "relative"), "total"],
            x: labels.map(waterfallAxisLabel),
            y: values,
            text,
            customdata,
            textposition: "outside",
            cliponaxis: false,
            connector: { line: { color: "#d9d6cb" } },
            increasing: { marker: { color: COLORS.green } },
            decreasing: { marker: { color: COLORS.red } },
            totals: { marker: { color: COLORS.orange } },
            hovertemplate: "%{x}<extra></extra>"
        }], plotLayout({
            showlegend: false,
            height: waterfallHeight(waterfallRows.length),
            margin: { l: 62, r: 30, t: 44, b: 86 },
            clickmode: "event",
            xaxis: { tickfont: { size: 10 }, automargin: true, gridcolor: COLORS.grid, zerolinecolor: COLORS.grid },
            yaxis: { title: amountAxisLabel(), range: axisRange, gridcolor: COLORS.grid, zerolinecolor: COLORS.grid }
        }), drillPlotConfig());

        bindWaterfallDrill(chart, dimension, waterfallRows);
    }

    function renderEmptyState() {
        updateBridgeTitles(hasActiveDimensionFilter());
        renderMetrics(enrichSummary(emptyPnl(), emptyPnl()));
        ["unit-margin-chart", "variance-chart", "profit-bridge-chart"].forEach((id) => {
            Plotly.react(id, [], plotLayout({
                annotations: [{
                    text: "当前筛选无数据",
                    x: 0.5,
                    y: 0.5,
                    xref: "paper",
                    yref: "paper",
                    showarrow: false,
                    font: { color: COLORS.muted, size: 15 }
                }]
            }), plotConfig());
        });
        renderRankingDimensionFilter(currentAnalysisDimension(), []);
        const visual = byId("ranking-visual");
        if (visual) visual.innerHTML = `<div class="waterfall-empty">当前筛选无数据。</div>`;
        renderDrillPath();
    }

    function updateAll() {
        if (!state.rawData.length) return;
        state.activeVarianceKey = currentVarianceDriver().key;
        refreshCascadingFilters();
        const rows = filterData();
        state.filteredData = rows;
        if (!rows.length) {
            renderEmptyState();
            return;
        }

        const summary = summarize(rows);
        state.lastSummary = summary;
        renderMetrics(summary);
        renderUnitMarginChart(rows);
        renderVarianceChart(summary);
        renderProfitBridge(summary);
        renderRankingTable(rows);
        renderDrillPath();
    }

    function loadDemoData() {
        state.operationSourceRows = [];
        state.subjectSourceRows = [];
        state.manualSubjectRows = [];
        state.rawData = buildSampleData();
        state.availableDimensions = inferAvailableDimensions(state.rawData);
        state.selectedDimensions = defaultSelectedDimensions(state.availableDimensions);
        initFilterOptions();
        updateAll();
        showMessage("success", "已加载预算实际对比示例数据。");
    }

    function templateAmount(actual, budget, scenario) {
        return scenario === "actual" ? actual : budget;
    }

    function buildScenarioTemplateRows(scenario = "actual") {
        const operationRows = [
            ["发车量", "欧洲", "德国", "主品牌", "经销", "燃油乘用车", "T1D", 0.68, 0.66, "万辆", "经营明细只放边际以上科目，科目放在行上。"],
            ["净收入", "欧洲", "德国", "主品牌", "经销", "燃油乘用车", "T1D", 8.57, 8.32, "亿元", "如果已有总额，直接填总额。"],
            ["材料成本", "欧洲", "德国", "主品牌", "经销", "燃油乘用车", "T1D", 5.07, 4.88, "亿元", ""],
            ["变动制造费用", "欧洲", "德国", "主品牌", "经销", "燃油乘用车", "T1D", 0.49, 0.48, "亿元", ""],
            ["变动销售费用", "欧洲", "德国", "主品牌", "经销", "燃油乘用车", "T1D", 0.37, 0.36, "亿元", ""],
            ["发车量", "拉美", "墨西哥", "新能源品牌", "直营", "插混业务", "PHEV", 0.31, 0.42, "万辆", "用户可少填或新增维度列，但国家和品牌市场建议分列。"],
            ["净收入", "拉美", "墨西哥", "新能源品牌", "直营", "插混业务", "PHEV", 4.02, 5.58, "亿元", ""],
            ["材料成本", "拉美", "墨西哥", "新能源品牌", "直营", "插混业务", "PHEV", 2.71, 3.45, "亿元", ""],
            ["变动制造费用", "拉美", "墨西哥", "新能源品牌", "直营", "插混业务", "PHEV", 0.28, 0.32, "亿元", ""],
            ["变动销售费用", "拉美", "墨西哥", "新能源品牌", "直营", "插混业务", "PHEV", 0.21, 0.24, "亿元", ""]
        ];

        return operationRows.map(([subject, region, country, brandMarket, mode, businessUnit, model, actual, budget, unit, note]) => ({
            "科目": subject,
            "大区": region,
            "国家": country,
            "品牌市场": brandMarket,
            "经营模式": mode,
            "业务单元": businessUnit,
            "车型": model,
            "金额": templateAmount(actual, budget, scenario),
            "单位": unit,
            "说明": note
        }));
    }

    function buildTemplateRows() {
        return [
            ...buildScenarioTemplateRows("actual").map((row) => ({ "数据口径": "实际", ...row })),
            ...buildScenarioTemplateRows("budget").map((row) => ({ "数据口径": "预算", ...row }))
        ];
    }

    function downloadBlob(filename, content, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function csvCell(value) {
        const text = String(value ?? "");
        return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }

    function buildTemplateRules() {
        return [
            ["模块", "规则"],
            ["模板结构", "Excel 模板拆成“实际”和“预算”两张子表；每张子表只填经营明细口径的金额/数量。CSV 模板用“数据口径”列区分实际和预算。"],
            ["上传区", "经营明细（边际以上）：发车量、净收入、材料成本、变动制造费用、变动销售费用、边际等；需要保留可下钻维度。"],
            ["固定科目", "固定科目不放在上传模板内，在页面左侧固定科目表格中粘贴或手工维护。"],
            ["必填字段", "科目、金额。经营明细建议填写大区、国家、品牌市场、经营模式、业务单元、车型。"],
            ["维度字段", "国家和品牌市场已经拆成两个字段；用户可以少填、改名或新增维度列，但不要把科目塞进维度列。"],
            ["维度识别", "模型会把非保留字段识别为维度。保留字段包括数据口径、科目、金额、实际、预算、单位、说明。"],
            ["展示维度", "上传维度很多时，模型默认优先展示大区、国家、品牌市场、经营模式、业务单元、车型；其它维度可在页面左侧勾选进入筛选和下钻。"],
            ["总额优先", "默认按总额填报：净收入、材料成本、变动制造费用、变动销售费用均直接填金额。"],
            ["单车可选", "如果用户只有单车口径，可以填发车量 + 单车净收入/单车成本，模型会换算总额；默认模板不强制展示单车字段。"],
            ["单位建议", "发车量用万辆；金额项目用亿元；可选单车项目用万元/辆。"]
        ];
    }

    function buildSubjectDictionary() {
        return [
            ["科目组", "科目", "单位建议", "说明"],
            ["经营明细", "发车量 / 发车 / 销量", "万辆", "经营明细基础量。"],
            ["经营明细", "净收入 / 营业收入", "亿元", "默认按总额填报。"],
            ["经营明细", "材料成本", "亿元", "默认按总额填报。"],
            ["经营明细", "变动制造费用", "亿元", "默认按总额填报。"],
            ["经营明细", "变动销售费用", "亿元", "默认按总额填报。"],
            ["经营明细", "边际 / 贡献边际", "亿元", "可直接填边际；如已填收入和成本，模型会自动计算。"],
            ["可选单车", "单车净收入 / 单车收入", "万元/辆", "只有单车口径时可填，需同维度有发车量。"],
            ["可选单车", "单车材料成本", "万元/辆", "只有单车口径时可填，需同维度有发车量。"],
            ["可选单车", "单车变动制造费用", "万元/辆", "只有单车口径时可填，需同维度有发车量。"],
            ["可选单车", "单车变动销售费用", "万元/辆", "只有单车口径时可填，需同维度有发车量。"],
            ["结果口径", "利润总额 / 净利润", "亿元", "如果只掌握最终利润，可直接填写，模型会做差额兜底。"]
        ];
    }

    function buildDimensionGuide() {
        return [
            ["维度列", "是否示例默认列", "建议用途", "能否改名/删除"],
            ["大区", "是", "第一层经营区域下钻。", "可以"],
            ["国家", "是", "国家/市场层级下钻。", "可以"],
            ["品牌市场", "是", "品牌、品牌层级或品牌市场定位。", "可以"],
            ["经营模式", "是", "经销、直营、批售等模式对比。", "可以"],
            ["业务单元", "是", "燃油、纯电、插混、SUV 等业务线。", "可以"],
            ["车型", "是", "车型/平台级分析。", "可以"],
            ["自定义维度", "否", "可新增如销售公司、订单类型、动力类型、价格带、客户类型、项目阶段等。", "可以新增任意列"]
        ];
    }

    function setWorksheetWidths(worksheet, widths) {
        worksheet["!cols"] = widths.map((wch) => ({ wch }));
        return worksheet;
    }

    function downloadCsvTemplate() {
        const rows = buildTemplateRows();
        const headers = ["数据口径", ...TEMPLATE_HEADERS];
        const csv = [
            headers.map(csvCell).join(","),
            ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))
        ].join("\n");
        downloadBlob("预算实际对比模型模板.csv", `\uFEFF${csv}`, "text/csv;charset=utf-8");
    }

    function downloadXlsxTemplate() {
        if (typeof XLSX === "undefined") {
            downloadCsvTemplate();
            return;
        }
        const workbook = XLSX.utils.book_new();
        const actualSheet = setWorksheetWidths(
            XLSX.utils.json_to_sheet(buildScenarioTemplateRows("actual"), { header: TEMPLATE_HEADERS }),
            [18, 12, 12, 14, 12, 14, 12, 12, 10, 44]
        );
        const budgetSheet = setWorksheetWidths(
            XLSX.utils.json_to_sheet(buildScenarioTemplateRows("budget"), { header: TEMPLATE_HEADERS }),
            [18, 12, 12, 14, 12, 14, 12, 12, 10, 44]
        );
        XLSX.utils.book_append_sheet(workbook, actualSheet, "实际");
        XLSX.utils.book_append_sheet(workbook, budgetSheet, "预算");

        const rules = setWorksheetWidths(XLSX.utils.aoa_to_sheet(buildTemplateRules()), [18, 92]);
        const subjects = setWorksheetWidths(XLSX.utils.aoa_to_sheet(buildSubjectDictionary()), [16, 28, 14, 46]);
        const dimensions = setWorksheetWidths(XLSX.utils.aoa_to_sheet(buildDimensionGuide()), [18, 16, 48, 18]);
        XLSX.utils.book_append_sheet(workbook, rules, "填表规则");
        XLSX.utils.book_append_sheet(workbook, subjects, "科目字典");
        XLSX.utils.book_append_sheet(workbook, dimensions, "维度说明");
        XLSX.writeFile(workbook, "预算实际对比模型模板.xlsx");
    }

    function defaultManualSubjectDrafts() {
        return [
            { subject: "技术开发费", actual: "0.08", budget: "0.07" },
            { subject: "国际固定费用", actual: "0.29", budget: "0.28" },
            { subject: "折旧加摊销", actual: "0.08", budget: "0.08" }
        ];
    }

    function hasManualDraftContent(row) {
        return ["subject", "actual", "budget"].some((field) => String(row?.[field] || "").trim());
    }

    function parseClipboardTable(text) {
        return String(text || "")
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .split("\n")
            .map((line) => {
                if (line.includes("\t")) return line.split("\t").map((cell) => cell.trim());
                if (line.includes(",")) return line.split(",").map((cell) => cell.trim());
                return line.trim().split(/\s+/).map((cell) => cell.trim());
            })
            .filter((cells) => cells.some(Boolean));
    }

    function isManualSubjectHeader(cells) {
        if (cells.some((cell) => /[-+]?(\d+(\.\d+)?|\.\d+)/.test(String(cell || "").replace(/,/g, "")))) {
            return false;
        }
        const normalized = cells.map(normalizeToken);
        const headerTokens = new Set([
            "科目",
            "固定科目",
            "边际以下固定科目",
            "项目",
            "指标",
            "subject",
            "lineitem",
            "实际",
            "实际值",
            "实际数据",
            "actual",
            "预算",
            "预算值",
            "budget",
            "金额",
            "amount",
            "value"
        ]);
        if (normalized.length === 1) return ["科目", "固定科目", "固定科目表", "边际以下固定科目", "边际以下费用"].includes(normalized[0]);
        return normalized.filter(Boolean).every((cell) => headerTokens.has(cell));
    }

    function applyManualRows(rows, { startRow = 0, startColumn = 0, replace = false } = {}) {
        const effectiveRows = rows.length && isManualSubjectHeader(rows[0]) ? rows.slice(1) : rows;
        if (!effectiveRows.length) return 0;

        if (replace) {
            state.manualSubjectDrafts = [];
        } else {
            syncManualDrafts();
        }
        effectiveRows.forEach((cells, rowOffset) => {
            const rowIndex = startRow + rowOffset;
            while (state.manualSubjectDrafts.length <= rowIndex) {
                state.manualSubjectDrafts.push({ subject: "", actual: "", budget: "" });
            }

            const draft = state.manualSubjectDrafts[rowIndex];
            cells.forEach((cell, columnOffset) => {
                const nextField = MANUAL_SUBJECT_FIELDS[startColumn + columnOffset];
                if (nextField) draft[nextField] = cell;
            });
        });

        renderManualSubjectRows();
        return effectiveRows.length;
    }

    function applyManualPasteText(text, options) {
        const rows = parseClipboardTable(text);
        const applied = applyManualRows(rows, options);
        if (applied) showMessage("success", `已识别 ${applied} 行科目，可继续编辑后应用。`);
        return applied;
    }

    function applyManualPasteBoxValue(box, { silent = false } = {}) {
        const text = box?.value || "";
        if (!text.includes("\t") && !/[\r\n]/.test(text)) return 0;
        if (box.dataset.lastParsedText === text) return 0;

        box.dataset.lastParsedText = text;
        const rows = parseClipboardTable(text);
        const applied = applyManualRows(rows, { startRow: 0, startColumn: 0, replace: true });
        if (applied && !silent) showMessage("success", `已识别 ${applied} 行科目，可继续编辑后应用。`);
        return applied;
    }

    function applyManualSubjectPaste(event) {
        const clipboardText = event.clipboardData?.getData("text/plain") || "";
        if (!clipboardText.includes("\t") && !/[\r\n]/.test(clipboardText)) return;

        const target = event.target;
        const field = target?.getAttribute?.("data-manual-field");
        if (!MANUAL_SUBJECT_FIELDS.includes(field)) return;

        const pastedRows = parseClipboardTable(clipboardText);
        if (!pastedRows.length) return;

        event.preventDefault();
        syncManualDrafts();

        const tableRow = target.closest("tr[data-manual-index]");
        const startRow = Math.max(0, Number(tableRow?.getAttribute("data-manual-index") || 0));
        const startColumn = MANUAL_SUBJECT_FIELDS.indexOf(field);
        applyManualPasteText(clipboardText, { startRow, startColumn });
    }

    function bindManualPasteBox() {
        const box = byId("manual-subject-paste");
        if (!box) return;

        bindOnce(box, "paste", (event) => {
            const text = event.clipboardData?.getData("text/plain") || "";
            if (!text.trim()) return;
            event.preventDefault();
            box.value = text;
            applyManualPasteBoxValue(box);
        }, "manual-subject-paste");

        bindOnce(box, "input", () => {
            applyManualPasteBoxValue(box);
        }, "manual-subject-paste-input");

        if (!window.manualSubjectPasteWatcher) {
            window.manualSubjectPasteWatcher = window.setInterval(() => {
                const currentBox = byId("manual-subject-paste");
                if (currentBox) applyManualPasteBoxValue(currentBox, { silent: true });
            }, 500);
        }
    }

    function renderManualSubjectRows() {
        const tbody = byId("manual-subject-body");
        if (!tbody) return;
        if (!state.manualSubjectDrafts.length || !state.manualSubjectDrafts.some(hasManualDraftContent)) {
            state.manualSubjectDrafts = defaultManualSubjectDrafts();
        }

        tbody.innerHTML = state.manualSubjectDrafts.map((row, index) => `
            <tr data-manual-index="${index}">
                <td><input class="manual-input" data-manual-field="subject" value="${escapeHtml(row.subject || "")}" /></td>
                <td><input class="manual-input" data-manual-field="actual" value="${escapeHtml(row.actual ?? "")}" inputmode="decimal" /></td>
                <td><input class="manual-input" data-manual-field="budget" value="${escapeHtml(row.budget ?? "")}" inputmode="decimal" /></td>
                <td><button type="button" class="manual-remove" data-manual-remove="${index}" aria-label="删除科目">×</button></td>
            </tr>
        `).join("");

        Array.from(tbody.querySelectorAll("[data-manual-field]")).forEach((input) => {
            input.addEventListener("input", syncManualDrafts);
            input.addEventListener("change", syncManualDrafts);
            input.addEventListener("paste", applyManualSubjectPaste);
        });
        Array.from(tbody.querySelectorAll("[data-manual-remove]")).forEach((button) => {
            button.addEventListener("click", () => {
                syncManualDrafts();
                const index = Number(button.getAttribute("data-manual-remove"));
                state.manualSubjectDrafts.splice(index, 1);
                if (!state.manualSubjectDrafts.length) state.manualSubjectDrafts = defaultManualSubjectDrafts();
                renderManualSubjectRows();
            });
        });
    }

    function syncManualDrafts() {
        const tbody = byId("manual-subject-body");
        if (!tbody) return;
        state.manualSubjectDrafts = Array.from(tbody.querySelectorAll("tr[data-manual-index]")).map((row) => ({
            subject: row.querySelector('[data-manual-field="subject"]')?.value || "",
            actual: row.querySelector('[data-manual-field="actual"]')?.value || "",
            budget: row.querySelector('[data-manual-field="budget"]')?.value || ""
        }));
    }

    function manualSubjectRowsFromDrafts() {
        syncManualDrafts();
        return state.manualSubjectDrafts.flatMap((row) => {
            const subject = String(row.subject || "").trim();
            if (!subject) return [];

            const actual = toNumber(row.actual);
            const budget = toNumber(row.budget);
            if (!actual && !budget) return [];

            return [{
                "科目": subject,
                "实际": actual,
                "预算": budget,
                "单位": "亿元",
                "说明": "页面手工录入"
            }];
        });
    }

    function combinedSourceRows() {
        return [
            ...safeArray(state.operationSourceRows),
            ...safeArray(state.subjectSourceRows),
            ...safeArray(state.manualSubjectRows)
        ];
    }

    function applySourceRows(message) {
        const rows = combinedSourceRows();
        if (!rows.length) {
            showMessage("error", "还没有可分析的数据，请先上传经营明细或填写科目行。");
            return;
        }

        const parsed = parseRows(rows);
        if (!parsed.length) {
            showMessage("error", "没有识别到有效数据，请检查模板列名。");
            return;
        }

        state.rawData = parsed;
        state.availableDimensions = parsed.availableDimensions || inferAvailableDimensions(parsed);
        state.selectedDimensions = defaultSelectedDimensions(state.availableDimensions);
        initFilterOptions();
        updateAll();
        showMessage("success", message || `已导入 ${parsed.length} 行预算实际数据。`);
    }

    function exportSummary() {
        if (!state.lastSummary) return;
        const summary = state.lastSummary;
        const driver = currentVarianceDriver();
        const varianceLines = VARIANCE_DRIVERS
            .filter((item) => !["salesVolume", "unitContributionMargin"].includes(item.key))
            .map((item) => [driverGapLabel(item), "", "", formatDriverGap(driverValue(summary, item), item)]);
        const filters = currentDimensions()
            .map((dimension) => `${dimensionLabel(dimension)}=${byId(dimensionFilterId(dimension))?.value || "全部"}`)
            .join("；");
        const lines = [
            ["指标", "实际", "预算", "差异/达成"],
            ["发车量", formatVolume(summary.actual.salesVolume), formatVolume(summary.budget.salesVolume), formatPercent(summary.volumeAchievement)],
            ["净收入", formatAmount(summary.actual.netRevenue), formatAmount(summary.budget.netRevenue), formatGap(summary.revenueGap)],
            ["边际", formatAmount(summary.actual.contributionMargin), formatAmount(summary.budget.contributionMargin), formatGap(summary.contributionMarginGap)],
            ["利润总额", formatAmount(summary.actual.profit), formatAmount(summary.budget.profit), formatGap(summary.profitGap)],
            ["边际率", formatPercent(summary.actual.contributionMarginRate), formatPercent(summary.budget.contributionMarginRate), ""],
            ["利润率", formatPercent(summary.actual.profitRate), formatPercent(summary.budget.profitRate), ""],
            [],
            ["筛选口径", "维度", filters, ""],
            ["对照指标", driver.label, formatDriverValue(driverActual(summary, driver), driver), formatDriverGap(driverValue(summary, driver), driver)],
            [],
            ["损益科目差异", "", "", ""],
            ...varianceLines
        ];
        const csv = lines.map((line) => line.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n");
        downloadBlob("预算实际对比摘要.csv", `\uFEFF${csv}`, "text/csv;charset=utf-8");
        showMessage("success", "已导出当前预算实际对比摘要。");
    }

    function scenarioFromSheetName(sheetName) {
        const name = normalizeToken(sheetName);
        if (name === "实际" || name.startsWith("实际") || name.startsWith("actual")) return "actual";
        if (name === "预算" || name.startsWith("预算") || name.startsWith("budget")) return "budget";
        return "";
    }

    function rowsFromSheet(workbook, sheetName, scenario = "") {
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" }).map(normalizeRowKeys);
        if (!scenario) return rows;

        return rows.map((row) => {
            const amount = pick(row, ["金额", "数量", "值", "amount", "Amount", "value"]);
            const next = { "数据口径": scenario === "actual" ? "实际" : "预算", ...row };
            if (amount !== undefined && pick(row, ["实际", "实际值", "实际数据", "actual", "Actual"]) === undefined && pick(row, ["预算", "预算值", "budget", "Budget"]) === undefined) {
                next[scenario === "actual" ? "实际" : "预算"] = amount;
            }
            return next;
        });
    }

    function rowsFromWorkbook(workbook) {
        const scenarioSheets = workbook.SheetNames
            .map((sheetName) => ({ sheetName, scenario: scenarioFromSheetName(sheetName) }))
            .filter((item) => item.scenario);

        if (scenarioSheets.length) {
            return scenarioSheets.flatMap((item) => rowsFromSheet(workbook, item.sheetName, item.scenario));
        }

        return rowsFromSheet(workbook, workbook.SheetNames[0]);
    }

    function readUploadRows(file, result) {
        if (/\.csv$/i.test(file.name)) {
            const text = new TextDecoder("utf-8").decode(result);
            const workbook = XLSX.read(text, { type: "string" });
            return rowsFromWorkbook(workbook);
        }

        const workbook = XLSX.read(new Uint8Array(result), { type: "array" });
        return rowsFromWorkbook(workbook);
    }

    function handleFile(file, source = "operation") {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const rows = readUploadRows(file, event.target.result);
                if (source === "subjects") {
                    state.subjectSourceRows = rows;
                    applySourceRows(`已导入科目行 ${rows.length} 行。`);
                } else {
                    state.operationSourceRows = rows;
                    applySourceRows(`已导入经营明细 ${rows.length} 行。`);
                }
            } catch (error) {
                console.error(error);
                showMessage("error", "文件解析失败，请检查文件格式。");
            } finally {
                ["operation-file-input"].forEach((id) => {
                    const input = byId(id);
                    if (input) input.value = "";
                });
            }
        };
        reader.readAsArrayBuffer(file);
    }

    function resetFilters() {
        const assignments = {
            "dimension-select": currentDimensions()[0] || "",
            "variance-metric-select": "contributionMargin",
            "unit-select": "yi"
        };
        Object.entries(assignments).forEach(([id, value]) => {
            const el = byId(id);
            if (el) el.value = value;
        });
        currentDimensions().forEach((dimension) => {
            const el = byId(dimensionFilterId(dimension));
            if (el) el.value = "";
        });
        state.activeVarianceKey = "contributionMargin";
        updateAll();
    }

    function bindSidebar() {
        const sidebar = byId("business-sidebar");
        const toggle = byId("sidebar-toggle");
        const expand = byId("sidebar-expand");
        if (!sidebar || !toggle || !expand) return;

        if (window.matchMedia("(max-width: 820px)").matches) {
            sidebar.classList.add("collapsed");
            expand.style.display = "inline-flex";
        }

        bindOnce(toggle, "click", () => {
            sidebar.classList.add("collapsed");
            expand.style.display = "inline-flex";
        }, "sidebar-toggle");
        bindOnce(expand, "click", () => {
            sidebar.classList.remove("collapsed");
            expand.style.display = "none";
        }, "sidebar-expand");
    }

    function bindUpload() {
        [
            { inputId: "operation-file-input", zoneId: "operation-upload-zone", source: "operation" }
        ].forEach(({ inputId, zoneId, source }) => {
            const input = byId(inputId);
            const zone = byId(zoneId);
            if (input) bindOnce(input, "change", (event) => handleFile(event.target.files?.[0], source), `upload-${inputId}`);
            if (!zone) return;

            bindOnce(zone, "dragover", (event) => {
                event.preventDefault();
                zone.classList.add("drag-over");
            }, `dragover-${zoneId}`);
            bindOnce(zone, "dragleave", () => zone.classList.remove("drag-over"), `dragleave-${zoneId}`);
            bindOnce(zone, "drop", (event) => {
                event.preventDefault();
                zone.classList.remove("drag-over");
                handleFile(event.dataTransfer?.files?.[0], source);
            }, `drop-${zoneId}`);
        });
    }

    function bindControls() {
        [
            "dimension-select",
            "variance-metric-select",
            "unit-select"
        ].forEach((id) => {
            const el = byId(id);
            if (!el) return;
            bindOnce(el, id.includes("input") ? "input" : "change", () => {
                if (id === "variance-metric-select") {
                    state.activeVarianceKey = VARIANCE_DRIVER_BY_KEY[el.value]?.key || "contributionMargin";
                }
                updateAll();
            }, `control-${id}`);
        });

        Array.from(document.querySelectorAll("[data-ranking-dimension-filter]")).forEach((select) => {
            bindOnce(select, "change", (event) => {
                const dimension = currentAnalysisDimension();
                const value = event.target?.value || "";
                if (value) {
                    drillToDimensionValue(dimension, value);
                    return;
                }
                clearDimensionFilter(dimension);
            }, `ranking-dimension-filter-${select.id || "inline"}`);
        });

        bindOnce(byId("btn-demo"), "click", loadDemoData, "btn-demo");
        bindOnce(byId("btn-csv-template"), "click", downloadCsvTemplate, "btn-csv-template");
        bindOnce(byId("btn-xlsx-template"), "click", downloadXlsxTemplate, "btn-xlsx-template");
        bindOnce(byId("btn-reset"), "click", resetFilters, "btn-reset");
        bindOnce(byId("btn-export"), "click", exportSummary, "btn-export");
        Array.from(document.querySelectorAll("[data-ranking-clear]")).forEach((button) => {
            bindOnce(button, "click", clearLastDimensionFilter, `ranking-clear-${button.id || "inline"}`);
        });
        bindOnce(byId("btn-add-subject-row"), "click", () => {
            syncManualDrafts();
            state.manualSubjectDrafts.push({ subject: "", actual: "", budget: "" });
            renderManualSubjectRows();
        }, "btn-add-subject-row");
        bindOnce(byId("btn-apply-subjects"), "click", () => {
            state.manualSubjectRows = manualSubjectRowsFromDrafts();
            applySourceRows(`已应用 ${state.manualSubjectRows.length} 行手工科目。`);
        }, "btn-apply-subjects");
    }

    function initApp() {
        const root = byId("business-analysis-root");
        if (!root || typeof Plotly === "undefined") return;
        if (root.dataset.initialized === "true") {
            bindSidebar();
            renderManualSubjectRows();
            bindManualPasteBox();
            bindUpload();
            bindControls();
            updateAll();
            return;
        }

        root.dataset.initialized = "true";
        bindSidebar();
        renderManualSubjectRows();
        bindManualPasteBox();
        bindUpload();
        bindControls();
        loadDemoData();
    }

    if (typeof window !== "undefined") {
        window.BusinessAnalysisModel = { initApp };
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = {
            computePnl,
            buildSampleData,
            buildTemplateRows,
            buildScenarioTemplateRows,
            parseRows,
            summarize,
            initApp
        };
    }
})();

if (typeof module !== "undefined" && module.exports) {
    module.exports = module.exports || {};
}
