import {
  INTERMISSION_SECONDS,
  MAX_PLAYERS,
  MAX_PROMPT_SECONDS,
  TOTAL_ROUNDS,
} from "./constants";
import type {
  Participant,
  RoomState,
  Role,
  RoundSubmission,
  ScoredSubmission,
} from "./types";

function now() {
  return Date.now();
}

function newRoundId() {
  return crypto.randomUUID();
}

const MAX_TOPIC_LENGTH = 80;
const MAX_NICKNAME_LENGTH = 24;

function normalizeGameTopic(topic: string | null | undefined) {
  const normalized = (topic ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, MAX_TOPIC_LENGTH);
  return normalized;
}

function normalizeNicknameForComparison(nickname: string) {
  return nickname.trim().slice(0, MAX_NICKNAME_LENGTH).toLocaleLowerCase();
}

function rebindParticipantSessionId(
  state: RoomState,
  fromSessionId: string,
  toSessionId: string,
) {
  if (fromSessionId === toSessionId) return;

  if (state.hostSessionId === fromSessionId) {
    state.hostSessionId = toSessionId;
  }
  if (state.resolverSessionId === fromSessionId) {
    state.resolverSessionId = toSessionId;
  }

  state.submissions.forEach((submission) => {
    if (submission.playerId === fromSessionId) {
      submission.playerId = toSessionId;
    }
  });

  state.lastRoundResults?.forEach((result) => {
    if (result.playerId === fromSessionId) {
      result.playerId = toSessionId;
    }
  });

  state.roundHistory.forEach((round) => {
    round.submissions.forEach((submission) => {
      if (submission.playerId === fromSessionId) {
        submission.playerId = toSessionId;
      }
    });
    round.results?.forEach((result) => {
      if (result.playerId === fromSessionId) {
        result.playerId = toSessionId;
      }
    });
  });
}

export function findOfflineParticipantByNickname(
  state: RoomState,
  nickname: string,
  options?: { excludeSessionId?: string },
) {
  const target = normalizeNicknameForComparison(nickname);
  if (!target) return null;
  return (
    state.participants.find(
      (participant) =>
        participant.sessionId !== options?.excludeSessionId &&
        !participant.connected &&
        normalizeNicknameForComparison(participant.nickname) === target,
    ) ?? null
  );
}

export function createInitialRoomState(roomCode: string): RoomState {
  const createdAt = now();
  return {
    roomCode,
    phase: "lobby",
    gameTopic: "",
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
    roundHistory: [],
  };
}

export function upsertParticipant(
  state: RoomState,
  input: {
    sessionId: string;
    connectionId: string;
    nickname: string;
    role: Role;
  },
) {
  const existingBySessionId =
    state.participants.find(
      (participant) => participant.sessionId === input.sessionId,
    ) ?? null;
  const offlineNicknameMatch = findOfflineParticipantByNickname(
    state,
    input.nickname,
    {
      excludeSessionId: input.sessionId,
    },
  );

  let existing = existingBySessionId;
  if (offlineNicknameMatch) {
    // Nickname reconnection takes over the offline participant record so score/role/history stick.
    existing = offlineNicknameMatch;
    if (existingBySessionId && existingBySessionId !== offlineNicknameMatch) {
      state.participants = state.participants.filter(
        (participant) => participant !== existingBySessionId,
      );
    }
  }
  if (existing) {
    rebindParticipantSessionId(state, existing.sessionId, input.sessionId);
    existing.sessionId = input.sessionId;
    existing.connectionId = input.connectionId;
    existing.nickname = input.nickname.slice(0, MAX_NICKNAME_LENGTH);
    existing.role = input.role;
    existing.connected = true;
  } else {
    const participant: Participant = {
      sessionId: input.sessionId,
      connectionId: input.connectionId,
      nickname: input.nickname.slice(0, MAX_NICKNAME_LENGTH),
      role: input.role,
      connected: true,
      joinedAt: now(),
      score: 0,
      roundStatus: state.phase === "lobby" ? "in_lobby" : "entering_prompt",
      submittedPrompt: false,
    };
    state.participants.push(participant);
    if (!state.hostSessionId && participant.role === "player") {
      state.hostSessionId = participant.sessionId;
    }
  }
  const currentHost = state.hostSessionId
    ? state.participants.find(
        (participant) => participant.sessionId === state.hostSessionId,
      )
    : null;
  const hostIsActivePlayer = Boolean(
    currentHost && currentHost.role === "player" && currentHost.connected,
  );
  if (!hostIsActivePlayer) {
    const activePlayers = getActivePlayers(state);
    if (activePlayers.length === 1) {
      state.hostSessionId = activePlayers[0].sessionId;
    } else if (!state.hostSessionId) {
      state.hostSessionId =
        activePlayers[0]?.sessionId ??
        state.participants.find((p) => p.role === "player")?.sessionId ??
        null;
    }
  }
  state.resolverSessionId = selectResolver(state);
  touch(state);
}

export function isNicknameTaken(
  state: RoomState,
  nickname: string,
  options?: { excludeSessionId?: string; connectedOnly?: boolean },
) {
  const target = normalizeNicknameForComparison(nickname);
  if (!target) return false;
  return state.participants.some(
    (participant) =>
      participant.sessionId !== options?.excludeSessionId &&
      (!options?.connectedOnly || participant.connected) &&
      normalizeNicknameForComparison(participant.nickname) === target,
  );
}

export function markDisconnected(state: RoomState, connectionId: string) {
  const participant = state.participants.find(
    (p) => p.connectionId === connectionId,
  );
  if (!participant) return;
  participant.connected = false;
  participant.connectionId = null;
  participant.roundStatus = "offline";
  if (state.hostSessionId === participant.sessionId) {
    state.hostSessionId =
      state.participants.find((p) => p.role === "player" && p.connected)
        ?.sessionId ?? state.hostSessionId;
  }
  state.resolverSessionId = selectResolver(state);
  touch(state);
}

export function removeParticipant(state: RoomState, sessionId: string) {
  const existing = state.participants.find((p) => p.sessionId === sessionId);
  if (!existing) return false;

  state.participants = state.participants.filter(
    (p) => p.sessionId !== sessionId,
  );
  state.submissions = state.submissions.filter(
    (submission) => submission.playerId !== sessionId,
  );

  if (state.hostSessionId === sessionId) {
    state.hostSessionId =
      state.participants.find((p) => p.role === "player" && p.connected)
        ?.sessionId ??
      state.participants.find((p) => p.role === "player")?.sessionId ??
      null;
  }

  if (state.resolverSessionId === sessionId) {
    state.resolverSessionId = selectResolver(state);
  }

  touch(state);
  return true;
}

export function clearRoomParticipants(state: RoomState) {
  const next = createInitialRoomState(state.roomCode);
  Object.assign(state, next);
}

export function startGame(state: RoomState, initialTarget?: string) {
  state.gameTopic = normalizeGameTopic(state.gameTopic);
  state.participants.forEach((p) => {
    if (p.role === "player") p.score = 0;
  });
  state.roundHistory = [];
  state.roundIndex = 1;
  beginRound(state, initialTarget);
}

export function beginRound(state: RoomState, targetOverride?: string) {
  const target = targetOverride?.trim().slice(0, 256) || "";
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
      p.roundStatus =
        state.phase === "lobby" ? "in_lobby" : "waiting_for_others";
    }
  });
  state.resolverSessionId = selectResolver(state);
  touch(state);
}

export function setGameTopic(
  state: RoomState,
  topic: string,
): { ok: boolean; message?: string } {
  if (state.phase !== "lobby") {
    return { ok: false, message: "Topic is locked after the game starts." };
  }
  state.gameTopic = normalizeGameTopic(topic);
  touch(state);
  return { ok: true };
}

export function submitPrompt(
  state: RoomState,
  sessionId: string,
  prompt: string,
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
      submittedAt: now(),
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
  results: ScoredSubmission[],
): { ok: boolean; message?: string } {
  if (state.phase !== "resolving") {
    return { ok: false, message: "Room is not resolving a round." };
  }
  if (state.currentRoundId !== roundId) {
    return { ok: false, message: "Round ID mismatch." };
  }
  state.lastRoundResults = results;
  const playersBySessionId = new Map(
    state.participants.map(
      (participant) => [participant.sessionId, participant] as const,
    ),
  );
  for (const result of results) {
    const player = playersBySessionId.get(result.playerId);
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
    results: results,
  };
  state.roundHistory.push(snapshot);
  state.phase =
    state.roundIndex >= state.totalRounds ? "game_complete" : "round_complete";
  state.phaseEndsAt =
    state.phase === "round_complete"
      ? now() + INTERMISSION_SECONDS * 1000
      : null;
  state.roundStartedAt =
    state.phase === "game_complete" ? null : state.roundStartedAt;
  touch(state);
  return { ok: true };
}

export function maybeAdvancePostResults(state: RoomState, nextTarget?: string) {
  const expired = Boolean(state.phaseEndsAt && state.phaseEndsAt <= now());
  if (!expired) return false;
  if (state.phase !== "round_complete") return false;
  state.roundIndex += 1;
  beginRound(state, nextTarget);
  return true;
}

export function resetGame(state: RoomState) {
  const participants = state.participants.map((p) => ({
    ...p,
    score: 0,
    submittedPrompt: false,
    roundStatus: "in_lobby" as const,
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
  participant: Participant,
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
    return participant.submittedPrompt
      ? "waiting_for_others"
      : "entering_prompt";
  }
  if (state.phase === "resolving") return "waiting_for_others";
  return "round_complete";
}

export function selectResolver(state: RoomState) {
  let resolver: Participant | null = null;
  for (const participant of state.participants) {
    if (!participant.connected || participant.role !== "player") continue;
    if (!resolver || participant.joinedAt < resolver.joinedAt) {
      resolver = participant;
    }
  }
  return resolver?.sessionId ?? null;
}

export function getActivePlayers(state: RoomState) {
  return state.participants.filter((p) => p.role === "player" && p.connected);
}

export function touch(state: RoomState) {
  state.participants.forEach((participant) => {
    participant.roundStatus = deriveRoundStatusForParticipant(
      state,
      participant,
    );
  });
  state.updatedAt = now();
}
