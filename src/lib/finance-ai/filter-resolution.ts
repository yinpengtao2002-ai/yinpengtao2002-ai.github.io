import type {
  FinanceActionModule,
  FinanceFilter,
  FinanceRow,
  FinanceSchema,
} from "./types.ts";

type FilterMemberCandidate = {
  dimension: string;
  value: string;
};

export type FinanceActionFilterResolution =
  | { ok: true; modules: FinanceActionModule[] }
  | { ok: false; message: string };

export function resolveFinanceActionFilterMembers(
  rows: FinanceRow[],
  schema: FinanceSchema,
  modules: FinanceActionModule[],
): FinanceActionFilterResolution {
  const resolvedModules: FinanceActionModule[] = [];

  for (const actionModule of modules) {
    const resolved = resolveModuleFilters(rows, schema, actionModule);
    if (!resolved.ok) {
      return resolved;
    }

    resolvedModules.push(resolved.module);
  }

  return { ok: true, modules: resolvedModules };
}

function resolveModuleFilters(
  rows: FinanceRow[],
  schema: FinanceSchema,
  actionModule: FinanceActionModule,
): { ok: true; module: FinanceActionModule } | { ok: false; message: string } {
  if (!("filters" in actionModule) || !actionModule.filters) {
    return { ok: true, module: actionModule };
  }

  const filters = actionModule.filters;
  const nextFilters: FinanceFilter = {};

  for (const [field, values] of Object.entries(filters)) {
    if (!schema.dimensionColumns.includes(field)) {
      addFilterValues(nextFilters, field, values);
      continue;
    }

    for (const value of values) {
      const exactMember = getExactDimensionMember(rows, field, value);
      if (exactMember) {
        addFilterValues(nextFilters, field, [exactMember]);
        continue;
      }

      const candidates = findFuzzyDimensionMemberCandidates(rows, schema, value);
      if (candidates.length === 1) {
        addFilterValues(nextFilters, candidates[0].dimension, [candidates[0].value]);
        continue;
      }

      return {
        ok: false,
        message: candidates.length
          ? buildAmbiguousFilterMessage(value, candidates)
          : buildMissingFilterMessage(value, field),
      };
    }
  }

  return {
    ok: true,
    module: {
      ...actionModule,
      filters: nextFilters,
    } as FinanceActionModule,
  };
}

function addFilterValues(filters: FinanceFilter, field: string, values: string[]) {
  const currentValues = filters[field] ?? [];
  filters[field] = Array.from(new Set([...currentValues, ...values]));
}

function getExactDimensionMember(rows: FinanceRow[], dimension: string, value: string) {
  const normalizedValue = normalizeFilterMember(value);

  return getDimensionMembers(rows, dimension).find((member) => (
    normalizeFilterMember(member) === normalizedValue
  )) ?? "";
}

function findFuzzyDimensionMemberCandidates(
  rows: FinanceRow[],
  schema: FinanceSchema,
  value: string,
): FilterMemberCandidate[] {
  const normalizedValue = normalizeFilterMember(value);
  if (normalizedValue.length < 2) {
    return [];
  }

  const candidates = schema.dimensionColumns.flatMap((dimension) => (
    getDimensionMembers(rows, dimension)
      .filter((member) => {
        const normalizedMember = normalizeFilterMember(member);
        return normalizedMember.includes(normalizedValue) ||
          normalizedValue.includes(normalizedMember);
      })
      .map((member) => ({ dimension, value: member }))
  ));

  return uniqueCandidates(candidates);
}

function getDimensionMembers(rows: FinanceRow[], dimension: string) {
  const members = new Set<string>();

  rows.forEach((row) => {
    const value = String(row[dimension] ?? "").trim();
    if (value) {
      members.add(value);
    }
  });

  return Array.from(members);
}

function uniqueCandidates(candidates: FilterMemberCandidate[]) {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    const key = `${candidate.dimension}\u0000${candidate.value}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildAmbiguousFilterMessage(value: string, candidates: FilterMemberCandidate[]) {
  const options = candidates
    .slice(0, 6)
    .map((candidate) => `${candidate.dimension}=${candidate.value}`)
    .join("、");

  return `我还不能确定“${value}”是哪个维度。请补充你指的是 ${options} 中的哪一个，或直接写成“维度=成员”。`;
}

function buildMissingFilterMessage(value: string, field: string) {
  return `我在“${field}”里找不到“${value}”，也无法在其他维度唯一匹配。请补充“${value}”到底是哪个维度的数据。`;
}

function normalizeFilterMember(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-./,，。:：;；、"'“”‘’()（）]/g, "");
}
