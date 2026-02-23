export const MAX_TEXT_LENGTH = 256;
export const MAX_PROMPT_SECONDS = 60;
export const TOTAL_ROUNDS = 10;
export const MAX_PLAYERS = 12;
export const INTERMISSION_SECONDS = 8;
export const MODEL_NAME = process.env.OPENAI_MODEL?.trim() || "gpt-5-nano";
export const EMBEDDING_MODEL = "text-embedding-3-small";
