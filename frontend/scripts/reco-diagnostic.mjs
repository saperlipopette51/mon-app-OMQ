import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function loadEngineModule() {
  const enginePath = path.join(rootDir, "src", "recommendations", "engine.js");
  const source = fs.readFileSync(enginePath, "utf8");
  const transformed = source
    .replace("export function buildRecommendations", "function buildRecommendations")
    .replace("export function filmKey", "function filmKey");

  const factory = new Function(`${transformed}\nreturn { buildRecommendations, filmKey };`);
  return factory();
}

function majority(values) {
  const counts = new Map();
  for (const value of values) {
    const key = String(value || "").trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

function aggregateAnswers(quizPayload) {
  const users = Array.isArray(quizPayload.users) ? quizPayload.users : [];
  return {
    contentType: majority(users.map((user) => user.contentType)),
    mood: majority(users.map((user) => user.mood)),
    genre: majority(users.map((user) => user.genre)),
    origin: majority(users.map((user) => user.origin)),
    platform: quizPayload?.globalAnswers?.platform || "",
    ageRestriction: quizPayload?.globalAnswers?.ageRestriction || "",
  };
}

function uniqueFilms(items) {
  const ids = new Set();
  const titles = new Set();
  const output = [];
  for (const item of items) {
    const idKey = String(item?.id ?? "");
    const titleKey = String(item?.title || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    if (idKey && ids.has(idKey)) continue;
    if (titleKey && titles.has(titleKey)) continue;
    if (idKey) ids.add(idKey);
    if (titleKey) titles.add(titleKey);
    output.push(item);
  }
  return output;
}

function buildFilmsUrl(baseUrl, query = {}) {
  const params = new URLSearchParams();
  if (query.language) params.set("language", query.language);
  if (query.page) params.set("page", String(query.page));
  if (query.platform) params.set("platform", String(query.platform));
  if (query.ageRestriction) params.set("ageRestriction", String(query.ageRestriction));
  return `${baseUrl}/films?${params.toString()}`;
}

async function fetchFilms(apiBaseUrl, quizPayload) {
  const pageCandidates = [1, 2];
  const responses = [];

  for (const page of pageCandidates) {
    try {
      const response = await fetch(
        buildFilmsUrl(apiBaseUrl, {
          language: "fr-FR",
          page,
          platform: quizPayload.globalAnswers.platform,
          ageRestriction: quizPayload.globalAnswers.ageRestriction,
        })
      );
      if (!response.ok) continue;
      responses.push(await response.json());
    } catch (_error) {
      // Ignore failed page fetch in diagnostics and continue with available pages.
    }
  }

  const films = uniqueFilms(responses.flat());
  if (films.length === 0) {
    throw new Error("Aucun film recupere via /films pour ce scenario.");
  }
  return films;
}

function overlapRatio(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((value) => setB.has(value)).length;
  const denominator = Math.max(1, Math.min(setA.size, setB.size));
  return intersection / denominator;
}

const scenarios = [
  {
    name: "Action intense - Netflix - -16",
    payload: {
      globalAnswers: { platform: "netflix", ageRestriction: "16" },
      users: [
        { firstName: "Lina", contentType: "film", mood: "intense", genre: "action", origin: "us" },
        { firstName: "Malo", contentType: "film", mood: "surprenant", genre: "thriller", origin: "europe" },
      ],
    },
  },
  {
    name: "Romantique chill - Prime - tout public",
    payload: {
      globalAnswers: { platform: "prime-video", ageRestriction: "all" },
      users: [
        { firstName: "Emma", contentType: "film", mood: "romantique", genre: "romantique", origin: "europe" },
        { firstName: "Noe", contentType: "film", mood: "chill", genre: "comedie", origin: "us" },
      ],
    },
  },
  {
    name: "Science-fiction intelligente - Apple - -12",
    payload: {
      globalAnswers: { platform: "apple-tv", ageRestriction: "12" },
      users: [
        { firstName: "Aya", contentType: "film", mood: "intelligent", genre: "science-fiction", origin: "us" },
        { firstName: "Leo", contentType: "film", mood: "surprenant", genre: "science-fiction", origin: "europe" },
      ],
    },
  },
  {
    name: "Comedie fun - Netflix - tout public",
    payload: {
      globalAnswers: { platform: "netflix", ageRestriction: "all" },
      users: [
        { firstName: "Nina", contentType: "film", mood: "fun", genre: "comedie", origin: "europe" },
        { firstName: "Tom", contentType: "film", mood: "fun", genre: "comedie", origin: "us" },
      ],
    },
  },
  {
    name: "Thriller stressant - Prime - -18",
    payload: {
      globalAnswers: { platform: "prime-video", ageRestriction: "18" },
      users: [
        { firstName: "Sami", contentType: "film", mood: "stressant", genre: "thriller", origin: "us" },
        { firstName: "Iris", contentType: "film", mood: "intense", genre: "thriller", origin: "coree" },
      ],
    },
  },
];

async function main() {
  const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:3000";
  const { buildRecommendations } = loadEngineModule();

  const outputs = [];
  for (const scenario of scenarios) {
    const films = await fetchFilms(apiBaseUrl, scenario.payload);
    const aggregatedAnswers = aggregateAnswers(scenario.payload);
    const recommendations = buildRecommendations({
      films,
      answers: aggregatedAnswers,
      quizPayload: scenario.payload,
      max: 5,
      randomize: false,
      excludedKeys: [],
      avoidTitles: [],
    });

    outputs.push({
      name: scenario.name,
      titles: recommendations.map((item) => item.title),
      scores: recommendations.map((item) => item.score),
    });
  }

  console.log("=== Diagnostic Recommandations ===");
  outputs.forEach((entry, index) => {
    console.log(`\n[Scenario ${index + 1}] ${entry.name}`);
    entry.titles.forEach((title, idx) => {
      console.log(`  ${idx + 1}. ${title} (match ${entry.scores[idx]}%)`);
    });
  });

  console.log("\n=== Overlap entre scenarios (0 = totalement different, 1 = identique) ===");
  for (let i = 0; i < outputs.length; i += 1) {
    for (let j = i + 1; j < outputs.length; j += 1) {
      const ratio = overlapRatio(outputs[i].titles, outputs[j].titles);
      console.log(
        `- S${i + 1} vs S${j + 1}: ${(ratio * 100).toFixed(0)}% de titres communs`
      );
    }
  }
}

main().catch((error) => {
  console.error("[reco-diagnostic] erreur:", error?.message || error);
  process.exit(1);
});
