import { NextResponse } from "next/server";
import { z } from "zod";

import { checkPromptForCheating } from "@/lib/game/cheat-filter";
import { computeScore, cosineSimilarity, lexicalCloseness } from "@/lib/game/scoring";
import type { ScoreApiRequest, ScoreApiResponse, ScoredSubmission } from "@/lib/game/types";
import { trimToMax } from "@/lib/game/text";
import { embedTexts, generateConciseAnswer } from "@/lib/openai";

export const runtime = "nodejs";

const requestSchema = z.object({
  roundId: z.string().min(1),
  target: z.string().min(1).max(256),
  submissions: z
    .array(
      z.object({
        playerId: z.string().min(1),
        prompt: z.string().min(1).max(256)
      })
    )
    .max(24)
});

async function buildPromptSimilarityMap(target: string, prompts: string[]) {
  try {
    const embeddings = await embedTexts([target, ...prompts]);
    if (embeddings.length !== prompts.length + 1) return new Map<string, number>();
    const [targetEmbedding, ...promptEmbeddings] = embeddings;
    const map = new Map<string, number>();
    prompts.forEach((prompt, index) => {
      map.set(prompt, cosineSimilarity(targetEmbedding, promptEmbeddings[index]));
    });
    return map;
  } catch {
    return new Map<string, number>();
  }
}

async function buildAnswerSimilarityMap(target: string, answers: string[]) {
  try {
    const embeddings = await embedTexts([target, ...answers]);
    if (embeddings.length !== answers.length + 1) return new Map<string, number>();
    const [targetEmbedding, ...answerEmbeddings] = embeddings;
    const map = new Map<string, number>();
    answers.forEach((answer, index) => {
      map.set(answer, cosineSimilarity(targetEmbedding, answerEmbeddings[index]));
    });
    return map;
  } catch {
    return new Map<string, number>();
  }
}

export async function POST(request: Request) {
  let parsed: ScoreApiRequest;

  try {
    parsed = requestSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid score request.", details: error.flatten() },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  const { roundId, target, submissions } = parsed;
  const promptSimilarityMap = await buildPromptSimilarityMap(
    target,
    submissions.map((s) => s.prompt)
  );

  const preliminaryResults: Array<{
    playerId: string;
    prompt: string;
    answer: string;
    rejected: boolean;
    rejectionReason?: string;
  }> = [];

  for (const submission of submissions) {
    const filter = checkPromptForCheating({
      prompt: submission.prompt,
      target,
      semanticSimilarityToTarget: promptSimilarityMap.get(submission.prompt) ?? null
    });

    if (!filter.ok) {
      preliminaryResults.push({
        playerId: submission.playerId,
        prompt: trimToMax(submission.prompt),
        answer: "Rejected",
        rejected: true,
        rejectionReason: filter.reason
      });
      continue;
    }

    try {
      const answer = await generateConciseAnswer(filter.sanitizedPrompt);
      preliminaryResults.push({
        playerId: submission.playerId,
        prompt: filter.sanitizedPrompt,
        answer: trimToMax(answer),
        rejected: false
      });
    } catch (error) {
      preliminaryResults.push({
        playerId: submission.playerId,
        prompt: filter.sanitizedPrompt,
        answer: "Model error",
        rejected: true,
        rejectionReason:
          error instanceof Error ? `Generation failed: ${error.message}` : "Generation failed"
      });
    }
  }

  const nonRejectedAnswers = preliminaryResults
    .filter((r) => !r.rejected)
    .map((r) => r.answer);
  const answerSimilarityMap = await buildAnswerSimilarityMap(target, nonRejectedAnswers);

  const results: ScoredSubmission[] = preliminaryResults.map((result) => {
    if (result.rejected) {
      return {
        playerId: result.playerId,
        prompt: result.prompt,
        answer: result.answer,
        exactMatch: false,
        semanticScore: 0,
        lexicalScore: 0,
        hallucinationPenalty: 0,
        scoreDelta: 0,
        rejected: true,
        rejectionReason: result.rejectionReason
      };
    }

    const semantic = answerSimilarityMap.get(result.answer) ?? 0;
    const lexical = lexicalCloseness(result.answer, target);
    const scored = computeScore({
      answer: result.answer,
      target,
      semantic,
      lexical
    });

    return {
      playerId: result.playerId,
      prompt: result.prompt,
      answer: result.answer,
      exactMatch: scored.exactMatch,
      semanticScore: scored.semanticScore,
      lexicalScore: scored.lexicalScore,
      hallucinationPenalty: scored.hallucinationPenalty,
      scoreDelta: scored.scoreDelta,
      rejected: false
    };
  });

  const response: ScoreApiResponse = { roundId, results };
  return NextResponse.json(response);
}
