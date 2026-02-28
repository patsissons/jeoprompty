"use server";

import { EMBEDDING_MODEL, MODEL_NAME } from "@/lib/game/constants";

type OpenAIResponsePayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

function getApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return apiKey;
}

async function openAiFetch(path: string, init: RequestInit) {
  const response = await fetch(`https://api.openai.com${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${text}`);
  }

  return response.json();
}

function extractOutputText(payload: OpenAIResponsePayload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  const chunks =
    payload.output
      ?.flatMap((entry) => entry.content ?? [])
      .filter((item) => item.type === "output_text" || item.type === "text")
      .map((item) => item.text?.trim())
      .filter(Boolean) ?? [];
  return chunks.join(" ").trim();
}

export async function generateResponseText({
  systemPrompt,
  userPrompt,
  maxOutputTokens = 64
}: {
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens?: number;
}) {
  const payload = await openAiFetch("/v1/responses", {
    method: "POST",
    body: JSON.stringify({
      model: MODEL_NAME,
      max_output_tokens: maxOutputTokens,
      reasoning: { effort: "minimal" },
      text: { verbosity: "low" },
      input: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ]
    })
  });

  const output = extractOutputText(payload as OpenAIResponsePayload);
  if (!output) {
    throw new Error("OpenAI returned empty output.");
  }
  return output;
}


export async function generateConciseAnswer(prompt: string, words: number) {
  const normalizedPromptWords = prompt
    .split(/\s+/)
    .map((word) => word.replace(/[^a-zA-Z0-9]/g, "").trim().toLowerCase())
    .filter((word) => word.length > 2);
  const promptWordSet = new Set(normalizedPromptWords);

  const NON_ANSWER_PATTERNS = [
    /\b(i|we)\s+(cannot|can't|can not|won't|will not|am unable|are unable)\b/i,
    /\b(as an ai|as a language model)\b/i,
    /\b(i'm sorry|sorry)\b/i,
    /\b(cannot provide|can't provide|unable to provide)\b/i,
    /\b(prohibited|restricted|not allowed|policy)\b/i,
    /\b(i do not|i don't)\s+(know|have enough|have sufficient)\b/i
  ];

  function cleanAnswer(text: string) {
    return text.replace(/\s+/g, " ").trim().replace(/^["'`]+|["'`]+$/g, "");
  }

  function answerWords(text: string) {
    return text
      .split(/\s+/)
      .map((word) => word.replace(/[^a-zA-Z0-9]/g, "").trim().toLowerCase())
      .filter(Boolean);
  }

  function validateAnswer(text: string, attempt: number) {
    const cleaned = cleanAnswer(text);
    if (!cleaned) return { ok: false as const, reason: "empty answer" };
    if (NON_ANSWER_PATTERNS.some((pattern) => pattern.test(cleaned))) {
      return { ok: false as const, reason: "non-answer refusal language" };
    }

    const tokens = answerWords(cleaned);
    if (tokens.length !== words) {
      return { ok: false as const, reason: `wrong word count (${tokens.length} != ${words})` };
    }

    // Keep anti-echo checks strict early, then relax so we still get a direct answer.
    if (attempt <= 3 && tokens.some((word) => promptWordSet.has(word))) {
      return { ok: false as const, reason: "echoed prompt words" };
    }

    return { ok: true as const, answer: cleaned };
  }

  const maxAttempts = 8;
  let lastFailure = "unknown";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const systemPromptParts = [
      "You are answering a trivia-style question with a direct factual answer.",
      `Return exactly ${words} words.`,
      "Output only the answer text.",
      "Do not output prefaces, explanations, apologies, refusals, or policy text.",
      "If wording constraints conflict, rewrite with close synonyms and still answer directly."
    ];

    if (normalizedPromptWords.length > 0) {
      systemPromptParts.push(
        `Avoid reusing these prompt words when possible: ${normalizedPromptWords.join(", ")}.`
      );
    }
    if (attempt > 1) {
      systemPromptParts.push(
        `Previous output failed validation (${lastFailure}). Fix that and return only the final answer.`
      );
    }

    const answer = await generateResponseText({
      systemPrompt: systemPromptParts.join(" "),
      userPrompt: prompt,
      maxOutputTokens: Math.max(24, words * 8)
    });

    const validation = validateAnswer(answer, attempt);
    if (validation.ok) {
      return validation.answer;
    }
    lastFailure = validation.reason;
  }

  throw new Error(`Could not generate a valid direct answer after ${maxAttempts} attempts (${lastFailure}).`);
}

type EmbeddingPayload = {
  data?: Array<{ embedding?: number[] }>;
};

export async function embedTexts(input: string[]) {
  if (input.length === 0) return [];
  const payload = (await openAiFetch("/v1/embeddings", {
    method: "POST",
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input
    })
  })) as EmbeddingPayload;

  return (payload.data ?? []).map((row) => row.embedding ?? []);
}
