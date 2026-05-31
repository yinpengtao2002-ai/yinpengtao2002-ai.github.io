const TEMPLATE_HEADERS = ["月份", "大区", "国家", "品牌市场", "经营模式", "业务单元", "车型", "燃油品类", "品牌", "销量", "净收入", "成本", "边际"];
const TEMPLATE_HEADER_NOTE = "可直接修改标题行；请保留“月份”和“销量”。销量列之前会按表头自动识别为维度，可新增、删除或改名；销量列之后的数值列会识别为财务指标，例如净收入、成本、边际。成本等扣减项建议按负数填写。";

const MONTH_ALIASES = ["月份", "年月", "期间", "日期", "month", "period", "date"];
const VOLUME_ALIASES = ["销量", "销售量", "发车量", "台数", "数量", "volume", "qty", "quantity", "units"];
const REVENUE_ALIASES = ["净收入", "营业收入", "收入", "净收入总额", "收入总额", "revenue", "netrevenue", "sales"];
const COST_ALIASES = ["成本", "材料成本", "变动成本", "总成本", "cost", "cogs", "variablecost"];
const MARGIN_ALIASES = ["边际", "边际总额", "贡献边际", "毛利", "毛利额", "利润贡献", "margin", "grossmargin", "contributionmargin"];

const CLASSIFICATIONS = {
    "core-profit": {
        key: "core-profit",
        label: "核心利润型",
        shortLabel: "核心",
        color: "#5c8fba",
        description: "边际贡献和单车质量都较好，是当前结构里的利润核心。"
    },
    "scale-driver": {
        key: "scale-driver",
        label: "规模拉动型",
        shortLabel: "规模",
        color: "#b98524",
        description: "销量占比较高，但单车边际低于整体水平，靠规模贡献。"
    },
    "high-value-niche": {
        key: "high-value-niche",
        label: "高价值小众型",
        shortLabel: "高值",
        color: "#788c5d",
        description: "规模不大，但单车边际较高，适合继续观察放量空间。"
    },
    "profit-drag": {
        key: "profit-drag",
        label: "利润拖累型",
        shortLabel: "拖累",
        color: "#b65f55",
        description: "边际为负或单车质量明显偏弱，需要优先复盘。"
    },
    "watch-list": {
        key: "watch-list",
        label: "观察培育型",
        shortLabel: "观察",
        color: "#aaa79d",
        description: "规模和利润贡献都不突出，先作为观察项管理。"
    }
};

const state = {
    initialized: false,
    rows: [],
    schema: null,
    selectedPrimaryDimension: "",
    selectedSecondaryDimension: "",
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
    const revenueColumn = findHeader(sourceHeaders, REVENUE_ALIASES);
    const costColumn = findHeader(sourceHeaders, COST_ALIASES);
    const marginColumn = findHeader(sourceHeaders, MARGIN_ALIASES);
    const volumeIndex = volumeColumn ? sourceHeaders.indexOf(volumeColumn) : -1;
    const dimensions = sourceHeaders
        .slice(0, volumeIndex >= 0 ? volumeIndex : sourceHeaders.length)
        .filter((header) => header && header !== monthColumn);
    const financialColumns = volumeIndex >= 0
        ? sourceHeaders.slice(volumeIndex + 1).filter((header) => header && header !== monthColumn)
        : [];
    const schema = {
        sourceHeaders,
        monthColumn,
        volumeColumn,
        revenueColumn,
        costColumn,
        marginColumn,
        dimensions,
        financialColumns
    };

    const rows = sourceRows.map((row) => {
        const dimensionValues = {};
        for (const dimension of dimensions) {
            const value = row[dimension];
            dimensionValues[dimension] = isBlank(value) ? "未填写" : String(value).trim();
        }

        const metrics = {};
        for (const column of financialColumns) {
            metrics[column] = toNumber(row[column]);
        }

        const revenue = revenueColumn ? toNumber(row[revenueColumn]) : 0;
        const cost = costColumn ? toNumber(row[costColumn]) : 0;
        const margin = marginColumn ? toNumber(row[marginColumn]) : revenue + cost;
        const volume = volumeColumn ? toNumber(row[volumeColumn]) : 0;

        return {
            month: monthColumn ? formatMonth(row[monthColumn]) : "未填写",
            volume,
            revenue,
            cost,
            margin,
            metrics,
            dimensionValues,
            raw: row
        };
    }).filter((row) => {
        const hasDimension = Object.values(row.dimensionValues).some((value) => !isBlank(value));
        return hasDimension || row.volume || row.revenue || row.cost || row.margin;
    });

    return { rows, schema };
}

function buildDimensionOptions(schema) {
    return Array.isArray(schema?.dimensions) ? [...schema.dimensions] : [];
}

function ratio(numerator, denominator) {
    return denominator ? numerator / denominator : 0;
}

function classifyProfitStructureItem(item, context = {}) {
    const averageVolumeShare = context.averageVolumeShare || 0;
    const averageUnitMargin = context.averageUnitMargin || 0;

    if (item.margin < 0 || item.unitMargin < 0 || item.marginRate < 0) {
        return CLASSIFICATIONS["profit-drag"];
    }
    if (item.marginShare >= averageVolumeShare && item.unitMargin >= averageUnitMargin && item.volumeShare >= averageVolumeShare * 0.6) {
        return CLASSIFICATIONS["core-profit"];
    }
    if (item.volumeShare < averageVolumeShare && item.unitMargin >= averageUnitMargin) {
        return CLASSIFICATIONS["high-value-niche"];
    }
    if (item.volumeShare >= averageVolumeShare && item.unitMargin < averageUnitMargin) {
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

function summarizeProfitStructure(rows, schema, options = {}) {
    const dimensions = (options.dimensions || []).filter(Boolean);
    const selectedDimensions = dimensions.length ? dimensions : buildDimensionOptions(schema).slice(0, 1);
    const month = options.month || "__all__";
    const filters = options.filters || {};
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
                revenue: 0,
                cost: 0,
                margin: 0
            });
        }
        const group = groups.get(name);
        group.volume += row.volume;
        group.revenue += row.revenue;
        group.cost += row.cost;
        group.margin += row.margin;
    }

    const totals = activeRows.reduce((acc, row) => {
        acc.volume += row.volume;
        acc.revenue += row.revenue;
        acc.cost += row.cost;
        acc.margin += row.margin;
        return acc;
    }, { volume: 0, revenue: 0, cost: 0, margin: 0 });
    totals.marginRate = ratio(totals.margin, totals.revenue);
    totals.unitRevenue = ratio(totals.revenue, totals.volume);
    totals.unitCost = ratio(totals.cost, totals.volume);
    totals.unitMargin = ratio(totals.margin, totals.volume);

    const baseItems = Array.from(groups.values())
        .map((item) => ({
            ...item,
            marginRate: ratio(item.margin, item.revenue),
            unitRevenue: ratio(item.revenue, item.volume),
            unitCost: ratio(item.cost, item.volume),
            unitMargin: ratio(item.margin, item.volume),
            volumeShare: ratio(item.volume, totals.volume),
            revenueShare: ratio(item.revenue, totals.revenue),
            marginShare: totals.margin ? item.margin / totals.margin : 0
        }))
        .sort((a, b) => b.margin - a.margin || b.volume - a.volume || a.name.localeCompare(b.name, "zh-Hans-CN"));
    const context = {
        averageVolumeShare: baseItems.length ? 1 / baseItems.length : 0,
        averageUnitMargin: totals.unitMargin
    };
    const items = baseItems.map((item) => ({
        ...item,
        classification: classifyProfitStructureItem(item, context)
    }));
    const layerSummary = summarizeLayers(items);

    return {
        selectedDimensions,
        rows: activeRows,
        totals,
        items,
        layerSummary,
        context
    };
}

function summarizeLayers(items) {
    const layers = Object.values(CLASSIFICATIONS).map((classification) => ({
        classification,
        count: 0,
        volume: 0,
        revenue: 0,
        margin: 0
    }));
    const byKey = new Map(layers.map((layer) => [layer.classification.key, layer]));
    for (const item of items) {
        const layer = byKey.get(item.classification.key);
        if (!layer) continue;
        layer.count += 1;
        layer.volume += item.volume;
        layer.revenue += item.revenue;
        layer.margin += item.margin;
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

function formatAmount(value) {
    return `${formatNumber(value, 2)} 亿元`;
}

function formatVolume(value) {
    return `${formatNumber(value, 2)} 万辆`;
}

function formatUnitAmount(value) {
    return `${formatNumber(value, 2)} 万元/辆`;
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

function renderMetrics(summary) {
    const node = byId("profit-structure-metrics-grid");
    if (!node) return;
    const { totals } = summary;
    const metrics = [
        ["总销量", formatVolume(totals.volume), "经营规模"],
        ["净收入", formatAmount(totals.revenue), "收入总额"],
        ["边际", formatAmount(totals.margin), "边际总额"],
        ["边际率", formatPercent(totals.marginRate), "边际 / 净收入"],
        ["单车边际", formatUnitAmount(totals.unitMargin), "边际 / 销量"]
    ];

    node.innerHTML = metrics.map(([label, value, note]) => `
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
        caption.textContent = `当前口径：${summary.selectedDimensions.join(" + ")}。横轴为销量占比，纵轴为单车边际，气泡大小代表边际贡献。`;
    }
    if (!summary.items.length || typeof window === "undefined" || !window.Plotly) {
        renderEmptyChart("profit-structure-matrix-chart", "暂无盈利结构数据");
        return;
    }

    const compact = isCompactViewport();
    const traces = Object.values(CLASSIFICATIONS).map((classification) => {
        const items = summary.items.filter((item) => item.classification.key === classification.key);
        return {
            type: "scatter",
            mode: "markers+text",
            name: classification.label,
            x: items.map((item) => item.volumeShare * 100),
            y: items.map((item) => item.unitMargin),
            text: compact ? items.map((item) => compactPointLabel(item.name)) : items.map((item) => item.name),
            textposition: "top center",
            textfont: { size: compact ? 9 : 10, color: "#4f4a40" },
            marker: {
                color: classification.color,
                size: items.map((item) => Math.max(12, Math.min(42, Math.sqrt(Math.abs(item.margin)) * 8))),
                opacity: 0.78,
                line: { width: 1.2, color: "#fff" }
            },
            customdata: items.map((item) => [
                item.name,
                item.classification.label,
                formatVolume(item.volume),
                formatAmount(item.revenue),
                formatAmount(item.margin),
                formatPercent(item.marginRate),
                formatUnitAmount(item.unitMargin)
            ]),
            hovertemplate: "对象：%{customdata[0]}<br>分层：%{customdata[1]}<br>销量：%{customdata[2]}<br>净收入：%{customdata[3]}<br>边际：%{customdata[4]}<br>边际率：%{customdata[5]}<br>单车边际：%{customdata[6]}<extra></extra>"
        };
    }).filter((trace) => trace.x.length);

    window.Plotly.react("profit-structure-matrix-chart", traces, chartLayout({
        xaxis: { title: "销量占比", ticksuffix: "%", rangemode: "tozero" },
        yaxis: { title: "单车边际（万元/辆）" },
        showlegend: !compact,
        legend: { orientation: "h", y: -0.22, itemclick: false, itemdoubleclick: false }
    }), chartConfig());
}

function renderLayerChart(summary) {
    if (!summary.layerSummary.length || typeof window === "undefined" || !window.Plotly) {
        renderEmptyChart("profit-structure-layer-chart", "暂无分层贡献数据");
        return;
    }
    const layers = summary.layerSummary;
    const x = layers.map((layer) => layer.classification.label);
    const colors = layers.map((layer) => layer.classification.color);
    const customdata = layers.map((layer) => [formatVolume(layer.volume), formatAmount(layer.revenue), formatAmount(layer.margin), `${layer.count} 项`]);

    window.Plotly.react("profit-structure-layer-chart", [
        {
            type: "bar",
            name: "边际",
            x,
            y: layers.map((layer) => layer.margin),
            marker: { color: colors },
            customdata,
            hovertemplate: "分层：%{x}<br>对象数：%{customdata[3]}<br>销量：%{customdata[0]}<br>净收入：%{customdata[1]}<br>边际：%{customdata[2]}<extra></extra>"
        }
    ], chartLayout({
        margin: { t: 24, r: 18, b: 62, l: 58 },
        xaxis: { title: "", tickangle: isCompactViewport() ? -18 : 0 },
        yaxis: { title: "边际（亿元）" },
        showlegend: false
    }), chartConfig());
}

function renderInsights(summary) {
    const node = byId("profit-structure-insight-list");
    if (!node) return;
    const dragItems = summary.items.filter((item) => item.classification.key === "profit-drag");
    const scaleItems = summary.items.filter((item) => item.classification.key === "scale-driver");
    const coreItems = summary.items.filter((item) => item.classification.key === "core-profit");
    const insights = [];

    if (dragItems.length) {
        const margin = dragItems.reduce((sum, item) => sum + item.margin, 0);
        insights.push(["优先复盘拖累项", `${dragItems.slice(0, 3).map((item) => item.name).join("、")} 等 ${dragItems.length} 项合计边际 ${formatAmount(margin)}。`]);
    }
    if (scaleItems.length) {
        const volumeShare = scaleItems.reduce((sum, item) => sum + item.volumeShare, 0);
        insights.push(["规模不等于利润", `${scaleItems.slice(0, 3).map((item) => item.name).join("、")} 销量占比合计 ${formatPercent(volumeShare)}，但单车边际低于整体。`]);
    }
    if (coreItems.length) {
        const marginShare = coreItems.reduce((sum, item) => sum + item.marginShare, 0);
        insights.push(["利润核心", `${coreItems.slice(0, 3).map((item) => item.name).join("、")} 是当前口径下的主要利润来源，边际贡献占比 ${formatPercent(marginShare)}。`]);
    }
    if (!insights.length) {
        insights.push(["暂无明显结构信号", "当前筛选下各经营对象差异不大，可以切换维度组合继续观察。"]);
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
    if (!wrap) return;
    const topItems = summary.items.slice(0, 80);
    if (!topItems.length) {
        wrap.innerHTML = `<div class="empty-chart">暂无明细数据</div>`;
        return;
    }

    wrap.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>经营对象</th>
                    <th>分层</th>
                    <th>销量</th>
                    <th>销量占比</th>
                    <th>净收入</th>
                    <th>边际</th>
                    <th>边际率</th>
                    <th>单车净收入</th>
                    <th>单车边际</th>
                </tr>
            </thead>
            <tbody>
                ${topItems.map((item) => `
                    <tr>
                        <td><strong>${escapeHtml(item.name)}</strong></td>
                        <td><span class="layer-badge" style="--layer-color: ${item.classification.color}">${escapeHtml(item.classification.label)}</span></td>
                        <td>${formatVolume(item.volume)}</td>
                        <td>${formatPercent(item.volumeShare)}</td>
                        <td>${formatAmount(item.revenue)}</td>
                        <td class="${item.margin < 0 ? "negative" : "positive"}">${formatAmount(item.margin)}</td>
                        <td>${formatPercent(item.marginRate)}</td>
                        <td>${formatUnitAmount(item.unitRevenue)}</td>
                        <td>${formatUnitAmount(item.unitMargin)}</td>
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
        filters: state.filters
    });
    const status = byId("profit-structure-data-status");
    if (status) status.textContent = `${state.currentSourceLabel} · ${summary.rows.length} 行`;
    renderMetrics(summary);
    renderMatrix(summary);
    renderLayerChart(summary);
    renderInsights(summary);
    renderTable(summary);
}

function loadRows(inputRows, sourceLabel = "示例数据") {
    const { rows, schema } = normalizeUploadedRows(inputRows);
    if (!schema.volumeColumn) {
        showMessage("error", "需要包含“销量”列，销量列也是单车指标的分母。");
        return;
    }
    if (!schema.dimensions.length) {
        showMessage("error", "需要至少一个维度列。销量列之前的字段会自动识别为维度。");
        return;
    }
    state.rows = rows;
    state.schema = schema;
    state.selectedPrimaryDimension = schema.dimensions[0] || "";
    state.selectedSecondaryDimension = "";
    state.selectedMonth = "__all__";
    state.filters = {};
    state.currentSourceLabel = sourceLabel;
    renderAll();
    showMessage("success", `${sourceLabel}已载入，可切换当前分析维度继续观察。`);
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
        showMessage("error", "文件解析失败，请确认第一行是表头，且包含月份、维度、销量和金额指标。");
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
    downloadBlob(new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" }), "多维盈利结构分析模型模板.csv");
}

function downloadXlsx() {
    const workbook = window.XLSX.utils.book_new();
    const sheet = window.XLSX.utils.json_to_sheet(templateRows(), { header: TEMPLATE_HEADERS });
    window.XLSX.utils.book_append_sheet(workbook, sheet, "经营明细");
    const note = window.XLSX.utils.aoa_to_sheet([
        ["字段说明", TEMPLATE_HEADER_NOTE],
        ["当前分析维度", "页面会把销量列之前的所有字段识别为可选维度。"],
        ["财务指标", "净收入、成本、边际可直接上传；如未填写边际，模型会用净收入 + 成本计算。"]
    ]);
    window.XLSX.utils.book_append_sheet(workbook, note, "说明");
    window.XLSX.writeFile(workbook, "多维盈利结构分析模型模板.xlsx");
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
        classifyProfitStructureItem,
        summarizeProfitStructure,
        summarizeLayers,
        createSampleRows,
        initApp
    };
}
