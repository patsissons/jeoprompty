export type Role = "player" | "guest";
export type RoundPhase =
  | "lobby"
  | "prompting"
  | "resolving"
  | "round_complete"
  | "game_complete";

export type PlayerRoundStatus =
  | "in_lobby"
  | "entering_prompt"
  | "waiting_for_others"
  | "round_complete"
  | "offline";

export type Participant = {
  sessionId: string;
  connectionId: string | null;
  nickname: string;
  role: Role;
  connected: boolean;
  joinedAt: number;
  score: number;
  roundStatus: PlayerRoundStatus;
  submittedPrompt: boolean;
};

export type RoundSubmission = {
  playerId: string;
  prompt: string;
  submittedAt: number;
};

export type ScoredSubmission = {
  playerId: string;
  prompt: string;
  answer: string;
  exactMatch: boolean;
  semanticScore: number;
  lexicalScore: number;
  hallucinationPenalty: number;
  scoreDelta: number;
  rejected: boolean;
  rejectionReason?: string;
};

export type RoundSnapshot = {
  roundIndex: number;
  roundId: string;
  target: string;
  startedAt: number;
  endsAt: number | null;
  submissions: RoundSubmission[];
  results: ScoredSubmission[] | null;
};

export type RoomState = {
  roomCode: string;
  phase: RoundPhase;
  gameTopic: string;
  roundIndex: number;
  totalRounds: number;
  maxPlayers: number;
  createdAt: number;
  updatedAt: number;
  phaseEndsAt: number | null;
  roundStartedAt: number | null;
  hostSessionId: string | null;
  resolverSessionId: string | null;
  participants: Participant[];
  currentTarget: string | null;
  currentRoundId: string | null;
  submissions: RoundSubmission[];
  lastRoundResults: ScoredSubmission[] | null;
  roundHistory: RoundSnapshot[];
};

export type JoinMessage = {
  type: "join";
  payload: {
    sessionId: string;
    nickname: string;
    role: Role;
  };
};

export type StartGameMessage = {
  type: "start_game";
  payload?: { initialTarget?: string };
};
export type SetTopicMessage = {
  type: "set_topic";
  payload: { topic: string };
};
export type SubmitPromptMessage = {
  type: "submit_prompt";
  payload: { prompt: string };
};
export type RequestAdvanceMessage = {
  type: "request_advance";
  payload?: { nextTarget?: string };
};
export type ResetGameMessage = { type: "reset_game" };
export type PingMessage = { type: "ping" };
export type ApplyRoundResultsMessage = {
  type: "apply_round_results";
  payload: {
    roundId: string;
    results: ScoredSubmission[];
  };
};

export type ClientMessage =
  | JoinMessage
  | StartGameMessage
  | SetTopicMessage
  | SubmitPromptMessage
  | RequestAdvanceMessage
  | ResetGameMessage
  | PingMessage
  | ApplyRoundResultsMessage;

export type ServerMessage =
  | { type: "state"; payload: RoomState }
  | { type: "error"; payload: { message: string } }
  | { type: "toast"; payload: { message: string } };

export type ScoreApiRequest = {
  roundId: string;
  target: string;
  submissions: Array<{
    playerId: string;
    prompt: string;
  }>;
};

export type ScoreApiResponse = {
  roundId: string;
  results: ScoredSubmission[];
};

export type AppSettings = {
  maxPlayers: number;
  totalRounds: number;
};
