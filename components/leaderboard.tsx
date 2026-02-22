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
  hostSessionId,
  highlightSessionId,
  title = "Leaderboard",
  topic
}: {
  participants: Participant[];
  hostSessionId?: string | null;
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
                "flex flex-wrap items-center gap-3 rounded-xl border p-3 sm:flex-nowrap",
                highlightSessionId === player.sessionId
                  ? "border-cyan-300/30 bg-cyan-400/5"
                  : "border-white/10 bg-white/5"
              ].join(" ")}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                {index + 1}
              </div>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 sm:flex-nowrap">
                <div className="min-w-0 truncate text-sm font-medium">
                  {player.sessionId === hostSessionId ? (
                    <span className="mr-1" role="img" aria-label="Host">
                      👑
                    </span>
                  ) : null}
                  {player.nickname}
                </div>
                <div className="shrink-0">
                  <Badge variant={statusVariant(player.roundStatus)}>
                    {statusLabel(player.roundStatus)}
                  </Badge>
                </div>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-2 text-right">
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
