import {
  INTERMISSION_SECONDS,
  MAX_PLAYERS,
  MAX_PROMPT_SECONDS,
  TOTAL_ROUNDS
} from "./constants";
import { pickConcept } from "./concepts";
import type {
  Participant,
  RoomState,
  Role,
  RoundSubmission,
  ScoredSubmission
} from "./types";

function now() {
  return Date.now();
}

function newRoundId() {
  return crypto.randomUUID();
}

export function createInitialRoomState(roomCode: string): RoomState {
  const createdAt = now();
  return {
    roomCode,
    phase: "lobby",
    roundIndex: 0,
    totalRounds: TOTAL_ROUNDS,
    maxPlayers: MAX_PLAYERS,
    createdAt,
    updatedAt: createdAt,
    phaseEndsAt: null,
    roundStartedAt: null,
    hostSessionId: null,
    resolverSessionId: null,
    participants: [],
    currentTarget: null,
    currentRoundId: null,
    submissions: [],
    lastRoundResults: null,
    roundHistory: []
  };
}

export function upsertParticipant(
  state: RoomState,
  input: { sessionId: string; connectionId: string; nickname: string; role: Role }
) {
  const existing = state.participants.find((p) => p.sessionId === input.sessionId);
  if (existing) {
    existing.connectionId = input.connectionId;
    existing.nickname = input.nickname.slice(0, 24);
    existing.role = input.role;
    existing.connected = true;
    existing.roundStatus = deriveRoundStatusForParticipant(state, existing);
  } else {
    const participant: Participant = {
      sessionId: input.sessionId,
      connectionId: input.connectionId,
      nickname: input.nickname.slice(0, 24),
      role: input.role,
      connected: true,
      joinedAt: now(),
      score: 0,
      roundStatus: state.phase === "lobby" ? "in_lobby" : "entering_prompt",
      submittedPrompt: false
    };
    state.participants.push(participant);
    if (!state.hostSessionId && participant.role === "player") {
      state.hostSessionId = participant.sessionId;
    }
  }
  if (!state.hostSessionId) {
    state.hostSessionId =
      state.participants.find((p) => p.role === "player")?.sessionId ?? null;
  }
  state.resolverSessionId = selectResolver(state);
  touch(state);
}

export function markDisconnected(state: RoomState, connectionId: string) {
  const participant = state.participants.find((p) => p.connectionId === connectionId);
  if (!participant) return;
  participant.connected = false;
  participant.connectionId = null;
  participant.roundStatus = "offline";
  if (state.hostSessionId === participant.sessionId) {
    state.hostSessionId =
      state.participants.find((p) => p.role === "player" && p.connected)?.sessionId ??
      state.hostSessionId;
  }
  state.resolverSessionId = selectResolver(state);
  touch(state);
}

export function startGame(state: RoomState) {
  state.participants.forEach((p) => {
    if (p.role === "player") p.score = 0;
  });
  state.roundHistory = [];
  state.roundIndex = 1;
  beginRound(state, []);
}

export function beginRound(state: RoomState, usedTargets: string[]) {
  const target = pickConcept(usedTargets);
  state.phase = "prompting";
  state.currentTarget = target;
  state.currentRoundId = newRoundId();
  state.submissions = [];
  state.lastRoundResults = null;
  state.roundStartedAt = now();
  state.phaseEndsAt = now() + MAX_PROMPT_SECONDS * 1000;
  state.participants.forEach((p) => {
    if (p.role === "player") {
      p.submittedPrompt = false;
      p.roundStatus = "entering_prompt";
    } else {
      p.roundStatus = state.phase === "lobby" ? "in_lobby" : "waiting_for_others";
    }
  });
  state.resolverSessionId = selectResolver(state);
  touch(state);
}

export function submitPrompt(
  state: RoomState,
  sessionId: string,
  prompt: string
): { ok: boolean; message?: string } {
  if (state.phase !== "prompting" || !state.currentRoundId) {
    return { ok: false, message: "Round is not accepting prompts." };
  }
  const participant = state.participants.find((p) => p.sessionId === sessionId);
  if (!participant || participant.role !== "player") {
    return { ok: false, message: "Only players can submit prompts." };
  }
  const trimmed = prompt.trim().slice(0, 256);
  if (!trimmed) return { ok: false, message: "Prompt cannot be empty." };

  const existing = state.submissions.find((s) => s.playerId === sessionId);
  if (existing) {
    existing.prompt = trimmed;
    existing.submittedAt = now();
  } else {
    const submission: RoundSubmission = {
      playerId: sessionId,
      prompt: trimmed,
      submittedAt: now()
    };
    state.submissions.push(submission);
  }

  participant.submittedPrompt = true;
  participant.roundStatus = "waiting_for_others";
  touch(state);
  return { ok: true };
}

export function maybeAdvanceFromPrompting(state: RoomState) {
  if (state.phase !== "prompting") return false;
  const playerCount = getActivePlayers(state).length;
  const submittedCount = state.submissions.length;
  const expired = Boolean(state.phaseEndsAt && state.phaseEndsAt <= now());
  if (!expired && submittedCount < playerCount) return false;

  state.phase = "resolving";
  state.phaseEndsAt = null;
  state.resolverSessionId = selectResolver(state);
  state.participants.forEach((p) => {
    if (p.role === "player") p.roundStatus = "waiting_for_others";
  });
  touch(state);
  return true;
}

export function applyRoundResults(
  state: RoomState,
  roundId: string,
  results: ScoredSubmission[]
): { ok: boolean; message?: string } {
  if (state.phase !== "resolving") {
    return { ok: false, message: "Room is not resolving a round." };
  }
  if (state.currentRoundId !== roundId) {
    return { ok: false, message: "Round ID mismatch." };
  }
  state.lastRoundResults = results;
  for (const result of results) {
    const player = state.participants.find((p) => p.sessionId === result.playerId);
    if (player?.role === "player") {
      player.score += result.scoreDelta;
      player.roundStatus = "round_complete";
    }
  }
  const snapshot = {
    roundIndex: state.roundIndex,
    roundId,
    target: state.currentTarget ?? "",
    startedAt: state.roundStartedAt ?? now(),
    endsAt: now(),
    submissions: [...state.submissions],
    results: results
  };
  state.roundHistory.push(snapshot);
  state.phase = state.roundIndex >= state.totalRounds ? "game_complete" : "round_complete";
  state.phaseEndsAt =
    state.phase === "round_complete" ? now() + INTERMISSION_SECONDS * 1000 : null;
  state.roundStartedAt = state.phase === "game_complete" ? null : state.roundStartedAt;
  touch(state);
  return { ok: true };
}

export function maybeAdvancePostResults(state: RoomState) {
  const expired = Boolean(state.phaseEndsAt && state.phaseEndsAt <= now());
  if (!expired) return false;
  if (state.phase !== "round_complete") return false;
  const usedTargets = state.roundHistory.map((round) => round.target);
  state.roundIndex += 1;
  beginRound(state, usedTargets);
  return true;
}

export function resetGame(state: RoomState) {
  const participants = state.participants.map((p) => ({
    ...p,
    score: 0,
    submittedPrompt: false,
    roundStatus: "in_lobby" as const
  }));
  const next = createInitialRoomState(state.roomCode);
  next.participants = participants;
  next.hostSessionId =
    participants.find((p) => p.role === "player")?.sessionId ?? null;
  next.resolverSessionId = selectResolver(next);
  Object.assign(state, next);
}

export function deriveRoundStatusForParticipant(
  state: RoomState,
  participant: Participant
) {
  if (!participant.connected) return "offline" as const;
  if (participant.role === "guest") {
    if (state.phase === "lobby") return "in_lobby" as const;
    if (state.phase === "round_complete" || state.phase === "game_complete") {
      return "round_complete" as const;
    }
    return "waiting_for_others" as const;
  }
  if (state.phase === "lobby") return "in_lobby" as const;
  if (state.phase === "prompting") {
    return participant.submittedPrompt ? "waiting_for_others" : "entering_prompt";
  }
  if (state.phase === "resolving") return "waiting_for_others";
  return "round_complete";
}

export function selectResolver(state: RoomState) {
  return (
    state.participants
      .filter((p) => p.connected)
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .find((p) => p.role === "player")?.sessionId ?? null
  );
}

export function getActivePlayers(state: RoomState) {
  return state.participants.filter((p) => p.role === "player" && p.connected);
}

export function touch(state: RoomState) {
  state.participants.forEach((participant) => {
    participant.roundStatus = deriveRoundStatusForParticipant(state, participant);
  });
  state.updatedAt = now();
}
