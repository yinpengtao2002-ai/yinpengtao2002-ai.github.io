export const FINANCE_TEMPLATE_FAMILIES: Array<{
  slug: string;
  title: string;
  description: string;
  modelSlugs: string[];
  defaultSample: string;
}>;

export const OPERATING_DETAIL_HEADERS: string[];
export const OPERATING_DETAIL_SCENARIO_SHEET_HEADERS: string[];
export const OPERATING_DETAIL_TEMPLATE_NOTE: string;

export function buildMonthKeys(startYear: number, startMonth: number, count: number): string[];
export function createOperatingDetailSampleRows(options?: { months?: string[] }): Array<Record<string, string | number>>;
export function createBudgetOperatingDetailRows(
  actualRows?: Array<Record<string, string | number>>,
): Array<Record<string, string | number>>;
export function getOperatingDetailTemplateRows(limit?: number): Array<Record<string, string | number>>;
export function getBudgetOperatingDetailTemplateRows(limit?: number): Array<Record<string, string | number>>;
export function getBudgetScenarioSheetTemplateRows(
  scenario?: "actual" | "budget",
  limit?: number,
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
  OPERATING_DETAIL_SCENARIO_SHEET_HEADERS: typeof OPERATING_DETAIL_SCENARIO_SHEET_HEADERS;
  OPERATING_DETAIL_TEMPLATE_NOTE: typeof OPERATING_DETAIL_TEMPLATE_NOTE;
  buildMonthKeys: typeof buildMonthKeys;
  createOperatingDetailSampleRows: typeof createOperatingDetailSampleRows;
  createBudgetOperatingDetailRows: typeof createBudgetOperatingDetailRows;
  getOperatingDetailTemplateRows: typeof getOperatingDetailTemplateRows;
  getBudgetOperatingDetailTemplateRows: typeof getBudgetOperatingDetailTemplateRows;
  getBudgetScenarioSheetTemplateRows: typeof getBudgetScenarioSheetTemplateRows;
  getFinanceTemplateFamilies: typeof getFinanceTemplateFamilies;
  getFinanceTemplateFamilyForModel: typeof getFinanceTemplateFamilyForModel;
};

export default financeTemplates;
