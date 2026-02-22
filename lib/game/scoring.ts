import { clamp } from "@/lib/utils";
import { normalizeText, levenshteinDistance, wordCount } from "./text";

export function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function lexicalCloseness(answer: string, target: string) {
  const a = normalizeText(answer);
  const t = normalizeText(target);
  if (!a || !t) return 0;
  if (a === t) return 1;
  const dist = levenshteinDistance(a, t);
  const maxLen = Math.max(a.length, t.length);
  return maxLen === 0 ? 0 : clamp(1 - dist / maxLen, 0, 1);
}

export function hallucinationPenalty(answer: string) {
  const words = wordCount(answer);
  if (words <= 10) return 0;
  const extra = words - 10;
  return 15 + extra * 2;
}

export function computeScore(params: {
  answer: string;
  target: string;
  semantic: number;
  lexical: number;
}) {
  const exactMatch = normalizeText(params.answer) === normalizeText(params.target);
  if (exactMatch) {
    const penalty = hallucinationPenalty(params.answer);
    return {
      exactMatch: true,
      semanticScore: 1,
      lexicalScore: 1,
      hallucinationPenalty: penalty,
      scoreDelta: clamp(100 - penalty, 0, 100)
    };
  }

  const weighted = params.semantic * 0.7 + params.lexical * 0.3;
  const base = Math.round(weighted * 100);
  const penalty = hallucinationPenalty(params.answer);
  return {
    exactMatch: false,
    semanticScore: clamp(params.semantic, 0, 1),
    lexicalScore: clamp(params.lexical, 0, 1),
    hallucinationPenalty: penalty,
    scoreDelta: clamp(base - penalty, 0, 100)
  };
}
