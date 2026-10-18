// Custom worker entry: routes realtime room traffic (/parties/*) to the
// PartyServer Durable Object and everything else to the OpenNext handler.
import { routePartykitRequest } from "partyserver";

// @ts-ignore `.open-next/worker.js` is generated at build time
import { default as handler } from "./.open-next/worker.js";

export { Room } from "./party/server";

export default {
  async fetch(request, env, ctx) {
    return (
      (await routePartykitRequest(request, env)) ??
      handler.fetch(request, env, ctx)
    );
  },
} satisfies ExportedHandler<Cloudflare.Env>;
