export const MAX_TEXT_LENGTH = 256;
export const MAX_PROMPT_SECONDS = 60;
export const TOTAL_ROUNDS = 5;
export const MAX_PLAYERS = 12;
export const INTERMISSION_SECONDS = 15;

// Read lazily: on Cloudflare Workers, process.env is populated per request.
export function getModelName() {
  return process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-5-nano";
}

export function getEmbeddingModel() {
  return (
    process.env.OPENROUTER_EMBEDDING_MODEL?.trim() ||
    "openai/text-embedding-3-small"
  );
}
