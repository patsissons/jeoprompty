import { NextResponse } from "next/server";
import { z } from "zod";

import { generateCreativeConcept } from "@/lib/game/concepts";

export const runtime = "nodejs";

const requestSchema = z.object({
  topic: z.string().trim().min(1).max(120),
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

  const concept = await generateCreativeConcept({
    topic: parsed.topic,
    used: parsed.usedTargets ?? []
  });

  return NextResponse.json({ concept });
}
