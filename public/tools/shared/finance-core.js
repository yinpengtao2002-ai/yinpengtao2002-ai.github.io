(function attachFinanceCore(root, factory) {
    const financeCore = factory();
    if (typeof module !== "undefined" && module.exports) {
        module.exports = financeCore;
    }
    if (root) {
        root.FinanceCore = financeCore;
    }
})(typeof globalThis !== "undefined" ? globalThis : this, function createFinanceCore() {
    "use strict";

    const UNIT_SCALES = [
        { pattern: /千万元/i, multiplier: 10_000_000 },
        { pattern: /百万元/i, multiplier: 1_000_000 },
        { pattern: /亿元|亿/i, multiplier: 100_000_000 },
        { pattern: /万元|万/i, multiplier: 10_000 },
        { pattern: /千元/i, multiplier: 1_000 }
    ];
    const PERIOD_QUALIFIERS = [
        { key: "actual", order: 1, aliases: ["实际", "实绩", "actual", "actuals", "act"] },
        { key: "target", order: 2, aliases: ["目标", "考核", "target", "goal"] },
        { key: "budget", order: 3, aliases: ["预算", "budget", "bud"] },
        { key: "forecast", order: 4, aliases: ["预测", "预估", "滚动", "forecast", "fcst", "estimate"] },
        { key: "plan", order: 5, aliases: ["计划", "规划", "plan"] }
    ];
    const CHINESE_MONTHS = {
        一: 1,
        二: 2,
        三: 3,
        四: 4,
        五: 5,
        六: 6,
        七: 7,
        八: 8,
        九: 9,
        十: 10,
        十一: 11,
        十二: 12
    };

    function normalizeHeader(value) {
        return String(value ?? "")
            .trim()
            .toLowerCase()
            .replace(/[\s_\-./()（）]/g, "")
            .replace(/总额|金额|合计/g, "");
    }

    function findQualifier(value) {
        const normalized = normalizeHeader(value);
        if (!normalized) return null;
        return PERIOD_QUALIFIERS.find((qualifier) => qualifier.aliases.some((alias) => normalized === normalizeHeader(alias))) || null;
    }

    function buildPeriod(year, month, label, qualifierValue = "") {
        if (year !== null && (!Number.isInteger(year) || year < 1900 || year > 2999)) return null;
        if (!Number.isInteger(month) || month < 1 || month > 12) return null;
        const qualifier = qualifierValue ? findQualifier(qualifierValue) : null;
        if (qualifierValue && !qualifier) return null;
        const baseKey = year === null ? `M${String(month).padStart(2, "0")}` : `${year}-${String(month).padStart(2, "0")}`;
        const baseSort = year === null ? month : year * 12 + month;
        return {
            key: qualifier ? `${baseKey}__${qualifier.key}` : baseKey,
            label: String(label),
            sort: qualifier ? baseSort + qualifier.order / 100 : baseSort
        };
    }

    function excelSerialToPeriod(value) {
        if (!Number.isInteger(value) || value <= 20_000 || value >= 80_000) return null;
        const milliseconds = Date.UTC(1899, 11, 30) + value * 86_400_000;
        const date = new Date(milliseconds);
        if (!Number.isFinite(date.getTime())) return null;
        return buildPeriod(date.getUTCFullYear(), date.getUTCMonth() + 1, `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`);
    }

    function getChineseMonthPrefix(value) {
        const compact = String(value ?? "").replace(/\s/g, "");
        const names = Object.keys(CHINESE_MONTHS).sort((a, b) => b.length - a.length);
        for (const name of names) {
            if (compact === name || compact === `${name}月`) return { month: CHINESE_MONTHS[name], suffix: "" };
            if (compact.startsWith(`${name}月`)) return { month: CHINESE_MONTHS[name], suffix: compact.slice(`${name}月`.length) };
            if (compact.startsWith(name)) return { month: CHINESE_MONTHS[name], suffix: compact.slice(name.length) };
        }
        return null;
    }

    function normalizeFinancePeriod(value) {
        if (value instanceof Date && Number.isFinite(value.getTime())) {
            return buildPeriod(value.getFullYear(), value.getMonth() + 1, `${value.getFullYear()}年${value.getMonth() + 1}月`);
        }
        if (typeof value === "number" && Number.isFinite(value)) {
            const compact = Math.trunc(value);
            if (compact >= 190001 && compact <= 299912) {
                return buildPeriod(Math.trunc(compact / 100), compact % 100, String(value));
            }
            return excelSerialToPeriod(compact);
        }
        if (value === null || value === undefined || String(value).trim() === "") return null;

        const text = String(value).trim();
        let match = text.match(/^M(\d{1,2})__(actual|target|budget|forecast|plan)$/i);
        if (match) return buildPeriod(null, Number(match[1]), text, match[2]);
        match = text.match(/^(\d{4})-(\d{1,2})__(actual|target|budget|forecast|plan)$/i);
        if (match) return buildPeriod(Number(match[1]), Number(match[2]), text, match[3]);

        match = text.match(/^(\d{4})年\s*([一二三四五六七八九十]{1,3})月\s*(.*)$/);
        if (match) return buildPeriod(Number(match[1]), CHINESE_MONTHS[match[2]], text, match[3]);

        match = text.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?\s*(.*)$/)
            || text.match(/^(\d{4})\s*[mM]\s*(\d{1,2})\s*(.*)$/)
            || text.match(/^(\d{4})年?\s*-?\s*(\d{1,2})月\s*(.*)$/)
            || text.match(/^(\d{4})(\d{2})$/);
        if (match) return buildPeriod(Number(match[1]), Number(match[2]), text, match[3] || "");

        const chineseMonth = getChineseMonthPrefix(text);
        if (chineseMonth) return buildPeriod(null, chineseMonth.month, text, chineseMonth.suffix);

        match = text.match(/^(\d{1,2})\s*月\s*(.*)$/) || text.match(/^[mM]\s*(\d{1,2})(?:\s+|[-_/]+)?(.*)$/);
        if (match) return buildPeriod(null, Number(match[1]), text, match[2] || "");
        return null;
    }

    function parseFinanceNumber(value) {
        if (value === null || value === undefined) return { status: "blank", raw: value };
        if (typeof value === "number") {
            return Number.isFinite(value)
                ? { status: "valid", raw: value, value }
                : { status: "invalid", raw: value, reason: "not_finite" };
        }
        if (typeof value === "bigint") {
            const numeric = Number(value);
            return Number.isFinite(numeric)
                ? { status: "valid", raw: value, value: numeric }
                : { status: "invalid", raw: value, reason: "not_finite" };
        }
        if (typeof value !== "string") return { status: "invalid", raw: value, reason: "unsupported_type" };

        let text = value.trim();
        if (!text || /^[-—–]$/.test(text)) return { status: "blank", raw: value };
        let parenthesesNegative = false;
        if (/^\(.+\)$/.test(text)) {
            parenthesesNegative = true;
            text = text.slice(1, -1).trim();
        }

        const isPercent = /[%％]/.test(text);
        const multiplier = UNIT_SCALES.find((unit) => unit.pattern.test(text))?.multiplier ?? 1;
        const cleaned = text
            .replace(/[,，\s]/g, "")
            .replace(/[¥￥$€£]/g, "")
            .replace(/人民币|千万元|百万元|万元|亿元|千元|美元|欧元|港币|日元|亿|万|元|台|辆|件|个|套|pcs?|units?|rmb|cny|usd|eur|hkd|jpy/gi, "")
            .replace(/[%％]/g, "");
        if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(cleaned)) {
            return { status: "invalid", raw: value, reason: "not_numeric" };
        }
        let numeric = Number(cleaned);
        if (!Number.isFinite(numeric)) return { status: "invalid", raw: value, reason: "not_finite" };
        if (parenthesesNegative) numeric = -Math.abs(numeric);
        numeric *= multiplier;
        if (isPercent) numeric /= 100;
        if (!Number.isFinite(numeric)) return { status: "invalid", raw: value, reason: "not_finite" };
        return { status: "valid", raw: value, value: numeric };
    }

    function createCsvError(code, message) {
        const error = new Error(message);
        error.code = code;
        return error;
    }

    function parseRfc4180Csv(input, options = {}) {
        const text = String(input ?? "").replace(/^\uFEFF/, "");
        const maxBytes = options.maxBytes ?? 5 * 1024 * 1024;
        const maxRows = options.maxRows ?? 20_001;
        const maxColumns = options.maxColumns ?? 200;
        const maxCellCharacters = options.maxCellCharacters ?? 100_000;
        if (new TextEncoder().encode(text).byteLength > maxBytes) {
            throw createCsvError("csv_byte_limit", `CSV exceeds ${maxBytes} bytes`);
        }

        const rows = [];
        let row = [];
        let cell = "";
        let inQuotes = false;
        let justClosedQuote = false;
        const pushCell = () => {
            if (cell.length > maxCellCharacters) throw createCsvError("csv_cell_limit", "CSV cell is too large");
            row.push(cell);
            cell = "";
            justClosedQuote = false;
            if (row.length > maxColumns) throw createCsvError("csv_column_limit", `CSV exceeds ${maxColumns} columns`);
        };
        const pushRow = () => {
            pushCell();
            rows.push(row);
            row = [];
            if (rows.length > maxRows) throw createCsvError("csv_row_limit", `CSV exceeds ${maxRows} rows`);
        };

        for (let index = 0; index < text.length; index += 1) {
            const character = text[index];
            if (inQuotes) {
                if (character === '"') {
                    if (text[index + 1] === '"') {
                        cell += '"';
                        index += 1;
                    } else {
                        inQuotes = false;
                        justClosedQuote = true;
                    }
                } else {
                    cell += character;
                }
                continue;
            }
            if (justClosedQuote && character !== "," && character !== "\r" && character !== "\n") {
                throw createCsvError("csv_invalid_quote", "Unexpected content after a closing quote");
            }
            if (character === '"') {
                if (cell.length > 0) throw createCsvError("csv_invalid_quote", "Unexpected quote in an unquoted field");
                inQuotes = true;
            } else if (character === ",") {
                pushCell();
            } else if (character === "\r" || character === "\n") {
                if (character === "\r" && text[index + 1] === "\n") index += 1;
                pushRow();
            } else {
                cell += character;
                if (cell.length > maxCellCharacters) throw createCsvError("csv_cell_limit", "CSV cell is too large");
            }
        }
        if (inQuotes) throw createCsvError("csv_unclosed_quote", "CSV contains an unclosed quoted field");
        if (cell.length > 0 || row.length > 0 || !/[\r\n]$/.test(text)) pushRow();
        return rows;
    }

    function findHeader(headers, candidates) {
        const normalizedCandidates = candidates.map(normalizeHeader);
        return headers.find((header) => normalizedCandidates.includes(normalizeHeader(header))) || "";
    }

    function inferMetricAggregation(metric, headers = []) {
        const name = String(metric ?? "");
        const normalized = normalizeHeader(name);
        if (/期末|月末|年末|closing|ending|endofperiod|snapshot/i.test(name)) {
            return { mode: "snapshot", periodColumn: findHeader(headers, ["月份", "年月", "期间", "日期", "month", "period", "date"]) || "月份" };
        }
        if (/nps|满意|评分|score|转化率|留存率/i.test(name)) {
            return { mode: "non_aggregatable", reason: "rate_requires_source_counts" };
        }
        const ratioRules = [
            { pattern: /边际率|毛利率|marginrate|grossmarginrate/i, numerator: ["边际", "边际总额", "毛利", "毛利额", "margin", "grossmargin"], denominator: ["净收入", "营业收入", "收入", "revenue", "netrevenue"] },
            { pattern: /利润率|profitrate/i, numerator: ["利润", "利润总额", "profit"], denominator: ["净收入", "营业收入", "收入", "revenue", "netrevenue"] },
            { pattern: /成本率|costrate/i, numerator: ["成本", "成本总额", "cost"], denominator: ["净收入", "营业收入", "收入", "revenue", "netrevenue"] }
        ];
        const ratioRule = ratioRules.find((rule) => rule.pattern.test(normalized));
        if (ratioRule) {
            const numeratorColumn = findHeader(headers, ratioRule.numerator);
            const denominatorColumn = findHeader(headers, ratioRule.denominator);
            if (numeratorColumn && denominatorColumn) return { mode: "ratio", numeratorColumn, denominatorColumn };
            return { mode: "non_aggregatable", reason: "ratio_missing_components" };
        }
        if (/率|占比|比例|%|％|rate|ratio|平均|均价|单价|单车|单位|perunit/i.test(name)) {
            const weightColumn = findHeader(headers, ["销量", "销售量", "数量", "volume", "qty", "units"]);
            if (/平均|均价|单价|单车|单位|perunit/i.test(name) && weightColumn) {
                return { mode: "weighted_average", weightColumn };
            }
            return { mode: "non_aggregatable", reason: "ratio_missing_components" };
        }
        return { mode: "sum" };
    }

    function parsedValue(row, column) {
        const parsed = parseFinanceNumber(row?.[column]);
        return parsed.status === "valid" ? parsed.value : null;
    }

    function aggregateMetricRows(rows, aggregation, metric) {
        const sourceRows = Array.isArray(rows) ? rows : [];
        if (!aggregation || aggregation.mode === "non_aggregatable") return null;
        if (aggregation.mode === "sum") {
            let total = 0;
            for (const row of sourceRows) {
                const value = parsedValue(row, metric);
                if (value === null) continue;
                total += value;
            }
            return total;
        }
        if (aggregation.mode === "ratio") {
            const numerator = aggregateMetricRows(sourceRows, { mode: "sum" }, aggregation.numeratorColumn);
            const denominator = aggregateMetricRows(sourceRows, { mode: "sum" }, aggregation.denominatorColumn);
            return denominator ? numerator / denominator : null;
        }
        if (aggregation.mode === "weighted_average") {
            let weightedTotal = 0;
            let weightTotal = 0;
            for (const row of sourceRows) {
                const value = parsedValue(row, metric);
                const weight = parsedValue(row, aggregation.weightColumn);
                if (value === null || weight === null) continue;
                weightedTotal += value * weight;
                weightTotal += weight;
            }
            return weightTotal ? weightedTotal / weightTotal : null;
        }
        if (aggregation.mode === "snapshot") {
            let latest = null;
            for (let index = 0; index < sourceRows.length; index += 1) {
                const row = sourceRows[index];
                const period = normalizeFinancePeriod(row?.[aggregation.periodColumn]);
                const value = parsedValue(row, metric);
                if (!period || value === null) continue;
                if (!latest || period.sort > latest.sort || (period.sort === latest.sort && index > latest.index)) {
                    latest = { sort: period.sort, index, value };
                }
            }
            return latest?.value ?? null;
        }
        return null;
    }

    return {
        normalizeFinancePeriod,
        parseFinanceNumber,
        parseRfc4180Csv,
        inferMetricAggregation,
        aggregateMetricRows
    };
});
