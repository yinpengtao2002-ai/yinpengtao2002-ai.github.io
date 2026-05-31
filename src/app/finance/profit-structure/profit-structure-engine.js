const TEMPLATE_HEADERS = ["月份", "大区", "国家", "品牌市场", "经营模式", "业务单元", "车型", "燃油品类", "品牌", "销量", "净收入", "成本", "边际"];
const TEMPLATE_HEADER_NOTE = "可直接修改标题行；请保留“月份”和“销量”。销量列之前会按表头自动识别为维度，可新增、删除或改名；销量列之后的数值列会识别为上传指标。模板提供净收入、成本、边际作为示例，也可以替换成任意指标，页面会跟随表头同步分析。";

const MONTH_ALIASES = ["月份", "年月", "期间", "日期", "month", "period", "date"];
const VOLUME_ALIASES = ["销量", "销售量", "发车量", "台数", "数量", "volume", "qty", "quantity", "units"];
const REVENUE_ALIASES = ["净收入", "营业收入", "收入", "净收入总额", "收入总额", "revenue", "netrevenue", "sales", "gmv"];
const PRIMARY_VALUE_ALIASES = ["边际", "边际总额", "贡献边际", "毛利", "毛利额", "利润贡献", "利润", "margin", "grossmargin", "contributionmargin", "profit"];

const CLASSIFICATIONS = {
    "high-value-core": {
        key: "high-value-core",
        label: "高值核心型",
        shortLabel: "核心",
        color: "#5c8fba",
        description: "当前主指标和单位质量都高，是当前结构里的核心对象。"
    },
    "scale-driver": {
        key: "scale-driver",
        label: "规模拉动型",
        shortLabel: "规模",
        color: "#b98524",
        description: "销量占比较高，但单位主指标低于整体，主要靠规模拉动。"
    },
    "high-value-niche": {
        key: "high-value-niche",
        label: "高值小众型",
        shortLabel: "高值",
        color: "#788c5d",
        description: "规模不大，但单位主指标较高，适合继续观察放量空间。"
    },
    "low-value-drag": {
        key: "low-value-drag",
        label: "低值拖累型",
        shortLabel: "拖累",
        color: "#b65f55",
        description: "当前主指标为负或单位质量明显偏弱，需要优先复盘。"
    },
    "watch-list": {
        key: "watch-list",
        label: "观察培育型",
        shortLabel: "观察",
        color: "#aaa79d",
        description: "规模和当前主指标都不突出，先作为观察项管理。"
    }
};

const state = {
    initialized: false,
    rows: [],
    schema: null,
    selectedPrimaryDimension: "",
    selectedSecondaryDimension: "",
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

function ratio(numerator, denominator) {
    return denominator ? numerator / denominator : 0;
}

function isRateLikeMetric(metric) {
    return /率|占比|比例|%|pct|rate|ratio|index|指数|score|评分|满意|nps/i.test(String(metric));
}

function metricUnitLabel(metric) {
    return isRateLikeMetric(metric) ? metric : `单车${metric}`;
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
    return {
        primaryMetric,
        secondaryMetric,
        matrix: {
            xMetric: primaryMetric,
            yMetric: secondaryMetric,
            xTitle: primaryMetric ? metricUnitLabel(primaryMetric) : "主指标",
            yTitle: secondaryMetric ? metricUnitLabel(secondaryMetric) : `${primaryMetric || "主指标"}合计`,
            bubbleTitle: primaryMetric || "上传指标"
        }
    };
}

function classifyProfitStructureItem(item, context = {}) {
    const averageVolumeShare = context.averageVolumeShare || 0;
    const averagePrimaryUnit = context.averagePrimaryUnit || 0;

    if (item.primaryValue < 0 || item.primaryUnitValue < 0) {
        return CLASSIFICATIONS["low-value-drag"];
    }
    if (item.primaryShare >= averageVolumeShare && item.primaryUnitValue >= averagePrimaryUnit && item.volumeShare >= averageVolumeShare * 0.6) {
        return CLASSIFICATIONS["high-value-core"];
    }
    if (item.volumeShare < averageVolumeShare && item.primaryUnitValue >= averagePrimaryUnit) {
        return CLASSIFICATIONS["high-value-niche"];
    }
    if (item.volumeShare >= averageVolumeShare && item.primaryUnitValue < averagePrimaryUnit) {
        return CLASSIFICATIONS["scale-driver"];
    }
    return CLASSIFICATIONS["watch-list"];
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
    const context = {
        averageVolumeShare: baseItems.length ? 1 / baseItems.length : 0,
        averagePrimaryUnit: analysis.primaryMetric ? totals.unitMetrics[analysis.primaryMetric] || 0 : 0
    };
    const items = baseItems.map((item) => ({
        ...item,
        classification: classifyProfitStructureItem(item, context)
    }));
    const layerSummary = summarizeLayers(items, metricColumns);

    return {
        schema,
        metricColumns,
        selectedDimensions,
        rows: activeRows,
        totals,
        items,
        layerSummary,
        context,
        analysis
    };
}

function summarizeLayers(items, metricColumns = []) {
    const layers = Object.values(CLASSIFICATIONS).map((classification) => ({
        classification,
        count: 0,
        volume: 0,
        metrics: emptyMetrics(metricColumns)
    }));
    const byKey = new Map(layers.map((layer) => [layer.classification.key, layer]));
    for (const item of items) {
        const layer = byKey.get(item.classification.key);
        if (!layer) continue;
        layer.count += 1;
        layer.volume += item.volume;
        for (const metric of metricColumns) {
            layer.metrics[metric] += item.metrics[metric] || 0;
        }
    }
    return layers.filter((layer) => layer.count > 0);
}

function createSampleRows() {
    const rows = [];
    const records = [
        ["欧洲", "德国", "主品牌", "经销", "燃油乘用车", "SUV-A", "燃油", "品牌A", 0.82, 10.1, -7.2],
        ["欧洲", "法国", "主品牌", "经销", "燃油乘用车", "SUV-A", "燃油", "品牌A", 0.36, 4.8, -3.0],
        ["欧洲", "英国", "新能源品牌", "直营", "纯电业务", "EV-B", "纯电", "品牌B", 0.22, 3.5, -2.1],
        ["拉美", "墨西哥", "主品牌", "经销", "燃油乘用车", "Sedan-C", "燃油", "品牌A", 1.18, 10.4, -9.8],
        ["拉美", "巴西", "主品牌", "经销", "燃油乘用车", "Sedan-C", "燃油", "品牌A", 0.74, 6.2, -6.8],
        ["中东", "沙特", "高端品牌", "大客户", "SUV 业务", "SUV-D", "燃油", "品牌C", 0.18, 3.2, -1.7],
        ["亚太", "澳大利亚", "新能源品牌", "直营", "插混业务", "PHEV-E", "插混", "品牌B", 0.28, 3.9, -2.5],
        ["亚太", "泰国", "主品牌", "经销", "燃油乘用车", "Pickup-F", "燃油", "品牌A", 0.44, 3.6, -3.45]
    ];
    const months = ["2026-01", "2026-02", "2026-03"];

    months.forEach((month, monthIndex) => {
        records.forEach((record, index) => {
            const [region, country, brandMarket, mode, businessUnit, model, fuel, brand, baseVolume, baseRevenue, baseCost] = record;
            const seasonal = 1 + monthIndex * 0.035 + (index % 3) * 0.018;
            const volume = round(baseVolume * seasonal, 3);
            const revenue = round(baseRevenue * seasonal * (index === 2 ? 1.04 : 1), 3);
            const cost = round(baseCost * seasonal * (index === 4 ? 1.06 : 1), 3);
            rows.push({
                "月份": month,
                "大区": region,
                "国家": country,
                "品牌市场": brandMarket,
                "经营模式": mode,
                "业务单元": businessUnit,
                "车型": model,
                "燃油品类": fuel,
                "品牌": brand,
                "销量": volume,
                "净收入": revenue,
                "成本": cost,
                "边际": round(revenue + cost, 3)
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

function formatPercent(value, digits = 1) {
    return `${formatNumber(value * 100, digits)}%`;
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

function renderMatrix(summary) {
    const caption = byId("profit-structure-matrix-caption");
    if (caption) {
        caption.textContent = `当前口径：${summary.selectedDimensions.join(" + ")}。横轴为${summary.analysis.matrix.xTitle}，纵轴为${summary.analysis.matrix.yTitle}，气泡大小代表「${summary.analysis.matrix.bubbleTitle}」合计值。`;
    }
    if (!summary.items.length || typeof window === "undefined" || !window.Plotly) {
        renderEmptyChart("profit-structure-matrix-chart", "暂无结构矩阵数据");
        return;
    }

    const compact = isCompactViewport();
    const traces = Object.values(CLASSIFICATIONS).map((classification) => {
        const items = summary.items.filter((item) => item.classification.key === classification.key);
        return {
            type: "scatter",
            mode: "markers+text",
            name: classification.label,
            x: items.map((item) => item.primaryUnitValue),
            y: items.map((item) => summary.analysis.secondaryMetric ? item.secondaryUnitValue : item.primaryValue),
            text: compact ? items.map((item) => compactPointLabel(item.name)) : items.map((item) => item.name),
            textposition: "top center",
            textfont: { size: compact ? 9 : 10, color: "#4f4a40" },
            marker: {
                color: classification.color,
                size: items.map((item) => Math.max(12, Math.min(46, Math.sqrt(Math.abs(item.primaryValue)) * 8))),
                opacity: 0.78,
                line: { width: 1.2, color: "#fff" }
            },
            customdata: items.map((item) => [
                item.name,
                classification.label,
                formatVolume(item.volume),
                formatMetricValue(item.primaryValue),
                formatMetricValue(item.primaryUnitValue),
                summary.analysis.secondaryMetric ? formatMetricValue(item.secondaryUnitValue) : formatMetricValue(item.primaryValue)
            ]),
            hovertemplate: `对象：%{customdata[0]}<br>分层：%{customdata[1]}<br>销量：%{customdata[2]}<br>${escapeHtml(summary.analysis.primaryMetric)}合计：%{customdata[3]}<br>${escapeHtml(summary.analysis.matrix.xTitle)}：%{customdata[4]}<br>${escapeHtml(summary.analysis.matrix.yTitle)}：%{customdata[5]}<extra></extra>`
        };
    }).filter((trace) => trace.x.length);

    window.Plotly.react("profit-structure-matrix-chart", traces, chartLayout({
        xaxis: { title: summary.analysis.matrix.xTitle, rangemode: "tozero" },
        yaxis: { title: summary.analysis.matrix.yTitle },
        showlegend: !compact,
        legend: { orientation: "h", y: -0.22, itemclick: false, itemdoubleclick: false }
    }), chartConfig());
}

function buildChartBlueprints(summary, schema = summary.schema) {
    const metricColumns = buildMetricOptions(schema);
    const primary = summary.analysis.primaryMetric || metricColumns[0] || "上传指标";
    const blueprints = [
        {
            id: "layer-primary",
            kind: "metric-layer-summary",
            metric: primary,
            title: `${primary}分层贡献`,
            description: `按照上方矩阵分层，把每个分层内所有对象的上传指标「${primary}」求和；柱子代表该分层对当前主指标的合计影响。`
        },
        {
            id: "volume-share",
            kind: "volume-share-pie",
            title: "销量结构占比",
            description: "展示当前分析对象的销量占比，用来判断规模集中在哪些维度对象上。"
        },
        {
            id: `total-${normalizeToken(primary)}`,
            kind: "metric-total-ranking",
            metric: primary,
            title: `${primary}合计排行`,
            description: `按当前分析对象汇总上传指标「${primary}」，看谁对该指标的合计值影响最大。`
        },
        {
            id: `unit-${normalizeToken(primary)}`,
            kind: "metric-unit-ranking",
            metric: primary,
            title: `${metricUnitLabel(primary)}排行`,
            description: `用上传指标「${primary}」除以销量形成单位值，观察规模之外的单项质量差异；如果该指标本身是比例或评分，则直接使用原值。`
        },
        {
            id: `trend-${normalizeToken(primary)}`,
            kind: "metric-monthly-trend",
            metric: primary,
            title: `${primary}分月趋势`,
            description: `按月份汇总上传指标「${primary}」，判断当前筛选下是否存在趋势拐点。`
        },
        {
            id: `heatmap-${normalizeToken(primary)}`,
            kind: "metric-month-heatmap",
            metric: primary,
            title: `${primary}对象 x 月份热力图`,
            description: `把当前对象放在纵轴、月份放在横轴，颜色代表上传指标「${primary}」合计值，用来寻找异常月份或异常对象。`
        }
    ];

    return blueprints;
}

function topItems(items, metric, limit = 12) {
    return [...items]
        .sort((a, b) => Math.abs(b.metrics[metric] || 0) - Math.abs(a.metrics[metric] || 0))
        .slice(0, limit)
        .reverse();
}

function renderChartGallery(summary) {
    const node = byId("profit-structure-chart-gallery");
    const caption = byId("profit-structure-chart-gallery-caption");
    if (!node) return;
    const blueprints = buildChartBlueprints(summary, summary.schema);
    if (caption) caption.textContent = `已生成 ${blueprints.length} 张候选图，均跟随当前维度、筛选条件和上传指标同步刷新。`;
    node.innerHTML = blueprints.map((chart, index) => `
        <article class="chart-card">
            <div class="chart-card-header">
                <span>${String(index + 1).padStart(2, "0")}</span>
                <div>
                    <h3>${escapeHtml(chart.title)}</h3>
                    <p>${escapeHtml(chart.description)}</p>
                </div>
            </div>
            <div id="profit-structure-chart-${index}" class="chart chart-compact"></div>
        </article>
    `).join("");
    blueprints.forEach((chart, index) => renderBlueprintChart(`profit-structure-chart-${index}`, chart, summary));
}

function renderBlueprintChart(id, chart, summary) {
    if (typeof window === "undefined" || !window.Plotly) {
        renderEmptyChart(id, "暂无图表运行环境");
        return;
    }
    const metric = chart.metric;
    const items = metric ? topItems(summary.items, metric) : summary.items.slice(0, 10).reverse();
    const compact = isCompactViewport();

    if (chart.kind === "metric-layer-summary") {
        const layers = summary.layerSummary;
        window.Plotly.react(id, [{
            type: "bar",
            x: layers.map((layer) => layer.classification.label),
            y: layers.map((layer) => layer.metrics[metric] || 0),
            marker: { color: layers.map((layer) => layer.classification.color) },
            customdata: layers.map((layer) => [`${layer.count} 项`, formatVolume(layer.volume)]),
            hovertemplate: `分层：%{x}<br>对象数：%{customdata[0]}<br>销量：%{customdata[1]}<br>${escapeHtml(metric)}：%{y:,.2f}<extra></extra>`
        }], chartLayout({
            margin: { t: 18, r: 16, b: compact ? 72 : 58, l: 58 },
            xaxis: { tickangle: compact ? -20 : 0 },
            yaxis: { title: metric },
            showlegend: false
        }), chartConfig());
        return;
    }

    if (chart.kind === "volume-share-pie" || chart.kind === "metric-share-pie") {
        const values = chart.kind === "volume-share-pie"
            ? summary.items.slice(0, 10).map((item) => Math.abs(item.volume))
            : summary.items.slice(0, 10).map((item) => Math.abs(item.metrics[metric] || 0));
        window.Plotly.react(id, [{
            type: "pie",
            labels: summary.items.slice(0, 10).map((item) => item.name),
            values,
            hole: 0.48,
            marker: { colors: summary.items.slice(0, 10).map((item) => item.classification.color) },
            textinfo: compact ? "none" : "label+percent",
            hovertemplate: "%{label}<br>占比：%{percent}<br>值：%{value:,.2f}<extra></extra>"
        }], chartLayout({
            margin: { t: 14, r: 14, b: 14, l: 14 },
            showlegend: compact
        }), chartConfig());
        return;
    }

    if (chart.kind === "volume-ranking") {
        const ranked = [...summary.items].sort((a, b) => b.volume - a.volume).slice(0, 12).reverse();
        window.Plotly.react(id, [{
            type: "bar",
            orientation: "h",
            y: ranked.map((item) => item.name),
            x: ranked.map((item) => item.volume),
            marker: { color: ranked.map((item) => item.classification.color) },
            hovertemplate: "对象：%{y}<br>销量：%{x:,.2f}<extra></extra>"
        }], chartLayout({
            margin: { t: 18, r: 18, b: 42, l: compact ? 78 : 116 },
            xaxis: { title: "销量" },
            yaxis: { automargin: true }
        }), chartConfig());
        return;
    }

    if (chart.kind === "metric-total-ranking" || chart.kind === "metric-unit-ranking" || chart.kind === "metric-unit-delta") {
        const ranked = chart.kind === "metric-total-ranking"
            ? items
            : [...summary.items].sort((a, b) => Math.abs(b.unitMetrics[metric] || 0) - Math.abs(a.unitMetrics[metric] || 0)).slice(0, 12).reverse();
        const values = chart.kind === "metric-total-ranking"
            ? ranked.map((item) => item.metrics[metric] || 0)
            : chart.kind === "metric-unit-delta"
                ? ranked.map((item) => (item.unitMetrics[metric] || 0) - (summary.totals.unitMetrics[metric] || 0))
                : ranked.map((item) => item.unitMetrics[metric] || 0);
        window.Plotly.react(id, [{
            type: "bar",
            orientation: "h",
            y: ranked.map((item) => item.name),
            x: values,
            marker: { color: values.map((value) => value < 0 ? CLASSIFICATIONS["low-value-drag"].color : "#5c8fba") },
            hovertemplate: "对象：%{y}<br>值：%{x:,.2f}<extra></extra>"
        }], chartLayout({
            margin: { t: 18, r: 18, b: 42, l: compact ? 78 : 116 },
            xaxis: { title: chart.kind === "metric-total-ranking" ? metric : metricUnitLabel(metric) },
            yaxis: { automargin: true }
        }), chartConfig());
        return;
    }

    if (chart.kind === "metric-volume-scatter" || chart.kind === "matrix-axis-check") {
        const yValues = chart.kind === "metric-volume-scatter"
            ? summary.items.map((item) => item.metrics[metric] || 0)
            : summary.items.map((item) => summary.analysis.secondaryMetric ? item.secondaryUnitValue : item.primaryValue);
        const xValues = chart.kind === "metric-volume-scatter"
            ? summary.items.map((item) => item.volume)
            : summary.items.map((item) => item.primaryUnitValue);
        window.Plotly.react(id, [{
            type: "scatter",
            mode: "markers+text",
            x: xValues,
            y: yValues,
            text: summary.items.map((item) => compact ? compactPointLabel(item.name) : item.name),
            textposition: "top center",
            marker: {
                color: summary.items.map((item) => item.classification.color),
                size: summary.items.map((item) => Math.max(10, Math.min(32, Math.sqrt(Math.abs(chart.kind === "metric-volume-scatter" ? item.metrics[metric] || 0 : item.primaryValue)) * 6))),
                opacity: 0.78,
                line: { color: "#fff", width: 1 }
            },
            hovertemplate: "对象：%{text}<br>x：%{x:,.2f}<br>y：%{y:,.2f}<extra></extra>"
        }], chartLayout({
            margin: { t: 18, r: 18, b: 48, l: 58 },
            xaxis: { title: chart.kind === "metric-volume-scatter" ? "销量" : summary.analysis.matrix.xTitle },
            yaxis: { title: chart.kind === "metric-volume-scatter" ? metric : summary.analysis.matrix.yTitle },
            showlegend: false
        }), chartConfig());
        return;
    }

    if (chart.kind === "metric-monthly-trend") {
        const byMonth = new Map();
        for (const row of summary.rows) {
            byMonth.set(row.month, (byMonth.get(row.month) || 0) + (row.metrics[metric] || 0));
        }
        const months = [...byMonth.keys()].sort();
        window.Plotly.react(id, [{
            type: "scatter",
            mode: "lines+markers",
            x: months,
            y: months.map((month) => byMonth.get(month) || 0),
            line: { color: "#5c8fba", width: 2.5 },
            marker: { size: 7 },
            hovertemplate: "月份：%{x}<br>值：%{y:,.2f}<extra></extra>"
        }], chartLayout({
            margin: { t: 18, r: 18, b: 48, l: 58 },
            xaxis: { title: "月份" },
            yaxis: { title: metric }
        }), chartConfig());
        return;
    }

    if (chart.kind === "metric-month-heatmap") {
        const groups = summary.items.slice(0, 8).map((item) => item.name);
        const months = [...new Set(summary.rows.map((row) => row.month))].sort();
        const values = groups.map((group) => months.map((month) => {
            return summary.rows
                .filter((row) => row.month === month && makeGroupName(row, summary.selectedDimensions) === group)
                .reduce((sum, row) => sum + (row.metrics[metric] || 0), 0);
        }));
        window.Plotly.react(id, [{
            type: "heatmap",
            x: months,
            y: groups,
            z: values,
            colorscale: [[0, "#f2dfd6"], [0.5, "#f7f4ec"], [1, "#5c8fba"]],
            hovertemplate: "对象：%{y}<br>月份：%{x}<br>值：%{z:,.2f}<extra></extra>"
        }], chartLayout({
            margin: { t: 18, r: 18, b: 48, l: compact ? 78 : 116 },
            xaxis: { title: "月份" },
            yaxis: { automargin: true }
        }), chartConfig());
    }
}

function renderInsights(summary) {
    const node = byId("profit-structure-insight-list");
    if (!node) return;
    const dragItems = summary.items.filter((item) => item.classification.key === "low-value-drag");
    const scaleItems = summary.items.filter((item) => item.classification.key === "scale-driver");
    const coreItems = summary.items.filter((item) => item.classification.key === "high-value-core");
    const primary = summary.analysis.primaryMetric || "主指标";
    const insights = [];

    if (dragItems.length) {
        const value = dragItems.reduce((sum, item) => sum + item.primaryValue, 0);
        insights.push(["优先复盘低值项", `${dragItems.slice(0, 3).map((item) => item.name).join("、")} 等 ${dragItems.length} 项合计「${primary}」为 ${formatMetricValue(value)}。`]);
    }
    if (scaleItems.length) {
        const volumeShare = scaleItems.reduce((sum, item) => sum + item.volumeShare, 0);
        insights.push(["规模不等于质量", `${scaleItems.slice(0, 3).map((item) => item.name).join("、")} 销量占比合计 ${formatPercent(volumeShare)}，但单位「${primary}」低于整体。`]);
    }
    if (coreItems.length) {
        const primaryShare = coreItems.reduce((sum, item) => sum + item.primaryShare, 0);
        insights.push(["当前核心对象", `${coreItems.slice(0, 3).map((item) => item.name).join("、")} 是当前口径下的主要结构来源，「${primary}」占比 ${formatPercent(primaryShare)}。`]);
    }
    if (!insights.length) {
        insights.push(["暂无明显结构信号", "当前筛选下各经营对象差异不大，可以切换维度、主指标或筛选条件继续观察。"]);
    }

    node.innerHTML = insights.map(([title, body]) => `
        <article class="insight-card">
            <strong>${escapeHtml(title)}</strong>
            <p>${escapeHtml(body)}</p>
        </article>
    `).join("");
}

function renderTable(summary) {
    const wrap = byId("profit-structure-table-wrap");
    const caption = byId("profit-structure-table-caption");
    if (!wrap) return;
    const topItems = summary.items.slice(0, 80);
    if (caption) caption.textContent = `按当前分析维度排序，展示销量、分层、所有上传指标及可计算的单位值。`;
    if (!topItems.length) {
        wrap.innerHTML = `<div class="empty-chart">暂无明细数据</div>`;
        return;
    }
    const metricColumns = summary.metricColumns;
    const unitColumns = metricColumns.filter((metric) => !isRateLikeMetric(metric));

    wrap.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>经营对象</th>
                    <th>分层</th>
                    <th>销量</th>
                    <th>销量占比</th>
                    ${metricColumns.map((metric) => `<th>${escapeHtml(metric)}</th>`).join("")}
                    ${unitColumns.map((metric) => `<th>${escapeHtml(metricUnitLabel(metric))}</th>`).join("")}
                </tr>
            </thead>
            <tbody>
                ${topItems.map((item) => `
                    <tr>
                        <td><strong>${escapeHtml(item.name)}</strong></td>
                        <td><span class="layer-badge" style="--layer-color: ${item.classification.color}">${escapeHtml(item.classification.label)}</span></td>
                        <td>${formatVolume(item.volume)}</td>
                        <td>${formatPercent(item.volumeShare)}</td>
                        ${metricColumns.map((metric) => `<td class="${(item.metrics[metric] || 0) < 0 ? "negative" : "positive"}">${formatMetricValue(item.metrics[metric] || 0)}</td>`).join("")}
                        ${unitColumns.map((metric) => `<td class="${(item.unitMetrics[metric] || 0) < 0 ? "negative" : "positive"}">${formatMetricValue(item.unitMetrics[metric] || 0)}</td>`).join("")}
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function renderDimensionControls() {
    const dimensions = buildDimensionOptions(state.schema);
    const primary = byId("profit-structure-primary-dimension");
    const secondary = byId("profit-structure-secondary-dimension");
    if (primary) {
        primary.innerHTML = dimensions.map((dimension) => `<option value="${escapeHtml(dimension)}">${escapeHtml(dimension)}</option>`).join("");
        if (!dimensions.includes(state.selectedPrimaryDimension)) state.selectedPrimaryDimension = dimensions[0] || "";
        primary.value = state.selectedPrimaryDimension;
    }
    if (secondary) {
        secondary.innerHTML = [
            `<option value="">不组合</option>`,
            ...dimensions
                .filter((dimension) => dimension !== state.selectedPrimaryDimension)
                .map((dimension) => `<option value="${escapeHtml(dimension)}">${escapeHtml(dimension)}</option>`)
        ].join("");
        if (state.selectedSecondaryDimension === state.selectedPrimaryDimension) state.selectedSecondaryDimension = "";
        secondary.value = state.selectedSecondaryDimension;
    }
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
    return [state.selectedPrimaryDimension, state.selectedSecondaryDimension].filter(Boolean);
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
    renderMatrix(summary);
    renderInsights(summary);
    renderChartGallery(summary);
    renderTable(summary);
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
    state.selectedPrimaryDimension = schema.dimensions[0] || "";
    state.selectedSecondaryDimension = "";
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
    state.selectedSecondaryDimension = "";
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
    bindOnce(byId("profit-structure-primary-dimension"), "change", (event) => {
        state.selectedPrimaryDimension = event.target.value;
        if (state.selectedSecondaryDimension === state.selectedPrimaryDimension) state.selectedSecondaryDimension = "";
        renderAll();
    });
    bindOnce(byId("profit-structure-secondary-dimension"), "change", (event) => {
        state.selectedSecondaryDimension = event.target.value;
        renderAll();
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
        CLASSIFICATIONS,
        normalizeUploadedRows,
        buildDimensionOptions,
        buildMetricOptions,
        buildSummaryCards,
        buildChartBlueprints,
        classifyProfitStructureItem,
        summarizeProfitStructure,
        summarizeLayers,
        createSampleRows,
        initApp
    };
}
