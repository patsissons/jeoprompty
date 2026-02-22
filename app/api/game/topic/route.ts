import { NextResponse } from "next/server";

import { generateCreativeTopic } from "@/lib/game/concepts";

export const runtime = "nodejs";

export async function POST() {
  const topic = await generateCreativeTopic({
    apiKey: process.env.OPENAI_API_KEY
  });

  return NextResponse.json({ topic });
}
