import { MIN_TEXT_LENGTH } from "@/app/analyzeInput";
import type { AnalysisInput } from "@/domain/types";

const KEY = "leaselens-draft";

export interface DraftStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export function saveDraft(store: DraftStore, input: AnalysisInput): void {
  store.set(KEY, JSON.stringify(input));
}

export function loadDraft(store: DraftStore): AnalysisInput | null {
  const raw = store.get(KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Partial<AnalysisInput>;
    if (typeof record.text !== "string" || record.text.trim().length < MIN_TEXT_LENGTH) return null;
    const bedrooms = typeof record.bedrooms === "number" && Number.isInteger(record.bedrooms) ? record.bedrooms : undefined;
    return {
      text: record.text,
      address: typeof record.address === "string" ? record.address : undefined,
      bedrooms,
      landlordName: typeof record.landlordName === "string" ? record.landlordName : undefined,
    };
  } catch {
    return null;
  }
}

export function browserDraftStore(): DraftStore {
  return {
    get: (key) => sessionStorage.getItem(key),
    set: (key, value) => sessionStorage.setItem(key, value),
  };
}
