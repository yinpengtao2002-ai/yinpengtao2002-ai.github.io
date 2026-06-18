export type FinanceFilterSelection = {
  includeValues?: unknown[];
  excludeValues?: unknown[];
};

export type PruneCascadingSelectionsInput<Row> = {
  dimensions: string[];
  changedDimension: string;
  rows: Row[];
  includeSelections?: Record<string, unknown[] | null | undefined>;
  excludeSelections?: Record<string, unknown[] | null | undefined>;
  getRowValue: (row: Row, dimension: string) => unknown;
};

export type PrunedCascadingSelections = {
  includeSelections: Record<string, string[]>;
  excludeSelections: Record<string, string[]>;
};

export function normalizeFilterValues(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const normalized = values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  return Array.from(new Set(normalized));
}

export function searchFilterOptions(values: unknown[], searchText = ""): string[] {
  const options = normalizeFilterValues(values);
  const keyword = String(searchText || "").trim().toLowerCase();

  if (!keyword) {
    return options;
  }

  return options.filter((value) => value.toLowerCase().includes(keyword));
}

export function resolveAppliedFilterValues(availableValues: unknown[], selectedValues: Iterable<unknown>): string[] {
  const available = normalizeFilterValues(availableValues);
  const selected = new Set(normalizeFilterValues(Array.from(selectedValues)));

  return available.filter((value) => selected.has(value));
}

export function invertFilterSelection(availableValues: unknown[], selectedValues: unknown[]): string[] {
  const selected = new Set(normalizeFilterValues(selectedValues));

  return normalizeFilterValues(availableValues).filter((value) => !selected.has(value));
}

export function buildExcludeSelection(availableValues: unknown[], selectedValues: unknown[]): string[] {
  return invertFilterSelection(availableValues, selectedValues);
}

export function matchesIncludeExcludeFilter(value: unknown, selection: FinanceFilterSelection): boolean {
  const normalizedValue = String(value ?? "").trim();
  const includeValues = normalizeFilterValues(selection.includeValues);
  const excludeValues = normalizeFilterValues(selection.excludeValues);

  if (includeValues.length > 0 && !includeValues.includes(normalizedValue)) {
    return false;
  }

  if (excludeValues.length > 0 && excludeValues.includes(normalizedValue)) {
    return false;
  }

  return true;
}

export function pruneCascadingSelections<Row>({
  dimensions,
  changedDimension,
  rows,
  includeSelections = {},
  excludeSelections = {},
  getRowValue,
}: PruneCascadingSelectionsInput<Row>): PrunedCascadingSelections {
  const dimensionOrder = normalizeFilterValues(dimensions);
  const changedIndex = dimensionOrder.indexOf(changedDimension);
  const firstPrunedIndex = changedIndex >= 0 ? changedIndex + 1 : 0;
  const prunedInclude = cleanSelectionMap(includeSelections);
  const prunedExclude = cleanSelectionMap(excludeSelections);

  for (let index = firstPrunedIndex; index < dimensionOrder.length; index += 1) {
    const dimension = dimensionOrder[index];
    const availableValues = distinctValuesForDimension({
      dimensions: dimensionOrder,
      dimensionIndex: index,
      rows,
      includeSelections: prunedInclude,
      excludeSelections: prunedExclude,
      getRowValue,
    });

    prunedInclude[dimension] = resolveAppliedFilterValues(
      availableValues,
      prunedInclude[dimension] ?? [],
    );
    prunedExclude[dimension] = resolveAppliedFilterValues(
      availableValues,
      prunedExclude[dimension] ?? [],
    );
  }

  return {
    includeSelections: removeEmptySelections(prunedInclude),
    excludeSelections: removeEmptySelections(prunedExclude),
  };
}

function distinctValuesForDimension<Row>({
  dimensions,
  dimensionIndex,
  rows,
  includeSelections,
  excludeSelections,
  getRowValue,
}: {
  dimensions: string[];
  dimensionIndex: number;
  rows: Row[];
  includeSelections: Record<string, string[]>;
  excludeSelections: Record<string, string[]>;
  getRowValue: (row: Row, dimension: string) => unknown;
}) {
  const upstreamDimensions = dimensions.slice(0, dimensionIndex);
  const scopedRows = rows.filter((row) => (
    upstreamDimensions.every((dimension) => (
      matchesIncludeExcludeFilter(getRowValue(row, dimension), {
        includeValues: includeSelections[dimension],
        excludeValues: excludeSelections[dimension],
      })
    ))
  ));

  return scopedRows
    .map((row) => getRowValue(row, dimensions[dimensionIndex]))
    .filter((value) => String(value ?? "").trim());
}

function cleanSelectionMap(selectionMap: Record<string, unknown[] | null | undefined>): Record<string, string[]> {
  return Object.entries(selectionMap).reduce<Record<string, string[]>>((cleaned, [dimension, values]) => {
    const normalized = normalizeFilterValues(values);
    if (normalized.length > 0) {
      cleaned[dimension] = normalized;
    }
    return cleaned;
  }, {});
}

function removeEmptySelections(selectionMap: Record<string, string[]>): Record<string, string[]> {
  return Object.entries(selectionMap).reduce<Record<string, string[]>>((cleaned, [dimension, values]) => {
    if (values.length > 0) {
      cleaned[dimension] = values;
    }
    return cleaned;
  }, {});
}
