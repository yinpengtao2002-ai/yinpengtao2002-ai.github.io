import {
    OPERATING_DETAIL_HEADERS,
    OPERATING_DETAIL_TEMPLATE_NOTE,
    createOperatingDetailSampleRows,
    getOperatingDetailTemplateRows
} from "../../../lib/finance/templates.js";

const TEMPLATE_HEADERS = OPERATING_DETAIL_HEADERS;
const TEMPLATE_HEADER_NOTE = OPERATING_DETAIL_TEMPLATE_NOTE;

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
    const unitTitle = primaryMetric ? metricUnitLabel(primaryMetric, denominator) : "单位质量指标";
    return {
        primaryMetric,
        secondaryMetric,
        quality: {
            xMetric: primaryMetric,
            yMetric: secondaryMetric,
            xTitle: "销量占比",
            yTitle: `${unitTitle} vs 整体`,
            unitTitle,
            dragTitle: "拖累贡献",
            bubbleTitle: primaryMetric || "诊断指标"
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
    const totalUnitValue = analysis.primaryMetric ? totals.unitMetrics[analysis.primaryMetric] || 0 : 0;
    const baseItems = Array.from(groups.values())
        .map((item) => {
            const unitMetrics = Object.fromEntries(metricColumns.map((metric) => [metric, unitMetricValue(metric, item.metrics[metric], item.volume)]));
            const primaryValue = analysis.primaryMetric ? item.metrics[analysis.primaryMetric] || 0 : 0;
            const secondaryValue = analysis.secondaryMetric ? item.metrics[analysis.secondaryMetric] || 0 : 0;
            const primaryUnitValue = analysis.primaryMetric ? unitMetrics[analysis.primaryMetric] || 0 : 0;
            const qualityGap = primaryUnitValue - totalUnitValue;
            const dragContribution = item.volume * qualityGap;
            return {
                ...item,
                unitMetrics,
                primaryValue,
                secondaryValue,
                primaryUnitValue,
                secondaryUnitValue: analysis.secondaryMetric ? unitMetrics[analysis.secondaryMetric] || 0 : primaryValue,
                volumeShare: ratio(item.volume, totals.volume),
                primaryShare: primaryTotal ? primaryValue / primaryTotal : 0,
                qualityGap,
                dragContribution
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
    return createOperatingDetailSampleRows();
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

function buildDimensionDiagnostics(summary, options = {}) {
    const dimensions = buildDimensionOptions(summary.schema);
    const limit = options.limit || dimensions.length;
    const totalNegativeDrag = Math.abs(summary.items
        .filter((item) => item.dragContribution < 0)
        .reduce((sum, item) => sum + item.dragContribution, 0));

    return dimensions.map((dimension) => {
        const diagnosticSummary = summarizeProfitStructure(summary.rows, summary.schema, {
            dimensions: [dimension],
            primaryMetric: summary.analysis.primaryMetric,
            secondaryMetric: summary.analysis.secondaryMetric
        });
        const unitValues = diagnosticSummary.items.map((item) => item.primaryUnitValue);
        const negativeDrag = Math.abs(diagnosticSummary.items
            .filter((item) => item.dragContribution < 0)
            .reduce((sum, item) => sum + item.dragContribution, 0));
        const rawQualitySpread = unitValues.length ? Math.max(...unitValues) - Math.min(...unitValues) : 0;
        const qualitySpread = rawQualitySpread / Math.sqrt(Math.max(diagnosticSummary.items.length, 1));
        const dragConcentration = totalNegativeDrag ? negativeDrag / totalNegativeDrag : 0;
        const score = qualitySpread * (1 + dragConcentration);
        const worst = diagnosticSummary.items
            .filter((item) => item.dragContribution < 0)
            .sort((a, b) => a.dragContribution - b.dragContribution)[0];

        return {
            dimension,
            members: diagnosticSummary.items.length,
            qualitySpread,
            rawQualitySpread,
            negativeDrag,
            dragConcentration,
            score,
            reason: worst
                ? `质量差异 ${formatMetricValue(qualitySpread)}，主要拖累：${worst.name}`
                : `质量差异 ${formatMetricValue(qualitySpread)}，暂无负向拖累`
        };
    })
        .sort((a, b) => b.score - a.score || b.qualitySpread - a.qualitySpread || a.dimension.localeCompare(b.dimension, "zh-Hans-CN"))
        .slice(0, limit);
}

function qualityQuadrant(item, totalItems) {
    const scaleThreshold = Math.max(0.06, 1 / Math.max(totalItems, 1));
    const scaleLabel = item.volumeShare >= scaleThreshold ? "高规模" : "低规模";
    const qualityLabel = item.qualityGap >= 0 ? "高质量" : "低质量";
    return `${scaleLabel}${qualityLabel}`;
}

function buildQualityMapItems(summary, options = {}) {
    const compact = options.compact ?? isCompactViewport();
    const limit = options.limit || (compact ? 45 : 80);
    const sortedItems = [...summary.items]
        .sort((a, b) => Math.abs(b.dragContribution) - Math.abs(a.dragContribution) || b.volume - a.volume || a.name.localeCompare(b.name, "zh-Hans-CN"))
        .map((item) => ({
            ...item,
            quadrant: qualityQuadrant(item, summary.items.length)
        }));

    return {
        items: sortedItems.slice(0, limit),
        total: sortedItems.length,
        limit,
        hasMore: sortedItems.length > limit
    };
}

function buildDragContributionItems(summary, options = {}) {
    const limit = options.limit || 18;
    const negativeItems = summary.items
        .filter((item) => item.dragContribution < 0)
        .sort((a, b) => a.dragContribution - b.dragContribution || b.volume - a.volume || a.name.localeCompare(b.name, "zh-Hans-CN"));

    return {
        items: negativeItems.slice(0, limit),
        total: negativeItems.length,
        limit,
        hasMore: negativeItems.length > limit
    };
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

function buildStructureBlueprints(summary, schema = summary.schema) {
    const metricColumns = buildMetricOptions(schema);
    const metric = summary.analysis.primaryMetric || metricColumns[0] || "上传指标";

    return [
        {
            id: "dimension-diagnostics",
            kind: "dimension-diagnostics",
            metric,
            title: "维度解释力",
            description: `判断哪个维度最能解释 ${metric} 的单位质量差异和负向拖累`
        },
        {
            id: "quality-map",
            kind: "quality-map",
            metric,
            title: "结构质量地图",
            description: `X：销量占比 · Y：${metricUnitLabel(metric, schema?.volumeColumn)} 相对整体 · 大小：销量`
        },
        {
            id: "drag-contribution",
            kind: "drag-contribution",
            metric,
            title: "拖累贡献",
            description: `按“销量 × 单位质量差”找出最拉低整体 ${metric} 质量的组合`
        }
    ];
}

function setStructureCaptions(summary) {
    const byIdMap = new Map(buildStructureBlueprints(summary, summary.schema).map((chart) => [chart.kind, chart]));
    const bindings = [
        ["profit-structure-dimension-caption", "dimension-diagnostics"],
        ["profit-structure-quality-caption", "quality-map"],
        ["profit-structure-drag-caption", "drag-contribution"]
    ];
    bindings.forEach(([id, kind]) => {
        const node = byId(id);
        const chart = byIdMap.get(kind);
        if (node && chart) node.textContent = chart.description;
    });
}

function renderDiagnosticSummary(summary) {
    const node = byId("profit-structure-diagnostic-summary");
    if (!node) return;
    const diagnostics = buildDimensionDiagnostics(summary, { limit: 3 });
    const dragItems = buildDragContributionItems(summary, { limit: 1 }).items;
    const topDimension = diagnostics[0];
    const topDrag = dragItems[0];
    const totalUnit = summary.analysis.primaryMetric
        ? summary.totals.unitMetrics[summary.analysis.primaryMetric] || 0
        : 0;

    const cards = [
        {
            label: "优先下钻维度",
            value: topDimension?.dimension || "暂无",
            note: topDimension?.reason || "上传更多维度后生成诊断"
        },
        {
            label: "整体单位质量",
            value: formatMetricValue(totalUnit),
            note: summary.analysis.quality.unitTitle
        },
        {
            label: "最大拖累组合",
            value: topDrag?.name || "暂无",
            note: topDrag ? `${summary.analysis.quality.dragTitle} ${formatMetricValue(topDrag.dragContribution)}` : "当前筛选下没有负向拖累"
        }
    ];

    node.innerHTML = cards.map((card) => `
        <article class="diagnostic-card">
            <span>${escapeHtml(card.label)}</span>
            <strong>${escapeHtml(card.value)}</strong>
            <small>${escapeHtml(card.note)}</small>
        </article>
    `).join("");
}

function renderDimensionDiagnostics(id, summary) {
    if (!summary.rows.length || typeof window === "undefined" || !window.Plotly) {
        renderEmptyChart(id, "暂无维度诊断数据");
        return;
    }
    const diagnostics = buildDimensionDiagnostics(summary, { limit: 10 });
    if (!diagnostics.length) {
        renderEmptyChart(id, "暂无维度诊断数据");
        return;
    }
    const compact = isCompactViewport();
    const items = [...diagnostics].reverse();

    window.Plotly.react(id, [{
        type: "bar",
        orientation: "h",
        x: items.map((item) => item.score),
        y: items.map((item) => item.dimension),
        marker: { color: items.map((_, index) => COLOR_PALETTE[index % COLOR_PALETTE.length]) },
        customdata: items.map((item) => [
            formatMetricValue(item.qualitySpread),
            formatMetricValue(item.negativeDrag),
            item.members,
            item.reason
        ]),
        hovertemplate: "维度：%{y}<br>解释力得分：%{x:.2f}<br>质量差异：%{customdata[0]}<br>负向拖累：%{customdata[1]}<br>成员数：%{customdata[2]}<br>%{customdata[3]}<extra></extra>"
    }], chartLayout({
        margin: { t: 16, r: 18, b: 42, l: compact ? 64 : 92 },
        xaxis: { title: "解释力得分", rangemode: "tozero" },
        yaxis: { automargin: true }
    }), chartConfig());
}

function renderQualityMap(id, summary) {
    if (!summary.items.length || typeof window === "undefined" || !window.Plotly) {
        renderEmptyChart(id, "暂无结构质量数据");
        return;
    }
    const compact = isCompactViewport();
    const mapData = buildQualityMapItems(summary, { compact });
    const groups = ["高规模高质量", "高规模低质量", "低规模高质量", "低规模低质量"];
    const colors = new Map([
        ["高规模高质量", "#788c5d"],
        ["高规模低质量", "#b65f55"],
        ["低规模高质量", "#5c8fba"],
        ["低规模低质量", "#8e8374"]
    ]);
    const traces = groups.map((group) => {
        const items = mapData.items.filter((item) => item.quadrant === group);
        return {
            type: "scatter",
            mode: "markers",
            name: group,
            x: items.map((item) => item.volumeShare),
            y: items.map((item) => item.qualityGap),
            marker: {
                color: colors.get(group),
                size: items.map((item) => Math.max(8, Math.min(30, Math.sqrt(Math.max(item.volume, 0)) * 5))),
                opacity: 0.76,
                line: { width: 1.2, color: "#fff" }
            },
            customdata: items.map((item) => [
                item.name,
                formatVolume(item.volume),
                `${formatNumber(item.volumeShare * 100, 1)}%`,
                formatMetricValue(item.primaryUnitValue),
                formatMetricValue(item.qualityGap),
                formatMetricValue(item.dragContribution)
            ]),
            hovertemplate: "组合：%{customdata[0]}<br>销量：%{customdata[1]}<br>销量占比：%{customdata[2]}<br>单位质量：%{customdata[3]}<br>相对整体：%{customdata[4]}<br>拖累贡献：%{customdata[5]}<extra></extra>"
        };
    }).filter((trace) => trace.x.length);

    window.Plotly.react(id, traces, chartLayout({
        xaxis: {
            title: summary.analysis.quality.xTitle,
            tickformat: ".0%",
            rangemode: "tozero"
        },
        yaxis: {
            title: summary.analysis.quality.yTitle,
            zeroline: true,
            zerolinecolor: "#141413"
        },
        showlegend: !compact,
        legend: { orientation: "h", y: -0.24, itemclick: false, itemdoubleclick: false }
    }), chartConfig());
}

function renderDragContribution(id, summary) {
    const node = byId(id);
    if (!node) return;
    const dragData = buildDragContributionItems(summary, { limit: 12 });
    if (!dragData.items.length) {
        node.innerHTML = `<div class="empty-chart">当前筛选下没有负向拖累组合</div>`;
        return;
    }
    const maxDrag = Math.max(...dragData.items.map((item) => Math.abs(item.dragContribution)), 1);
    node.innerHTML = `
        <div class="drag-list">
            ${dragData.items.map((item, index) => `
                <article class="drag-row">
                    <div class="drag-rank">${index + 1}</div>
                    <div class="drag-main">
                        <div class="drag-name">${escapeHtml(item.name)}</div>
                        <div class="drag-bar-track">
                            <span style="width: ${Math.max(4, Math.abs(item.dragContribution) / maxDrag * 100)}%"></span>
                        </div>
                    </div>
                    <div class="drag-values">
                        <strong>${escapeHtml(formatMetricValue(item.dragContribution))}</strong>
                        <small>差 ${escapeHtml(formatMetricValue(item.qualityGap))} · 销量 ${escapeHtml(formatVolume(item.volume))}</small>
                    </div>
                </article>
            `).join("")}
        </div>
    `;
}

function renderStructureCharts(summary) {
    setStructureCaptions(summary);
    renderDiagnosticSummary(summary);
    renderDimensionDiagnostics("profit-structure-dimension-chart", summary);
    renderQualityMap("profit-structure-quality-map", summary);
    renderDragContribution("profit-structure-drag-list", summary);
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
    showMessage("success", `${sourceLabel}已载入，可切换诊断维度、质量指标或筛选条件继续诊断。`);
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
    return getOperatingDetailTemplateRows(24);
}

function downloadCsv() {
    const rows = templateRows();
    const lines = [
        TEMPLATE_HEADERS.map(escapeCsv).join(","),
        ...rows.map((row) => TEMPLATE_HEADERS.map((header) => escapeCsv(row[header])).join(","))
    ];
    downloadBlob(new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" }), "多维利润质量诊断模型模板.csv");
}

function downloadXlsx() {
    const workbook = window.XLSX.utils.book_new();
    const sheet = window.XLSX.utils.json_to_sheet(templateRows(), { header: TEMPLATE_HEADERS });
    window.XLSX.utils.book_append_sheet(workbook, sheet, "经营明细");
    const note = window.XLSX.utils.aoa_to_sheet([
        ["字段说明", TEMPLATE_HEADER_NOTE],
        ["诊断维度", "页面会把销量列之前的所有字段识别为可选维度，并用于判断优先下钻方向。"],
        ["质量指标", "销量列之后的所有数值字段都会进入指标列表；页面会按汇总指标除以销量计算单位质量。"]
    ]);
    window.XLSX.utils.book_append_sheet(workbook, note, "说明");
    window.XLSX.writeFile(workbook, "多维利润质量诊断模型模板.xlsx");
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

function resizePlotlyCharts() {
    if (typeof Plotly === "undefined") return;
    document.querySelectorAll(".profit-structure-tool .js-plotly-plot").forEach((plot) => {
        Plotly.Plots.resize(plot);
    });
}

function schedulePlotResize() {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(resizePlotlyCharts);
    window.setTimeout(resizePlotlyCharts, 320);
}

function initChartResizeObserver() {
    if (typeof window === "undefined") return;
    const root = byId("profit-structure-root");
    if (root?.dataset.plotResizeObserverBound === "true") return;

    const mainContent = document.querySelector(".profit-structure-tool .main-content");
    if (mainContent && typeof ResizeObserver !== "undefined") {
        const observer = new ResizeObserver(schedulePlotResize);
        observer.observe(mainContent);
    }
    window.addEventListener("resize", schedulePlotResize);
    if (root) root.dataset.plotResizeObserverBound = "true";
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
        schedulePlotResize();
    }

    function expandSidebar() {
        sidebar?.classList.remove("collapsed");
        if (expand) expand.style.display = "none";
        if (backdrop && isMobile()) backdrop.classList.add("visible");
        schedulePlotResize();
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
    initChartResizeObserver();
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

const profitStructureModelApi = {
    TEMPLATE_HEADERS,
    TEMPLATE_HEADER_NOTE,
    normalizeUploadedRows,
    buildDimensionOptions,
    buildMetricOptions,
    buildSummaryCards,
    buildStructureBlueprints,
    buildDimensionDiagnostics,
    buildQualityMapItems,
    buildDragContributionItems,
    defaultDimensionPath,
    summarizeProfitStructure,
    createSampleRows,
    initApp
};

export default profitStructureModelApi;
