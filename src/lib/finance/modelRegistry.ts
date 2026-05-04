import registry from "./model-registry.json";

export type FinanceModelAccent = "orange" | "blue" | "green";

export interface FinanceModelCategory {
  id: string;
  label: string;
  description: string;
}

export interface FinanceModelGuide {
  purpose: string;
  scenarios: string[];
  steps: string[];
  sampleData: string;
  faq: Array<{
    question: string;
    answer: string;
  }>;
}

export interface FinanceModelItem {
  slug: string;
  categoryId: string;
  title: string;
  summary: string;
  href: string;
  date: string;
  accent: FinanceModelAccent;
  aiGuide: FinanceModelGuide;
}

export const financeModelCategories = registry.categories as FinanceModelCategory[];
export const financeModels = registry.models as FinanceModelItem[];

export function getFinanceModelBySlug(slug: string) {
  return financeModels.find((model) => model.slug === slug);
}

export function getFinanceModelsByCategory(categoryId: string) {
  return financeModels.filter((model) => model.categoryId === categoryId);
}

export function getFinanceModelCategory(categoryId: string) {
  return financeModelCategories.find((category) => category.id === categoryId);
}
