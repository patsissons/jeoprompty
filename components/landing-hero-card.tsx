"use client";

import { playIntroAudio } from "@/lib/intro-audio";

export function LandingHeroCard() {
  function handlePress() {
    playIntroAudio();
  }

  return (
    <section
      className="relative h-full cursor-pointer overflow-hidden rounded-3xl border border-white/10 p-5 sm:p-8"
      onClick={handlePress}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handlePress();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-orange-400/10" />
      <div className="relative flex h-full flex-col gap-4 text-center sm:gap-6">
        <div className="inline-flex max-w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-center text-xs leading-tight tracking-[0.2em] text-cyan-100">
          THE PROMPTING PARTY GAME
        </div>
        <div className="space-y-3 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-6xl">
            This is Jeoprompty<span className="text-orange-300">!</span>
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Race to write the perfect question that results in GPT responding with the target text
            for the round. Exact answer wins. Sloppy prompt loses.
          </p>
        </div>
        <div className="mt-auto grid gap-3 opacity-50 sm:grid-cols-2">
          {[
            ["10 rounds", "Fast tournament format"],
            ["60 seconds", "Per prompt-writing round"],
          ].map(([title, detail]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground">{detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
