import { normalizeText } from "./text";

export const DEFAULT_CONCEPTS = [
  "The Great Wall of China",
  "Photosynthesis",
  "Black Hole",
  "Mona Lisa",
  "World War II",
  "Mount Everest",
  "DNA replication",
  "The Internet",
  "French Revolution",
  "Pythagorean theorem",
  "Electricity",
  "Climate change",
  "Machine learning",
  "Shakespeare",
  "Solar eclipse",
  "Periodic table",
  "Amazon rainforest",
  "The Pacific Ocean",
  "Ancient Egypt",
  "Plate tectonics",
  "Bitcoin",
  "Basketball",
  "The human brain",
  "Vaccines",
  "The Moon landing",
  "Tokyo",
  "Jazz music",
  "Volcano",
  "Gravity",
  "Mars rover",
  "The Renaissance",
  "Opera",
  "Blockchain",
  "Neural network",
  "Penguins",
  "The Statue of Liberty",
  "Cloud computing",
  "Game theory",
  "Roman Empire",
  "Antarctica",
  "Hurricane",
  "Photoshop",
  "Coral reef",
  "Artificial intelligence",
  "The Nile River",
  "Chess",
  "Olympic Games",
  "Saturn rings",
  "Quantum mechanics",
  "Renewable energy",
  "Bee pollination",
  "The Grand Canyon",
  "Internet memes",
  "Caffeine",
  "Solar panels",
  "Opera singer",
  "Fingerprint",
  "Human heart",
  "Submarine",
  "Tsunami"
] as const;

export const DEFAULT_GAME_TOPICS = [
  "Space",
  "History",
  "Science",
  "Technology",
  "Nature",
  "Geography",
  "Art",
  "Music",
  "Sports",
  "Health",
  "Animals"
] as const;

const QUIRKY_TOPIC_SEEDS = [
  "Space disco archaeology",
  "History as a chaotic courtroom drama",
  "Science fair disasters and accidental genius",
  "Technology from an alternate timeline",
  "Nature documentary narrated by goblins",
  "Geography as treasure-map rumors",
  "Art heists, forgeries, and dramatic reveals",
  "Music theory in a thunderstorm",
  "Sports legends and impossible comebacks",
  "Health myths vs. weird true facts",
  "Animals running a secret civilization"
] as const;

const TOPIC_VIBES = [
  "fever dream",
  "heist energy",
  "midnight radio",
  "retro-futurist chaos",
  "mythic drama",
  "campfire rumor energy",
  "science-fair panic",
  "festival madness",
  "conspiracy corkboard energy",
  "victorian sci-fi"
] as const;

const TOPIC_TWISTS = [
  "but everyone is overconfident",
  "with suspiciously high stakes",
  "as if a game show writer made it",
  "told like a legend",
  "with dramatic plot twists",
  "with tiny clues and huge reveals",
  "but make it stylish",
  "from a parallel universe",
  "where the experts are sleep-deprived",
  "as a very serious comedy"
] as const;

const TOPIC_AUDIENCES = [
  "for goblins",
  "for time travelers",
  "for detectives",
  "for pirates",
  "for mad scientists",
  "for museum thieves",
  "for trivia maniacs",
  "for secret agents",
  "for cosmic tourists",
  "for drama queens"
] as const;

const TOPIC_CONCEPT_INDEX: Record<string, readonly string[]> = {
  space: ["Black Hole", "The Moon landing", "Mars rover", "Saturn rings", "Solar eclipse"],
  history: [
    "World War II",
    "French Revolution",
    "Ancient Egypt",
    "The Renaissance",
    "Roman Empire",
    "The Moon landing"
  ],
  science: [
    "Photosynthesis",
    "DNA replication",
    "Pythagorean theorem",
    "Electricity",
    "Plate tectonics",
    "Quantum mechanics",
    "Gravity",
    "Climate change",
    "Vaccines"
  ],
  technology: [
    "The Internet",
    "Machine learning",
    "Blockchain",
    "Neural network",
    "Cloud computing",
    "Photoshop",
    "Artificial intelligence",
    "Bitcoin"
  ],
  nature: [
    "Amazon rainforest",
    "The Pacific Ocean",
    "Antarctica",
    "Hurricane",
    "Coral reef",
    "The Nile River",
    "Volcano",
    "Tsunami",
    "Bee pollination"
  ],
  geography: [
    "Mount Everest",
    "Tokyo",
    "The Grand Canyon",
    "The Pacific Ocean",
    "The Nile River",
    "Antarctica"
  ],
  art: ["Mona Lisa", "Shakespeare", "Opera", "Opera singer", "Photoshop", "The Renaissance"],
  music: ["Jazz music", "Opera", "Opera singer"],
  sports: ["Basketball", "Olympic Games", "Chess"],
  health: ["Vaccines", "The human brain", "Human heart", "Caffeine", "DNA replication"],
  animals: ["Penguins", "Bee pollination"]
};

const TOPIC_ALIASES: Record<string, string> = {
  astronomy: "space",
  cosmos: "space",
  planetary: "space",
  planets: "space",
  moon: "space",
  mars: "space",
  physics: "science",
  biology: "science",
  chemistry: "science",
  math: "science",
  mathematics: "science",
  ai: "technology",
  computing: "technology",
  software: "technology",
  tech: "technology",
  environment: "nature",
  earth: "nature",
  weather: "nature",
  travel: "geography",
  places: "geography",
  painting: "art",
  literature: "art",
  theater: "art",
  theatre: "art",
  songs: "music",
  athletics: "sports",
  games: "sports",
  medicine: "health",
  medical: "health",
  body: "health",
  wildlife: "animals",
  animal: "animals"
};

function randomItem<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function topicTokens(topic: string) {
  return normalizeText(topic)
    .split(" ")
    .map((token) => TOPIC_ALIASES[token] ?? token)
    .filter(Boolean);
}

function conceptTokenScore(concept: string, tokens: string[]) {
  if (tokens.length === 0) return 0;
  const normalizedConcept = normalizeText(concept);
  let score = 0;
  for (const token of tokens) {
    if (!token) continue;
    if (normalizedConcept.includes(token)) score += 2;
  }
  return score;
}

function themedConceptPool(topic: string) {
  const normalizedTopic = normalizeText(topic);
  const tokens = topicTokens(topic);

  const indexedMatches = unique(
    Object.entries(TOPIC_CONCEPT_INDEX)
      .filter(([key]) => {
        if (normalizedTopic === key) return true;
        if (normalizedTopic.includes(key) || key.includes(normalizedTopic)) return true;
        return tokens.includes(key);
      })
      .flatMap(([, concepts]) => [...concepts])
  );

  const scoredMatches = DEFAULT_CONCEPTS
    .map((concept) => ({
      concept,
      score: conceptTokenScore(concept, tokens)
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((row) => row.concept);

  return unique([...indexedMatches, ...scoredMatches]);
}

export function pickRandomTopic() {
  const primary = randomItem(DEFAULT_GAME_TOPICS);
  const secondary = randomItem(DEFAULT_GAME_TOPICS.filter((topic) => topic !== primary));
  const roll = Math.random();

  if (roll < 0.35) {
    return `${primary}: ${randomItem(QUIRKY_TOPIC_SEEDS)}`;
  }
  if (roll < 0.65) {
    return `${primary} with ${randomItem(TOPIC_VIBES)} (${randomItem(TOPIC_AUDIENCES)})`;
  }
  if (roll < 0.85) {
    return `${primary} x ${secondary} ${randomItem(TOPIC_VIBES)}`;
  }
  return `${primary}, ${randomItem(TOPIC_TWISTS)} (${randomItem(TOPIC_AUDIENCES)})`;
}

export function pickConcept(used: string[], topic?: string | null) {
  const available = DEFAULT_CONCEPTS.filter((c) => !used.includes(c));
  const pool = available.length > 0 ? available : [...DEFAULT_CONCEPTS];
  const poolStrings = pool as readonly string[];
  const themedPool = topic?.trim()
    ? themedConceptPool(topic).filter((concept) => poolStrings.includes(concept))
    : [];
  return randomItem(themedPool.length > 0 ? themedPool : pool);
}

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

function topicAnchorList() {
  return DEFAULT_GAME_TOPICS.join(", ");
}

function fallbackCreativeTopic() {
  return pickRandomTopic();
}

function fallbackCreativeConcept(topic: string | null | undefined, used: string[]) {
  return pickConcept(used, topic);
}

export async function generateCreativeTopic() {
  try {
    const raw = await openAiGenerateOneLine(
      [
        "You invent game topics for a party trivia prompt-writing game.",
        "Generate ONE fun, quirky, and creative but playable topic.",
        "The topic should feel open-ended enough for many different concepts.",
        "Output only the topic text. No quotes. No numbering. No explanation."
      ].join(" "),
      [
        `Make it surprising, fun, and ever so slightly chaotic (nonce: ${randomNonce()}).`,
        "Aim for 2-4 words. Avoid punctuation.",
        "Examples of vibe (not content to copy): midnight radio, museum heist, cosmic road trip, fever dream."
      ].join(" "),
    );

    const topic = sanitizeSingleLineText(raw, 120);
    return topic || fallbackCreativeTopic();
  } catch {
    return fallbackCreativeTopic();
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
        "Generate ONE target concept that is answerable, specific, and fun to write clever questions that describes the concept, jeopardy style.",
        "The target can be a person, place, event, object, scientific idea, artwork, phenomenon, or cultural thing.",
        "Keep it recognizable but not too easy; avoid ultra-obscure trivia.",
        "Avoid all conjunction, preposition, and logical marker words.",
        "Output only the concept text. No quotes. No numbering. No explanation."
      ].join(" "),
      [
        `Topic: ${topic?.trim() || "expect the unexpected"}`,
        `Avoid these previous targets: ${used.slice(-20).join(" | ") || "none"}`,
        `Be original and varied (nonce: ${randomNonce()}).`,
        "Aim for 3-5 words. Avoid punctuation.",
      ].join("\n"),
    );

    const concept = sanitizeSingleLineText(raw, 96);
    if (!concept) {
      return fallbackCreativeConcept(topic, used);
    }

    const normalizedUsed = new Set(used.map((value) => normalizeText(value)));
    if (normalizedUsed.has(normalizeText(concept))) {
      return fallbackCreativeConcept(topic, used);
    }
    return concept;
  } catch {
    return fallbackCreativeConcept(topic, used);
  }
}
