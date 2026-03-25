import type { QuestionAnalysis } from "./types";

const DEFAULT_WEAK_THRESHOLD = 70;

export function identifyWeakAnswers(
  analyses: QuestionAnalysis[],
  threshold = DEFAULT_WEAK_THRESHOLD,
): QuestionAnalysis[] {
  return analyses
    .filter((qa) => qa.contentScore < threshold)
    .sort((a, b) => a.contentScore - b.contentScore);
}
