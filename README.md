# Jeoprompty!

Jeoprompty is a realtime party game where players see a secret target concept and race to write a single question prompt that forces GPT-5 Nano to answer with that concept.

## Stack

- Next.js (App Router, TypeScript)
- React
- Tailwind CSS
- shadcn-style UI primitives (local components)
- PartyKit (realtime room state, no database)
- OpenAI API (configurable responses model, default `gpt-5-nano` + embeddings) for answer generation and scoring

## Features in this scaffold

- Landing page for nickname + room code
- Join room as player or guest (`/room/:code`, `?watch=1`)
- Realtime room state (players, scores, per-round status, submissions)
- 10-round game loop with 60s prompt phase
- Guest scoreboard / projector-friendly mode
- Prompt cheating filter (target leakage, meta spelling hints, semantic similarity check)
- GPT-backed answer generation and scoring (exact + semantic + lexical)

## Local Development

1. Install dependencies:

```bash
pnpm install
```

2. Create env file:

```bash
cp .env.example .env.local
```

3. Add your OpenAI API key to `.env.local`:

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5-nano # optional override, defaults to gpt-5-nano
NEXT_PUBLIC_PARTYKIT_HOST=127.0.0.1:1999
```

4. Start both services (Next + PartyKit):

```bash
pnpm dev:all
```

Or run separately:

```bash
pnpm dev
pnpm partykit:dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## How it works

- PartyKit stores the room state in-memory (and persists room snapshots in PartyKit room storage).
- Clients join a room and receive state updates over WebSockets.
- During `resolving`, one client is elected as the resolver and calls `POST /api/game/score`.
- The Next.js API route calls OpenAI, computes scores, and returns the round results.
- The resolver sends the results back to PartyKit, which updates the canonical room state.

## Deployment (Vercel + PartyKit)

### 1) Deploy Next.js app to Vercel

- Import this repo into Vercel.
- Add environment variable:
  - `OPENAI_API_KEY` = your OpenAI key
  - `OPENAI_MODEL` = optional responses model override (defaults to `gpt-5-nano`)
- Deploy.

### 2) Deploy PartyKit room server

Install PartyKit CLI if needed (or use project local CLI via `pnpm partykit:deploy`).

Authenticate and deploy:

```bash
pnpm partykit:deploy
```

After deploy, PartyKit gives you a host like:

- `jeoprompty.<account>.partykit.dev`

### 3) Set frontend realtime host

In Vercel Project Settings -> Environment Variables, add:

- `NEXT_PUBLIC_PARTYKIT_HOST=jeoprompty.<account>.partykit.dev`

Redeploy Vercel after setting it.

## Room URLs

- Player mode: `/room/asdf?nick=Pat`
- Guest mode: `/room/asdf?watch=1&nick=MainScreen`

## Notes / MVP trust model

- The resolver client currently relays API results back into PartyKit.
- This is fine for a prototype / party game, but a determined malicious client could tamper with results.
- To harden this later, move scoring into PartyKit or sign API results with a shared secret verified by PartyKit.

## Future upgrades

- Better target generation (dynamic categories)
- Host controls (lock room, kick player, start/pause)
- Round reveal animation + soundtrack cues
- Signed scoring payloads for anti-tamper
- Tournament history export
