import { NextResponse } from "next/server";

import { generateCreativeTopic } from "@/lib/game/concepts";

export const runtime = "nodejs";

export async function POST() {
  const topic = await generateCreativeTopic();

  return NextResponse.json({ topic });
}
