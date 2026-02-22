import "server-only";

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

export async function generateConciseAnswer(prompt: string) {
  const payload = await openAiFetch("/v1/responses", {
    method: "POST",
    body: JSON.stringify({
      model: MODEL_NAME,
      temperature: 0.1,
      max_output_tokens: 64,
      input: [
        {
          role: "system",
          content:
            "Answer with only the final answer text. Keep it concise and specific. Prefer 1-8 words. Never exceed 256 characters."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  const answer = extractOutputText(payload as OpenAIResponsePayload);
  if (!answer) {
    throw new Error("OpenAI returned an empty answer.");
  }
  return answer.slice(0, 256);
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
