import { cookies } from "next/headers";

import { LandingForm } from "@/components/landing-form";
import { LandingHeroCard } from "@/components/landing-hero-card";
import {
  NICKNAME_COOKIE,
  normalizeNicknameCookie,
} from "@/lib/nickname-cookie";
import {
  ROOM_CODE_COOKIE,
  normalizeRoomCodeCookie,
} from "@/lib/room-code-cookie";

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
  const lastRoomCode = normalizeRoomCodeCookie(
    cookieStore.get(ROOM_CODE_COOKIE)?.value,
  );
  const initialRoomCode = roomFromQuery || lastRoomCode;
  const nicknameFromQuery = normalizeNicknameCookie(
    firstParam(searchParams?.nick),
  );
  const lastNickname = normalizeNicknameCookie(
    cookieStore.get(NICKNAME_COOKIE)?.value,
  );
  const initialNickname = nicknameFromQuery || lastNickname;
  const initialJoinError = joinErrorMessage(
    firstParam(searchParams?.joinError),
  );

  return (
    <main className="min-h-[100svh] overflow-x-clip overscroll-y-contain px-4 py-4 sm:min-h-screen sm:px-6 sm:py-8">
      <div className="mx-auto grid w-full max-w-6xl gap-4 sm:gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
        <LandingHeroCard />
        <LandingForm
          initialRoomCode={initialRoomCode}
          initialNickname={initialNickname}
          initialJoinError={initialJoinError}
        />
      </div>
    </main>
  );
}
