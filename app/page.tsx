import { LandingForm } from "@/components/landing-form";

export default function HomePage() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 p-6 sm:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-orange-400/10" />
          <div className="relative space-y-6">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs tracking-[0.2em] text-cyan-100">
              PROMPT JEOPARDY PARTY GAME
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                Jeoprompty<span className="text-orange-300">!</span>
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
                Players race to write one perfect question that forces GPT-5 Nano to reveal a
                secret target. Short answer wins. Sloppy prompt loses.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["10 rounds", "Fast tournament format"],
                ["60 seconds", "Per prompt-writing round"],
                ["No backend DB", "Realtime room state via PartyKit"]
              ].map(([title, detail]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-muted-foreground">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <LandingForm />
      </div>
    </main>
  );
}
