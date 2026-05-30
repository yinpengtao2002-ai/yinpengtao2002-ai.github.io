(function () {
    const COLORS = {
        orange: "#d97757",
        blue: "#5c8fba",
        green: "#788c5d",
        red: "#b65f55",
        amber: "#b98524",
        text: "#141413",
        muted: "#747168",
        grid: "#e8e6dc",
        paper: "rgba(0,0,0,0)"
    };

    const LOCKED_MONTH_COLUMN = "月份";
    const MONTH_ALIASES = [LOCKED_MONTH_COLUMN, "月度", "月", "期间", "年月", "会计期间", "month", "date", "period"];
    const YEAR_ALIASES = ["年份", "年度", "年", "year", "fiscalyear", "fy"];
    const VOLUME_COLUMN_ALIASES = ["销量", "销售量", "发车量", "台数", "数量", "volume", "qty", "quantity", "units"];
    const PREFERRED_METRICS = ["利润", "毛利", "边际", "净收入", "收入"];
    const NON_DIMENSION_COLUMNS = ["备注", "说明", "单位", "口径", "版本", "数据类型", "类型", "scenario"];
    const TEMPLATE_HEADER_NOTE = "提示：月份列不许动；销量是分母口径，不要改名或删除；其他维度列和总额指标列可以改名、增删。边际率、单车净收入、单车边际不用填，模型会按总额指标 ÷ 销量自动计算。";
    const TEMPLATE_ROWS = createSampleRows().slice(0, 18);
    const TEMPLATE_HEADERS = Object.keys(TEMPLATE_ROWS[0] || {});

    const state = {
        initialized: false,
        sourceName: "示例数据",
        sourceRows: [],
        headers: [],
        monthColumn: "",
        yearColumn: "",
        metricColumns: [],
        dimensionColumns: [],
        selectedMetric: "",
        aggregation: "auto",
        unitScale: "raw",
        selectedDimensions: [],
        filters: {}
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

    function normalizeToken(value) {
        return String(value || "")
            .replace(/[\s_\-（）()%]/g, "")
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

    function safeArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function compactRows(rows) {
        return safeArray(rows)
            .map(normalizeRowKeys)
            .filter((row) => Object.values(row).some((value) => value !== null && value !== undefined && String(value).trim() !== ""));
    }

    function normalizeRowKeys(row) {
        const normalized = {};
        Object.keys(row || {}).forEach((key) => {
            normalized[String(key).replace(/^\uFEFF/, "").trim()] = row[key];
        });
        return normalized;
    }

    function createSampleRows() {
        const months = buildMonthKeys(2025, 1, 20);
        const markets = [
            { region: "欧洲", country: "德国", brandMarket: "主品牌", mode: "经销", businessUnit: "燃油乘用车", model: "T1D", baseVolume: 620, unitRevenue: 126000, costRate: 0.70, volumeLift: 1.10, priceLift: 1.03 },
            { region: "欧洲", country: "英国", brandMarket: "高端品牌", mode: "经销", businessUnit: "燃油乘用车", model: "T1E", baseVolume: 510, unitRevenue: 121000, costRate: 0.72, volumeLift: 0.94, priceLift: 0.98 },
            { region: "拉美", country: "巴西", brandMarket: "主品牌", mode: "批售", businessUnit: "燃油乘用车", model: "T1D", baseVolume: 690, unitRevenue: 108000, costRate: 0.69, volumeLift: 1.08, priceLift: 1.01 },
            { region: "拉美", country: "墨西哥", brandMarket: "新能源品牌", mode: "经销", businessUnit: "插混业务", model: "PHEV", baseVolume: 470, unitRevenue: 132000, costRate: 0.73, volumeLift: 0.88, priceLift: 0.96 },
            { region: "中东非", country: "阿联酋", brandMarket: "高端品牌", mode: "直营", businessUnit: "SUV 业务", model: "SUV", baseVolume: 390, unitRevenue: 145000, costRate: 0.67, volumeLift: 1.04, priceLift: 1.04 },
            { region: "中东非", country: "南非", brandMarket: "经济型品牌", mode: "经销", businessUnit: "燃油乘用车", model: "T1E", baseVolume: 430, unitRevenue: 99000, costRate: 0.74, volumeLift: 0.90, priceLift: 0.94 },
            { region: "亚太", country: "澳大利亚", brandMarket: "SUV 品牌", mode: "直营", businessUnit: "SUV 业务", model: "SUV", baseVolume: 360, unitRevenue: 138000, costRate: 0.68, volumeLift: 1.18, priceLift: 1.05 },
            { region: "亚太", country: "泰国", brandMarket: "新能源品牌", mode: "经销", businessUnit: "纯电业务", model: "EV", baseVolume: 560, unitRevenue: 114000, costRate: 0.71, volumeLift: 0.92, priceLift: 0.97 }
        ];
        const rows = [];
        const seasonCurve = [0.98, 1, 1.02, 1.01, 1.03, 1.04, 1.05, 1.06, 1.07, 1.08, 1.09, 1.1];
        const priceCurve = [1.025, 1.018, 1.01, 1.015, 1.012, 1.006, 1, 0.998, 1.004, 1.008, 1.012, 1.016];
        const marginQualityCurve = [0.008, 0.007, 0.005, 0.006, 0.006, 0.004, 0.003, 0.004, 0.004, 0.005, 0.006, 0.006];
        const currentYearVolumeCurve = [0.98, 1, 1.02, 1.035, 1.05, 1.062, 1.074, 1.086, 1.098, 1.108, 1.118, 1.128];
        const currentYearPriceCurve = [1.04, 1.034, 1.028, 1.022, 1.016, 1.01, 1.004, 0.998, 0.994, 0.99, 0.986, 0.982];
        const currentYearMarginCurve = [0.011, 0.009, 0.007, 0.006, 0.005, 0.004, 0.003, 0.003, 0.001, 0, -0.001, -0.002];

        months.forEach((month) => {
            const year = Number(month.slice(0, 4));
            const [, monthPart] = month.split("-").map(Number);
            markets.forEach((market, marketIndex) => {
                const yearLift = year >= 2026 ? market.volumeLift * currentYearVolumeCurve[monthPart - 1] : 1;
                const priceLift = year >= 2026 ? market.priceLift * currentYearPriceCurve[monthPart - 1] : 1;
                const marketWave = 1 + Math.sin((monthPart + marketIndex * 1.7) / 1.6) * 0.035;
                const launchPulse = 1 + Math.cos((monthPart * (marketIndex + 2)) / 2.4) * 0.018;
                const event = sampleMarketEvent(market, year, monthPart);
                const volume = Math.round(market.baseVolume * seasonCurve[monthPart - 1] * yearLift * marketWave * launchPulse * event.volume);
                const revenue = Math.round((volume * market.unitRevenue * priceLift * priceCurve[monthPart - 1] * event.price) / 10000);
                const cost = Math.round(revenue * market.costRate * event.cost);
                const yearMargin = year >= 2026 ? currentYearMarginCurve[monthPart - 1] : 0;
                const margin = revenue - cost + Math.round(revenue * (event.margin + marginQualityCurve[monthPart - 1] + yearMargin));

                rows.push({
                    "月份": formatMonthKey(month),
                    "大区": market.region,
                    "国家": market.country,
                    "品牌市场": market.brandMarket,
                    "经营模式": market.mode,
                    "业务单元": market.businessUnit,
                    "车型": market.model,
                    "销量": volume,
                    "净收入总额": revenue,
                    "成本总额": cost,
                    "边际总额": margin
                });
            });
        });

        return rows;
    }

    function sampleMarketEvent(market, year, month) {
        const event = { volume: 1, price: 1, cost: 1, margin: 0 };

        if (year === 2025 && month === 6 && market.region === "欧洲") {
            event.volume *= 1.08;
            event.price *= 0.98;
            event.cost *= 1.01;
            event.margin -= 0.004;
        }
        if (year === 2025 && month === 8 && market.region === "拉美") {
            event.volume *= 0.92;
            event.price *= 1.02;
            event.margin += 0.004;
        }
        if (year === 2025 && month === 12 && market.region === "中东非") {
            event.volume *= 1.08;
            event.price *= 0.98;
            event.cost *= 1.02;
            event.margin -= 0.004;
        }
        if (year === 2026 && month === 1 && market.region === "欧洲") {
            event.volume *= 0.98;
            event.price *= 1.01;
            event.margin += 0.002;
        }
        if (year === 2026 && month === 3 && market.businessUnit === "纯电业务") {
            event.volume *= 1.05;
            event.price *= 0.99;
            event.cost *= 1.004;
            event.margin -= 0.002;
        }
        if (year === 2026 && month === 4 && market.country === "墨西哥") {
            event.volume *= 0.97;
            event.price *= 1.015;
            event.cost *= 1.004;
            event.margin += 0.002;
        }
        if (year === 2026 && month === 6 && market.region === "中东非") {
            event.price *= 1.01;
            event.cost *= 1.005;
            event.margin -= 0.001;
        }
        if (year === 2026 && month === 7 && market.country === "澳大利亚") {
            event.volume *= 1.02;
            event.price *= 0.992;
            event.cost *= 1.003;
            event.margin -= 0.001;
        }
        if (year === 2026 && month === 8 && market.region === "拉美") {
            event.volume *= 0.99;
            event.price *= 1.01;
            event.margin += 0.002;
        }

        return event;
    }

    function buildMonthKeys(startYear, startMonth, count) {
        return Array.from({ length: count }, (_, index) => {
            const zeroBased = startMonth - 1 + index;
            const year = startYear + Math.floor(zeroBased / 12);
            const month = zeroBased % 12 + 1;
            return `${year}-${String(month).padStart(2, "0")}`;
        });
    }

    function formatMonthKey(monthKey) {
        const [year, month] = String(monthKey || "").split("-").map(Number);
        if (!Number.isFinite(year) || !Number.isFinite(month)) return String(monthKey || "");
        return `${year}年${month}月`;
    }

    function formatMonthShort(monthKey) {
        const month = Number(String(monthKey || "").split("-")[1]);
        return Number.isFinite(month) ? `${month}月` : String(monthKey || "");
    }

    function toNumber(value) {
        if (typeof value === "number") return Number.isFinite(value) ? value : 0;
        if (value instanceof Date) return 0;
        if (value === null || value === undefined) return 0;

        const raw = String(value).trim();
        if (!raw) return 0;

        const isPercent = raw.includes("%");
        const isNegative = raw.includes("(") && raw.includes(")");
        const cleaned = raw
            .replace(/[,，\s￥¥$元台辆个件]/g, "")
            .replace(/[万亿]/g, "")
            .replace(/%/g, "")
            .replace(/[()]/g, "")
            .trim();
        const numeric = Number(cleaned);
        if (!Number.isFinite(numeric)) return 0;
        const signed = isNegative ? -numeric : numeric;
        return isPercent ? signed / 100 : signed;
    }

    function isNumericLike(value) {
        if (value === null || value === undefined || value === "") return false;
        if (typeof value === "number") return Number.isFinite(value);
        if (value instanceof Date) return false;
        const raw = String(value).trim();
        if (!raw) return false;
        if (/^\d{4}[-/.年]\d{1,2}/.test(raw)) return false;
        if (/^\d{6}$/.test(raw) && parsePeriod(raw)) return false;
        const cleaned = raw
            .replace(/[,，\s￥¥$元台辆个件万亿%()]/g, "")
            .trim();
        return cleaned !== "" && Number.isFinite(Number(cleaned));
    }

    function inferColumns(rows) {
        const headers = Object.keys(rows.find((row) => Object.keys(row).length) || {});
        const normalizedAliases = MONTH_ALIASES.map(normalizeToken);
        const normalizedYearAliases = YEAR_ALIASES.map(normalizeToken);
        const yearColumn = headers.find((header) => {
            if (!normalizedYearAliases.includes(normalizeToken(header))) return false;
            return columnMatchRate(rows, header, parseYearValue) >= 0.62;
        }) || headers.find((header) => {
            if (normalizedAliases.includes(normalizeToken(header))) return false;
            return columnMatchRate(rows, header, parseYearValue) >= 0.9;
        }) || "";
        let monthColumn = headers.find((header) => normalizeToken(header) === normalizeToken(LOCKED_MONTH_COLUMN))
            || headers.find((header) => normalizedAliases.includes(normalizeToken(header)))
            || "";

        if (!monthColumn) {
            monthColumn = headers.find((header) => {
                const values = rows.slice(0, 40).map((row) => row[header]).filter((value) => value !== null && value !== undefined && value !== "");
                if (!values.length) return false;
                const matched = values.filter((value) => Boolean(parsePeriod(value))).length;
                return matched / values.length >= 0.55;
            }) || headers[0] || "";
        }

        if (yearColumn && monthColumn === yearColumn) {
            monthColumn = headers.find((header) => header !== yearColumn && normalizedAliases.includes(normalizeToken(header))) || monthColumn;
        }

        const numericColumns = headers.filter((header) => {
            if (header === monthColumn) return false;
            if (header === yearColumn) return false;
            const values = rows.slice(0, 80).map((row) => row[header]).filter((value) => value !== null && value !== undefined && String(value).trim() !== "");
            if (!values.length) return false;
            const numericCount = values.filter(isNumericLike).length;
            return numericCount / values.length >= 0.62;
        });
        const metricColumns = numericColumns.filter((header) => !isDerivedMetricColumn(header));
        const ignoredNumericColumns = numericColumns.filter((header) => !metricColumns.includes(header));

        const nonDimensionSet = new Set(NON_DIMENSION_COLUMNS.map(normalizeToken));
        const dimensionColumns = headers.filter((header) => {
            if (header === monthColumn) return false;
            if (header === yearColumn) return false;
            if (metricColumns.includes(header)) return false;
            if (ignoredNumericColumns.includes(header)) return false;
            if (nonDimensionSet.has(normalizeToken(header))) return false;
            return rows.some((row) => row[header] !== null && row[header] !== undefined && String(row[header]).trim() !== "");
        });

        const selectedMetric = choosePreferredMetric(metricColumns);
        const selectedDimensions = dimensionColumns.slice();

        return {
            headers,
            monthColumn,
            yearColumn,
            metricColumns,
            dimensionColumns,
            selectedMetric,
            selectedDimensions
        };
    }

    function columnMatchRate(rows, header, parser) {
        const values = rows.slice(0, 80).map((row) => row[header]).filter((value) => value !== null && value !== undefined && String(value).trim() !== "");
        if (!values.length) return 0;
        const matched = values.filter((value) => Number.isFinite(parser(value))).length;
        return matched / values.length;
    }

    function choosePreferredMetric(metricColumns) {
        const selectableColumns = analysisMetricColumns(metricColumns);
        for (const preferred of PREFERRED_METRICS) {
            const match = selectableColumns.find((metric) => normalizeToken(metric).includes(normalizeToken(preferred)));
            if (match) return match;
        }
        return selectableColumns[0] || volumeMetricColumn(metricColumns) || metricColumns[0] || "";
    }

    function isVolumeMetricName(metric) {
        const normalized = normalizeToken(metric);
        return VOLUME_COLUMN_ALIASES.some((alias) => {
            const candidate = normalizeToken(alias);
            return normalized === candidate || normalized.includes(candidate) || candidate.includes(normalized);
        });
    }

    function volumeMetricColumn(columns = state.metricColumns) {
        return safeArray(columns).find(isVolumeMetricName) || "";
    }

    function isDerivedMetricColumn(metric) {
        if (isVolumeMetricName(metric)) return false;
        const normalized = normalizeToken(metric);
        if (!normalized) return false;
        if (String(metric).includes("%")) return true;
        if (normalized.includes("率") || normalized.includes("rate") || normalized.includes("ratio")) return true;
        return ["单车", "单台", "单位", "平均", "均价", "单价", "perunit", "unit"].some((token) => normalized.includes(normalizeToken(token)));
    }

    function analysisMetricColumns(columns = state.metricColumns) {
        const volumeMetric = volumeMetricColumn(columns);
        return safeArray(columns).filter((metric) => metric !== volumeMetric);
    }

    function parsePeriod(value) {
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            const year = value.getFullYear();
            const month = value.getMonth() + 1;
            return makePeriod(year, month);
        }

        if (typeof value === "number" && Number.isFinite(value)) {
            const compact = Math.round(value);
            if (compact >= 190001 && compact <= 299912) {
                const year = Math.floor(compact / 100);
                const month = compact % 100;
                return makePeriod(year, month);
            }
            if (compact > 20000 && compact < 80000 && window.XLSX?.SSF?.parse_date_code) {
                const parsed = window.XLSX.SSF.parse_date_code(compact);
                if (parsed) return makePeriod(parsed.y, parsed.m);
            }
        }

        const raw = String(value ?? "").trim();
        if (!raw) return null;

        let match = raw.match(/^(\d{4})(\d{2})$/);
        if (match) return makePeriod(Number(match[1]), Number(match[2]));

        match = raw.match(/(\d{4})\s*年\s*(\d{1,2})\s*月/);
        if (match) return makePeriod(Number(match[1]), Number(match[2]));

        match = raw.match(/(\d{4})[-/.](\d{1,2})/);
        if (match) return makePeriod(Number(match[1]), Number(match[2]));

        return null;
    }

    function parseYearValue(value) {
        if (value instanceof Date && !Number.isNaN(value.getTime())) return value.getFullYear();
        const raw = String(value ?? "").trim();
        if (!raw) return null;
        const numeric = Number(raw.replace(/[^\d.-]/g, ""));
        if (Number.isFinite(numeric)) {
            const rounded = Math.round(numeric);
            if (rounded >= 1900 && rounded <= 2999) return rounded;
        }
        const match = raw.match(/(19\d{2}|20\d{2}|21\d{2})/);
        return match ? Number(match[1]) : null;
    }

    function parseMonthValue(value) {
        if (value instanceof Date && !Number.isNaN(value.getTime())) return value.getMonth() + 1;
        const direct = parsePeriod(value);
        if (direct) return Number(direct.key.slice(5, 7));
        const raw = String(value ?? "").trim();
        if (!raw) return null;
        const numeric = Number(raw.replace(/[^\d.-]/g, ""));
        if (Number.isFinite(numeric)) {
            const rounded = Math.round(numeric);
            if (rounded >= 1 && rounded <= 12) return rounded;
        }
        const match = raw.match(/(^|\D)(1[0-2]|0?[1-9])\s*月?/);
        return match ? Number(match[2]) : null;
    }

    function makePeriod(year, month) {
        if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
        const key = `${year}-${String(month).padStart(2, "0")}`;
        return { key, label: formatMonthKey(key), sort: year * 12 + month };
    }

    function rowPeriod(row) {
        const direct = parsePeriod(row[state.monthColumn]);
        if (direct) return direct;
        if (!state.yearColumn) return null;
        return makePeriod(parseYearValue(row[state.yearColumn]), parseMonthValue(row[state.monthColumn]));
    }

    function parseRows() {
        const metric = state.selectedMetric;
        const monthColumn = state.monthColumn;
        if (!metric || !monthColumn) return [];

        return state.sourceRows.map((row, index) => {
            const period = rowPeriod(row);
            if (!period) return null;

            const dimensions = {};
            state.dimensionColumns.forEach((dimension) => {
                const raw = row[dimension];
                const value = String(raw ?? "").trim();
                dimensions[dimension] = value || "未分类";
            });

            return {
                index,
                period,
                dimensions,
                metricValue: toNumber(row[metric]),
                raw: row
            };
        }).filter(Boolean);
    }

    function currentRows() {
        const rows = parseRows();
        return rows.filter((row) => {
            return Object.entries(state.filters).every(([dimension, selectedValues]) => {
                if (!Array.isArray(selectedValues)) return true;
                return selectedValues.includes(row.dimensions[dimension] || "未分类");
            });
        });
    }

    function inferMetricMeta(metric) {
        const normalized = normalizeToken(metric);
        const isPercent = metric.includes("%") || normalized.includes("率") || normalized.includes("rate") || normalized.includes("ratio");
        const isAverage = normalized.includes("单") || normalized.includes("均") || normalized.includes("价") || isPercent;
        const isAmount = ["收入", "成本", "毛利", "利润", "费用", "金额", "边际", "revenue", "cost", "profit", "margin", "amount"].some((token) => normalized.includes(normalizeToken(token)));
        const isVolume = ["销量", "数量", "台数", "件数", "volume", "qty", "quantity"].some((token) => normalized.includes(normalizeToken(token)));

        return {
            unit: isPercent ? "percent" : isAmount ? "amount" : isVolume ? "volume" : "number",
            aggregation: isAverage ? "avg" : "sum"
        };
    }

    function currentAggregation(metric = state.selectedMetric) {
        if (state.aggregation && state.aggregation !== "auto") return state.aggregation;
        return inferMetricMeta(metric).aggregation;
    }

    function aggregateRows(rows, metric = state.selectedMetric, aggregation = currentAggregation(metric)) {
        if (!rows.length) return 0;
        const values = rows.map((row) => {
            if (metric === state.selectedMetric) return row.metricValue;
            return toNumber(row.raw[metric]);
        }).filter((value) => Number.isFinite(value));

        if (!values.length) return 0;
        if (aggregation === "avg") {
            return values.reduce((sum, value) => sum + value, 0) / values.length;
        }
        return values.reduce((sum, value) => sum + value, 0);
    }

    function aggregateMetricTotal(rows, metric) {
        return rows
            .map((row) => toNumber(row.raw[metric]))
            .filter((value) => Number.isFinite(value))
            .reduce((sum, value) => sum + value, 0);
    }

    function aggregateVolume(rows) {
        const metric = volumeMetricColumn();
        if (!metric) return 0;
        return aggregateMetricTotal(rows, metric);
    }

    function groupRows(rows, keyFn) {
        const map = new Map();
        rows.forEach((row) => {
            const key = keyFn(row) || "未分类";
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(row);
        });
        return map;
    }

    function monthSeries(rows = currentRows()) {
        const grouped = groupRows(rows, (row) => row.period.key);
        const months = Array.from(grouped.keys())
            .map((key) => ({ key, label: formatMonthKey(key), sort: grouped.get(key)[0]?.period.sort || 0 }))
            .sort((a, b) => a.sort - b.sort);
        const aggregation = currentAggregation();
        const values = months.map((month) => aggregateRows(grouped.get(month.key) || [], state.selectedMetric, aggregation));
        return { months, values };
    }

    function previousYearKey(monthKey) {
        const [year, month] = String(monthKey || "").split("-");
        const numericYear = Number(year);
        if (!Number.isFinite(numericYear) || !month) return "";
        return `${numericYear - 1}-${month}`;
    }

    function previousMonthKey(monthKey) {
        const [year, month] = String(monthKey || "").split("-").map(Number);
        if (!Number.isFinite(year) || !Number.isFinite(month)) return "";
        const previous = makePeriod(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1);
        return previous?.key || "";
    }

    function indexedMonthValues(rows = currentRows()) {
        const series = monthSeries(rows);
        const valueByMonth = new Map(series.months.map((month, index) => [month.key, series.values[index]]));
        return { ...series, valueByMonth };
    }

    function metricSeries(metric, rows = currentRows()) {
        const grouped = groupRows(rows, (row) => row.period.key);
        const months = Array.from(grouped.keys())
            .map((key) => ({ key, label: formatMonthKey(key), sort: grouped.get(key)[0]?.period.sort || 0 }))
            .sort((a, b) => a.sort - b.sort);
        const aggregation = currentAggregation(metric);
        const values = months.map((month) => aggregateRows(grouped.get(month.key) || [], metric, aggregation));
        return { months, values, valueByMonth: new Map(months.map((month, index) => [month.key, values[index]])) };
    }

    function unitMetricSeries(metric, rows = currentRows()) {
        const grouped = groupRows(rows, (row) => row.period.key);
        const months = Array.from(grouped.keys())
            .map((key) => ({ key, label: formatMonthKey(key), sort: grouped.get(key)[0]?.period.sort || 0 }))
            .sort((a, b) => a.sort - b.sort);
        const values = months.map((month) => {
            const monthRows = grouped.get(month.key) || [];
            const volume = aggregateVolume(monthRows);
            if (!volume) return null;
            return aggregateMetricTotal(monthRows, metric) / volume;
        });
        return { months, values, valueByMonth: new Map(months.map((month, index) => [month.key, values[index]])) };
    }

    function buildTrendMetricDefinitions() {
        const volumeMetric = volumeMetricColumn();
        const totalMetrics = analysisMetricColumns();
        const definitions = [];

        if (volumeMetric) {
            definitions.push({
                key: "volume",
                metric: volumeMetric,
                label: "销量",
                sourceLabel: volumeMetric,
                color: COLORS.green,
                mode: "total"
            });
        }

        totalMetrics.forEach((metric, index) => {
            definitions.push({
                key: `unit-${normalizeToken(metric) || index}`,
                metric,
                label: unitMetricLabel(metric),
                sourceLabel: metric,
                color: palette(index + 1),
                mode: "unit"
            });
        });

        if (definitions.length) return definitions;
        return state.selectedMetric ? [{
            key: "selected",
            metric: state.selectedMetric,
            label: state.selectedMetric,
            sourceLabel: state.selectedMetric,
            color: COLORS.blue,
            mode: "total"
        }] : [];
    }

    function unitMetricLabel(metric) {
        const base = String(metric || "指标")
            .replace(/（.*?）|\(.*?\)/g, "")
            .replace(/总额|金额|额$/g, "")
            .trim() || String(metric || "指标");
        return `单车${base}`;
    }

    function metricAxisTitle(metric) {
        const unit = axisUnitLabel(metric);
        return unit ? `${metric}（${unit}）` : metric;
    }

    function latestComparableYear(months, valueByMonth) {
        const comparableMonths = months.filter((month) => valueByMonth.has(previousYearKey(month.key)));
        return comparableMonths.reduce((year, month) => {
            const currentYear = Number(month.key.slice(0, 4));
            return Number.isFinite(currentYear) ? Math.max(year, currentYear) : year;
        }, 0);
    }

    function displayValue(value, metric = state.selectedMetric, options = {}) {
        const meta = inferMetricMeta(metric);
        if (!Number.isFinite(value)) return "-";
        if (meta.unit === "percent") {
            const percent = Math.abs(value) <= 1.5 ? value * 100 : value;
            return `${formatNumber(percent, options.digits ?? 1)}%`;
        }
        const scaled = scaleAmount(value, meta.unit);
        return formatNumber(scaled, options.digits ?? (Math.abs(scaled) >= 100 ? 0 : 1));
    }

    function plotValue(value, metric = state.selectedMetric) {
        const meta = inferMetricMeta(metric);
        if (meta.unit === "percent") return Math.abs(value) <= 1.5 ? value * 100 : value;
        return scaleAmount(value, meta.unit);
    }

    function scaleAmount(value, unit) {
        if (unit !== "amount") return value;
        if (state.unitScale === "yi") return value / 100000000;
        if (state.unitScale === "wan") return value / 10000;
        return value;
    }

    function axisUnitLabel(metric = state.selectedMetric) {
        const meta = inferMetricMeta(metric);
        if (meta.unit === "percent") return "%";
        if (meta.unit === "amount" && state.unitScale === "yi") return "亿元";
        if (meta.unit === "amount" && state.unitScale === "wan") return "万元";
        return "";
    }

    function formatNumber(value, digits = 1) {
        if (!Number.isFinite(value)) return "-";
        const normalized = Math.abs(value) < 1e-9 ? 0 : value;
        return new Intl.NumberFormat("zh-CN", {
            maximumFractionDigits: digits,
            minimumFractionDigits: Math.abs(normalized) < 10 && digits > 0 ? 1 : 0
        }).format(normalized);
    }

    function setSelectOptions(select, options, selectedValue) {
        if (!select) return;
        select.innerHTML = options.map((option) => {
            const value = typeof option === "string" ? option : option.value;
            const label = typeof option === "string" ? option : option.label;
            return `<option value="${escapeHtml(value)}"${value === selectedValue ? " selected" : ""}>${escapeHtml(label)}</option>`;
        }).join("");
    }

    function renderColumnControls() {
        const options = analysisMetricColumns();
        const metricOptions = options.length ? options : state.metricColumns;
        if (!metricOptions.includes(state.selectedMetric)) {
            state.selectedMetric = choosePreferredMetric(state.metricColumns);
        }
        setSelectOptions(byId("monthly-metric-select"), metricOptions, state.selectedMetric);
        renderDimensionControls();
    }

    function renderDimensionControls() {
        const dimensions = state.dimensionColumns.filter(Boolean);
        state.selectedDimensions = dimensions.slice();
        Object.keys(state.filters).forEach((dimension) => {
            if (!dimensions.includes(dimension)) delete state.filters[dimension];
        });
        renderFilterControls();
    }

    function renderFilterControls() {
        const grid = byId("monthly-filter-grid");
        if (!grid) return;

        const dimensions = state.selectedDimensions.length ? state.selectedDimensions : state.dimensionColumns;
        if (!dimensions.length) {
            grid.innerHTML = `<p class="empty-note">当前数据没有识别到维度列。</p>`;
            return;
        }

        grid.innerHTML = dimensions.map((dimension) => {
            const values = distinctDimensionValues(dimension);
            return `
                <div class="filter-card excel-filter-shell" data-filter-dimension="${escapeHtml(dimension)}">
                    <div class="multiselect-header">
                        <label class="multiselect-label">${escapeHtml(dimension)}</label>
                        <span class="excel-filter-count">${escapeHtml(getExcelFilterSummary(dimension, values))}</span>
                    </div>
                    <button type="button" class="excel-filter-trigger" aria-haspopup="menu" aria-expanded="false">
                        <span>${escapeHtml(getExcelFilterTriggerText(dimension, values))}</span>
                        <span class="excel-filter-caret">⌄</span>
                    </button>
                    <div class="excel-filter-menu" data-filter-dimension="${escapeHtml(dimension)}" hidden></div>
                </div>
            `;
        }).join("");

        grid.querySelectorAll(".excel-filter-shell").forEach((container) => {
            const dimension = container.dataset.filterDimension;
            const values = distinctDimensionValues(dimension);
            const trigger = container.querySelector(".excel-filter-trigger");
            const menu = container.querySelector(".excel-filter-menu");
            renderExcelFilterMenu(menu, dimension, values);
            trigger?.addEventListener("click", (event) => {
                event.stopPropagation();
                toggleExcelFilterMenu(container);
            });
            menu?.addEventListener("click", (event) => event.stopPropagation());
        });
    }

    function getExcelSelectedValues(dimension, availableValues) {
        const selected = state.filters[dimension];
        const availableSet = new Set(availableValues);
        if (!Array.isArray(selected)) return new Set(availableValues);
        return new Set(selected.filter((value) => availableSet.has(value)));
    }

    function getExcelFilterSummary(dimension, availableValues) {
        if (!availableValues.length) return "无可选项";
        const selectedCount = getExcelSelectedValues(dimension, availableValues).size;
        if (selectedCount === availableValues.length) return "全部";
        if (selectedCount === 0) return "未选择";
        return `已选 ${selectedCount}/${availableValues.length}`;
    }

    function getExcelFilterTriggerText(dimension, availableValues) {
        if (!availableValues.length) return "暂无可选项";
        const selectedCount = getExcelSelectedValues(dimension, availableValues).size;
        const hiddenCount = availableValues.length - selectedCount;
        if (hiddenCount === 0) return "全部维度项";
        if (selectedCount === 0) return `已隐藏全部 ${availableValues.length} 项`;
        return `已选 ${selectedCount} 项，隐藏 ${hiddenCount} 项`;
    }

    function renderExcelFilterMenu(menu, dimension, availableValues) {
        if (!menu) return;
        let selectedValues = getExcelSelectedValues(dimension, availableValues);
        menu.innerHTML = "";
        menu.setAttribute("role", "menu");

        const search = document.createElement("input");
        search.type = "search";
        search.className = "excel-filter-search";
        search.placeholder = "搜索维度项";
        search.setAttribute("aria-label", "搜索维度项");

        const keepSearchButton = document.createElement("button");
        keepSearchButton.type = "button";
        keepSearchButton.className = "excel-filter-search-action";
        keepSearchButton.textContent = "仅保留搜索结果";
        keepSearchButton.hidden = true;
        keepSearchButton.addEventListener("click", () => {
            const searchValues = resolveExcelFilterSearchValues(availableValues, search.value);
            applyExcelFilterSelection(dimension, availableValues, new Set(searchValues));
            closeExcelFilterMenus();
        });

        const actions = document.createElement("div");
        actions.className = "excel-filter-actions";

        const list = document.createElement("div");
        list.className = "excel-filter-list";

        const footer = document.createElement("div");
        footer.className = "excel-filter-footer";

        const summary = document.createElement("span");
        summary.className = "excel-filter-footer-summary";

        const footerActions = document.createElement("div");
        footerActions.className = "excel-filter-footer-actions";

        const applyButton = document.createElement("button");
        applyButton.type = "button";
        applyButton.className = "excel-filter-apply";
        applyButton.textContent = "应用";
        applyButton.addEventListener("click", () => {
            const appliedValues = resolveExcelFilterAppliedValues(availableValues, selectedValues);
            applyExcelFilterSelection(dimension, availableValues, new Set(appliedValues));
            closeExcelFilterMenus();
        });

        const renderRows = () => {
            const keyword = search.value.trim().toLowerCase();
            const visibleValues = resolveExcelFilterSearchValues(availableValues, search.value);
            list.innerHTML = "";
            keepSearchButton.hidden = !keyword;
            keepSearchButton.disabled = !keyword || visibleValues.length === 0;
            applyButton.textContent = keyword ? "应用到当前勾选" : "应用";

            visibleValues.forEach((value) => {
                const option = document.createElement("button");
                option.type = "button";
                option.className = "excel-filter-option";
                option.dataset.value = value;
                option.setAttribute("role", "menuitemcheckbox");
                option.setAttribute("aria-checked", String(selectedValues.has(value)));
                option.innerHTML = `
                    <span class="excel-filter-checkmark">${selectedValues.has(value) ? "✓" : ""}</span>
                    <span class="excel-filter-option-label">${escapeHtml(value)}</span>
                `;
                option.addEventListener("click", () => {
                    if (selectedValues.has(value)) {
                        selectedValues.delete(value);
                    } else {
                        selectedValues.add(value);
                    }
                    renderRows();
                });
                list.appendChild(option);
            });

            if (!visibleValues.length) {
                const empty = document.createElement("div");
                empty.className = "excel-filter-empty";
                empty.textContent = "没有匹配项";
                list.appendChild(empty);
            }

            summary.textContent = keyword
                ? `搜索到 ${visibleValues.length} 项，当前勾选 ${selectedValues.size}/${availableValues.length}`
                : `${selectedValues.size}/${availableValues.length} 项已勾选`;
        };

        actions.appendChild(createExcelFilterAction("全选", () => {
            selectedValues = new Set(availableValues);
            renderRows();
        }));
        actions.appendChild(createExcelFilterAction("反选", () => {
            selectedValues = new Set(availableValues.filter((value) => !selectedValues.has(value)));
            renderRows();
        }));
        actions.appendChild(createExcelFilterAction("清空", () => {
            selectedValues = new Set();
            renderRows();
        }));

        search.addEventListener("input", renderRows);

        footerActions.appendChild(keepSearchButton);
        footerActions.appendChild(applyButton);
        footer.appendChild(summary);
        footer.appendChild(footerActions);
        menu.appendChild(search);
        menu.appendChild(actions);
        menu.appendChild(list);
        menu.appendChild(footer);
        renderRows();
    }

    function resolveExcelFilterSearchValues(availableValues, searchText = "") {
        const keyword = String(searchText || "").trim().toLowerCase();
        if (!keyword) return [...availableValues];
        return availableValues.filter((value) => String(value).toLowerCase().includes(keyword));
    }

    function resolveExcelFilterAppliedValues(availableValues, selectedValues) {
        return availableValues.filter((value) => selectedValues.has(value));
    }

    function createExcelFilterAction(label, onClick) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "excel-filter-action";
        button.textContent = label;
        button.addEventListener("click", onClick);
        return button;
    }

    function applyExcelFilterSelection(dimension, availableValues, selectedValues) {
        const appliedValues = resolveExcelFilterAppliedValues(availableValues, selectedValues);
        if (appliedValues.length === availableValues.length) {
            delete state.filters[dimension];
        } else {
            state.filters[dimension] = appliedValues;
        }
        renderFilterControls();
        renderAll();
    }

    function toggleExcelFilterMenu(container) {
        const trigger = container.querySelector(".excel-filter-trigger");
        const menu = container.querySelector(".excel-filter-menu");
        if (!trigger || !menu) return;

        const shouldOpen = menu.hidden;
        closeExcelFilterMenus();
        if (!shouldOpen) return;

        menu.hidden = false;
        trigger.setAttribute("aria-expanded", "true");
        scrollExcelFilterMenuIntoView(menu);
        window.setTimeout(() => menu.querySelector(".excel-filter-search")?.focus({ preventScroll: true }), 80);
    }

    function scrollExcelFilterMenuIntoView(menu) {
        const sidebar = byId("monthly-sidebar");
        if (!sidebar || !menu) return;

        window.requestAnimationFrame(() => {
            const sidebarRect = sidebar.getBoundingClientRect();
            const menuRect = menu.getBoundingClientRect();
            const bottomOverflow = menuRect.bottom - sidebarRect.bottom + 18;
            const topOverflow = sidebarRect.top - menuRect.top + 14;
            if (bottomOverflow > 0) {
                sidebar.scrollTo({ top: sidebar.scrollTop + bottomOverflow, behavior: "smooth" });
                return;
            }
            if (topOverflow > 0) {
                sidebar.scrollTo({ top: Math.max(0, sidebar.scrollTop - topOverflow), behavior: "smooth" });
            }
        });
    }

    function closeExcelFilterMenus() {
        document.querySelectorAll(".monthly-trend-tool .excel-filter-menu:not([hidden])").forEach((menu) => {
            menu.hidden = true;
            menu.closest(".excel-filter-shell")?.querySelector(".excel-filter-trigger")?.setAttribute("aria-expanded", "false");
        });
    }

    let excelFilterDismissInitialized = false;

    function initExcelFilterDismiss() {
        if (excelFilterDismissInitialized) return;
        excelFilterDismissInitialized = true;
        document.addEventListener("click", (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            if (target.closest(".monthly-trend-tool .excel-filter-shell")) return;
            closeExcelFilterMenus();
        });
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closeExcelFilterMenus();
        });
    }

    function distinctDimensionValues(dimension) {
        const values = new Set();
        parseRows().forEach((row) => {
            const value = row.dimensions[dimension] || "未分类";
            values.add(value);
        });
        return Array.from(values).sort((a, b) => a.localeCompare(b, "zh-CN"));
    }

    function isActiveFilter(dimension) {
        const selected = state.filters[dimension];
        if (!Array.isArray(selected)) return false;
        return selected.length !== distinctDimensionValues(dimension).length;
    }

    function activeFilterCount() {
        return Object.keys(state.filters).filter(isActiveFilter).length;
    }

    function drillDimensions() {
        return (state.selectedDimensions.length ? state.selectedDimensions : state.dimensionColumns).filter(Boolean);
    }

    function autoStructureDimension() {
        const dimensions = drillDimensions();
        if (!dimensions.length) return "";

        const activeIndexes = dimensions
            .map((dimension, index) => ({ dimension, index }))
            .filter((item) => isActiveFilter(item.dimension))
            .map((item) => item.index);

        if (!activeIndexes.length) return dimensions[0];
        const nextIndex = Math.min(Math.max(...activeIndexes) + 1, dimensions.length - 1);
        return dimensions[nextIndex] || dimensions[0];
    }

    function renderAll() {
        renderDataStatus();
        renderTrendChart();
        renderMomChart();
        renderYearComparisonChart();
        renderStructureChart();
        renderConcentrationChart();
        renderHeatmapChart();
        renderMomHeatmapChart();
    }

    function renderDataStatus() {
        const status = byId("monthly-data-status");
        if (!status) return;
        const rows = currentRows();
        const filters = activeFilterCount();
        status.textContent = `${state.sourceName} · ${rows.length} 行${filters ? ` · ${filters} 个筛选` : ""}`;
    }

    function numericAxis(axis = {}) {
        return {
            tickformat: ",.0f",
            separatethousands: true,
            exponentformat: "none",
            ...axis
        };
    }

    function chartLayout(extra = {}) {
        const baseLayout = {
            paper_bgcolor: COLORS.paper,
            plot_bgcolor: COLORS.paper,
            font: { family: "PingFang SC, Microsoft YaHei, Arial, sans-serif", color: COLORS.text, size: 12 },
            margin: { l: 52, r: 20, t: 16, b: 52 },
            dragmode: false,
            clickmode: "none",
            xaxis: { tickfont: { color: COLORS.muted }, gridcolor: COLORS.grid, zeroline: false, fixedrange: true },
            yaxis: numericAxis({ tickfont: { color: COLORS.muted }, gridcolor: COLORS.grid, zerolinecolor: COLORS.grid, fixedrange: true }),
            hoverlabel: { bgcolor: "#ffffff", bordercolor: COLORS.grid, font: { color: COLORS.text } },
            showlegend: true,
            legend: { orientation: "h", y: -0.2, x: 0, font: { color: COLORS.muted }, itemclick: false, itemdoubleclick: false },
            ...extra
        };
        const layout = {
            ...baseLayout,
            legend: {
                ...(baseLayout.legend || {}),
                ...(extra.legend || {}),
                itemclick: false,
                itemdoubleclick: false
            },
            dragmode: false,
            clickmode: extra.clickmode || "none"
        };

        Object.keys(layout).forEach((key) => {
            if (/^[xy]axis\d*$/.test(key)) {
                layout[key] = {
                    ...(layout[key] || {}),
                    fixedrange: true
                };
            }
        });

        return layout;
    }

    function chartConfig() {
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

    function isCompactMonthAxis() {
        return typeof window !== "undefined" && window.matchMedia("(max-width: 700px)").matches;
    }

    function monthNumber(monthKey) {
        const month = Number(String(monthKey || "").split("-")[1]);
        return Number.isFinite(month) ? month : null;
    }

    function monthTickIndexes(months, latestIndex = months.length - 1) {
        const allIndexes = months.map((_, index) => index);
        if (months.length <= 6) return allIndexes;
        if (!isCompactMonthAxis() && months.length <= 12) return allIndexes;

        const visible = new Set([0]);
        months.forEach((month, index) => {
            const monthNo = monthNumber(month.key);
            const isQuarterStart = Number.isFinite(monthNo) ? (monthNo - 1) % 3 === 0 : index % 3 === 0;
            if (isQuarterStart) visible.add(index);
        });
        if (latestIndex >= 0) visible.add(latestIndex);
        if (latestIndex > 0 && visible.has(latestIndex - 1)) {
            const latestYear = String(months[latestIndex]?.key || "").slice(0, 4);
            const previousYear = String(months[latestIndex - 1]?.key || "").slice(0, 4);
            const previousMonthNo = monthNumber(months[latestIndex - 1]?.key);
            if (latestYear === previousYear && previousMonthNo !== 1) visible.delete(latestIndex - 1);
        }

        return allIndexes.filter((index) => visible.has(index));
    }

    function monthAxisFromIndexes(months, indexes, valueForIndex = (index) => index) {
        return {
            tickmode: "array",
            tickvals: indexes.map(valueForIndex),
            ticktext: indexes.map((index) => formatMonthShort(months[index]?.key)),
            tickangle: 0,
            automargin: true
        };
    }

    function groupedMonthAxis(months, xref = "x", axis = {}) {
        const x = months.map((_, index) => index);
        const tickIndexes = monthTickIndexes(months);
        const groups = [];

        months.forEach((month, index) => {
            const year = String(month.key || "").slice(0, 4);
            const current = groups.at(-1);
            if (!current || current.year !== year) {
                groups.push({ year, start: index, end: index });
            } else {
                current.end = index;
            }
        });

        const showYearGroups = groups.length > 1;
        const annotations = [];

        const yearDividers = showYearGroups ? groups.slice(1).map((group) => ({
            type: "line",
            xref,
            yref: "paper",
            x0: group.start - 0.5,
            x1: group.start - 0.5,
            y0: -0.14,
            y1: 1,
            line: { color: withAlpha(COLORS.text, 0.72), width: 1.4, dash: "dash" },
            layer: "above"
        })) : [];
        const shapes = yearDividers;

        return {
            x,
            axis: {
                type: "linear",
                ...monthAxisFromIndexes(months, tickIndexes, (index) => x[index]),
                range: [-0.5, Math.max(x.length - 0.5, 0.5)],
                tickfont: { color: COLORS.muted },
                gridcolor: COLORS.grid,
                zeroline: false,
                ...axis
            },
            annotations,
            shapes,
            groups
        };
    }

    function syncYearAxisOverlay(chartId, months, margins = {}) {
        const node = byId(chartId);
        if (!node) return;
        node.querySelector(".year-axis-overlay")?.remove();

        const groups = [];
        months.forEach((month, index) => {
            const year = String(month.key || "").slice(0, 4);
            const current = groups.at(-1);
            if (!current || current.year !== year) {
                groups.push({ year, start: index, end: index });
            } else {
                current.end = index;
            }
        });
        if (groups.length <= 1) return;

        const overlay = document.createElement("div");
        overlay.className = "year-axis-overlay";
        overlay.style.left = `${margins.l || 0}px`;
        overlay.style.right = `${margins.r || 0}px`;

        groups.forEach((group, index) => {
            const segment = document.createElement("div");
            segment.className = "year-axis-segment";
            segment.style.flexBasis = `${((group.end - group.start + 1) / months.length) * 100}%`;
            segment.style.background = index % 2 === 0 ? withAlpha(COLORS.blue, 0.16) : withAlpha(COLORS.orange, 0.16);
            segment.textContent = `${group.year}年`;
            overlay.appendChild(segment);
        });

        node.appendChild(overlay);
    }

    function plotAxisRef(axis, index) {
        return index === 0 ? axis : `${axis}${index + 1}`;
    }

    function layoutAxisKey(ref) {
        return `${ref[0]}axis${ref.length > 1 ? ref.slice(1) : ""}`;
    }

    function renderEmptyChart(id, message) {
        const node = byId(id);
        if (!node || !window.Plotly) return;
        window.Plotly.react(node, [], chartLayout({
            annotations: [{
                text: message,
                showarrow: false,
                x: 0.5,
                y: 0.5,
                xref: "paper",
                yref: "paper",
                font: { color: COLORS.muted, size: 14 }
            }],
            xaxis: { visible: false },
            yaxis: { visible: false },
            showlegend: false
        }), chartConfig());
    }

    function trendRowDomains(count) {
        if (count <= 1) return [[0.08, 1]];
        const bottom = 0.04;
        const top = 0.98;
        const gap = count > 6 ? 0.018 : 0.034;
        const rowHeight = (top - bottom - gap * (count - 1)) / count;
        return Array.from({ length: count }, (_, index) => {
            const rowTop = top - index * (rowHeight + gap);
            return [rowTop - rowHeight, rowTop];
        });
    }

    function trendSeriesForDefinition(item) {
        return item.mode === "unit" ? unitMetricSeries(item.metric) : metricSeries(item.metric);
    }

    function trendAxisTitle(item) {
        return item.mode === "unit" ? item.label : metricAxisTitle(item.metric);
    }

    function displayTrendValue(value, item) {
        if (item.mode === "unit") return formatNumber(value, Math.abs(value) >= 100 ? 0 : 2);
        return displayValue(value, item.metric);
    }

    function trendMetricIdentityText(item) {
        if (item.mode === "unit") {
            const volumeMetric = volumeMetricColumn() || "销量";
            return `<b>${escapeHtml(item.label)}</b><br><span style="font-size:10px;color:${COLORS.muted}">${escapeHtml(item.sourceLabel)} ÷ ${escapeHtml(volumeMetric)}</span>`;
        }
        return `<b>${escapeHtml(item.label)}（原值）</b><br><span style="font-size:10px;color:${COLORS.muted}">原始指标</span>`;
    }

    function setTrendChartHeight(count) {
        const node = byId("monthly-trend-chart");
        if (!node) return;
        node.style.height = `${Math.max(500, count * 152 + 96)}px`;
    }

    function renderTrendChart() {
        const metrics = buildTrendMetricDefinitions();
        const caption = byId("monthly-trend-caption");
        const unitCount = metrics.filter((item) => item.mode === "unit").length;
        if (caption) {
            caption.textContent = unitCount
                ? `第一段是销量原值，后面 ${unitCount} 段为总额指标除以销量后的单车趋势。`
                : `${state.selectedMetric || "指标"}月度走势。`;
        }
        if (!metrics.length) return renderEmptyChart("monthly-trend-chart", "暂无趋势数据");

        setTrendChartHeight(metrics.length);
        const rowDomains = trendRowDomains(metrics.length);
        const traces = [];
        const annotations = [];
        const axes = {};
        let monthAxisDecorations = { annotations: [], shapes: [], months: [] };

        metrics.forEach((item, index) => {
            const series = trendSeriesForDefinition(item);
            const xLabels = series.months.map((month) => month.label);
            const y = series.values.map((value) => item.mode === "unit" ? value : plotValue(value, item.metric));
            const finiteValues = y.filter(Number.isFinite);
            if (!finiteValues.length) return;

            const xRef = plotAxisRef("x", index);
            const yRef = plotAxisRef("y", index);
            const monthAxis = groupedMonthAxis(series.months, xRef, { showticklabels: index === metrics.length - 1 });
            const x = monthAxis.x;
            const xAxisKey = layoutAxisKey(xRef);
            const yAxisKey = layoutAxisKey(yRef);
            const latestIndex = y.reduce((latest, value, valueIndex) => Number.isFinite(value) ? valueIndex : latest, -1);
            const latestX = x[latestIndex];
            const latestY = y[latestIndex];
            const min = Math.min(...finiteValues);
            const max = Math.max(...finiteValues);
            const pad = Math.max((max - min) * 0.18, Math.abs(max || 1) * 0.04, 1);
            const lower = min - pad;
            const upper = max + pad;

            traces.push({
                type: "scatter",
                mode: "lines+markers",
                name: item.label,
                x,
                y,
                xaxis: xRef,
                yaxis: yRef,
                line: { color: item.color, width: 3, shape: "spline" },
                marker: { size: 6, color: item.color },
                customdata: xLabels,
                hovertemplate: item.mode === "unit"
                    ? `%{customdata}<br>${escapeHtml(item.label)}：%{y:,.2f}<br>${escapeHtml(item.sourceLabel)} / 销量<extra></extra>`
                    : `%{customdata}<br>${escapeHtml(item.label)}：%{y:,.2f}${axisUnitLabel(item.metric) ? ` ${axisUnitLabel(item.metric)}` : ""}<extra></extra>`
            });

            annotations.push({
                xref: "paper",
                yref: "paper",
                x: 0.01,
                y: rowDomains[index][1],
                text: trendMetricIdentityText(item),
                showarrow: false,
                align: "left",
                xanchor: "left",
                yanchor: "top",
                xshift: 4,
                yshift: -4,
                bgcolor: "rgba(255,255,255,0.9)",
                bordercolor: withAlpha(item.color, 0.42),
                borderpad: 5,
                font: { color: item.color, size: 11 }
            });

            if (!isCompactMonthAxis() && metrics.length <= 6) {
                annotations.push({
                    xref: xRef,
                    yref: yRef,
                    x: latestX,
                    y: latestY,
                    text: `本期 ${displayTrendValue(series.values[latestIndex], item)}`,
                    showarrow: false,
                    xanchor: "right",
                    yanchor: "bottom",
                    xshift: -6,
                    yshift: 8,
                    bgcolor: "rgba(255,255,255,0.88)",
                    bordercolor: withAlpha(item.color, 0.38),
                    borderpad: 4,
                    font: { color: item.color, size: 11 }
                });
            }

            axes[xAxisKey] = {
                ...monthAxis.axis,
                domain: [0, 1],
                anchor: yRef,
                matches: index === 0 ? undefined : "x"
            };
            if (index === metrics.length - 1) {
                monthAxisDecorations = { annotations: monthAxis.annotations, shapes: monthAxis.shapes, months: series.months };
            }
            axes[yAxisKey] = numericAxis({
                domain: rowDomains[index],
                title: trendAxisTitle(item),
                titlefont: { color: item.color, size: 11 },
                tickfont: { color: item.color },
                gridcolor: COLORS.grid,
                zerolinecolor: COLORS.grid,
                range: [lower, upper]
            });
        });

        if (!traces.length) return renderEmptyChart("monthly-trend-chart", "暂无趋势数据");

        const layoutMargins = { l: 72, r: 24, t: 34, b: 74 };
        window.Plotly.react("monthly-trend-chart", traces, chartLayout({
            margin: layoutMargins,
            showlegend: false,
            annotations: annotations.concat(monthAxisDecorations.annotations),
            shapes: monthAxisDecorations.shapes,
            ...axes
        }), chartConfig()).then(() => syncYearAxisOverlay("monthly-trend-chart", monthAxisDecorations.months, layoutMargins));
    }

    function renderMomChart() {
        const { months, valueByMonth } = indexedMonthValues();
        const caption = byId("monthly-mom-caption");
        const comparableYear = latestComparableYear(months, valueByMonth);
        const analysisMonths = comparableYear
            ? months.filter((month) => Number(month.key.slice(0, 4)) === comparableYear && valueByMonth.has(previousMonthKey(month.key)))
            : months.slice(1);
        if (caption) {
            caption.textContent = comparableYear
                ? `${comparableYear} 年${state.selectedMetric || "指标"}环比 / 同比变化率。`
                : `${state.selectedMetric || "指标"}环比变化率；上传去年同月数据后显示同比。`;
        }
        if (months.length <= 1) return renderEmptyChart("monthly-mom-chart", "至少需要两个月数据");
        if (!analysisMonths.length) return renderEmptyChart("monthly-mom-chart", "暂无环比同比数据");

        const points = analysisMonths.map((month) => {
            const current = valueByMonth.get(month.key);
            const previous = valueByMonth.get(previousMonthKey(month.key));
            const previousYear = valueByMonth.get(previousYearKey(month.key));
            const momRate = Number.isFinite(current) && Number.isFinite(previous) && previous !== 0 ? (current - previous) / Math.abs(previous) * 100 : null;
            const yoyRate = Number.isFinite(current) && Number.isFinite(previousYear) && previousYear !== 0 ? (current - previousYear) / Math.abs(previousYear) * 100 : null;
            return { month, current, momRate, yoyRate };
        });
        const monthAxis = groupedMonthAxis(points.map((point) => point.month));

        const traces = [{
            type: "scatter",
            mode: "lines+markers",
            name: "环比变化率",
            x: monthAxis.x,
            y: points.map((point) => point.momRate),
            line: { color: COLORS.blue, width: 3, shape: "spline" },
            marker: { size: 6 },
            customdata: points.map((point) => point.month.label),
            hovertemplate: `%{customdata}<br>环比变化率：%{y:.1f}%<extra></extra>`
        }];

        if (points.some((point) => Number.isFinite(point.yoyRate))) {
            traces.push({
                type: "scatter",
                mode: "lines+markers",
                name: "同比变化率",
                x: monthAxis.x,
                y: points.map((point) => point.yoyRate),
                line: { color: COLORS.orange, width: 3, shape: "spline" },
                marker: { size: 6 },
                customdata: points.map((point) => point.month.label),
                hovertemplate: `%{customdata}<br>同比变化率：%{y:.1f}%<extra></extra>`
            });
        }

        window.Plotly.react("monthly-mom-chart", traces, chartLayout({
            margin: { l: 58, r: 18, t: 16, b: 82 },
            xaxis: monthAxis.axis,
            yaxis: numericAxis({ title: "变化率", ticksuffix: "%", tickfont: { color: COLORS.muted }, gridcolor: COLORS.grid, zerolinecolor: COLORS.grid }),
            annotations: monthAxis.annotations,
            shapes: monthAxis.shapes,
            legend: { orientation: "h", y: -0.34, x: 0, font: { color: COLORS.muted } }
        }), chartConfig());
    }

    function renderYearComparisonChart() {
        const node = byId("monthly-cumulative-chart");
        if (!node) return;

        const { months, valueByMonth } = indexedMonthValues();
        const caption = byId("monthly-cumulative-caption");
        if (!months.length) return renderEmptyChart("monthly-cumulative-chart", "暂无同期数据");

        const years = Array.from(new Set(months.map((month) => Number(month.key.slice(0, 4))).filter(Number.isFinite))).sort((a, b) => a - b);
        const currentYear = latestComparableYear(months, valueByMonth) || years.at(-1);
        const previousYear = years.includes(currentYear - 1) ? currentYear - 1 : null;
        const monthLabels = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

        function valuesForYear(year) {
            const points = [];
            for (let month = 1; month <= 12; month++) {
                const key = `${year}-${String(month).padStart(2, "0")}`;
                points.push(valueByMonth.has(key) ? valueByMonth.get(key) : null);
            }
            return points;
        }

        const currentYearValues = valuesForYear(currentYear);
        const previousYearValues = previousYear ? valuesForYear(previousYear) : [];
        const latestCurrentMonthIndex = currentYearValues.reduce((latest, value, index) => value === null ? latest : index, -1);
        const comparisonMonths = monthLabels.map((_, index) => ({
            key: `${currentYear}-${String(index + 1).padStart(2, "0")}`
        }));
        const comparisonTickIndexes = monthTickIndexes(
            comparisonMonths,
            latestCurrentMonthIndex >= 0 ? latestCurrentMonthIndex : comparisonMonths.length - 1
        ).filter((index) => latestCurrentMonthIndex < 0 || index <= latestCurrentMonthIndex);

        const traces = [{
            type: "scatter",
            mode: "lines+markers",
            name: `${currentYear}`,
            x: monthLabels,
            y: currentYearValues.map((value) => value === null ? null : plotValue(value)),
            line: { color: COLORS.blue, width: 3, shape: "spline" },
            marker: { size: 6 },
            hovertemplate: `%{x}<br>${currentYear}：%{y:,.2f}${axisUnitLabel() ? ` ${axisUnitLabel()}` : ""}<extra></extra>`
        }];

        if (previousYear) {
            traces.push({
                type: "scatter",
                mode: "lines+markers",
                name: `${previousYear}`,
                x: monthLabels,
                y: previousYearValues.map((value) => value === null ? null : plotValue(value)),
                line: { color: COLORS.orange, width: 2.5, dash: "dot", shape: "spline" },
                marker: { size: 5 },
                hovertemplate: `%{x}<br>${previousYear}：%{y:,.2f}${axisUnitLabel() ? ` ${axisUnitLabel()}` : ""}<extra></extra>`
            });
        }

        if (caption) {
            caption.textContent = previousYear
                ? `${currentYear} 年与 ${previousYear} 年同月水平对比。`
                : `${currentYear} 年月度水平。`;
        }

        window.Plotly.react("monthly-cumulative-chart", traces, chartLayout({
            xaxis: {
                ...monthAxisFromIndexes(comparisonMonths, comparisonTickIndexes, (index) => monthLabels[index]),
                tickfont: { color: COLORS.muted },
                gridcolor: COLORS.grid,
                zeroline: false
            },
            yaxis: numericAxis({ title: axisUnitLabel(), tickfont: { color: COLORS.muted }, gridcolor: COLORS.grid, zerolinecolor: COLORS.grid })
        }), chartConfig());
    }

    function renderStructureChart() {
        const dimension = autoStructureDimension();
        const rows = currentRows();
        const { months } = monthSeries(rows);
        const caption = byId("monthly-structure-caption");
        if (!dimension || !months.length) return renderEmptyChart("monthly-structure-chart", "暂无结构数据");

        const categoryTotals = new Map();
        rows.forEach((row) => {
            const key = row.dimensions[dimension] || "未分类";
            categoryTotals.set(key, (categoryTotals.get(key) || 0) + Math.abs(row.metricValue));
        });
        const topCategories = Array.from(categoryTotals.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([key]) => key);
        const activeFilters = activeFilterCount();
        if (caption) {
            const prefix = activeFilters ? "按当前筛选自动下钻，" : "";
            caption.textContent = categoryTotals.size > topCategories.length
                ? `${prefix}展示${dimension} Top ${topCategories.length} + 其他占比。`
                : `${prefix}展示${dimension}占比随月份变化。`;
        }

        const monthAxis = groupedMonthAxis(months);
        const traces = topCategories.concat(categoryTotals.size > topCategories.length ? ["其他"] : []).map((category, index) => {
            const y = months.map((month) => {
                const monthRows = rows.filter((row) => row.period.key === month.key);
                const categoryRows = category === "其他"
                    ? monthRows.filter((row) => !topCategories.includes(row.dimensions[dimension] || "未分类"))
                    : monthRows.filter((row) => (row.dimensions[dimension] || "未分类") === category);
                return Math.max(0, aggregateRows(categoryRows));
            });

            return {
                type: "scatter",
                mode: "lines",
                stackgroup: "structure",
                groupnorm: index === 0 ? "percent" : undefined,
                name: category,
                x: monthAxis.x,
                y,
                customdata: months.map((month) => month.label),
                line: { color: palette(index), width: 0.5 },
                fillcolor: withAlpha(palette(index), 0.72),
                hovertemplate: `%{customdata}<br>${escapeHtml(category)}：%{y:.1f}%<extra></extra>`
            };
        });
        const layoutMargins = { l: 52, r: 20, t: 52, b: 74 };
        window.Plotly.react("monthly-structure-chart", traces, chartLayout({
            margin: layoutMargins,
            xaxis: monthAxis.axis,
            yaxis: numericAxis({ title: "占比", ticksuffix: "%", tickfont: { color: COLORS.muted }, gridcolor: COLORS.grid, zerolinecolor: COLORS.grid }),
            annotations: monthAxis.annotations,
            shapes: monthAxis.shapes,
            legend: { orientation: "h", y: 1.14, x: 0, yanchor: "bottom", font: { color: COLORS.muted } }
        }), chartConfig()).then(() => syncYearAxisOverlay("monthly-structure-chart", months, layoutMargins));
    }

    function renderHeatmapChart() {
        const dimension = autoStructureDimension();
        const rows = currentRows();
        const { months, valueByMonth } = indexedMonthValues(rows);
        const caption = byId("monthly-heatmap-caption");
        const comparableYear = latestComparableYear(months, valueByMonth);
        if (caption) {
            caption.textContent = comparableYear
                ? `${comparableYear} 年${dimension || "维度"}的${state.selectedMetric || "指标"}同比变化。`
                : `上传去年同月数据后显示${dimension || "维度"}同比热力图。`;
        }
        if (!dimension || !months.length) return renderEmptyChart("monthly-heatmap-chart", "暂无热力图数据");
        if (!comparableYear) return renderEmptyChart("monthly-heatmap-chart", "上传去年同月数据后显示同比热力图");

        const totals = new Map();
        rows.filter((row) => Number(row.period.key.slice(0, 4)) === comparableYear).forEach((row) => {
            const key = row.dimensions[dimension] || "未分类";
            totals.set(key, (totals.get(key) || 0) + Math.abs(row.metricValue));
        });
        const categories = Array.from(totals.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([key]) => key);

        const analysisMonths = months.filter((month) => Number(month.key.slice(0, 4)) === comparableYear && valueByMonth.has(previousYearKey(month.key)));
        const z = categories.map((category) => {
            return analysisMonths.map((month) => {
                const currentRows = rows.filter((row) => row.period.key === month.key && (row.dimensions[dimension] || "未分类") === category);
                const previousRows = rows.filter((row) => row.period.key === previousYearKey(month.key) && (row.dimensions[dimension] || "未分类") === category);
                const current = aggregateRows(currentRows);
                const previous = aggregateRows(previousRows);
                return previous !== 0 ? (current - previous) / Math.abs(previous) * 100 : null;
            });
        });
        const heatValues = z.flat().filter((value) => Number.isFinite(value));
        const maxAbs = Math.max(8, ...heatValues.map((value) => Math.abs(value)));
        const text = z.map((row) => row.map((value) => {
            if (!Number.isFinite(value)) return "无基准";
            return `${value >= 0 ? "+" : ""}${formatNumber(value, 0)}%`;
        }));
        const monthAxis = groupedMonthAxis(analysisMonths);
        const monthCustomData = categories.map(() => analysisMonths.map((month) => month.label));
        const compact = isCompactMonthAxis();

        window.Plotly.react("monthly-heatmap-chart", [{
            type: "heatmap",
            x: monthAxis.x,
            y: categories,
            z,
            text,
            customdata: monthCustomData,
            texttemplate: "%{text}",
            textfont: { color: COLORS.text, size: compact ? 9 : 11 },
            zmin: -maxAbs,
            zmax: maxAbs,
            zmid: 0,
            xgap: 2,
            ygap: 2,
            colorscale: [
                [0, "#b65f55"],
                [0.5, "#f7f3ea"],
                [1, "#788c5d"]
            ],
            colorbar: compact
                ? { title: "", ticksuffix: "%", thickness: 8, len: 0.62, x: 1.02, tickfont: { size: 9, color: COLORS.muted } }
                : { title: "同比变化", ticksuffix: "%" },
            hovertemplate: `%{y}<br>%{customdata}<br>同比变化：%{text}<extra></extra>`
        }], chartLayout({
            showlegend: false,
            margin: compact ? { l: 58, r: 30, t: 10, b: 36 } : { l: 88, r: 20, t: 16, b: 56 },
            xaxis: monthAxis.axis,
            yaxis: { title: compact ? "" : dimension, tickfont: { color: COLORS.muted, size: compact ? 10 : 12 }, gridcolor: COLORS.grid, zeroline: false, automargin: true },
            annotations: monthAxis.annotations,
            shapes: monthAxis.shapes
        }), chartConfig());
    }

    function renderMomHeatmapChart() {
        const dimension = autoStructureDimension();
        const rows = currentRows();
        const { months, valueByMonth } = indexedMonthValues(rows);
        const caption = byId("monthly-mom-heatmap-caption");
        const years = Array.from(new Set(months.map((month) => Number(month.key.slice(0, 4))).filter(Number.isFinite))).sort((a, b) => a - b);
        const comparableYear = latestComparableYear(months, valueByMonth) || years.at(-1);

        if (caption) {
            caption.textContent = comparableYear
                ? `${comparableYear} 年${dimension || "维度"}的${state.selectedMetric || "指标"}环比变化。`
                : `${dimension || "维度"}的${state.selectedMetric || "指标"}环比变化。`;
        }
        if (!dimension || !months.length) return renderEmptyChart("monthly-mom-heatmap-chart", "暂无环比热力图数据");
        if (!comparableYear) return renderEmptyChart("monthly-mom-heatmap-chart", "暂无环比热力图数据");

        const totals = new Map();
        rows.filter((row) => Number(row.period.key.slice(0, 4)) === comparableYear).forEach((row) => {
            const key = row.dimensions[dimension] || "未分类";
            totals.set(key, (totals.get(key) || 0) + Math.abs(row.metricValue));
        });
        const categories = Array.from(totals.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([key]) => key);
        const analysisMonths = months.filter((month) => Number(month.key.slice(0, 4)) === comparableYear && valueByMonth.has(previousMonthKey(month.key)));

        const z = categories.map((category) => {
            return analysisMonths.map((month) => {
                const currentRows = rows.filter((row) => row.period.key === month.key && (row.dimensions[dimension] || "未分类") === category);
                const previousRows = rows.filter((row) => row.period.key === previousMonthKey(month.key) && (row.dimensions[dimension] || "未分类") === category);
                const current = aggregateRows(currentRows);
                const previous = aggregateRows(previousRows);
                return previous !== 0 ? (current - previous) / Math.abs(previous) * 100 : null;
            });
        });
        const heatValues = z.flat().filter((value) => Number.isFinite(value));
        const maxAbs = Math.max(8, ...heatValues.map((value) => Math.abs(value)));
        const text = z.map((row) => row.map((value) => {
            if (!Number.isFinite(value)) return "无基准";
            return `${value >= 0 ? "+" : ""}${formatNumber(value, 0)}%`;
        }));
        const monthAxis = groupedMonthAxis(analysisMonths);
        const monthCustomData = categories.map(() => analysisMonths.map((month) => month.label));
        const compact = isCompactMonthAxis();

        window.Plotly.react("monthly-mom-heatmap-chart", [{
            type: "heatmap",
            x: monthAxis.x,
            y: categories,
            z,
            text,
            customdata: monthCustomData,
            texttemplate: "%{text}",
            textfont: { color: COLORS.text, size: compact ? 9 : 11 },
            zmin: -maxAbs,
            zmax: maxAbs,
            zmid: 0,
            xgap: 2,
            ygap: 2,
            colorscale: [
                [0, "#b65f55"],
                [0.5, "#f7f3ea"],
                [1, "#788c5d"]
            ],
            colorbar: compact
                ? { title: "", ticksuffix: "%", thickness: 8, len: 0.62, x: 1.02, tickfont: { size: 9, color: COLORS.muted } }
                : { title: "环比变化", ticksuffix: "%" },
            hovertemplate: `%{y}<br>%{customdata}<br>环比变化：%{text}<extra></extra>`
        }], chartLayout({
            showlegend: false,
            margin: compact ? { l: 58, r: 30, t: 10, b: 36 } : { l: 88, r: 20, t: 16, b: 56 },
            xaxis: monthAxis.axis,
            yaxis: { title: compact ? "" : dimension, tickfont: { color: COLORS.muted, size: compact ? 10 : 12 }, gridcolor: COLORS.grid, zeroline: false, automargin: true },
            annotations: monthAxis.annotations,
            shapes: monthAxis.shapes
        }), chartConfig());
    }

    function categoryShares(monthKey, dimension) {
        const rows = currentRows().filter((row) => row.period.key === monthKey);
        const totals = new Map();
        rows.forEach((row) => {
            const category = row.dimensions[dimension] || "未分类";
            totals.set(category, (totals.get(category) || 0) + Math.max(0, aggregateRows([row])));
        });
        const total = Array.from(totals.values()).reduce((sum, value) => sum + value, 0);
        if (!total) return null;
        return Array.from(totals.entries())
            .map(([category, value]) => ({ category, share: value / total }))
            .sort((a, b) => b.share - a.share);
    }

    function renderConcentrationChart() {
        const dimension = autoStructureDimension();
        const { months } = monthSeries();
        const caption = byId("monthly-concentration-caption");
        if (!dimension || !months.length) return renderEmptyChart("monthly-concentration-chart", "暂无结构集中度数据");

        const points = months.map((month) => {
            const shares = categoryShares(month.key, dimension);
            if (!shares?.length) return { month, topShare: null, concentration: null, topCategory: "-" };
            const concentration = shares.reduce((sum, item) => sum + item.share * item.share, 0) * 100;
            return {
                month,
                topShare: shares[0].share * 100,
                concentration,
                topCategory: shares[0].category
            };
        });

        if (!points.some((point) => Number.isFinite(point.topShare))) {
            return renderEmptyChart("monthly-concentration-chart", "暂无结构集中度数据");
        }
        if (caption) caption.textContent = `${dimension}头部占比和集中度变化，数值越高代表结构越集中。`;
        const monthAxis = groupedMonthAxis(points.map((point) => point.month));

        const layoutMargins = { l: 58, r: 58, t: 52, b: 74 };
        window.Plotly.react("monthly-concentration-chart", [
            {
                type: "bar",
                name: "头部占比",
                x: monthAxis.x,
                y: points.map((point) => point.topShare),
                customdata: points.map((point) => [point.month.label, point.topCategory]),
                marker: { color: withAlpha(COLORS.blue, 0.46), line: { color: COLORS.blue, width: 1 } },
                hovertemplate: `%{customdata[0]}<br>头部分类：%{customdata[1]}<br>头部占比：%{y:.1f}%<extra></extra>`
            },
            {
                type: "scatter",
                mode: "lines+markers",
                name: "集中度指数",
                x: monthAxis.x,
                y: points.map((point) => point.concentration),
                customdata: points.map((point) => point.month.label),
                yaxis: "y2",
                line: { color: COLORS.orange, width: 3, shape: "spline" },
                marker: { size: 6 },
                hovertemplate: `%{customdata}<br>集中度指数：%{y:.1f}<extra></extra>`
            }
        ], chartLayout({
            margin: layoutMargins,
            xaxis: monthAxis.axis,
            yaxis: numericAxis({ title: "头部占比", ticksuffix: "%", tickfont: { color: COLORS.blue }, gridcolor: COLORS.grid, zerolinecolor: COLORS.grid }),
            yaxis2: numericAxis({
                title: "集中度指数",
                tickfont: { color: COLORS.orange },
                titlefont: { color: COLORS.orange },
                overlaying: "y",
                side: "right",
                showgrid: false,
                zeroline: false
            }),
            annotations: monthAxis.annotations,
            shapes: monthAxis.shapes,
            legend: { orientation: "h", y: 1.14, x: 0, yanchor: "bottom", font: { color: COLORS.muted } }
        }), chartConfig()).then(() => syncYearAxisOverlay("monthly-concentration-chart", points.map((point) => point.month), layoutMargins));
    }

    function palette(index) {
        const colors = ["#5c8fba", "#d97757", "#788c5d", "#b98524", "#8f7ab8", "#6e9c8b", "#b65f55"];
        return colors[index % colors.length];
    }

    function withAlpha(hex, alpha) {
        const value = String(hex || "").replace("#", "");
        if (value.length !== 6) return hex;
        const r = parseInt(value.slice(0, 2), 16);
        const g = parseInt(value.slice(2, 4), 16);
        const b = parseInt(value.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function showMessage(text, type = "success") {
        const area = byId("monthly-message-area");
        if (!area) return;
        area.innerHTML = `<div class="message ${type}">${escapeHtml(text)}</div>`;
        window.clearTimeout(showMessage.timer);
        showMessage.timer = window.setTimeout(() => {
            area.innerHTML = "";
        }, 4500);
    }

    function loadRows(rows, sourceName) {
        const normalizedRows = compactRows(rows);
        if (!normalizedRows.length) {
            showMessage("没有读取到有效数据。", "error");
            return;
        }

        const inferred = inferColumns(normalizedRows);
        if (!inferred.monthColumn || !inferred.metricColumns.length || !volumeMetricColumn(inferred.metricColumns) || !analysisMetricColumns(inferred.metricColumns).length) {
            showMessage("需要月份列、销量列和至少一个总额指标列。", "error");
            return;
        }

        state.sourceRows = normalizedRows;
        state.sourceName = sourceName;
        state.headers = inferred.headers;
        state.monthColumn = inferred.monthColumn;
        state.yearColumn = inferred.yearColumn;
        state.metricColumns = inferred.metricColumns;
        state.dimensionColumns = inferred.dimensionColumns;
        state.selectedMetric = inferred.selectedMetric;
        state.selectedDimensions = inferred.selectedDimensions;
        state.filters = {};
        state.aggregation = "auto";
        state.unitScale = "raw";
        renderColumnControls();
        renderAll();
        showMessage(`已读取 ${normalizedRows.length} 行数据。`);
    }

    async function handleUpload(file) {
        if (!file) return;
        try {
            const buffer = await file.arrayBuffer();
            const workbook = window.XLSX.read(buffer, { type: "array", cellDates: true });
            const firstSheet = workbook.SheetNames[0];
            const sheet = workbook.Sheets[firstSheet];
            const sheetRows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false, blankrows: false });
            const rows = sheetRowsToObjects(sheetRows);
            loadRows(rows, file.name);
        } catch (error) {
            console.error(error);
            showMessage("文件解析失败，请检查表头和格式。", "error");
        }
    }

    function downloadCsv(rows = TEMPLATE_ROWS, filename = "分月指标趋势分析模板.csv") {
        const headers = Object.keys(rows[0] || {});
        const csv = [
            headers.join(","),
            ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))
        ].join("\n");
        downloadBlob(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), filename);
    }

    function csvCell(value) {
        const raw = String(value ?? "");
        if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
        return raw;
    }

    function downloadXlsx(rows = TEMPLATE_ROWS) {
        const templateRows = buildTemplateRows(rows);
        const headers = templateHeadersFor(rows);
        const worksheet = window.XLSX.utils.aoa_to_sheet(templateRows);
        worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(headers.length - 1, 0) } }];
        worksheet["!cols"] = headers.map((header) => ({ wch: Math.max(String(header).length + 6, 14) }));
        worksheet["!rows"] = [{ hpt: 42 }, { hpt: 6 }];
        if (worksheet.A1) {
            worksheet.A1.s = {
                font: { bold: true, color: { rgb: "6F4E00" } },
                fill: { fgColor: { rgb: "FFF7CC" } },
                alignment: { vertical: "center", wrapText: true }
            };
        }
        const workbook = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(workbook, worksheet, "分月数据");
        window.XLSX.writeFile(workbook, "分月指标趋势分析模板.xlsx");
    }

    function templateHeadersFor(rows = TEMPLATE_ROWS) {
        return Object.keys((safeArray(rows)[0]) || {}).length ? Object.keys(safeArray(rows)[0]) : TEMPLATE_HEADERS;
    }

    function buildTemplateRows(rows = TEMPLATE_ROWS) {
        const headers = templateHeadersFor(rows);
        return [
            [TEMPLATE_HEADER_NOTE],
            [],
            headers,
            ...safeArray(rows).map((row) => headers.map((header) => row?.[header] ?? ""))
        ];
    }

    function sheetRowsToObjects(sheetRows) {
        const rows = safeArray(sheetRows);
        const headerIndex = findTemplateHeaderRowIndex(rows);
        const headers = safeArray(rows[headerIndex]).map((cell) => String(cell ?? "").trim());

        return rows.slice(headerIndex + 1)
            .map((row) => {
                const item = {};
                headers.forEach((header, index) => {
                    if (!header) return;
                    item[header] = Array.isArray(row) && index < row.length ? row[index] : "";
                });
                return item;
            })
            .filter((row) => Object.values(row).some((value) => String(value ?? "").trim() !== ""));
    }

    function findTemplateHeaderRowIndex(rows) {
        const fallbackIndex = safeArray(rows).findIndex((row) => {
            const cells = rowCells(row);
            return cells.length > 0 && !isTemplateNoteRow(cells);
        });

        for (let index = 0; index < safeArray(rows).length; index++) {
            const cells = rowCells(rows[index]);
            if (!cells.length || isTemplateNoteRow(cells)) continue;
            if (cells.some(isMonthHeaderName) && cells.some(isVolumeMetricName)) return index;
        }

        return fallbackIndex >= 0 ? fallbackIndex : 0;
    }

    function rowCells(row) {
        return safeArray(row)
            .map((cell) => String(cell ?? "").trim())
            .filter(Boolean);
    }

    function isTemplateNoteRow(cells) {
        return cells.length === 1 && cells[0] === TEMPLATE_HEADER_NOTE;
    }

    function isMonthHeaderName(header) {
        const normalized = normalizeToken(header);
        return MONTH_ALIASES.some((alias) => normalizeToken(alias) === normalized);
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

    function resetFilters() {
        state.filters = {};
        closeExcelFilterMenus();
        renderFilterControls();
        renderAll();
        showMessage("筛选已重置。");
    }

    function initResponsiveMonthAxis() {
        let compactMonthAxis = isCompactMonthAxis();
        bindOnce(window, "resize", () => {
            const nextCompactMonthAxis = isCompactMonthAxis();
            if (nextCompactMonthAxis === compactMonthAxis) return;
            compactMonthAxis = nextCompactMonthAxis;
            renderAll();
        }, "monthAxisResize");
    }

    function initSidebar() {
        const sidebar = byId("monthly-sidebar");
        const toggle = byId("monthly-sidebar-toggle");
        const expand = byId("monthly-sidebar-expand");
        const backdrop = byId("monthly-sidebar-backdrop");
        const isMobile = () => window.matchMedia("(max-width: 900px)").matches;

        function collapse() {
            sidebar?.classList.add("collapsed");
            if (expand) expand.style.display = "inline-flex";
            if (backdrop) backdrop.classList.remove("visible");
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
            if (!isMobile()) {
                backdrop?.classList.remove("visible");
            }
        }, "sidebarResize");

        if (isMobile()) collapse();
    }

    function bindControls() {
        initExcelFilterDismiss();

        bindOnce(byId("monthly-file-input"), "change", (event) => {
            const file = event.target.files?.[0];
            void handleUpload(file);
            event.target.value = "";
        });

        const uploadZone = byId("monthly-upload-zone");
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

        bindOnce(byId("monthly-btn-csv-template"), "click", () => downloadCsv());
        bindOnce(byId("monthly-btn-xlsx-template"), "click", () => downloadXlsx());
        bindOnce(byId("monthly-btn-reset"), "click", resetFilters);
        bindOnce(byId("monthly-metric-select"), "change", (event) => {
            state.selectedMetric = event.target.value;
            renderAll();
        });
    }

    function initApp() {
        initSidebar();
        initResponsiveMonthAxis();
        bindControls();

        if (state.initialized) {
            renderAll();
            return;
        }
        state.initialized = true;
        loadRows(createSampleRows(), "示例数据");
    }

    window.MonthlyTrendModel = { initApp };
})();

if (typeof module !== "undefined" && module.exports) {
    module.exports = module.exports || {};
}
