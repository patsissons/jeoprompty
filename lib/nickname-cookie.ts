export const NICKNAME_COOKIE = "jeoprompty_nickname";

const MAX_NICKNAME_LENGTH = 24;

export function normalizeNicknameCookie(value: string | undefined | null) {
  if (!value) return "";
  return value.trim().slice(0, MAX_NICKNAME_LENGTH);
}

export function setNicknameCookie(nickname: string) {
  if (typeof document === "undefined") return;
  const normalized = normalizeNicknameCookie(nickname);
  if (!normalized) return;
  document.cookie = `${NICKNAME_COOKIE}=${encodeURIComponent(
    normalized
  )}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}
