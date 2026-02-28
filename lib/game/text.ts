import { MAX_TEXT_LENGTH } from "./constants";

const QUESTION_START_PATTERN = /^(who|what|when|where|why)\b/i;

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

export function isQuestion(text: string) {
  return /\?\s*$/.test(text.trim());
}

export function startsWithQuestionWord(text: string) {
  return QUESTION_START_PATTERN.test(text.trim());
}

export function ensureQuestionMark(text: string, max = MAX_TEXT_LENGTH) {
  const trimmed = trimToMax(text, max);
  if (!trimmed) return trimmed;
  if (isQuestion(trimmed)) return trimmed;

  const base = trimmed.replace(/[.!\s]+$/g, "").trimEnd();
  const withQuestion = `${base || trimmed.replace(/\s+$/g, "")}?`;

  if (withQuestion.length <= max) return withQuestion;
  return `${withQuestion.slice(0, Math.max(0, max - 1))}?`;
}

export function levenshteinDistance(a: string, b: string) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  let prev = Array.from({ length: shorter.length + 1 }, (_, index) => index);
  let curr = new Array<number>(shorter.length + 1);

  for (let i = 1; i <= longer.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= shorter.length; j += 1) {
      const cost = longer[i - 1] === shorter[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[shorter.length];
}
