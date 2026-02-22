import { MAX_TEXT_LENGTH } from "./constants";

export function trimToMax(text: string, max = MAX_TEXT_LENGTH) {
  return text.trim().slice(0, max);
}

export function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function wordCount(text: string) {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

export function isQuestion(text: string) {
  return /\?\s*$/.test(text.trim());
}

export function levenshteinDistance(a: string, b: string) {
  const s = a;
  const t = b;
  const dp = Array.from({ length: s.length + 1 }, () =>
    Array<number>(t.length + 1).fill(0)
  );
  for (let i = 0; i <= s.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= t.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= s.length; i += 1) {
    for (let j = 1; j <= t.length; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[s.length][t.length];
}
