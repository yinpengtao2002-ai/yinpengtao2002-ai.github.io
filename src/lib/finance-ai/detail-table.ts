export type MomComparisonDetailInput = {
  dimension: string;
  labels: string[];
  metrics: string[];
  getValues: (label: string, metric: string) => { previous: number | null; current: number | null } | undefined;
};

export function buildMomComparisonDetailRows(input: MomComparisonDetailInput) {
  const showDimensionColumn = input.labels.length !== 1;
  const columns = showDimensionColumn
    ? [input.dimension, "项目", "上期", "本期", "变化", "变化率"]
    : ["项目", "上期", "本期", "变化", "变化率"];
  const rows = input.labels.flatMap((label) => (
    input.metrics.map((metric) => {
      const values = input.getValues(label, metric);
      const previous = values?.previous ?? null;
      const current = values?.current ?? null;
      const change = previous !== null && current !== null
        ? stableNumber(current - previous)
        : null;
      const changeRate = previous !== null && previous !== 0 && change !== null
        ? stableNumber(change / previous)
        : null;
      const row = [
        metric,
        previous,
        current,
        change,
        changeRate,
      ];

      return showDimensionColumn ? [label, ...row] : row;
    })
  ));

  return {
    columns,
    rows,
  };
}

function stableNumber(value: number) {
  return Number(value.toFixed(12));
}
