import { clamp } from "@/lib/utils";
import { normalizeText, levenshteinDistance } from "./text";

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

export function computeScore(params: {
  answer: string;
  target: string;
  semantic: number;
  lexical: number;
}) {
  const exactMatch = normalizeText(params.answer) === normalizeText(params.target);
  if (exactMatch) {
    return {
      exactMatch: true,
      semanticScore: 1,
      lexicalScore: 1,
      scoreDelta: 100
    };
  }

  const weighted = params.semantic * 0.7 + params.lexical * 0.3;
  const base = Math.round(weighted * 100);
  return {
    exactMatch: false,
    semanticScore: clamp(params.semantic, 0, 1),
    lexicalScore: clamp(params.lexical, 0, 1),
    scoreDelta: clamp(base, 0, 100)
  };
}
