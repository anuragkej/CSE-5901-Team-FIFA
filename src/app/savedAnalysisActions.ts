"use server";

import { listSignedInAnalyses, requestAuth, saveSignedInAnalysis } from "@/adapters/supabase";
import { isAnalysis, type ListAnalysesResult, type SaveAnalysisResult } from "@/domain/savedAnalyses";

export async function saveAnalysisAction(input: unknown): Promise<SaveAnalysisResult> {
  const session = await (await requestAuth()).session();
  if (!session) return { kind: "signed_out" };
  if (!isAnalysis(input)) return { kind: "invalid" };
  try {
    const saved = await saveSignedInAnalysis(session.userId, input);
    return { kind: "saved", id: saved.record.id, createdAt: saved.record.createdAt, storage: saved.storage };
  } catch {
    return { kind: "unavailable" };
  }
}

export async function listAnalysesAction(): Promise<ListAnalysesResult> {
  const session = await (await requestAuth()).session();
  if (!session) return { kind: "signed_out" };
  try {
    const listed = await listSignedInAnalyses(session.userId);
    return { kind: "list", records: listed.records, storage: listed.storage };
  } catch {
    return { kind: "unavailable" };
  }
}
