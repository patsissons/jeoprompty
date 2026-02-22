import { CheckCircle2, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Participant, ScoredSubmission } from "@/lib/game/types";

function findName(participants: Participant[], playerId: string) {
  return participants.find((p) => p.sessionId === playerId)?.nickname ?? "Unknown";
}

export function RoundResults({
  results,
  participants
}: {
  results: ScoredSubmission[] | null;
  participants: Participant[];
}) {
  if (!results) return null;
  return (
    <Card className="border-white/10">
      <CardHeader>
        <CardTitle className="text-lg">Round Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground">No prompts submitted this round.</p>
        ) : (
          results
            .slice()
            .sort((a, b) => b.scoreDelta - a.scoreDelta)
            .map((result) => (
              <div key={result.playerId} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{findName(participants, result.playerId)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">“{result.prompt}”</p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg font-semibold">{result.scoreDelta}</div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      points
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {result.rejected ? (
                    <Badge variant="destructive" className="gap-1">
                      <ShieldAlert className="h-3 w-3" />
                      {result.rejectionReason ?? "Rejected"}
                    </Badge>
                  ) : (
                    <>
                      <Badge variant={result.exactMatch ? "success" : "secondary"} className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {result.answer}
                      </Badge>
                      <Badge variant="default">
                        semantic {(result.semanticScore * 100).toFixed(0)}%
                      </Badge>
                      <Badge variant="default">
                        lexical {(result.lexicalScore * 100).toFixed(0)}%
                      </Badge>
                      {result.hallucinationPenalty > 0 ? (
                        <Badge variant="warning">-{result.hallucinationPenalty} long-answer penalty</Badge>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            ))
        )}
      </CardContent>
    </Card>
  );
}
