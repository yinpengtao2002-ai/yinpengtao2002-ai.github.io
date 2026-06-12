import registry from "./model-registry.json";

export type FinanceModelAccent = "orange" | "blue" | "green";
export type FinanceModelStatus = "testing";

export interface FinanceModelGuide {
  purpose: string;
  scenarios: string[];
  steps: string[];
  sampleData: string;
  fields: Array<{
    name: string;
    description: string;
  }>;
  pitfalls: string[];
  faq: Array<{
    question: string;
    answer: string;
  }>;
}

export interface FinanceModelItem {
  slug: string;
  title: string;
  summary: string;
  href: string;
  demoHref?: string;
  date: string;
  accent: FinanceModelAccent;
  status?: FinanceModelStatus;
  previewImage: string;
  previewAlt: string;
  aiGuide: FinanceModelGuide;
}

export const financeModels = registry.models as FinanceModelItem[];

export function getFinanceModelBySlug(slug: string) {
  return financeModels.find((model) => model.slug === slug);
}
