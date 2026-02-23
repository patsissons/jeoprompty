"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, RotateCcw, Tv2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NICKNAME_COOKIE, setNicknameCookie } from "@/lib/nickname-cookie";
import { normalizeRoomCodeCookie, ROOM_CODE_COOKIE, setRoomCodeCookie } from "@/lib/room-code-cookie";
import { safeUpperRoomCode } from "@/lib/utils";

function generateRandomRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join(
    ""
  );
}

export function LandingForm({
  initialRoomCode,
  initialNickname,
  initialJoinError
}: {
  initialRoomCode?: string;
  initialNickname?: string;
  initialJoinError?: string;
}) {
  const router = useRouter();
  const [nickname, setNickname] = useState(() => (initialNickname ?? "").slice(0, 24));
  const [joinError, setJoinError] = useState(initialJoinError ?? "");
  const [roomCode, setRoomCode] = useState(
    () => normalizeRoomCodeCookie(initialRoomCode) || generateRandomRoomCode()
  );
  const [resettingLocalData, setResettingLocalData] = useState(false);

  useEffect(() => {
    if (!nickname.trim()) return;
    setNicknameCookie(nickname);
  }, [nickname]);

  const cleanedCode = useMemo(() => safeUpperRoomCode(roomCode), [roomCode]);
  const canJoin = nickname.trim().length > 0 && cleanedCode.length >= 4;

  function handleJoin(mode: "player" | "guest") {
    if (!canJoin) return;
    const code = cleanedCode.toLowerCase();
    setRoomCodeCookie(cleanedCode);
    const params = new URLSearchParams({ nick: nickname.trim() });
    if (mode === "guest") {
      params.set("watch", "1");
    }
    router.push(`/room/${code}?${params.toString()}`);
  }

  function generateRoomCode() {
    setRoomCode(generateRandomRoomCode());
  }

  function clearCookie(name: string) {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
    document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  }

  function handleResetAppData() {
    if (resettingLocalData) return;
    const confirmed = window.confirm(
      "Reset all local Jeoprompty app data on this device and reload?"
    );
    if (!confirmed) return;

    setResettingLocalData(true);

    try {
      const localKeys = Object.keys(window.localStorage);
      for (const key of localKeys) {
        if (key.startsWith("jeoprompty")) {
          window.localStorage.removeItem(key);
        }
      }
    } catch {
      // Ignore storage access errors and continue clearing what we can.
    }

    try {
      const sessionKeys = Object.keys(window.sessionStorage);
      for (const key of sessionKeys) {
        if (key.startsWith("jeoprompty")) {
          window.sessionStorage.removeItem(key);
        }
      }
    } catch {
      // Ignore storage access errors and continue clearing what we can.
    }

    clearCookie(NICKNAME_COOKIE);
    clearCookie(ROOM_CODE_COOKIE);

    const cookieNames = document.cookie
      .split(";")
      .map((entry) => entry.trim().split("=")[0])
      .filter((name) => name.startsWith("jeoprompty_"));
    for (const name of cookieNames) {
      clearCookie(name);
    }

    window.location.replace("/");
  }

  return (
    <Card className="relative h-full overflow-hidden border-white/15 shadow-spotlight">
      <div className="pointer-events-none absolute inset-0 noise-grid opacity-40" />
      <CardHeader className="relative pr-32 sm:pr-40">
        <div className="absolute right-0 top-0 p-5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetAppData}
            disabled={resettingLocalData}
            className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            title="Clear local app data and reload"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {resettingLocalData ? "Resetting..." : "Reset App Data"}
          </Button>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Enter The Room</CardTitle>
        <CardDescription>
          One room, ten rounds, one question per round. Beat the model with precision.
        </CardDescription>
      </CardHeader>
      <CardContent className="relative space-y-4">
        {joinError ? (
          <div className="rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-100">
            {joinError}
          </div>
        ) : null}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Nickname
          </label>
          <Input
            maxLength={24}
            value={nickname}
            onChange={(event) => {
              setNickname(event.target.value);
              if (joinError) setJoinError("");
            }}
            placeholder="James Bond"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Room Code
            </label>
            <button
              type="button"
              onClick={generateRoomCode}
              className="text-xs font-medium text-cyan-200 hover:text-cyan-100"
            >
              Randomize code
            </button>
          </div>
          <Input
            maxLength={8}
            value={cleanedCode}
            onChange={(event) => setRoomCode(event.target.value)}
            placeholder="ABCD"
            className="text-center font-mono tracking-[0.25em]"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button
            size="lg"
            onClick={() => handleJoin("player")}
            disabled={!canJoin}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            Join as Player
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => handleJoin("guest")}
            disabled={!canJoin}
            className="gap-2"
          >
            <Tv2 className="h-4 w-4" />
            Join as Guest
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Guests use the same room, but only see the leaderboard and round status board.
        </p>
      </CardContent>
    </Card>
  );
}
