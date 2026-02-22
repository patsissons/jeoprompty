import { RoomClient } from "@/components/room-client";

type Props = {
  params: { code: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function RoomPage({ params, searchParams }: Props) {
  const watchMode = searchParams?.watch === "1";
  const nickParam = searchParams?.nick;
  const initialNickname = Array.isArray(nickParam) ? nickParam[0] : nickParam;

  return (
    <RoomClient
      roomCode={params.code}
      watchMode={watchMode}
      initialNickname={initialNickname}
    />
  );
}
