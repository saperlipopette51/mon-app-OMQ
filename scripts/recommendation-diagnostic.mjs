import { buildRecommendations, filmKey } from "../frontend/src/recommendations/engine.js";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

const AGES = ["all", "12", "16", "18"];
const PLATFORMS = ["netflix", "prime-video", "apple-tv", "disney-plus", "hbo-max"];
const GENRES = [
  "28",
  "12",
  "16",
  "35",
  "99",
  "18",
  "10751",
  "27",
  "10402",
  "10749",
  "878",
  "37",
];
const CONTENT_TYPES = ["film", "serie", "peu-importe"];
const ORIGINS = ["us", "coree", "europe", "peu-importe"];

const EUROPE_LANGS = new Set([
  "fr",
  "de",
  "it",
  "es",
  "sv",
  "da",
  "no",
  "fi",
  "nl",
  "pl",
]);

function uniqueByFilm(items) {
  const keys = new Set();
  const titles = new Set();
  const output = [];
  for (const item of items) {
    const key = String(filmKey(item));
    const title = String(item?.title || item?.raw?.title || "").trim().toLowerCase();
    if (keys.has(key)) continue;
    if (title && titles.has(title)) continue;
    keys.add(key);
    if (title) titles.add(title);
    output.push(item);
  }
  return output;
}

function normalizeQuizPayload({ age, platforms, genre, contentType, origin }) {
  const globalAnswers = {
    ageRestriction: age,
    platform: platforms[0] || "",
    platforms,
  };
  const users = [
    {
      firstName: "Test",
      genre,
      contentType,
      origin,
    },
  ];
  return {
    participantCount: 1,
    globalAnswers,
    users,
    aggregatedAnswers: {
      firstName: "Test",
      ageRestriction: age,
      platform: platforms[0] || "",
      genre,
      contentType,
      origin,
    },
  };
}

function relaxedPayload(payload, { relaxPlatform = false, relaxOrigin = false, relaxAge = false }) {
  const platforms = Array.isArray(payload.globalAnswers.platforms)
    ? payload.globalAnswers.platforms
    : [];
  const platform = relaxPlatform ? "" : platforms[0] || "";
  return {
    ...payload,
    globalAnswers: {
      ...payload.globalAnswers,
      platform,
      platforms: relaxPlatform ? [] : platforms,
      ageRestriction: relaxAge ? "" : payload.globalAnswers.ageRestriction,
    },
    aggregatedAnswers: {
      ...payload.aggregatedAnswers,
      platform,
      origin: relaxOrigin ? "peu-importe" : payload.aggregatedAnswers.origin,
      ageRestriction: relaxAge ? "" : payload.aggregatedAnswers.ageRestriction,
    },
  };
}

async function fetchFilms(query) {
  const params = new URLSearchParams();
  params.set("language", "fr-FR");
  params.set("page", String(query.page || 1));
  if (query.platform) params.set("platform", query.platform);
  if (query.ageRestriction) params.set("ageRestriction", query.ageRestriction);
  if (query.genre) params.set("genre", query.genre);
  if (query.contentType) params.set("contentType", query.contentType);
  if (query.origin) params.set("origin", query.origin);

  const response = await fetch(`${API_BASE_URL}/films?${params.toString()}`, {
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.value)) return payload.value;
  return [];
}

async function buildPool(caseInput) {
  const stages = [
    { key: "strict", usePlatform: true, useOrigin: true, useAge: true },
    { key: "relax_platform", usePlatform: false, useOrigin: true, useAge: true },
    { key: "relax_country", usePlatform: false, useOrigin: false, useAge: true },
    { key: "relax_age", usePlatform: false, useOrigin: false, useAge: false },
  ];
  const pages = [1, 2, 3, 4];
  let pool = [];
  let stageUsed = "";

  for (const stage of stages) {
    const requestPlatforms =
      stage.usePlatform && caseInput.platforms.length ? caseInput.platforms : [""];
    const responses = await Promise.allSettled(
      requestPlatforms.flatMap((platform) =>
        pages.map((page) =>
          fetchFilms({
            page,
            platform,
            ageRestriction: stage.useAge ? caseInput.age : "",
            genre: caseInput.genre,
            contentType: caseInput.contentType,
            origin: stage.useOrigin ? caseInput.origin : "",
          })
        )
      )
    );
    const stageFilms = responses
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value);
    pool = uniqueFilms([...pool, ...stageFilms]);
    if (!stageUsed && stage.key !== "strict" && stageFilms.length > 0) {
      stageUsed = stage.key;
    }
    if (pool.length >= 30) break;
  }

  if (pool.length < 12) {
    const responses = await Promise.allSettled(
      [1, 2, 3, 4, 5, 6, 7, 8].map((page) =>
        fetchFilms({
          page,
          genre: caseInput.genre,
          contentType: caseInput.contentType,
        })
      )
    );
    const booster = responses
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value);
    pool = uniqueFilms([...pool, ...booster]);
  }

  return { pool, stageUsed };
}

function uniqueFilms(items) {
  const keys = new Set();
  const titles = new Set();
  const output = [];
  for (const item of items) {
    const key = String(item?.id ?? "");
    const title = String(item?.title || "").trim().toLowerCase();
    if (key && keys.has(key)) continue;
    if (title && titles.has(title)) continue;
    if (key) keys.add(key);
    if (title) titles.add(title);
    output.push(item);
  }
  return output;
}

function buildRecommendationsForCase(pool, caseInput, randomize = false) {
  const basePayload = normalizeQuizPayload(caseInput);
  const stages = [
    { relaxPlatform: false, relaxOrigin: false, relaxAge: false },
    { relaxPlatform: true, relaxOrigin: false, relaxAge: false },
    { relaxPlatform: true, relaxOrigin: true, relaxAge: false },
    { relaxPlatform: true, relaxOrigin: true, relaxAge: true },
  ];
  let merged = [];

  for (const stage of stages) {
    if (merged.length >= 5) break;
    const payload = relaxedPayload(basePayload, stage);
    const platforms = stage.relaxPlatform ? [""] : caseInput.platforms;
    const platformScopes = platforms.length ? platforms : [""];
    for (const platform of platformScopes) {
      const scopedPayload = {
        ...payload,
        globalAnswers: {
          ...payload.globalAnswers,
          platform,
          platforms: platform ? [platform] : [],
        },
        aggregatedAnswers: {
          ...payload.aggregatedAnswers,
          platform,
        },
      };
      const items = buildRecommendations({
        films: pool,
        quizPayload: scopedPayload,
        answers: scopedPayload.aggregatedAnswers,
        max: 5,
        randomize,
      });
      merged = uniqueByFilm([...merged, ...items]).slice(0, 5);
      if (merged.length >= 5) break;
    }
  }

  return merged;
}

function hasSelectedGenre(item, genre) {
  const ids = Array.isArray(item?.raw?.genre_ids) ? item.raw.genre_ids.map(String) : [];
  return ids.includes(String(genre));
}

function typeMatches(item, contentType) {
  if (!contentType || contentType === "peu-importe") return true;
  const rawType = String(item?.raw?.type || item?.raw?.media_type || "").toLowerCase();
  if (contentType === "serie") return rawType === "serie" || rawType === "tv";
  return rawType === "film" || rawType === "movie";
}

function originLooksCoherent(item, origin) {
  if (!origin || origin === "peu-importe") return true;
  const lang = String(item?.raw?.original_language || "").toLowerCase();
  if (origin === "us") return lang === "en";
  if (origin === "coree") return lang === "ko";
  if (origin === "europe") return EUROPE_LANGS.has(lang);
  return true;
}

function ageLooksCoherent(item, age) {
  if (!age) return true;
  if (age !== "18" && item?.raw?.adult) return false;
  const raw = String(item?.raw?.age_restriction || item?.raw?.certification || "").toUpperCase();
  if (!raw) return true;
  if (age === "all") return !["R", "NC-17", "TV-MA"].includes(raw);
  if (age === "12") return !["R", "NC-17", "TV-MA"].includes(raw);
  if (age === "16") return !["NC-17"].includes(raw);
  return true;
}

function evaluate(caseInput, recommendations, stageUsed) {
  const issues = [];
  if (recommendations.length < 5) issues.push(`moins de 5 resultats (${recommendations.length})`);
  const keys = recommendations.map((item) => String(filmKey(item)));
  if (new Set(keys).size !== keys.length) issues.push("doublon detecte");

  const genreMatches = recommendations.filter((item) => hasSelectedGenre(item, caseInput.genre)).length;
  const typeMatchesCount = recommendations.filter((item) =>
    typeMatches(item, caseInput.contentType)
  ).length;
  const ageMatchesCount = recommendations.filter((item) =>
    ageLooksCoherent(item, caseInput.age)
  ).length;
  const originMatchesCount = recommendations.filter((item) =>
    originLooksCoherent(item, caseInput.origin)
  ).length;

  if (genreMatches < recommendations.length) {
    issues.push(`genre incoherent (${genreMatches}/${recommendations.length})`);
  }
  if (typeMatchesCount < recommendations.length) {
    issues.push(`type incoherent (${typeMatchesCount}/${recommendations.length})`);
  }
  if (ageMatchesCount < recommendations.length) {
    issues.push(`age incoherent (${ageMatchesCount}/${recommendations.length})`);
  }
  if (caseInput.origin !== "peu-importe" && originMatchesCount === 0 && !stageUsed) {
    issues.push(`origine incoherente (${originMatchesCount}/${recommendations.length})`);
  }

  return {
    issues,
    genreMatches,
    typeMatchesCount,
    ageMatchesCount,
    originMatchesCount,
  };
}

function buildTestCases() {
  const cases = [];
  const platformGroups = [
    ["netflix"],
    ["prime-video"],
    ["apple-tv"],
    ["disney-plus"],
    ["hbo-max"],
    ["netflix", "prime-video"],
    ["netflix", "prime-video", "disney-plus"],
  ];

  cases.push({
    name: "cas signale: tout public + Netflix/Prime + comedie + Europe",
    age: "all",
    platforms: ["netflix", "prime-video"],
    genre: "35",
    contentType: "film",
    origin: "europe",
  });

  for (const age of AGES) {
    for (const genre of GENRES) {
      cases.push({
        name: `age=${age} genre=${genre} film netflix europe`,
        age,
        platforms: ["netflix"],
        genre,
        contentType: "film",
        origin: "europe",
      });
    }
  }

  for (const platformGroup of platformGroups) {
    for (const contentType of CONTENT_TYPES) {
      for (const origin of ORIGINS) {
        cases.push({
          name: `matrix ${platformGroup.join("+")} ${contentType} ${origin}`,
          age: "all",
          platforms: platformGroup,
          genre: "35",
          contentType,
          origin,
        });
      }
    }
  }

  return cases;
}

async function main() {
  const health = await fetch(`${API_BASE_URL}/test`, {
    signal: AbortSignal.timeout(4000),
  }).then((response) => response.text());
  if (health.trim() !== "OK") {
    throw new Error(`Backend non OK: ${health}`);
  }

  const filter = String(process.env.DIAG_FILTER || "").trim().toLowerCase();
  const cases = buildTestCases().filter((testCase) =>
    filter ? testCase.name.toLowerCase().includes(filter) : true
  );
  const failures = [];
  const warnings = [];

  for (let index = 0; index < cases.length; index += 1) {
    const testCase = cases[index];
    const { pool, stageUsed } = await buildPool(testCase);
    const recommendations = buildRecommendationsForCase(pool, testCase, true);
    const evaluation = evaluate(testCase, recommendations, stageUsed);

    const record = {
      name: testCase.name,
      pool: pool.length,
      results: recommendations.length,
      stageUsed: stageUsed || "strict",
      titles: recommendations.map((item) => item.title),
      issues: evaluation.issues,
    };

    if (recommendations.length === 0 || evaluation.issues.some((issue) => issue.includes("moins de 5"))) {
      failures.push(record);
    } else if (evaluation.issues.length > 0 || stageUsed) {
      warnings.push(record);
    }

    console.log(
      `[${index + 1}/${cases.length}] ${evaluation.issues.length ? "WARN" : "OK"} ${testCase.name} -> ${recommendations.length}/5 (pool ${pool.length}, ${stageUsed || "strict"})`
    );
    if (evaluation.issues.length) console.log("  issues:", evaluation.issues.join("; "));
    if (recommendations.length) console.log("  titres:", recommendations.map((item) => item.title).join(" | "));
  }

  console.log("\n=== SYNTHESE ===");
  console.log(`Cas testes: ${cases.length}`);
  console.log(`Echecs bloquants: ${failures.length}`);
  console.log(`Avertissements: ${warnings.length}`);

  if (failures.length) {
    console.log("\nEchecs:");
    for (const failure of failures.slice(0, 20)) {
      console.log(`- ${failure.name}: ${failure.issues.join("; ")} | pool=${failure.pool}`);
    }
  }

  if (warnings.length) {
    console.log("\nPremiers avertissements:");
    for (const warning of warnings.slice(0, 20)) {
      console.log(`- ${warning.name}: ${warning.issues.join("; ") || warning.stageUsed} | titres=${warning.titles.join(" / ")}`);
    }
  }

  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error("[DIAGNOSTIC][ERREUR]", error);
  process.exitCode = 1;
});
