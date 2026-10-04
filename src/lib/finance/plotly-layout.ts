// Plotly 3 dropped the string shorthand for titles (`title: "亿元"`) and the `titlefont`
// attribute; such titles are silently discarded. Finance charts were written against the old
// shorthand, so every layout and trace passes through here before rendering.

type PlotlyRecord = Record<string, unknown>;

function isRecord(value: unknown): value is PlotlyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeTitleHolder<T>(holder: T): T {
  if (!isRecord(holder)) return holder;
  const { title, titlefont, ...rest } = holder as PlotlyRecord & { title?: unknown; titlefont?: unknown };
  if (title === undefined && titlefont === undefined) return holder;

  const titleObject: PlotlyRecord = typeof title === "string" || typeof title === "number"
    ? { text: String(title) }
    : isRecord(title) ? { ...title } : {};
  if (isRecord(titlefont) && !isRecord(titleObject.font)) titleObject.font = titlefont;
  return { ...rest, title: titleObject } as T;
}

function normalizeColorbar(container: unknown) {
  if (!isRecord(container) || !isRecord(container.colorbar)) return container;
  return { ...container, colorbar: normalizeTitleHolder(container.colorbar) };
}

export function normalizePlotlyLayout<T>(layout: T): T {
  if (!isRecord(layout)) return layout;
  const next: PlotlyRecord = { ...normalizeTitleHolder(layout) };
  Object.keys(next).forEach((key) => {
    if (/^[xy]axis\d*$/.test(key)) next[key] = normalizeTitleHolder(next[key]);
    if (/^coloraxis\d*$/.test(key)) next[key] = normalizeColorbar(next[key]);
  });
  return next as T;
}

export function normalizePlotlyTraces<T>(traces: T): T {
  if (!Array.isArray(traces)) return traces;
  return traces.map((trace) => {
    const withColorbar = normalizeColorbar(trace);
    if (isRecord(withColorbar) && isRecord(withColorbar.marker)) {
      return { ...withColorbar, marker: normalizeColorbar(withColorbar.marker) };
    }
    return withColorbar;
  }) as T;
}
