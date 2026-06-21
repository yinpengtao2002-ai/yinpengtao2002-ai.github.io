import {
  DEFAULT_KELLY_FRACTIONS,
  buildKellyLeverageMatrix,
  buildProbabilitySensitivity,
  calculateKellyMetrics,
  deriveWinLossFromPrices,
  formatPercent,
  formatRatio,
} from "./lib/kelly.js?v=202606201224";

const elements = {
  messageArea: document.querySelector("#message-area"),
  currentPriceInput: document.querySelector("#current-price-input"),
  targetPriceInput: document.querySelector("#target-price-input"),
  failurePriceInput: document.querySelector("#failure-price-input"),
  probabilitySlider: document.querySelector("#probability-slider"),
  customFractionSlider: document.querySelector("#custom-fraction-slider"),
  rangeSlider: document.querySelector("#range-slider"),
  stepSlider: document.querySelector("#step-slider"),
  probabilityOutput: document.querySelector("#probability-output"),
  customFractionOutput: document.querySelector("#custom-fraction-output"),
  rangeOutput: document.querySelector("#range-output"),
  stepOutput: document.querySelector("#step-output"),
  resultGrid: document.querySelector("#result-grid"),
  chart: document.querySelector("#sensitivity-chart"),
  chartTooltip: document.querySelector("#chart-tooltip"),
  matrixHead: document.querySelector("#kelly-matrix-head"),
  matrixBody: document.querySelector("#kelly-matrix-body"),
  resetButton: document.querySelector("#reset-button"),
  formulaProof: document.querySelector(".formula-proof"),
};

const defaults = {
  probability: "40",
  customFraction: "0.2",
  range: "15",
  step: "5",
  currentPrice: "9",
  targetPrice: "15",
  failurePrice: "6",
};

const resultOrder = [
  "win",
  "loss",
  "riskRewardRatio",
  "expectedValue",
  "breakevenProbability",
];

const resultLabels = {
  win: "预期收益幅度",
  loss: "预期亏损幅度",
  riskRewardRatio: "盈亏比",
  expectedValue: "期望收益 EV",
  breakevenProbability: "盈亏平衡胜率",
};

let chartState = null;

const numberFromInput = (input) => Number(input.value);

function updateSliderOutputs() {
  elements.probabilityOutput.textContent = `${numberFromInput(elements.probabilitySlider).toFixed(1)}%`;
  elements.customFractionOutput.textContent = `${numberFromInput(elements.customFractionSlider).toFixed(2)}x`;
  elements.rangeOutput.textContent = `±${numberFromInput(elements.rangeSlider).toFixed(0)}pp`;
  elements.stepOutput.textContent = `${numberFromInput(elements.stepSlider).toFixed(1)}pp`;
}

function getInputs() {
  const { win, loss } = deriveWinLossFromPrices({
    currentPrice: elements.currentPriceInput.value,
    targetPrice: elements.targetPriceInput.value,
    failurePrice: elements.failurePriceInput.value,
  });
  const probability = numberFromInput(elements.probabilitySlider) / 100;
  const rangePoints = numberFromInput(elements.rangeSlider);
  const stepPoints = numberFromInput(elements.stepSlider);
  const customFraction = numberFromInput(elements.customFractionSlider);

  if (!Number.isFinite(customFraction) || customFraction <= 0) {
    throw new Error("自定义凯利折扣必须大于 0");
  }

  return {
    win,
    loss,
    probability,
    rangePoints,
    stepPoints,
    customFraction,
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setMessage(message, type = "error") {
  if (!message) {
    elements.messageArea.innerHTML = "";
    return;
  }

  elements.messageArea.innerHTML = `<div class="message ${type}">${escapeHtml(message)}</div>`;
}

function clampDisplay(value) {
  return value > 0 ? value : 0;
}

function formatLeverageX(value) {
  const leverage = clampDisplay(value);
  return `${leverage.toFixed(2)}x`;
}

function getMetricTone(value, kind) {
  if (kind === "expectedValue") return value > 0 ? "positive" : "muted";
  if (kind === "kelly") {
    if (value <= 0) return "muted";
    if (value > 1) return "danger";
    return "positive";
  }
  return "neutral";
}

function getMetricFill(value, kind) {
  if (kind === "ratio") return Math.min(value / 3, 1);
  if (kind === "expectedValue") return Math.min(Math.max(value, 0) / 0.3, 1);
  if (kind === "kelly") return Math.min(clampDisplay(value), 1);
  return Math.min(Math.max(value, 0), 1);
}

function buildResultItems(metrics) {
  const values = {
    win: { value: formatPercent(metrics.win), raw: metrics.win, kind: "percent" },
    loss: { value: formatPercent(metrics.loss), raw: metrics.loss, kind: "percent" },
    riskRewardRatio: { value: formatRatio(metrics.riskRewardRatio), raw: metrics.riskRewardRatio, kind: "ratio" },
    expectedValue: { value: formatPercent(metrics.expectedValue), raw: metrics.expectedValue, kind: "expectedValue" },
    breakevenProbability: {
      value: formatPercent(metrics.breakevenProbability),
      raw: metrics.breakevenProbability,
      kind: "percent",
    },
  };

  return resultOrder.map((key) => ({
    key,
    label: resultLabels[key],
    ...values[key],
    tone: getMetricTone(values[key].raw, values[key].kind),
    fill: getMetricFill(values[key].raw, values[key].kind),
  }));
}

function renderResults(metrics) {
  elements.resultGrid.innerHTML = buildResultItems(metrics)
    .map(
      (item) => `
        <article class="metric-card ${item.tone}">
          <span>${item.label}</span>
          <strong>${item.value}</strong>
          <i class="metric-bar" aria-hidden="true"><b style="width: ${(item.fill * 100).toFixed(1)}%"></b></i>
        </article>
      `,
    )
    .join("");
}

function linePath(rows, field, xScale, yScale) {
  return rows
    .map((row, index) => `${index === 0 ? "M" : "L"} ${xScale(row.probability).toFixed(2)} ${yScale(row[field]).toFixed(2)}`)
    .join(" ");
}

function renderSensitivityChart(rows, metrics) {
  if (!rows.length) {
    elements.chart.innerHTML = "";
    chartState = null;
    return;
  }

  const width = 760;
  const height = 360;
  const padding = { top: 28, right: 28, bottom: 46, left: 64 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const allValues = rows.flatMap((row) => [row.fullKelly, row.halfKelly, row.thirdKelly, row.quarterKelly, 0]);
  const minY = Math.min(...allValues);
  const maxY = Math.max(...allValues);
  const yPadding = Math.max((maxY - minY) * 0.16, 0.08);
  const yMin = minY - yPadding;
  const yMax = maxY + yPadding;
  const xMin = rows[0].probability;
  const xMax = rows[rows.length - 1].probability;
  const xSpan = Math.max(xMax - xMin, 0.01);
  const ySpan = Math.max(yMax - yMin, 0.01);
  const xScale = (value) => padding.left + ((value - xMin) / xSpan) * chartWidth;
  const yScale = (value) => padding.top + chartHeight - ((value - yMin) / ySpan) * chartHeight;
  const zeroY = yScale(0);
  const currentX = xScale(metrics.probability);
  const breakevenInRange = metrics.breakevenProbability >= xMin && metrics.breakevenProbability <= xMax;
  const breakevenX = xScale(Math.min(Math.max(metrics.breakevenProbability, xMin), xMax));
  const breakevenLabel = breakevenInRange
    ? "正凯利临界"
    : metrics.breakevenProbability < xMin
      ? `临界 ${formatPercent(metrics.breakevenProbability, 0)}`
      : `临界 ${formatPercent(metrics.breakevenProbability, 0)}`;
  const yTicks = [yMin, 0, yMax];
  const xTicks = [xMin, metrics.probability, xMax];

  chartState = {
    rows,
    width,
    padding,
    chartWidth,
    xMin,
    xSpan,
    xScale,
    yScale,
    fields: ["fullKelly", "halfKelly", "thirdKelly", "quarterKelly"],
  };

  elements.chart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" aria-hidden="true">
      <rect class="chart-bg" x="0" y="0" width="${width}" height="${height}" rx="8"></rect>
      ${yTicks
        .map(
          (tick) => `
            <line class="grid-line" x1="${padding.left}" x2="${width - padding.right}" y1="${yScale(tick)}" y2="${yScale(tick)}"></line>
            <text class="axis-label" x="${padding.left - 12}" y="${yScale(tick) + 4}" text-anchor="end">${formatPercent(tick, 0)}</text>
          `,
        )
        .join("")}
      ${xTicks
        .map(
          (tick) => `
            <text class="axis-label" x="${xScale(tick)}" y="${height - 16}" text-anchor="middle">${formatPercent(tick, 0)}</text>
          `,
        )
        .join("")}
      <line class="zero-line" x1="${padding.left}" x2="${width - padding.right}" y1="${zeroY}" y2="${zeroY}"></line>
      <line class="marker-line current" x1="${currentX}" x2="${currentX}" y1="${padding.top}" y2="${height - padding.bottom}"></line>
      <text class="marker-label current" x="${currentX + 6}" y="${padding.top + 16}">当前</text>
      <line class="marker-line breakeven" x1="${breakevenX}" x2="${breakevenX}" y1="${padding.top}" y2="${height - padding.bottom}"></line>
      <text class="marker-label breakeven" x="${breakevenX + 6}" y="${padding.top + 36}">${breakevenLabel}</text>
      <path class="series-line full" d="${linePath(rows, "fullKelly", xScale, yScale)}"></path>
      <path class="series-line half" d="${linePath(rows, "halfKelly", xScale, yScale)}"></path>
      <path class="series-line third" d="${linePath(rows, "thirdKelly", xScale, yScale)}"></path>
      <path class="series-line quarter" d="${linePath(rows, "quarterKelly", xScale, yScale)}"></path>
    </svg>
  `;
}

function findNearestChartRow(event) {
  if (!chartState) return null;

  const rect = elements.chart.getBoundingClientRect();
  const viewX = ((event.clientX - rect.left) / rect.width) * chartState.width;
  const probability = chartState.xMin + ((viewX - chartState.padding.left) / chartState.chartWidth) * chartState.xSpan;

  return chartState.rows.reduce((best, row) =>
    Math.abs(row.probability - probability) < Math.abs(best.probability - probability) ? row : best,
  chartState.rows[0]);
}

function renderChartTooltip(row, event) {
  if (!row) return;

  const panelRect = elements.chart.parentElement.getBoundingClientRect();
  const x = event.clientX - panelRect.left;
  const y = event.clientY - panelRect.top;

  elements.chartTooltip.innerHTML = `
    <strong>${formatPercent(row.probability)} 胜率</strong>
    <span>EV ${formatPercent(row.expectedValue)}</span>
    <span>全凯利 ${formatLeverageX(row.fullKelly)} / ${formatPercent(clampDisplay(row.fullKelly))}</span>
    <span>半凯利 ${formatLeverageX(row.halfKelly)} / ${formatPercent(clampDisplay(row.halfKelly))}</span>
    <span>1/3 ${formatLeverageX(row.thirdKelly)} / ${formatPercent(clampDisplay(row.thirdKelly))}</span>
    <span>1/4 ${formatLeverageX(row.quarterKelly)} / ${formatPercent(clampDisplay(row.quarterKelly))}</span>
  `;
  elements.chartTooltip.style.left = `${Math.min(Math.max(x + 14, 12), panelRect.width - 220)}px`;
  elements.chartTooltip.style.top = `${Math.max(y - 24, 12)}px`;
  elements.chartTooltip.classList.remove("hidden");
}

function hideChartTooltip() {
  elements.chartTooltip.classList.add("hidden");
}

function getMatrixCellStyle(value) {
  const leverage = clampDisplay(value);
  if (leverage === 0) return "background-color: rgba(170, 167, 157, 0.10);";
  if (leverage > 1) {
    const alpha = Math.min(0.1 + (leverage - 1) * 0.28, 0.46);
    return `background-color: rgba(182, 95, 85, ${alpha.toFixed(3)});`;
  }
  const alpha = Math.min(0.08 + leverage * 0.42, 0.46);
  return `background-color: rgba(120, 140, 93, ${alpha.toFixed(3)});`;
}

function renderKellyMatrix(matrix, metrics) {
  elements.matrixHead.innerHTML = `
    <tr>
      <th>胜率</th>
      ${matrix.columns.map((column) => `<th>${column.label}</th>`).join("")}
    </tr>
  `;

  const step = numberFromInput(elements.stepSlider) / 100;
  elements.matrixBody.innerHTML = matrix.rows
    .map((row) => {
      const isCurrent = Math.abs(row.probability - metrics.probability) <= step / 2;
      const isBreakeven = Math.abs(row.probability - metrics.breakevenProbability) <= step / 2;

      return `
        <tr class="${isCurrent ? "current-row" : ""} ${isBreakeven ? "breakeven-row" : ""}">
          <th scope="row">
            ${formatPercent(row.probability)}
            ${isCurrent ? "<em>当前</em>" : ""}
            ${isBreakeven ? "<em>临界</em>" : ""}
          </th>
          ${matrix.columns
            .map((column) => {
              const cell = row.cells[column.key];
              return `
                <td class="matrix-cell ${cell.riskLevel}" style="${getMatrixCellStyle(cell.rawLeverage)}">
                  ${formatLeverageX(cell.rawLeverage)}
                </td>
              `;
            })
            .join("")}
        </tr>
      `;
    })
    .join("");
}

function clearOutputs() {
  elements.resultGrid.innerHTML = "";
  elements.chart.innerHTML = "";
  elements.matrixHead.innerHTML = "";
  elements.matrixBody.innerHTML = "";
  hideChartTooltip();
}

function handleInputChange() {
  try {
    updateSliderOutputs();
    const inputs = getInputs();
    const fractions = {
      ...DEFAULT_KELLY_FRACTIONS,
      custom: inputs.customFraction,
    };
    const metrics = calculateKellyMetrics({
      win: inputs.win,
      loss: inputs.loss,
      probability: inputs.probability,
      fractions,
    });
    const sensitivityRows = buildProbabilitySensitivity({
      win: inputs.win,
      loss: inputs.loss,
      probability: inputs.probability,
      rangePoints: inputs.rangePoints,
      stepPoints: inputs.stepPoints,
      fractions,
    });
    const leverageMatrix = buildKellyLeverageMatrix({
      win: inputs.win,
      loss: inputs.loss,
      probability: inputs.probability,
      rangePoints: inputs.rangePoints,
      stepPoints: inputs.stepPoints,
      fractions,
    });

    setMessage("");
    renderResults(metrics);
    renderSensitivityChart(sensitivityRows, metrics);
    renderKellyMatrix(leverageMatrix, metrics);
  } catch (error) {
    updateSliderOutputs();
    setMessage(error instanceof Error ? error.message : "输入参数有误，请检查后重试。");
    clearOutputs();
  }
}

function resetDefaults() {
  elements.probabilitySlider.value = defaults.probability;
  elements.customFractionSlider.value = defaults.customFraction;
  elements.rangeSlider.value = defaults.range;
  elements.stepSlider.value = defaults.step;
  elements.currentPriceInput.value = defaults.currentPrice;
  elements.targetPriceInput.value = defaults.targetPrice;
  elements.failurePriceInput.value = defaults.failurePrice;
  handleInputChange();
}

function typesetFormulaProof() {
  if (!elements.formulaProof?.open || !window.MathJax?.typesetPromise) return;
  window.MathJax.typesetPromise([elements.formulaProof]).catch(() => {});
}

function bindEvents() {
  document.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", handleInputChange);
    input.addEventListener("change", handleInputChange);
  });
  elements.chart.addEventListener("mousemove", (event) => renderChartTooltip(findNearestChartRow(event), event));
  elements.chart.addEventListener("mouseleave", hideChartTooltip);
  elements.resetButton.addEventListener("click", resetDefaults);
  elements.formulaProof?.addEventListener("toggle", typesetFormulaProof);
}

bindEvents();
handleInputChange();
