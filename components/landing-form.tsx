"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Tv2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { normalizeRoomCodeCookie, setRoomCodeCookie } from "@/lib/room-code-cookie";
import { safeUpperRoomCode } from "@/lib/utils";

function generateRandomRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join(
    ""
  );
}

export function LandingForm({ initialRoomCode }: { initialRoomCode?: string }) {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState(
    () => normalizeRoomCodeCookie(initialRoomCode) || generateRandomRoomCode()
  );

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

  return (
    <Card className="relative h-full overflow-hidden border-white/15 shadow-spotlight">
      <div className="pointer-events-none absolute inset-0 noise-grid opacity-40" />
      <CardHeader className="relative">
        <CardTitle className="text-2xl font-bold tracking-tight">Enter The Room</CardTitle>
        <CardDescription>
          One room, ten rounds, one question per round. Beat the model with precision.
        </CardDescription>
      </CardHeader>
      <CardContent className="relative space-y-4">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Nickname
          </label>
          <Input
            maxLength={24}
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="Ada, Neo, QuizBoss..."
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
              Randomize
            </button>
          </div>
          <Input
            maxLength={8}
            value={cleanedCode}
            onChange={(event) => setRoomCode(event.target.value)}
            placeholder="ASDF"
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
