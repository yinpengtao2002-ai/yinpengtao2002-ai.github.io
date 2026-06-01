const TEMPLATE_HEADERS = ["月份", "大区", "国家", "品牌", "品牌市场", "经营模式", "业务单元", "车型", "燃油品类", "销量", "净收入", "成本", "边际"];
const TEMPLATE_HEADER_NOTE = "可直接修改标题行；请保留“月份”和“销量”。销量列之前会按表头自动识别为维度，可新增、删除或改名；销量列之后的数值列会识别为上传指标。模板提供净收入、成本、边际作为示例，也可以替换成任意指标，页面会跟随表头同步分析。";

const MONTH_ALIASES = ["月份", "年月", "期间", "日期", "month", "period", "date"];
const VOLUME_ALIASES = ["销量", "销售量", "发车量", "台数", "数量", "volume", "qty", "quantity", "units"];
const REVENUE_ALIASES = ["净收入", "营业收入", "收入", "净收入总额", "收入总额", "revenue", "netrevenue", "sales", "gmv"];
const PRIMARY_VALUE_ALIASES = ["边际", "边际总额", "贡献边际", "毛利", "毛利额", "利润贡献", "利润", "margin", "grossmargin", "contributionmargin", "profit"];
const DEFAULT_DIMENSION_PATH_CANDIDATES = ["大区", "国家", "品牌", "车型", "燃油品类"];
const DIMENSION_SELECT_IDS = [
    "profit-structure-primary-dimension",
    "profit-structure-secondary-dimension",
    "profit-structure-tertiary-dimension",
    "profit-structure-fourth-dimension",
    "profit-structure-fifth-dimension"
];
const SANKEY_LEVEL_LIMITS = [12, 16, 12, 12, 10];
const COMPACT_SANKEY_LEVEL_LIMITS = [6, 8, 8, 6, 6];

const COLOR_PALETTE = [
    "#5c8fba",
    "#d97757",
    "#788c5d",
    "#b98524",
    "#7f75b6",
    "#4f9f8f",
    "#b65f55",
    "#8e8374",
    "#d1969b",
    "#6f8fb7",
    "#9a8c55",
    "#5f7864"
];

const state = {
    initialized: false,
    rows: [],
    schema: null,
    selectedDimensions: [],
    selectedPrimaryMetric: "",
    selectedSecondaryMetric: "",
    selectedMonth: "__all__",
    filters: {},
    currentSourceLabel: "示例数据"
};

function normalizeToken(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[（）()_\-\s/\\]/g, "")
        .replace(/总额|金额|合计/g, "");
}

function cleanHeader(value) {
    return String(value ?? "").trim();
}

function addAliasSet(values) {
    return new Set(values.map((item) => normalizeToken(item)));
}

function findHeader(headers, aliases) {
    const aliasSet = addAliasSet(aliases);
    return headers.find((header) => aliasSet.has(normalizeToken(header))) || "";
}

function isBlank(value) {
    return value === undefined || value === null || String(value).trim() === "";
}

function toNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (isBlank(value)) return 0;

    let text = String(value).trim();
    let negative = false;
    if (/^\(.*\)$/.test(text)) {
        negative = true;
        text = text.slice(1, -1);
    }

    text = text
        .replace(/[,，]/g, "")
        .replace(/[￥¥$€£]/g, "")
        .replace(/%/g, "")
        .trim();

    const parsed = Number.parseFloat(text);
    if (!Number.isFinite(parsed)) return 0;
    return negative ? -parsed : parsed;
}

function formatMonth(value) {
    if (value instanceof Date && Number.isFinite(value.getTime())) {
        return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
    }
    const text = String(value ?? "").trim();
    if (!text) return "未填写";
    const dateMatch = text.match(/^(\d{4})[-/.年]?(\d{1,2})/);
    if (dateMatch) return `${dateMatch[1]}-${String(Number(dateMatch[2])).padStart(2, "0")}`;
    return text;
}

function collectHeaders(rows) {
    const seen = new Set();
    const headers = [];
    for (const row of rows) {
        for (const key of Object.keys(row || {})) {
            const header = cleanHeader(key);
            if (!header || seen.has(header)) continue;
            seen.add(header);
            headers.push(header);
        }
    }
    return headers;
}

function normalizeUploadedRows(inputRows = []) {
    const sourceRows = Array.isArray(inputRows) ? inputRows.filter(Boolean) : [];
    const sourceHeaders = collectHeaders(sourceRows);
    const monthColumn = findHeader(sourceHeaders, MONTH_ALIASES);
    const volumeColumn = findHeader(sourceHeaders, VOLUME_ALIASES);
    const volumeIndex = volumeColumn ? sourceHeaders.indexOf(volumeColumn) : -1;
    const dimensions = sourceHeaders
        .slice(0, volumeIndex >= 0 ? volumeIndex : sourceHeaders.length)
        .filter((header) => header && header !== monthColumn);
    const metricColumns = volumeIndex >= 0
        ? sourceHeaders.slice(volumeIndex + 1).filter((header) => header && header !== monthColumn)
        : [];
    const schema = {
        sourceHeaders,
        monthColumn,
        volumeColumn,
        dimensions,
        metricColumns,
        financialColumns: metricColumns
    };

    const rows = sourceRows.map((row) => {
        const dimensionValues = {};
        for (const dimension of dimensions) {
            const value = row[dimension];
            dimensionValues[dimension] = isBlank(value) ? "未填写" : String(value).trim();
        }

        const metrics = {};
        for (const column of metricColumns) {
            metrics[column] = toNumber(row[column]);
        }

        return {
            month: monthColumn ? formatMonth(row[monthColumn]) : "未填写",
            volume: volumeColumn ? toNumber(row[volumeColumn]) : 0,
            metrics,
            dimensionValues,
            raw: row
        };
    }).filter((row) => {
        const hasDimension = Object.values(row.dimensionValues).some((value) => !isBlank(value));
        const hasMetric = Object.values(row.metrics).some((value) => value !== 0);
        return hasDimension || row.volume || hasMetric;
    });

    return { rows, schema };
}

function buildDimensionOptions(schema) {
    return Array.isArray(schema?.dimensions) ? [...schema.dimensions] : [];
}

function buildMetricOptions(schema) {
    return Array.isArray(schema?.metricColumns) ? [...schema.metricColumns] : [];
}

function defaultDimensionPath(schema, maxLevels = 5) {
    const dimensions = buildDimensionOptions(schema);
    const selected = [];
    for (const dimension of DEFAULT_DIMENSION_PATH_CANDIDATES) {
        if (dimensions.includes(dimension) && !selected.includes(dimension)) selected.push(dimension);
    }
    for (const dimension of dimensions) {
        if (selected.length >= maxLevels) break;
        if (!selected.includes(dimension)) selected.push(dimension);
    }
    return selected.slice(0, maxLevels);
}

function ratio(numerator, denominator) {
    return denominator ? numerator / denominator : 0;
}

function isRateLikeMetric(metric) {
    return /率|占比|比例|%|pct|rate|ratio|index|指数|score|评分|满意|nps/i.test(String(metric));
}

function metricUnitLabel(metric, denominator = "销量") {
    return isRateLikeMetric(metric) ? metric : `${metric} / ${denominator || "销量"}`;
}

function unitMetricValue(metric, value, volume) {
    return isRateLikeMetric(metric) ? value : ratio(value, volume);
}

function preferredMetric(metricColumns, aliases) {
    const aliasSet = addAliasSet(aliases);
    return metricColumns.find((metric) => aliasSet.has(normalizeToken(metric))) || "";
}

function pickPrimaryMetric(schema, selectedMetric = "") {
    const metricColumns = buildMetricOptions(schema);
    if (metricColumns.includes(selectedMetric)) return selectedMetric;
    return preferredMetric(metricColumns, PRIMARY_VALUE_ALIASES)
        || metricColumns.find((metric) => !isRateLikeMetric(metric))
        || metricColumns[0]
        || "";
}

function pickSecondaryMetric(schema, primaryMetric = "", selectedMetric = "") {
    const metricColumns = buildMetricOptions(schema).filter((metric) => metric !== primaryMetric);
    if (metricColumns.includes(selectedMetric)) return selectedMetric;
    return preferredMetric(metricColumns, REVENUE_ALIASES)
        || metricColumns.find((metric) => !isRateLikeMetric(metric))
        || metricColumns[0]
        || "";
}

function buildAnalysisConfig(schema, options = {}) {
    const primaryMetric = pickPrimaryMetric(schema, options.primaryMetric);
    const secondaryMetric = pickSecondaryMetric(schema, primaryMetric, options.secondaryMetric);
    const denominator = schema?.volumeColumn || "销量";
    return {
        primaryMetric,
        secondaryMetric,
        matrix: {
            xMetric: primaryMetric,
            yMetric: secondaryMetric,
            xTitle: primaryMetric ? metricUnitLabel(primaryMetric, denominator) : "横轴指标",
            yTitle: secondaryMetric ? metricUnitLabel(secondaryMetric, denominator) : `${primaryMetric || "指标"}合计`,
            bubbleTitle: primaryMetric || "上传指标"
        }
    };
}

function makeGroupName(row, dimensions) {
    return dimensions.map((dimension) => row.dimensionValues[dimension] || "未填写").join(" / ");
}

function rowPassesFilters(row, filters = {}) {
    return Object.entries(filters).every(([dimension, value]) => {
        if (!value || value === "__all__") return true;
        return (row.dimensionValues[dimension] || "未填写") === value;
    });
}

function emptyMetrics(metricColumns) {
    return Object.fromEntries(metricColumns.map((metric) => [metric, 0]));
}

function summarizeProfitStructure(rows, schema, options = {}) {
    const dimensions = (options.dimensions || []).filter(Boolean);
    const selectedDimensions = dimensions.length ? dimensions : buildDimensionOptions(schema).slice(0, 1);
    const month = options.month || "__all__";
    const filters = options.filters || {};
    const metricColumns = buildMetricOptions(schema);
    const analysis = buildAnalysisConfig(schema, {
        primaryMetric: options.primaryMetric,
        secondaryMetric: options.secondaryMetric
    });
    const activeRows = rows.filter((row) => {
        if (month !== "__all__" && row.month !== month) return false;
        return rowPassesFilters(row, filters);
    });
    const groups = new Map();

    for (const row of activeRows) {
        const name = makeGroupName(row, selectedDimensions);
        if (!groups.has(name)) {
            groups.set(name, {
                name,
                dimensionValues: Object.fromEntries(selectedDimensions.map((dimension) => [dimension, row.dimensionValues[dimension] || "未填写"])),
                volume: 0,
                metrics: emptyMetrics(metricColumns)
            });
        }
        const group = groups.get(name);
        group.volume += row.volume;
        for (const metric of metricColumns) {
            group.metrics[metric] += row.metrics[metric] || 0;
        }
    }

    const totals = activeRows.reduce((acc, row) => {
        acc.volume += row.volume;
        for (const metric of metricColumns) {
            acc.metrics[metric] += row.metrics[metric] || 0;
        }
        return acc;
    }, { volume: 0, metrics: emptyMetrics(metricColumns) });
    totals.unitMetrics = Object.fromEntries(metricColumns.map((metric) => [metric, unitMetricValue(metric, totals.metrics[metric], totals.volume)]));

    const primaryTotal = analysis.primaryMetric ? totals.metrics[analysis.primaryMetric] || 0 : 0;
    const baseItems = Array.from(groups.values())
        .map((item) => {
            const unitMetrics = Object.fromEntries(metricColumns.map((metric) => [metric, unitMetricValue(metric, item.metrics[metric], item.volume)]));
            const primaryValue = analysis.primaryMetric ? item.metrics[analysis.primaryMetric] || 0 : 0;
            const secondaryValue = analysis.secondaryMetric ? item.metrics[analysis.secondaryMetric] || 0 : 0;
            return {
                ...item,
                unitMetrics,
                primaryValue,
                secondaryValue,
                primaryUnitValue: analysis.primaryMetric ? unitMetrics[analysis.primaryMetric] || 0 : 0,
                secondaryUnitValue: analysis.secondaryMetric ? unitMetrics[analysis.secondaryMetric] || 0 : primaryValue,
                volumeShare: ratio(item.volume, totals.volume),
                primaryShare: primaryTotal ? primaryValue / primaryTotal : 0
            };
        })
        .sort((a, b) => b.primaryValue - a.primaryValue || b.volume - a.volume || a.name.localeCompare(b.name, "zh-Hans-CN"));

    return {
        schema,
        metricColumns,
        selectedDimensions,
        rows: activeRows,
        totals,
        items: baseItems,
        analysis
    };
}

function createSampleRows() {
    const rows = [];
    const countries = [
        ["欧洲", "德国", 1.08],
        ["欧洲", "法国", 0.92],
        ["欧洲", "英国", 0.84],
        ["拉美", "墨西哥", 1.22],
        ["拉美", "巴西", 1.04],
        ["中东", "沙特", 0.72],
        ["亚太", "澳大利亚", 0.68],
        ["亚太", "泰国", 0.88]
    ];
    const brands = [
        {
            brand: "品牌A",
            brandMarket: "主品牌",
            mode: "经销",
            unit: "全球主销",
            variants: [
                ["Atlas", "燃油", 0.94, 12.4, -8.6],
                ["Atlas", "插混", 0.36, 15.8, -11.2]
            ]
        },
        {
            brand: "品牌B",
            brandMarket: "新能源品牌",
            mode: "直营",
            unit: "新能源业务",
            variants: [
                ["Nova", "纯电", 0.44, 17.6, -13.4],
                ["Nova", "插混", 0.28, 15.1, -11.1]
            ]
        },
        {
            brand: "品牌C",
            brandMarket: "高端品牌",
            mode: "大客户",
            unit: "高端 SUV",
            variants: [
                ["Summit", "燃油", 0.22, 21.5, -15.7],
                ["Summit", "纯电", 0.12, 24.8, -20.4]
            ]
        },
        {
            brand: "品牌D",
            brandMarket: "商用品牌",
            mode: "经销",
            unit: "商用车业务",
            variants: [
                ["Cargo", "燃油", 0.31, 10.4, -9.2],
                ["Cargo", "纯电", 0.16, 13.2, -12.1]
            ]
        }
    ];
    const months = ["2026-01", "2026-02", "2026-03"];

    months.forEach((month, monthIndex) => {
        countries.forEach(([region, country, countryFactor], countryIndex) => {
            brands.forEach((brandConfig, brandIndex) => {
                brandConfig.variants.forEach(([model, fuel, baseVolume, baseRevenue, baseCost], variantIndex) => {
                    const channelFactor = brandConfig.mode === "直营" ? 0.94 : brandConfig.mode === "大客户" ? 0.72 : 1;
                    const seasonal = 1 + monthIndex * 0.035 + (countryIndex % 3) * 0.018 + variantIndex * 0.026;
                    const mixShift = 1 + (brandIndex - 1.5) * 0.04 + (countryIndex % 2 ? -0.025 : 0.025);
                    const volume = round(baseVolume * countryFactor * channelFactor * seasonal * mixShift, 3);
                    const revenue = round(volume * baseRevenue * (1 + countryIndex * 0.012 + monthIndex * 0.01), 3);
                    const costDrag = country === "巴西" || country === "沙特" ? 1.08 : country === "德国" ? 0.96 : 1;
                    const cost = round(volume * baseCost * costDrag * (1 + variantIndex * 0.018), 3);
                    rows.push({
                        "月份": month,
                        "大区": region,
                        "国家": country,
                        "品牌": brandConfig.brand,
                        "品牌市场": brandConfig.brandMarket,
                        "经营模式": brandConfig.mode,
                        "业务单元": brandConfig.unit,
                        "车型": model,
                        "燃油品类": fuel,
                        "销量": volume,
                        "净收入": revenue,
                        "成本": cost,
                        "边际": round(revenue + cost, 3)
                    });
                });
            });
        });
    });

    return rows;
}

function round(value, digits = 2) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function formatNumber(value, digits = 2) {
    return new Intl.NumberFormat("zh-CN", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
    }).format(Number.isFinite(value) ? value : 0);
}

function formatMetricValue(value) {
    const abs = Math.abs(value || 0);
    const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
    return formatNumber(value, digits);
}

function formatVolume(value) {
    return formatNumber(value, 2);
}

function byId(id) {
    if (typeof document === "undefined") return null;
    return document.getElementById(id);
}

function showMessage(type, text) {
    const area = byId("profit-structure-message-area");
    if (!area) return;
    area.innerHTML = `<div class="message ${type}">${escapeHtml(text)}</div>`;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function isCompactViewport() {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 720px)").matches;
}

function compactPointLabel(value) {
    const text = String(value ?? "").trim();
    const chars = Array.from(text);
    if (chars.length <= 4) return text;
    return `${chars.slice(0, 4).join("")}…`;
}

function chartConfig() {
    return {
        responsive: true,
        displayModeBar: false,
        displaylogo: false,
        scrollZoom: false,
        doubleClick: false
    };
}

function chartLayout(extra = {}) {
    return {
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        margin: { t: 24, r: 18, b: 54, l: 58 },
        font: {
            family: "PingFang SC, Microsoft YaHei, Helvetica Neue, Arial, sans-serif",
            color: "#141413",
            size: isCompactViewport() ? 10 : 12
        },
        hoverlabel: {
            bgcolor: "#fff",
            bordercolor: "#e8e6dc",
            font: { color: "#141413" }
        },
        ...extra,
        xaxis: {
            fixedrange: true,
            zeroline: false,
            gridcolor: "#eeece4",
            ...(extra.xaxis || {})
        },
        yaxis: {
            fixedrange: true,
            zeroline: true,
            zerolinecolor: "#d8d4c8",
            gridcolor: "#eeece4",
            ...(extra.yaxis || {})
        }
    };
}

function renderEmptyChart(id, text) {
    const node = byId(id);
    if (!node) return;
    node.innerHTML = `<div class="empty-chart">${escapeHtml(text)}</div>`;
}

function buildSummaryCards(summary) {
    const cards = [
        { label: "销量", value: formatVolume(summary.totals.volume), note: "上传销量合计" }
    ];
    for (const metric of summary.metricColumns.slice(0, 5)) {
        cards.push({
            label: metric,
            value: formatMetricValue(summary.totals.metrics[metric] || 0),
            note: "上传指标合计"
        });
    }
    return cards;
}

function renderMetrics(summary) {
    const node = byId("profit-structure-metrics-grid");
    if (!node) return;
    const metrics = buildSummaryCards(summary);

    node.innerHTML = metrics.map(({ label, value, note }) => `
        <article class="metric-card">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
            <small>${escapeHtml(note)}</small>
        </article>
    `).join("");
}

function structureValueFromRow(row, metric) {
    if (metric) return row.metrics[metric] || 0;
    return row.volume || 0;
}

function structureWeight(value) {
    return Math.abs(Number.isFinite(value) ? value : 0);
}

function getDimensionValue(row, dimension) {
    return row.dimensionValues[dimension] || "未填写";
}

function uniqueSorted(values) {
    return [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b), "zh-Hans-CN"));
}

function buildColorMap(values) {
    const map = new Map();
    uniqueSorted(values).forEach((value, index) => {
        map.set(value, COLOR_PALETTE[index % COLOR_PALETTE.length]);
    });
    return map;
}

function buildStructureBlueprints(summary, schema = summary.schema) {
    const metricColumns = buildMetricOptions(schema);
    const metric = summary.analysis.primaryMetric || metricColumns[0] || "上传指标";
    const xMetric = summary.analysis.primaryMetric || metric;
    const yMetric = summary.analysis.secondaryMetric || metric;
    const dimensions = summary.selectedDimensions.length
        ? summary.selectedDimensions
        : defaultDimensionPath(schema);
    const pathText = dimensions.length ? dimensions.join(" → ") : "维度路径";

    return [
        {
            id: "dimension-flow",
            kind: "dimension-flow",
            metric,
            title: "维度路径流向",
            description: `${pathText} · 权重：${metric} · 长尾自动合并`
        },
        {
            id: "structure-scatter",
            kind: "structure-scatter",
            metric,
            xMetric,
            yMetric,
            title: "结构定位散点",
            description: `X：${metricUnitLabel(xMetric, schema?.volumeColumn)} · Y：${metricUnitLabel(yMetric, schema?.volumeColumn)} · 大小：${metric}`
        },
        {
            id: "path-composition",
            kind: "path-composition",
            metric,
            title: "主路径结构条",
            description: `${pathText} · 权重：${metric}`
        },
        {
            id: "positive-negative-structure",
            kind: "positive-negative-structure",
            metric,
            title: "正负结构拆解",
            description: `${dimensions[0] || "第一层维度"} · 正负：${metric}`
        }
    ];
}

function setStructureCaptions(summary) {
    const byIdMap = new Map(buildStructureBlueprints(summary, summary.schema).map((chart) => [chart.kind, chart]));
    const bindings = [
        ["profit-structure-flow-caption", "dimension-flow"],
        ["profit-structure-scatter-caption", "structure-scatter"],
        ["profit-structure-path-caption", "path-composition"],
        ["profit-structure-positive-negative-caption", "positive-negative-structure"]
    ];
    bindings.forEach(([id, kind]) => {
        const node = byId(id);
        const chart = byIdMap.get(kind);
        if (node && chart) node.textContent = chart.description;
    });
}

function topValuesForSankey(rows, dimensions, metric, maxValuesPerLevel) {
    return dimensions.map((dimension, level) => {
        const valueMap = new Map();
        for (const row of rows) {
            const value = getDimensionValue(row, dimension);
            valueMap.set(value, (valueMap.get(value) || 0) + structureWeight(structureValueFromRow(row, metric)));
        }
        const limit = maxValuesPerLevel[level] || maxValuesPerLevel[maxValuesPerLevel.length - 1] || 12;
        return new Set([...valueMap.entries()]
            .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "zh-Hans-CN"))
            .slice(0, limit)
            .map(([value]) => value));
    });
}

function sankeyDisplayValue(value, dimension, keepValues) {
    return keepValues.has(value) ? value : `其他${dimension}`;
}

function buildSankeyData(summary, options = {}) {
    const dimensions = summary.selectedDimensions.filter(Boolean);
    const metric = summary.analysis.primaryMetric;
    const compact = options.compact ?? isCompactViewport();
    const maxValuesPerLevel = options.maxValuesPerLevel || (compact ? COMPACT_SANKEY_LEVEL_LIMITS : SANKEY_LEVEL_LIMITS);
    const keepers = topValuesForSankey(summary.rows, dimensions, metric, maxValuesPerLevel);
    const nodeIndex = new Map();
    const nodes = [];
    const linksByKey = new Map();
    const firstLevelValues = summary.rows.map((row) => {
        const rawValue = getDimensionValue(row, dimensions[0]);
        return sankeyDisplayValue(rawValue, dimensions[0], keepers[0] || new Set());
    });
    const colors = buildColorMap(firstLevelValues);
    const collapsedLevels = dimensions.map((dimension, level) => {
        const allValues = new Set(summary.rows.map((row) => getDimensionValue(row, dimension)));
        const kept = keepers[level] || new Set();
        return {
            dimension,
            total: allValues.size,
            kept: Math.min(allValues.size, kept.size),
            collapsed: Math.max(0, allValues.size - kept.size)
        };
    }).filter((item) => item.collapsed > 0);

    function getNode(dimension, value, level) {
        const key = `${level}::${dimension}::${value}`;
        if (!nodeIndex.has(key)) {
            const colorKey = level === 0 ? value : value.replace(/^其他/, "");
            nodeIndex.set(key, nodes.length);
            nodes.push({
                id: key,
                level,
                dimension,
                value,
                label: compact ? compactPointLabel(value) : `${dimension} · ${value}`,
                color: colors.get(colorKey) || COLOR_PALETTE[level % COLOR_PALETTE.length]
            });
        }
        return nodeIndex.get(key);
    }

    for (const row of summary.rows) {
        const raw = structureValueFromRow(row, metric);
        const weight = structureWeight(raw);
        if (!weight) continue;
        for (let index = 0; index < dimensions.length - 1; index += 1) {
            const sourceValue = sankeyDisplayValue(getDimensionValue(row, dimensions[index]), dimensions[index], keepers[index] || new Set());
            const targetValue = sankeyDisplayValue(getDimensionValue(row, dimensions[index + 1]), dimensions[index + 1], keepers[index + 1] || new Set());
            const source = getNode(dimensions[index], sourceValue, index);
            const target = getNode(dimensions[index + 1], targetValue, index + 1);
            const key = `${source}->${target}`;
            linksByKey.set(key, (linksByKey.get(key) || 0) + weight);
        }
    }

    const links = [...linksByKey.entries()].map(([key, value]) => {
        const [source, target] = key.split("->").map(Number);
        return { source, target, value };
    });

    return { dimensions, metric, nodes, links, collapsedLevels };
}

function renderFlowChart(id, summary) {
    const dimensions = summary.selectedDimensions.filter(Boolean);
    if (dimensions.length < 2) {
        renderEmptyChart(id, "请选择至少两个维度");
        return;
    }
    if (!summary.rows.length || typeof window === "undefined" || !window.Plotly) {
        renderEmptyChart(id, "暂无结构流向数据");
        return;
    }

    const compact = isCompactViewport();
    const sankey = buildSankeyData(summary, { compact });

    if (!sankey.links.length) {
        renderEmptyChart(id, "暂无结构流向数据");
        return;
    }

    window.Plotly.react(id, [{
        type: "sankey",
        arrangement: "snap",
        node: {
            pad: compact ? 10 : 14,
            thickness: compact ? 12 : 16,
            line: { color: "#ffffff", width: 1 },
            label: sankey.nodes.map((node) => node.label),
            color: sankey.nodes.map((node) => node.color)
        },
        link: {
            source: sankey.links.map((link) => link.source),
            target: sankey.links.map((link) => link.target),
            value: sankey.links.map((link) => link.value),
            color: "rgba(92, 143, 186, 0.24)",
            hovertemplate: `权重：%{value:,.2f}<extra>${escapeHtml(sankey.metric)}</extra>`
        }
    }], chartLayout({
        margin: { t: 12, r: 14, b: 12, l: 14 },
        font: { size: compact ? 9 : 11, color: "#141413" }
    }), chartConfig());
}

function aggregateFullPathRows(rows, dimensions, metric) {
    const map = new Map();
    for (const row of rows) {
        const pathValues = dimensions.map((dimension) => getDimensionValue(row, dimension));
        const name = pathValues.join(" / ");
        const current = map.get(name) || { name, pathValues, value: 0, rawValue: 0, volume: 0 };
        const raw = structureValueFromRow(row, metric);
        current.value += structureWeight(raw);
        current.rawValue += raw;
        current.volume += row.volume || 0;
        map.set(name, current);
    }
    return [...map.values()];
}

function renderPathComposition(id, summary) {
    const dimensions = summary.selectedDimensions.filter(Boolean);
    if (!summary.rows.length || typeof window === "undefined" || !window.Plotly) {
        renderEmptyChart(id, "暂无主路径数据");
        return;
    }

    const metric = summary.analysis.primaryMetric;
    const compact = isCompactViewport();
    const rows = aggregateFullPathRows(summary.rows, dimensions, metric)
        .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "zh-Hans-CN"))
        .slice(0, compact ? 8 : 12)
        .reverse();

    if (!rows.length) {
        renderEmptyChart(id, "暂无主路径数据");
        return;
    }

    window.Plotly.react(id, [{
        type: "bar",
        orientation: "h",
        x: rows.map((item) => item.value),
        y: rows.map((item) => compact ? compactPointLabel(item.name) : item.name),
        marker: { color: "#5c8fba", opacity: 0.78 },
        customdata: rows.map((item) => [item.name, formatMetricValue(item.rawValue), formatVolume(item.volume)]),
        hovertemplate: "路径：%{customdata[0]}<br>原值：%{customdata[1]}<br>销量：%{customdata[2]}<br>权重：%{x:,.2f}<extra></extra>"
    }], chartLayout({
        margin: { t: 18, r: 18, b: 42, l: compact ? 110 : 190 },
        xaxis: { title: metric },
        yaxis: { automargin: true },
        showlegend: false
    }), chartConfig());
}

function aggregatePositiveNegativeRows(rows, dimension, metric) {
    const map = new Map();
    for (const row of rows) {
        const value = getDimensionValue(row, dimension);
        const current = map.get(value) || { name: value, positive: 0, negative: 0, totalWeight: 0 };
        const raw = structureValueFromRow(row, metric);
        if (raw >= 0) current.positive += raw;
        else current.negative += raw;
        current.totalWeight += structureWeight(raw);
        map.set(value, current);
    }
    return [...map.values()].sort((a, b) => b.totalWeight - a.totalWeight || a.name.localeCompare(b.name, "zh-Hans-CN"));
}

function renderPositiveNegativeStructure(id, summary) {
    if (!summary.rows.length || typeof window === "undefined" || !window.Plotly) {
        renderEmptyChart(id, "暂无正负结构数据");
        return;
    }

    const dimension = summary.selectedDimensions[0] || buildDimensionOptions(summary.schema)[0] || "维度";
    const metric = summary.analysis.primaryMetric;
    const compact = isCompactViewport();
    const rows = aggregatePositiveNegativeRows(summary.rows, dimension, metric).slice(0, compact ? 8 : 12);
    const xValues = rows.map((item) => item.name);

    window.Plotly.react(id, [
        {
            type: "bar",
            name: "正向",
            x: xValues,
            y: rows.map((item) => item.positive),
            marker: { color: "#5c8f74" },
            hovertemplate: `${escapeHtml(dimension)}：%{x}<br>正向：%{y:,.2f}<extra></extra>`
        },
        {
            type: "bar",
            name: "负向",
            x: xValues,
            y: rows.map((item) => item.negative),
            marker: { color: "#c46f5a" },
            hovertemplate: `${escapeHtml(dimension)}：%{x}<br>负向：%{y:,.2f}<extra></extra>`
        }
    ], chartLayout({
        barmode: "relative",
        margin: { t: 18, r: 18, b: compact ? 78 : 54, l: 58 },
        xaxis: { title: dimension, tickangle: compact ? -25 : 0 },
        yaxis: { title: metric, zeroline: true, zerolinecolor: "#8b867a" },
        showlegend: true,
        legend: { orientation: "h", y: -0.24, itemclick: false, itemdoubleclick: false }
    }), chartConfig());
}

function renderStructureScatter(id, summary) {
    if (!summary.items.length || typeof window === "undefined" || !window.Plotly) {
        renderEmptyChart(id, "暂无结构定位数据");
        return;
    }

    const compact = isCompactViewport();
    const colorDimension = summary.selectedDimensions[0] || "";
    const colorKeys = summary.items.map((item) => colorDimension ? item.dimensionValues[colorDimension] || "未填写" : "当前路径");
    const colors = buildColorMap(colorKeys);
    const groups = uniqueSorted(colorKeys);

    const traces = groups.map((group) => {
        const items = summary.items.filter((item) => (colorDimension ? item.dimensionValues[colorDimension] || "未填写" : "当前路径") === group);
        return {
            type: "scatter",
            mode: "markers+text",
            name: group,
            x: items.map((item) => item.primaryUnitValue),
            y: items.map((item) => summary.analysis.secondaryMetric ? item.secondaryUnitValue : item.primaryValue),
            text: compact ? items.map((item) => compactPointLabel(item.name)) : items.map((item) => item.name),
            textposition: "top center",
            textfont: { size: compact ? 9 : 10, color: "#4f4a40" },
            marker: {
                color: colors.get(group),
                size: items.map((item) => Math.max(10, Math.min(44, Math.sqrt(Math.abs(item.primaryValue)) * 8))),
                opacity: 0.78,
                line: { width: 1.2, color: "#fff" }
            },
            customdata: items.map((item) => [
                item.name,
                formatVolume(item.volume),
                formatMetricValue(item.primaryValue),
                formatMetricValue(item.primaryUnitValue),
                summary.analysis.secondaryMetric ? formatMetricValue(item.secondaryUnitValue) : formatMetricValue(item.primaryValue)
            ]),
            hovertemplate: `维度组合：%{customdata[0]}<br>销量：%{customdata[1]}<br>${escapeHtml(summary.analysis.primaryMetric)}：%{customdata[2]}<br>${escapeHtml(summary.analysis.matrix.xTitle)}：%{customdata[3]}<br>${escapeHtml(summary.analysis.matrix.yTitle)}：%{customdata[4]}<extra></extra>`
        };
    });

    window.Plotly.react(id, traces, chartLayout({
        xaxis: { title: summary.analysis.matrix.xTitle, rangemode: "tozero" },
        yaxis: { title: summary.analysis.matrix.yTitle },
        showlegend: !compact,
        legend: { orientation: "h", y: -0.24, itemclick: false, itemdoubleclick: false }
    }), chartConfig());
}

function renderStructureCharts(summary) {
    setStructureCaptions(summary);
    renderFlowChart("profit-structure-flow-chart", summary);
    renderStructureScatter("profit-structure-scatter-chart", summary);
    renderPathComposition("profit-structure-path-chart", summary);
    renderPositiveNegativeStructure("profit-structure-positive-negative-chart", summary);
}

function renderDimensionControls() {
    const dimensions = buildDimensionOptions(state.schema);
    state.selectedDimensions = state.selectedDimensions
        .filter((dimension, index, all) => dimensions.includes(dimension) && all.indexOf(dimension) === index)
        .slice(0, DIMENSION_SELECT_IDS.length);

    DIMENSION_SELECT_IDS.forEach((id, index) => {
        const select = byId(id);
        if (!select) return;
        const selectedBefore = state.selectedDimensions.slice(0, index);
        const current = state.selectedDimensions[index] || "";
        const options = dimensions.filter((dimension) => {
            return dimension === current || !selectedBefore.includes(dimension);
        });
        select.innerHTML = [
            index === 0 ? "" : `<option value="">不添加</option>`,
            ...options.map((dimension) => `<option value="${escapeHtml(dimension)}">${escapeHtml(dimension)}</option>`)
        ].join("");
        if (index === 0 && !current) state.selectedDimensions[index] = dimensions[0] || "";
        if (current && !options.includes(current)) state.selectedDimensions[index] = "";
        select.value = state.selectedDimensions[index] || "";
    });
}

function renderMetricControls() {
    const metricColumns = buildMetricOptions(state.schema);
    const primary = byId("profit-structure-primary-metric");
    const secondary = byId("profit-structure-secondary-metric");
    state.selectedPrimaryMetric = pickPrimaryMetric(state.schema, state.selectedPrimaryMetric);
    state.selectedSecondaryMetric = pickSecondaryMetric(state.schema, state.selectedPrimaryMetric, state.selectedSecondaryMetric);

    if (primary) {
        primary.innerHTML = metricColumns.map((metric) => `<option value="${escapeHtml(metric)}">${escapeHtml(metric)}</option>`).join("");
        primary.value = state.selectedPrimaryMetric;
    }
    if (secondary) {
        secondary.innerHTML = metricColumns
            .filter((metric) => metric !== state.selectedPrimaryMetric)
            .map((metric) => `<option value="${escapeHtml(metric)}">${escapeHtml(metric)}</option>`)
            .join("");
        secondary.value = state.selectedSecondaryMetric;
    }
}

function uniqueValues(dimension) {
    return [...new Set(state.rows.map((row) => row.dimensionValues[dimension] || "未填写"))]
        .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
}

function renderMonthControl() {
    const select = byId("profit-structure-month-select");
    if (!select) return;
    const months = [...new Set(state.rows.map((row) => row.month))].sort();
    select.innerHTML = [
        `<option value="__all__">全部期间</option>`,
        ...months.map((month) => `<option value="${escapeHtml(month)}">${escapeHtml(month)}</option>`)
    ].join("");
    if (!months.includes(state.selectedMonth)) state.selectedMonth = "__all__";
    select.value = state.selectedMonth;
}

function renderFilters() {
    const grid = byId("profit-structure-filter-grid");
    if (!grid || !state.schema) return;
    const dimensions = buildDimensionOptions(state.schema);
    grid.innerHTML = dimensions.map((dimension) => {
        const values = uniqueValues(dimension);
        const value = state.filters[dimension] || "__all__";
        return `
            <label class="field">
                <span>${escapeHtml(dimension)}</span>
                <select class="input" data-profit-filter="${escapeHtml(dimension)}">
                    <option value="__all__">全部</option>
                    ${values.map((option) => `<option value="${escapeHtml(option)}"${option === value ? " selected" : ""}>${escapeHtml(option)}</option>`).join("")}
                </select>
            </label>
        `;
    }).join("");

    grid.querySelectorAll("[data-profit-filter]").forEach((select) => {
        select.addEventListener("change", (event) => {
            const dimension = event.currentTarget.getAttribute("data-profit-filter");
            if (!dimension) return;
            state.filters[dimension] = event.currentTarget.value;
            renderAll();
        });
    });
}

function renderControls() {
    renderDimensionControls();
    renderMetricControls();
    renderMonthControl();
    renderFilters();
}

function currentDimensions() {
    return state.selectedDimensions.filter(Boolean);
}

function renderAll() {
    if (!state.schema) return;
    renderControls();
    const summary = summarizeProfitStructure(state.rows, state.schema, {
        dimensions: currentDimensions(),
        month: state.selectedMonth,
        filters: state.filters,
        primaryMetric: state.selectedPrimaryMetric,
        secondaryMetric: state.selectedSecondaryMetric
    });
    const status = byId("profit-structure-data-status");
    if (status) status.textContent = `${state.currentSourceLabel} · ${summary.rows.length} 行 · ${summary.metricColumns.length} 指标`;
    renderMetrics(summary);
    renderStructureCharts(summary);
}

function loadRows(inputRows, sourceLabel = "示例数据") {
    const { rows, schema } = normalizeUploadedRows(inputRows);
    if (!schema.volumeColumn) {
        showMessage("error", "需要包含“销量”列，销量列用于规模与单位值分析。");
        return;
    }
    if (!schema.dimensions.length) {
        showMessage("error", "需要至少一个维度列。销量列之前的字段会自动识别为维度。");
        return;
    }
    if (!schema.metricColumns.length) {
        showMessage("error", "销量列之后需要至少一个上传指标。");
        return;
    }
    state.rows = rows;
    state.schema = schema;
    state.selectedDimensions = defaultDimensionPath(schema);
    state.selectedPrimaryMetric = pickPrimaryMetric(schema);
    state.selectedSecondaryMetric = pickSecondaryMetric(schema, state.selectedPrimaryMetric);
    state.selectedMonth = "__all__";
    state.filters = {};
    state.currentSourceLabel = sourceLabel;
    renderAll();
    showMessage("success", `${sourceLabel}已载入，可切换维度、主指标或筛选条件继续观察。`);
}

async function handleUpload(file) {
    if (!file) return;
    try {
        const workbook = window.XLSX.read(await file.arrayBuffer(), { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = window.XLSX.utils.sheet_to_json(sheet, { defval: "" });
        loadRows(rows, file.name);
    } catch (error) {
        console.error(error);
        showMessage("error", "文件解析失败，请确认第一行是表头，且包含月份、维度、销量和上传指标。");
    }
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

function templateRows() {
    return createSampleRows().slice(0, 16);
}

function downloadCsv() {
    const rows = templateRows();
    const lines = [
        TEMPLATE_HEADERS.map(escapeCsv).join(","),
        ...rows.map((row) => TEMPLATE_HEADERS.map((header) => escapeCsv(row[header])).join(","))
    ];
    downloadBlob(new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" }), "多维度结构分析模型模板.csv");
}

function downloadXlsx() {
    const workbook = window.XLSX.utils.book_new();
    const sheet = window.XLSX.utils.json_to_sheet(templateRows(), { header: TEMPLATE_HEADERS });
    window.XLSX.utils.book_append_sheet(workbook, sheet, "经营明细");
    const note = window.XLSX.utils.aoa_to_sheet([
        ["字段说明", TEMPLATE_HEADER_NOTE],
        ["当前分析维度", "页面会把销量列之前的所有字段识别为可选维度。"],
        ["上传指标", "销量列之后的所有数值字段都会进入指标列表；页面不会自动补造用户没有上传的指标。"]
    ]);
    window.XLSX.utils.book_append_sheet(workbook, note, "说明");
    window.XLSX.writeFile(workbook, "多维度结构分析模型模板.xlsx");
}

function resetFilters() {
    state.selectedMonth = "__all__";
    state.filters = {};
    renderAll();
}

function bindOnce(target, eventName, handler, key = eventName) {
    if (!target) return;
    const bindKey = `bound${normalizeToken(key) || eventName}`;
    if (target.dataset?.[bindKey] === "true") return;
    target.addEventListener(eventName, handler);
    if (target.dataset) target.dataset[bindKey] = "true";
}

function initSidebar() {
    const sidebar = byId("profit-structure-sidebar");
    const toggle = byId("profit-structure-sidebar-toggle");
    const expand = byId("profit-structure-sidebar-expand");
    const backdrop = byId("profit-structure-sidebar-backdrop");
    const isMobile = () => window.matchMedia("(max-width: 900px)").matches;

    function collapse() {
        sidebar?.classList.add("collapsed");
        if (expand) expand.style.display = "inline-flex";
        backdrop?.classList.remove("visible");
    }

    function expandSidebar() {
        sidebar?.classList.remove("collapsed");
        if (expand) expand.style.display = "none";
        if (backdrop && isMobile()) backdrop.classList.add("visible");
    }

    bindOnce(toggle, "click", collapse);
    bindOnce(expand, "click", expandSidebar);
    bindOnce(backdrop, "click", collapse);
    bindOnce(window, "resize", () => {
        if (!isMobile()) backdrop?.classList.remove("visible");
    }, "sidebarResize");

    if (isMobile()) collapse();
}

function bindControls() {
    bindOnce(byId("profit-structure-file-input"), "change", (event) => {
        const file = event.target.files?.[0];
        void handleUpload(file);
        event.target.value = "";
    });

    const uploadZone = byId("profit-structure-upload-zone");
    bindOnce(uploadZone, "dragover", (event) => {
        event.preventDefault();
        uploadZone.classList.add("drag-over");
    });
    bindOnce(uploadZone, "dragleave", () => uploadZone.classList.remove("drag-over"));
    bindOnce(uploadZone, "drop", (event) => {
        event.preventDefault();
        uploadZone.classList.remove("drag-over");
        void handleUpload(event.dataTransfer?.files?.[0]);
    });

    bindOnce(byId("profit-structure-btn-demo"), "click", () => loadRows(createSampleRows(), "示例数据"));
    bindOnce(byId("profit-structure-btn-csv-template"), "click", downloadCsv);
    bindOnce(byId("profit-structure-btn-xlsx-template"), "click", downloadXlsx);
    bindOnce(byId("profit-structure-btn-reset"), "click", resetFilters);
    DIMENSION_SELECT_IDS.forEach((id, index) => {
        bindOnce(byId(id), "change", (event) => {
            state.selectedDimensions[index] = event.target.value;
            state.selectedDimensions = state.selectedDimensions.map((dimension, dimensionIndex, all) => {
                if (!dimension) return "";
                return all.indexOf(dimension) === dimensionIndex ? dimension : "";
            });
            renderAll();
        }, id);
    });
    bindOnce(byId("profit-structure-primary-metric"), "change", (event) => {
        state.selectedPrimaryMetric = event.target.value;
        if (state.selectedSecondaryMetric === state.selectedPrimaryMetric) {
            state.selectedSecondaryMetric = pickSecondaryMetric(state.schema, state.selectedPrimaryMetric);
        }
        renderAll();
    });
    bindOnce(byId("profit-structure-secondary-metric"), "change", (event) => {
        state.selectedSecondaryMetric = event.target.value;
        renderAll();
    });
    bindOnce(byId("profit-structure-month-select"), "change", (event) => {
        state.selectedMonth = event.target.value;
        renderAll();
    });
}

function initApp() {
    initSidebar();
    bindControls();

    if (state.initialized) {
        renderAll();
        return;
    }
    state.initialized = true;
    loadRows(createSampleRows(), "示例数据");
}

if (typeof window !== "undefined") {
    window.ProfitStructureModel = { initApp };
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        TEMPLATE_HEADERS,
        TEMPLATE_HEADER_NOTE,
        normalizeUploadedRows,
        buildDimensionOptions,
        buildMetricOptions,
        buildSummaryCards,
        buildStructureBlueprints,
        buildSankeyData,
        defaultDimensionPath,
        summarizeProfitStructure,
        createSampleRows,
        initApp
    };
}
