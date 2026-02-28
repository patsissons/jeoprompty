import { NextResponse } from "next/server";
import { z } from "zod";

import { trimToMax } from "@/lib/game/text";
import { generateConciseAnswer } from "@/lib/openai";

export const runtime = "nodejs";

const requestSchema = z.object({
  prompt: z.string().min(1).max(256),
  words: z.number().int().min(1).max(8).optional(),
});

export async function POST(request: Request) {
  let parsed: z.infer<typeof requestSchema>;

  try {
    parsed = requestSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid preview request.", details: error.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Invalid JSON request." },
      { status: 400 },
    );
  }

  const prompt = parsed.prompt.trim().slice(0, 256);
  const words = parsed.words ?? 4;

  try {
    const answer = await generateConciseAnswer(prompt, words);
    return NextResponse.json({
      answer: trimToMax(answer),
      words,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Preview generation failed: ${error.message}`
            : "Preview generation failed.",
      },
      { status: 500 },
    );
  }
}
