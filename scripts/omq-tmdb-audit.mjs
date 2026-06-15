import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const backendDir = path.join(rootDir, "backend");
const enginePath = path.join(rootDir, "frontend", "src", "recommendations", "engine.js");
const reportDir = path.join(rootDir, "reports");
const reportPath = path.join(
  reportDir,
  `omq-tmdb-audit-${new Date().toISOString().replace(/[:.]/g, "-")}.md`
);

const PORT = Number(process.env.OMQ_AUDIT_PORT || 3187);
const API_BASE_URL = process.env.API_BASE_URL || `http://127.0.0.1:${PORT}`;
const SHOULD_START_BACKEND = !process.env.API_BASE_URL;
const RESULT_LIMIT = 5;

const GENRES = {
  action: "28",
  adventure: "12",
  animation: "16",
  comedy: "35",
  documentary: "99",
  drama: "18",
  family: "10751",
  horror: "27",
  music: "10402",
  romance: "10749",
  scifi: "878",
  thriller: "53",
  western: "37",
};

const GENRE_NAMES = {
  12: "aventure",
  16: "animation",
  18: "drame",
  27: "horreur",
  28: "action",
  35: "comedie",
  37: "western",
  53: "thriller",
  99: "documentaire",
  878: "science-fiction",
  9648: "mystere",
  10402: "musique",
  10749: "romance",
  10751: "famille",
  10759: "action",
  10762: "famille",
  10763: "documentaire",
  10764: "documentaire",
  10765: "science-fiction",
};

const ORIGIN_COUNTRIES = {
  us: new Set(["US"]),
  europe: new Set(["FR", "GB", "DE", "IT", "ES", "BE", "NL", "SE", "DK", "NO", "FI", "PL", "IE", "PT", "AT", "CH"]),
  asie: new Set(["KR", "JP", "CN", "HK", "TW", "IN", "TH", "ID", "PH", "VN", "MY", "SG"]),
};

const ORIGIN_LANGS = {
  us: new Set(["en"]),
  europe: new Set(["fr", "de", "it", "es", "sv", "da", "no", "fi", "nl", "pl", "pt"]),
  asie: new Set(["ko", "ja", "zh", "hi", "th", "id", "vi", "ms", "ta", "te"]),
};

const AGE_BUCKETS = {
  all: 0,
  12: 12,
  16: 16,
  18: 18,
};

const CERT_BUCKETS = {
  G: 0,
  PG: 0,
  "TV-Y": 0,
  "TV-Y7": 0,
  "TV-G": 0,
  "TV-PG": 0,
  "PG-13": 12,
  "TV-14": 12,
  R: 16,
  "TV-MA": 16,
  "NC-17": 18,
};

const scenarios = [
  {
    id: "adult-alone-western-dark",
    label: "adulte seul + western + sombre",
    group: "seul",
    mood: "sombre",
    ageRestriction: "18",
    platforms: ["netflix"],
    users: [{ name: "Solo", contentType: "film", genre: GENRES.western, origin: "us" }],
  },
  {
    id: "family-animation-light",
    label: "famille + animation + leger",
    group: "famille",
    mood: "leger",
    ageRestriction: "all",
    platforms: ["disney-plus"],
    users: [{ name: "Famille", contentType: "film", genre: GENRES.animation, origin: "peu-importe" }],
  },
  {
    id: "couple-romance-recent",
    label: "couple + romance + recent",
    group: "couple",
    mood: "recent",
    ageRestriction: "12",
    platforms: ["prime-video"],
    users: [{ name: "Couple", contentType: "film", genre: GENRES.romance, origin: "peu-importe" }],
  },
  {
    id: "friends-horror-surprise",
    label: "amis + horreur + surprise",
    group: "amis",
    mood: "surprise",
    ageRestriction: "16",
    platforms: ["netflix"],
    users: [{ name: "Groupe", contentType: "film", genre: GENRES.horror, origin: "peu-importe" }],
  },
  {
    id: "teen-action-popular",
    label: "ado + action + populaire",
    group: "amis",
    mood: "populaire",
    ageRestriction: "12",
    platforms: ["prime-video"],
    users: [{ name: "Ado", contentType: "film", genre: GENRES.action, origin: "us" }],
  },
  {
    id: "western-asian",
    label: "western + asiatique",
    group: "seul",
    mood: "surprise",
    ageRestriction: "16",
    platforms: ["netflix"],
    rare: true,
    users: [{ name: "Rare", contentType: "film", genre: GENRES.western, origin: "asie" }],
  },
  {
    id: "western-japanese",
    label: "western + japonais",
    group: "seul",
    mood: "surprise",
    ageRestriction: "16",
    platforms: ["netflix"],
    rare: true,
    note: "Le site regroupe actuellement japon/chine/coree dans le filtre asie.",
    queryOriginOverride: "japon",
    users: [{ name: "Japon", contentType: "film", genre: GENRES.western, origin: "asie" }],
  },
  {
    id: "western-chinese",
    label: "western + chinois",
    group: "seul",
    mood: "surprise",
    ageRestriction: "16",
    platforms: ["netflix"],
    rare: true,
    note: "Le site regroupe actuellement japon/chine/coree dans le filtre asie.",
    queryOriginOverride: "chine",
    users: [{ name: "Chine", contentType: "film", genre: GENRES.western, origin: "asie" }],
  },
  {
    id: "serie-thriller-adult",
    label: "serie + thriller + adulte",
    group: "couple",
    mood: "sombre",
    ageRestriction: "18",
    platforms: ["hbo-max"],
    users: [{ name: "Serie", contentType: "serie", genre: GENRES.thriller, origin: "peu-importe" }],
  },
  {
    id: "child-family-animation",
    label: "enfant + famille + animation",
    group: "famille",
    mood: "leger",
    ageRestriction: "all",
    platforms: ["disney-plus"],
    users: [{ name: "Enfant", contentType: "film", genre: GENRES.family, origin: "peu-importe" }],
  },
  {
    id: "documentary-us",
    label: "documentaire americain",
    group: "seul",
    mood: "recent",
    ageRestriction: "12",
    platforms: ["netflix"],
    users: [{ name: "Doc", contentType: "serie", genre: GENRES.documentary, origin: "us" }],
  },
  {
    id: "asian-horror-family",
    label: "horreur asiatique + tout public",
    group: "famille",
    mood: "leger",
    ageRestriction: "all",
    platforms: ["netflix"],
    rare: true,
    users: [{ name: "Famille", contentType: "serie", genre: GENRES.horror, origin: "asie" }],
  },
  {
    id: "europe-action-series",
    label: "serie europeenne + action",
    group: "amis",
    mood: "sombre",
    ageRestriction: "16",
    platforms: ["prime-video"],
    users: [{ name: "Europe", contentType: "serie", genre: GENRES.action, origin: "europe" }],
  },
  {
    id: "friends-comedy-action-recent",
    label: "3 personnes: comedie + action + film recent",
    group: "amis",
    mood: "recent",
    ageRestriction: "12",
    platforms: ["netflix", "prime-video"],
    users: [
      { name: "P1", contentType: "film", genre: GENRES.comedy, origin: "peu-importe" },
      { name: "P2", contentType: "film", genre: GENRES.action, origin: "peu-importe" },
      { name: "P3", contentType: "film", genre: "", origin: "us" },
    ],
  },
  {
    id: "family-mixed-animation-comedy-europe",
    label: "famille: animation + comedie + Europe",
    group: "famille",
    mood: "leger",
    ageRestriction: "all",
    platforms: ["disney-plus", "prime-video"],
    users: [
      { name: "Parent", contentType: "film", genre: GENRES.comedy, origin: "europe" },
      { name: "Enfant", contentType: "film", genre: GENRES.animation, origin: "peu-importe" },
    ],
  },
  {
    id: "couple-thriller-romance",
    label: "couple: thriller + romance",
    group: "couple",
    mood: "emouvant",
    ageRestriction: "16",
    platforms: ["netflix"],
    users: [
      { name: "P1", contentType: "film", genre: GENRES.thriller, origin: "peu-importe" },
      { name: "P2", contentType: "film", genre: GENRES.romance, origin: "peu-importe" },
    ],
  },
  {
    id: "friends-documentary-music-us",
    label: "amis: documentaire + musique + US",
    group: "amis",
    mood: "leger",
    ageRestriction: "12",
    platforms: ["netflix", "prime-video"],
    users: [
      { name: "P1", contentType: "film", genre: GENRES.documentary, origin: "us" },
      { name: "P2", contentType: "film", genre: GENRES.music, origin: "peu-importe" },
    ],
  },
  {
    id: "adult-scifi-thriller",
    label: "adulte + science-fiction + thriller",
    group: "seul",
    mood: "sombre",
    ageRestriction: "16",
    platforms: ["apple-tv"],
    users: [
      { name: "P1", contentType: "film", genre: GENRES.scifi, origin: "peu-importe" },
      { name: "P2", contentType: "film", genre: GENRES.thriller, origin: "peu-importe" },
    ],
  },
];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

function filmKey(item) {
  const raw = item?.raw || item;
  return `${raw?.type || raw?.media_type || "film"}:${raw?.id || normalizeText(raw?.title || raw?.name)}`;
}

function filmMemoryKeys(item) {
  const raw = item?.raw || item;
  const key = filmKey(item);
  const title = normalizeText(item?.title || raw?.title || raw?.name);
  return uniqueStrings([
    key,
    key ? `id:${key}` : "",
    title ? `title:${title}` : "",
  ]);
}

async function loadRecommendationEngine() {
  try {
    return await import(pathToFileURL(enginePath).href);
  } catch {
    const source = fs.readFileSync(enginePath, "utf8");
    const transformed = source
      .replace("export function buildRecommendations", "function buildRecommendations")
      .replace("export function filmKey", "function filmKey");
    const factory = new Function(`${transformed}\nreturn { buildRecommendations, filmKey };`);
    return factory();
  }
}

function startBackend() {
  if (!SHOULD_START_BACKEND) return { process: null, logs: [] };

  const logs = [];
  const child = spawn(process.execPath, ["server.js"], {
    cwd: backendDir,
    env: {
      ...process.env,
      PORT: String(PORT),
    },
    windowsHide: true,
  });

  const collect = (chunk) => {
    const text = chunk.toString();
    logs.push(text);
    if (logs.join("").length > 60000) logs.splice(0, logs.length - 80);
  };

  child.stdout.on("data", collect);
  child.stderr.on("data", collect);

  return { process: child, logs };
}

async function waitForBackend() {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    try {
      const response = await fetch(`${API_BASE_URL}/test`, {
        signal: AbortSignal.timeout(1500),
      });
      const text = await response.text();
      if (response.ok && text.trim() === "OK") return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`Backend indisponible sur ${API_BASE_URL}`);
}

function aggregateScenarioQuery(scenario) {
  const genres = uniqueStrings(scenario.users.map((user) => user.genre));
  const types = uniqueStrings(
    scenario.users
      .map((user) => user.contentType)
      .filter((value) => value && value !== "peu-importe")
  );
  const origins = uniqueStrings(
    scenario.users
      .map((user) => user.origin)
      .filter((value) => value && value !== "peu-importe")
  );
  const animationRequests = scenario.users.filter((user) => user.genre === GENRES.animation).length;

  return {
    ageRestriction: scenario.ageRestriction || "",
    genres: genres.join(","),
    contentType: types.length === 1 ? types[0] : "",
    origin: scenario.queryOriginOverride || (origins.length === 1 ? origins[0] : ""),
    animationCap:
      animationRequests === 0
        ? "0"
        : animationRequests === scenario.users.length
        ? "all"
        : "1",
  };
}

function buildQuizPayload(scenario) {
  const labels = scenario.platforms.map(platformLabel).filter(Boolean);
  const single = (key, ignoreFlexible = false) => {
    const values = uniqueStrings(
      scenario.users
        .map((user) => user[key])
        .filter((value) => value && (!ignoreFlexible || value !== "peu-importe"))
    );
    return values.length === 1 ? values[0] : "";
  };

  return {
    users: scenario.users.map((user, index) => ({
      firstName: user.name || `participant ${index + 1}`,
      genre: user.genre || "",
      contentType: user.contentType || "",
      origin: user.origin || "",
    })),
    globalAnswers: {
      ageRestriction: scenario.ageRestriction || "",
      platform: "",
      platforms: labels,
    },
    aggregatedAnswers: {
      genre: single("genre"),
      contentType: single("contentType", true),
      origin: single("origin", true),
      ageRestriction: scenario.ageRestriction || "",
      platform: "",
      platforms: labels,
    },
  };
}

function platformLabel(value) {
  return {
    netflix: "Netflix",
    "prime-video": "Prime Video",
    "apple-tv": "Apple TV",
    "disney-plus": "Disney+",
    "hbo-max": "HBO",
  }[value] || value || "";
}

function buildFilmsUrl(scenario, platform = "", page = 1, overrides = {}) {
  const params = new URLSearchParams();
  const query = { ...aggregateScenarioQuery(scenario), ...overrides };
  params.set("page", String(page));
  params.set("language", "fr-FR");
  if (platform) params.set("platform", platform);
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, String(value));
  }
  return `${API_BASE_URL}/films?${params.toString()}`;
}

async function fetchFilmsForScenario(scenario) {
  const platforms = scenario.platforms.length ? scenario.platforms : [""];
  const pages = [1, 2];
  const responses = [];

  for (const platform of platforms) {
    for (const page of pages) {
      const response = await fetch(buildFilmsUrl(scenario, platform, page), {
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        responses.push({ items: [], notice: `HTTP ${response.status}`, platform, page });
        continue;
      }
      const payload = await response.json();
      const items = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.value)
        ? payload.value
        : [];
      responses.push({ items, notice: payload?.notice || "", platform, page });
    }
  }

  const merged = dedupeFilms(responses.flatMap((entry) => entry.items));
  return {
    pool: merged,
    notices: uniqueStrings(responses.map((entry) => entry.notice)),
  };
}

function dedupeFilms(items) {
  const keys = new Set();
  const titles = new Set();
  const output = [];
  for (const item of items) {
    const key = filmKey(item);
    const title = normalizeText(item?.title || item?.name);
    if (key && keys.has(key)) continue;
    if (title && titles.has(title)) continue;
    if (key) keys.add(key);
    if (title) titles.add(title);
    output.push(item);
  }
  return output;
}

function prepareFilmForEngine(item) {
  const title = item.title || item.name || "Titre inconnu";
  const year = item.year || yearFromDate(item.release_date || item.first_air_date);
  const poster = normalizePosterUrl(item.poster_url || item.poster_path || item.posterUri);
  return {
    ...item,
    title,
    year,
    type: String(item.type || item.media_type || "").toLowerCase(),
    genre: item.genre || (Array.isArray(item.genres) ? item.genres.join(", ") : ""),
    genres: Array.isArray(item.genres) ? item.genres : [],
    poster_url: poster,
    posterUri: poster,
    raw: item.raw || item,
  };
}

function yearFromDate(value) {
  const text = String(value || "");
  return /^\d{4}/.test(text) ? Number(text.slice(0, 4)) : "";
}

function normalizePosterUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  return `https://image.tmdb.org/t/p/w500${text.startsWith("/") ? text : `/${text}`}`;
}

function buildRecommendationsForScenario(engine, scenario, pool, options = {}) {
  const prepared = pool.map(prepareFilmForEngine);
  const quizPayload = buildQuizPayload(scenario);
  return engine.buildRecommendations({
    films: prepared,
    quizPayload,
    answers: quizPayload.aggregatedAnswers,
    max: RESULT_LIMIT,
    randomize: Boolean(options.randomize),
    excludedKeys: options.excludedKeys || [],
    avoidTitles: options.avoidTitles || [],
  });
}

function itemGenreIds(item) {
  const raw = item?.raw || item;
  return Array.isArray(raw?.genre_ids)
    ? raw.genre_ids.map(Number).filter((value) => Number.isFinite(value))
    : [];
}

function itemType(item) {
  const raw = item?.raw || item;
  return String(raw?.type || raw?.media_type || "").toLowerCase();
}

function itemCountries(item) {
  const raw = item?.raw || item;
  const values = [
    ...(Array.isArray(raw?.origin_country) ? raw.origin_country : [raw?.origin_country]),
    ...(Array.isArray(raw?.country) ? raw.country : [raw?.country]),
  ];
  return uniqueStrings(values
    .flatMap((value) => String(value || "").split(/[|,\s/]+/))
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean));
}

function itemOriginMatches(item, origin) {
  if (!origin || origin === "peu-importe") return true;
  const normalized = ["japon", "chine", "coree"].includes(origin) ? "asie" : origin;
  const countries = itemCountries(item);
  const countrySet = ORIGIN_COUNTRIES[normalized];
  if (countries.length && countrySet) {
    return countries.some((country) => countrySet.has(country));
  }
  const raw = item?.raw || item;
  const language = String(raw?.original_language || "").toLowerCase();
  return ORIGIN_LANGS[normalized]?.has(language) || false;
}

function certBucket(item) {
  const raw = item?.raw || item;
  const certification = String(raw?.certification || raw?.age_restriction || "").toUpperCase();
  if (certification in CERT_BUCKETS) return CERT_BUCKETS[certification];
  const numeric = certification.match(/\d{2}/)?.[0];
  if (numeric) return Number(numeric);
  if (raw?.adult) return 18;
  return null;
}

function itemAgeOk(item, ageRestriction) {
  if (!ageRestriction || !(ageRestriction in AGE_BUCKETS)) return true;
  const bucket = certBucket(item);
  if (bucket === null) return "unknown";
  return bucket <= AGE_BUCKETS[ageRestriction];
}

function hasPoster(item) {
  const raw = item?.raw || item;
  return Boolean(item?.posterUri || item?.poster_url || raw?.poster_url || raw?.poster_path);
}

function selectedGenres(scenario) {
  return uniqueStrings(scenario.users.map((user) => user.genre));
}

function requestedTypes(scenario) {
  return uniqueStrings(
    scenario.users
      .map((user) => user.contentType)
      .filter((value) => value && value !== "peu-importe")
  );
}

function evaluateScenario(scenario, pool, recommendations) {
  const issues = [];
  const warnings = [];
  const genres = selectedGenres(scenario);
  const types = requestedTypes(scenario);
  const origin = aggregateScenarioQuery(scenario).origin;
  const keys = recommendations.map((item) => filmKey(item));
  const duplicateCount = keys.length - new Set(keys).size;
  const genreHits = recommendations.filter((item) =>
    !genres.length || genres.some((genre) => itemGenreIds(item).includes(Number(genre)))
  ).length;
  const typeHits = recommendations.filter((item) => {
    if (!types.length || types.length > 1) return true;
    return itemType(item) === types[0];
  }).length;
  const originHits = recommendations.filter((item) => itemOriginMatches(item, origin)).length;
  const ageStates = recommendations.map((item) => itemAgeOk(item, scenario.ageRestriction));
  const ageHits = ageStates.filter((value) => value === true || value === "unknown").length;
  const unknownAge = ageStates.filter((value) => value === "unknown").length;
  const posterHits = recommendations.filter(hasPoster).length;
  const representedGenres = genres.filter((genre) =>
    recommendations.some((item) => itemGenreIds(item).includes(Number(genre)))
  );
  const broadOriginCount = recommendations.filter((item) => itemCountries(item).length > 6).length;

  if (recommendations.length < RESULT_LIMIT) {
    if (scenario.rare) {
      warnings.push(`peu de resultats coherents (${recommendations.length}/${RESULT_LIMIT})`);
    } else {
      issues.push(`moins de ${RESULT_LIMIT} resultats (${recommendations.length})`);
    }
  }
  if (duplicateCount > 0) issues.push(`${duplicateCount} doublon(s)`);
  if (genreHits < recommendations.length) issues.push(`genre demande respecte ${genreHits}/${recommendations.length}`);
  if (typeHits < recommendations.length) issues.push(`type demande respecte ${typeHits}/${recommendations.length}`);
  if (origin && origin !== "peu-importe" && originHits < recommendations.length) {
    issues.push(`origine demandee respectee ${originHits}/${recommendations.length}`);
  }
  if (ageHits < recommendations.length) issues.push(`age/public coherent ${ageHits}/${recommendations.length}`);
  if (unknownAge) warnings.push(`age inconnu sur ${unknownAge} resultat(s)`);
  if (posterHits < recommendations.length) warnings.push(`affiche disponible ${posterHits}/${recommendations.length}`);
  if (broadOriginCount) {
    warnings.push(`origine trop large sur ${broadOriginCount} resultat(s)`);
  }
  if (scenario.queryOriginOverride) {
    const expectedCountry = scenario.queryOriginOverride === "japon" ? "JP" : scenario.queryOriginOverride === "chine" ? "CN" : "";
    const exactCountryHits = expectedCountry
      ? recommendations.filter((item) => itemCountries(item).length <= 3 && itemCountries(item).includes(expectedCountry)).length
      : 0;
    if (expectedCountry && exactCountryHits < recommendations.length) {
      warnings.push(
        `filtre ${scenario.queryOriginOverride} non verifiable: le backend regroupe encore toute l'Asie`
      );
    }
  }
  if (genres.length > 1 && representedGenres.length < Math.min(genres.length, 2)) {
    issues.push(`compromis multi-personnes faible (${representedGenres.length}/${genres.length} genres representes)`);
  }
  if (scenario.mood === "recent") {
    const recentHits = recommendations.filter((item) => Number(item.year) >= 2020).length;
    if (recentHits < Math.min(3, recommendations.length)) {
      warnings.push(`ambiance recent faible (${recentHits}/${recommendations.length})`);
    }
  }
  if (scenario.group === "famille") {
    const risky = recommendations.filter((item) => {
      const ids = itemGenreIds(item);
      return ids.includes(27) || certBucket(item) > 12;
    }).length;
    if (risky) issues.push(`selection famille contient ${risky} titre(s) a risque`);
  }

  return {
    status: issues.length ? "A corriger" : warnings.length ? "A surveiller" : "OK",
    issues,
    warnings,
    metrics: {
      pool: pool.length,
      results: recommendations.length,
      genreHits,
      typeHits,
      originHits,
      ageHits,
      posterHits,
      representedGenres: representedGenres.map((genre) => GENRE_NAMES[genre] || genre),
    },
  };
}

function formatResult(item, index) {
  const raw = item.raw || item;
  const ids = itemGenreIds(item).map((id) => GENRE_NAMES[id] || id).join(", ") || "-";
  const countries = itemCountries(item).join(", ") || "-";
  const score = Number(item.score || raw.backend_rank_score || 0);
  return {
    rank: index + 1,
    tmdbId: raw.id || item.id || "",
    title: item.title || raw.title || raw.name || "",
    year: item.year || raw.year || yearFromDate(raw.release_date || raw.first_air_date) || "",
    type: itemType(item) || "-",
    genres: ids,
    origin: countries,
    language: raw.original_language || "",
    certification: raw.certification || raw.age_restriction || "",
    score: Number.isFinite(score) ? Math.round(score) : "",
    poster: hasPoster(item) ? "oui" : "non",
  };
}

function runSurpriseTest(engine, scenario, pool) {
  let skippedKeys = [];
  let skippedTitles = [];
  const rounds = [];
  let current = buildRecommendationsForScenario(engine, scenario, pool, {
    excludedKeys: skippedKeys,
    avoidTitles: skippedTitles,
  });
  rounds.push({ label: "normal", ids: current.map(filmKey), titles: current.map((item) => item.title) });

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    skippedKeys = uniqueStrings([...skippedKeys, ...current.flatMap(filmMemoryKeys)]);
    skippedTitles = uniqueStrings([...skippedTitles, ...current.map((item) => item.title)]);
    current = buildRecommendationsForScenario(engine, scenario, pool, {
      excludedKeys: skippedKeys,
      avoidTitles: skippedTitles,
      randomize: true,
    });
    rounds.push({
      label: `surprise ${attempt}`,
      ids: current.map(filmKey),
      titles: current.map((item) => item.title),
    });
  }

  const changes = [];
  const seen = new Map();
  const repeatedTitles = [];
  for (let index = 1; index < rounds.length; index += 1) {
    const previous = new Set(rounds[index - 1].ids);
    const overlap = rounds[index].ids.filter((id) => previous.has(id)).length;
    changes.push(overlap < rounds[index].ids.length);
  }
  for (const round of rounds) {
    for (const title of round.titles) {
      const key = normalizeText(title);
      if (!key) continue;
      const previous = seen.get(key);
      if (previous) repeatedTitles.push(`${title} (${previous} puis ${round.label})`);
      else seen.set(key, round.label);
    }
  }

  return {
    rounds,
    changes,
    repeatedTitles,
    blockedMessage: "Tu as utilise tes 3 surprises pour ce quiz. Refais le quiz pour repartir a zero.",
    ok: changes.every(Boolean) && repeatedTitles.length === 0,
  };
}

function runSeenTest(engine, scenario, pool) {
  const initial = buildRecommendationsForScenario(engine, scenario, pool);
  const first = initial[0];
  if (!first) {
    return { ok: false, message: "aucun resultat initial", removed: "", nextTitles: [] };
  }
  const removedKey = filmKey(first);
  const next = buildRecommendationsForScenario(engine, scenario, pool, {
    excludedKeys: [removedKey],
    avoidTitles: [first.title],
  });
  return {
    ok: !next.some((item) => filmKey(item) === removedKey || normalizeText(item.title) === normalizeText(first.title)),
    message: "Le titre marque deja vu ne doit plus revenir dans une recherche similaire.",
    removed: `${first.title} (${removedKey})`,
    nextTitles: next.map((item) => item.title),
  };
}

function runFavoriteStaticTest() {
  const source = fs.readFileSync(path.join(rootDir, "backend", "public", "app.js"), "utf8");
  const checks = [
    ["cle localStorage favoris", /const STORAGE_KEY = "omq-web-favorites-v1"/.test(source)],
    ["chargement favoris", /function loadFavorites\(\)/.test(source) && /localStorage\.getItem\(STORAGE_KEY\)/.test(source)],
    ["sauvegarde favoris", /function saveFavorites\(\)/.test(source) && /localStorage\.setItem\(STORAGE_KEY/.test(source)],
    ["limite 2 favoris", /const FAVORITE_ADD_LIMIT = 2/.test(source)],
  ];
  return {
    ok: checks.every(([, ok]) => ok),
    checks,
  };
}

function titlesSignature(results) {
  return results.map((item) => normalizeText(item.title)).join("|");
}

function analyzeRepetition(records) {
  const titleCounts = new Map();
  const signatures = new Map();
  for (const record of records) {
    signatures.set(record.id, titlesSignature(record.recommendations));
    for (const item of record.recommendations) {
      const title = normalizeText(item.title);
      if (!title) continue;
      titleCounts.set(title, (titleCounts.get(title) || 0) + 1);
    }
  }
  const repeatedTitles = [...titleCounts.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([title, count]) => ({ title, count }));

  return { repeatedTitles };
}

function renderMarkdown({ records, surpriseTest, seenTest, favoriteTest, repetition, serverLogs }) {
  const lines = [];
  lines.push("# Rapport d'audit TMDB - OMQ");
  lines.push("");
  lines.push(`Date: ${new Date().toLocaleString("fr-FR")}`);
  lines.push(`Source: backend local ${API_BASE_URL}, donnees TMDB reelles si les logs indiquent credentials detected.`);
  lines.push("");
  lines.push("## Synthese");
  const ok = records.filter((record) => record.evaluation.status === "OK").length;
  const warn = records.filter((record) => record.evaluation.status === "A surveiller").length;
  const fail = records.filter((record) => record.evaluation.status === "A corriger").length;
  lines.push(`- Scenarios testes: ${records.length}`);
  lines.push(`- OK: ${ok}`);
  lines.push(`- A surveiller: ${warn}`);
  lines.push(`- A corriger: ${fail}`);
  lines.push(`- Surprends-moi: ${surpriseTest.ok ? "OK" : "A surveiller"}`);
  lines.push(`- Deja vu: ${seenTest.ok ? "OK" : "A corriger"}`);
  lines.push(`- Favoris localStorage: ${favoriteTest.ok ? "OK" : "A verifier dans navigateur"}`);
  lines.push("");
  lines.push("## Limites constatees");
  lines.push("- Le site n'a pas encore de vrai filtre d'ambiance. Les mots drole, leger, sombre, emouvant, culte ou surprise ne sont donc pas directement envoyes au moteur.");
  lines.push("- Le site n'a pas encore de filtre duree.");
  lines.push("- Le filtre pays detaille n'existe pas encore: Japon, Chine et Coree sont regroupes dans `asie`.");
  lines.push("- La disponibilite plateforme est une indication issue des requetes TMDB/watch providers; elle doit rester affichee avec prudence.");
  lines.push("");

  lines.push("## Scenarios");
  for (const record of records) {
    lines.push(`### ${record.label}`);
    lines.push(`Statut: ${record.evaluation.status}`);
    lines.push(`Pool TMDB: ${record.pool.length} titre(s). Resultats OMQ: ${record.recommendations.length}.`);
    if (record.note) lines.push(`Note: ${record.note}`);
    if (record.notices.length) lines.push(`Message TMDB/backend: ${record.notices.join(" | ")}`);
    if (record.rare && record.recommendations.length < RESULT_LIMIT) {
      lines.push("Message conseille: Il y a peu de resultats vraiment coherents pour cette combinaison. Voici les propositions les plus proches.");
    }
    if (record.evaluation.issues.length) lines.push(`Problemes: ${record.evaluation.issues.join("; ")}`);
    if (record.evaluation.warnings.length) lines.push(`A surveiller: ${record.evaluation.warnings.join("; ")}`);
    lines.push("");
    lines.push("| # | ID TMDB | Titre | Annee | Type | Genres | Origine | Age | Match | Affiche |");
    lines.push("|---|---:|---|---:|---|---|---|---|---:|---|");
    for (const result of record.formattedResults) {
      lines.push(
        `| ${result.rank} | ${result.tmdbId} | ${escapeTable(result.title)} | ${result.year || "-"} | ${result.type} | ${escapeTable(result.genres)} | ${escapeTable(result.origin)} | ${escapeTable(result.certification || "-")} | ${result.score || "-"} | ${result.poster} |`
      );
    }
    lines.push("");
  }

  lines.push("## Tests d'actions");
  lines.push("### Surprends-moi");
  lines.push(`Statut: ${surpriseTest.ok ? "OK" : "A surveiller"}`);
  for (const round of surpriseTest.rounds) {
    lines.push(`- ${round.label}: ${round.titles.join(" / ") || "aucun resultat"}`);
  }
  if (surpriseTest.repeatedTitles.length) {
    lines.push(`- Titres revenus pendant les surprises: ${surpriseTest.repeatedTitles.join(" ; ")}`);
  }
  lines.push(`- Au 4e clic attendu: ${surpriseTest.blockedMessage}`);
  lines.push("");
  lines.push("### Deja vu");
  lines.push(`Statut: ${seenTest.ok ? "OK" : "A corriger"}`);
  lines.push(`- Retire: ${seenTest.removed || "-"}`);
  lines.push(`- Recherche suivante: ${seenTest.nextTitles.join(" / ") || "-"}`);
  lines.push("");
  lines.push("### Favoris");
  lines.push(`Statut: ${favoriteTest.ok ? "OK statique" : "A verifier"}`);
  for (const [label, ok] of favoriteTest.checks) {
    lines.push(`- ${ok ? "OK" : "KO"} ${label}`);
  }
  lines.push("");

  lines.push("## Repetition des titres");
  if (repetition.repeatedTitles.length) {
    for (const entry of repetition.repeatedTitles.slice(0, 12)) {
      lines.push(`- ${entry.title}: ${entry.count} apparitions`);
    }
  } else {
    lines.push("- Aucun titre n'apparait dans 3 scenarios ou plus.");
  }
  lines.push("");

  lines.push("## Corrections proposees");
  lines.push("- Ajouter un vrai filtre `mood` dans le quiz et dans le scoring: leger, sombre, emouvant, culte, recent, surprise.");
  lines.push("- Ajouter un filtre pays detaille au lieu de regrouper Japon/Chine/Coree dans `asie`.");
  lines.push("- Ne jamais afficher une plateforme comme certaine si le resultat ne vient pas d'une requete TMDB avec watch provider exact.");
  lines.push("- Pour les combinaisons rares, afficher un message de rarete avant de relaxer les criteres.");
  lines.push("- Ajouter un test automatise de non-regression qui relance cette grille apres chaque changement du moteur.");
  lines.push("");

  const logs = serverLogs.join("");
  const credentialLine = logs.includes("TMDB credentials detected")
    ? "TMDB credentials detected"
    : logs.includes("TMDB credentials missing")
    ? "TMDB credentials missing"
    : "statut credentials non detecte dans les logs";
  lines.push("## Controle technique");
  lines.push(`- Logs backend: ${credentialLine}`);
  lines.push(`- Erreurs TMDB vues dans les logs: ${logs.includes("[TMDB] Error") ? "oui" : "non"}`);
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function escapeTable(value) {
  return String(value || "").replace(/\|/g, "/");
}

async function main() {
  fs.mkdirSync(reportDir, { recursive: true });
  const engine = await loadRecommendationEngine();
  const backend = startBackend();
  let exitCode = 0;

  try {
    await waitForBackend();
    const records = [];

    for (const scenario of scenarios) {
      process.stdout.write(`[AUDIT] ${scenario.label}... `);
      const { pool, notices } = await fetchFilmsForScenario(scenario);
      const recommendations = buildRecommendationsForScenario(engine, scenario, pool);
      const evaluation = evaluateScenario(scenario, pool, recommendations);
      const formattedResults = recommendations.map(formatResult);
      records.push({
        ...scenario,
        pool,
        notices,
        recommendations,
        evaluation,
        formattedResults,
      });
      process.stdout.write(`${evaluation.status} (${recommendations.length}/${RESULT_LIMIT})\n`);
    }

    const actionScenario = records.find((record) => record.id === "friends-comedy-action-recent") || records[0];
    const surpriseTest = runSurpriseTest(engine, actionScenario, actionScenario.pool);
    const seenTest = runSeenTest(engine, actionScenario, actionScenario.pool);
    const favoriteTest = runFavoriteStaticTest();
    const repetition = analyzeRepetition(records);
    const markdown = renderMarkdown({
      records,
      surpriseTest,
      seenTest,
      favoriteTest,
      repetition,
      serverLogs: backend.logs,
    });

    fs.writeFileSync(reportPath, markdown, "utf8");

    const failures = records.filter((record) => record.evaluation.status === "A corriger");
    if (failures.length || !surpriseTest.ok || !seenTest.ok || !favoriteTest.ok) {
      exitCode = 1;
    }

    console.log(`\n[AUDIT] Rapport cree: ${reportPath}`);
    console.log(
      `[AUDIT] Synthese: ${records.length - failures.length}/${records.length} scenarios sans correction bloquante.`
    );
  } finally {
    if (backend.process) {
      backend.process.kill();
    }
  }

  process.exitCode = exitCode;
}

main().catch((error) => {
  console.error("[AUDIT][ERREUR]", error?.message || error);
  process.exitCode = 1;
});
