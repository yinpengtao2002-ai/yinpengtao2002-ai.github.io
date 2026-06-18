/**
 * 单车指标变动归因模型 - Unit Metric Attribution Model
 * HTML/JS 版本
 */

// ==================== 全局状态 ====================
const DEFAULT_DIMENSION_NAMES = {
    Dim_A: '大区', Dim_B: '国家', Dim_C: '车型',
    Dim_D: '燃油品类', Dim_E: '品牌'
};
const TEMPLATE_DIMENSION_HEADERS = ['大区', '国家', '车型', '燃油品类', '品牌'];
const ALL_DIMENSIONS = Array.from({ length: 20 }, (_, index) => `Dim_${String.fromCharCode(65 + index)}`);
const ATTRIBUTION_METHOD_LAYERED = 'layered';
const ATTRIBUTION_METHOD_BOTTOM_UP = 'bottom-up';

const AppState = {
    dataLoaded: false,
    df: null,              // 当前分析指标对应的数据数组
    rawRows: null,         // 保留所有上传指标列的数据数组
    months: [],            // 可用月份
    baseMonth: null,
    currMonth: null,
    drillOrder: ['Dim_A', 'Dim_B', 'Dim_C'],
    selectedDims: {
        Dim_A: null, Dim_B: null, Dim_C: null,
        Dim_D: null, Dim_E: null
    },
    excludedDims: {
        Dim_A: null, Dim_B: null, Dim_C: null,
        Dim_D: null, Dim_E: null
    },
    filterModes: {},
    customDimNames: { ...DEFAULT_DIMENSION_NAMES },
    unitName: '车',
    unitMetricType: '边际',
    metricColumns: [],
    selectedMetricKey: null,
    availableDimsInData: [],
    calculationResults: null,
    impactBaselineDim: '__global__',
    attributionMethod: 'layered',
    attributionViewModes: {}
};

const PLOT_FONT_FAMILY = 'PingFang SC, Microsoft YaHei, Helvetica Neue, Arial, sans-serif';
const ATTRIBUTION_VIEW_SELF = 'self';
const ATTRIBUTION_VIEW_GLOBAL = 'global';
const IMPACT_BASELINE_GLOBAL = '__global__';

const DIM_ICONS = {
    Dim_A: '🌍', Dim_B: '🏳️', Dim_C: '🚗',
    Dim_D: '🏷️', Dim_E: '🏢'
};

const TEMPLATE_HEADERS = [
    '月份', ...TEMPLATE_DIMENSION_HEADERS, '销量', '净收入', '成本', '边际'
];
const TEMPLATE_HEADER_NOTE = '可直接修改标题行；请保留“月份”和“销量”。销量列之前会按表头自动识别为维度，可新增或删除维度列，直接插入或删除即可；销量列之后的数值列会识别为可分析指标，例如净收入、成本、边际。成本等扣减项建议按负数填写。';


// ==================== DOM Ready ====================
if (typeof document !== 'undefined') {
    document.addEventListener("DOMContentLoaded", () => {
        initSidebarToggle();
        initFileUpload();
        initTemplateDownloads();
        initDemoButton();
        initResetFilter();
        initMonthSelectors();
        initUserSettings();
        initWaterfallDismissHandling();
        initExcelFilterDismiss();

        const demoData = generateDemoData();
        processLoadedData(demoData, "示例数据");

        if (isMobile()) {
            // 收起侧边栏
            const sidebar = document.getElementById("sidebar");
            const expandBtn = document.getElementById("sidebar-expand");
            sidebar.classList.add("collapsed");
            document.body.classList.remove("sidebar-open");
            expandBtn.style.display = "inline-flex";
            schedulePlotResize();
        }
    });
}

// 检测是否为手机端
function isMobile() {
    return window.innerWidth <= 768 ||
           window.matchMedia?.('(hover: none), (pointer: coarse)').matches ||
           /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function initWaterfallDismissHandling() {
    document.addEventListener('click', (event) => {
        if (!isMobile()) return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest('.waterfall-touch-host')) return;
        if (target.closest('.waterfall-chart-container')) return;
        hideWaterfallHoverTooltip();
    });
}

// ==================== 侧边栏收折 ====================
function initSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const expandBtn = document.getElementById('sidebar-expand');
    const backdrop = document.getElementById('sidebar-backdrop');

    const isSidebarOverlayViewport = () => window.matchMedia('(max-width: 768px)').matches;

    const setSidebarOpen = (open) => {
        sidebar.classList.toggle('collapsed', !open);
        document.body.classList.toggle('sidebar-open', open && isSidebarOverlayViewport());
        expandBtn.style.display = open ? 'none' : 'inline-flex';
        expandBtn.setAttribute('aria-expanded', String(open));
        toggleBtn.setAttribute('aria-expanded', String(open));
        schedulePlotResize();
    };

    toggleBtn.addEventListener('click', () => {
        setSidebarOpen(false);
    });

    expandBtn.addEventListener('click', () => {
        setSidebarOpen(true);
    });

    backdrop?.addEventListener('click', () => {
        setSidebarOpen(false);
    });

    window.matchMedia('(max-width: 768px)').addEventListener('change', (event) => {
        document.body.classList.toggle('sidebar-open', !sidebar.classList.contains('collapsed') && event.matches);
    });
}

function resizePlotlyCharts() {
    if (typeof Plotly === 'undefined') return;
    document.querySelectorAll('.js-plotly-plot').forEach((plot) => {
        Plotly.Plots.resize(plot);
    });
}

function schedulePlotResize() {
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(resizePlotlyCharts);
    window.setTimeout(resizePlotlyCharts, 320);
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
                const sheetRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '', blankrows: false });
                const rows = sheetRowsToObjects(sheetRows);
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
        { '月份': '2025-01', '大区': '亚太区', '国家': '中国', '车型': 'SUV-旗舰', '燃油品类': '燃油', '品牌': '品牌A', '销量': 5000, '净收入': 42000000, '成本': -27000000, '边际': 15000000 },
        { '月份': '2025-01', '大区': '欧洲区', '国家': '德国', '车型': 'Sedan-经典', '燃油品类': '混动', '品牌': '品牌B', '销量': 2500, '净收入': 20500000, '成本': -15000000, '边际': 5500000 },
        { '月份': '2025-02', '大区': '亚太区', '国家': '中国', '车型': 'SUV-旗舰', '燃油品类': '燃油', '品牌': '品牌A', '销量': 6200, '净收入': 52080000, '成本': -32240000, '边际': 19840000 },
        { '月份': '2025-02', '大区': '欧洲区', '国家': '德国', '车型': 'Sedan-经典', '燃油品类': '混动', '品牌': '品牌B', '销量': 2200, '净收入': 17600000, '成本': -12980000, '边际': 4620000 }
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
    const blob = buildXlsxTemplateBlob();
    downloadBlob(blob, 'margin-analysis-template.xlsx');
}

function buildXlsxTemplateBlob() {
    const entries = buildXlsxTemplateEntries();
    const zipBytes = createStoredZip(entries);
    return new Blob([zipBytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function buildXlsxTemplateEntries() {
    return [
        { name: '[Content_Types].xml', content: buildContentTypesXml() },
        { name: '_rels/.rels', content: buildRootRelsXml() },
        { name: 'xl/workbook.xml', content: buildWorkbookXml() },
        { name: 'xl/_rels/workbook.xml.rels', content: buildWorkbookRelsXml() },
        { name: 'xl/styles.xml', content: buildTemplateStylesXml() },
        { name: 'xl/worksheets/sheet1.xml', content: buildTemplateWorksheetXml() }
    ];
}

function buildContentTypesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
    <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
    <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
}

function buildRootRelsXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function buildWorkbookXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
    <sheets>
        <sheet name="示例格式" sheetId="1" r:id="rId1"/>
    </sheets>
</workbook>`;
}

function buildWorkbookRelsXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
    <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function buildTemplateStylesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
    <fonts count="2">
        <font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>
        <font><b/><sz val="11"/><color rgb="FF6F4E00"/><name val="Calibri"/><family val="2"/></font>
    </fonts>
    <fills count="3">
        <fill><patternFill patternType="none"/></fill>
        <fill><patternFill patternType="gray125"/></fill>
        <fill><patternFill patternType="solid"><fgColor rgb="FFFFF7CC"/><bgColor indexed="64"/></patternFill></fill>
    </fills>
    <borders count="2">
        <border><left/><right/><top/><bottom/><diagonal/></border>
        <border>
            <left style="thin"><color rgb="FFE8D98A"/></left>
            <right style="thin"><color rgb="FFE8D98A"/></right>
            <top style="thin"><color rgb="FFE8D98A"/></top>
            <bottom style="thin"><color rgb="FFE8D98A"/></bottom>
            <diagonal/>
        </border>
    </borders>
    <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
    <cellXfs count="2">
        <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
        <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    </cellXfs>
    <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
    <dxfs count="0"/>
    <tableStyles count="0" defaultTableStyle="TableStyleMedium9" defaultPivotStyle="PivotStyleMedium4"/>
</styleSheet>`;
}

function buildTemplateWorksheetXml() {
    const rows = [
        [TEMPLATE_HEADER_NOTE],
        [],
        TEMPLATE_HEADERS,
        ...getTemplateRows().map(row => TEMPLATE_HEADERS.map(header => row[header] ?? ''))
    ];
    const lastRow = rows.length;
    const lastCol = columnName(TEMPLATE_HEADERS.length - 1);
    const colsXml = TEMPLATE_HEADERS
        .map((header, index) => {
            const width = Math.max(String(header).length + 8, 16);
            return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
        })
        .join('');
    const rowsXml = rows.map((row, rowIndex) => {
        const rowNumber = rowIndex + 1;
        if (rowNumber === 2) return '<row r="2" ht="6" customHeight="1"/>';
        const cells = row
            .map((value, colIndex) => buildTemplateCell(value, rowNumber, colIndex, rowNumber === 1 ? 1 : 0))
            .join('');
        const rowAttrs = rowNumber === 1 ? ' ht="48" customHeight="1"' : '';
        return `<row r="${rowNumber}"${rowAttrs}>${cells}</row>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
    <dimension ref="A1:${lastCol}${lastRow}"/>
    <sheetViews><sheetView workbookViewId="0"/></sheetViews>
    <cols>${colsXml}</cols>
    <sheetData>${rowsXml}</sheetData>
    <mergeCells count="1"><mergeCell ref="A1:${lastCol}1"/></mergeCells>
    <pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>`;
}

function buildTemplateCell(value, rowNumber, colIndex, styleId = 0) {
    const ref = `${columnName(colIndex)}${rowNumber}`;
    const styleAttr = styleId > 0 ? ` s="${styleId}"` : '';
    if (typeof value === 'number' && Number.isFinite(value)) {
        return `<c r="${ref}"${styleAttr}><v>${value}</v></c>`;
    }
    return `<c r="${ref}"${styleAttr} t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
}

function columnName(index) {
    let name = '';
    let current = index + 1;
    while (current > 0) {
        const remainder = (current - 1) % 26;
        name = String.fromCharCode(65 + remainder) + name;
        current = Math.floor((current - 1) / 26);
    }
    return name;
}

function escapeXml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function createStoredZip(entries) {
    const encoder = new TextEncoder();
    const fileRecords = [];
    const centralRecords = [];
    let offset = 0;

    entries.forEach((entry) => {
        const nameBytes = encoder.encode(entry.name);
        const contentBytes = typeof entry.content === 'string' ? encoder.encode(entry.content) : entry.content;
        const crc = crc32(contentBytes);
        const localHeader = buildZipLocalHeader(nameBytes, contentBytes.length, crc);
        const centralHeader = buildZipCentralHeader(nameBytes, contentBytes.length, crc, offset);

        fileRecords.push(localHeader, contentBytes);
        centralRecords.push(centralHeader);
        offset += localHeader.length + contentBytes.length;
    });

    const centralOffset = offset;
    const centralSize = centralRecords.reduce((sum, record) => sum + record.length, 0);
    const endRecord = buildZipEndRecord(entries.length, centralSize, centralOffset);
    return concatUint8Arrays([...fileRecords, ...centralRecords, endRecord]);
}

function buildZipLocalHeader(nameBytes, contentLength, crc) {
    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0800, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, contentLength, true);
    view.setUint32(22, contentLength, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);
    header.set(nameBytes, 30);
    return header;
}

function buildZipCentralHeader(nameBytes, contentLength, crc, offset) {
    const header = new Uint8Array(46 + nameBytes.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0x0800, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, 0, true);
    view.setUint32(16, crc, true);
    view.setUint32(20, contentLength, true);
    view.setUint32(24, contentLength, true);
    view.setUint16(28, nameBytes.length, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, offset, true);
    header.set(nameBytes, 46);
    return header;
}

function buildZipEndRecord(entryCount, centralSize, centralOffset) {
    const record = new Uint8Array(22);
    const view = new DataView(record.buffer);
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(4, 0, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, entryCount, true);
    view.setUint16(10, entryCount, true);
    view.setUint32(12, centralSize, true);
    view.setUint32(16, centralOffset, true);
    view.setUint16(20, 0, true);
    return record;
}

function concatUint8Arrays(arrays) {
    const totalLength = arrays.reduce((sum, item) => sum + item.length, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    arrays.forEach((item) => {
        merged.set(item, offset);
        offset += item.length;
    });
    return merged;
}

function crc32(bytes) {
    const table = getCrc32Table();
    let crc = 0 ^ -1;
    for (let index = 0; index < bytes.length; index++) {
        crc = (crc >>> 8) ^ table[(crc ^ bytes[index]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
}

function getCrc32Table() {
    if (getCrc32Table.cache) return getCrc32Table.cache;
    const table = new Uint32Array(256);
    for (let index = 0; index < 256; index++) {
        let current = index;
        for (let bit = 0; bit < 8; bit++) {
            current = current & 1 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
        }
        table[index] = current >>> 0;
    }
    getCrc32Table.cache = table;
    return table;
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

function escapeTsvCell(value) {
    return String(value ?? '')
        .replace(/\t/g, ' ')
        .replace(/\r?\n/g, ' ');
}


// ==================== CSV 解析 ====================
function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) throw new Error('CSV 文件至少需要标题行和一行数据');

    return sheetRowsToObjects(lines.map(line => parseCSVLine(line)));
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

function sheetRowsToObjects(sheetRows) {
    const rows = Array.isArray(sheetRows) ? sheetRows : [];
    const headerIndex = findTemplateHeaderRowIndex(rows);
    const headerRow = rows[headerIndex] || [];
    const headers = headerRow.map(cell => String(cell ?? '').trim());

    return rows.slice(headerIndex + 1)
        .map((row) => {
            const item = {};
            headers.forEach((header, index) => {
                if (!header) return;
                item[header] = Array.isArray(row) && index < row.length ? row[index] : '';
            });
            return item;
        })
        .filter(row => Object.values(row).some(value => String(value ?? '').trim() !== ''));
}

function findTemplateHeaderRowIndex(rows) {
    const fallbackIndex = rows.findIndex(row => Array.isArray(row) && row.some(cell => String(cell ?? '').trim()));

    for (let index = 0; index < rows.length; index++) {
        const row = Array.isArray(rows[index]) ? rows[index] : [];
        const cells = row.map(cell => String(cell ?? '').trim()).filter(Boolean);
        if (cells.length === 0) continue;
        if (cells.length === 1 && cells[0] === TEMPLATE_HEADER_NOTE) continue;

        const schema = analyzeUploadHeaders(cells);
        if (schema.hasMonth && schema.hasSalesVolume && schema.metricColumns.length > 0 && schema.dimCols.length > 0) {
            return index;
        }
    }

    return fallbackIndex >= 0 ? fallbackIndex : 0;
}


// ==================== 数据处理管线 ====================
function processLoadedData(rows, sourceName) {
    if (!rows || rows.length === 0) {
        showMessage('error', '数据为空，请检查文件内容');
        return;
    }

    // 1. 标准化列名：业务表头直接作为维度显示名，内部自动映射到 Dim_A / Dim_B ...
    const normalizedInput = normalizeUploadedRows(rows);
    rows = normalizedInput.rows;
    const dimCols = normalizedInput.dimCols;
    const metricColumns = normalizedInput.metricColumns;

    if (dimCols.length === 0) {
        showMessage('error', `缺少维度列：请至少保留一个业务维度列，例如“大区”或“国家”。当前列名: ${normalizedInput.sourceHeaders.join(', ')}`);
        return;
    }
    if (normalizedInput.missingCols.length > 0) {
        showMessage('error', `缺少必要列: ${normalizedInput.missingCols.join(', ')}。当前列名: ${normalizedInput.sourceHeaders.join(', ')}`);
        return;
    }

    // 2. 清理数值 & 类型转换
    rows = rows.map(row => {
        row['Sales Volume'] = cleanNumeric(row['Sales Volume']);
        metricColumns.forEach(metric => {
            row[metric.key] = cleanNumeric(row[metric.key]);
        });
        row['Month'] = cleanText(row['Month']);
        dimCols.forEach(d => {
            row[d] = cleanText(row[d]);
        });
        return row;
    });

    // 3. 移除完全空行 (销量和所有指标都为 0)
    rows = rows.filter(r => r['Sales Volume'] !== 0 || metricColumns.some(metric => r[metric.key] !== 0));

    if (rows.length === 0) {
        showMessage('error', '数据清理后为空，请检查数据格式');
        return;
    }

    // 4. 校验有效数据是否存在空月份，避免把未配置字段当作独立期间参与计算
    const missingMonthRows = rows.filter(r => !r['Month']);
    if (missingMonthRows.length > 0) {
        showMessage('error', `部分字段没有配置：发现 ${missingMonthRows.length} 行 Month 为空，请补充月份后重新上传。`);
        return;
    }

    // 5. 存储并切换 UI
    AppState.rawRows = rows;
    AppState.metricColumns = metricColumns;
    AppState.selectedMetricKey = resolveInitialMetricKey(metricColumns);
    syncSelectedMetricType();
    AppState.df = applySelectedMetricToRows(rows, AppState.selectedMetricKey);
    AppState.availableDimsInData = dimCols;
    AppState.customDimNames = { ...DEFAULT_DIMENSION_NAMES, ...normalizedInput.dimNames };

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

    // 默认下钻顺序：启用全部上传维度，用户可自行删除不需要的维度
    AppState.drillOrder = [...dimCols];

    // 重置维度筛选
    AppState.selectedDims = {};
    ALL_DIMENSIONS.forEach(d => AppState.selectedDims[d] = null);
    AppState.excludedDims = {};
    ALL_DIMENSIONS.forEach(d => AppState.excludedDims[d] = null);
    AppState.filterModes = {};
    AppState.impactBaselineDim = IMPACT_BASELINE_GLOBAL;
    AppState.attributionViewModes = {};

    showMessage('success', `✅ 数据已加载 (${sourceName}): ${rows.length} 行, ${AppState.months.length} 个月份`);
    onDataLoaded();
}

function normalizeUploadedRows(inputRows) {
    const sourceHeaders = Object.keys(inputRows[0] || {})
        .map(header => String(header).trim())
        .filter(Boolean);
    const schema = analyzeUploadHeaders(sourceHeaders);

    const normalizedRows = inputRows.map((row) => {
        const normalizedRow = {};
        sourceHeaders.forEach((sourceHeader) => {
            const normalizedKey = schema.columnKeyBySource[sourceHeader];
            if (normalizedKey) normalizedRow[normalizedKey] = row[sourceHeader];
        });
        const firstMetric = schema.metricColumns[0];
        if (firstMetric) normalizedRow['Total Margin'] = normalizedRow[firstMetric.key];
        return normalizedRow;
    });

    const missingCols = [];
    if (!schema.hasMonth) missingCols.push('月份');
    if (!schema.hasSalesVolume) missingCols.push('销量');
    if (schema.metricColumns.length === 0) missingCols.push('指标列');

    return {
        rows: normalizedRows,
        dimCols: schema.dimCols,
        dimNames: schema.dimNames,
        metricColumns: schema.metricColumns,
        missingCols,
        sourceHeaders
    };
}

function analyzeUploadHeaders(sourceHeaders) {
    const columnMapping = buildColumnMapping();
    const columnKeyBySource = {};
    const dimCols = [];
    const dimNames = {};
    const metricColumns = [];
    const salesIndex = sourceHeaders.findIndex(sourceHeader =>
        getMappedColumnName(sourceHeader, columnMapping) === 'Sales Volume'
    );
    let hasMonth = false;
    let hasSalesVolume = false;

    sourceHeaders.forEach((sourceHeader) => {
        const mappedColumn = getMappedColumnName(sourceHeader, columnMapping);
        if (mappedColumn === 'Month') {
            columnKeyBySource[sourceHeader] = 'Month';
            hasMonth = true;
            return;
        }
        if (mappedColumn === 'Sales Volume') {
            columnKeyBySource[sourceHeader] = 'Sales Volume';
            hasSalesVolume = true;
        }
    });

    sourceHeaders.forEach((sourceHeader, index) => {
        if (columnKeyBySource[sourceHeader]) return;

        const mappedColumn = getMappedColumnName(sourceHeader, columnMapping);
        const isLegacyMetric = mappedColumn === 'Total Margin';
        const isMetricAfterSales = salesIndex >= 0 && index > salesIndex;

        if (isLegacyMetric || isMetricAfterSales) {
            const metricKey = `Metric_${metricColumns.length + 1}`;
            const metricType = deriveMetricTypeFromHeader(sourceHeader);
            metricColumns.push({
                key: metricKey,
                sourceHeader,
                metricType
            });
            columnKeyBySource[sourceHeader] = metricKey;
            return;
        }

        const legacyDim = getLegacyDimensionKey(sourceHeader);
        const dimKey = legacyDim && !dimCols.includes(legacyDim)
            ? legacyDim
            : getNextDimensionKey(dimCols);
        if (!dimKey) return;

        columnKeyBySource[sourceHeader] = dimKey;
        dimCols.push(dimKey);
        dimNames[dimKey] = legacyDim
            ? (DEFAULT_DIMENSION_NAMES[dimKey] || sourceHeader)
            : sourceHeader;
    });

    return {
        columnKeyBySource,
        dimCols,
        dimNames,
        metricColumns,
        hasMonth,
        hasSalesVolume
    };
}

function deriveMetricTypeFromHeader(sourceHeader) {
    const header = String(sourceHeader == null ? '' : sourceHeader).trim();
    const normalized = normalizeHeaderAlias(header);
    if (!header) return '边际';
    if ([
        '指标总额', '指标金额', '指标总量', '单车指标总额',
        'totalmargin', 'totalmetric', 'metrictotal'
    ].map(normalizeHeaderAlias).includes(normalized)) {
        return '边际';
    }
    return header
        .replace(/总额$/u, '')
        .replace(/金额$/u, '')
        .replace(/总量$/u, '')
        .trim() || '边际';
}

function applySelectedMetricToRows(rows, metricKey) {
    return (rows || []).map((row) => ({
        ...row,
        'Total Margin': cleanNumeric(row?.[metricKey])
    }));
}

function buildColumnMapping() {
    const map = {};
    addColumnAliases(map, 'Month', ['月份', '年月', '期间', 'month', 'Month']);
    addColumnAliases(map, 'Sales Volume', ['销量', '机器销量', '销售数量', 'sales volume', 'salesvolume', 'Sales Volume', 'SalesVolume', 'sales_volume']);
    addColumnAliases(map, 'Total Margin', [
        '边际总额', '指标总额', '指标金额', '指标总量', '单车指标总额',
        '净收入总额', '收入总额',
        'total margin', 'totalmargin', 'Total Margin', 'TotalMargin', 'total_margin',
        'total metric', 'totalmetric', 'Total Metric', 'TotalMetric', 'total_metric',
        'metric total', 'metrictotal', 'Metric Total', 'MetricTotal', 'metric_total'
    ]);
    return map;
}

function addColumnAliases(map, targetColumn, aliases) {
    aliases.forEach((alias) => {
        map[alias] = targetColumn;
        map[normalizeHeaderAlias(alias)] = targetColumn;
    });
}

function getMappedColumnName(sourceHeader, columnMapping) {
    return columnMapping[sourceHeader] || columnMapping[normalizeHeaderAlias(sourceHeader)] || null;
}

function normalizeHeaderAlias(header) {
    return String(header || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function getLegacyDimensionKey(sourceHeader) {
    const normalized = String(sourceHeader || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    const match = normalized.match(/^dim_?([a-z])$/);
    if (!match) return null;
    const dimKey = `Dim_${match[1].toUpperCase()}`;
    return ALL_DIMENSIONS.includes(dimKey) ? dimKey : null;
}

function getNextDimensionKey(usedDims) {
    return ALL_DIMENSIONS.find(dim => !usedDims.includes(dim)) || null;
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

function cleanText(val) {
    if (val == null) return '';
    const text = String(val).trim();
    return ['', 'nan', 'NaN', 'None', 'null', 'undefined'].includes(text) ? '' : text;
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
    const portfolio = [
        { region: '亚太区', country: '中国', model: 'SUV-旗舰', energy: '燃油', brand: '核心品牌', baseVolume: 5000, baseRevenue: 9800, baseCost: 6800, currVolume: 6200, currRevenue: 10300, currCost: 7100 },
        { region: '亚太区', country: '中国', model: 'Sedan-经典', energy: '混动', brand: '核心品牌', baseVolume: 3500, baseRevenue: 7600, baseCost: 5600, currVolume: 3000, currRevenue: 7800, currCost: 5900 },
        { region: '亚太区', country: '中国', model: 'EV-新能源', energy: '纯电', brand: '新能源品牌', baseVolume: 1600, baseRevenue: 11200, baseCost: 7600, currVolume: 2600, currRevenue: 11800, currCost: 8100 },
        { region: '亚太区', country: '日本', model: 'SUV-旗舰', energy: '混动', brand: '高端品牌', baseVolume: 2000, baseRevenue: 9100, baseCost: 5900, currVolume: 1800, currRevenue: 9300, currCost: 6200 },
        { region: '亚太区', country: '日本', model: 'EV-新能源', energy: '纯电', brand: '新能源品牌', baseVolume: 1500, baseRevenue: 11200, baseCost: 7700, currVolume: 2200, currRevenue: 11800, currCost: 8050 },
        { region: '亚太区', country: '泰国', model: 'MPV-家用', energy: '燃油', brand: '核心品牌', baseVolume: 900, baseRevenue: 7200, baseCost: 5200, currVolume: 1400, currRevenue: 7600, currCost: 5500 },
        { region: '亚太区', country: '印度', model: 'Mini-EV', energy: '纯电', brand: '新能源品牌', baseVolume: 700, baseRevenue: 6100, baseCost: 4600, currVolume: 1250, currRevenue: 6400, currCost: 4800 },
        { region: '欧洲区', country: '德国', model: 'SUV-旗舰', energy: '燃油', brand: '高端品牌', baseVolume: 3000, baseRevenue: 10500, baseCost: 7000, currVolume: 2600, currRevenue: 10400, currCost: 7100 },
        { region: '欧洲区', country: '德国', model: 'Sedan-经典', energy: '混动', brand: '核心品牌', baseVolume: 2500, baseRevenue: 8200, baseCost: 6000, currVolume: 2100, currRevenue: 8000, currCost: 5900 },
        { region: '欧洲区', country: '法国', model: 'EV-新能源', energy: '纯电', brand: '新能源品牌', baseVolume: 1800, baseRevenue: 11800, baseCost: 8500, currVolume: 2800, currRevenue: 12300, currCost: 8700 },
        { region: '欧洲区', country: '西班牙', model: 'SUV-旗舰', energy: '混动', brand: '核心品牌', baseVolume: 1100, baseRevenue: 9300, baseCost: 6500, currVolume: 1700, currRevenue: 9000, currCost: 6700 },
        { region: '欧洲区', country: '意大利', model: 'MPV-家用', energy: '燃油', brand: '商用品牌', baseVolume: 600, baseRevenue: 7800, baseCost: 5600, currVolume: 900, currRevenue: 8100, currCost: 5850 },
        { region: '欧洲区', country: '英国', model: 'EV-新能源', energy: '纯电', brand: '高端品牌', baseVolume: 850, baseRevenue: 12400, baseCost: 8900, currVolume: 1250, currRevenue: 12800, currCost: 9200 },
        { region: '美洲区', country: '美国', model: 'SUV-旗舰', energy: '燃油', brand: '高端品牌', baseVolume: 4000, baseRevenue: 10100, baseCost: 6600, currVolume: 4200, currRevenue: 10200, currCost: 6700 },
        { region: '美洲区', country: '美国', model: 'Pickup-皮卡', energy: '燃油', brand: '商用品牌', baseVolume: 2800, baseRevenue: 10900, baseCost: 7900, currVolume: 3500, currRevenue: 11300, currCost: 8100 },
        { region: '美洲区', country: '墨西哥', model: 'Sedan-经典', energy: '燃油', brand: '核心品牌', baseVolume: 700, baseRevenue: 6900, baseCost: 5100, currVolume: 1250, currRevenue: 7100, currCost: 5200 },
        { region: '美洲区', country: '巴西', model: 'Sedan-经典', energy: '混动', brand: '核心品牌', baseVolume: 1200, baseRevenue: 7000, baseCost: 5500, currVolume: 1000, currRevenue: 6800, currCost: 5400 },
        { region: '美洲区', country: '巴西', model: 'SUV-旗舰', energy: '燃油', brand: '核心品牌', baseVolume: 800, baseRevenue: 8200, baseCost: 5700, currVolume: 1500, currRevenue: 8500, currCost: 5900 },
        { region: '中东非区', country: '沙特', model: 'SUV-旗舰', energy: '燃油', brand: '高端品牌', baseVolume: 900, baseRevenue: 11200, baseCost: 7600, currVolume: 1450, currRevenue: 11600, currCost: 7950 },
        { region: '中东非区', country: '阿联酋', model: 'EV-新能源', energy: '纯电', brand: '新能源品牌', baseVolume: 600, baseRevenue: 12100, baseCost: 8400, currVolume: 1050, currRevenue: 12600, currCost: 8700 },
        { region: '中东非区', country: '南非', model: 'Sedan-经典', energy: '燃油', brand: '核心品牌', baseVolume: 700, baseRevenue: 6600, baseCost: 5000, currVolume: 1100, currRevenue: 6900, currCost: 5200 },
        { region: '中东非区', country: '埃及', model: 'Mini-EV', energy: '纯电', brand: '新能源品牌', baseVolume: 500, baseRevenue: 5800, baseCost: 4300, currVolume: 800, currRevenue: 6100, currCost: 4500 },
    ];

    return portfolio.flatMap(item => ([
        { month: '2025-01', volume: item.baseVolume, unitRevenue: item.baseRevenue, unitCost: item.baseCost },
        { month: '2025-02', volume: item.currVolume, unitRevenue: item.currRevenue, unitCost: item.currCost }
    ]).map(period => {
        const netRevenue = Math.round(period.volume * period.unitRevenue);
        const cost = -Math.round(period.volume * period.unitCost);
        return {
            '月份': period.month,
            '大区': item.region,
            '国家': item.country,
            '车型': item.model,
            '燃油品类': item.energy,
            '品牌': item.brand,
            '销量': period.volume,
            '净收入': netRevenue,
            '成本': cost,
            '边际': netRevenue + cost
        };
    }));
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
    document.getElementById('period-section').style.display = 'block';
    document.getElementById('drill-order-section').style.display = 'block';
    document.getElementById('drill-filter-section').style.display = 'block';

    // 切换主内容区
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('analysis-area').style.display = 'block';
    document.getElementById('pvm-assumptions').style.display = 'block';

    // 填充月份选择器
    populateMonthSelectors();

    // 填充分析指标选择器
    populateMetricSelector();

    // 填充下钻顺序选择器
    populateDrillOrder();

    // 填充维度筛选器
    populateDrillFilters();

    updateAttributionMethodNote();

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

}


// ==================== 用户设置 ====================
function initUserSettings() {
    const unitInput = document.getElementById('input-unit-name');
    const metricInput = document.getElementById('input-metric-type');
    const methodInput = document.getElementById('input-attribution-method');
    if (!unitInput && !metricInput && !methodInput) return;

    if (unitInput) {
        unitInput.value = getUnitName();
        unitInput.addEventListener('input', () => {
            AppState.unitName = normalizeMetricSetting(unitInput.value, '车');
            handleMetricSettingChange();
        });
        unitInput.addEventListener('change', () => {
            AppState.unitName = normalizeMetricSetting(unitInput.value, '车');
            unitInput.value = getUnitName();
            handleMetricSettingChange();
        });
    }

    if (metricInput) {
        metricInput.addEventListener('change', () => {
            AppState.selectedMetricKey = metricInput.value;
            syncSelectedMetricType();
            refreshCurrentMetricRows();
            updateMetricCopy();
            if (AppState.dataLoaded) triggerUpdate();
        });
    }

    if (methodInput) {
        methodInput.value = normalizeAttributionMethod(AppState.attributionMethod);
        methodInput.addEventListener('change', () => {
            AppState.attributionMethod = normalizeAttributionMethod(methodInput.value);
            methodInput.value = AppState.attributionMethod;
            updateAttributionMethodNote();
            if (AppState.dataLoaded) triggerUpdate();
        });
    }

    updateMetricCopy();
    updateAttributionMethodNote();
}

function handleMetricSettingChange() {
    populateMetricSelector();
    updateMetricCopy();
    if (AppState.dataLoaded) triggerUpdate();
}

function populateMetricSelector() {
    const metricInput = document.getElementById('input-metric-type');
    if (!metricInput) return;

    const metrics = AppState.metricColumns.length
        ? AppState.metricColumns
        : [{ key: 'Metric_1', metricType: getUnitMetricType(), sourceHeader: getTotalMetricLabel() }];

    metricInput.innerHTML = '';
    metrics.forEach((metric) => {
        const option = document.createElement('option');
        option.value = metric.key;
        option.textContent = buildUnitMetricLabel(getUnitName(), metric.metricType);
        metricInput.appendChild(option);
    });

    if (!metrics.some(metric => metric.key === AppState.selectedMetricKey)) {
        AppState.selectedMetricKey = resolveInitialMetricKey(metrics);
        syncSelectedMetricType();
        refreshCurrentMetricRows();
    }
    metricInput.value = AppState.selectedMetricKey || metrics[0]?.key || '';
}

function resolveInitialMetricKey(metrics) {
    if (!metrics || metrics.length === 0) return null;
    const currentMetricType = normalizeMetricSetting(AppState.unitMetricType, '边际');
    const exactMatch = metrics.find(metric => metric.metricType === currentMetricType);
    if (exactMatch) return exactMatch.key;
    const marginMatch = metrics.find(metric => metric.metricType === '边际');
    return (marginMatch || metrics[0]).key;
}

function getSelectedMetricConfig() {
    return AppState.metricColumns.find(metric => metric.key === AppState.selectedMetricKey) || null;
}

function syncSelectedMetricType() {
    const metric = getSelectedMetricConfig();
    if (metric) AppState.unitMetricType = normalizeMetricSetting(metric.metricType, '边际');
}

function refreshCurrentMetricRows() {
    if (!AppState.rawRows || !AppState.selectedMetricKey) return;
    AppState.df = applySelectedMetricToRows(AppState.rawRows, AppState.selectedMetricKey);
}

function normalizeMetricSetting(value, fallback) {
    return String(value == null ? '' : value).trim() || fallback;
}

function getUnitName() {
    return normalizeMetricSetting(AppState.unitName, '车');
}

function getUnitMetricType() {
    return normalizeMetricSetting(AppState.unitMetricType, '边际');
}

function buildUnitMetricLabel(unitName = '车', metricType = '边际') {
    const safeMetricType = normalizeMetricSetting(metricType, '边际');
    if (safeMetricType.startsWith('单')) return safeMetricType;
    return `单${normalizeMetricSetting(unitName, '车')}${safeMetricType}`;
}

function normalizeAttributionMethod(value) {
    return value === ATTRIBUTION_METHOD_BOTTOM_UP ? ATTRIBUTION_METHOD_BOTTOM_UP : ATTRIBUTION_METHOD_LAYERED;
}

function getAttributionMethodNote(method = AppState.attributionMethod) {
    if (normalizeAttributionMethod(method) === ATTRIBUTION_METHOD_BOTTOM_UP) {
        return '当前使用模式二：先按最细维度组合计算，再汇总到各层图表；最细颗粒越稳定，结果越适合解读。';
    }
    return '当前使用模式一：逐层独立归因；每一层按该层维度重新计算。';
}

function updateAttributionMethodNote() {
    const methodInput = document.getElementById('input-attribution-method');
    const note = document.getElementById('attribution-method-note');
    AppState.attributionMethod = normalizeAttributionMethod(AppState.attributionMethod);

    if (methodInput) methodInput.value = AppState.attributionMethod;
    if (note) {
        note.textContent = getAttributionMethodNote(AppState.attributionMethod);
        note.dataset.method = AppState.attributionMethod;
    }
}

function getUnitMetricLabel() {
    return buildUnitMetricLabel(getUnitName(), getUnitMetricType());
}

function getTotalMetricLabel() {
    const unitMetricLabel = getUnitMetricLabel();
    const currentPrefix = `单${getUnitName()}`;
    if (unitMetricLabel.startsWith(currentPrefix)) return `${unitMetricLabel.slice(currentPrefix.length)}总额`;
    if (unitMetricLabel.startsWith('单车')) return `${unitMetricLabel.slice(2)}总额`;
    if (unitMetricLabel.startsWith('单') && unitMetricLabel.length > 2) return `${unitMetricLabel.slice(2)}总额`;
    return `${unitMetricLabel}总额`;
}

function updateMetricCopy() {
    const unitMetricLabel = getUnitMetricLabel();
    const totalMetricLabel = getTotalMetricLabel();

    document.querySelectorAll('[data-unit-metric-label]').forEach((el) => {
        el.textContent = unitMetricLabel;
    });
    document.querySelectorAll('[data-total-metric-label]').forEach((el) => {
        el.textContent = totalMetricLabel;
    });

}

// ==================== 下钻顺序路径 ====================
function populateDrillOrder() {
    const container = document.getElementById('drill-order-selects');
    if (!container) return;
    container.innerHTML = '';

    const availableDims = AppState.availableDimsInData;
    if (!availableDims.length) {
        const empty = document.createElement('p');
        empty.className = 'drill-train-empty';
        empty.textContent = '暂无可用维度';
        container.appendChild(empty);
        return;
    }

    const activeOrder = getNormalizedDrillOrder(AppState.drillOrder);
    if (activeOrder.length !== AppState.drillOrder.length || activeOrder.some((dim, index) => dim !== AppState.drillOrder[index])) {
        AppState.drillOrder = activeOrder;
    }

    const activeIndex = getActiveDrillLevelIndex(activeOrder);
    const activeDim = activeOrder[activeIndex] || activeOrder[0];

    const head = document.createElement('div');
    head.className = 'drill-train-head';
    head.innerHTML = `
        <span>维度路径</span>
        <strong>${activeDim ? `当前层：${escapeHTML(getDimensionLabel(activeDim))}` : '未配置'}</strong>
    `;
    container.appendChild(head);

    const train = document.createElement('div');
    train.className = 'dimension-train margin-dimension-train';
    train.setAttribute('aria-label', '下钻维度路径');

    train.appendChild(buildImpactBaselineTarget(IMPACT_BASELINE_GLOBAL, '全局', { isGlobal: true }));
    activeOrder.forEach((dim, index) => {
        train.appendChild(buildDrillTrainCar(dim, index, activeIndex, activeOrder.length));
    });
    container.appendChild(train);

    const hint = document.createElement('p');
    hint.className = 'dimension-train-hint';
    hint.textContent = activeOrder.length > 1
        ? '电脑端拖动左侧绿色“基准”条，可切换影响基准；拖动维度卡片，可调整下钻顺序。手机端点击路径卡片可设为基准。'
        : '至少保留一个下钻维度。';
    container.appendChild(hint);
}

function getDimensionLabel(dim) {
    return AppState.customDimNames[dim] || dim;
}

function getNormalizedDrillOrder(order) {
    const used = new Set();
    const normalized = [];
    order.forEach(dim => {
        if (!AppState.availableDimsInData.includes(dim) || used.has(dim)) return;
        used.add(dim);
        normalized.push(dim);
    });
    return normalized.length ? normalized : AppState.availableDimsInData.slice(0, 1);
}

function normalizeImpactBaselineDim(value, order = AppState.drillOrder) {
    if (value === IMPACT_BASELINE_GLOBAL) return IMPACT_BASELINE_GLOBAL;
    return order.includes(value) ? value : IMPACT_BASELINE_GLOBAL;
}

function applyImpactBaselineSelection(value) {
    AppState.impactBaselineDim = normalizeImpactBaselineDim(value, AppState.drillOrder);
    populateDrillOrder();
    populateDrillFilters();
    triggerUpdate();
}

function buildImpactBaselineTarget(targetDim, label, options = {}) {
    const isBaseline = AppState.impactBaselineDim === targetDim;
    const target = document.createElement('div');
    target.className = 'dimension-train-car global-baseline baseline-target';
    if (isBaseline) target.classList.add('baseline-active');
    target.dataset.baselineTarget = targetDim;
    target.setAttribute('role', 'button');
    target.setAttribute('tabindex', '0');
    target.setAttribute('aria-label', `设为影响基准：${label}`);
    target.innerHTML = `
        <span>${options.isGlobal ? '全局' : '基准'}</span>
        <strong>${options.isGlobal ? '全局' : escapeHTML(label)}</strong>
        <em>固定</em>
    `;
    if (isBaseline) target.insertBefore(buildImpactBaselineAnchor(), target.firstChild);
    attachImpactBaselineDropHandlers(target, targetDim);
    target.addEventListener('click', () => {
        if (isMobile()) applyImpactBaselineSelection(targetDim);
    });
    target.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        applyImpactBaselineSelection(targetDim);
    });
    return target;
}

function buildImpactBaselineAnchor() {
    const baselineAnchor = document.createElement('button');
    baselineAnchor.type = 'button';
    baselineAnchor.className = 'impact-baseline-handle';
    baselineAnchor.draggable = true;
    baselineAnchor.innerHTML = `
        <span class="impact-baseline-handle-label">基准</span>
    `;
    baselineAnchor.title = '拖动左侧绿色基准条切换影响基准';
    baselineAnchor.setAttribute('aria-label', '拖动左侧绿色基准条切换影响基准');
    baselineAnchor.addEventListener('click', (event) => event.stopPropagation());
    baselineAnchor.addEventListener('dragstart', (event) => {
        event.stopPropagation();
        baselineAnchor.classList.add('dragging');
        document.body.classList.add('baseline-tail-visible');
        event.dataTransfer?.setData('application/x-margin-impact-baseline', '1');
        event.dataTransfer?.setData('text/plain', 'impact-baseline');
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    });
    baselineAnchor.addEventListener('dragend', () => {
        baselineAnchor.classList.remove('dragging');
        document.body.classList.remove('baseline-tail-visible');
        clearImpactBaselineDropTargets();
    });
    return baselineAnchor;
}

function isImpactBaselineDrag(event) {
    return Array.from(event.dataTransfer?.types || []).includes('application/x-margin-impact-baseline');
}

function attachImpactBaselineDropHandlers(target, targetDim) {
    target.addEventListener('dragover', (event) => {
        if (!isImpactBaselineDrag(event)) return;
        event.preventDefault();
        target.classList.add('baseline-drop-target');
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    });
    target.addEventListener('dragleave', () => {
        target.classList.remove('baseline-drop-target');
    });
    target.addEventListener('drop', (event) => {
        if (!isImpactBaselineDrag(event)) return;
        event.preventDefault();
        clearImpactBaselineDropTargets();
        applyImpactBaselineSelection(targetDim);
    });
}

function clearImpactBaselineDropTargets() {
    document.querySelectorAll('.baseline-drop-target').forEach((target) => {
        target.classList.remove('baseline-drop-target');
    });
}

function getActiveDrillLevelIndex(order = AppState.drillOrder) {
    const firstOpenIndex = order.findIndex(dim => !hasDimensionFilter(dim));
    if (firstOpenIndex >= 0) return firstOpenIndex;
    return Math.max(0, order.length - 1);
}

function buildDrillTrainCar(dim, index, activeIndex, orderLength) {
    const car = document.createElement('div');
    const hasFilter = hasDimensionFilter(dim);
    const isBaseline = AppState.impactBaselineDim === dim;
    car.className = `dimension-train-car baseline-target ${hasFilter ? 'filtered' : ''} ${index === activeIndex ? 'active' : ''} ${isBaseline ? 'baseline-active' : ''}`;
    car.draggable = true;
    car.dataset.dimensionIndex = String(index);
    car.dataset.dimension = dim;
    car.dataset.baselineTarget = dim;
    car.title = '拖动调整顺序';
    car.innerHTML = `
        <span>${hasFilter ? '已选' : index === activeIndex ? '当前' : index + 1}</span>
        <strong>${escapeHTML(DIM_ICONS[dim] || '')} ${escapeHTML(getDimensionLabel(dim))}</strong>
        <button type="button" class="dimension-train-remove" ${orderLength <= 1 ? 'disabled' : ''} aria-label="移除${escapeHTML(getDimensionLabel(dim))}">×</button>
    `;
    if (isBaseline) car.insertBefore(buildImpactBaselineAnchor(), car.firstChild);
    attachImpactBaselineDropHandlers(car, dim);

    const removeButton = car.querySelector('.dimension-train-remove');
    removeButton?.addEventListener('click', (event) => {
        event.stopPropagation();
        if (orderLength <= 1) return;
        applyDrillOrder(AppState.drillOrder.filter(item => item !== dim));
    });

    car.addEventListener('dragstart', (event) => {
        car.classList.add('dragging');
        event.dataTransfer?.setData('text/plain', String(index));
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    });

    car.addEventListener('dragend', () => {
        car.classList.remove('dragging');
        car.classList.remove('drop-target');
    });

    car.addEventListener('dragover', (event) => {
        if (isImpactBaselineDrag(event)) return;
        event.preventDefault();
        car.classList.add('drop-target');
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    });

    car.addEventListener('dragleave', () => {
        car.classList.remove('drop-target');
    });

    car.addEventListener('drop', (event) => {
        if (isImpactBaselineDrag(event)) return;
        event.preventDefault();
        car.classList.remove('drop-target');
        const fromIndex = Number(event.dataTransfer?.getData('text/plain'));
        moveDrillDimensionInOrder(fromIndex, index);
    });

    car.addEventListener('click', (event) => {
        if (event.target.closest('.dimension-train-remove')) return;
        if (isMobile()) applyImpactBaselineSelection(dim);
    });

    return car;
}

function moveDrillDimensionInOrder(fromIndex, toIndex) {
    const order = [...AppState.drillOrder];
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= order.length || toIndex >= order.length) return;
    const [moved] = order.splice(fromIndex, 1);
    order.splice(toIndex, 0, moved);
    applyDrillOrder(order);
}

function applyDrillOrder(nextOrder) {
    const normalized = getNormalizedDrillOrder(nextOrder);
    const isSame = normalized.length === AppState.drillOrder.length
        && normalized.every((dim, index) => dim === AppState.drillOrder[index]);
    if (isSame) return;

    AppState.drillOrder = normalized;
    AppState.impactBaselineDim = normalizeImpactBaselineDim(AppState.impactBaselineDim, normalized);
    ALL_DIMENSIONS.forEach(d => AppState.selectedDims[d] = null);
    ALL_DIMENSIONS.forEach(d => AppState.excludedDims[d] = null);
    AppState.filterModes = {};
    AppState.attributionViewModes = {};
    populateDrillOrder();
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
        msContainer.className = 'multiselect-container excel-filter-shell';
        msContainer.dataset.dim = dim;

        // 标签
        const header = document.createElement('div');
        header.className = 'multiselect-header';

        const msLabel = document.createElement('label');
        msLabel.className = 'multiselect-label';
        msLabel.textContent = `${icon} ${dimName}`;

        const count = document.createElement('span');
        count.className = 'excel-filter-count';
        count.textContent = getExcelFilterSummary(dim, availableValues);

        header.appendChild(msLabel);
        header.appendChild(count);

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'excel-filter-trigger';
        trigger.dataset.dim = dim;
        trigger.setAttribute('aria-haspopup', 'menu');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.innerHTML = `
            <span>${escapeHTML(getExcelFilterTriggerText(dim, availableValues))}</span>
            <span class="excel-filter-caret">⌄</span>
        `;

        const menu = document.createElement('div');
        menu.className = 'excel-filter-menu';
        menu.dataset.dim = dim;
        menu.hidden = true;
        renderExcelFilterMenu(menu, dim, availableValues);

        trigger.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleExcelFilterMenu(msContainer);
        });
        menu.addEventListener('click', (event) => event.stopPropagation());

        msContainer.appendChild(header);
        msContainer.appendChild(trigger);
        msContainer.appendChild(menu);
        container.appendChild(msContainer);
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
    const filteredData = applyDrillDimensionFilters(AppState.df, drillOrder, levelIndex);

    // 提取当前维度的唯一值
    const valueSet = new Set(filteredData.map(row => row[dim]).filter(v => v !== undefined && v !== ''));
    return Array.from(valueSet).sort();
}

function normalizeDimensionFilter(values) {
    return Array.isArray(values) ? values : [];
}

function getActiveDimensionFilterValues(dim) {
    return [
        ...normalizeDimensionFilter(AppState.selectedDims[dim]),
        ...normalizeDimensionFilter(AppState.excludedDims[dim])
    ];
}

function hasDimensionFilter(dim) {
    return getActiveDimensionFilterValues(dim).length > 0;
}

function getExcelSelectedValues(dim, availableValues) {
    const availableSet = new Set(availableValues);
    const included = normalizeDimensionFilter(AppState.selectedDims[dim]).filter(value => availableSet.has(value));
    if (included.length > 0) return new Set(included);

    const excluded = new Set(normalizeDimensionFilter(AppState.excludedDims[dim]));
    return new Set(availableValues.filter(value => !excluded.has(value)));
}

function getExcelFilterSummary(dim, availableValues) {
    if (!availableValues.length) return '无可选项';
    const selectedCount = getExcelSelectedValues(dim, availableValues).size;
    if (selectedCount === availableValues.length) return '全部';
    if (selectedCount === 0) return '未选择';
    return `已选 ${selectedCount}/${availableValues.length}`;
}

function getExcelFilterTriggerText(dim, availableValues) {
    if (!availableValues.length) return '暂无可选项';
    const selectedCount = getExcelSelectedValues(dim, availableValues).size;
    const hiddenCount = availableValues.length - selectedCount;
    if (hiddenCount === 0) return '全部维度项';
    if (selectedCount === 0) return `已隐藏全部 ${availableValues.length} 项`;
    return `已选 ${selectedCount} 项，隐藏 ${hiddenCount} 项`;
}

function renderExcelFilterMenu(menu, dim, availableValues) {
    let selectedValues = getExcelSelectedValues(dim, availableValues);
    const rowsId = `excel-filter-list-${dim}`;
    menu.innerHTML = '';
    menu.setAttribute('role', 'menu');

    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'excel-filter-search';
    search.placeholder = '搜索维度项';
    search.setAttribute('aria-label', '搜索维度项');

    const keepSearchButton = document.createElement('button');
    keepSearchButton.type = 'button';
    keepSearchButton.className = 'excel-filter-search-action';
    keepSearchButton.textContent = '仅保留搜索结果';
    keepSearchButton.hidden = true;
    keepSearchButton.addEventListener('click', () => {
        const searchValues = resolveExcelFilterSearchValues(availableValues, search.value);
        applyExcelFilterSelection(dim, availableValues, new Set(searchValues));
        closeExcelFilterMenus();
    });

    const actions = document.createElement('div');
    actions.className = 'excel-filter-actions';

    const list = document.createElement('div');
    list.className = 'excel-filter-list';
    list.id = rowsId;

    const footer = document.createElement('div');
    footer.className = 'excel-filter-footer';

    const summary = document.createElement('span');
    summary.className = 'excel-filter-footer-summary';

    const footerActions = document.createElement('div');
    footerActions.className = 'excel-filter-footer-actions';

    const applyButton = document.createElement('button');
    applyButton.type = 'button';
    applyButton.className = 'excel-filter-apply';
    applyButton.textContent = '应用';
    applyButton.addEventListener('click', () => {
        const appliedValues = resolveExcelFilterAppliedValues(availableValues, selectedValues);
        applyExcelFilterSelection(dim, availableValues, new Set(appliedValues));
        closeExcelFilterMenus();
    });

    const renderRows = () => {
        const keyword = search.value.trim().toLowerCase();
        list.innerHTML = '';
        const visibleValues = resolveExcelFilterSearchValues(availableValues, search.value);
        const hasKeyword = keyword.length > 0;
        keepSearchButton.hidden = !hasKeyword;
        keepSearchButton.disabled = !hasKeyword || visibleValues.length === 0;
        applyButton.textContent = keyword ? '应用到当前勾选' : '应用';

        visibleValues.forEach((value) => {
            const option = document.createElement('button');
            option.type = 'button';
            option.className = 'excel-filter-option';
            option.dataset.value = value;
            option.setAttribute('role', 'menuitemcheckbox');
            option.setAttribute('aria-checked', String(selectedValues.has(value)));
            option.innerHTML = `
                <span class="excel-filter-checkmark">${selectedValues.has(value) ? '✓' : ''}</span>
                <span class="excel-filter-option-label">${escapeHTML(value)}</span>
            `;
            option.addEventListener('click', () => {
                if (selectedValues.has(value)) {
                    selectedValues.delete(value);
                } else {
                    selectedValues.add(value);
                }
                renderRows();
            });
            list.appendChild(option);
        });

        if (visibleValues.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'excel-filter-empty';
            empty.textContent = '没有匹配项';
            list.appendChild(empty);
        }

        if (keyword) {
            summary.textContent = `搜索到 ${visibleValues.length} 项，当前勾选 ${selectedValues.size}/${availableValues.length}`;
        } else {
            summary.textContent = `${selectedValues.size}/${availableValues.length} 项已勾选`;
        }
    };

    actions.appendChild(createExcelFilterAction('全选', () => {
        selectedValues = new Set(availableValues);
        renderRows();
    }));
    actions.appendChild(createExcelFilterAction('反选', () => {
        selectedValues = new Set(availableValues.filter(value => !selectedValues.has(value)));
        renderRows();
    }));
    actions.appendChild(createExcelFilterAction('清空', () => {
        selectedValues = new Set();
        renderRows();
    }));

    search.addEventListener('input', renderRows);

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

function resolveExcelFilterSearchValues(availableValues, searchText = '') {
    const keyword = String(searchText || '').trim().toLowerCase();
    if (!keyword) return [...availableValues];
    return availableValues.filter(value => String(value).toLowerCase().includes(keyword));
}

function resolveExcelFilterAppliedValues(availableValues, selectedValues) {
    return availableValues.filter(value => selectedValues.has(value));
}

function createExcelFilterAction(label, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'excel-filter-action';
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
}

function applyExcelFilterSelection(dim, availableValues, selectedValues) {
    const uncheckedValues = availableValues.filter(value => !selectedValues.has(value));
    AppState.selectedDims[dim] = null;
    AppState.excludedDims[dim] = uncheckedValues.length > 0 ? uncheckedValues : null;

    refreshCascadingFilters(dim);
    populateDrillOrder();
    populateDrillFilters();
    triggerUpdate();
}

function toggleExcelFilterMenu(container) {
    const trigger = container.querySelector('.excel-filter-trigger');
    const menu = container.querySelector('.excel-filter-menu');
    if (!trigger || !menu) return;

    const shouldOpen = menu.hidden;
    closeExcelFilterMenus();
    if (!shouldOpen) return;

    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    scrollExcelFilterMenuIntoView(menu);
    window.setTimeout(() => menu.querySelector('.excel-filter-search')?.focus({ preventScroll: true }), 80);
}

function scrollExcelFilterMenuIntoView(menu) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar || !menu) return;

    window.requestAnimationFrame(() => {
        const sidebarRect = sidebar.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        const bottomPadding = 18;
        const topPadding = 14;
        const bottomOverflow = menuRect.bottom - sidebarRect.bottom + bottomPadding;
        const topOverflow = sidebarRect.top - menuRect.top + topPadding;

        if (bottomOverflow > 0) {
            sidebar.scrollTo({
                top: sidebar.scrollTop + bottomOverflow,
                behavior: 'smooth'
            });
            return;
        }

        if (topOverflow > 0) {
            sidebar.scrollTo({
                top: Math.max(0, sidebar.scrollTop - topOverflow),
                behavior: 'smooth'
            });
        }
    });
}

function closeExcelFilterMenus() {
    document.querySelectorAll('.excel-filter-menu:not([hidden])').forEach((menu) => {
        menu.hidden = true;
        const trigger = menu.closest('.excel-filter-shell')?.querySelector('.excel-filter-trigger');
        trigger?.setAttribute('aria-expanded', 'false');
    });
}

function initExcelFilterDismiss() {
    document.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest('.excel-filter-shell')) return;
        closeExcelFilterMenus();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeExcelFilterMenus();
    });
}

function refreshCascadingFilters(changedDim) {
    const drillOrder = AppState.drillOrder;
    const changedIndex = drillOrder.indexOf(changedDim);

    // 重建所有 changedIndex 之后的筛选器
    for (let i = changedIndex + 1; i < drillOrder.length - 1; i++) {
        const dim = drillOrder[i];
        const availableValues = getFilteredValuesForDim(dim, i);

        // 清除不再有效的选择
        AppState.selectedDims[dim] = normalizeDimensionFilter(AppState.selectedDims[dim])
            .filter(v => availableValues.includes(v));
        if (AppState.selectedDims[dim].length === 0) AppState.selectedDims[dim] = null;
        AppState.excludedDims[dim] = normalizeDimensionFilter(AppState.excludedDims[dim])
            .filter(v => availableValues.includes(v));
        if (AppState.excludedDims[dim].length === 0) AppState.excludedDims[dim] = null;
    }
}


// ==================== 重置筛选按钮 ====================
function initResetFilter() {
    const btn = document.getElementById('btn-reset-filter');
    if (btn) {
        btn.addEventListener('click', () => {
            ALL_DIMENSIONS.forEach(d => AppState.selectedDims[d] = null);
            ALL_DIMENSIONS.forEach(d => AppState.excludedDims[d] = null);
            AppState.filterModes = {};
            AppState.attributionViewModes = {};
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
        triggerUpdate();
    });

    currSelect.addEventListener('change', () => {
        AppState.currMonth = currSelect.value;
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


function createPVMBucket() {
    return {
        vol: 0,
        margin: 0
    };
}

function addRowToPVMBucket(bucket, row) {
    const volume = Number(row['Sales Volume']) || 0;
    const margin = Number(row['Total Margin']) || 0;

    bucket.vol += volume;
    bucket.margin += margin;
}


// ==================== 当前维度 PVM 效应计算 ====================
/**
 * 在当前展示维度上计算 Mix 和 Rate 效应。
 * 这种口径适合版型、国家、配置频繁变化的数据。
 *
 * @param {Array} data - 已筛选的数据行
 * @param {string} baseMonth - 基期
 * @param {string} currMonth - 当期
 * @param {string} groupDim - 当前展示维度 (如 'Dim_A')
 * @param {number} totalVolCurr - 当期全局/视图总销量（用于计算权重）
 * @param {number} totalVolBase - 基期全局/视图总销量（用于计算权重）
 * @param {number} avgMarginBase - 基期全局/视图平均单车指标
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
            if (!baseAgg[key]) baseAgg[key] = createPVMBucket();
            addRowToPVMBucket(baseAgg[key], row);
        }
        if (row['Month'] === currMonth) {
            if (!currAgg[key]) currAgg[key] = createPVMBucket();
            addRowToPVMBucket(currAgg[key], row);
        }
    });

    const allKeys = new Set([...Object.keys(baseAgg), ...Object.keys(currAgg)]);
    const safeAvgMarginBase = Number.isFinite(avgMarginBase) ? avgMarginBase : 0;

    return [...allKeys].map(key => {
        const baseData = baseAgg[key] || createPVMBucket();
        const currData = currAgg[key] || createPVMBucket();
        const weightBase = totalVolBase > 0 ? baseData.vol / totalVolBase : 0;
        const weightCurr = totalVolCurr > 0 ? currData.vol / totalVolCurr : 0;
        const marginUnitBase = baseData.vol !== 0 ? baseData.margin / baseData.vol : 0;
        const marginUnitCurr = currData.vol !== 0 ? currData.margin / currData.vol : 0;

        const row = {
            [groupDim]: key,
            Vol_Base: baseData.vol,
            Vol_Curr: currData.vol,
            Total_Margin_Base: baseData.margin,
            Total_Margin_Curr: currData.margin,
            Margin_Unit_Base: marginUnitBase,
            Margin_Unit_Curr: marginUnitCurr
        };

        if (baseData.vol === 0 && currData.vol !== 0) {
            row.Mix_Effect = weightCurr * (marginUnitCurr - safeAvgMarginBase);
            row.Rate_Effect = 0;
        } else if (currData.vol === 0 && baseData.vol !== 0) {
            row.Mix_Effect = -weightBase * (marginUnitBase - safeAvgMarginBase);
            row.Rate_Effect = 0;
        } else {
            row.Mix_Effect = (weightCurr - weightBase) * (marginUnitBase - safeAvgMarginBase);
            row.Rate_Effect = weightCurr * (marginUnitCurr - marginUnitBase);
        }

        row.Total_Contribution = row.Mix_Effect + row.Rate_Effect;
        return row;
    });
}

function normalizeBottomUpLeafDims(groupDim, leafDims) {
    const dims = Array.isArray(leafDims) ? leafDims.filter(Boolean) : [];
    const withGroupDim = dims.includes(groupDim) ? dims : [groupDim, ...dims];
    return [...new Set(withGroupDim)];
}

function getBottomUpLeafKey(row, leafDims) {
    return JSON.stringify(leafDims.map(dim => String(row?.[dim] ?? '')));
}

function createBottomUpLeafBucket(groupValue) {
    return {
        groupValue,
        base: createPVMBucket(),
        curr: createPVMBucket()
    };
}

function createBottomUpDisplayBucket(groupDim, groupValue) {
    return {
        [groupDim]: groupValue,
        Vol_Base: 0,
        Vol_Curr: 0,
        Total_Margin_Base: 0,
        Total_Margin_Curr: 0,
        Margin_Unit_Base: 0,
        Margin_Unit_Curr: 0,
        Mix_Effect: 0,
        Rate_Effect: 0,
        Total_Contribution: 0
    };
}

function calculateLeafPVMRow(leaf, groupDim, totalVolCurr, totalVolBase, avgMarginBase) {
    const baseData = leaf.base || createPVMBucket();
    const currData = leaf.curr || createPVMBucket();
    const weightBase = totalVolBase > 0 ? baseData.vol / totalVolBase : 0;
    const weightCurr = totalVolCurr > 0 ? currData.vol / totalVolCurr : 0;
    const marginUnitBase = baseData.vol !== 0 ? baseData.margin / baseData.vol : 0;
    const marginUnitCurr = currData.vol !== 0 ? currData.margin / currData.vol : 0;
    const safeAvgMarginBase = Number.isFinite(avgMarginBase) ? avgMarginBase : 0;

    const row = {
        [groupDim]: leaf.groupValue,
        Vol_Base: baseData.vol,
        Vol_Curr: currData.vol,
        Total_Margin_Base: baseData.margin,
        Total_Margin_Curr: currData.margin,
        Margin_Unit_Base: marginUnitBase,
        Margin_Unit_Curr: marginUnitCurr
    };

    if (baseData.vol === 0 && currData.vol !== 0) {
        row.Mix_Effect = weightCurr * (marginUnitCurr - safeAvgMarginBase);
        row.Rate_Effect = 0;
    } else if (currData.vol === 0 && baseData.vol !== 0) {
        row.Mix_Effect = -weightBase * (marginUnitBase - safeAvgMarginBase);
        row.Rate_Effect = 0;
    } else {
        row.Mix_Effect = (weightCurr - weightBase) * (marginUnitBase - safeAvgMarginBase);
        row.Rate_Effect = weightCurr * (marginUnitCurr - marginUnitBase);
    }

    row.Total_Contribution = row.Mix_Effect + row.Rate_Effect;
    return row;
}

function addLeafPVMRowToDisplayBucket(bucket, leafRow) {
    bucket.Vol_Base += leafRow.Vol_Base || 0;
    bucket.Vol_Curr += leafRow.Vol_Curr || 0;
    bucket.Total_Margin_Base += leafRow.Total_Margin_Base || 0;
    bucket.Total_Margin_Curr += leafRow.Total_Margin_Curr || 0;
    bucket.Mix_Effect += leafRow.Mix_Effect || 0;
    bucket.Rate_Effect += leafRow.Rate_Effect || 0;
    bucket.Total_Contribution += leafRow.Total_Contribution || 0;
}

function finalizeBottomUpDisplayBucket(bucket) {
    bucket.Margin_Unit_Base = bucket.Vol_Base !== 0 ? bucket.Total_Margin_Base / bucket.Vol_Base : 0;
    bucket.Margin_Unit_Curr = bucket.Vol_Curr !== 0 ? bucket.Total_Margin_Curr / bucket.Vol_Curr : 0;
    return bucket;
}

// ==================== 最细颗粒向上 PVM 效应计算 ====================
function calculateBottomUpPVMEffects(data, baseMonth, currMonth, groupDim, leafDims, totalVolCurr, totalVolBase, avgMarginBase) {
    const normalizedLeafDims = normalizeBottomUpLeafDims(groupDim, leafDims);
    const leafAgg = {};

    (data || []).forEach(row => {
        if (row['Month'] !== baseMonth && row['Month'] !== currMonth) return;
        const key = getBottomUpLeafKey(row, normalizedLeafDims);
        const groupValue = row[groupDim] || '';
        if (!leafAgg[key]) leafAgg[key] = createBottomUpLeafBucket(groupValue);
        if (row['Month'] === baseMonth) addRowToPVMBucket(leafAgg[key].base, row);
        if (row['Month'] === currMonth) addRowToPVMBucket(leafAgg[key].curr, row);
    });

    const displayAgg = {};
    Object.values(leafAgg).forEach(leaf => {
        const leafRow = calculateLeafPVMRow(leaf, groupDim, totalVolCurr, totalVolBase, avgMarginBase);
        const groupValue = leafRow[groupDim] || '';
        if (!displayAgg[groupValue]) displayAgg[groupValue] = createBottomUpDisplayBucket(groupDim, groupValue);
        addLeafPVMRowToDisplayBucket(displayAgg[groupValue], leafRow);
    });

    return Object.values(displayAgg).map(finalizeBottomUpDisplayBucket);
}

function calculateAttributionEffects(data, baseMonth, currMonth, groupDim, totalVolCurr, totalVolBase, avgMarginBase, attributionMethod = ATTRIBUTION_METHOD_LAYERED, leafDims = [groupDim]) {
    if (normalizeAttributionMethod(attributionMethod) === ATTRIBUTION_METHOD_BOTTOM_UP) {
        return calculateBottomUpPVMEffects(
            data,
            baseMonth,
            currMonth,
            groupDim,
            leafDims,
            totalVolCurr,
            totalVolBase,
            avgMarginBase
        );
    }

    return calculateDimensionPVMEffects(
        data,
        baseMonth,
        currMonth,
        groupDim,
        totalVolCurr,
        totalVolBase,
        avgMarginBase
    );
}


// ==================== 准备展示数据（添加占比和总计行） ====================
/**
 * 对应 app.py 的 prepare_display_dataframe()
 *
 * @param {Array} effectsData - PVM 效应聚合结果
 * @param {string} dimCol - 维度列名
 * @param {number} totalVolBase - 基期总销量（用于计算占比）
 * @param {number} totalVolCurr - 当期总销量（用于计算占比）
 * @param {number|null} totalMarginBase - 基期指标总额（用于总计行）
 * @param {number|null} totalMarginCurr - 当期指标总额（用于总计行）
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

    // 总计行的单车指标
    if (totalMarginBase != null && totalMarginCurr != null) {
        totalRow.Margin_Unit_Base = sumVolBase > 0 ? totalMarginBase / sumVolBase : 0;
        totalRow.Margin_Unit_Curr = sumVolCurr > 0 ? totalMarginCurr / sumVolCurr : 0;
    } else {
        // 下钻“对整体影响”视角没有传入总额时，优先用行级总金额汇总，避免零销量金额行在加权平均里被漏掉。
        const marginBase = data.reduce((s, r) => s + (Number(r.Total_Margin_Base) || 0), 0);
        const marginCurr = data.reduce((s, r) => s + (Number(r.Total_Margin_Curr) || 0), 0);
        if (marginBase || marginCurr) {
            totalRow.Margin_Unit_Base = sumVolBase > 0 ? marginBase / sumVolBase : 0;
            totalRow.Margin_Unit_Curr = sumVolCurr > 0 ? marginCurr / sumVolCurr : 0;
        } else {
            // 加权平均
            const wmBase = data.reduce((s, r) => s + r.Vol_Base * r.Margin_Unit_Base, 0);
            const wmCurr = data.reduce((s, r) => s + r.Vol_Curr * r.Margin_Unit_Curr, 0);
            totalRow.Margin_Unit_Base = sumVolBase > 0 ? wmBase / sumVolBase : 0;
            totalRow.Margin_Unit_Curr = sumVolCurr > 0 ? wmCurr / sumVolCurr : 0;
        }
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
    return applyDrillDimensionFilters(AppState.df, AppState.drillOrder, level);
}

function applyDrillDimensionFilters(data, drillOrder, level, selectedDims = AppState.selectedDims, excludedDims = AppState.excludedDims) {
    let filtered = data || [];

    for (let prevLevel = 0; prevLevel < level; prevLevel++) {
        const prevDim = drillOrder[prevLevel];
        filtered = filtered.filter(row => matchesDimensionFilter(row, prevDim, selectedDims, excludedDims));
    }

    return filtered;
}

function getImpactBaselineContext(data, drillOrder, level, baselineDim, baseMonth, currMonth, selectedDims = AppState.selectedDims, excludedDims = AppState.excludedDims, customDimNames = AppState.customDimNames) {
    const normalizedBaseline = normalizeImpactBaselineDim(baselineDim, drillOrder);
    const baselineIndex = drillOrder.indexOf(normalizedBaseline);
    const useGlobal = normalizedBaseline === IMPACT_BASELINE_GLOBAL || baselineIndex < 0 || baselineIndex >= level;
    const scopeData = useGlobal
        ? (data || [])
        : applyDrillDimensionFilters(data, drillOrder, baselineIndex + 1, selectedDims, excludedDims);
    const labels = { ...DEFAULT_DIMENSION_NAMES, ...(customDimNames || {}) };
    const targetLabel = useGlobal ? '全局' : (labels[normalizedBaseline] || normalizedBaseline);

    return {
        baselineDim: useGlobal ? IMPACT_BASELINE_GLOBAL : normalizedBaseline,
        targetLabel,
        scopeData,
        base: calculateGlobalMetrics(scopeData, baseMonth),
        curr: calculateGlobalMetrics(scopeData, currMonth)
    };
}

function matchesDimensionFilter(row, dim, selectedDims = AppState.selectedDims, excludedDims = AppState.excludedDims) {
    const value = row?.[dim];
    const included = normalizeDimensionFilter(selectedDims?.[dim]);
    const excluded = normalizeDimensionFilter(excludedDims?.[dim]);

    if (included.length > 0 && !included.includes(value)) return false;
    if (excluded.length > 0 && excluded.includes(value)) return false;
    return true;
}


// ==================== 触发完整 PVM 计算和渲染 ====================
function triggerUpdate() {
    if (!AppState.dataLoaded || !AppState.df) return;

    const { baseMonth, currMonth, drillOrder } = AppState;
    AppState.impactBaselineDim = normalizeImpactBaselineDim(AppState.impactBaselineDim, drillOrder);

    // 1. 全局指标
    const globalBase = calculateGlobalMetrics(AppState.df, baseMonth);
    const globalCurr = calculateGlobalMetrics(AppState.df, currMonth);
    const totalDiff = globalCurr.avgMargin - globalBase.avgMargin;

    // 2. 为每个下钻层级计算 PVM 效应
    const levelResults = [];

    for (let level = 0; level < drillOrder.length; level++) {
        const dim = drillOrder[level];
        const dfLevel = filterDataForLevel(level);

        if (dfLevel.length === 0) {
            levelResults.push({ dim, effects: null, displayData: null, globalEffects: null, globalDisplayData: null, drillInfo: [] });
            continue;
        }

        // 当前视图范围的基准指标
        const levelBase = calculateGlobalMetrics(dfLevel, baseMonth);
        const levelCurr = calculateGlobalMetrics(dfLevel, currMonth);

        // 基于当前视图范围权重计算 PVM 效应
        const effects = calculateAttributionEffects(
            dfLevel, baseMonth, currMonth, dim,
            levelCurr.totalVol, levelBase.totalVol, levelBase.avgMargin,
            AppState.attributionMethod, drillOrder
        );

        // 准备展示数据
        const displayData = prepareDisplayData(
            effects, dim,
            levelBase.totalVol, levelCurr.totalVol,
            levelBase.totalMargin, levelCurr.totalMargin
        );

        // 如果是下钻状态，额外计算全球视角的贡献
        let globalEffects = null;
        let globalDisplayData = null;
        let impactBaselineContext = null;
        const isDrilled = level > 0 && drillOrder.slice(0, level).some(prevDim => hasDimensionFilter(prevDim));

        if (isDrilled) {
            impactBaselineContext = getImpactBaselineContext(
                AppState.df,
                drillOrder,
                level,
                AppState.impactBaselineDim,
                baseMonth,
                currMonth,
                AppState.selectedDims,
                AppState.excludedDims,
                AppState.customDimNames
            );
            globalEffects = calculateAttributionEffects(
                dfLevel, baseMonth, currMonth, dim,
                impactBaselineContext.curr.totalVol,
                impactBaselineContext.base.totalVol,
                impactBaselineContext.base.avgMargin,
                AppState.attributionMethod, drillOrder
            );
            globalDisplayData = prepareDisplayData(
                globalEffects, dim,
                impactBaselineContext.base.totalVol,
                impactBaselineContext.curr.totalVol,
                null, null
            );
        }

        // 收集下钻信息
        const drillInfo = [];
        for (let prev = 0; prev < level; prev++) {
            const prevDim = drillOrder[prev];
            const included = normalizeDimensionFilter(AppState.selectedDims[prevDim]);
            const excluded = normalizeDimensionFilter(AppState.excludedDims[prevDim]);
            if (!included.length && !excluded.length) continue;

            const dimName = AppState.customDimNames[prevDim] || prevDim;
            if (included.length > 0) {
                const selText = included.length <= 3 ? included.join(', ') : `${included.length}项`;
                drillInfo.push(`${dimName}: ${selText}`);
            }
            if (excluded.length > 0) {
                const selText = excluded.length <= 3 ? excluded.join(', ') : `${excluded.length}项`;
                drillInfo.push(`${dimName}: 排除 ${selText}`);
            }
        }

        levelResults.push({
            dim,
            effects,
            displayData,
            globalEffects,
            globalDisplayData,
            impactBaselineContext,
            isDrilled,
            drillInfo,
            levelAvgMarginBase: levelBase.avgMargin,
            levelAvgMarginCurr: levelCurr.avgMargin
        });
    }

    // 3. 存储计算结果
    AppState.calculationResults = {
        globalBase,
        globalCurr,
        totalDiff,
        levelResults
    };

    // 4. 渲染图表和表格
    renderCharts();

    console.log('[triggerUpdate] 计算完成:', AppState.calculationResults);
}


// ==================== 渲染图表和表格 ====================
function renderCharts() {
    if (!AppState.calculationResults) return;
    const { levelResults, globalBase, globalCurr } = AppState.calculationResults;
    const container = document.getElementById('charts-container');
    hideWaterfallHoverTooltip();
    clearWaterfallTouchCards();
    container.innerHTML = '';

    // 显示 PVM 假设说明
    const pvmAssumptions = document.getElementById('pvm-assumptions');
    if (pvmAssumptions) pvmAssumptions.style.display = '';
    const attributionModeGuide = document.getElementById('attribution-mode-guide');
    if (attributionModeGuide) attributionModeGuide.style.display = '';
    const chartInteractionGuide = document.getElementById('chart-interaction-guide');
    if (chartInteractionGuide) chartInteractionGuide.style.display = '';

    const colorSchemes = ['claude', 'warm', 'soft'];
    const dimNames = AppState.customDimNames;

    levelResults.forEach((lr, level) => {
        if (!lr.effects || !lr.displayData) return;

        const dim = lr.dim;
        const dimName = dimNames[dim] || dim;
        const dimIcon = DIM_ICONS[dim] || '📊';
        const unitMetricLabel = getUnitMetricLabel();
        const viewMode = getAttributionViewMode(level, lr);
        const viewConfig = getAttributionViewConfig(lr, dimName, unitMetricLabel, viewMode, globalBase, globalCurr);

        // 层级容器
        const section = document.createElement('div');
        section.className = 'chart-level-section';
        section.dataset.level = level;

        // 标题
        section.appendChild(buildChartLevelHeader(dimIcon, dimName, lr, level, viewMode));

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

        const touchCardDiv = document.createElement('div');
        touchCardDiv.id = `waterfall-touch-card-${level}`;
        touchCardDiv.className = 'waterfall-touch-host';
        touchCardDiv.setAttribute('aria-live', 'polite');
        touchCardDiv.setAttribute('role', 'dialog');
        touchCardDiv.setAttribute('aria-label', '柱子明细');
        chartDiv.appendChild(touchCardDiv);

        // 明细数据表 (可折叠)
        const detailDetails = document.createElement('details');
        detailDetails.className = 'usage-details chart-detail-table';
        const detailSummary = document.createElement('summary');
        detailSummary.className = 'usage-summary';
        detailSummary.textContent = `📋 ${dimName}明细数据（${viewConfig.tableLabel}）`;
        detailDetails.appendChild(detailSummary);

        const detailContent = document.createElement('div');
        detailContent.className = 'usage-content';
        detailContent.id = `detail-table-content-${level}`;
        detailContent.appendChild(buildDetailTable(viewConfig.displayData, dim, dimName, viewConfig.isGlobal));
        detailDetails.appendChild(detailContent);

        section.appendChild(detailDetails);

        // 分隔线
        const divider = document.createElement('hr');
        divider.className = 'section-divider';
        section.appendChild(divider);

        container.appendChild(section);

        // 绘制瀑布图
        renderWaterfallChart(
            chartDiv.id,
            viewConfig.effects,
            dim,
            viewConfig.title,
            viewConfig.startValue,
            viewConfig.endValue,
            colorSchemes[level % colorSchemes.length],
            level,
            viewConfig.chartOptions
        );
    });

    console.log('[renderCharts] 渲染完成，层级数:', levelResults.length);
}

function canUseGlobalImpactView(levelResult) {
    return Boolean(
        levelResult?.isDrilled &&
        levelResult.globalEffects?.length &&
        levelResult.globalDisplayData?.length
    );
}

function getAttributionViewMode(level, levelResult) {
    if (!canUseGlobalImpactView(levelResult)) return ATTRIBUTION_VIEW_SELF;
    return AppState.attributionViewModes[level] === ATTRIBUTION_VIEW_GLOBAL
        ? ATTRIBUTION_VIEW_GLOBAL
        : ATTRIBUTION_VIEW_SELF;
}

function buildChartLevelHeader(dimIcon, dimName, levelResult, level, activeMode) {
    const header = document.createElement('div');
    header.className = 'chart-level-header';

    const title = document.createElement('h2');
    title.className = 'chart-level-title';
    title.innerHTML = `${dimIcon} ${dimName}维度贡献分析`;
    header.appendChild(title);

    if (!canUseGlobalImpactView(levelResult)) return header;

    const switcher = document.createElement('div');
    switcher.className = 'attribution-view-switch';
    switcher.setAttribute('aria-label', '归因分析视角');
    const unitMetricLabel = getUnitMetricLabel();
    const impactTargetLabel = levelResult.impactBaselineContext?.targetLabel || '全局';

    const hint = document.createElement('div');
    hint.className = 'attribution-view-hint';
    hint.textContent = '可切换两个分析视角';
    switcher.appendChild(hint);

    const options = document.createElement('div');
    options.className = 'attribution-view-options';

    [
        {
            mode: ATTRIBUTION_VIEW_SELF,
            label: `分析自身${unitMetricLabel}变动`,
            description: '看该下钻对象从基期到当期的自身拆解'
        },
        {
            mode: ATTRIBUTION_VIEW_GLOBAL,
            label: `分析对${impactTargetLabel}影响`,
            description: `看该对象对${impactTargetLabel}盘子的贡献拆解`
        }
    ].forEach(({ mode, label, description }) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `attribution-view-btn ${activeMode === mode ? 'active' : ''}`;
        button.dataset.viewMode = mode;
        const buttonLabel = document.createElement('span');
        buttonLabel.className = 'attribution-view-label';
        buttonLabel.textContent = label;
        const buttonDescription = document.createElement('span');
        buttonDescription.className = 'attribution-view-desc';
        buttonDescription.textContent = description;
        button.appendChild(buttonLabel);
        button.appendChild(buttonDescription);
        button.setAttribute('aria-pressed', activeMode === mode ? 'true' : 'false');
        button.addEventListener('mousedown', (event) => {
            event.preventDefault();
        });
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            const currentMode = getAttributionViewMode(level, AppState.calculationResults?.levelResults?.[level]);
            if (currentMode === mode) return;
            AppState.attributionViewModes[level] = mode;
            updateAttributionLevelView(level);
        });
        options.appendChild(button);
    });

    switcher.appendChild(options);
    header.appendChild(switcher);
    return header;
}

function updateAttributionLevelView(level) {
    if (!AppState.calculationResults) return;

    const renderContext = getAttributionLevelRenderContext(level);
    if (!renderContext) return;

    const { dim, dimName, viewMode, viewConfig, colorScheme } = renderContext;
    const section = document.querySelector(`.chart-level-section[data-level="${level}"]`);
    const restoreScroll = preserveScrollPosition(section);

    document
        .querySelectorAll(`.chart-level-section[data-level="${level}"] .attribution-view-btn`)
        .forEach((button) => {
            const isActive = button.dataset.viewMode === viewMode;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });

    const detailSummary = document.querySelector(`.chart-level-section[data-level="${level}"] .chart-detail-table > summary`);
    if (detailSummary) {
        detailSummary.textContent = `📋 ${dimName}明细数据（${viewConfig.tableLabel}）`;
    }

    const detailContent = document.getElementById(`detail-table-content-${level}`);
    if (detailContent) {
        detailContent.innerHTML = '';
        detailContent.appendChild(buildDetailTable(viewConfig.displayData, dim, dimName, viewConfig.isGlobal));
    }

    clearWaterfallTouchCards();
    hideWaterfallHoverTooltip();
    const renderPromise = renderWaterfallChart(
        `waterfall-chart-${level}`,
        viewConfig.effects,
        dim,
        viewConfig.title,
        viewConfig.startValue,
        viewConfig.endValue,
        colorScheme,
        level,
        viewConfig.chartOptions
    );
    restoreScroll();
    renderPromise?.then(restoreScroll, restoreScroll);
}

function preserveScrollPosition(anchorElement = null) {
    if (typeof window === 'undefined') return () => {};
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const anchorTop = anchorElement instanceof Element
        ? anchorElement.getBoundingClientRect().top
        : null;
    const restore = () => {
        if (anchorElement instanceof Element && Number.isFinite(anchorTop)) {
            const deltaY = anchorElement.getBoundingClientRect().top - anchorTop;
            if (Math.abs(deltaY) > 1) {
                window.scrollBy(0, deltaY);
                return;
            }
        }
        window.scrollTo(scrollX, scrollY);
    };
    return () => {
        window.requestAnimationFrame(() => {
            restore();
            window.setTimeout(restore, 80);
        });
    };
}

function getAttributionLevelRenderContext(level) {
    const { levelResults, globalBase, globalCurr } = AppState.calculationResults || {};
    const lr = levelResults?.[level];
    if (!lr?.effects || !lr.displayData) return null;

    const dim = lr.dim;
    const dimName = AppState.customDimNames[dim] || dim;
    const unitMetricLabel = getUnitMetricLabel();
    const viewMode = getAttributionViewMode(level, lr);
    const viewConfig = getAttributionViewConfig(lr, dimName, unitMetricLabel, viewMode, globalBase, globalCurr);
    const colorSchemes = ['claude', 'warm', 'soft'];

    return {
        lr,
        dim,
        dimName,
        unitMetricLabel,
        viewMode,
        viewConfig,
        colorScheme: colorSchemes[level % colorSchemes.length]
    };
}

function getAttributionViewConfig(levelResult, dimName, unitMetricLabel, viewMode, globalBase, globalCurr) {
    if (viewMode === ATTRIBUTION_VIEW_GLOBAL && canUseGlobalImpactView(levelResult)) {
        const impactValue = levelResult.globalEffects.reduce((sum, row) => sum + (row.Total_Contribution || 0), 0);
        const impactContext = levelResult.impactBaselineContext || {
            targetLabel: '全局',
            base: globalBase,
            curr: globalCurr
        };
        const impactTargetLabel = impactContext.targetLabel || '全局';
        const impactMetricLabel = `对${impactTargetLabel}${unitMetricLabel}影响`;
        return {
            effects: levelResult.globalEffects,
            displayData: levelResult.globalDisplayData,
            isGlobal: true,
            tableLabel: `对${impactTargetLabel}影响`,
            title: `${dimName}对${impactTargetLabel}影响拆解（按当前维度）`,
            startValue: 0,
            endValue: impactValue,
            chartOptions: {
                startLabel: '贡献起点',
                endLabel: `对${impactTargetLabel}影响`,
                yAxisTitle: `${impactMetricLabel} (¥)`,
                annotationLabel: `对${impactTargetLabel}影响`,
                showPercent: false,
                totalVolBase: impactContext.base.totalVol,
                totalVolCurr: impactContext.curr.totalVol,
                startMeta: {
                    kicker: '贡献起点',
                    displayMetricLabel: impactMetricLabel
                },
                endMeta: {
                    kicker: `对${impactTargetLabel}影响`,
                    displayMetricLabel: impactMetricLabel
                }
            }
        };
    }

    return {
        effects: levelResult.effects,
        displayData: levelResult.displayData,
        isGlobal: false,
        tableLabel: levelResult.isDrilled ? '自身单车变动' : '整体单车变动',
        title: levelResult.isDrilled
            ? `${dimName}贡献分解（下钻对象自身）`
            : `${dimName}贡献分解（按当前维度）`,
        startValue: levelResult.levelAvgMarginBase,
        endValue: levelResult.levelAvgMarginCurr,
        chartOptions: {}
    };
}


// ==================== 瀑布图渲染 ====================
function renderWaterfallChart(containerId, effectsData, dimCol, title, baseMargin, currMargin, colorScheme, level = 0, chartOptions = {}) {
    // 按绝对值排序取 Top 10，再按先负后正排列
    const sorted = [...effectsData].sort((a, b) => Math.abs(b.Total_Contribution) - Math.abs(a.Total_Contribution));

    let labels, values, measures, barMetas;

    const unitMetricLabel = getUnitMetricLabel();
    const dimName = AppState.customDimNames[dimCol] || dimCol;
    const startLabel = chartOptions.startLabel || `基期${unitMetricLabel}`;
    const endLabel = chartOptions.endLabel || `当期${unitMetricLabel}`;
    const totalVolBase = chartOptions.totalVolBase ?? effectsData.reduce((s, r) => s + (r.Vol_Base || 0), 0);
    const totalVolCurr = chartOptions.totalVolCurr ?? effectsData.reduce((s, r) => s + (r.Vol_Curr || 0), 0);

    if (sorted.length > 10) {
        const top10 = sorted.slice(0, 10);
        const otherRows = sorted.slice(10);
        const othersSum = otherRows.reduce((s, r) => s + r.Total_Contribution, 0);

        // 先负后正排序
        top10.sort((a, b) => a.Total_Contribution - b.Total_Contribution);

        labels = [startLabel, ...top10.map(r => r[dimCol]), '其他', endLabel];
        values = [baseMargin, ...top10.map(r => r.Total_Contribution), othersSum, 0];
        measures = ['absolute', ...Array(11).fill('relative'), 'total'];
        barMetas = [
            createWaterfallTotalMeta('base', startLabel, baseMargin, baseMargin, currMargin, unitMetricLabel, totalVolBase, totalVolCurr, chartOptions.startMeta),
            ...top10.map(row => createWaterfallItemMeta(row, dimCol, dimName, unitMetricLabel, level, totalVolBase, totalVolCurr)),
            createWaterfallOtherMeta(otherRows, dimCol, dimName, unitMetricLabel, totalVolBase, totalVolCurr),
            createWaterfallTotalMeta('current', endLabel, currMargin, baseMargin, currMargin, unitMetricLabel, totalVolBase, totalVolCurr, chartOptions.endMeta)
        ];
    } else {
        // 先负后正排序
        const sortedData = [...sorted].sort((a, b) => a.Total_Contribution - b.Total_Contribution);

        labels = [startLabel, ...sortedData.map(r => r[dimCol]), endLabel];
        values = [baseMargin, ...sortedData.map(r => r.Total_Contribution), 0];
        measures = ['absolute', ...Array(sortedData.length).fill('relative'), 'total'];
        barMetas = [
            createWaterfallTotalMeta('base', startLabel, baseMargin, baseMargin, currMargin, unitMetricLabel, totalVolBase, totalVolCurr, chartOptions.startMeta),
            ...sortedData.map(row => createWaterfallItemMeta(row, dimCol, dimName, unitMetricLabel, level, totalVolBase, totalVolCurr)),
            createWaterfallTotalMeta('current', endLabel, currMargin, baseMargin, currMargin, unitMetricLabel, totalVolBase, totalVolCurr, chartOptions.endMeta)
        ];
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

    const [yRangeMin, yRangeMax] = buildWaterfallAxisRange(baseMargin, currMargin, values);

    // 文本标签
    const textLabels = values.map((v, i) => {
        if (i === 0) return `¥${formatMetricNumber(baseMargin)}`;
        if (i === values.length - 1) return `¥${formatMetricNumber(currMargin)}`;
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
        customdata: barMetas,
        hoverinfo: 'none',
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
        dragmode: false,
        clickmode: 'event',
        hovermode: 'closest',
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
            showline: true,
            fixedrange: true
        },
        yaxis: {
            title: { text: chartOptions.yAxisTitle || `${unitMetricLabel} (¥)`, font: { size: 13, color: '#b0aea5' } },
            gridcolor: 'rgba(232, 230, 220, 0.5)',
            tickfont: { size: 11, color: '#b0aea5' },
            tickformat: getMetricTickFormat(yRangeMin, yRangeMax),
            linecolor: '#e8e6dc',
            showline: true,
            range: [yRangeMin, yRangeMax],
            zeroline: false,
            fixedrange: true
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
            text: `<b>${chartOptions.annotationLabel || '变动'}: ¥${formatSignedNumber(deltaVal)}</b>${chartOptions.showPercent === false ? '' : `  <span style="color: ${deltaColor}">(${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(2)}%)</span>`}`,
            showarrow: false,
            font: { size: 15, color: deltaColor, family: PLOT_FONT_FAMILY },
            bgcolor: 'rgba(255, 255, 255, 0.95)',
            bordercolor: '#e8e6dc',
            borderwidth: 1,
            borderpad: 10
        }]
    };


    // 移动端优化：减小高度
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
        scrollZoom: false,
        doubleClick: false,
        editable: false,
        staticPlot: false
    };

    const graphDiv = document.getElementById(containerId);
    if (!graphDiv) return Promise.resolve();
    const plotMethod = graphDiv?.classList?.contains('js-plotly-plot') ? Plotly.react : Plotly.newPlot;

    return plotMethod(containerId, [trace], layout, config).then(() => {
        ensureWaterfallTouchCardContainer(level);
        attachWaterfallInteractions(containerId, dimCol, level);
    });
}

function createWaterfallItemMeta(row, dimCol, dimName, unitMetricLabel, level, totalVolBase, totalVolCurr) {
    const contribution = row.Total_Contribution || 0;
    const mix = row.Mix_Effect || 0;
    const rate = row.Rate_Effect || 0;
    const volBase = row.Vol_Base || 0;
    const volCurr = row.Vol_Curr || 0;
    const weightBasePct = totalVolBase > 0 ? volBase / totalVolBase * 100 : 0;
    const weightCurrPct = totalVolCurr > 0 ? volCurr / totalVolCurr * 100 : 0;

    return {
        type: 'item',
        label: row[dimCol] || '(空白)',
        rawValue: row[dimCol] || '',
        dimCol,
        dimName,
        level,
        unitMetricLabel,
        contribution,
        mix,
        rate,
        volBase,
        volCurr,
        weightBasePct,
        weightCurrPct,
        weightChangePct: weightCurrPct - weightBasePct,
        unitBase: row.Margin_Unit_Base || 0,
        unitCurr: row.Margin_Unit_Curr || 0,
        drillable: level < AppState.drillOrder.length - 1
    };
}

function createWaterfallOtherMeta(rows, dimCol, dimName, unitMetricLabel, totalVolBase, totalVolCurr) {
    const contribution = rows.reduce((s, r) => s + (r.Total_Contribution || 0), 0);
    const mix = rows.reduce((s, r) => s + (r.Mix_Effect || 0), 0);
    const rate = rows.reduce((s, r) => s + (r.Rate_Effect || 0), 0);
    const volBase = rows.reduce((s, r) => s + (r.Vol_Base || 0), 0);
    const volCurr = rows.reduce((s, r) => s + (r.Vol_Curr || 0), 0);
    const marginBase = rows.reduce((s, r) => s + (r.Total_Margin_Base || 0), 0);
    const marginCurr = rows.reduce((s, r) => s + (r.Total_Margin_Curr || 0), 0);
    const weightBasePct = totalVolBase > 0 ? volBase / totalVolBase * 100 : 0;
    const weightCurrPct = totalVolCurr > 0 ? volCurr / totalVolCurr * 100 : 0;

    return {
        type: 'other',
        label: '其他',
        dimCol,
        dimName,
        unitMetricLabel,
        contribution,
        mix,
        rate,
        rowCount: rows.length,
        volBase,
        volCurr,
        weightBasePct,
        weightCurrPct,
        weightChangePct: weightCurrPct - weightBasePct,
        unitBase: volBase > 0 ? marginBase / volBase : 0,
        unitCurr: volCurr > 0 ? marginCurr / volCurr : 0,
        drillable: false
    };
}

function createWaterfallTotalMeta(type, label, value, baseMargin, currMargin, unitMetricLabel, totalVolBase = 0, totalVolCurr = 0, options = {}) {
    return {
        type,
        label,
        value,
        baseMargin,
        currMargin,
        contribution: type === 'current' ? currMargin - baseMargin : 0,
        unitMetricLabel,
        volBase: totalVolBase,
        volCurr: totalVolCurr,
        displayMetricLabel: options.displayMetricLabel || unitMetricLabel,
        kicker: options.kicker || '',
        drillable: false
    };
}

function attachWaterfallInteractions(containerId, dimCol, level) {
    const graphDiv = document.getElementById(containerId);
    if (!graphDiv || !graphDiv.on) return;

    graphDiv.removeAllListeners?.('plotly_hover');
    graphDiv.removeAllListeners?.('plotly_unhover');
    graphDiv.removeAllListeners?.('plotly_click');

    if (graphDiv.__waterfallBlankClickHandler) {
        graphDiv.removeEventListener('click', graphDiv.__waterfallBlankClickHandler);
    }

    graphDiv.__waterfallBlankClickHandler = (event) => {
        if (!isMobile()) return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest('.waterfalllayer .point')) return;
        const fallbackMeta = getWaterfallMetaAtClientPoint(graphDiv, event.clientX, event.clientY);
        if (fallbackMeta) {
            graphDiv.__waterfallSuppressBlankClickUntil = Date.now() + 350;
            event.stopPropagation?.();
            window.requestAnimationFrame(() => handleWaterfallBarTap(fallbackMeta, dimCol, level));
            return;
        }
        window.setTimeout(() => {
            if (graphDiv.__waterfallSuppressBlankClickUntil && Date.now() < graphDiv.__waterfallSuppressBlankClickUntil) return;
            clearWaterfallTouchCards();
            hideWaterfallHoverTooltip();
        }, 0);
    };
    graphDiv.addEventListener('click', graphDiv.__waterfallBlankClickHandler);

    graphDiv.on('plotly_hover', (eventData) => {
        if (isMobile()) return;
        const meta = getWaterfallEventMeta(eventData);
        if (!meta) return;
        graphDiv.style.cursor = meta.drillable ? 'pointer' : 'default';
        showWaterfallHoverTooltip(meta, eventData);
    });

    graphDiv.on('plotly_unhover', () => {
        if (isMobile()) return;
        graphDiv.style.cursor = 'default';
        hideWaterfallHoverTooltip();
    });

    graphDiv.on('plotly_click', (eventData) => {
        const meta = getWaterfallEventMeta(eventData);
        if (isMobile()) {
            if (!meta) {
                clearWaterfallTouchCards();
                hideWaterfallHoverTooltip();
                return;
            }
            graphDiv.__waterfallSuppressBlankClickUntil = Date.now() + 350;
            eventData?.event?.stopPropagation?.();
            eventData?.event?.stopImmediatePropagation?.();
            window.requestAnimationFrame(() => handleWaterfallBarTap(meta, dimCol, level));
        } else {
            handleWaterfallBarClick(meta, dimCol, level);
        }
    });
}

function getWaterfallEventMeta(eventData) {
    return eventData?.points?.[0]?.customdata || null;
}

function getWaterfallMetaAtClientPoint(graphDiv, clientX, clientY) {
    if (!graphDiv || !Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
    const metas = graphDiv.data?.[0]?.customdata || graphDiv._fullData?.[0]?.customdata || [];
    const points = Array.from(graphDiv.querySelectorAll('.waterfalllayer .point'));
    const hitPadding = 6;
    let bestMatch = null;

    points.forEach((point, index) => {
        const rect = point.getBoundingClientRect();
        const withinX = clientX >= rect.left - hitPadding && clientX <= rect.right + hitPadding;
        const withinY = clientY >= rect.top - hitPadding && clientY <= rect.bottom + hitPadding;
        const meta = metas[index];
        if (!withinX || !withinY || !meta) return;

        const area = rect.width * rect.height;
        if (!bestMatch || area < bestMatch.area) {
            bestMatch = { area, meta };
        }
    });

    return bestMatch?.meta || null;
}

function showWaterfallHoverTooltip(meta, eventData) {
    const tooltip = getWaterfallHoverTooltip();
    tooltip.innerHTML = buildWaterfallTooltipHTML(meta);
    tooltip.classList.add('visible');
    tooltip.classList.toggle('mobile-mode', isMobile());
    positionWaterfallTooltip(tooltip, eventData?.event);
}

function getWaterfallHoverTooltip() {
    let tooltip = document.getElementById('waterfall-hover-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'waterfall-hover-tooltip';
        tooltip.className = 'waterfall-hover-tooltip';
        document.body.appendChild(tooltip);
    }
    return tooltip;
}

function hideWaterfallHoverTooltip() {
    const tooltip = document.getElementById('waterfall-hover-tooltip');
    if (tooltip) tooltip.classList.remove('visible');
}

function positionWaterfallTooltip(tooltip, event) {
    if (!event) return;

    const tooltipRect = tooltip.getBoundingClientRect();
    const offset = 18;

    if (isMobile()) {
        const left = Math.max(12, (window.innerWidth - tooltipRect.width) / 2);
        const top = Math.max(12, Math.min(event.clientY + 16, window.innerHeight - tooltipRect.height - 12));
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        return;
    }

    let left = event.clientX + offset;
    let top = event.clientY - tooltipRect.height / 2;

    if (left + tooltipRect.width > window.innerWidth - 12) {
        left = event.clientX - tooltipRect.width - offset;
    }
    top = Math.max(12, Math.min(top, window.innerHeight - tooltipRect.height - 12));

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
}

function buildWaterfallTooltipHTML(meta, mode = 'hover') {
    const touchReturn = mode === 'touch'
        ? '<button type="button" class="waterfall-touch-return" data-waterfall-touch-return>返回图表</button>'
        : '';

    if (meta.type === 'base' || meta.type === 'current') {
        const delta = meta.currMargin - meta.baseMargin;
        const isCurrent = meta.type === 'current';
        const statusText = mode === 'touch' ? '汇总柱仅展示锚点' : '汇总柱不下钻';
        const kicker = meta.kicker || (isCurrent ? '当期结果' : '基期锚点');
        const displayMetricLabel = meta.displayMetricLabel || meta.unitMetricLabel;
        return `
            <div class="waterfall-tooltip-card ${isCurrent ? 'total' : 'base'}">
                ${touchReturn}
                <div class="waterfall-tooltip-kicker">${escapeHTML(kicker)}</div>
                <div class="waterfall-tooltip-title">${escapeHTML(meta.label)}</div>
                <div class="waterfall-tooltip-main">
                    <span>${escapeHTML(displayMetricLabel)}</span>
                    <strong>¥${formatMetricNumber(meta.value)}</strong>
                </div>
                <div class="waterfall-tooltip-grid">
                    <span>基期销量</span><b>${formatNumber(meta.volBase)}</b>
                    <span>当期销量</span><b>${formatNumber(meta.volCurr)}</b>
                    <span>较基期变动</span><b class="${delta >= 0 ? 'positive' : 'negative'}">${formatSignedNumber(delta)}</b>
                    <span>点击状态</span><b>${statusText}</b>
                </div>
                ${mode === 'touch' ? buildWaterfallTouchActionHTML(meta) : ''}
            </div>
        `;
    }

    const tone = meta.contribution >= 0 ? 'positive' : 'negative';
    const mixTone = meta.mix >= 0 ? 'positive' : 'negative';
    const rateTone = meta.rate >= 0 ? 'positive' : 'negative';
    const weightTone = meta.weightChangePct >= 0 ? 'positive' : 'negative';
    const title = meta.type === 'other'
        ? `${escapeHTML(meta.label)}（${meta.rowCount || 0} 项）`
        : escapeHTML(meta.label);
    const drillActionText = mode === 'touch'
        ? '可进入下一层'
        : (isMobile() ? '再次点击下钻到' : '点击下钻到');
    const clickHint = meta.drillable
        ? `${drillActionText}「${escapeHTML(meta.dimName)}：${escapeHTML(meta.label)}」`
        : (meta.type === 'other' ? '其他柱包含多个项目，请在明细表筛选后查看具体项目' : '当前已是最后一层级');

    return `
        <div class="waterfall-tooltip-card ${tone}">
            ${touchReturn}
            <div class="waterfall-tooltip-kicker">${escapeHTML(meta.dimName)}贡献拆解</div>
            <div class="waterfall-tooltip-title">${title}</div>
            <div class="waterfall-tooltip-main">
                <span>总贡献</span>
                <strong class="${tone}">${formatSignedNumber(meta.contribution)}</strong>
            </div>
            <div class="waterfall-effect-list">
                <div class="waterfall-effect-card">
                    <span>结构效应</span>
                    <b class="${mixTone}">${formatSignedNumber(meta.mix)}</b>
                </div>
                <div class="waterfall-effect-card">
                    <span>费率效应</span>
                    <b class="${rateTone}">${formatSignedNumber(meta.rate)}</b>
                </div>
            </div>
            <div class="waterfall-tooltip-grid">
                <span>基期销量</span><b>${formatNumber(meta.volBase)} (${formatPercent(meta.weightBasePct)})</b>
                <span>当期销量</span><b>${formatNumber(meta.volCurr)} (${formatPercent(meta.weightCurrPct)})</b>
                <span>销量占比变化</span><b class="${weightTone}">${formatPercentPoint(meta.weightChangePct)}</b>
                <span>基期${escapeHTML(meta.unitMetricLabel)}</span><b>¥${formatMetricNumber(meta.unitBase)}</b>
                <span>当期${escapeHTML(meta.unitMetricLabel)}</span><b>¥${formatMetricNumber(meta.unitCurr)}</b>
            </div>
            <div class="waterfall-tooltip-hint">${clickHint}</div>
            ${mode === 'touch' ? buildWaterfallTouchActionHTML(meta) : ''}
        </div>
    `;
}

function buildWaterfallTouchActionHTML(meta) {
    if (meta.type === 'base' || meta.type === 'current') {
        return '<div class="waterfall-touch-note">汇总柱用于对照基期和当期，不参与下钻。</div>';
    }
    if (meta.type === 'other') {
        return '<div class="waterfall-touch-note">“其他”包含多个项目，请在明细表筛选后查看具体项目。</div>';
    }
    if (!meta.drillable) {
        return '<div class="waterfall-touch-note">当前已是最后一层级。</div>';
    }
    return `
        <div class="waterfall-touch-actions">
            <button type="button" class="waterfall-touch-drill-btn" data-waterfall-touch-drill>
                进入下一层：${escapeHTML(meta.dimName)}
            </button>
        </div>
    `;
}

function formatPercentPoint(num) {
    if (num == null || isNaN(num)) return '-';
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toFixed(1)}%`;
}

function handleWaterfallBarTap(meta, dimCol, level) {
    if (!meta) return;
    hideWaterfallHoverTooltip();
    renderWaterfallTouchCard(meta, dimCol, level);
}

function ensureWaterfallTouchCardContainer(level) {
    const chart = document.getElementById(`waterfall-chart-${level}`);
    if (!chart) return null;

    let container = document.getElementById(`waterfall-touch-card-${level}`);
    if (!container) {
        container = document.createElement('div');
        container.id = `waterfall-touch-card-${level}`;
        container.className = 'waterfall-touch-host';
    }

    container.setAttribute('aria-live', 'polite');
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-label', '柱子明细');

    if (container.parentElement !== chart) {
        chart.appendChild(container);
    }

    return container;
}

function renderWaterfallTouchCard(meta, dimCol, level) {
    const container = ensureWaterfallTouchCardContainer(level);
    if (!container) return;

    clearWaterfallTouchCards(container);
    container.innerHTML = buildWaterfallTooltipHTML(meta, 'touch');
    container.classList.add('visible');

    container.querySelector('[data-waterfall-touch-return]')?.addEventListener('click', () => {
        clearWaterfallTouchCards();
    });

    const drillButton = container.querySelector('[data-waterfall-touch-drill]');
    if (drillButton) {
        drillButton.addEventListener('click', () => handleWaterfallBarClick(meta, dimCol, level));
    }
}

function clearWaterfallTouchCards(exceptContainer = null) {
    document.querySelectorAll('.waterfall-touch-host').forEach((container) => {
        if (container === exceptContainer) return;
        container.innerHTML = '';
        container.classList.remove('visible');
    });
}

function handleWaterfallBarClick(meta, dimCol, level) {
    if (!meta || meta.type === 'base' || meta.type === 'current') return;

    if (meta.type === 'other') {
        showMessage('error', '“其他”包含多个项目，请点击具体柱子或在明细表筛选后下钻。');
        return;
    }

    if (!meta.drillable) {
        showMessage('success', `已到最后一层级：${meta.dimName}`);
        return;
    }

    const value = getDetailTextValue(meta.rawValue);
    if (!value) {
        showMessage('error', '该柱子没有可下钻的维度值。');
        return;
    }

    AppState.selectedDims[dimCol] = [value];
    AppState.excludedDims[dimCol] = null;
    clearWaterfallTouchCards();

    for (let i = level + 1; i < AppState.drillOrder.length; i++) {
        AppState.selectedDims[AppState.drillOrder[i]] = null;
        AppState.excludedDims[AppState.drillOrder[i]] = null;
    }

    const currentViewMode = AppState.attributionViewModes[level] === ATTRIBUTION_VIEW_GLOBAL
        ? ATTRIBUTION_VIEW_GLOBAL
        : ATTRIBUTION_VIEW_SELF;
    AppState.attributionViewModes[level + 1] = currentViewMode;
    for (let i = level + 2; i < AppState.drillOrder.length; i++) {
        delete AppState.attributionViewModes[i];
    }

    hideWaterfallHoverTooltip();
    populateDrillFilters();
    triggerUpdate();
    showMessage('success', `已下钻到 ${meta.dimName}: ${value}`);

    window.requestAnimationFrame(() => {
        const nextSection = document.querySelector(`.chart-level-section[data-level="${level + 1}"]`);
        if (nextSection) {
            nextSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
}

function escapeHTML(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}


// ==================== 明细数据表构建 ====================
function buildDetailTable(displayData, dimCol, dimName, isGlobal) {
    const unitMetricLabel = getUnitMetricLabel();
    const columns = [
        { label: dimName, type: 'text', getValue: row => row[dimCol] || '', format: value => value || '-' },
        { label: '基期销量', type: 'number', getValue: row => row.Vol_Base, format: formatNumber },
        { label: '基期占比%', type: 'number', getValue: row => row.Weight_Base_Pct, format: formatPercent },
        { label: '当期销量', type: 'number', getValue: row => row.Vol_Curr, format: formatNumber },
        { label: '当期占比%', type: 'number', getValue: row => row.Weight_Curr_Pct, format: formatPercent },
        { label: `基期${unitMetricLabel}`, type: 'number', getValue: row => row.Margin_Unit_Base, format: formatCurrency },
        { label: `当期${unitMetricLabel}`, type: 'number', getValue: row => row.Margin_Unit_Curr, format: formatCurrency },
        { label: isGlobal ? '结构效应（整体）' : '结构效应', type: 'number', effectKey: 'Mix_Effect', getValue: row => row.Mix_Effect, format: formatSignedNumber },
        { label: isGlobal ? '费率效应（整体）' : '费率效应', type: 'number', effectKey: 'Rate_Effect', getValue: row => row.Rate_Effect, format: formatSignedNumber },
        { label: isGlobal ? `对整体${unitMetricLabel}贡献` : '总贡献', type: 'number', effectKey: 'Total_Contribution', getValue: row => row.Total_Contribution, format: formatSignedNumber }
    ];
    const rowMetas = [];
    const filterState = {
        columns,
        dimName,
        rowMetas,
        filters: new Map(),
        sort: null,
        headerButtons: [],
        openMenu: null,
        closeMenu: null,
        tbody: null,
        summaryEl: null,
        shell: null,
        toolbar: null,
        copyFallbackEl: null
    };

    const shell = document.createElement('div');
    shell.className = 'detail-table-shell';
    filterState.shell = shell;

    const toolbar = document.createElement('div');
    toolbar.className = 'detail-table-toolbar';
    filterState.toolbar = toolbar;

    const toolbarSummary = document.createElement('div');
    toolbarSummary.className = 'detail-table-toolbar-summary';
    toolbarSummary.textContent = '当前表格';
    filterState.summaryEl = toolbarSummary;

    const toolbarActions = document.createElement('div');
    toolbarActions.className = 'detail-table-toolbar-actions';

    const copyDetailButton = document.createElement('button');
    copyDetailButton.type = 'button';
    copyDetailButton.className = 'detail-table-action primary';
    copyDetailButton.textContent = '复制当前表格';
    copyDetailButton.addEventListener('click', async () => {
        const text = buildDetailClipboardText(filterState);
        try {
            await copyTextToClipboard(text);
            clearDetailCopyFallback(filterState);
            showMessage('success', `已复制当前表格（${getVisibleDetailDataRowCount(filterState)} 行）`);
        } catch {
            showDetailCopyFallback(filterState, text);
            showMessage('success', `已选中当前表格内容，可按 ${getCopyShortcutLabel()} 复制`);
        }
    });

    const exportDetailButton = document.createElement('button');
    exportDetailButton.type = 'button';
    exportDetailButton.className = 'detail-table-action';
    exportDetailButton.textContent = '导出当前表';
    exportDetailButton.addEventListener('click', () => {
        exportDetailTableCsv(filterState);
    });

    toolbarActions.appendChild(copyDetailButton);
    toolbarActions.appendChild(exportDetailButton);
    toolbar.appendChild(toolbarSummary);
    toolbar.appendChild(toolbarActions);

    const table = document.createElement('table');
    table.className = 'detail-data-table';

    // 表头
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    columns.forEach((column, columnIndex) => {
        const th = document.createElement('th');
        const inner = document.createElement('div');
        inner.className = 'detail-th-inner filterable';

        const label = document.createElement('span');
        label.className = 'detail-th-label';
        label.textContent = column.label;

        const filterBtn = document.createElement('button');
        filterBtn.type = 'button';
        filterBtn.className = 'detail-filter-trigger';
        filterBtn.setAttribute('aria-haspopup', 'menu');
        filterBtn.setAttribute('aria-label', `筛选${column.label}`);

        const caret = document.createElement('span');
        caret.className = 'detail-filter-caret';
        caret.setAttribute('aria-hidden', 'true');
        filterBtn.appendChild(caret);

        const openMenu = (event) => {
            event.stopPropagation();
            openDetailColumnFilterMenu({
                column,
                columnIndex,
                button: filterBtn,
                rowMetas,
                state: filterState
            });
        };

        filterBtn.addEventListener('click', (event) => {
            openMenu(event);
        });
        inner.addEventListener('click', openMenu);

        filterState.headerButtons[columnIndex] = filterBtn;
        inner.appendChild(label);
        inner.appendChild(filterBtn);
        th.appendChild(inner);
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

        const values = columns.map(column => column.getValue(row));
        const cells = columns.map((column, ci) => ci === 0
            ? getDetailTextValue(column.format(values[ci]))
            : column.format(values[ci])
        );

        cells.forEach((cellValue, ci) => {
            const column = columns[ci];
            const td = document.createElement('td');
            td.textContent = cellValue;
            // 右对齐数字列
            if (ci > 0) td.className = 'num-cell';
            // 正负色
            if (column.effectKey) {
                const numVal = row[column.effectKey] || 0;
                if (numVal > 0) td.classList.add('positive');
                else if (numVal < 0) td.classList.add('negative');
            }
            tr.appendChild(td);
        });

        rowMetas.push({
            row,
            tr,
            isTotal,
            values,
            cells,
            originalIndex: rowMetas.length
        });
        tbody.appendChild(tr);
    });
    filterState.tbody = tbody;
    table.appendChild(tbody);

    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper detail-table-scroll';
    wrapper.appendChild(table);

    shell.appendChild(toolbar);
    shell.appendChild(wrapper);
    applyDetailTableFilters(rowMetas, filterState);

    return shell;
}

function getCurrentDetailRowMetas(state) {
    const rowMetas = state?.rowMetas || [];
    const metaByRow = new Map(rowMetas.map(meta => [meta.tr, meta]));
    const orderedRows = state?.tbody?.children ? Array.from(state.tbody.children) : [];
    const orderedMetas = orderedRows.length
        ? orderedRows.map(row => metaByRow.get(row)).filter(Boolean)
        : rowMetas;

    return orderedMetas.filter(meta => !meta.tr?.hidden);
}

function getVisibleDetailDataRowCount(state) {
    return getCurrentDetailRowMetas(state).filter(meta => !meta.isTotal).length;
}

function buildDetailExportRows(state) {
    const headers = (state?.columns || []).map(column => String(column.label ?? ''));
    const rows = getCurrentDetailRowMetas(state).map(meta => {
        const cells = meta.cells || [];
        return headers.map((_, index) => String(cells[index] ?? ''));
    });
    return [headers, ...rows];
}

function buildDetailClipboardText(state) {
    return buildDetailExportRows(state)
        .map(row => row.map(escapeTsvCell).join('\t'))
        .join('\n');
}

function buildDetailCsvText(state) {
    return buildDetailExportRows(state)
        .map(row => row.map(escapeCsvCell).join(','))
        .join('\n');
}

function showDetailCopyFallback(state, text) {
    clearDetailCopyFallback(state);
    if (!state?.shell || !state.toolbar) return;

    const fallback = document.createElement('div');
    fallback.className = 'detail-copy-fallback';

    const header = document.createElement('div');
    header.className = 'detail-copy-fallback-header';

    const title = document.createElement('span');
    title.textContent = `当前表格内容已选中，可按 ${getCopyShortcutLabel()} 复制`;

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'detail-copy-fallback-close';
    closeButton.textContent = '关闭';
    closeButton.addEventListener('click', () => clearDetailCopyFallback(state));

    header.appendChild(title);
    header.appendChild(closeButton);

    const textarea = document.createElement('textarea');
    textarea.className = 'detail-copy-fallback-text';
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.setAttribute('aria-label', '当前表格复制内容');

    fallback.appendChild(header);
    fallback.appendChild(textarea);
    state.toolbar.insertAdjacentElement('afterend', fallback);
    state.copyFallbackEl = fallback;

    requestAnimationFrame(() => {
        textarea.focus({ preventScroll: true });
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
    });
}

function clearDetailCopyFallback(state) {
    if (state?.copyFallbackEl) {
        state.copyFallbackEl.remove();
        state.copyFallbackEl = null;
    }
}

function getCopyShortcutLabel() {
    const platform = typeof navigator !== 'undefined' ? navigator.platform || '' : '';
    return /Mac|iPhone|iPad|iPod/i.test(platform) ? '⌘C' : 'Ctrl+C';
}

async function copyTextToClipboard(text) {
    if (copyTextWithTextarea(text)) return;

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return;
        } catch {
            // The caller will show a user-facing error if both clipboard paths are blocked.
        }
    }

    throw new Error('浏览器未允许写入剪贴板');
}

function copyTextWithTextarea(text) {
    const activeElement = document.activeElement;
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '0';
    textarea.style.top = '0';
    textarea.style.width = '1px';
    textarea.style.height = '1px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    const copied = document.execCommand('copy');
    textarea.remove();
    if (activeElement && typeof activeElement.focus === 'function') {
        activeElement.focus({ preventScroll: true });
    }
    return copied;
}

function exportDetailTableCsv(state) {
    clearDetailCopyFallback(state);
    const csv = buildDetailCsvText(state);
    const safeName = sanitizeFilename(state?.dimName || 'detail-table');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `margin-analysis-${safeName}-current-view.csv`);
    showMessage('success', `已导出当前表（${getVisibleDetailDataRowCount(state)} 行）`);
}

function sanitizeFilename(value) {
    return String(value || 'detail-table')
        .trim()
        .replace(/[\\/:*?"<>|]+/g, '-')
        .replace(/\s+/g, '-')
        .slice(0, 80) || 'detail-table';
}

function openDetailColumnFilterMenu({ column, columnIndex, button, rowMetas, state }) {
    if (state.openMenu && state.openMenu.dataset.columnIndex === String(columnIndex)) {
        closeDetailColumnFilterMenu(state);
        return;
    }

    closeDetailColumnFilterMenu(state);

    const menu = document.createElement('div');
    menu.className = 'detail-filter-menu';
    menu.dataset.columnIndex = String(columnIndex);
    menu.setAttribute('role', 'menu');
    menu.addEventListener('click', event => event.stopPropagation());

    const title = document.createElement('div');
    title.className = 'detail-filter-menu-title';
    title.textContent = column.label;
    menu.appendChild(title);

    const sortGroup = document.createElement('div');
    sortGroup.className = 'detail-filter-sort-grid';
    sortGroup.appendChild(createDetailFilterAction('升序', () => {
        state.sort = { columnIndex, direction: 'asc' };
        applyDetailTableFilters(rowMetas, state);
        closeDetailColumnFilterMenu(state);
    }));
    sortGroup.appendChild(createDetailFilterAction('降序', () => {
        state.sort = { columnIndex, direction: 'desc' };
        applyDetailTableFilters(rowMetas, state);
        closeDetailColumnFilterMenu(state);
    }));
    if (state.sort?.columnIndex === columnIndex) {
        sortGroup.appendChild(createDetailFilterAction('取消排序', () => {
            state.sort = null;
            applyDetailTableFilters(rowMetas, state);
            closeDetailColumnFilterMenu(state);
        }, 'wide'));
    }
    menu.appendChild(sortGroup);

    const divider = document.createElement('div');
    divider.className = 'detail-filter-divider';
    menu.appendChild(divider);

    if (column.type === 'text') {
        buildDetailTextFilterControls(menu, columnIndex, rowMetas, state);
    } else {
        buildDetailNumberFilterControls(menu, columnIndex, rowMetas, state);
    }

    document.body.appendChild(menu);
    positionDetailColumnFilterMenu(menu, button);
    button.setAttribute('aria-expanded', 'true');
    state.openMenu = menu;

    const onDocumentClick = () => closeDetailColumnFilterMenu(state);
    const onKeyDown = event => {
        if (event.key === 'Escape') closeDetailColumnFilterMenu(state);
    };
    const onViewportChange = () => positionDetailColumnFilterMenu(menu, button);
    const clickTimer = setTimeout(() => {
        document.addEventListener('click', onDocumentClick);
    }, 0);

    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    state.closeMenu = () => {
        clearTimeout(clickTimer);
        button.setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', onDocumentClick);
        document.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('resize', onViewportChange);
        window.removeEventListener('scroll', onViewportChange, true);
        menu.remove();
        state.openMenu = null;
        state.closeMenu = null;
    };
}

function buildDetailTextFilterControls(menu, columnIndex, rowMetas, state) {
    const allValues = Array.from(new Set(
        rowMetas
            .filter(meta => !meta.isTotal)
            .map(meta => getDetailTextValue(meta.values[columnIndex]))
    )).sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }));
    const currentFilter = state.filters.get(columnIndex);
    const selectedValues = new Set(currentFilter?.type === 'text' ? currentFilter.values : allValues);
    const syncTextFilter = () => {
        if (selectedValues.size === allValues.length) {
            state.filters.delete(columnIndex);
        } else {
            state.filters.set(columnIndex, { type: 'text', values: Array.from(selectedValues) });
        }
        applyDetailTableFilters(rowMetas, state);
    };

    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.className = 'detail-filter-input';
    searchInput.placeholder = '搜索此列';
    searchInput.setAttribute('aria-label', '搜索此列可选项');
    menu.appendChild(searchInput);

    const list = document.createElement('div');
    list.className = 'detail-filter-value-list';
    menu.appendChild(list);

    const renderValues = () => {
        const query = searchInput.value.trim().toLowerCase();
        list.replaceChildren();
        const visibleValues = allValues.filter(value => getDetailFilterLabel(value).toLowerCase().includes(query));

        if (visibleValues.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'detail-filter-empty';
            empty.textContent = '无匹配项';
            list.appendChild(empty);
            return;
        }

        visibleValues.forEach(value => {
            const label = document.createElement('label');
            label.className = 'detail-filter-check-row';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = selectedValues.has(value);
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) selectedValues.add(value);
                else selectedValues.delete(value);
                syncTextFilter();
            });

            const text = document.createElement('span');
            text.textContent = getDetailFilterLabel(value);

            label.appendChild(checkbox);
            label.appendChild(text);
            list.appendChild(label);
        });
    };

    searchInput.addEventListener('input', renderValues);
    renderValues();

    const quickActions = document.createElement('div');
    quickActions.className = 'detail-filter-inline-actions';
    quickActions.appendChild(createDetailFilterAction('全选', () => {
        allValues.forEach(value => selectedValues.add(value));
        renderValues();
        syncTextFilter();
    }));
    quickActions.appendChild(createDetailFilterAction('清空', () => {
        selectedValues.clear();
        renderValues();
        syncTextFilter();
    }));
    menu.appendChild(quickActions);

    appendDetailFilterFooter(menu, {
        applyLabel: '应用筛选',
        onApply: () => {
            syncTextFilter();
            closeDetailColumnFilterMenu(state);
        },
        onClearColumn: () => {
            state.filters.delete(columnIndex);
            applyDetailTableFilters(rowMetas, state);
            closeDetailColumnFilterMenu(state);
        },
        onClearAll: () => {
            state.filters.clear();
            state.sort = null;
            applyDetailTableFilters(rowMetas, state);
            closeDetailColumnFilterMenu(state);
        }
    });
}

function buildDetailNumberFilterControls(menu, columnIndex, rowMetas, state) {
    const currentFilter = state.filters.get(columnIndex);
    const field = document.createElement('div');
    field.className = 'detail-filter-field';

    const operatorSelect = document.createElement('select');
    operatorSelect.className = 'detail-filter-select';
    operatorSelect.setAttribute('aria-label', '选择数字筛选条件');
    [
        ['', '全部'],
        ['gt', '大于'],
        ['gte', '大于等于'],
        ['lt', '小于'],
        ['lte', '小于等于'],
        ['eq', '等于'],
        ['neq', '不等于'],
        ['between', '介于'],
        ['positive', '正数'],
        ['negative', '负数'],
        ['zero', '等于 0'],
        ['nonzero', '不等于 0']
    ].forEach(([value, label]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        operatorSelect.appendChild(option);
    });

    const valueInput = document.createElement('input');
    valueInput.type = 'number';
    valueInput.className = 'detail-filter-input';
    valueInput.placeholder = '数值';
    valueInput.setAttribute('aria-label', '数字筛选数值');

    const valueInput2 = document.createElement('input');
    valueInput2.type = 'number';
    valueInput2.className = 'detail-filter-input';
    valueInput2.placeholder = '第二个数值';
    valueInput2.setAttribute('aria-label', '数字筛选第二个数值');

    const errorText = document.createElement('div');
    errorText.className = 'detail-filter-error';
    errorText.hidden = true;

    if (currentFilter?.type === 'number') {
        operatorSelect.value = currentFilter.operator;
        if (Number.isFinite(currentFilter.value)) valueInput.value = String(currentFilter.value);
        if (Number.isFinite(currentFilter.value2)) valueInput2.value = String(currentFilter.value2);
    }

    const updateInputs = () => {
        const needsValue = ['gt', 'gte', 'lt', 'lte', 'eq', 'neq', 'between'].includes(operatorSelect.value);
        valueInput.hidden = !needsValue;
        valueInput2.hidden = operatorSelect.value !== 'between';
        errorText.hidden = true;
    };

    operatorSelect.addEventListener('change', updateInputs);
    updateInputs();

    field.appendChild(operatorSelect);
    field.appendChild(valueInput);
    field.appendChild(valueInput2);
    field.appendChild(errorText);
    menu.appendChild(field);

    appendDetailFilterFooter(menu, {
        applyLabel: '应用筛选',
        onApply: () => {
            const operator = operatorSelect.value;
            if (!operator) {
                state.filters.delete(columnIndex);
            } else {
                const filter = { type: 'number', operator };
                const needsValue = ['gt', 'gte', 'lt', 'lte', 'eq', 'neq', 'between'].includes(operator);
                const firstValue = Number(valueInput.value);
                const secondValue = Number(valueInput2.value);

                if (needsValue && !Number.isFinite(firstValue)) {
                    errorText.textContent = '请填写有效数值';
                    errorText.hidden = false;
                    valueInput.focus();
                    return;
                }
                if (operator === 'between' && !Number.isFinite(secondValue)) {
                    errorText.textContent = '请填写第二个有效数值';
                    errorText.hidden = false;
                    valueInput2.focus();
                    return;
                }

                if (needsValue) filter.value = firstValue;
                if (operator === 'between') filter.value2 = secondValue;
                state.filters.set(columnIndex, filter);
            }
            applyDetailTableFilters(rowMetas, state);
            closeDetailColumnFilterMenu(state);
        },
        onClearColumn: () => {
            state.filters.delete(columnIndex);
            applyDetailTableFilters(rowMetas, state);
            closeDetailColumnFilterMenu(state);
        },
        onClearAll: () => {
            state.filters.clear();
            state.sort = null;
            applyDetailTableFilters(rowMetas, state);
            closeDetailColumnFilterMenu(state);
        }
    });
}

function appendDetailFilterFooter(menu, { applyLabel, onApply, onClearColumn, onClearAll }) {
    const footer = document.createElement('div');
    footer.className = 'detail-filter-footer';
    footer.appendChild(createDetailFilterAction('清除此列', onClearColumn));
    footer.appendChild(createDetailFilterAction('全部清除', onClearAll));
    footer.appendChild(createDetailFilterAction(applyLabel, onApply, 'primary'));
    menu.appendChild(footer);
}

function createDetailFilterAction(label, onClick, variant = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `detail-filter-action ${variant}`.trim();
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
}

function closeDetailColumnFilterMenu(state) {
    if (state.closeMenu) state.closeMenu();
}

function positionDetailColumnFilterMenu(menu, button) {
    const rect = button.getBoundingClientRect();
    const menuWidth = Math.min(320, window.innerWidth - 24);
    menu.style.width = `${menuWidth}px`;

    const menuRect = menu.getBoundingClientRect();
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - menuRect.width - 12));
    let top = rect.bottom + 6;
    if (top + menuRect.height > window.innerHeight - 12) {
        top = Math.max(12, rect.top - menuRect.height - 6);
    }

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
}

function applyDetailTableFilters(rowMetas, state) {
    clearDetailCopyFallback(state);
    const activeFilters = Array.from(state.filters.entries());

    rowMetas.forEach((meta) => {
        const visible = meta.isTotal || activeFilters.every(([columnIndex, filter]) => {
            return matchesDetailFilter(meta.values[columnIndex], filter);
        });
        meta.tr.hidden = !visible;
    });

    sortDetailRows(rowMetas, state);
    updateDetailHeaderFilterStates(state);
    updateDetailTableToolbarState(state);
}

function updateDetailTableToolbarState(state) {
    if (!state?.summaryEl) return;
    const visibleCount = getVisibleDetailDataRowCount(state);
    const filterCount = state.filters?.size || 0;
    const sortText = state.sort ? '已排序' : '';
    const filterText = filterCount ? `已筛选 ${filterCount} 列` : '未筛选';
    state.summaryEl.textContent = `${visibleCount} 行 · ${filterText}${sortText ? ` · ${sortText}` : ''}`;
}

function matchesDetailFilter(value, filter) {
    if (filter.type === 'text') {
        return filter.values.includes(getDetailTextValue(value));
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return false;

    switch (filter.operator) {
        case 'gt':
            return numericValue > filter.value;
        case 'gte':
            return numericValue >= filter.value;
        case 'lt':
            return numericValue < filter.value;
        case 'lte':
            return numericValue <= filter.value;
        case 'eq':
            return numericValue === filter.value;
        case 'neq':
            return numericValue !== filter.value;
        case 'between': {
            const min = Math.min(filter.value, filter.value2);
            const max = Math.max(filter.value, filter.value2);
            return numericValue >= min && numericValue <= max;
        }
        case 'positive':
            return numericValue > 0;
        case 'negative':
            return numericValue < 0;
        case 'zero':
            return numericValue === 0;
        case 'nonzero':
            return numericValue !== 0;
        default:
            return true;
    }
}

function sortDetailRows(rowMetas, state) {
    const rows = rowMetas.filter(meta => !meta.isTotal);
    const totalRows = rowMetas.filter(meta => meta.isTotal);

    if (state.sort) {
        const column = state.columns[state.sort.columnIndex];
        const direction = state.sort.direction === 'asc' ? 1 : -1;
        rows.sort((a, b) => {
            const result = compareDetailValues(
                a.values[state.sort.columnIndex],
                b.values[state.sort.columnIndex],
                column.type
            );
            return result === 0 ? a.originalIndex - b.originalIndex : result * direction;
        });
    } else {
        rows.sort((a, b) => a.originalIndex - b.originalIndex);
    }

    rows.concat(totalRows).forEach(meta => state.tbody.appendChild(meta.tr));
}

function compareDetailValues(a, b, type) {
    if (type === 'number') {
        const numA = Number(a);
        const numB = Number(b);
        const validA = Number.isFinite(numA);
        const validB = Number.isFinite(numB);
        if (!validA && !validB) return 0;
        if (!validA) return 1;
        if (!validB) return -1;
        return numA - numB;
    }

    return getDetailTextValue(a).localeCompare(getDetailTextValue(b), 'zh-CN', { numeric: true });
}

function updateDetailHeaderFilterStates(state) {
    state.headerButtons.forEach((button, columnIndex) => {
        const hasFilter = state.filters.has(columnIndex);
        const sortDirection = state.sort?.columnIndex === columnIndex ? state.sort.direction : '';
        const status = [];
        if (hasFilter) status.push('已筛选');
        if (sortDirection) status.push(sortDirection === 'asc' ? '升序' : '降序');

        button.classList.toggle('is-active', hasFilter);
        button.classList.toggle('is-sorted', Boolean(sortDirection));
        button.dataset.sort = sortDirection;
        button.title = status.length
            ? `${state.columns[columnIndex].label}：${status.join('，')}`
            : `筛选${state.columns[columnIndex].label}`;
        button.setAttribute('aria-label', button.title);
    });
}

function getDetailTextValue(value) {
    return String(value == null ? '' : value).trim();
}

function getDetailFilterLabel(value) {
    const text = getDetailTextValue(value);
    return text || '(空白)';
}

function buildWaterfallAxisRange(baseMargin = 0, currMargin = 0, values = []) {
    const safeBase = Number.isFinite(Number(baseMargin)) ? Number(baseMargin) : 0;
    const safeCurr = Number.isFinite(Number(currMargin)) ? Number(currMargin) : 0;
    const numericValues = values.map(value => Number.isFinite(Number(value)) ? Number(value) : 0);

    let cumulative = safeBase;
    let minCumulative = safeBase;
    let maxCumulative = safeBase;
    for (let i = 1; i < numericValues.length - 1; i++) {
        cumulative += numericValues[i];
        minCumulative = Math.min(minCumulative, cumulative);
        maxCumulative = Math.max(maxCumulative, cumulative);
    }

    const coreMin = Math.min(safeBase, safeCurr, minCumulative);
    const coreMax = Math.max(safeBase, safeCurr, maxCumulative);
    const dataRange = coreMax - coreMin;
    const delta = Math.abs(safeCurr - safeBase);
    const maxAbsCore = Math.max(
        Math.abs(safeBase),
        Math.abs(safeCurr),
        Math.abs(minCumulative),
        Math.abs(maxCumulative),
        ...numericValues.map(value => Math.abs(value)),
        0
    );
    const maxAbsRelative = Math.max(
        ...numericValues.slice(1, -1).map(value => Math.abs(value)),
        delta,
        dataRange,
        0
    );
    const padding = Math.max(
        delta * 1.2,
        dataRange * 0.35,
        maxAbsRelative * 0.8,
        maxAbsCore > 0 ? maxAbsCore * 0.06 : 0,
        0.02
    );

    let yRangeMin = coreMin - padding;
    let yRangeMax = coreMax + padding * 1.35;

    if (coreMin > 0 && coreMax > 0 && !(coreMin > coreMax * 0.3)) {
        yRangeMin = Math.max(0, yRangeMin);
    }

    const minVisualSpan = Math.max(
        maxAbsRelative * 3,
        delta * 3,
        dataRange * 2.2,
        maxAbsCore > 0 ? maxAbsCore * 0.18 : 0,
        0.08
    );
    const currentSpan = yRangeMax - yRangeMin;
    if (currentSpan < minVisualSpan) {
        const center = (yRangeMin + yRangeMax) / 2;
        yRangeMin = center - minVisualSpan / 2;
        yRangeMax = center + minVisualSpan / 2;
        if (coreMin >= 0 && yRangeMin < 0 && coreMax > 0) {
            yRangeMax += Math.abs(yRangeMin);
            yRangeMin = 0;
        }
    }

    return [yRangeMin, yRangeMax];
}

function getMetricTickFormat(minValue = 0, maxValue = 0) {
    const maxAbs = Math.max(Math.abs(Number(minValue) || 0), Math.abs(Number(maxValue) || 0));
    if (maxAbs >= 100) return ',.0f';
    if (maxAbs >= 10) return ',.1f';
    if (maxAbs >= 1) return ',.2f';
    return ',.3f';
}


// ==================== 数值格式化工具 ====================
function formatNumber(num) {
    if (num == null || isNaN(num)) return '-';
    return Math.round(num).toLocaleString('en-US');
}

function getMetricPrecision(num) {
    const abs = Math.abs(Number(num) || 0);
    if (abs >= 100) return 0;
    if (abs >= 10) return 1;
    if (abs >= 1) return 2;
    return 3;
}

function formatMetricNumber(num) {
    if (num == null || isNaN(num)) return '-';
    const value = Math.abs(Number(num)) < 1e-12 ? 0 : Number(num);
    return value.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: getMetricPrecision(value)
    });
}

function formatCurrency(num) {
    if (num == null || isNaN(num)) return '-';
    return '¥' + formatMetricNumber(num);
}

function formatPercent(num) {
    if (num == null || isNaN(num)) return '-';
    return num.toFixed(1) + '%';
}

function formatSignedNumber(num) {
    if (num == null || isNaN(num)) return '-';
    return formatSignedMetricNumber(num);
}

function formatSignedMetricNumber(num) {
    if (num == null || isNaN(num)) return '-';
    const value = Math.abs(Number(num)) < 1e-12 ? 0 : Number(num);
    const sign = value >= 0 ? '+' : '';
    return sign + formatMetricNumber(value);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateGlobalMetrics,
        calculateDimensionPVMEffects,
        calculateBottomUpPVMEffects,
        calculateAttributionEffects,
        prepareDisplayData,
        applyDrillDimensionFilters,
        getImpactBaselineContext,
        applySelectedMetricToRows,
        generateDemoData,
        resolveExcelFilterAppliedValues,
        resolveExcelFilterSearchValues,
        normalizeUploadedRows,
        getTemplateRows,
        sheetRowsToObjects,
        TEMPLATE_HEADERS,
        TEMPLATE_HEADER_NOTE,
        buildUnitMetricLabel,
        buildWaterfallTooltipHTML,
        formatPercentPoint,
        formatMetricNumber,
        formatSignedMetricNumber,
        buildWaterfallAxisRange,
        getMetricTickFormat,
        buildDetailExportRows,
        buildDetailClipboardText,
        buildTemplateStylesXml,
        buildTemplateWorksheetXml,
        buildXlsxTemplateEntries,
        createStoredZip
    };
}
