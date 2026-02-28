import { NextResponse } from "next/server";
import { z } from "zod";

import { DEFAULT_FALLBACK_TOPIC, generateCreativeConcept } from "@/lib/game/concepts";

export const runtime = "nodejs";

const requestSchema = z.object({
  topic: z.string().trim().max(120).optional(),
  usedTargets: z.array(z.string().trim().min(1).max(256)).max(200).optional()
});

export async function POST(request: Request) {
  let parsed: z.infer<typeof requestSchema>;

  try {
    parsed = requestSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid concept request.", details: error.flatten() },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  let concept = "";
  const normalizedTopic = parsed.topic?.trim() || DEFAULT_FALLBACK_TOPIC;

  for (let i = 0; i < 10; i++) {
    concept = await generateCreativeConcept({
      topic: normalizedTopic,
      used: parsed.usedTargets ?? []
    });
    if (concept) {
      break;
    }
  }

  if (!concept) {
    return NextResponse.json({ error: "No concept generated." }, { status: 500 });
  }

  return NextResponse.json({ concept });
}
