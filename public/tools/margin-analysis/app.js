/**
 * 单车边际变动归因分析 - Unit Margin Attribution Analysis
 * HTML/JS 版本
 */

// ==================== 全局状态 ====================
const AppState = {
    dataLoaded: false,
    df: null,              // 原始数据数组 (Array of Objects)
    months: [],            // 可用月份
    baseMonth: null,
    currMonth: null,
    drillOrder: ['Dim_A', 'Dim_B', 'Dim_C'],
    selectedDims: {
        Dim_A: null, Dim_B: null, Dim_C: null,
        Dim_D: null, Dim_E: null
    },
    customDimNames: {
        Dim_A: '大区', Dim_B: '国家', Dim_C: '车型',
        Dim_D: '燃油品类', Dim_E: '品牌'
    },
    availableDimsInData: []
};

const ALL_DIMENSIONS = ['Dim_A', 'Dim_B', 'Dim_C', 'Dim_D', 'Dim_E'];
const PLOT_FONT_FAMILY = 'PingFang SC, Microsoft YaHei, Helvetica Neue, Arial, sans-serif';

const DIM_ICONS = {
    Dim_A: '🌍', Dim_B: '🏳️', Dim_C: '🚗',
    Dim_D: '🏷️', Dim_E: '🏢'
};

const TEMPLATE_HEADERS = [
    'Month', 'Dim_A', 'Dim_B', 'Dim_C', 'Dim_D', 'Dim_E',
    'Sales Volume', 'Total Margin'
];


// ==================== DOM Ready ====================
document.addEventListener("DOMContentLoaded", () => {
    initSidebarToggle();
    initFileUpload();
    initTemplateDownloads();
    initDemoButton();
    initResetFilter();
    initMonthSelectors();

    // 手机端自动加载示例数据并收起侧边栏
    if (isMobile()) {
        const demoData = generateDemoData();
        processLoadedData(demoData, "示例数据");
        // 收起侧边栏
        const sidebar = document.getElementById("sidebar");
        const expandBtn = document.getElementById("sidebar-expand");
        sidebar.classList.add("collapsed");
        expandBtn.style.display = "flex";
    }
});

// 检测是否为手机端
function isMobile() {
    return window.innerWidth <= 768 ||
           /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// ==================== 侧边栏收折 ====================
function initSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const expandBtn = document.getElementById('sidebar-expand');

    toggleBtn.addEventListener('click', () => {
        sidebar.classList.add('collapsed');
        expandBtn.style.display = 'flex';
    });

    expandBtn.addEventListener('click', () => {
        sidebar.classList.remove('collapsed');
        expandBtn.style.display = 'none';
    });
}


// ==================== 文件上传 ====================
function initFileUpload() {
    // 初始态上传
    setupUploadArea('file-upload-area', 'file-input');
    // 已加载态上传
    setupUploadArea('file-upload-area-loaded', 'file-input-loaded');
}

function setupUploadArea(areaId, inputId) {
    const area = document.getElementById(areaId);
    const input = document.getElementById(inputId);
    if (!area || !input) return;

    // 拖拽支持
    area.addEventListener('dragover', (e) => {
        e.preventDefault();
        area.classList.add('drag-over');
    });
    area.addEventListener('dragleave', () => {
        area.classList.remove('drag-over');
    });
    area.addEventListener('drop', (e) => {
        e.preventDefault();
        area.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    // 点击上传
    input.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
}

function handleFileUpload(file) {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
        // CSV 文件: 读取文本后解析
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const rows = parseCSV(text);
                processLoadedData(rows, file.name);
            } catch (err) {
                showMessage('error', `CSV 解析失败: ${err.message}`);
            }
        };
        reader.readAsText(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Excel 文件: 使用 SheetJS 解析
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(firstSheet);
                processLoadedData(rows, file.name);
            } catch (err) {
                showMessage('error', `Excel 解析失败: ${err.message}`);
            }
        };
        reader.readAsArrayBuffer(file);
    } else {
        showMessage('error', '不支持的文件格式，请上传 CSV 或 Excel 文件');
    }
}


// ==================== 示例格式下载 ====================
function initTemplateDownloads() {
    document.querySelectorAll('[data-template-format]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            downloadTemplate(btn.dataset.templateFormat);
        });
    });
}

function getTemplateRows() {
    return [
        { Month: '2025-01', Dim_A: '亚太区', Dim_B: '中国', Dim_C: 'SUV-旗舰', Dim_D: '燃油', Dim_E: '品牌A', 'Sales Volume': 5000, 'Total Margin': 15000000 },
        { Month: '2025-01', Dim_A: '欧洲区', Dim_B: '德国', Dim_C: 'Sedan-经典', Dim_D: '混动', Dim_E: '品牌B', 'Sales Volume': 2500, 'Total Margin': 5500000 },
        { Month: '2025-02', Dim_A: '亚太区', Dim_B: '中国', Dim_C: 'SUV-旗舰', Dim_D: '燃油', Dim_E: '品牌A', 'Sales Volume': 6200, 'Total Margin': 19840000 },
        { Month: '2025-02', Dim_A: '欧洲区', Dim_B: '德国', Dim_C: 'Sedan-经典', Dim_D: '混动', Dim_E: '品牌B', 'Sales Volume': 2200, 'Total Margin': 4620000 }
    ];
}

function downloadTemplate(format) {
    if (format === 'xlsx') {
        downloadXlsxTemplate();
        return;
    }
    downloadCsvTemplate();
}

function downloadCsvTemplate() {
    const rows = [
        TEMPLATE_HEADERS,
        ...getTemplateRows().map(row => TEMPLATE_HEADERS.map(header => row[header] ?? ''))
    ];
    const csv = rows.map(row => row.map(escapeCsvCell).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, 'margin-analysis-template.csv');
}

function downloadXlsxTemplate() {
    if (typeof XLSX === 'undefined') {
        showMessage('error', 'Excel 模板组件未加载，请先下载 CSV 模板');
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(getTemplateRows(), { header: TEMPLATE_HEADERS });
    worksheet['!cols'] = TEMPLATE_HEADERS.map(header => ({ wch: Math.max(header.length + 2, 14) }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '示例格式');
    XLSX.writeFile(workbook, 'margin-analysis-template.xlsx');
}

function escapeCsvCell(value) {
    const text = String(value ?? '');
    if (/[",\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}


// ==================== CSV 解析 ====================
function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) throw new Error('CSV 文件至少需要标题行和一行数据');

    const headers = parseCSVLine(lines[0]);
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const values = parseCSVLine(line);
        const row = {};
        headers.forEach((h, idx) => {
            row[h] = idx < values.length ? values[idx] : '';
        });
        rows.push(row);
    }

    return rows;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
                if (i + 1 < line.length && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                result.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
    }
    result.push(current.trim());
    return result;
}


// ==================== 数据处理管线 ====================
function processLoadedData(rows, sourceName) {
    if (!rows || rows.length === 0) {
        showMessage('error', '数据为空，请检查文件内容');
        return;
    }

    // 1. 标准化列名
    const columnMapping = buildColumnMapping();
    rows = rows.map(row => {
        const newRow = {};
        for (const [key, value] of Object.entries(row)) {
            const normalizedKey = columnMapping[key.trim()] || key.trim();
            newRow[normalizedKey] = value;
        }
        return newRow;
    });

    // 2. 校验必要列
    const sampleKeys = Object.keys(rows[0]);
    const requiredCols = ['Month', 'Sales Volume', 'Total Margin'];
    const missingCols = requiredCols.filter(c => !sampleKeys.includes(c));
    const dimCols = ALL_DIMENSIONS.filter(d => sampleKeys.includes(d));

    if (dimCols.length === 0) {
        showMessage('error', `缺少维度列: 请至少包含 Dim_A。当前列名: ${sampleKeys.join(', ')}`);
        return;
    }
    if (missingCols.length > 0) {
        showMessage('error', `缺少必要列: ${missingCols.join(', ')}。当前列名: ${sampleKeys.join(', ')}`);
        return;
    }

    // 3. 清理数值 & 类型转换
    rows = rows.map(row => {
        row['Sales Volume'] = cleanNumeric(row['Sales Volume']);
        row['Total Margin'] = cleanNumeric(row['Total Margin']);
        row['Month'] = String(row['Month']).trim();
        dimCols.forEach(d => {
            row[d] = String(row[d] || '').trim();
        });
        return row;
    });

    // 4. 移除完全空行 (销量和边际都为 0)
    rows = rows.filter(r => r['Sales Volume'] !== 0 || r['Total Margin'] !== 0);

    if (rows.length === 0) {
        showMessage('error', '数据清理后为空，请检查数据格式');
        return;
    }

    // 5. 存储并切换 UI
    AppState.df = rows;
    AppState.availableDimsInData = dimCols;

    // 提取月份
    const monthSet = new Set(rows.map(r => r['Month']));
    AppState.months = Array.from(monthSet).sort();

    if (AppState.months.length < 2) {
        showMessage('error', '需要至少两个月份的数据');
        return;
    }

    // 默认基期和当期
    AppState.baseMonth = AppState.months[0];
    AppState.currMonth = AppState.months[Math.min(1, AppState.months.length - 1)];

    // 默认下钻顺序: 取前3个可用维度
    AppState.drillOrder = dimCols.slice(0, 3);

    // 重置维度筛选
    AppState.selectedDims = {};
    ALL_DIMENSIONS.forEach(d => AppState.selectedDims[d] = null);

    showMessage('success', `✅ 数据已加载 (${sourceName}): ${rows.length} 行, ${AppState.months.length} 个月份`);
    onDataLoaded();
}

function buildColumnMapping() {
    const map = {};
    // 月份
    ['月份', 'month', 'Month'].forEach(k => map[k] = 'Month');
    // 维度
    ['Dim_A', 'dim_a', 'DimA'].forEach(k => map[k] = 'Dim_A');
    ['Dim_B', 'dim_b', 'DimB'].forEach(k => map[k] = 'Dim_B');
    ['Dim_C', 'dim_c', 'DimC'].forEach(k => map[k] = 'Dim_C');
    ['Dim_D', 'dim_d', 'DimD'].forEach(k => map[k] = 'Dim_D');
    ['Dim_E', 'dim_e', 'DimE'].forEach(k => map[k] = 'Dim_E');
    // 销量
    ['销量', 'sales volume', 'salesvolume', 'Sales Volume', 'SalesVolume', 'sales_volume'].forEach(k => map[k] = 'Sales Volume');
    // 边际总额
    ['边际总额', 'total margin', 'totalmargin', 'Total Margin', 'TotalMargin', 'total_margin'].forEach(k => map[k] = 'Total Margin');
    return map;
}

function cleanNumeric(val) {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    let s = String(val);
    s = s.replace(/,/g, '').replace(/\s/g, '')
         .replace(/¥/g, '').replace(/\$/g, '').replace(/￥/g, '');
    if (['', 'nan', 'None', 'null', '-', 'undefined'].includes(s)) return 0;
    const n = Number(s);
    return isNaN(n) ? 0 : n;
}


// ==================== 示例数据 ====================
function initDemoButton() {
    const btn = document.getElementById('btn-load-demo');
    if (btn) {
        btn.addEventListener('click', () => {
            const demoData = generateDemoData();
            processLoadedData(demoData, '示例数据');
        });
    }
}

function generateDemoData() {
    return [
        // 2025-01 基期数据
        // 亚太区
        { Month: '2025-01', Dim_A: '亚太区', Dim_B: '中国', Dim_C: 'SUV-旗舰', 'Sales Volume': 5000, 'Total Margin': 15000000 },
        { Month: '2025-01', Dim_A: '亚太区', Dim_B: '中国', Dim_C: 'Sedan-经典', 'Sales Volume': 3500, 'Total Margin': 7000000 },
        { Month: '2025-01', Dim_A: '亚太区', Dim_B: '日本', Dim_C: 'SUV-旗舰', 'Sales Volume': 2000, 'Total Margin': 6400000 },
        { Month: '2025-01', Dim_A: '亚太区', Dim_B: '日本', Dim_C: 'EV-新能源', 'Sales Volume': 1500, 'Total Margin': 5250000 },
        // 欧洲区
        { Month: '2025-01', Dim_A: '欧洲区', Dim_B: '德国', Dim_C: 'SUV-旗舰', 'Sales Volume': 3000, 'Total Margin': 10500000 },
        { Month: '2025-01', Dim_A: '欧洲区', Dim_B: '德国', Dim_C: 'Sedan-经典', 'Sales Volume': 2500, 'Total Margin': 5500000 },
        { Month: '2025-01', Dim_A: '欧洲区', Dim_B: '法国', Dim_C: 'EV-新能源', 'Sales Volume': 1800, 'Total Margin': 5940000 },
        // 美洲区
        { Month: '2025-01', Dim_A: '美洲区', Dim_B: '美国', Dim_C: 'SUV-旗舰', 'Sales Volume': 4000, 'Total Margin': 14000000 },
        { Month: '2025-01', Dim_A: '美洲区', Dim_B: '美国', Dim_C: 'Pickup-皮卡', 'Sales Volume': 2800, 'Total Margin': 8400000 },
        { Month: '2025-01', Dim_A: '美洲区', Dim_B: '巴西', Dim_C: 'Sedan-经典', 'Sales Volume': 1200, 'Total Margin': 1800000 },

        // 2025-02 当期数据 (包含结构变化和费率变化)
        // 亚太区 - 中国SUV增长，单车边际提升; 日本EV占比提升
        { Month: '2025-02', Dim_A: '亚太区', Dim_B: '中国', Dim_C: 'SUV-旗舰', 'Sales Volume': 6200, 'Total Margin': 19840000 },
        { Month: '2025-02', Dim_A: '亚太区', Dim_B: '中国', Dim_C: 'Sedan-经典', 'Sales Volume': 3200, 'Total Margin': 6080000 },
        { Month: '2025-02', Dim_A: '亚太区', Dim_B: '日本', Dim_C: 'SUV-旗舰', 'Sales Volume': 1800, 'Total Margin': 5580000 },
        { Month: '2025-02', Dim_A: '亚太区', Dim_B: '日本', Dim_C: 'EV-新能源', 'Sales Volume': 2200, 'Total Margin': 8140000 },
        // 欧洲区 - 德国整体下滑，法国EV大增
        { Month: '2025-02', Dim_A: '欧洲区', Dim_B: '德国', Dim_C: 'SUV-旗舰', 'Sales Volume': 2600, 'Total Margin': 8580000 },
        { Month: '2025-02', Dim_A: '欧洲区', Dim_B: '德国', Dim_C: 'Sedan-经典', 'Sales Volume': 2200, 'Total Margin': 4620000 },
        { Month: '2025-02', Dim_A: '欧洲区', Dim_B: '法国', Dim_C: 'EV-新能源', 'Sales Volume': 2800, 'Total Margin': 10080000 },
        // 美洲区 - 美国皮卡需求旺，巴西新增SUV
        { Month: '2025-02', Dim_A: '美洲区', Dim_B: '美国', Dim_C: 'SUV-旗舰', 'Sales Volume': 4200, 'Total Margin': 14700000 },
        { Month: '2025-02', Dim_A: '美洲区', Dim_B: '美国', Dim_C: 'Pickup-皮卡', 'Sales Volume': 3500, 'Total Margin': 11200000 },
        { Month: '2025-02', Dim_A: '美洲区', Dim_B: '巴西', Dim_C: 'Sedan-经典', 'Sales Volume': 1000, 'Total Margin': 1400000 },
        { Month: '2025-02', Dim_A: '美洲区', Dim_B: '巴西', Dim_C: 'SUV-旗舰', 'Sales Volume': 800, 'Total Margin': 2000000 },
    ];
}


// ==================== 消息提示 ====================
function showMessage(type, text) {
    // 移除已有消息
    const existing = document.querySelector('.msg-success, .msg-error');
    if (existing) existing.remove();

    const div = document.createElement('div');
    div.className = type === 'success' ? 'msg-success' : 'msg-error';
    div.textContent = text;

    // 放在侧边栏当前可见的数据中心区块里
    const initSection = document.getElementById('data-center-init');
    const loadedSection = document.getElementById('data-center-loaded');
    const target = (initSection && initSection.style.display !== 'none') ? initSection : loadedSection;
    if (target) {
        target.appendChild(div);
    }

    // 3 秒后自动移除
    setTimeout(() => { if (div.parentNode) div.remove(); }, 5000);
}


// ==================== UI 切换: 数据加载后 ====================
function onDataLoaded() {
    AppState.dataLoaded = true;

    // 切换数据中心显示
    document.getElementById('data-center-init').style.display = 'none';
    document.getElementById('data-center-loaded').style.display = 'block';

    // 显示侧边栏其他区块
    document.getElementById('dim-config-section').style.display = 'block';
    document.getElementById('period-section').style.display = 'block';
    document.getElementById('drill-order-section').style.display = 'block';
    document.getElementById('drill-filter-section').style.display = 'block';

    // 切换主内容区
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('analysis-area').style.display = 'block';
    document.getElementById('pvm-assumptions').style.display = 'block';

    // 填充月份选择器
    populateMonthSelectors();

    // 填充维度配置
    populateDimConfig();

    // 填充下钻顺序选择器
    populateDrillOrder();

    // 填充维度筛选器
    populateDrillFilters();

    // 触发初始计算
    triggerUpdate();
}


// ==================== 月份选择器 ====================
function populateMonthSelectors() {
    const baseSelect = document.getElementById('select-base-month');
    const currSelect = document.getElementById('select-curr-month');

    [baseSelect, currSelect].forEach(sel => {
        sel.innerHTML = '';
        AppState.months.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            sel.appendChild(opt);
        });
    });

    baseSelect.value = AppState.baseMonth;
    currSelect.value = AppState.currMonth;

    // 更新指标卡片标签中的月份
    updateMetricLabels();
}

function updateMetricLabels() {
    document.getElementById('metric-label-1').textContent = `📦 ${AppState.baseMonth} 全球销量`;
    document.getElementById('metric-label-2').textContent = `📦 ${AppState.currMonth} 全球销量`;
    document.getElementById('metric-label-3').textContent = `💎 ${AppState.baseMonth} 单车边际`;
    document.getElementById('metric-label-4').textContent = `💎 ${AppState.currMonth} 单车边际`;
}


// ==================== 维度配置 ====================
function populateDimConfig() {
    const container = document.getElementById('dim-config-inputs');
    container.innerHTML = '';

    AppState.availableDimsInData.forEach(dim => {
        const group = document.createElement('div');
        group.className = 'form-group';

        const label = document.createElement('label');
        label.className = 'form-label';
        label.textContent = dim;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-input';
        input.value = AppState.customDimNames[dim] || dim;
        input.dataset.dim = dim;

        input.addEventListener('change', (e) => {
            const newName = e.target.value.trim();
            if (newName) {
                AppState.customDimNames[dim] = newName;
                // 更新下钻顺序和维度筛选中的显示名称
                populateDrillOrder();
                populateDrillFilters();
                triggerUpdate();
            }
        });

        group.appendChild(label);
        group.appendChild(input);
        container.appendChild(group);
    });
}


// ==================== 下钻顺序选择器 ====================
const LEVEL_LABELS = ['①', '②', '③', '④', '⑤'];
const LEVEL_NAMES = ['一', '二', '三', '四', '五'];

function populateDrillOrder() {
    const container = document.getElementById('drill-order-selects');
    container.innerHTML = '';

    const availableDims = AppState.availableDimsInData;
    const maxLevels = Math.min(5, availableDims.length);

    for (let level = 0; level < maxLevels; level++) {
        const group = document.createElement('div');
        group.className = 'form-group';

        const label = document.createElement('label');
        label.className = 'form-label';
        label.textContent = `${LEVEL_LABELS[level]} 第${LEVEL_NAMES[level]}层级`;

        const select = document.createElement('select');
        select.className = 'form-select';
        select.dataset.level = level;

        // 构建选项: "无" + 尚未被更高层级选中的维度
        rebuildDrillSelectOptions(select, level);

        // 设置默认值
        if (level < AppState.drillOrder.length) {
            select.value = AppState.drillOrder[level];
        } else {
            select.value = '';
        }

        select.addEventListener('change', () => {
            onDrillOrderChange();
        });

        group.appendChild(label);
        group.appendChild(select);
        container.appendChild(group);
    }
}

function rebuildDrillSelectOptions(select, level) {
    const currentValue = select.value;
    select.innerHTML = '';

    // "无" 选项
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = '无';
    select.appendChild(noneOpt);

    // 已被其他层级选中的维度（不含当前层级自身）
    const usedDims = getUsedDimsExcluding(level);

    AppState.availableDimsInData.forEach(dim => {
        if (!usedDims.includes(dim)) {
            const opt = document.createElement('option');
            opt.value = dim;
            opt.textContent = `${DIM_ICONS[dim] || ''} ${AppState.customDimNames[dim] || dim}`;
            select.appendChild(opt);
        }
    });

    // 恢复之前的值（如果仍然可用）
    if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
        select.value = currentValue;
    }
}

function getUsedDimsExcluding(excludeLevel) {
    const container = document.getElementById('drill-order-selects');
    const selects = container.querySelectorAll('select');
    const used = [];
    selects.forEach((sel, idx) => {
        if (idx !== excludeLevel && sel.value) {
            used.push(sel.value);
        }
    });
    return used;
}

function onDrillOrderChange() {
    const container = document.getElementById('drill-order-selects');
    const selects = container.querySelectorAll('select');

    // 收集新的下钻顺序（过滤掉"无"）
    const newOrder = [];
    selects.forEach(sel => {
        if (sel.value) newOrder.push(sel.value);
    });

    // 重建每个 select 的可选项（互斥逻辑）
    selects.forEach((sel, idx) => {
        rebuildDrillSelectOptions(sel, idx);
    });

    // 更新 AppState
    AppState.drillOrder = newOrder.length > 0 ? newOrder : AppState.availableDimsInData.slice(0, 1);

    // 重置维度筛选
    ALL_DIMENSIONS.forEach(d => AppState.selectedDims[d] = null);
    populateDrillFilters();

    triggerUpdate();
}


// ==================== 维度钻取（多选筛选器） ====================
function populateDrillFilters() {
    const container = document.getElementById('drill-filter-inputs');
    container.innerHTML = '';

    const drillOrder = AppState.drillOrder;

    // 对下钻顺序中"最后一层之前"的每个维度，生成一个多选筛选器
    // 最后一层在主内容区作为明细维度展示，不在侧边栏筛选
    for (let i = 0; i < drillOrder.length - 1; i++) {
        const dim = drillOrder[i];
        const dimName = AppState.customDimNames[dim] || dim;
        const icon = DIM_ICONS[dim] || '📊';

        // 根据上级维度已选值，计算当前维度的可选值
        const availableValues = getFilteredValuesForDim(dim, i);

        // 容器
        const msContainer = document.createElement('div');
        msContainer.className = 'multiselect-container';
        msContainer.dataset.dim = dim;

        // 标签
        const msLabel = document.createElement('label');
        msLabel.className = 'multiselect-label';
        msLabel.textContent = `${icon} ${dimName}`;

        // 已选芯片区
        const chipsDiv = document.createElement('div');
        chipsDiv.className = 'multiselect-chips';
        chipsDiv.dataset.dim = dim;

        // 下拉选择
        const dropdown = document.createElement('select');
        dropdown.className = 'multiselect-dropdown';
        dropdown.dataset.dim = dim;

        // 构建下拉选项
        rebuildFilterDropdown(dropdown, availableValues, dim);

        dropdown.addEventListener('change', () => {
            const val = dropdown.value;
            if (!val) return;
            addFilterChip(dim, val);
            dropdown.value = '';
        });

        msContainer.appendChild(msLabel);
        msContainer.appendChild(chipsDiv);
        msContainer.appendChild(dropdown);
        container.appendChild(msContainer);

        // 恢复已选值的芯片
        const currentSelection = AppState.selectedDims[dim];
        if (currentSelection && Array.isArray(currentSelection)) {
            currentSelection.forEach(v => {
                if (availableValues.includes(v)) {
                    addFilterChipDOM(chipsDiv, dim, v);
                }
            });
        }
    }

    // 如果下钻顺序只有1层或0层，显示提示
    if (drillOrder.length <= 1) {
        const hint = document.createElement('p');
        hint.className = 'caption';
        hint.textContent = '当前下钻顺序仅一层，无需筛选';
        container.appendChild(hint);
    }
}

function getFilteredValuesForDim(dim, levelIndex) {
    const drillOrder = AppState.drillOrder;
    let filteredData = AppState.df;

    // 按上级维度已选值逐级过滤
    for (let prev = 0; prev < levelIndex; prev++) {
        const prevDim = drillOrder[prev];
        const prevSelection = AppState.selectedDims[prevDim];
        if (prevSelection && Array.isArray(prevSelection) && prevSelection.length > 0) {
            filteredData = filteredData.filter(row => prevSelection.includes(row[prevDim]));
        }
    }

    // 提取当前维度的唯一值
    const valueSet = new Set(filteredData.map(row => row[dim]).filter(v => v !== undefined && v !== ''));
    return Array.from(valueSet).sort();
}

function rebuildFilterDropdown(dropdown, availableValues, dim) {
    dropdown.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '＋ 添加筛选...';
    dropdown.appendChild(placeholder);

    // 获取当前已选的值
    const currentSelection = AppState.selectedDims[dim] || [];

    availableValues.forEach(val => {
        if (!currentSelection.includes(val)) {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            dropdown.appendChild(opt);
        }
    });
}

function addFilterChip(dim, value) {
    // 更新 AppState
    if (!AppState.selectedDims[dim]) {
        AppState.selectedDims[dim] = [];
    }
    if (!AppState.selectedDims[dim].includes(value)) {
        AppState.selectedDims[dim].push(value);
    }

    // 添加芯片到 DOM
    const chipsDiv = document.querySelector(`.multiselect-chips[data-dim="${dim}"]`);
    if (chipsDiv) {
        addFilterChipDOM(chipsDiv, dim, value);
    }

    // 从下拉列表中移除已选项
    const dropdown = document.querySelector(`.multiselect-dropdown[data-dim="${dim}"]`);
    if (dropdown) {
        const opt = dropdown.querySelector(`option[value="${value}"]`);
        if (opt) opt.remove();
    }

    // 级联更新下级筛选器
    refreshCascadingFilters(dim);

    triggerUpdate();
}

function addFilterChipDOM(chipsDiv, dim, value) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.dataset.dim = dim;
    chip.dataset.value = value;
    chip.innerHTML = `${value} <span class="chip-remove" title="移除">×</span>`;

    chip.querySelector('.chip-remove').addEventListener('click', () => {
        removeFilterChip(dim, value);
    });

    chipsDiv.appendChild(chip);
}

function removeFilterChip(dim, value) {
    // 从 AppState 移除
    if (AppState.selectedDims[dim] && Array.isArray(AppState.selectedDims[dim])) {
        AppState.selectedDims[dim] = AppState.selectedDims[dim].filter(v => v !== value);
        if (AppState.selectedDims[dim].length === 0) {
            AppState.selectedDims[dim] = null;
        }
    }

    // 从 DOM 移除芯片
    const chip = document.querySelector(`.chip[data-dim="${dim}"][data-value="${value}"]`);
    if (chip) chip.remove();

    // 将该值重新加回下拉列表
    const dropdown = document.querySelector(`.multiselect-dropdown[data-dim="${dim}"]`);
    if (dropdown) {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = value;
        dropdown.appendChild(opt);
    }

    // 级联更新下级筛选器
    refreshCascadingFilters(dim);

    triggerUpdate();
}

function refreshCascadingFilters(changedDim) {
    const drillOrder = AppState.drillOrder;
    const changedIndex = drillOrder.indexOf(changedDim);

    // 重建所有 changedIndex 之后的筛选器
    for (let i = changedIndex + 1; i < drillOrder.length - 1; i++) {
        const dim = drillOrder[i];
        const availableValues = getFilteredValuesForDim(dim, i);

        // 清除不再有效的选择
        if (AppState.selectedDims[dim] && Array.isArray(AppState.selectedDims[dim])) {
            AppState.selectedDims[dim] = AppState.selectedDims[dim].filter(v => availableValues.includes(v));
            if (AppState.selectedDims[dim].length === 0) {
                AppState.selectedDims[dim] = null;
            }
        }

        // 重建芯片
        const chipsDiv = document.querySelector(`.multiselect-chips[data-dim="${dim}"]`);
        if (chipsDiv) {
            chipsDiv.innerHTML = '';
            const sel = AppState.selectedDims[dim];
            if (sel && Array.isArray(sel)) {
                sel.forEach(v => addFilterChipDOM(chipsDiv, dim, v));
            }
        }

        // 重建下拉选项
        const dropdown = document.querySelector(`.multiselect-dropdown[data-dim="${dim}"]`);
        if (dropdown) {
            rebuildFilterDropdown(dropdown, availableValues, dim);
        }
    }
}


// ==================== 重置筛选按钮 ====================
function initResetFilter() {
    const btn = document.getElementById('btn-reset-filter');
    if (btn) {
        btn.addEventListener('click', () => {
            ALL_DIMENSIONS.forEach(d => AppState.selectedDims[d] = null);
            populateDrillFilters();
            triggerUpdate();
        });
    }
}


// ==================== 月份选择器变更监听 ====================
function initMonthSelectors() {
    const baseSelect = document.getElementById('select-base-month');
    const currSelect = document.getElementById('select-curr-month');

    baseSelect.addEventListener('change', () => {
        AppState.baseMonth = baseSelect.value;
        updateMetricLabels();
        triggerUpdate();
    });

    currSelect.addEventListener('change', () => {
        AppState.currMonth = currSelect.value;
        updateMetricLabels();
        triggerUpdate();
    });
}


// ==================== 全局指标计算 ====================
function calculateGlobalMetrics(data, month) {
    const monthData = data.filter(r => r['Month'] === month);
    const totalVol = monthData.reduce((s, r) => s + r['Sales Volume'], 0);
    const totalMargin = monthData.reduce((s, r) => s + r['Total Margin'], 0);
    const avgMargin = totalVol > 0 ? totalMargin / totalVol : 0;
    return { totalVol, totalMargin, avgMargin };
}


// ==================== 当前维度 PVM 效应计算 ====================
/**
 * 在当前展示维度上直接计算 Mix 和 Rate 效应。
 * 这种口径不再先拆到所有维度组合，适合版型/国家频繁变化、底层组合缺少可比基期或当期的数据。
 *
 * @param {Array} data - 已筛选的数据行
 * @param {string} baseMonth - 基期
 * @param {string} currMonth - 当期
 * @param {string} groupDim - 当前展示维度 (如 'Dim_A')
 * @param {number} totalVolCurr - 当期全局/视图总销量（用于计算权重）
 * @param {number} totalVolBase - 基期全局/视图总销量（用于计算权重）
 * @param {number} avgMarginBase - 基期全局/视图平均单车边际
 * @returns {Array} 当前维度层级的 PVM 效应数组
 */
function calculateDimensionPVMEffects(data, baseMonth, currMonth, groupDim, totalVolCurr, totalVolBase, avgMarginBase) {
    const baseAgg = {};
    const currAgg = {};

    function getDimValue(row) {
        return row[groupDim] || '';
    }

    data.forEach(row => {
        const key = getDimValue(row);
        if (row['Month'] === baseMonth) {
            if (!baseAgg[key]) baseAgg[key] = { vol: 0, margin: 0 };
            baseAgg[key].vol += row['Sales Volume'];
            baseAgg[key].margin += row['Total Margin'];
        }
        if (row['Month'] === currMonth) {
            if (!currAgg[key]) currAgg[key] = { vol: 0, margin: 0 };
            currAgg[key].vol += row['Sales Volume'];
            currAgg[key].margin += row['Total Margin'];
        }
    });

    const allKeys = new Set([...Object.keys(baseAgg), ...Object.keys(currAgg)]);

    return [...allKeys].map(key => {
        const baseData = baseAgg[key] || { vol: 0, margin: 0 };
        const currData = currAgg[key] || { vol: 0, margin: 0 };
        const weightBase = totalVolBase > 0 ? baseData.vol / totalVolBase : 0;
        const weightCurr = totalVolCurr > 0 ? currData.vol / totalVolCurr : 0;
        const marginUnitBase = baseData.vol > 0 ? baseData.margin / baseData.vol : 0;
        const marginUnitCurr = currData.vol > 0 ? currData.margin / currData.vol : 0;

        const row = {
            [groupDim]: key,
            Vol_Base: baseData.vol,
            Vol_Curr: currData.vol,
            Total_Margin_Base: baseData.margin,
            Total_Margin_Curr: currData.margin,
            Margin_Unit_Base: marginUnitBase,
            Margin_Unit_Curr: marginUnitCurr
        };

        if (baseData.vol === 0 && currData.vol > 0) {
            row.Mix_Effect = weightCurr * (marginUnitCurr - avgMarginBase);
            row.Rate_Effect = 0;
        } else if (currData.vol === 0 && baseData.vol > 0) {
            row.Mix_Effect = -weightBase * (marginUnitBase - avgMarginBase);
            row.Rate_Effect = 0;
        } else {
            row.Mix_Effect = (weightCurr - weightBase) * (marginUnitBase - avgMarginBase);
            row.Rate_Effect = weightCurr * (marginUnitCurr - marginUnitBase);
        }

        row.Total_Contribution = row.Mix_Effect + row.Rate_Effect;
        return row;
    });
}


// ==================== 准备展示数据（添加占比和总计行） ====================
/**
 * 对应 app.py 的 prepare_display_dataframe()
 *
 * @param {Array} effectsData - PVM 效应聚合结果
 * @param {string} dimCol - 维度列名
 * @param {number} totalVolBase - 基期总销量（用于计算占比）
 * @param {number} totalVolCurr - 当期总销量（用于计算占比）
 * @param {number|null} totalMarginBase - 基期总边际（用于总计行）
 * @param {number|null} totalMarginCurr - 当期总边际（用于总计行）
 * @returns {Array} 含占比和总计行的展示数据
 */
function prepareDisplayData(effectsData, dimCol, totalVolBase, totalVolCurr, totalMarginBase, totalMarginCurr) {
    let data = effectsData.map(row => ({...row}));

    // 计算销量占比
    data.forEach(row => {
        row.Weight_Base_Pct = totalVolBase > 0 ? (row.Vol_Base / totalVolBase * 100) : 0;
        row.Weight_Curr_Pct = totalVolCurr > 0 ? (row.Vol_Curr / totalVolCurr * 100) : 0;
    });

    // 按当期销量从高到低排序
    data.sort((a, b) => b.Vol_Curr - a.Vol_Curr);

    // 汇总
    const sumVolBase = data.reduce((s, r) => s + r.Vol_Base, 0);
    const sumVolCurr = data.reduce((s, r) => s + r.Vol_Curr, 0);
    const sumMix = data.reduce((s, r) => s + r.Mix_Effect, 0);
    const sumRate = data.reduce((s, r) => s + r.Rate_Effect, 0);

    // 总计行
    const totalRow = {
        [dimCol]: '总计',
        Vol_Base: sumVolBase,
        Weight_Base_Pct: data.reduce((s, r) => s + r.Weight_Base_Pct, 0),
        Vol_Curr: sumVolCurr,
        Weight_Curr_Pct: data.reduce((s, r) => s + r.Weight_Curr_Pct, 0),
        Mix_Effect: sumMix,
        Rate_Effect: sumRate,
        Total_Contribution: sumMix + sumRate
    };

    // 总计行的单车边际
    if (totalMarginBase != null && totalMarginCurr != null) {
        totalRow.Margin_Unit_Base = sumVolBase > 0 ? totalMarginBase / sumVolBase : 0;
        totalRow.Margin_Unit_Curr = sumVolCurr > 0 ? totalMarginCurr / sumVolCurr : 0;
    } else {
        // 加权平均
        const wmBase = data.reduce((s, r) => s + r.Vol_Base * r.Margin_Unit_Base, 0);
        const wmCurr = data.reduce((s, r) => s + r.Vol_Curr * r.Margin_Unit_Curr, 0);
        totalRow.Margin_Unit_Base = sumVolBase > 0 ? wmBase / sumVolBase : 0;
        totalRow.Margin_Unit_Curr = sumVolCurr > 0 ? wmCurr / sumVolCurr : 0;
    }

    data.push(totalRow);
    return data;
}


// ==================== 按维度筛选数据的辅助函数 ====================
/**
 * 根据当前侧边栏筛选条件和指定层级，过滤原始数据
 * 对应 app.py 中各 level 的 df_level 逻辑
 */
function filterDataForLevel(level) {
    let filtered = AppState.df;
    const drillOrder = AppState.drillOrder;

    for (let prevLevel = 0; prevLevel < level; prevLevel++) {
        const prevDim = drillOrder[prevLevel];
        const prevSelection = AppState.selectedDims[prevDim];
        if (prevSelection && Array.isArray(prevSelection) && prevSelection.length > 0) {
            filtered = filtered.filter(row => prevSelection.includes(row[prevDim]));
        }
    }

    return filtered;
}


// ==================== 触发完整 PVM 计算和渲染 ====================
function triggerUpdate() {
    if (!AppState.dataLoaded || !AppState.df) return;

    const { baseMonth, currMonth, drillOrder } = AppState;

    // 1. 全局指标
    const globalBase = calculateGlobalMetrics(AppState.df, baseMonth);
    const globalCurr = calculateGlobalMetrics(AppState.df, currMonth);
    const totalDiff = globalCurr.avgMargin - globalBase.avgMargin;

    // 2. 更新顶部指标卡片
    updateMetricCards(globalBase, globalCurr, totalDiff);

    // 3. 为每个下钻层级计算 PVM 效应
    const levelResults = [];

    for (let level = 0; level < drillOrder.length; level++) {
        const dim = drillOrder[level];
        const dfLevel = filterDataForLevel(level);

        if (dfLevel.length === 0) {
            levelResults.push({ dim, effects: null, displayData: null, globalDisplayData: null, drillInfo: [] });
            continue;
        }

        // 当前视图范围的基准指标
        const levelBase = calculateGlobalMetrics(dfLevel, baseMonth);
        const levelCurr = calculateGlobalMetrics(dfLevel, currMonth);

        // 当前维度口径 PVM 效应（基于视图范围权重）
        const effects = calculateDimensionPVMEffects(
            dfLevel, baseMonth, currMonth, dim,
            levelCurr.totalVol, levelBase.totalVol, levelBase.avgMargin
        );

        // 准备展示数据
        const displayData = prepareDisplayData(
            effects, dim,
            levelBase.totalVol, levelCurr.totalVol,
            levelBase.totalMargin, levelCurr.totalMargin
        );

        // 如果是下钻状态，额外计算全球视角的贡献
        let globalDisplayData = null;
        const isDrilled = level > 0 && drillOrder.slice(0, level).some(prevDim => {
            const sel = AppState.selectedDims[prevDim];
            return sel && Array.isArray(sel) && sel.length > 0;
        });

        if (isDrilled) {
            const globalEffects = calculateDimensionPVMEffects(
                dfLevel, baseMonth, currMonth, dim,
                globalCurr.totalVol, globalBase.totalVol, globalBase.avgMargin
            );
            globalDisplayData = prepareDisplayData(
                globalEffects, dim,
                globalBase.totalVol, globalCurr.totalVol,
                null, null
            );
        }

        // 收集下钻信息
        const drillInfo = [];
        for (let prev = 0; prev < level; prev++) {
            const prevDim = drillOrder[prev];
            const prevSel = AppState.selectedDims[prevDim];
            if (prevSel && Array.isArray(prevSel) && prevSel.length > 0) {
                const dimName = AppState.customDimNames[prevDim] || prevDim;
                const selText = prevSel.length <= 3 ? prevSel.join(', ') : `${prevSel.length}项`;
                drillInfo.push(`${dimName}: ${selText}`);
            }
        }

        levelResults.push({
            dim,
            effects,
            displayData,
            globalDisplayData,
            isDrilled,
            drillInfo,
            levelAvgMarginBase: levelBase.avgMargin,
            levelAvgMarginCurr: levelCurr.avgMargin
        });
    }

    // 4. 存储计算结果，供 Task 5 渲染使用
    AppState.calculationResults = {
        globalBase,
        globalCurr,
        totalDiff,
        levelResults
    };

    // 5. 渲染图表和表格（Task 5/6 中实现）
    renderCharts();

    console.log('[triggerUpdate] 计算完成:', AppState.calculationResults);
}


// ==================== 更新顶部指标卡片 ====================
function updateMetricCards(globalBase, globalCurr, totalDiff) {
    // 基期销量
    document.getElementById('metric-value-1').textContent = formatNumber(globalBase.totalVol);

    // 当期销量
    document.getElementById('metric-value-2').textContent = formatNumber(globalCurr.totalVol);
    const volDelta = globalCurr.totalVol - globalBase.totalVol;
    const deltaEl2 = document.getElementById('metric-delta-2');
    deltaEl2.textContent = formatDelta(volDelta);
    deltaEl2.className = 'metric-delta ' + (volDelta >= 0 ? 'positive' : 'negative');

    // 基期单车边际
    document.getElementById('metric-value-3').textContent = '¥' + formatNumber(globalBase.avgMargin);

    // 当期单车边际
    document.getElementById('metric-value-4').textContent = '¥' + formatNumber(globalCurr.avgMargin);
    const deltaEl4 = document.getElementById('metric-delta-4');
    deltaEl4.textContent = '¥' + formatDelta(totalDiff);
    deltaEl4.className = 'metric-delta ' + (totalDiff >= 0 ? 'positive' : 'negative');
}


// ==================== 渲染图表和表格 ====================
function renderCharts() {
    if (!AppState.calculationResults) return;
    const { levelResults } = AppState.calculationResults;
    const container = document.getElementById('charts-container');
    container.innerHTML = '';

    // 显示 PVM 假设说明
    const pvmAssumptions = document.getElementById('pvm-assumptions');
    if (pvmAssumptions) pvmAssumptions.style.display = '';

    const colorSchemes = ['claude', 'warm', 'soft'];
    const dimNames = AppState.customDimNames;

    levelResults.forEach((lr, level) => {
        if (!lr.effects || !lr.displayData) return;

        const dim = lr.dim;
        const dimName = dimNames[dim] || dim;
        const dimIcon = DIM_ICONS[dim] || '📊';

        // 层级容器
        const section = document.createElement('div');
        section.className = 'chart-level-section';

        // 标题
        const header = document.createElement('h2');
        header.className = 'chart-level-title';
        header.innerHTML = `${dimIcon} ${dimName}维度贡献分析`;
        section.appendChild(header);

        // 下钻信息提示
        if (lr.isDrilled && lr.drillInfo && lr.drillInfo.length > 0) {
            const info = document.createElement('div');
            info.className = 'drill-info-badge';
            info.innerHTML = `📍 已筛选 ${lr.drillInfo.join(' → ')}`;
            section.appendChild(info);
        }

        // 瀑布图容器
        const chartDiv = document.createElement('div');
        chartDiv.id = `waterfall-chart-${level}`;
        chartDiv.className = 'waterfall-chart-container';
        section.appendChild(chartDiv);

        // 明细数据表 (可折叠)
        const detailDetails = document.createElement('details');
        detailDetails.className = 'usage-details chart-detail-table';
        const detailSummary = document.createElement('summary');
        detailSummary.className = 'usage-summary';
        detailSummary.textContent = `📋 ${dimName}明细数据`;
        detailDetails.appendChild(detailSummary);

        const detailContent = document.createElement('div');
        detailContent.className = 'usage-content';
        detailContent.appendChild(buildDetailTable(lr.displayData, dim, dimName));
        detailDetails.appendChild(detailContent);

        // 全球贡献表 (下钻时显示)
        if (lr.isDrilled && lr.globalDisplayData) {
            const globalDivider = document.createElement('hr');
            globalDivider.className = 'section-divider';
            detailContent.appendChild(globalDivider);

            const globalTitle = document.createElement('h4');
            globalTitle.className = 'global-contrib-title';
            globalTitle.innerHTML = '🌐 对全球整体单车边际的贡献';
            detailContent.appendChild(globalTitle);

            detailContent.appendChild(buildDetailTable(lr.globalDisplayData, dim, dimName, true));
        }

        section.appendChild(detailDetails);

        // 分隔线
        const divider = document.createElement('hr');
        divider.className = 'section-divider';
        section.appendChild(divider);

        container.appendChild(section);

        // 绘制瀑布图
        renderWaterfallChart(
            chartDiv.id,
            lr.effects,
            dim,
            `${dimName}贡献分解 (当前维度口径)`,
            lr.levelAvgMarginBase,
            lr.levelAvgMarginCurr,
            colorSchemes[level % colorSchemes.length]
        );
    });

    console.log('[renderCharts] 渲染完成，层级数:', levelResults.length);
}


// ==================== 瀑布图渲染 ====================
function renderWaterfallChart(containerId, effectsData, dimCol, title, baseMargin, currMargin, colorScheme) {
    // 按绝对值排序取 Top 10，再按先负后正排列
    const sorted = [...effectsData].sort((a, b) => Math.abs(b.Total_Contribution) - Math.abs(a.Total_Contribution));

    let labels, values, measures;

    if (sorted.length > 10) {
        const top10 = sorted.slice(0, 10);
        const othersSum = sorted.slice(10).reduce((s, r) => s + r.Total_Contribution, 0);

        // 先负后正排序
        top10.sort((a, b) => a.Total_Contribution - b.Total_Contribution);

        labels = ['基期单车边际', ...top10.map(r => r[dimCol]), '其他', '当期单车边际'];
        values = [baseMargin, ...top10.map(r => r.Total_Contribution), othersSum, 0];
        measures = ['absolute', ...Array(11).fill('relative'), 'total'];
    } else {
        // 先负后正排序
        const sortedData = [...sorted].sort((a, b) => a.Total_Contribution - b.Total_Contribution);

        labels = ['基期单车边际', ...sortedData.map(r => r[dimCol]), '当期单车边际'];
        values = [baseMargin, ...sortedData.map(r => r.Total_Contribution), 0];
        measures = ['absolute', ...Array(sortedData.length).fill('relative'), 'total'];
    }

    // 颜色方案
    const schemes = {
        claude: {
            increasing: '#788c5d',
            decreasing: '#d97757',
            total: '#6a9bcc',
            base: '#b0aea5'
        },
        warm: {
            increasing: '#788c5d',
            decreasing: '#c56646',
            total: '#5a89b8',
            base: '#9a988f'
        },
        soft: {
            increasing: '#8fa370',
            decreasing: '#e08060',
            total: '#7aaad4',
            base: '#c0beb5'
        }
    };
    const colors = schemes[colorScheme] || schemes.claude;

    // 计算 Y 轴范围
    const minMargin = Math.min(baseMargin, currMargin);
    const maxMargin = Math.max(baseMargin, currMargin);
    const delta = Math.abs(currMargin - baseMargin);

    let cumulative = baseMargin;
    let minCumulative = baseMargin;
    let maxCumulative = baseMargin;
    for (let i = 1; i < values.length - 1; i++) {
        cumulative += values[i];
        minCumulative = Math.min(minCumulative, cumulative);
        maxCumulative = Math.max(maxCumulative, cumulative);
    }

    const dataRange = maxCumulative - minCumulative;
    const padding = Math.max(delta * 1.5, dataRange * 0.3, 100);

    let yRangeMin = Math.min(minMargin, minCumulative) - padding;
    let yRangeMax = Math.max(maxMargin, maxCumulative) + padding * 1.5;

    if (minMargin > 0 && minCumulative > 0) {
        if (!(Math.min(minMargin, minCumulative) > Math.max(maxMargin, maxCumulative) * 0.3)) {
            yRangeMin = Math.max(0, yRangeMin);
        }
    }

    // 文本标签
    const textLabels = values.map((v, i) => {
        if (i === 0) return `¥${formatNumber(baseMargin)}`;
        if (i === values.length - 1) return `¥${formatNumber(currMargin)}`;
        return formatSignedNumber(v);
    });

    // 变动金额注释
    const deltaVal = currMargin - baseMargin;
    const pctChange = baseMargin !== 0 ? (deltaVal / baseMargin * 100) : 0;
    const deltaColor = deltaVal >= 0 ? '#788c5d' : '#d97757';

    const trace = {
        type: 'waterfall',
        orientation: 'v',
        measure: measures,
        x: labels,
        y: values,
        textposition: 'outside',
        text: textLabels,
        textfont: { size: 13, color: '#141413', family: PLOT_FONT_FAMILY },
        increasing: { marker: { color: colors.increasing, line: { color: colors.increasing, width: 1 } } },
        decreasing: { marker: { color: colors.decreasing, line: { color: colors.decreasing, width: 1 } } },
        totals: { marker: { color: colors.total, line: { color: colors.total, width: 2 } } },
        connector: { line: { color: 'rgba(176, 174, 165, 0.3)', width: 1.5, dash: 'dot' } }
    };

    const layout = {
        title: {
            text: `<b>${title}</b>`,
            font: { size: 18, color: '#141413', family: PLOT_FONT_FAMILY },
            x: 0.5,
            xanchor: 'center'
        },
        showlegend: false,
        height: 520,
        margin: { l: 80, r: 80, t: 120, b: 100 },
        plot_bgcolor: 'rgba(250, 249, 245, 0)',
        paper_bgcolor: 'rgba(250, 249, 245, 0)',
        xaxis: {
            tickangle: -25,
            tickfont: { size: 12, color: '#b0aea5', family: PLOT_FONT_FAMILY },
            gridcolor: 'rgba(232, 230, 220, 0.5)',
            linecolor: '#e8e6dc',
            showline: true
        },
        yaxis: {
            title: { text: '单车边际 (¥)', font: { size: 13, color: '#b0aea5' } },
            gridcolor: 'rgba(232, 230, 220, 0.5)',
            tickfont: { size: 11, color: '#b0aea5' },
            tickformat: ',.0f',
            linecolor: '#e8e6dc',
            showline: true,
            range: [yRangeMin, yRangeMax],
            zeroline: false
        },
        hoverlabel: {
            bgcolor: 'rgba(255, 255, 255, 0.98)',
            bordercolor: '#d97757',
            font: { size: 13, color: '#141413', family: PLOT_FONT_FAMILY }
        },
        annotations: [{
            x: 0.5,
            y: 1.08,
            xref: 'paper',
            yref: 'paper',
            text: `<b>变动: ¥${formatSignedNumber(deltaVal)}</b>  <span style="color: ${deltaColor}">(${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(2)}%)</span>`,
            showarrow: false,
            font: { size: 15, color: deltaColor, family: PLOT_FONT_FAMILY },
            bgcolor: 'rgba(255, 255, 255, 0.95)',
            bordercolor: '#e8e6dc',
            borderwidth: 1,
            borderpad: 10
        }]
    };


    // 移动端优化：减小高度、禁用拖拽
    const isMobileView = window.innerWidth <= 768;
    if (isMobileView) {
        layout.height = 380;
        layout.margin = { l: 60, r: 40, t: 100, b: 80 };
        layout.xaxis.tickfont.size = 10;
        layout.yaxis.tickfont.size = 10;
        layout.yaxis.title.font.size = 11;
        layout.title.font.size = 14;
        layout.annotations[0].font.size = 12;
    }

    const config = {
        responsive: true,
        displayModeBar: false,
        dragMode: isMobileView ? false : 'pan'
    };

    Plotly.newPlot(containerId, [trace], layout, config);
}


// ==================== 明细数据表构建 ====================
function buildDetailTable(displayData, dimCol, dimName, isGlobal) {
    const table = document.createElement('table');
    table.className = 'detail-data-table';

    // 表头
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = isGlobal
        ? [dimName, '基期销量', '基期占比%', '当期销量', '当期占比%', '基期单车边际', '当期单车边际', '结构效应（全球）', '费率效应（全球）', '对全球单车边际贡献']
        : [dimName, '基期销量', '基期占比%', '当期销量', '当期占比%', '基期单车边际', '当期单车边际', '结构效应', '费率效应', '总贡献'];

    headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // 表体
    const tbody = document.createElement('tbody');
    displayData.forEach((row) => {
        const tr = document.createElement('tr');
        const isTotal = row[dimCol] === '总计';
        if (isTotal) tr.className = 'total-row';

        const cells = [
            row[dimCol],
            formatNumber(row.Vol_Base),
            formatPercent(row.Weight_Base_Pct),
            formatNumber(row.Vol_Curr),
            formatPercent(row.Weight_Curr_Pct),
            formatCurrency(row.Margin_Unit_Base),
            formatCurrency(row.Margin_Unit_Curr),
            formatSignedNumber(row.Mix_Effect),
            formatSignedNumber(row.Rate_Effect),
            formatSignedNumber(row.Total_Contribution)
        ];

        cells.forEach((cellValue, ci) => {
            const td = document.createElement('td');
            td.textContent = cellValue;
            // 右对齐数字列
            if (ci > 0) td.className = 'num-cell';
            // 正负色
            if (ci >= 7) {
                const numVal = ci === 7 ? row.Mix_Effect : ci === 8 ? row.Rate_Effect : row.Total_Contribution;
                if (numVal > 0) td.classList.add('positive');
                else if (numVal < 0) td.classList.add('negative');
            }
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    wrapper.appendChild(table);
    return wrapper;
}


// ==================== 数值格式化工具 ====================
function formatNumber(num) {
    if (num == null || isNaN(num)) return '-';
    return Math.round(num).toLocaleString('en-US');
}

function formatDelta(num) {
    if (num == null || isNaN(num)) return '';
    const sign = num >= 0 ? '+' : '';
    return sign + Math.round(num).toLocaleString('en-US');
}

function formatCurrency(num) {
    if (num == null || isNaN(num)) return '-';
    return '¥' + Math.round(num).toLocaleString('en-US');
}

function formatPercent(num) {
    if (num == null || isNaN(num)) return '-';
    return num.toFixed(1) + '%';
}

function formatSignedNumber(num) {
    if (num == null || isNaN(num)) return '-';
    const sign = num >= 0 ? '+' : '';
    return sign + Math.round(num).toLocaleString('en-US');
}
