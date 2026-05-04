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

    const MONTH_ALIASES = ["月份", "月度", "月", "期间", "年月", "会计期间", "month", "date", "period"];
    const YEAR_ALIASES = ["年份", "年度", "年", "year", "fiscalyear", "fy"];
    const PREFERRED_METRICS = ["利润", "毛利", "边际", "净收入", "收入", "销量", "数量"];
    const NON_DIMENSION_COLUMNS = ["备注", "说明", "单位", "口径", "版本", "数据类型", "类型", "scenario"];
    const TEMPLATE_ROWS = createSampleRows().slice(0, 18);

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
                    "净收入": revenue,
                    "成本": cost,
                    "边际总额": margin,
                    "边际率": margin / revenue,
                    "单车净收入": Math.round((revenue * 10000) / Math.max(volume, 1)),
                    "单车边际": Math.round((margin * 10000) / Math.max(volume, 1))
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
        let monthColumn = headers.find((header) => normalizedAliases.includes(normalizeToken(header))) || "";

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

        const metricColumns = headers.filter((header) => {
            if (header === monthColumn) return false;
            if (header === yearColumn) return false;
            const values = rows.slice(0, 80).map((row) => row[header]).filter((value) => value !== null && value !== undefined && String(value).trim() !== "");
            if (!values.length) return false;
            const numericCount = values.filter(isNumericLike).length;
            return numericCount / values.length >= 0.62;
        });

        const nonDimensionSet = new Set(NON_DIMENSION_COLUMNS.map(normalizeToken));
        const dimensionColumns = headers.filter((header) => {
            if (header === monthColumn) return false;
            if (header === yearColumn) return false;
            if (metricColumns.includes(header)) return false;
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
        for (const preferred of PREFERRED_METRICS) {
            const match = metricColumns.find((metric) => normalizeToken(metric).includes(normalizeToken(preferred)));
            if (match) return match;
        }
        return metricColumns[0] || "";
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
            return Object.entries(state.filters).every(([dimension, selectedValue]) => {
                if (!selectedValue || selectedValue === "__all__") return true;
                return row.dimensions[dimension] === selectedValue;
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

    function findMetricColumn(candidates) {
        const normalizedCandidates = candidates.map(normalizeToken);
        return state.metricColumns.find((metric) => normalizedCandidates.includes(normalizeToken(metric)))
            || state.metricColumns.find((metric) => normalizedCandidates.some((candidate) => normalizeToken(metric).includes(candidate) || candidate.includes(normalizeToken(metric))))
            || "";
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

    function coreTrendMetrics() {
        const marginMetric = findMetricColumn(["边际总额", "贡献边际", "毛利", "利润"]);
        const volumeMetric = findMetricColumn(["销量", "发车量", "销售量", "数量", "volume"]);
        const revenueMetric = findMetricColumn(["净收入", "收入", "营业收入", "revenue"]);
        const unitRevenueMetric = findMetricColumn(["单车净收入", "单车收入", "单台收入", "平均单价", "单价", "asp"]);
        const unitMarginMetric = findMetricColumn(["单车边际", "单车毛利", "单车利润", "单位边际", "unitmargin"]);
        const metrics = [
            volumeMetric ? { key: "volume", metric: volumeMetric, label: volumeMetric, color: COLORS.green } : null,
            unitRevenueMetric ? { key: "unitRevenue", metric: unitRevenueMetric, label: unitRevenueMetric, color: COLORS.orange } : revenueMetric ? { key: "revenue", metric: revenueMetric, label: revenueMetric, color: COLORS.orange } : null,
            unitMarginMetric ? { key: "unitMargin", metric: unitMarginMetric, label: unitMarginMetric, color: COLORS.blue } : marginMetric ? { key: "margin", metric: marginMetric, label: marginMetric, color: COLORS.blue } : null
        ].filter(Boolean);

        if (metrics.length) return metrics;
        return state.selectedMetric ? [{ key: "selected", metric: state.selectedMetric, label: state.selectedMetric, color: COLORS.blue }] : [];
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

    function formatRate(value) {
        if (!Number.isFinite(value)) return "-";
        return `${value >= 0 ? "+" : ""}${formatNumber(value * 100, 1)}%`;
    }

    function formatDelta(value) {
        if (!Number.isFinite(value)) return "-";
        return `${value >= 0 ? "+" : ""}${displayValue(value)}`;
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
        setSelectOptions(byId("monthly-month-column"), state.headers, state.monthColumn);
        setSelectOptions(byId("monthly-metric-select"), state.metricColumns, state.selectedMetric);
        renderDimensionControls();
    }

    function renderDimensionControls() {
        const picker = byId("monthly-dimension-picker");
        if (!picker) return;

        if (!state.dimensionColumns.length) {
            picker.innerHTML = `<p class="empty-note">当前数据没有识别到维度列。</p>`;
            byId("monthly-filter-grid").innerHTML = "";
            return;
        }

        picker.innerHTML = state.dimensionColumns.map((dimension) => {
            const checked = state.selectedDimensions.includes(dimension) ? "checked" : "";
            return `
                <label class="check-pill">
                    <input type="checkbox" value="${escapeHtml(dimension)}" ${checked} />
                    <span>${escapeHtml(dimension)}</span>
                </label>
            `;
        }).join("");

        picker.querySelectorAll("input[type='checkbox']").forEach((input) => {
            input.addEventListener("change", () => {
                const selected = Array.from(picker.querySelectorAll("input[type='checkbox']:checked")).map((item) => item.value);
                state.selectedDimensions = selected.length ? selected : state.dimensionColumns.slice(0, 1);
                Object.keys(state.filters).forEach((dimension) => {
                    if (!state.selectedDimensions.includes(dimension)) delete state.filters[dimension];
                });
                renderDimensionControls();
                renderAll();
            });
        });

        renderFilterControls();
    }

    function renderFilterControls() {
        const grid = byId("monthly-filter-grid");
        if (!grid) return;

        grid.innerHTML = state.selectedDimensions.map((dimension) => {
            const values = distinctDimensionValues(dimension);
            const current = state.filters[dimension] || "__all__";
            const options = [`<option value="__all__"${current === "__all__" ? " selected" : ""}>全部</option>`]
                .concat(values.map((value) => `<option value="${escapeHtml(value)}"${value === current ? " selected" : ""}>${escapeHtml(value)}</option>`))
                .join("");

            return `
                <label class="field">
                    <span>${escapeHtml(dimension)}</span>
                    <select class="input" data-filter-dimension="${escapeHtml(dimension)}">${options}</select>
                </label>
            `;
        }).join("");

        grid.querySelectorAll("select[data-filter-dimension]").forEach((select) => {
            select.addEventListener("change", () => {
                const dimension = select.dataset.filterDimension;
                state.filters[dimension] = select.value;
                renderAll();
            });
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

    function drillDimensions() {
        return (state.selectedDimensions.length ? state.selectedDimensions : state.dimensionColumns).filter(Boolean);
    }

    function autoStructureDimension() {
        const dimensions = drillDimensions();
        if (!dimensions.length) return "";

        const activeIndexes = dimensions
            .map((dimension, index) => ({ dimension, index, value: state.filters[dimension] }))
            .filter((item) => item.value && item.value !== "__all__")
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
        const filters = Object.values(state.filters).filter((value) => value && value !== "__all__").length;
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
        return {
            paper_bgcolor: COLORS.paper,
            plot_bgcolor: COLORS.paper,
            font: { family: "PingFang SC, Microsoft YaHei, Arial, sans-serif", color: COLORS.text, size: 12 },
            margin: { l: 52, r: 20, t: 16, b: 52 },
            xaxis: { tickfont: { color: COLORS.muted }, gridcolor: COLORS.grid, zeroline: false },
            yaxis: numericAxis({ tickfont: { color: COLORS.muted }, gridcolor: COLORS.grid, zerolinecolor: COLORS.grid }),
            hoverlabel: { bgcolor: "#ffffff", bordercolor: COLORS.grid, font: { color: COLORS.text } },
            showlegend: true,
            legend: { orientation: "h", y: -0.2, x: 0, font: { color: COLORS.muted } },
            ...extra
        };
    }

    function chartConfig() {
        return { responsive: true, displayModeBar: false };
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

    function renderTrendChart() {
        const metrics = coreTrendMetrics().slice(0, 3);
        const caption = byId("monthly-trend-caption");
        if (caption) caption.textContent = metrics.length > 1 ? `${metrics.map((item) => item.label).join("、")}分段展示，每段使用独立坐标轴。` : `${state.selectedMetric || "指标"}月度走势。`;
        if (!metrics.length) return renderEmptyChart("monthly-trend-chart", "暂无趋势数据");

        const rowDomains = metrics.length === 1
            ? [[0.08, 1]]
            : metrics.length === 2
                ? [[0.56, 1], [0.08, 0.48]]
                : [[0.72, 1], [0.38, 0.66], [0.04, 0.32]];
        const traces = [];
        const annotations = [];
        const axes = {};
        let monthAxisDecorations = { annotations: [], shapes: [], months: [] };

        metrics.forEach((item, index) => {
            const series = metricSeries(item.metric);
            const xLabels = series.months.map((month) => month.label);
            const y = series.values.map((value) => plotValue(value, item.metric));
            const finiteValues = y.filter(Number.isFinite);
            if (!finiteValues.length) return;

            const xRef = plotAxisRef("x", index);
            const yRef = plotAxisRef("y", index);
            const monthAxis = groupedMonthAxis(series.months, xRef, { showticklabels: index === metrics.length - 1 });
            const x = monthAxis.x;
            const xAxisKey = layoutAxisKey(xRef);
            const yAxisKey = layoutAxisKey(yRef);
            const latestIndex = y.length - 1;
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
                hovertemplate: `%{customdata}<br>${escapeHtml(item.label)}：%{y:,.2f}${axisUnitLabel(item.metric) ? ` ${axisUnitLabel(item.metric)}` : ""}<extra></extra>`
            });

            if (!isCompactMonthAxis()) {
                annotations.push({
                    xref: xRef,
                    yref: yRef,
                    x: latestX,
                    y: latestY,
                    text: `本期 ${displayValue(series.values[latestIndex], item.metric)}`,
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
                title: metricAxisTitle(item.metric),
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
        const activeFilters = Object.entries(state.filters).filter(([, value]) => value && value !== "__all__").length;
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
        if (!inferred.monthColumn || !inferred.metricColumns.length) {
            showMessage("需要至少一个月份列和一个数值指标列。", "error");
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
            const rows = window.XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
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
        const worksheet = window.XLSX.utils.json_to_sheet(rows);
        const workbook = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(workbook, worksheet, "分月数据");
        window.XLSX.writeFile(workbook, "分月指标趋势分析模板.xlsx");
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

    function exportSummary() {
        const { months, values } = monthSeries();
        if (!months.length) {
            showMessage("暂无可导出的摘要。", "error");
            return;
        }
        const rows = months.map((month, index) => {
            const previous = index > 0 ? values[index - 1] : 0;
            const delta = index > 0 ? values[index] - previous : 0;
            const rate = index > 0 && previous !== 0 ? delta / Math.abs(previous) : 0;
            return {
                "月份": month.label,
                "指标": state.selectedMetric,
                "数值": displayValue(values[index]),
                "环比变化": index > 0 ? formatDelta(delta) : "",
                "环比变化率": index > 0 ? formatRate(rate) : ""
            };
        });
        downloadCsv(rows, "分月指标趋势分析摘要.csv");
    }

    function resetFilters() {
        state.filters = {};
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

        bindOnce(byId("monthly-btn-demo"), "click", () => loadRows(createSampleRows(), "示例数据"));
        bindOnce(byId("monthly-btn-csv-template"), "click", () => downloadCsv());
        bindOnce(byId("monthly-btn-xlsx-template"), "click", () => downloadXlsx());
        bindOnce(byId("monthly-btn-reset"), "click", resetFilters);
        bindOnce(byId("monthly-btn-export"), "click", exportSummary);

        bindOnce(byId("monthly-month-column"), "change", (event) => {
            state.monthColumn = event.target.value;
            renderAll();
        });
        bindOnce(byId("monthly-metric-select"), "change", (event) => {
            state.selectedMetric = event.target.value;
            renderAll();
        });
    }

    function initApp() {
        if (state.initialized) {
            renderAll();
            return;
        }
        state.initialized = true;
        initSidebar();
        initResponsiveMonthAxis();
        bindControls();
        loadRows(createSampleRows(), "示例数据");
    }

    window.MonthlyTrendModel = { initApp };
})();

if (typeof module !== "undefined" && module.exports) {
    module.exports = module.exports || {};
}
