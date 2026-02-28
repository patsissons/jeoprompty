import { normalizeText } from "./text";

function randomNonce() {
  return Math.random().toString(36).slice(2, 10);
}

function randomInt(maxExclusive: number) {
  return Math.floor(Math.random() * Math.max(1, maxExclusive));
}

function sanitizeSingleLineText(value: string, maxLength: number) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^[\s"'`]+|[\s"'`]+$/g, "")
    .split(/\r?\n/)[0]
    .replace(/^(topic|concept|answer)\s*:\s*/i, "")
    .replace(/^[\-\*\d\.\)\s]+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

const TOPIC_DIVERSITY_LENSES = [
  "inflate a tiny everyday issue into a world level crisis",
  "frame the premise like a ridiculous workplace policy memo",
  "combine two unrelated social rituals into one chaotic trend",
  "set the idea in an alternate timeline with normal people reactions",
  "treat an abstract emotion like a public utility service",
  "center a harmless object as if it had celebrity status",
  "focus on a weird rule people must follow for one day",
  "make the topic sound like a headline from a satirical newspaper",
  "blend modern technology with old school etiquette",
  "turn a mundane chore into a competitive sport",
  "invent a strange seasonal tradition that just became mandatory",
  "treat a city problem as if it were solved by theater logic",
  "start from a fake scientific breakthrough with silly consequences",
  "zoom in on a niche hobby and exaggerate its cultural impact",
  "describe an etiquette dilemma in an absurdly formal tone",
  "present a harmless fad as if historians will study it forever",
  "turn a local neighborhood dispute into an epic saga",
  "imagine a public holiday for an extremely specific inconvenience",
  "mix legal language with a clearly unserious situation",
  "treat a common saying as literal public policy",
];

const TOPIC_STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "of",
  "and",
  "or",
  "for",
  "to",
  "in",
  "on",
  "with",
  "at",
  "by",
  "from",
  "into",
  "about",
  "over",
  "under",
  "after",
  "before",
  "without",
  "unexpected",
  "surprising",
  "random",
  "funny",
  "comical",
]);

function sampleLenses(count: number) {
  const pool = [...TOPIC_DIVERSITY_LENSES];
  const picks: string[] = [];
  for (let i = 0; i < Math.min(count, pool.length); i += 1) {
    const index = randomInt(pool.length);
    const [picked] = pool.splice(index, 1);
    picks.push(picked);
  }
  return picks;
}

function topicTokens(text: string) {
  return normalizeText(text)
    .split(" ")
    .filter((token) => token.length > 2 && !TOPIC_STOP_WORDS.has(token));
}

function lexicalTopicSimilarity(a: string, b: string) {
  const normalizedA = normalizeText(a);
  const normalizedB = normalizeText(b);
  if (!normalizedA || !normalizedB) return 0;
  if (normalizedA === normalizedB) return 1;
  if (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA)) {
    return 0.95;
  }

  const tokensA = new Set(topicTokens(normalizedA));
  const tokensB = new Set(topicTokens(normalizedB));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection += 1;
  }
  const union = tokensA.size + tokensB.size - intersection;
  if (union <= 0) return 0;
  return intersection / union;
}

function cosineSimilarity(a: number[], b: number[]) {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / Math.sqrt(normA * normB);
}

let embedTextsFn: null | ((input: string[]) => Promise<number[][]>) = null;

async function getEmbedTexts() {
  if (!embedTextsFn) {
    const { embedTexts } = await import("@/lib/openai");
    embedTextsFn = embedTexts;
  }
  return embedTextsFn;
}

async function maybeEmbedTexts(input: string[]) {
  if (input.length === 0) return [] as number[][];
  try {
    const embedTexts = await getEmbedTexts();
    return await embedTexts(input);
  } catch (error) {
    console.warn("Topic embedding lookup failed", error);
    return [];
  }
}

type TopicSimilarityContext = {
  recentTopics: string[];
  recentEmbeddings: number[][];
};

async function buildTopicSimilarityContext(used: string[]) {
  const uniqueRecentTopics = Array.from(
    new Set(
      used
        .map((value) => sanitizeSingleLineText(value, 120))
        .filter(Boolean)
        .slice(-16),
    ),
  );
  return {
    recentTopics: uniqueRecentTopics,
    recentEmbeddings: await maybeEmbedTexts(uniqueRecentTopics),
  } satisfies TopicSimilarityContext;
}

async function isTopicTooSimilar(
  topic: string,
  context: TopicSimilarityContext,
) {
  const normalizedCandidate = normalizeText(topic);
  if (!normalizedCandidate) return true;

  for (const recent of context.recentTopics) {
    const normalizedRecent = normalizeText(recent);
    if (!normalizedRecent) continue;
    if (normalizedCandidate === normalizedRecent) return true;
    const lexicalSimilarity = lexicalTopicSimilarity(
      normalizedCandidate,
      normalizedRecent,
    );
    if (lexicalSimilarity >= 0.58) {
      return true;
    }
  }

  if (context.recentEmbeddings.length === 0) return false;

  const candidateEmbeddings = await maybeEmbedTexts([topic]);
  const candidateEmbedding = candidateEmbeddings[0];
  if (!candidateEmbedding?.length) return false;

  for (const recentEmbedding of context.recentEmbeddings) {
    const semanticSimilarity = cosineSimilarity(
      candidateEmbedding,
      recentEmbedding,
    );
    if (semanticSimilarity >= 0.88) {
      return true;
    }
  }

  return false;
}

async function openAiGenerateOneLine(systemPrompt: string, userPrompt: string) {
  const { generateResponseText } = await import("@/lib/openai");
  return generateResponseText({
    systemPrompt,
    userPrompt,
  });
}

export const DEFAULT_FALLBACK_TOPIC = "expect the unexpected";

export async function generateCreativeTopic({
  used = [],
}: { used?: string[] } = {}) {
  try {
    const similarityContext = await buildTopicSimilarityContext(used);
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const lenses = sampleLenses(2);
      const raw = await openAiGenerateOneLine(
        [
          "You invent game topics for a party trivia prompt-writing game.",
          "Generate ONE topic that is specific, comical, and fun to write clever concepts from that are based on the topic.",
          "The topic should read like a phrase or sentance, and feel open-ended enough to generate many different concepts.",
          "Prioritize novelty in both framing and subject matter.",
          "Avoid defaulting to common pets plants or wildlife unless the twist is unusually original.",
          "Output only the topic text. No quotes. No numbering. No explanation.",
        ].join(" "),
        [
          `Recently used topics to avoid semantic overlap: ${similarityContext.recentTopics.join(" | ") || "none"}`,
          `Creative lenses to influence this attempt: ${lenses.join(" + ")}`,
          `Make it surprising, fun, and creative (nonce: ${randomNonce()}).`,
          "Aim for 5-10 words. Avoid punctuation.",
        ].join("\n"),
      );

      const topic = sanitizeSingleLineText(raw, 120);
      if (!topic) continue;
      if (await isTopicTooSimilar(topic, similarityContext)) {
        continue;
      }
      return topic;
    }

    return DEFAULT_FALLBACK_TOPIC;
  } catch (error) {
    console.error("generateCreativeTopic", error);
    return DEFAULT_FALLBACK_TOPIC;
  }
}

export async function generateCreativeConcept({
  topic,
  used = [],
}: {
  topic?: string | null;
  used?: string[];
}) {
  try {
    const raw = await openAiGenerateOneLine(
      [
        "You invent target concepts for a party prompt-writing game.",
        "Generate ONE target concept that is answerable, specific, and fun to write clever questions that describes the concept.",
        "The target can be a person, place, event, object, scientific idea, artwork, phenomenon, or cultural thing.",
        "Keep it recognizable but not too easy; avoid ultra-obscure trivia.",
        "Output only the concept text. No quotes. No numbering. No explanation.",
      ].join(" "),
      [
        `Topic: ${topic?.trim() || DEFAULT_FALLBACK_TOPIC}`,
        `Avoid these previous targets: ${used.slice(-20).join(" | ") || "none"}`,
        `Be original and varied (nonce: ${randomNonce()}).`,
        "Aim for 3-8 words. Avoid punctuation.",
      ].join("\n"),
    );

    const concept = sanitizeSingleLineText(raw, 96);
    if (!concept) {
      throw new Error("No concept generated: " + raw);
    }

    const normalizedUsed = new Set(used.map((value) => normalizeText(value)));
    if (normalizedUsed.has(normalizeText(concept))) {
      throw new Error("Concept was already used: " + concept);
    }
    return concept;
  } catch (error) {
    console.error("generateCreativeConcept", error);
    return "";
  }
}
