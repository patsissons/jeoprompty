# Jeoprompty!

Jeoprompty is a realtime party game where players see a secret target concept and race to write a single question prompt that forces an LLM to answer with that concept.

## Stack

- Next.js (App Router, TypeScript)
- React
- Tailwind CSS
- shadcn-style UI primitives (local components)
- PartyServer on a Cloudflare Durable Object (realtime room state, no database)
- OpenRouter (configurable chat model, default `openai/gpt-5-nano`, plus `openai/text-embedding-3-small` embeddings) for answer generation and scoring
- Cloudflare Workers via `@opennextjs/cloudflare`

## Features in this scaffold

- Landing page for nickname + room code
- Join room as player or guest (`/room/:code`, `?watch=1`)
- Realtime room state (players, scores, per-round status, submissions)
- 10-round game loop with 60s prompt phase
- Guest scoreboard / projector-friendly mode
- Prompt cheating filter (target leakage, meta spelling hints, semantic similarity check)
- LLM-backed answer generation and scoring (exact + semantic + lexical)

## Local Development

1. Install dependencies:

```bash
pnpm install
```

2. Create env file:

```bash
cp .env.example .env.local
```

3. Add your OpenRouter API key to `.env.local`:

```bash
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=deepseek/deepseek-v4.1-flash # optional, defaults to openai/gpt-5-nano
```

4. Start both services (Next + local room worker on port 1999):

```bash
pnpm dev:all
```

Or run separately:

```bash
pnpm dev
pnpm party:dev
```

5. Open [http://localhost:3000](http://localhost:3000)

LAN/mobile testing:

- Start with `pnpm dev:all:lan`
- Open `http://<your-lan-ip>:3000` on phones/tablets
- If `NEXT_PUBLIC_PARTY_HOST` is set to a loopback host (`127.0.0.1`/`localhost`), the client auto-rewrites it to `<your-lan-ip>:1999` when loaded from a LAN URL.

## How it works

- A PartyServer Durable Object (`party/server.ts`) holds each room's state in memory and persists snapshots to Durable Object storage.
- Clients join a room and receive state updates over WebSockets (`/parties/room/<code>`).
- During `resolving`, one client is elected as the resolver and calls `POST /api/game/score`.
- The Next.js API route calls OpenRouter, computes scores, and returns the round results.
- The resolver sends the results back to the room server, which updates the canonical room state.

In production a single Cloudflare Worker (`worker.ts`) serves both: `/parties/*` is routed to the room Durable Object and everything else to the OpenNext handler. Locally, `pnpm party:dev` runs the room server on its own (`party/dev-worker.ts`) next to `next dev`.

## Deployment (Cloudflare)

1. Authenticate Wrangler:

```bash
pnpm wrangler login
```

2. Set the OpenRouter key as a secret (the chat model is set in `wrangler.jsonc` `vars`):

```bash
pnpm wrangler secret put OPENROUTER_API_KEY
```

3. Build and deploy:

```bash
pnpm run deploy
```

To test the production worker locally (workerd, same-origin realtime), run `pnpm preview`. Put local secrets for preview in `.dev.vars`.

After changing `wrangler.jsonc`, regenerate binding types with `pnpm cf-typegen`.

## Room URLs

- Player mode: `/room/asdf?nick=Pat`
- Guest mode: `/room/asdf?watch=1&nick=MainScreen`

## Notes / MVP trust model

- The resolver client currently relays API results back into the room server.
- This is fine for a prototype / party game, but a determined malicious client could tamper with results.
- To harden this later, move scoring into the room Durable Object or sign API results with a shared secret verified by the room server.

## Future upgrades

- Better target generation (dynamic categories)
- Host controls (lock room, kick player, start/pause)
- Round reveal animation + soundtrack cues
- Signed scoring payloads for anti-tamper
- Tournament history export
