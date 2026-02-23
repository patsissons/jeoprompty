import type * as Party from "partykit/server";

import {
  applyRoundResults,
  clearRoomParticipants,
  createInitialRoomState,
  findOfflineParticipantByNickname,
  isNicknameTaken,
  markDisconnected,
  maybeAdvanceFromPrompting,
  maybeAdvancePostResults,
  removeParticipant,
  resetGame,
  setGameTopic,
  startGame,
  submitPrompt,
  upsertParticipant
} from "../lib/game/room-state";
import type { ClientMessage, RoomState, ScoredSubmission, ServerMessage } from "../lib/game/types";

const STORAGE_KEY = "jeoprompty-room-state";

function parseMessage(raw: string): ClientMessage | null {
  try {
    return JSON.parse(raw) as ClientMessage;
  } catch {
    return null;
  }
}

function stringify(message: ServerMessage) {
  return JSON.stringify(message);
}

function isScoredSubmissionArray(value: unknown): value is ScoredSubmission[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    return (
      typeof row.playerId === "string" &&
      typeof row.prompt === "string" &&
      typeof row.answer === "string" &&
      typeof row.exactMatch === "boolean" &&
      typeof row.semanticScore === "number" &&
      typeof row.lexicalScore === "number" &&
      typeof row.scoreDelta === "number" &&
      typeof row.rejected === "boolean"
    );
  });
}

export default class JeopromptyServer implements Party.Server {
  private statePromise: Promise<RoomState> | null = null;

  constructor(readonly room: Party.Room) {}

  private maybeAdvanceState(
    state: RoomState,
    options?: { nextTarget?: string; allowRoundCompleteWithoutTarget?: boolean }
  ) {
    if (maybeAdvanceFromPrompting(state)) {
      return true;
    }
    if (state.phase !== "round_complete") return false;
    if (typeof options?.nextTarget === "string" && options.nextTarget.trim()) {
      return maybeAdvancePostResults(state, options.nextTarget);
    }
    if (options?.allowRoundCompleteWithoutTarget) {
      return maybeAdvancePostResults(state);
    }
    return false;
  }

  private async loadState() {
    if (!this.statePromise) {
      this.statePromise = (async () => {
        const existing = await this.room.storage?.get<RoomState>(STORAGE_KEY);
        const state =
          existing ??
          createInitialRoomState(String(this.room.id).replace(/[^a-z0-9]/gi, "").toUpperCase());
        return state;
      })();
    }
    return this.statePromise;
  }

  private async saveState(state: RoomState) {
    await this.room.storage?.put(STORAGE_KEY, state);
  }

  private async broadcastState() {
    const state = await this.loadState();
    this.room.broadcast(stringify({ type: "state", payload: state }));
    await this.saveState(state);
  }

  private getPlayerCount(state: RoomState) {
    return state.participants.filter((participant) => participant.role === "player").length;
  }

  private findParticipantByConnection(state: RoomState, connectionId: string) {
    return state.participants.find((participant) => participant.connectionId === connectionId);
  }

  private sendError(connection: Party.Connection, message: string) {
    connection.send(stringify({ type: "error", payload: { message } }));
  }

  onConnect(connection: Party.Connection) {
    connection.send(
      stringify({
        type: "toast",
        payload: { message: "Connected. Join the room to sync state." }
      })
    );
  }

  async onClose(connection: Party.Connection) {
    const state = await this.loadState();
    markDisconnected(state, connection.id);
    await this.broadcastState();
  }

  async onMessage(rawMessage: string, connection: Party.Connection) {
    const message = parseMessage(rawMessage);
    if (!message) {
      this.sendError(connection, "Invalid message payload.");
      return;
    }

    const state = await this.loadState();

    switch (message.type) {
      case "join": {
        const { sessionId, nickname, role } = message.payload;
        const trimmedNickname = nickname.trim();
        if (!sessionId || !trimmedNickname) {
          this.sendError(connection, "Nickname and session are required.");
          return;
        }
        if (isNicknameTaken(state, trimmedNickname, { excludeSessionId: sessionId, connectedOnly: true })) {
          this.sendError(connection, "That nickname is already taken.");
          return;
        }
        const reconnectingParticipant = findOfflineParticipantByNickname(state, trimmedNickname, {
          excludeSessionId: sessionId
        });
        const playerCount = this.getPlayerCount(state);
        const alreadyPlayer = state.participants.some(
          (p) => p.sessionId === sessionId && p.role === "player"
        );
        const reconnectingPlayer = reconnectingParticipant?.role === "player";
        if (role === "player" && !alreadyPlayer && !reconnectingPlayer && playerCount >= state.maxPlayers) {
          this.sendError(connection, "This room is full.");
          return;
        }
        upsertParticipant(state, {
          sessionId,
          connectionId: connection.id,
          nickname: trimmedNickname,
          role
        });
        connection.send(stringify({ type: "state", payload: state }));
        await this.broadcastState();
        return;
      }

      case "start_game": {
        const playerCount = this.getPlayerCount(state);
        if (playerCount < 1) {
          this.sendError(connection, "Need at least one player.");
          return;
        }
        startGame(state, message.payload?.initialTarget);
        await this.broadcastState();
        return;
      }

      case "set_topic": {
        const actor = this.findParticipantByConnection(state, connection.id);
        if (!actor || actor.role !== "player") {
          this.sendError(connection, "Only players can change the topic.");
          return;
        }
        if (state.hostSessionId && actor.sessionId !== state.hostSessionId) {
          this.sendError(connection, "Only the host can change the topic.");
          return;
        }
        const result = setGameTopic(state, message.payload.topic);
        if (!result.ok) {
          this.sendError(connection, result.message ?? "Could not update topic.");
          return;
        }
        await this.broadcastState();
        return;
      }

      case "submit_prompt": {
        const submitter = this.findParticipantByConnection(state, connection.id);
        if (!submitter) {
          this.sendError(connection, "Join the room before submitting.");
          return;
        }
        const result = submitPrompt(state, submitter.sessionId, message.payload.prompt);
        if (!result.ok) {
          this.sendError(connection, result.message ?? "Submit failed.");
          return;
        }
        maybeAdvanceFromPrompting(state);
        await this.broadcastState();
        return;
      }

      case "request_advance": {
        const actor = this.findParticipantByConnection(state, connection.id);
        const canProvideNextTarget =
          Boolean(actor && actor.role === "player" && actor.sessionId === state.hostSessionId);
        const nextTarget = canProvideNextTarget ? message.payload?.nextTarget : undefined;
        const advanced = this.maybeAdvanceState(state, {
          nextTarget,
          allowRoundCompleteWithoutTarget: canProvideNextTarget
        });
        if (advanced) {
          await this.broadcastState();
        } else {
          // Keep peers in sync if the caller was stale.
          connection.send(stringify({ type: "state", payload: state }));
        }
        return;
      }

      case "apply_round_results": {
        if (
          !message.payload?.roundId ||
          !isScoredSubmissionArray(message.payload.results)
        ) {
          this.sendError(connection, "Invalid round results payload.");
          return;
        }

        const submittedPlayers = new Set(state.submissions.map((submission) => submission.playerId));
        const promptsByPlayerId = new Map(
          state.submissions.map((submission) => [submission.playerId, submission.prompt] as const)
        );
        const normalizedResults: ScoredSubmission[] = message.payload.results
          .filter((r) => submittedPlayers.has(r.playerId))
          .map((r) => {
            const prompt = promptsByPlayerId.get(r.playerId) ?? r.prompt;
            return {
              ...r,
              prompt
            };
          });

        const result = applyRoundResults(state, message.payload.roundId, normalizedResults);
        if (!result.ok) {
          this.sendError(connection, result.message ?? "Could not apply round results.");
          return;
        }
        await this.broadcastState();
        return;
      }

      case "reset_game": {
        const actor = this.findParticipantByConnection(state, connection.id);
        if (!actor || actor.role !== "player") {
          this.sendError(connection, "Only players can reset the game.");
          return;
        }
        if (state.hostSessionId && actor.sessionId !== state.hostSessionId) {
          this.sendError(connection, "Only the host can reset the game.");
          return;
        }
        resetGame(state);
        await this.broadcastState();
        return;
      }

      case "leave_room": {
        const actor = this.findParticipantByConnection(state, connection.id);
        if (!actor) {
          connection.send(stringify({ type: "state", payload: state }));
          return;
        }

        const inLobby = state.phase === "lobby";
        const isHost = actor.role === "player" && state.hostSessionId === actor.sessionId;
        const shouldClearRoom = Boolean(message.payload?.clearRoom) && inLobby && isHost;

        if (shouldClearRoom) {
          clearRoomParticipants(state);
        } else {
          removeParticipant(state, actor.sessionId);
        }

        await this.broadcastState();
        return;
      }

      case "ping": {
        const advanced = this.maybeAdvanceState(state);
        if (advanced) {
          await this.broadcastState();
        } else {
          connection.send(stringify({ type: "state", payload: state }));
          await this.saveState(state);
        }
        return;
      }

      default: {
        this.sendError(connection, "Unsupported message type.");
      }
    }
  }
}
