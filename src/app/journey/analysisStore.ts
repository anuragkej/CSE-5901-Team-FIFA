import type { Analysis } from "@/domain/types";

const KEY = "leaselens-analysis";

export interface AnalysisStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export function saveAnalysis(store: AnalysisStore, analysis: Analysis): void {
  store.set(KEY, JSON.stringify(analysis));
}

export function loadAnalysis(store: AnalysisStore): Analysis | null {
  const raw = store.get(KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Partial<Analysis>;
    if (!record.verdict || typeof record.verdict.headline !== "string") return null;
    if (!record.terms || !Array.isArray(record.flags)) return null;
    return record as Analysis;
  } catch {
    return null;
  }
}

export function browserAnalysisStore(): AnalysisStore {
  return {
    get: (key) => sessionStorage.getItem(key),
    set: (key, value) => sessionStorage.setItem(key, value),
  };
}

export function dangerFlags(analysis: Analysis): Analysis["flags"] {
  return analysis.flags.filter((flag) => flag.severity === "danger");
}
