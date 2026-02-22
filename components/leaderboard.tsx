import { Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Participant } from "@/lib/game/types";

function statusVariant(status: Participant["roundStatus"]) {
  switch (status) {
    case "entering_prompt":
      return "warning" as const;
    case "waiting_for_others":
      return "secondary" as const;
    case "round_complete":
      return "success" as const;
    case "offline":
      return "destructive" as const;
    default:
      return "default" as const;
  }
}

function statusLabel(status: Participant["roundStatus"]) {
  switch (status) {
    case "entering_prompt":
      return "Entering prompt";
    case "waiting_for_others":
      return "Waiting";
    case "round_complete":
      return "Round complete";
    case "offline":
      return "Offline";
    default:
      return "Lobby";
  }
}

export function Leaderboard({
  participants,
  highlightSessionId,
  title = "Leaderboard",
  topic
}: {
  participants: Participant[];
  highlightSessionId?: string;
  title?: string;
  topic?: string | null;
}) {
  const players = participants
    .filter((p) => p.role === "player")
    .sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt);

  return (
    <Card className="border-white/10">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-orange-300" />
          {title}
        </CardTitle>
        <Badge variant="default">{players.length} players</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {topic ? (
          <div className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-100/80">
              Game Topic
            </div>
            <div className="mt-1 text-sm font-semibold text-cyan-50">{topic}</div>
          </div>
        ) : null}
        {players.length === 0 ? (
          <p className="text-sm text-muted-foreground">No players yet.</p>
        ) : (
          players.map((player, index) => (
            <div
              key={player.sessionId}
              className={[
                "grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border p-3",
                highlightSessionId === player.sessionId
                  ? "border-cyan-300/30 bg-cyan-400/5"
                  : "border-white/10 bg-white/5"
              ].join(" ")}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                {index + 1}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{player.nickname}</div>
                <div className="mt-1">
                  <Badge variant={statusVariant(player.roundStatus)}>
                    {statusLabel(player.roundStatus)}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-lg font-semibold">{player.score}</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  points
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
