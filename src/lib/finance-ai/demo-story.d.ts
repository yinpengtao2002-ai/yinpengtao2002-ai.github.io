export type FinanceAIDemoValue = {
  label: string;
  value: number;
};

export type FinanceAIDemoMetric = {
  label: string;
  budget: number;
  actual: number;
  completion: number;
};

export type FinanceAIDemoBridge = {
  startValue: number;
  endValue: number;
  items: FinanceAIDemoValue[];
};

export type FinanceAIDemoRegionMom = {
  label: string;
  baseVolume: number;
  currentVolume: number;
  baseUnitMargin: number;
  currentUnitMargin: number;
};

export type FinanceAIDemoStory = {
  periods: { base: string; current: string };
  country: string;
  regionScenario: {
    actual: FinanceAIDemoValue[];
    budget: FinanceAIDemoValue[];
  };
  countryMetrics: FinanceAIDemoMetric[];
  countryUnitMarginBridge: FinanceAIDemoBridge;
  regionMom: FinanceAIDemoRegionMom[];
  totalMarginBridge: FinanceAIDemoBridge;
};

export function buildFinanceAIDemoStory(): FinanceAIDemoStory;

declare const financeAIDemoStory: {
  buildFinanceAIDemoStory: typeof buildFinanceAIDemoStory;
};

export default financeAIDemoStory;
