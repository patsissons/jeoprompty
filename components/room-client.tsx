"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Loader2, RefreshCcw, Rocket, Timer, Users, Wifi } from "lucide-react";

import { Leaderboard } from "@/components/leaderboard";
import { RoundResults } from "@/components/round-results";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { MAX_PROMPT_SECONDS } from "@/lib/game/constants";
import {
  LEXICAL_SCORE_WEIGHT,
  SEMANTIC_SCORE_WEIGHT
} from "@/lib/game/scoring";
import type { Participant, ScoreApiResponse, ScoredSubmission } from "@/lib/game/types";
import { setRoomCodeCookie } from "@/lib/room-code-cookie";
import { useRoomConnection } from "@/lib/use-room-connection";
import { cn, formatSeconds } from "@/lib/utils";

function getOrCreateTabSessionId() {
  const key = "jeoprompty.sessionId";
  const storage = window.sessionStorage;
  const existing = storage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  storage.setItem(key, created);
  return created;
}

function statusTone(status: string) {
  if (status === "open") return "success";
  if (status === "connecting") return "warning";
  if (status === "error") return "destructive";
  return "default";
}

function phaseLabel(phase: string) {
  switch (phase) {
    case "prompting":
      return "Prompting";
    case "resolving":
      return "Resolving";
    case "round_complete":
      return "Round Complete";
    case "game_complete":
      return "Game Complete";
    default:
      return "Lobby";
  }
}

function statusTextForPlayer(player?: Participant | null) {
  if (!player) return "Connecting...";
  switch (player.roundStatus) {
    case "entering_prompt":
      return "Entering prompt";
    case "waiting_for_others":
      return "Waiting for other players";
    case "round_complete":
      return "Round complete";
    case "offline":
      return "Offline";
    default:
      return "In lobby";
  }
}

const NICKNAME_TAKEN_ERROR = "That nickname is already taken.";

export function RoomClient({
  roomCode,
  watchMode,
  initialNickname
}: {
  roomCode: string;
  watchMode: boolean;
  initialNickname?: string;
}) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [nickname, setNickname] = useState(initialNickname?.slice(0, 24) ?? "");
  const [draftPrompt, setDraftPrompt] = useState("");
  const [topicDraft, setTopicDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [pendingSubmittedRoundId, setPendingSubmittedRoundId] = useState<string | null>(null);
  const [labTarget, setLabTarget] = useState<string | null>(null);
  const [labTargetError, setLabTargetError] = useState<string | null>(null);
  const [labTargetLoading, setLabTargetLoading] = useState(false);
  const [labRunResult, setLabRunResult] = useState<ScoredSubmission | null>(null);
  const [labRunError, setLabRunError] = useState<string | null>(null);
  const [labRunLoading, setLabRunLoading] = useState(false);
  const [labUsedTargets, setLabUsedTargets] = useState<string[]>([]);
  const [startGameLoading, setStartGameLoading] = useState(false);

  useEffect(() => {
    setSessionId(getOrCreateTabSessionId());
    const savedNick = localStorage.getItem("jeoprompty.nickname");
    if (!initialNickname && savedNick) {
      setNickname(savedNick);
    }
  }, [initialNickname]);

  useEffect(() => {
    if (nickname.trim()) localStorage.setItem("jeoprompty.nickname", nickname.trim());
  }, [nickname]);

  useEffect(() => {
    setRoomCodeCookie(roomCode);
  }, [roomCode]);

  const role = watchMode ? "guest" : "player";
  const canJoin = Boolean(sessionId && nickname.trim());
  const room = useRoomConnection({
    roomCode,
    nickname: nickname.trim() || (watchMode ? "Guest Screen" : "Player"),
    role,
    sessionId: sessionId ?? "pending",
    enabled: canJoin
  });

  const state = room.state;
  const currentRoundId = state?.currentRoundId ?? null;
  const participants = state?.participants ?? [];
  const players = participants.filter((participant) => participant.role === "player");

  const me = useMemo(
    () => state?.participants.find((participant) => participant.sessionId === sessionId) ?? null,
    [state?.participants, sessionId]
  );
  const isHost = Boolean(me && state?.hostSessionId === me.sessionId);
  const canHostResetToLobby = isHost && !watchMode && (state?.phase ?? "lobby") !== "lobby";
  const submittedThisRound =
    Boolean(me?.submittedPrompt) ||
    (state?.phase === "prompting" && Boolean(currentRoundId) && pendingSubmittedRoundId === currentRoundId);

  const secondsRemaining = room.currentRoundSecondsRemaining;

  const progressPct = useMemo(() => {
    if (state?.phase !== "prompting") return 0;
    const msRemaining = room.currentRoundMsRemaining;
    return (msRemaining / (MAX_PROMPT_SECONDS * 1000)) * 100;
  }, [room.currentRoundMsRemaining, state?.phase]);

  const connectedPlayers = players.filter((player) => player.connected).length;
  const playerCount = players.length;
  const submittedCount = state?.submissions.length ?? 0;
  const resolverName =
    participants.find((participant) => participant.sessionId === state?.resolverSessionId)?.nickname ??
    null;

  const missingJoinInfo = !nickname.trim() || !sessionId;

  useEffect(() => {
    // Reset the local draft when a new round starts (or game resets).
    setDraftPrompt("");
    setPendingSubmittedRoundId(null);
  }, [currentRoundId]);

  useEffect(() => {
    if ((state?.phase ?? "lobby") !== "lobby") {
      setStartGameLoading(false);
      setLabTarget(null);
      setLabTargetError(null);
      setLabTargetLoading(false);
      setLabRunResult(null);
      setLabRunError(null);
      setLabRunLoading(false);
      setLabUsedTargets([]);
    }
  }, [state?.phase]);

  useEffect(() => {
    if (room.lastError) {
      setStartGameLoading(false);
    }
  }, [room.lastError]);

  useEffect(() => {
    if (me?.submittedPrompt) {
      setPendingSubmittedRoundId(currentRoundId);
    }
  }, [currentRoundId, me?.submittedPrompt]);

  useEffect(() => {
    setTopicDraft(state?.gameTopic ?? "");
  }, [state?.gameTopic]);

  useEffect(() => {
    const activeTopic = state?.gameTopic?.trim();
    document.title = activeTopic
      ? `Jeoprompty! - ${activeTopic}`
      : `Jeoprompty! Room ${roomCode.toUpperCase()}`;

    return () => {
      document.title = "Jeoprompty!";
    };
  }, [roomCode, state?.gameTopic]);

  useEffect(() => {
    if (room.lastError !== NICKNAME_TAKEN_ERROR) return;

    const params = new URLSearchParams({
      room: roomCode.toUpperCase(),
      nick: nickname.trim(),
      joinError: "nickname_taken"
    });

    router.replace(`/?${params.toString()}`);
  }, [nickname, room.lastError, roomCode, router]);

  function handleCopyGuestUrl() {
    const absolute = `${window.location.origin}/room/${roomCode.toLowerCase()}?watch=1`;
    navigator.clipboard.writeText(absolute).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  function handleSubmitPrompt() {
    if (!draftPrompt.trim()) return;
    if (state?.phase !== "prompting" || submittedThisRound) return;
    setPendingSubmittedRoundId(currentRoundId);
    room.submitPrompt(draftPrompt.trim().slice(0, 256));
  }

  async function handlePreviewPrompt() {
    if (!draftPrompt.trim()) return;
    if ((state?.phase ?? "lobby") !== "lobby") return;
    if (!labTarget?.trim()) {
      setLabRunResult(null);
      setLabRunError("Generate a Prompt Lab target first.");
      return;
    }

    setLabRunLoading(true);
    setLabRunError(null);

    try {
      const response = await fetch("/api/game/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundId: `prompt-lab-${crypto.randomUUID()}`,
          target: labTarget.trim(),
          submissions: [
            {
              playerId: sessionId ?? "prompt-lab",
              prompt: draftPrompt.trim().slice(0, 256)
            }
          ]
        })
      });

      const payload = (await response.json()) as ScoreApiResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || `API error ${response.status}`);
      }

      const result = payload.results[0];
      if (!result) {
        throw new Error("Scorer returned no result.");
      }
      setLabRunResult(result);
    } catch (error) {
      setLabRunResult(null);
      setLabRunError(error instanceof Error ? error.message : "Prompt Lab run failed");
    } finally {
      setLabRunLoading(false);
    }
  }

  async function handleGeneratePromptLabTarget() {
    if ((state?.phase ?? "lobby") !== "lobby") return;

    setLabTargetLoading(true);
    setLabTargetError(null);
    setLabRunResult(null);
    setLabRunError(null);

    try {
      const response = await fetch("/api/game/concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: state?.gameTopic?.trim() || topicDraft.trim() || "expect the unexpected",
          usedTargets: Array.from(
            new Set([
              ...(state?.roundHistory.map((round) => round.target) ?? []),
              ...labUsedTargets,
              ...(labTarget ? [labTarget] : [])
            ])
          )
        })
      });

      const payload = (await response.json()) as { concept?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || `API error ${response.status}`);
      }

      const nextTarget = payload.concept?.trim();
      if (!nextTarget) {
        throw new Error("Concept API returned empty target.");
      }

      setLabTarget(nextTarget);
      setLabUsedTargets((previous) => Array.from(new Set([...previous, nextTarget])));
    } catch (error) {
      setLabTargetError(error instanceof Error ? error.message : "Prompt Lab target generation failed");
    } finally {
      setLabTargetLoading(false);
    }
  }

  useEffect(() => {
    if (watchMode) return;
    if ((state?.phase ?? "lobby") !== "lobby") return;
    if (labTarget || labTargetLoading) return;
    void handleGeneratePromptLabTarget();
  }, [watchMode, state?.phase, state?.createdAt, state?.roundIndex, labTarget, labTargetLoading]);

  function handleTopicDraftChange(value: string) {
    const next = value.slice(0, 80);
    setTopicDraft(next);
    room.setTopic(next);
  }

  function handleResetToLobby() {
    if (!canHostResetToLobby) return;
    const message =
      state?.phase === "game_complete"
        ? "Start a new game and send everyone back to the lobby?"
        : "End the current game and send everyone back to the lobby?";
    if (!window.confirm(message)) return;
    room.resetGame();
  }

  function handleStartGame() {
    if ((state?.phase ?? "lobby") !== "lobby") return;
    if (startGameLoading) return;
    setStartGameLoading(true);
    room.startGame();
  }

  if (missingJoinInfo) {
    return (
      <main className="mx-auto min-h-screen max-w-xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Enter a nickname</CardTitle>
            <CardDescription>
              Your room is ready at <code>/room/{roomCode.toLowerCase()}</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="James Bond"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              maxLength={24}
            />
            <Button onClick={() => setSessionId(getOrCreateTabSessionId())} disabled={!nickname.trim()}>
              Continue
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto grid max-w-7xl gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <Card className="border-white/15">
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-xl sm:text-2xl">
                      Room {roomCode.toUpperCase()}
                    </CardTitle>
                    <Badge variant={watchMode ? "secondary" : "default"}>
                      {watchMode ? "Guest" : isHost ? "👑 Player" : "Player"}
                    </Badge>
                  </div>
                  <CardDescription className="mt-1">
                    {watchMode ? "Spectator board" : `Playing as ${nickname.trim()}`}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusTone(room.connectionStatus) as any} className="gap-1">
                    <Wifi className="h-3 w-3" />
                    {room.connectionStatus}
                  </Badge>
                  {canHostResetToLobby ? (
                    <Button variant="destructive" size="sm" onClick={handleResetToLobby} className="gap-2">
                      <RefreshCcw className="h-3.5 w-3.5" />
                      Reset to Lobby
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" onClick={handleCopyGuestUrl} className="gap-2">
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? "Copied" : "Guest URL"}
                  </Button>
                  <Link href="/">
                    <Button variant="ghost" size="sm">
                      Exit
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Phase</div>
                  <div className="mt-1 text-lg font-semibold">{phaseLabel(state?.phase ?? "lobby")}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Round</div>
                  <div className="mt-1 text-lg font-semibold">
                    {state?.roundIndex ?? 0}/{state?.totalRounds ?? 10}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Players</div>
                  <div className="mt-1 flex items-center gap-2 text-lg font-semibold">
                    <Users className="h-4 w-4 text-cyan-200" />
                    {connectedPlayers}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Timer</div>
                  <div className="mt-1 flex items-center gap-2 font-mono text-lg font-semibold">
                    <Timer className="h-4 w-4 text-orange-200" />
                    {formatSeconds(secondsRemaining)}
                  </div>
                </div>
              </div>

              {state?.phase === "prompting" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Prompt round countdown</span>
                    <span>{secondsRemaining}s</span>
                  </div>
                  <Progress value={progressPct} />
                </div>
              ) : null}

              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-300/10 via-white/0 to-orange-300/10 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Current Target
                </div>
                <div className="mt-2 text-xl font-semibold sm:text-2xl">
                  {state?.currentTarget ?? "Waiting for game start"}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Round text shown to all players. Write a question that forces a concise answer. 
                </p>
              </div>

              <RoundResults
                results={state?.lastRoundResults ?? null}
                participants={state?.participants ?? []}
                className="border-cyan-300/20 bg-cyan-300/5"
              />

              {!watchMode ? (
                <PlayerPanel
                  canStart={(state?.phase ?? "lobby") === "lobby"}
                  onStart={handleStartGame}
                  startLoading={startGameLoading}
                  onReset={handleResetToLobby}
                  canReset={isHost}
                  canEditTopic={isHost && (state?.phase ?? "lobby") === "lobby"}
                  topicDraft={topicDraft}
                  setTopicDraft={handleTopicDraftChange}
                  onSubmit={handleSubmitPrompt}
                  onPreview={handlePreviewPrompt}
                  draftPrompt={draftPrompt}
                  setDraftPrompt={setDraftPrompt}
                  statePhase={state?.phase ?? "lobby"}
                  myStatus={statusTextForPlayer(me)}
                  submitted={submittedThisRound}
                  submittedCount={submittedCount}
                  playerCount={playerCount}
                  labTarget={labTarget}
                  labTargetError={labTargetError}
                  labTargetLoading={labTargetLoading}
                  onGenerateLabTarget={handleGeneratePromptLabTarget}
                  labRunResult={labRunResult}
                  labRunError={labRunError}
                  labRunLoading={labRunLoading}
                />
              ) : (
                <GuestBoard
                  statePhase={state?.phase ?? "lobby"}
                  playerCount={playerCount}
                  submittedCount={submittedCount}
                  resolverName={resolverName}
                />
              )}

              {room.lastError ? (
                <div className="rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-100">
                  {room.lastError}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Leaderboard
            participants={state?.participants ?? []}
            hostSessionId={state?.hostSessionId}
            highlightSessionId={watchMode ? undefined : sessionId ?? undefined}
            title={watchMode ? "Live Leaderboard" : "Room Leaderboard"}
            topic={state?.gameTopic ?? null}
          />

          {watchMode ? (
            <Card className="border-white/10">
              <CardHeader>
                <CardTitle className="text-lg">Submission Tracker</CardTitle>
                <CardDescription>
                  Useful on a TV/projector while players submit from phones.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {players.map((player) => (
                    <div
                      key={player.sessionId}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <span className="truncate text-sm">
                        {player.sessionId === state?.hostSessionId ? (
                          <span className="mr-1" role="img" aria-label="Host">
                            👑
                          </span>
                        ) : null}
                        {player.nickname}
                      </span>
                      <Badge variant={player.submittedPrompt ? "success" : "warning"}>
                        {player.submittedPrompt ? "Submitted" : "Pending"}
                      </Badge>
                    </div>
                  ))}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-white/10">
              <CardHeader>
                <CardTitle className="text-lg">How Scoring Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>1. Direct match to the target gets max points.</p>
                <p>2. Otherwise semantic similarity + algorithmic closeness are combined.</p>
                <p>3. Cheating prompts (target leakage / spelling hints) are rejected.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}

function PlayerPanel({
  canStart,
  onStart,
  startLoading,
  onReset,
  canReset,
  canEditTopic,
  topicDraft,
  setTopicDraft,
  onSubmit,
  onPreview,
  draftPrompt,
  setDraftPrompt,
  statePhase,
  myStatus,
  submitted,
  submittedCount,
  playerCount,
  labTarget,
  labTargetError,
  labTargetLoading,
  onGenerateLabTarget,
  labRunResult,
  labRunError,
  labRunLoading
}: {
  canStart: boolean;
  onStart: () => void;
  startLoading: boolean;
  onReset: () => void;
  canReset: boolean;
  canEditTopic: boolean;
  topicDraft: string;
  setTopicDraft: (value: string) => void;
  onSubmit: () => void;
  onPreview: () => void;
  draftPrompt: string;
  setDraftPrompt: (value: string) => void;
  statePhase: string;
  myStatus: string;
  submitted: boolean;
  submittedCount: number;
  playerCount: number;
  labTarget: string | null;
  labTargetError: string | null;
  labTargetLoading: boolean;
  onGenerateLabTarget: () => void;
  labRunResult: ScoredSubmission | null;
  labRunError: string | null;
  labRunLoading: boolean;
}) {
  const inLobby = statePhase === "lobby";
  const canEditPrompt = inLobby || (statePhase === "prompting" && !submitted);
  const labTargetWordCount = labTarget?.trim() ? labTarget.trim().split(/\s+/).length : 0;
  const weightedScore =
    labRunResult && !labRunResult.rejected && !labRunResult.exactMatch
      ? Math.round(
          (labRunResult.semanticScore * SEMANTIC_SCORE_WEIGHT +
            labRunResult.lexicalScore * LEXICAL_SCORE_WEIGHT) *
            100
        )
      : null;

  return (
    <Card className="border-white/10">
      <CardHeader>
        <CardTitle className="text-lg">Player Console</CardTitle>
        <CardDescription>{myStatus}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {statePhase === "lobby" && canEditTopic ? (
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Game topic (locks at start)
            </label>
            <Input
              value={topicDraft}
              onChange={(event) => setTopicDraft(event.target.value)}
              placeholder="Topic for this game"
              maxLength={80}
            />
            <p className="text-xs text-muted-foreground">
              All round targets will be chosen to match this topic when possible.
            </p>
          </div>
        ) : null}

        {statePhase === "lobby" ? (
          <div className="flex flex-wrap gap-3">
            <Button onClick={onStart} disabled={!canStart || startLoading} className="gap-2">
              {startLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              {startLoading ? "Starting..." : "Start Game"}
            </Button>
          </div>
        ) : null}

        {statePhase === "game_complete" && canReset ? (
          <div className="flex flex-wrap gap-3">
            <Button onClick={onReset} variant="secondary" className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              New Game
            </Button>
          </div>
        ) : null}

        {inLobby ? (
          <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">Prompt Lab</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Test prompts against a generated target and inspect the real score breakdown.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{labTargetWordCount || "?"} target words</Badge>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onGenerateLabTarget}
                  disabled={labTargetLoading}
                  className="gap-2"
                >
                  {labTargetLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                  New Target
                </Button>
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
              {labTargetLoading && !labTarget ? (
                <div className="flex items-center gap-2 text-sm text-cyan-100">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating target...
                </div>
              ) : labTargetError && !labTarget ? (
                <p className="text-sm text-rose-200">{labTargetError}</p>
              ) : labTarget ? (
                <>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-100/70">
                    Prompt Lab target
                  </div>
                  <div className="mt-1 text-base font-semibold text-cyan-50">{labTarget}</div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Generate a target, enter a question prompt below, then click Test Prompt.
                </p>
              )}
            </div>
            {labTargetError && labTarget ? (
              <p className="mt-2 text-xs text-rose-200">
                Target refresh failed: {labTargetError}
              </p>
            ) : null}
            <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
              {labRunLoading ? (
                <div className="flex items-center gap-2 text-sm text-cyan-100">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running scorer...
                </div>
              ) : labRunError ? (
                <p className="text-sm text-rose-200">{labRunError}</p>
              ) : labRunResult ? (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-100/70">
                        Generated answer
                      </div>
                      <div className="mt-1 text-base font-semibold text-cyan-50">
                        {labRunResult.answer}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-lg font-semibold">{labRunResult.scoreDelta}</div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        points
                      </div>
                    </div>
                  </div>
                  {labRunResult.rejected ? (
                    <p className="text-xs text-rose-200">
                      Rejected: {labRunResult.rejectionReason ?? "Prompt violates prompt rules."}
                    </p>
                  ) : (
                    <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <div className="rounded-md border border-white/10 bg-black/10 p-2">
                        Exact match: {labRunResult.exactMatch ? "yes (100 points override)" : "no"}
                      </div>
                      <div className="rounded-md border border-white/10 bg-black/10 p-2">
                        Semantic: {(labRunResult.semanticScore * 100).toFixed(1)}% (
                        {labRunResult.semanticScore.toFixed(3)})
                      </div>
                      <div className="rounded-md border border-white/10 bg-black/10 p-2">
                        Lexical: {(labRunResult.lexicalScore * 100).toFixed(1)}% (
                        {labRunResult.lexicalScore.toFixed(3)})
                      </div>
                      <div className="rounded-md border border-white/10 bg-black/10 p-2">
                        Blend: 70% semantic + 30% lexical
                      </div>
                      {!labRunResult.exactMatch ? (
                        <div className="rounded-md border border-white/10 bg-black/10 p-2 sm:col-span-2">
                          Math: round(((0.7 x {labRunResult.semanticScore.toFixed(3)}) + (0.3 x{" "}
                          {labRunResult.lexicalScore.toFixed(3)})) x 100) = {weightedScore}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Run a prompt to see the answer, final score, and scoring components.
                </p>
              )}
            </div>
          </div>
        ) : null}

        <div className={cn("space-y-2", !canEditPrompt && "opacity-80")}>
          <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {inLobby ? "Practice question prompt (max 256 chars)" : "Your question prompt (max 256 chars)"}
          </label>
          <textarea
            className="min-h-28 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none ring-0 placeholder:text-muted-foreground focus:border-cyan-300/40"
            placeholder="What famous structure can be seen from space (according to a common myth)?"
            value={draftPrompt}
            onChange={(event) => setDraftPrompt(event.target.value.slice(0, 256))}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
              event.preventDefault();
              if (inLobby && draftPrompt.trim()) {
                onPreview();
                return;
              }
              if (canEditPrompt && draftPrompt.trim()) {
                onSubmit();
              }
            }}
            disabled={!canEditPrompt}
            maxLength={256}
          />
          {inLobby ? (
            <>
              <div className="flex justify-end">
                <Button
                  onClick={onPreview}
                  disabled={!draftPrompt.trim() || labRunLoading || !labTarget}
                  className="gap-2"
                >
                  {labRunLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Test Prompt
                </Button>
              </div>
              <div className="flex items-center justify-end text-xs text-muted-foreground">
                <span>{draftPrompt.length}/256</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {submittedCount}/{playerCount} submitted
                </span>
                <span>{draftPrompt.length}/256</span>
              </div>
              <Button onClick={onSubmit} disabled={!canEditPrompt || !draftPrompt.trim()}>
                {submitted ? "Submitted" : "Submit Prompt"}
              </Button>
            </>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-muted-foreground">
          Prompt rules: must be a question, max 256 chars, no target leakage, no spelling hints.
        </div>
      </CardContent>
    </Card>
  );
}

function GuestBoard({
  statePhase,
  playerCount,
  submittedCount,
  resolverName
}: {
  statePhase: string;
  playerCount: number;
  submittedCount: number;
  resolverName: string | null;
}) {
  return (
    <Card className="border-white/10">
      <CardHeader>
        <CardTitle className="text-lg">Guest Display</CardTitle>
        <CardDescription>
          Big-screen mode for watching the leaderboard and room progress.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Phase</div>
          <div className="mt-2 text-2xl font-semibold">{phaseLabel(statePhase)}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Prompts In</div>
          <div className="mt-2 text-2xl font-semibold">
            {submittedCount}/{playerCount}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:col-span-2">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Resolver</div>
          <div className="mt-2 text-base text-muted-foreground">
            {statePhase === "resolving"
              ? resolverName
                ? `${resolverName} is calling the scorer API`
                : "Waiting for a resolver client"
              : "Resolver is chosen automatically during scoring"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
