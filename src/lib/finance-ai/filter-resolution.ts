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

type QuestionMemberCandidate = FilterMemberCandidate & {
  token: string;
  score: number;
  exact: boolean;
};

const GENERIC_MEMBER_SUFFIXES = new Set([
  "大区",
  "区域",
  "地区",
  "地区部",
  "市场",
  "市场部",
  "品牌",
  "国家",
  "业务部",
  "事业部",
  "部门",
  "中心",
  "分公司",
  "公司",
  "渠道",
  "region",
  "market",
  "brand",
  "division",
  "department",
  "dept",
]);
const SCENARIO_DIMENSION_ALIASES = ["数据口径", "口径", "场景", "scenario", "scenarios"].map(normalizeFilterMember);

export type FinanceActionFilterResolution =
  | { ok: true; modules: FinanceActionModule[] }
  | { ok: false; message: string };

export function resolveFinanceActionFilterMembers(
  rows: FinanceRow[],
  schema: FinanceSchema,
  modules: FinanceActionModule[],
  question = "",
): FinanceActionFilterResolution {
  const inferredFilters = inferQuestionFilterIntent(rows, schema, question);
  if (inferredFilters && !inferredFilters.ok) {
    return inferredFilters;
  }

  const resolvedModules: FinanceActionModule[] = [];

  for (const actionModule of modules) {
    const moduleWithQuestionFilters = inferredFilters?.filters
      ? mergeModuleFilters(actionModule, inferredFilters.filters)
      : actionModule;
    const resolved = resolveModuleFilters(rows, schema, moduleWithQuestionFilters);
    if (!resolved.ok) {
      return resolved;
    }

    resolvedModules.push(resolved.module);
  }

  return { ok: true, modules: resolvedModules };
}

function inferQuestionFilterIntent(
  rows: FinanceRow[],
  schema: FinanceSchema,
  question: string,
): { ok: true; filters: FinanceFilter } | { ok: false; message: string } | null {
  const normalizedQuestion = normalizeFilterMember(question);
  if (normalizedQuestion.length < 2) {
    return null;
  }

  const candidates = findQuestionDimensionMemberCandidates(rows, schema, normalizedQuestion);
  if (!candidates.length) {
    return null;
  }

  const filters: FinanceFilter = {};
  const candidatesByToken = new Map<string, QuestionMemberCandidate[]>();
  candidates.forEach((candidate) => {
    const currentCandidates = candidatesByToken.get(candidate.token) ?? [];
    currentCandidates.push(candidate);
    candidatesByToken.set(candidate.token, currentCandidates);
  });

  for (const [token, tokenCandidates] of candidatesByToken.entries()) {
    const selectedCandidates = uniqueCandidates(selectStrongestQuestionCandidates(tokenCandidates));
    if (selectedCandidates.length > 1) {
      return {
        ok: false,
        message: buildAmbiguousFilterMessage(token, selectedCandidates),
      };
    }

    const selectedCandidate = selectedCandidates[0];
    if (selectedCandidate) {
      addFilterValues(filters, selectedCandidate.dimension, [selectedCandidate.value]);
    }
  }

  return Object.keys(filters).length ? { ok: true, filters } : null;
}

function findQuestionDimensionMemberCandidates(
  rows: FinanceRow[],
  schema: FinanceSchema,
  normalizedQuestion: string,
): QuestionMemberCandidate[] {
  return schema.dimensionColumns.flatMap((dimension) => {
    if (isScenarioDimension(dimension)) {
      return [];
    }

    return getDimensionMembers(rows, dimension).flatMap((member) => {
      const match = getQuestionMemberMatch(normalizedQuestion, member);
      return match
        ? [{ dimension, value: member, ...match }]
        : [];
    });
  });
}

function getQuestionMemberMatch(
  normalizedQuestion: string,
  member: string,
): Pick<QuestionMemberCandidate, "token" | "score" | "exact"> | null {
  const normalizedMember = normalizeFilterMember(member);
  if (normalizedMember.length < 2) {
    return null;
  }

  if (normalizedQuestion.includes(normalizedMember)) {
    return {
      token: normalizedMember,
      score: 1000 + normalizedMember.length,
      exact: true,
    };
  }

  const prefixToken = getGenericSuffixPrefixToken(normalizedQuestion, normalizedMember);
  return prefixToken
    ? { token: prefixToken, score: 100 + prefixToken.length, exact: false }
    : null;
}

function getGenericSuffixPrefixToken(normalizedQuestion: string, normalizedMember: string) {
  const maxPrefixLength = Math.min(normalizedMember.length - 1, 8);

  for (let length = maxPrefixLength; length >= 2; length -= 1) {
    const prefix = normalizedMember.slice(0, length);
    const suffix = normalizedMember.slice(length);
    if (normalizedQuestion.includes(prefix) && isGenericMemberSuffix(suffix)) {
      return prefix;
    }
  }

  return "";
}

function isGenericMemberSuffix(suffix: string) {
  return GENERIC_MEMBER_SUFFIXES.has(suffix);
}

function selectStrongestQuestionCandidates(candidates: QuestionMemberCandidate[]) {
  const exactCandidates = candidates.filter((candidate) => candidate.exact);
  const pool = exactCandidates.length ? exactCandidates : candidates;
  const maxScore = Math.max(...pool.map((candidate) => candidate.score));

  return pool.filter((candidate) => candidate.score === maxScore);
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

function mergeModuleFilters(actionModule: FinanceActionModule, filters: FinanceFilter): FinanceActionModule {
  return {
    ...actionModule,
    filters: mergeFilters("filters" in actionModule ? actionModule.filters : undefined, filters),
  } as FinanceActionModule;
}

function mergeFilters(base: FinanceFilter | undefined, extra: FinanceFilter): FinanceFilter {
  const merged: FinanceFilter = { ...(base ?? {}) };

  Object.entries(extra).forEach(([field, values]) => {
    addFilterValues(merged, field, values);
  });

  return merged;
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

function isScenarioDimension(dimension: string) {
  return SCENARIO_DIMENSION_ALIASES.includes(normalizeFilterMember(dimension));
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
