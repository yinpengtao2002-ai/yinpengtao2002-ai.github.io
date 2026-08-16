(function initOperatingDetailTemplates(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root) root.FinanceOperatingDetailTemplates = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createOperatingDetailTemplates() {
    const OPERATING_DETAIL_HEADERS = [
        '月份',
        '大区',
        '国家',
        '品牌',
        '品牌市场',
        '经营模式',
        '业务单元',
        '车型',
        '燃油品类',
        '备注',
        '销量',
        '净收入',
        '成本',
        '边际'
    ];

    const OPERATING_DETAIL_INTERNAL_HEADERS = [
        '月份',
        '数据口径',
        ...OPERATING_DETAIL_HEADERS.slice(1)
    ];

    const OPERATING_DETAIL_SCENARIO_SHEET_HEADERS = OPERATING_DETAIL_HEADERS.slice();
    const OPERATING_DETAIL_DIMENSION_HEADERS = [
        '大区',
        '国家',
        '品牌',
        '品牌市场',
        '经营模式',
        '业务单元',
        '车型',
        '燃油品类'
    ];

    const OPERATING_DETAIL_TEMPLATE_NOTE =
        '可直接修改标题行；请保留“月份”和“销量”。“备注”用于记录业务解释，不参与默认下钻。销量列之前的业务字段会按表头自动识别为维度，可新增、删除或改名；销量列之后的数值列会识别为上传指标。模板提供净收入、成本、边际作为示例，也可以替换成任意质量指标。所有工作表中的单位必须保持一致，成本等扣减项建议按负数填写。';

    const OPERATING_DETAIL_FIELD_DICTIONARY_ROWS = [
        ['字段', '字段类型', '必填', '单位或格式', '正负号', '聚合方式', '指标角色', '说明'],
        ['月份', '期间', '是', 'YYYY-MM', '-', '不可汇总', '期间', '连续趋势、两期归因和预算实际对比的时间字段。'],
        ['大区', '维度', '否', '文本', '-', '分组', '维度', '示例经营区域，可改名、删除或替换。'],
        ['国家', '维度', '否', '文本', '-', '分组', '维度', '示例国家或市场，可改名、删除或替换。'],
        ['品牌', '维度', '否', '文本', '-', '分组', '维度', '示例品牌，可改名、删除或替换。'],
        ['品牌市场', '维度', '否', '文本', '-', '分组', '维度', '示例品牌定位或市场层级，可改名、删除或替换。'],
        ['经营模式', '维度', '否', '文本', '-', '分组', '维度', '示例经销、直营或大客户模式，可改名、删除或替换。'],
        ['业务单元', '维度', '否', '文本', '-', '分组', '维度', '示例业务线，可改名、删除或替换。'],
        ['车型', '维度', '否', '文本', '-', '分组', '维度', '示例产品或车型，可改名、删除或替换。'],
        ['燃油品类', '维度', '否', '文本', '-', '分组', '维度', '示例能源类型，可改名、删除或替换。'],
        ['备注', '说明', '否', '文本', '-', '不汇总', '忽略', '业务解释或口径说明，不参与默认计算和下钻。'],
        ['销量', '指标', '是', '辆、台或统一体量单位', '正数或0', '求和', '分母', '默认体量分母；同一工作簿内单位必须一致。'],
        ['净收入', '指标', '否', '统一金额单位', '正数、负数或0', '求和', '分子', '默认收入总额；可替换为其他可加总指标。'],
        ['成本', '指标', '否', '统一金额单位', '负数', '求和', '分子', '扣减项按负数填写，与收入相加得到边际。'],
        ['边际', '指标', '否', '统一金额单位', '正数、负数或0', '求和', '分子', '默认等于净收入加成本；可直接填报。']
    ];

    const OPERATING_DETAIL_MARKETS = [
        ['欧洲', '德国', 1.08],
        ['欧洲', '法国', 0.92],
        ['欧洲', '英国', 0.84],
        ['拉美', '墨西哥', 1.22],
        ['拉美', '巴西', 1.04],
        ['中东', '沙特', 0.72],
        ['亚太', '澳大利亚', 0.68],
        ['亚太', '泰国', 0.88]
    ];

    const OPERATING_DETAIL_BRANDS = [
        {
            brand: '品牌A',
            brandMarket: '主品牌',
            mode: '经销',
            unit: '全球主销',
            variants: [
                ['Atlas', '燃油', 0.94, 12.4, -8.6],
                ['Atlas', '插混', 0.36, 15.8, -11.2]
            ]
        },
        {
            brand: '品牌B',
            brandMarket: '新能源品牌',
            mode: '直营',
            unit: '新能源业务',
            variants: [
                ['Nova', '纯电', 0.44, 17.6, -13.4],
                ['Nova', '插混', 0.28, 15.1, -11.1]
            ]
        },
        {
            brand: '品牌C',
            brandMarket: '高端品牌',
            mode: '大客户',
            unit: '高端 SUV',
            variants: [
                ['Summit', '燃油', 0.22, 21.5, -15.7],
                ['Summit', '纯电', 0.12, 24.8, -20.4]
            ]
        },
        {
            brand: '品牌D',
            brandMarket: '商用品牌',
            mode: '经销',
            unit: '商用车业务',
            variants: [
                ['Cargo', '燃油', 0.31, 10.4, -9.2],
                ['Cargo', '纯电', 0.16, 13.2, -12.1]
            ]
        }
    ];

    function round(value, digits = 3) {
        const factor = 10 ** digits;
        return Math.round(value * factor) / factor;
    }

    function buildMonthKeys(startYear, startMonth, count) {
        return Array.from({ length: count }, (_, index) => {
            const monthIndex = startMonth - 1 + index;
            const year = startYear + Math.floor(monthIndex / 12);
            const month = (monthIndex % 12) + 1;
            return `${year}-${String(month).padStart(2, '0')}`;
        });
    }

    const MODEL_TEMPLATE_SAMPLE_PROFILES = {
        'monthly-trend': {
            months: buildMonthKeys(2025, 1, 18),
            businessKeyCount: 8
        },
        'profit-structure': {
            months: ['2025-06', '2025-09', '2025-12', '2026-01', '2026-03', '2026-06'],
            businessKeyCount: 12
        },
        'perspective-bi': {
            months: ['2025-06', '2025-09', '2025-12', '2026-01', '2026-03', '2026-06'],
            businessKeyCount: 12
        },
        'margin-analysis': {
            months: ['2026-05', '2026-06'],
            businessKeyCount: 12
        },
        'business-analysis': {
            months: buildMonthKeys(2026, 1, 6),
            businessKeyCount: 12
        },
        'finance-ai-assistant': {
            months: buildMonthKeys(2025, 1, 18),
            businessKeyCount: 8
        }
    };

    const MODEL_TEMPLATE_GUIDANCE = {
        'monthly-trend': '模板覆盖连续18个月，可直接演示环比、同比和跨年趋势。',
        'profit-structure': '模板覆盖多个期间和完整区域，用于比较规模、结构和单位质量。',
        'perspective-bi': '模板覆盖多个期间、区域和品牌，便于拖拽字段、筛选和透视探索。',
        'margin-analysis': '单车归因不需要填写预算/实际口径；请用“月份”选择基期和当期，同一业务键必须在两个期间都出现。',
        'business-analysis': '实际和预算分别填写在同名工作表中；两张表必须保留相同的业务键，不要把实际和预算写成明细行项目。',
        'finance-ai-assistant': '实际和预算分别填写在同名工作表中；连续月份越完整，AI 越容易回答环比、同比和变化来源。'
    };

    function createOperatingDetailSampleRows(options = {}) {
        const months = options.months || buildMonthKeys(2025, 1, 18);
        const rows = [];

        months.forEach((month) => {
            const [yearPart, monthPart] = String(month).split('-').map(Number);
            const monthIndex = (yearPart - 2025) * 12 + monthPart - 1;
            OPERATING_DETAIL_MARKETS.forEach(([region, country, countryFactor], countryIndex) => {
                OPERATING_DETAIL_BRANDS.forEach((brandConfig, brandIndex) => {
                    brandConfig.variants.forEach(([model, fuel, baseVolume, baseRevenue, baseCost], variantIndex) => {
                        const yearLift = month.startsWith('2026') ? 1.08 : 1;
                        const channelFactor = brandConfig.mode === '直营' ? 0.94 : brandConfig.mode === '大客户' ? 0.72 : 1;
                        const monthOfYear = monthIndex % 12;
                        const seasonal = 1 + monthOfYear * 0.022 + (countryIndex % 3) * 0.018 + variantIndex * 0.026;
                        const mixShift = 1 + (brandIndex - 1.5) * 0.04 + (countryIndex % 2 ? -0.025 : 0.025);
                        const currentYearMarginDrag = month.startsWith('2026') ? 1 + Math.max(0, monthOfYear - 2) * 0.006 : 1;
                        const volume = round(baseVolume * countryFactor * channelFactor * seasonal * mixShift * yearLift, 3);
                        const revenue = round(volume * baseRevenue * (1 + countryIndex * 0.012 + monthOfYear * 0.006), 3);
                        const costDrag = country === '巴西' || country === '沙特' ? 1.08 : country === '德国' ? 0.96 : 1;
                        const cost = round(volume * baseCost * costDrag * (1 + variantIndex * 0.018) * currentYearMarginDrag, 3);
                        const margin = round(revenue + cost, 3);

                        rows.push({
                            '月份': month,
                            '大区': region,
                            '国家': country,
                            '品牌': brandConfig.brand,
                            '品牌市场': brandConfig.brandMarket,
                            '经营模式': brandConfig.mode,
                            '业务单元': brandConfig.unit,
                            '车型': model,
                            '燃油品类': fuel,
                            '备注': '',
                            '销量': volume,
                            '净收入': revenue,
                            '成本': cost,
                            '边际': margin
                        });
                    });
                });
            });
        });

        return rows;
    }

    function operatingDetailBusinessKey(row, includeMonth = true) {
        const fields = includeMonth ? ['月份', ...OPERATING_DETAIL_DIMENSION_HEADERS] : OPERATING_DETAIL_DIMENSION_HEADERS;
        return fields.map((header) => String(row?.[header] ?? '')).join('|');
    }

    function selectBusinessKeys(referenceRows, count) {
        const rowsByCountry = new Map();
        OPERATING_DETAIL_MARKETS.forEach(([, country]) => rowsByCountry.set(country, []));
        referenceRows.forEach((row) => {
            if (!rowsByCountry.has(row['国家'])) rowsByCountry.set(row['国家'], []);
            rowsByCountry.get(row['国家']).push(row);
        });

        const countryGroups = Array.from(rowsByCountry.values()).filter((rows) => rows.length);
        const selected = [];
        const seen = new Set();
        let roundIndex = 0;

        while (selected.length < count && selected.length < referenceRows.length) {
            for (let countryIndex = 0; countryIndex < countryGroups.length && selected.length < count; countryIndex += 1) {
                const candidates = countryGroups[countryIndex];
                const candidate = candidates[(countryIndex + roundIndex * 3) % candidates.length];
                const key = operatingDetailBusinessKey(candidate, false);
                if (seen.has(key)) continue;
                seen.add(key);
                selected.push(key);
            }
            roundIndex += 1;
        }

        return new Set(selected);
    }

    function selectOperatingDetailSampleRows(options = {}) {
        const months = options.months || buildMonthKeys(2025, 1, 18);
        const businessKeyCount = Math.max(1, Number(options.businessKeyCount) || 8);
        const rows = createOperatingDetailSampleRows({ months });
        const referenceRows = rows.filter((row) => row['月份'] === months[0]);
        const selectedKeys = selectBusinessKeys(referenceRows, businessKeyCount);
        return rows.filter((row) => selectedKeys.has(operatingDetailBusinessKey(row, false)));
    }

    function getOperatingDetailTemplateRowsForModel(modelSlug) {
        const profile = MODEL_TEMPLATE_SAMPLE_PROFILES[modelSlug] || MODEL_TEMPLATE_SAMPLE_PROFILES['profit-structure'];
        return selectOperatingDetailSampleRows(profile).map((row) => ({ ...row }));
    }

    function stableHash(value) {
        let hash = 2166136261;
        const text = String(value || '');
        for (let index = 0; index < text.length; index += 1) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }

    function toInternalScenarioRow(row, scenarioLabel) {
        return OPERATING_DETAIL_INTERNAL_HEADERS.reduce((next, header) => {
            if (header === '数据口径') next[header] = scenarioLabel;
            else next[header] = row?.[header] ?? '';
            return next;
        }, {});
    }

    function createBudgetOperatingDetailRow(row) {
        const hash = stableHash(operatingDetailBusinessKey(row));
        const volumeFactor = 0.94 + (hash % 5) * 0.018;
        const revenueFactor = 0.96 + (Math.floor(hash / 5) % 4) * 0.016;
        const costFactor = 0.95 + (Math.floor(hash / 20) % 3) * 0.022;
        const revenue = round(Number(row?.['净收入'] || 0) * revenueFactor);
        const cost = round(Number(row?.['成本'] || 0) * costFactor);
        const budget = toInternalScenarioRow(row, '预算');
        budget['备注'] = row?.['备注'] || '';
        budget['销量'] = round(Number(row?.['销量'] || 0) * volumeFactor);
        budget['净收入'] = revenue;
        budget['成本'] = cost;
        budget['边际'] = round(revenue + cost);
        return budget;
    }

    function createBudgetOperatingDetailRows(actualRows = []) {
        return actualRows.flatMap((row) => {
            const actual = toInternalScenarioRow(row, '实际');
            actual['备注'] = row?.['备注'] || '';
            return [actual, createBudgetOperatingDetailRow(row)];
        });
    }

    function toScenarioSheetRow(row) {
        return OPERATING_DETAIL_SCENARIO_SHEET_HEADERS.reduce((next, header) => {
            next[header] = row?.[header] ?? '';
            return next;
        }, {});
    }

    function getOperatingDetailTemplateRows(limit = 24) {
        const rows = getOperatingDetailTemplateRowsForModel('margin-analysis');
        return rows.slice(0, Math.max(0, Number(limit) || rows.length));
    }

    function resolveTemplateRows(modelSlugOrLimit) {
        if (typeof modelSlugOrLimit === 'string') {
            return getOperatingDetailTemplateRowsForModel(modelSlugOrLimit);
        }
        return getOperatingDetailTemplateRows(modelSlugOrLimit);
    }

    function getBudgetOperatingDetailTemplateRows(modelSlugOrLimit = 'business-analysis') {
        return createBudgetOperatingDetailRows(resolveTemplateRows(modelSlugOrLimit));
    }

    function getBudgetScenarioSheetTemplateRows(scenario = 'actual', modelSlugOrLimit = 'business-analysis') {
        const scenarioLabel = scenario === 'budget' ? '预算' : '实际';
        return getBudgetOperatingDetailTemplateRows(modelSlugOrLimit)
            .filter((row) => row['数据口径'] === scenarioLabel)
            .map(toScenarioSheetRow);
    }

    function getOperatingDetailInstructionRowsForModel(modelSlug) {
        const rows = [
            ['项目', '说明'],
            ['数据表', '数据工作表第1行必须是表头，第2行开始填写明细；不要在表头前插入标题或说明。'],
            ['必填字段', '月份和销量必填；净收入、成本、边际至少保留一个可分析金额指标。'],
            ['业务维度', '大区、国家、品牌、品牌市场、经营模式、业务单元、车型、燃油品类都是示例，可改名、删除或新增。'],
            ['单位', '销量和金额可以使用适合业务的单位，但同一工作簿、同一指标必须保持一致。'],
            ['正负号', '收入通常填正数；成本、费用等扣减项填负数；0 是有效数值。'],
            ['聚合', '销量、净收入、成本、边际默认求和；单车或比率指标应由分子和分母重新计算，不直接求和。'],
            ['备注', '备注用于业务解释，不参与默认汇总和下钻。']
        ];
        const guidance = MODEL_TEMPLATE_GUIDANCE[modelSlug];
        if (guidance) rows.splice(2, 0, ['模型口径', guidance]);
        return rows;
    }

    return {
        MODEL_TEMPLATE_SAMPLE_PROFILES,
        OPERATING_DETAIL_DIMENSION_HEADERS,
        OPERATING_DETAIL_FIELD_DICTIONARY_ROWS,
        OPERATING_DETAIL_HEADERS,
        OPERATING_DETAIL_INTERNAL_HEADERS,
        OPERATING_DETAIL_SCENARIO_SHEET_HEADERS,
        OPERATING_DETAIL_TEMPLATE_NOTE,
        buildMonthKeys,
        createBudgetOperatingDetailRows,
        createOperatingDetailSampleRows,
        getBudgetOperatingDetailTemplateRows,
        getBudgetScenarioSheetTemplateRows,
        getOperatingDetailInstructionRowsForModel,
        getOperatingDetailTemplateRows,
        getOperatingDetailTemplateRowsForModel,
        operatingDetailBusinessKey,
        selectOperatingDetailSampleRows
    };
});
