import type { Metadata } from "next";
import { cookies } from "next/headers";

import { RoomClient } from "@/components/room-client";
import {
  NICKNAME_COOKIE,
  normalizeNicknameCookie,
} from "@/lib/nickname-cookie";

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const roomCode = params.code.toUpperCase();

  return {
    title: `Room ${roomCode}`,
    description: `Join room ${roomCode} to play Jeoprompty with your group.`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function RoomPage(props: Props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const cookieStore = await cookies();
  const watchMode = searchParams?.watch === "1";
  const nickParam = searchParams?.nick;
  const nicknameFromQuery = normalizeNicknameCookie(
    Array.isArray(nickParam) ? nickParam[0] : nickParam,
  );
  const lastNickname = normalizeNicknameCookie(
    cookieStore.get(NICKNAME_COOKIE)?.value,
  );
  const initialNickname = nicknameFromQuery || lastNickname;

  return (
    <RoomClient
      roomCode={params.code}
      watchMode={watchMode}
      initialNickname={initialNickname}
    />
  );
}
