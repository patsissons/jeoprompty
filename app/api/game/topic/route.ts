import { NextResponse } from "next/server";
import { z } from "zod";

import { generateCreativeTopic } from "@/lib/game/concepts";

export const runtime = "nodejs";

const requestSchema = z.object({
  usedTopics: z.array(z.string().trim().min(1).max(120)).max(64).optional()
});

export async function POST(request: Request) {
  let parsed: z.infer<typeof requestSchema>;
  try {
    const rawBody = await request.text();
    const json = rawBody ? (JSON.parse(rawBody) as unknown) : {};
    parsed = requestSchema.parse(json);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid topic request.", details: error.flatten() },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  const topic = await generateCreativeTopic({
    used: parsed.usedTopics ?? []
  });

  return NextResponse.json({ topic });
}
