// Custom worker entry: routes realtime room traffic (/parties/*) to the
// PartyServer Durable Object and everything else to the OpenNext handler.
import { routePartykitRequest } from "partyserver";

// @ts-ignore `.open-next/worker.js` is generated at build time
import { default as handler } from "./.open-next/worker.js";

export { Room } from "./party/server";

// Bots probe for dotfiles (/.env, /.git/HEAD, ...). Answer before Next renders
// a 404 page, which costs far more CPU.
const DOT_PATH = /\/\.(?!well-known\/)/;

export default {
  async fetch(request, env, ctx) {
    if (DOT_PATH.test(new URL(request.url).pathname)) {
      return new Response("Not Found", { status: 404 });
    }
    return (
      (await routePartykitRequest(request, env)) ??
      handler.fetch(request, env, ctx)
    );
  },
} satisfies ExportedHandler<Cloudflare.Env>;
