"use server";

import { createPorts } from "@/adapters";
import { analyze } from "@/domain/analyze";
import type { Analysis, AnalysisInput } from "@/domain/types";

export async function analyzeDraftAction(input: AnalysisInput): Promise<Analysis> {
  return analyze(input, createPorts());
}
