import { clamp } from "@/lib/utils";
import { MAX_TEXT_LENGTH } from "./constants";
import { isQuestion, normalizeText, trimToMax } from "./text";

export type CheatFilterInput = {
  prompt: string;
  target: string;
  semanticSimilarityToTarget?: number | null;
};

export type CheatFilterResult =
  | { ok: true; sanitizedPrompt: string }
  | { ok: false; reason: string };

const META_CHEAT_PATTERNS = [
  /\bfirst letter\b/i,
  /\bstarts with\b/i,
  /\bspell( it| out)?\b/i,
  /\bacronym\b/i,
  /\binitials?\b/i,
  /\bletter by letter\b/i,
  /\bgive me the exact phrase\b/i,
  /\bverbatim\b/i,
  /\bcharacter(s)?\b/i
];

export function checkPromptForCheating({
  prompt,
  target,
  semanticSimilarityToTarget
}: CheatFilterInput): CheatFilterResult {
  const cleanedPrompt = trimToMax(prompt, MAX_TEXT_LENGTH);
  if (!cleanedPrompt) return { ok: false, reason: "Prompt is required." };
  if (!isQuestion(cleanedPrompt)) {
    return { ok: false, reason: "Prompt must be a question." };
  }

  const normalizedPrompt = normalizeText(cleanedPrompt);
  const normalizedTarget = normalizeText(target);

  if (!normalizedPrompt || !normalizedTarget) {
    return { ok: false, reason: "Prompt or target is invalid." };
  }

  const targetTokens = normalizedTarget.split(" ").filter(Boolean);
  for (const token of targetTokens) {
    if (token.length < 3) continue;
    if (normalizedPrompt.includes(token)) {
      return { ok: false, reason: "Prompt contains part of the target." };
    }
  }

  if (normalizedPrompt.includes(normalizedTarget)) {
    return { ok: false, reason: "Prompt contains the target phrase." };
  }

  if (META_CHEAT_PATTERNS.some((pattern) => pattern.test(cleanedPrompt))) {
    return {
      ok: false,
      reason: "Prompt uses disallowed clueing or spelling strategies."
    };
  }

  if (typeof semanticSimilarityToTarget === "number") {
    const sim = clamp(semanticSimilarityToTarget, 0, 1);
    if (sim >= 0.8) {
      return {
        ok: false,
        reason: "Prompt is too semantically similar to the target."
      };
    }
  }

  return { ok: true, sanitizedPrompt: cleanedPrompt };
}
