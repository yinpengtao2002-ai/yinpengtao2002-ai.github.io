export const FINANCE_TEMPLATE_FAMILIES: Array<{
  slug: string;
  title: string;
  description: string;
  modelSlugs: string[];
  defaultSample: string;
}>;

export const OPERATING_DETAIL_HEADERS: string[];
export const OPERATING_DETAIL_INTERNAL_HEADERS: string[];
export const OPERATING_DETAIL_SCENARIO_SHEET_HEADERS: string[];
export const OPERATING_DETAIL_DIMENSION_HEADERS: string[];
export const OPERATING_DETAIL_FIELD_DICTIONARY_ROWS: string[][];
export const OPERATING_DETAIL_TEMPLATE_NOTE: string;
export const MODEL_TEMPLATE_SAMPLE_PROFILES: Record<string, {
  months: string[];
  businessKeyCount: number;
}>;

export function buildMonthKeys(startYear: number, startMonth: number, count: number): string[];
export function createOperatingDetailSampleRows(options?: { months?: string[] }): Array<Record<string, string | number>>;
export function createBudgetOperatingDetailRows(
  actualRows?: Array<Record<string, string | number>>,
): Array<Record<string, string | number>>;
export function getOperatingDetailTemplateRows(limit?: number): Array<Record<string, string | number>>;
export function getOperatingDetailTemplateRowsForModel(modelSlug: string): Array<Record<string, string | number>>;
export function selectOperatingDetailSampleRows(options?: {
  months?: string[];
  businessKeyCount?: number;
}): Array<Record<string, string | number>>;
export function operatingDetailBusinessKey(
  row: Record<string, string | number>,
  includeMonth?: boolean,
): string;
export function getOperatingDetailInstructionRowsForModel(modelSlug: string): string[][];
export function getBudgetOperatingDetailTemplateRows(modelSlugOrLimit?: string | number): Array<Record<string, string | number>>;
export function getBudgetScenarioSheetTemplateRows(
  scenario?: "actual" | "budget",
  modelSlugOrLimit?: string | number,
): Array<Record<string, string | number>>;
export function getFinanceTemplateFamilies(): Array<{
  slug: string;
  title: string;
  description: string;
  modelSlugs: string[];
  defaultSample: string;
}>;
export function getFinanceTemplateFamilyForModel(modelSlug: string): {
  slug: string;
  title: string;
  description: string;
  modelSlugs: string[];
  defaultSample: string;
} | null;

declare const financeTemplates: {
  FINANCE_TEMPLATE_FAMILIES: typeof FINANCE_TEMPLATE_FAMILIES;
  OPERATING_DETAIL_HEADERS: typeof OPERATING_DETAIL_HEADERS;
  OPERATING_DETAIL_INTERNAL_HEADERS: typeof OPERATING_DETAIL_INTERNAL_HEADERS;
  OPERATING_DETAIL_SCENARIO_SHEET_HEADERS: typeof OPERATING_DETAIL_SCENARIO_SHEET_HEADERS;
  OPERATING_DETAIL_DIMENSION_HEADERS: typeof OPERATING_DETAIL_DIMENSION_HEADERS;
  OPERATING_DETAIL_FIELD_DICTIONARY_ROWS: typeof OPERATING_DETAIL_FIELD_DICTIONARY_ROWS;
  OPERATING_DETAIL_TEMPLATE_NOTE: typeof OPERATING_DETAIL_TEMPLATE_NOTE;
  MODEL_TEMPLATE_SAMPLE_PROFILES: typeof MODEL_TEMPLATE_SAMPLE_PROFILES;
  buildMonthKeys: typeof buildMonthKeys;
  createOperatingDetailSampleRows: typeof createOperatingDetailSampleRows;
  createBudgetOperatingDetailRows: typeof createBudgetOperatingDetailRows;
  getOperatingDetailTemplateRows: typeof getOperatingDetailTemplateRows;
  getOperatingDetailTemplateRowsForModel: typeof getOperatingDetailTemplateRowsForModel;
  selectOperatingDetailSampleRows: typeof selectOperatingDetailSampleRows;
  operatingDetailBusinessKey: typeof operatingDetailBusinessKey;
  getOperatingDetailInstructionRowsForModel: typeof getOperatingDetailInstructionRowsForModel;
  getBudgetOperatingDetailTemplateRows: typeof getBudgetOperatingDetailTemplateRows;
  getBudgetScenarioSheetTemplateRows: typeof getBudgetScenarioSheetTemplateRows;
  getFinanceTemplateFamilies: typeof getFinanceTemplateFamilies;
  getFinanceTemplateFamilyForModel: typeof getFinanceTemplateFamilyForModel;
};

export default financeTemplates;
