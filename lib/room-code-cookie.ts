import { safeUpperRoomCode } from "@/lib/utils";

export const ROOM_CODE_COOKIE = "jeoprompty_room_code";

export function normalizeRoomCodeCookie(value: string | undefined | null) {
  if (!value) return "";
  return safeUpperRoomCode(value).slice(0, 8);
}

export function setRoomCodeCookie(roomCode: string) {
  if (typeof document === "undefined") return;
  const normalized = normalizeRoomCodeCookie(roomCode);
  if (!normalized) return;
  document.cookie = `${ROOM_CODE_COOKIE}=${encodeURIComponent(
    normalized,
  )}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}
