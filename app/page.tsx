import { cookies } from "next/headers";

import { LandingForm } from "@/components/landing-form";
import { NICKNAME_COOKIE, normalizeNicknameCookie } from "@/lib/nickname-cookie";
import { ROOM_CODE_COOKIE, normalizeRoomCodeCookie } from "@/lib/room-code-cookie";

type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function joinErrorMessage(code: string | undefined) {
  if (code === "nickname_taken") {
    return "That nickname is already taken in this room. Pick a different name and try again.";
  }
  return undefined;
}

export default function HomePage({ searchParams }: Props) {
  const cookieStore = cookies();
  const roomFromQuery = normalizeRoomCodeCookie(firstParam(searchParams?.room));
  const lastRoomCode = normalizeRoomCodeCookie(cookieStore.get(ROOM_CODE_COOKIE)?.value);
  const initialRoomCode = roomFromQuery || lastRoomCode;
  const nicknameFromQuery = normalizeNicknameCookie(firstParam(searchParams?.nick));
  const lastNickname = normalizeNicknameCookie(cookieStore.get(NICKNAME_COOKIE)?.value);
  const initialNickname = nicknameFromQuery || lastNickname;
  const initialJoinError = joinErrorMessage(firstParam(searchParams?.joinError));

  return (
    <main className="min-h-[100svh] overflow-x-clip overscroll-y-contain px-4 py-4 sm:min-h-screen sm:px-6 sm:py-8">
      <div className="mx-auto grid w-full max-w-6xl gap-4 sm:gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
        <section className="relative h-full overflow-hidden rounded-3xl border border-white/10 p-5 sm:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-orange-400/10" />
          <div className="relative flex h-full flex-col gap-4 sm:gap-6 text-center">
            <div className="inline-flex max-w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-center text-xs leading-tight tracking-[0.2em] text-cyan-100">
              THE PROMPTING PARTY GAME
            </div>
            <div className="space-y-3 text-center">
              <h1 className="text-3xl font-bold tracking-tight sm:text-6xl">
                This is Jeoprompty<span className="text-orange-300">!</span>
              </h1>
              <p className="text-base text-muted-foreground sm:text-lg">
                Race to write the perfect question that results in GPT 
                responding with the target text for the round. Exact answer 
                wins. Sloppy prompt loses.
              </p>
            </div>
            <div className="mt-auto grid gap-3 sm:grid-cols-2 opacity-50">
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
        <LandingForm
          initialRoomCode={initialRoomCode}
          initialNickname={initialNickname}
          initialJoinError={initialJoinError}
        />
      </div>
    </main>
  );
}
