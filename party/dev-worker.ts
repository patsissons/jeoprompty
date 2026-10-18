// Standalone room worker for local development (`pnpm party:dev`).
// Production serves the same Durable Object from the root worker.ts.
import { routePartykitRequest } from "partyserver";

export { Room } from "./server";

export default {
  async fetch(request, env) {
    return (
      (await routePartykitRequest(request, env)) ??
      new Response("Not Found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Cloudflare.Env>;
