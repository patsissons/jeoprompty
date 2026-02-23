import { normalizeText } from "./text";

function randomNonce() {
  return Math.random().toString(36).slice(2, 10);
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

async function openAiGenerateOneLine(
  systemPrompt: string,
  userPrompt: string
) {
  const { generateResponseText } = await import("@/lib/openai");
  return generateResponseText({
    systemPrompt,
    userPrompt,
  });
}

const defaultFallbackTopic = "expect the unexpected";

export async function generateCreativeTopic() {
  try {
    const raw = await openAiGenerateOneLine(
      [
        "You invent game topics for a party trivia prompt-writing game.",
        "Generate ONE topic that is specific, comical, and fun to write clever concepts from that are based on the topic.",
        "The topic should read like a phrase or sentance, and feel open-ended enough to generate many different concepts.",
        "Output only the topic text. No quotes. No numbering. No explanation."
      ].join(" "),
      [
        `Make it surprising, fun, and creative (nonce: ${randomNonce()}).`,
        "Aim for 5-10 words. Avoid punctuation."
      ].join(" "),
    );

    const topic = sanitizeSingleLineText(raw, 120);
    return topic || defaultFallbackTopic;
  } catch (error) {
    console.error("generateCreativeTopic", error);
    return defaultFallbackTopic;
  }
}

export async function generateCreativeConcept({
  topic,
  used = []
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
        "Output only the concept text. No quotes. No numbering. No explanation."
      ].join(" "),
      [
        `Topic: ${topic?.trim() || defaultFallbackTopic}`,
        `Avoid these previous targets: ${used.slice(-20).join(" | ") || "none"}`,
        `Be original and varied (nonce: ${randomNonce()}).`,
        "Aim for 5-10 words. Avoid punctuation.",
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
