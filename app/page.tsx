import { cookies } from "next/headers";

import { LandingForm } from "@/components/landing-form";
import { ROOM_CODE_COOKIE, normalizeRoomCodeCookie } from "@/lib/room-code-cookie";

export default function HomePage() {
  const cookieStore = cookies();
  const lastRoomCode = normalizeRoomCodeCookie(cookieStore.get(ROOM_CODE_COOKIE)?.value);

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
        <section className="relative h-full overflow-hidden rounded-3xl border border-white/10 p-6 sm:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-orange-400/10" />
          <div className="relative space-y-6 text-center">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs tracking-[0.2em] text-cyan-100">
              PROMPT JEOPARDY PARTY GAME
            </div>
            <div className="space-y-3 text-center">
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                This is Jeoprompty<span className="text-orange-300">!</span>
              </h1>
              <p className="text-base text-muted-foreground sm:text-lg">
                Players race to write one perfect question that forces GPT to
                reveal a secret target. Short answer wins. Sloppy prompt loses.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["10 rounds", "Fast tournament format"],
                ["60 seconds", "Per prompt-writing round"],
              ].map(([title, detail]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-muted-foreground">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <LandingForm initialRoomCode={lastRoomCode} />
      </div>
    </main>
  );
}
