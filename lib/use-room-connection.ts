"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PartySocket from "partysocket";

import { MAX_PROMPT_SECONDS, TOTAL_ROUNDS } from "@/lib/game/constants";
import type { ClientMessage, RoomState, ScoreApiResponse, ServerMessage } from "@/lib/game/types";

type UseRoomConnectionArgs = {
  roomCode: string;
  nickname: string;
  role: "player" | "guest";
  sessionId: string;
  enabled: boolean;
};

export function useRoomConnection({
  roomCode,
  nickname,
  role,
  sessionId,
  enabled
}: UseRoomConnectionArgs) {
  const [state, setState] = useState<RoomState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "open" | "closed" | "error"
  >("connecting");
  const [lastError, setLastError] = useState<string | null>(null);
  const socketRef = useRef<PartySocket | null>(null);
  const resolvingRoundRef = useRef<string | null>(null);
  const advancingRoundRef = useRef<string | null>(null);
  const generatedLobbyTopicKeyRef = useRef<string | null>(null);
  const stateRef = useRef<RoomState | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST;
  const canConnect = Boolean(host) && enabled;

  const send = (message: ClientMessage) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(message));
  };

  async function fetchGeneratedTopic() {
    const response = await fetch("/api/game/topic", {
      method: "POST"
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `API error ${response.status}`);
    }
    const payload = (await response.json()) as { topic?: string };
    if (!payload.topic?.trim()) {
      throw new Error("Topic API returned empty topic.");
    }
    return payload.topic.trim();
  }

  async function fetchGeneratedConcept(input: { topic: string; usedTargets: string[] }) {
    const response = await fetch("/api/game/concept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `API error ${response.status}`);
    }
    const payload = (await response.json()) as { concept?: string };
    if (!payload.concept?.trim()) {
      throw new Error("Concept API returned empty concept.");
    }
    return payload.concept.trim();
  }

  useEffect(() => {
    if (!canConnect) {
      setLastError("NEXT_PUBLIC_PARTYKIT_HOST is not configured.");
      setConnectionStatus("error");
      return;
    }

    const socket = new PartySocket({
      host: host!,
      room: roomCode.toLowerCase()
    });
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setConnectionStatus("open");
      setLastError(null);
      send({
        type: "join",
        payload: { sessionId, nickname, role }
      });
    });

    socket.addEventListener("close", () => setConnectionStatus("closed"));
    socket.addEventListener("error", () => {
      setConnectionStatus("error");
      setLastError("Realtime connection failed.");
    });

    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(String(event.data)) as ServerMessage;
        if (message.type === "state") {
          setState(message.payload);
          return;
        }
        if (message.type === "error") {
          setLastError(message.payload.message);
          return;
        }
      } catch {
        setLastError("Received invalid realtime payload.");
      }
    });

    return () => {
      socketRef.current = null;
      socket.close();
    };
  }, [canConnect, host, roomCode, nickname, role, sessionId]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!enabled) return;
    if (connectionStatus !== "open") return;
    send({ type: "join", payload: { sessionId, nickname, role } });
  }, [enabled, connectionStatus, nickname, role, sessionId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!enabled) return;
      send({ type: "ping" });
      if (!state?.phaseEndsAt || Date.now() < state.phaseEndsAt) return;

      if (state.phase === "prompting") {
        send({ type: "request_advance" });
        return;
      }

      if (state.phase !== "round_complete") return;
      if (state.hostSessionId !== sessionId || role !== "player") return;
      if (!state.currentRoundId) {
        send({ type: "request_advance" });
        return;
      }
      if (advancingRoundRef.current === state.currentRoundId) return;

      advancingRoundRef.current = state.currentRoundId;
      void (async () => {
        try {
          const nextTarget = await fetchGeneratedConcept({
            topic: state.gameTopic,
            usedTargets: state.roundHistory.map((round) => round.target)
          });
          send({ type: "request_advance", payload: { nextTarget } });
        } catch {
          send({ type: "request_advance" });
          window.setTimeout(() => {
            if (advancingRoundRef.current === state.currentRoundId) {
              advancingRoundRef.current = null;
            }
          }, 1500);
        }
      })();
    }, 1000);
    return () => window.clearInterval(interval);
  }, [enabled, role, sessionId, state]);

  useEffect(() => {
    if (state?.phase !== "round_complete") {
      advancingRoundRef.current = null;
    }
  }, [state?.phase, state?.currentRoundId]);

  const isHost = useMemo(
    () => state?.hostSessionId === sessionId,
    [state?.hostSessionId, sessionId]
  );

  useEffect(() => {
    if (!enabled || role !== "player") return;
    if (!isHost) return;
    if (!state) return;
    if (state.phase !== "lobby") return;

    const lobbyKey = `${state.createdAt}:${state.roundIndex}:${state.phase}`;
    if (generatedLobbyTopicKeyRef.current === lobbyKey) return;
    generatedLobbyTopicKeyRef.current = lobbyKey;

    const baselineTopic = state.gameTopic;
    void (async () => {
      try {
        const topic = await fetchGeneratedTopic();
        const latest = stateRef.current;
        if (!latest) return;
        const latestLobbyKey = `${latest.createdAt}:${latest.roundIndex}:${latest.phase}`;
        if (latestLobbyKey !== lobbyKey) return;
        if (latest.phase !== "lobby") return;
        if (latest.hostSessionId !== sessionId) return;
        if (latest.gameTopic !== baselineTopic) return;
        send({ type: "set_topic", payload: { topic } });
      } catch {
        // Local fallback topic is already in room state.
      }
    })();
  }, [enabled, isHost, role, sessionId, state]);

  const isResolver = useMemo(
    () => state?.resolverSessionId === sessionId,
    [state?.resolverSessionId, sessionId]
  );

  useEffect(() => {
    if (!state) return;
    if (state.phase !== "resolving") return;
    if (!state.currentRoundId || !state.currentTarget) return;
    if (!isResolver) return;
    if (resolvingRoundRef.current === state.currentRoundId) return;

    resolvingRoundRef.current = state.currentRoundId;

    void (async () => {
      try {
        const response = await fetch("/api/game/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roundId: state.currentRoundId,
            target: state.currentTarget,
            submissions: state.submissions.map((submission) => ({
              playerId: submission.playerId,
              prompt: submission.prompt
            }))
          })
        });

        if (!response.ok) {
          const body = await response.text();
          throw new Error(body || `API error ${response.status}`);
        }

        const payload = (await response.json()) as ScoreApiResponse;
        send({
          type: "apply_round_results",
          payload: {
            roundId: payload.roundId,
            results: payload.results
          }
        });
      } catch (error) {
        setLastError(
          error instanceof Error ? `Round scoring failed: ${error.message}` : "Round scoring failed."
        );
        // Allow retry on next render tick if still in resolving.
        window.setTimeout(() => {
          if (resolvingRoundRef.current === state.currentRoundId) {
            resolvingRoundRef.current = null;
          }
        }, 1500);
      }
    })();
  }, [isResolver, state]);

  useEffect(() => {
    if (!state?.currentRoundId) {
      resolvingRoundRef.current = null;
    }
  }, [state?.currentRoundId, state?.phase]);

  useEffect(() => {
    if (!state?.phaseEndsAt) return;
    setNowMs(Date.now());
    const interval = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [state?.phase, state?.phaseEndsAt]);

  const currentRoundSecondsRemaining = useMemo(() => {
    if (!state?.phaseEndsAt) return 0;
    return Math.max(0, Math.ceil((state.phaseEndsAt - nowMs) / 1000));
  }, [nowMs, state?.phaseEndsAt]);
  const currentRoundMsRemaining = useMemo(() => {
    if (!state?.phaseEndsAt) return 0;
    return Math.max(0, state.phaseEndsAt - nowMs);
  }, [nowMs, state?.phaseEndsAt]);

  return {
    state,
    connectionStatus,
    lastError,
    isResolver,
    currentRoundMsRemaining,
    currentRoundSecondsRemaining,
    startGame: () => {
      if (!state || !isHost || role !== "player") {
        send({ type: "start_game" });
        return;
      }

      void (async () => {
        try {
          const initialTarget = await fetchGeneratedConcept({
            topic: state.gameTopic,
            usedTargets: state.roundHistory.map((round) => round.target)
          });
          send({ type: "start_game", payload: { initialTarget } });
        } catch (error) {
          setLastError(
            error instanceof Error
              ? `Concept generation failed: ${error.message}`
              : "Concept generation failed."
          );
          send({ type: "start_game" });
        }
      })();
    },
    setTopic: (topic: string) => send({ type: "set_topic", payload: { topic } }),
    submitPrompt: (prompt: string) => send({ type: "submit_prompt", payload: { prompt } }),
    resetGame: () => send({ type: "reset_game" }),
    requestAdvance: () => send({ type: "request_advance" }),
    constants: {
      promptSeconds: MAX_PROMPT_SECONDS,
      totalRounds: TOTAL_ROUNDS
    }
  };
}
