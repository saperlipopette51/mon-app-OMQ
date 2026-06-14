const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

console.log("[BOOT] server.js is executing");
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const PUBLIC_ASSETS_DIR = path.join(PUBLIC_DIR, "assets");
const FRONTEND_RECOMMENDATION_ENGINE = path.join(
  __dirname,
  "..",
  "frontend",
  "src",
  "recommendations",
  "engine.js"
);

app.use(
  "/assets",
  express.static(PUBLIC_ASSETS_DIR, {
    maxAge: "7d",
  })
);

app.use(
  express.static(PUBLIC_DIR, {
    index: false,
    maxAge: 0,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "no-store");
    },
  })
);

function readEnvValue(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function readTmdbKeyFromEnvFile() {
  try {
    const content = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
    const namedMatch = content.match(
      /(?:^|\n)\s*(?:TMDB_API_KEY|tmdb_api_key|EXPO_PUBLIC_TMDB_API_KEY|expo_public_tmdb_api_key)\s*=\s*([a-z0-9]{32})/i
    );
    if (namedMatch?.[1]) return namedMatch[1].trim();

    const looseMatch = content.match(/\b[a-f0-9]{32}\b/i);
    return looseMatch?.[0]?.trim() || "";
  } catch {
    return "";
  }
}

const TMDB_API_KEY = readEnvValue(
  "TMDB_API_KEY",
  "tmdb_api_key",
  "EXPO_PUBLIC_TMDB_API_KEY",
  "expo_public_tmdb_api_key"
) || readTmdbKeyFromEnvFile();
const TMDB_BEARER_TOKEN = readEnvValue("TMDB_BEARER_TOKEN", "tmdb_bearer_token");
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const FILMS_CACHE_TTL_MS = Number(process.env.FILMS_CACHE_TTL_MS || 10 * 60 * 1000);
const FILMS_CACHE_MAX_ENTRIES = Number(process.env.FILMS_CACHE_MAX_ENTRIES || 150);
const TMDB_CACHE_TTL_MS = Number(process.env.TMDB_CACHE_TTL_MS || 5 * 60 * 1000);
const TMDB_CACHE_MAX_ENTRIES = Number(process.env.TMDB_CACHE_MAX_ENTRIES || 300);
const filmsCache = new Map();
const filmsInFlight = new Map();
const tmdbJsonCache = new Map();
const tmdbInFlight = new Map();
const movieCertificationCache = new Map();

const GENRE_NAMES = {
  12: "Aventure",
  14: "Fantastique",
  16: "Animation",
  18: "Drame",
  27: "Horreur",
  28: "Action",
  35: "Comedie",
  36: "Historique",
  53: "Thriller",
  80: "Crime",
  878: "Science-fiction",
  9648: "Mystere",
  10749: "Romance",
  10751: "Familial",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Science-fiction/Fantastique",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

const TV_GENRE_FALLBACK_MAP = {
  12: "10759",
  28: "10759",
  878: "10765",
  14: "10765",
  27: "9648|18",
  53: "9648|18",
  10749: "18",
  10402: "35|18",
};

const REQUESTED_TV_GENRE_SIGNAL_KEYWORDS = {
  27: [
    "horror",
    "horrifique",
    "horreur",
    "terror",
    "terreur",
    "fright",
    "fear",
    "peur",
    "ghost",
    "fantome",
    "haunted",
    "monstre",
    "monster",
    "zombie",
    "vampire",
    "demon",
    "slasher",
  ],
  53: [
    "thriller",
    "suspense",
    "tension",
    "mystery",
    "mystere",
    "enquete",
    "investigation",
    "conspiracy",
    "complot",
    "serial killer",
    "kidnapping",
    "traque",
  ],
  10402: [
    "music",
    "musique",
    "musical",
    "song",
    "chanson",
    "singer",
    "chanteur",
    "band",
    "groupe",
    "concert",
    "rap",
    "rock",
    "jazz",
    "opera",
    "danse",
    "dance",
  ],
  10749: [
    "romance",
    "romantic",
    "love",
    "lovers",
    "relationship",
    "couple",
    "amour",
    "amoureux",
    "romantique",
    "relation",
    "sentimental",
  ],
};

const PLATFORM_WATCH_PROVIDER = {
  netflix: "8",
  "prime-video": "119",
  "apple-tv": "350",
  "disney-plus": "337",
  "hbo-max": "384|1899",
};

const PLATFORM_LABELS = {
  netflix: "Netflix",
  "prime-video": "Prime Video",
  "apple-tv": "Apple TV",
  "disney-plus": "Disney+",
  "hbo-max": "HBO",
};

const EUROPE_ORIGIN_COUNTRIES = [
  "FR",
  "GB",
  "DE",
  "IT",
  "ES",
  "BE",
  "NL",
  "SE",
  "DK",
  "NO",
  "FI",
  "PL",
  "IE",
  "PT",
  "AT",
  "CH",
];

const ASIA_ORIGIN_COUNTRIES = ["KR", "JP", "CN", "HK", "TW", "IN", "TH", "ID", "PH", "VN", "MY", "SG"];

const ORIGIN_LANGUAGE_HINTS = {
  us: ["en"],
  asie: ["ko", "ja", "zh", "hi", "ta", "te", "th", "id", "vi", "ms"],
  coree: ["ko", "ja", "zh", "hi", "ta", "te", "th", "id", "vi", "ms"],
  europe: ["fr", "de", "it", "es", "sv", "da", "no", "fi", "nl", "pl"],
};

const ORIGIN_COUNTRY_HINTS = {
  us: ["US"],
  asie: ASIA_ORIGIN_COUNTRIES,
  coree: ASIA_ORIGIN_COUNTRIES,
  europe: EUROPE_ORIGIN_COUNTRIES,
};

const PLATFORM_ALIASES = {
  "prime video": "prime-video",
  primevideo: "prime-video",
  amazon: "prime-video",
  "apple tv": "apple-tv",
  "apple tv+": "apple-tv",
  appletv: "apple-tv",
  "disney+": "disney-plus",
  "disney plus": "disney-plus",
  disney: "disney-plus",
  hbo: "hbo-max",
  max: "hbo-max",
  hbomax: "hbo-max",
  "hbo max": "hbo-max",
};

const AGE_CERTIFICATION_LTE = {
  all: "PG",
  12: "PG-13",
};

const STRICT_CERTIFICATIONS = {
  all: new Set(["G", "PG", "TV-G", "TV-PG"]),
  12: new Set(["PG-13"]),
  16: new Set(["R"]),
  18: new Set(["R", "NC-17"]),
};

const DEFAULT_FILMS = [
  {
    id: 1,
    title: "Inception",
    year: 2010,
    release_date: "2010-07-16",
    type: "film",
    genre: "Science-fiction, Thriller",
    genres: ["Science-fiction", "Thriller"],
    genre_ids: [878, 53],
    overview:
      "Un voleur specialise dans l'extraction de secrets en reve accepte une mission impossible : implanter une idee.",
    poster_path: "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
    poster_url: "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
    vote_average: 8.0,
    popularity: 70,
    original_language: "en",
  },
  {
    id: 2,
    title: "Intouchables",
    year: 2011,
    release_date: "2011-11-02",
    type: "film",
    genre: "Comedie, Drame",
    genres: ["Comedie", "Drame"],
    genre_ids: [35, 18],
    overview:
      "Un aristocrate devenu tetraplegique engage un auxiliaire de vie inattendu, et une amitie unique nait entre eux.",
    poster_path: "/323BP0itpxTsO0skTwdnVmf7YC9.jpg",
    poster_url: "https://image.tmdb.org/t/p/w500/323BP0itpxTsO0skTwdnVmf7YC9.jpg",
    vote_average: 8.2,
    popularity: 52,
    original_language: "fr",
  },
  {
    id: 3,
    title: "Parasite",
    year: 2019,
    release_date: "2019-05-30",
    type: "film",
    genre: "Drame, Thriller",
    genres: ["Drame", "Thriller"],
    genre_ids: [18, 53],
    overview:
      "Une famille modeste s'infiltre peu a peu dans le quotidien d'une famille aisee, avec des consequences explosives.",
    poster_path: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    poster_url: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    vote_average: 8.5,
    popularity: 64,
    original_language: "ko",
  },
];

const DEFAULT_SERIES = [
  {
    id: 10001,
    title: "Breaking Bad",
    year: 2008,
    release_date: "2008-01-20",
    type: "serie",
    genre: "Drame, Crime",
    genres: ["Drame", "Crime"],
    genre_ids: [18, 80],
    overview:
      "Un professeur de chimie malade bascule dans le crime pour proteger sa famille.",
    poster_path: "/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg",
    poster_url: "https://image.tmdb.org/t/p/w500/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg",
    vote_average: 8.9,
    popularity: 90,
    original_language: "en",
  },
  {
    id: 10002,
    title: "Stranger Things",
    year: 2016,
    release_date: "2016-07-15",
    type: "serie",
    genre: "Science-fiction, Drame, Mystere",
    genres: ["Science-fiction", "Drame", "Mystere"],
    genre_ids: [878, 18, 9648],
    overview:
      "Dans une petite ville, des adolescents affrontent des evenements surnaturels.",
    poster_path: "/x2LSRK2Cm7MZhjluni1msVJ3wDF.jpg",
    poster_url: "https://image.tmdb.org/t/p/w500/x2LSRK2Cm7MZhjluni1msVJ3wDF.jpg",
    vote_average: 8.6,
    popularity: 84,
    original_language: "en",
  },
  {
    id: 10003,
    title: "Dark",
    year: 2017,
    release_date: "2017-12-01",
    type: "serie",
    genre: "Mystere, Science-fiction, Drame",
    genres: ["Mystere", "Science-fiction", "Drame"],
    genre_ids: [9648, 878, 18],
    overview:
      "La disparition d'un enfant revele un secret temporel qui relie plusieurs familles.",
    poster_path: "/5Lo5rSl5Nq7ft8VYW6eFqIQZ1SB.jpg",
    poster_url: "https://image.tmdb.org/t/p/w500/5Lo5rSl5Nq7ft8VYW6eFqIQZ1SB.jpg",
    vote_average: 8.4,
    popularity: 70,
    original_language: "de",
  },
];

function buildCacheKey({
  page,
  language,
  platform,
  ageRestriction,
  genre,
  genres = [],
  contentType,
  origin,
  excludeIds = [],
  animationCap = "all",
}) {
  return JSON.stringify({
    page,
    language,
    platform: platform || "",
    ageRestriction: ageRestriction || "",
    genre: genre || "",
    genres: Array.isArray(genres) ? [...genres].sort() : [],
    contentType: contentType || "",
    origin: origin || "",
    excludeIds: Array.isArray(excludeIds) ? excludeIds.sort() : [],
    animationCap,
  });
}

function getCachedFilms(cacheKey) {
  const entry = filmsCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    filmsCache.delete(cacheKey);
    return null;
  }
  return entry.data;
}

function setCachedFilms(cacheKey, films) {
  if (films === null || films === undefined) return;
  filmsCache.set(cacheKey, {
    expiresAt: Date.now() + FILMS_CACHE_TTL_MS,
    data: films,
  });

  if (filmsCache.size <= FILMS_CACHE_MAX_ENTRIES) return;
  const oldestKey = filmsCache.keys().next().value;
  if (oldestKey) filmsCache.delete(oldestKey);
}

function getCachedTmdbJson(cacheKey) {
  const entry = tmdbJsonCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    tmdbJsonCache.delete(cacheKey);
    return null;
  }
  return entry.data;
}

function setCachedTmdbJson(cacheKey, data) {
  tmdbJsonCache.set(cacheKey, {
    expiresAt: Date.now() + TMDB_CACHE_TTL_MS,
    data,
  });

  if (tmdbJsonCache.size <= TMDB_CACHE_MAX_ENTRIES) return;
  const oldestKey = tmdbJsonCache.keys().next().value;
  if (oldestKey) tmdbJsonCache.delete(oldestKey);
}

async function fetchTmdbJson(url, timeoutMs = 9000, retries = 1) {
  const cacheKey = String(url || "");
  const cached = getCachedTmdbJson(cacheKey);
  if (cached) return cached;
  if (tmdbInFlight.has(cacheKey)) return tmdbInFlight.get(cacheKey);

  const promise = (async () => {
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const startedAt = Date.now();
      try {
        const response = await fetch(cacheKey, {
          method: "GET",
          headers: tmdbHeaders(),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`TMDB HTTP ${response.status}`);
        }
        const payload = await response.json();
        setCachedTmdbJson(cacheKey, payload);
        console.log("[TMDB] response", {
          ms: Date.now() - startedAt,
          attempt: attempt + 1,
        });
        return payload;
      } catch (error) {
        lastError = error;
        console.log("[TMDB] request retry", {
          attempt: attempt + 1,
          retries,
          message: String(error?.message || error),
        });
        if (attempt >= retries) throw error;
        await new Promise((resolve) => setTimeout(resolve, 250));
      } finally {
        clearTimeout(timeout);
      }
    }
    throw lastError;
  })();

  tmdbInFlight.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    tmdbInFlight.delete(cacheKey);
  }
}

app.use(cors({ origin: "*" }));
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl} from ${req.ip}`);
  next();
});

function hasTmdbCredentials() {
  return Boolean(TMDB_API_KEY || TMDB_BEARER_TOKEN);
}

function tmdbHeaders() {
  const headers = { accept: "application/json" };
  if (TMDB_BEARER_TOKEN) {
    headers.Authorization = `Bearer ${TMDB_BEARER_TOKEN}`;
  }
  return headers;
}

function normalizePlatform(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";

  const compact = raw.replace(/[_\s]+/g, " ").trim();
  const dashKey = compact.replace(/\s+/g, "-");
  const plusKey = compact.replace(/\s+/g, "+");

  if (PLATFORM_WATCH_PROVIDER[raw]) return raw;
  if (PLATFORM_WATCH_PROVIDER[dashKey]) return dashKey;
  if (PLATFORM_WATCH_PROVIDER[plusKey]) return plusKey;
  if (PLATFORM_ALIASES[raw]) return PLATFORM_ALIASES[raw];
  if (PLATFORM_ALIASES[compact]) return PLATFORM_ALIASES[compact];

  if (compact.includes("disney")) return "disney-plus";
  if (compact.includes("hbo") || compact === "max" || compact.includes("max")) {
    return "hbo-max";
  }
  return "";
}

function normalizeAgeRestriction(value) {
  const key = String(value || "").trim().toLowerCase();
  if (["all", "12", "16", "18"].includes(key)) return key;
  return "";
}

function normalizeGenreId(value) {
  const raw = String(value || "").trim();
  if (!/^\d+$/.test(raw)) return "";
  return raw;
}

function normalizeGenreIds(value) {
  const raw = Array.isArray(value) ? value.join(",") : String(value || "");
  return [
    ...new Set(
      raw
        .split(/[,\s|/]+/)
        .map((entry) => normalizeGenreId(entry))
        .filter(Boolean)
    ),
  ];
}

function normalizeAnimationCap(value, fallback = Infinity) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  if (["all", "infinity", "inf", "unlimited"].includes(raw)) return Infinity;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.floor(numeric));
}

function resolveWithGenresParam(genreId, mediaType) {
  if (!genreId) return "";
  if (mediaType !== "tv") return genreId;
  return TV_GENRE_FALLBACK_MAP[Number(genreId)] || genreId;
}

function normalizeContentType(value) {
  const key = String(value || "").trim().toLowerCase();
  if (["film", "movie"].includes(key)) return "film";
  if (["serie", "series", "tv"].includes(key)) return "serie";
  if (["peu-importe", "peu importe", "any", "all"].includes(key)) return "peu-importe";
  return "";
}

function normalizeOrigin(value) {
  const key = String(value || "").trim().toLowerCase();
  if (["us", "usa", "american"].includes(key)) return "us";
  if (
    [
      "asie",
      "asian",
      "asiatique",
      "film asiatique",
      "coree",
      "korea",
      "kr",
      "japon",
      "japan",
      "jp",
      "chine",
      "china",
      "cn",
    ].includes(key)
  ) {
    return "asie";
  }
  if (["europe", "eu"].includes(key)) return "europe";
  return "";
}

function normalizeExcludeIds(value) {
  const raw = Array.isArray(value) ? value.join(",") : String(value || "");
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function resolveOriginCountry(origin, page = 1) {
  if (origin === "us") return "US";
  if (origin === "asie") return ASIA_ORIGIN_COUNTRIES.join("|");
  if (origin === "europe") {
    const index = Math.max(0, Number(page || 1) - 1) % EUROPE_ORIGIN_COUNTRIES.length;
    return EUROPE_ORIGIN_COUNTRIES[index];
  }
  return "";
}

function normalizeCertification(value) {
  return String(value || "").trim().toUpperCase();
}

function splitCountryCodes(value) {
  return String(value || "")
    .split(/[|,\s/]+/)
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean);
}

function extractCertificationFromCountryEntry(countryEntry) {
  const releaseDates = Array.isArray(countryEntry?.release_dates)
    ? countryEntry.release_dates
    : [];
  if (!releaseDates.length) return "";

  const preferredTypes = [3, 2, 4, 1, 5, 6];
  for (const type of preferredTypes) {
    const match = releaseDates.find(
      (entry) => Number(entry?.type) === type && normalizeCertification(entry?.certification)
    );
    if (match) return normalizeCertification(match.certification);
  }

  const firstFilled = releaseDates.find((entry) => normalizeCertification(entry?.certification));
  return firstFilled ? normalizeCertification(firstFilled.certification) : "";
}

function pickCertificationFromReleaseDates(payload) {
  const results = Array.isArray(payload?.results) ? payload.results : [];
  if (!results.length) return "";

  const preferredCountries = ["US", "FR", "GB", "CA"];
  for (const country of preferredCountries) {
    const countryEntry = results.find(
      (entry) => String(entry?.iso_3166_1 || "").toUpperCase() === country
    );
    const certification = extractCertificationFromCountryEntry(countryEntry);
    if (certification) return certification;
  }

  for (const entry of results) {
    const certification = extractCertificationFromCountryEntry(entry);
    if (certification) return certification;
  }

  return "";
}

async function fetchTmdbMovieCertification(movieId) {
  const cacheKey = String(movieId || "").trim();
  if (!cacheKey) return "";
  if (movieCertificationCache.has(cacheKey)) {
    return movieCertificationCache.get(cacheKey);
  }

  const url = new URL(`${TMDB_BASE_URL}/movie/${cacheKey}/release_dates`);
  if (TMDB_API_KEY) {
    url.searchParams.set("api_key", TMDB_API_KEY);
  }

  try {
    const payload = await fetchTmdbJson(url.toString(), 7000, 1);
    const certification = pickCertificationFromReleaseDates(payload);
    movieCertificationCache.set(cacheKey, certification);
    return certification;
  } catch {
    movieCertificationCache.set(cacheKey, "");
    return "";
  }
}

function formatTmdbMovie(movie, context = {}) {
  if (!movie) return null;
  const genreIds = Array.isArray(movie.genre_ids) ? movie.genre_ids : [];
  const genres = genreIds.map((id) => GENRE_NAMES[id]).filter(Boolean);
  const releaseDate = String(movie.release_date || "").trim();
  const year = releaseDate ? Number(releaseDate.slice(0, 4)) : "";
  const contextCountries = splitCountryCodes(context.originCountry);

  return {
    id: movie.id,
    title: movie.title || movie.original_title || "Titre inconnu",
    year,
    release_date: releaseDate,
    type: "film",
    genre: genres.join(", "),
    genres,
    genre_ids: genreIds,
    overview: String(movie.overview || "").trim(),
    poster_path: movie.poster_path || "",
    poster_url: movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : "",
    vote_average: Number(movie.vote_average || 0),
    popularity: Number(movie.popularity || 0),
    original_language: String(movie.original_language || "").trim(),
    origin_country: contextCountries,
    country: contextCountries.join(", "),
    adult: Boolean(movie.adult),
    certification: String(movie.certification || "").trim(),
    platform: context.platform ? PLATFORM_LABELS[context.platform] || "" : "",
    age_restriction: String(movie.certification || context.ageRestriction || "").trim(),
  };
}

function tvShowSupportsRequestedGenre(show, requestedGenreId) {
  const id = Number(requestedGenreId || 0);
  if (!id) return false;

  const genreIds = Array.isArray(show?.genre_ids) ? show.genre_ids.map(Number) : [];
  if (genreIds.includes(id)) return true;

  const signalKeywords = REQUESTED_TV_GENRE_SIGNAL_KEYWORDS[id];
  if (!signalKeywords) return true;

  // Some movie genres are mapped to broader TV genres. Keep it flexible, but avoid obvious false matches.
  const text = normalizeTitleKey(
    `${show?.name || ""} ${show?.original_name || ""} ${show?.overview || ""}`
  );
  return signalKeywords.some((keyword) => text.includes(keyword));
}

function formatTmdbTv(show, context = {}) {
  if (!show) return null;
  const requestedGenreId = Number(context.requestedGenreId || 0);
  const genreIds = Array.isArray(show.genre_ids) ? [...show.genre_ids] : [];
  if (
    requestedGenreId > 0 &&
    !genreIds.includes(requestedGenreId) &&
    tvShowSupportsRequestedGenre(show, requestedGenreId)
  ) {
    genreIds.unshift(requestedGenreId);
  }
  const genres = genreIds.map((id) => GENRE_NAMES[id]).filter(Boolean);
  const firstAirDate = String(show.first_air_date || "").trim();
  const year = firstAirDate ? Number(firstAirDate.slice(0, 4)) : "";
  const contextCountries = splitCountryCodes(context.originCountry);

  return {
    id: show.id,
    title: show.name || show.original_name || "Titre inconnu",
    year,
    release_date: firstAirDate,
    type: "serie",
    genre: genres.join(", "),
    genres,
    genre_ids: genreIds,
    overview: String(show.overview || "").trim(),
    poster_path: show.poster_path || "",
    poster_url: show.poster_path
      ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
      : "",
    vote_average: Number(show.vote_average || 0),
    popularity: Number(show.popularity || 0),
    original_language: String(show.original_language || "").trim(),
    origin_country: Array.isArray(show.origin_country)
      ? show.origin_country
      : contextCountries.length
      ? contextCountries
      : [],
    country: Array.isArray(show.origin_country)
      ? show.origin_country.join(", ")
      : contextCountries.join(", "),
    adult: Boolean(show.adult),
    certification: "",
    platform: context.platform ? PLATFORM_LABELS[context.platform] || "" : "",
    age_restriction: context.ageRestriction || "",
  };
}

function filmUniqueKey(film) {
  return `${film?.type || "film"}:${film?.id || film?.title || ""}`;
}

function normalizeTitleKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scorePosterSearchResult(item, { title, year }) {
  const expectedTitle = normalizeTitleKey(title);
  const candidateTitle = normalizeTitleKey(
    item?.title || item?.name || item?.original_title || item?.original_name
  );
  let score = 0;
  if (candidateTitle === expectedTitle) score += 80;
  else if (candidateTitle.includes(expectedTitle) || expectedTitle.includes(candidateTitle)) {
    score += 35;
  }
  if (item?.poster_path) score += 30;
  const candidateYear = normalizeYear(item?.release_date || item?.first_air_date);
  const expectedYear = normalizeYear(year);
  if (expectedYear && candidateYear) {
    const delta = Math.abs(candidateYear - expectedYear);
    if (delta === 0) score += 25;
    else if (delta <= 1) score += 10;
    else if (delta > 5) score -= 15;
  }
  score += Math.min(20, Number(item?.popularity || 0) / 5);
  return score;
}

async function fetchTmdbPosterByTitle({ title, type = "", year = "", language = "fr-FR" }) {
  const cleanTitle = String(title || "").trim();
  if (!cleanTitle || !hasTmdbCredentials()) return null;

  const normalizedType = normalizeContentType(type);
  const endpoints =
    normalizedType === "serie"
      ? ["tv", "movie"]
      : normalizedType === "film"
      ? ["movie", "tv"]
      : ["movie", "tv"];

  for (const endpoint of endpoints) {
    const url = new URL(`${TMDB_BASE_URL}/search/${endpoint}`);
    if (TMDB_API_KEY) {
      url.searchParams.set("api_key", TMDB_API_KEY);
    }
    url.searchParams.set("language", language || "fr-FR");
    url.searchParams.set("query", cleanTitle);
    url.searchParams.set("include_adult", "false");
    const normalizedYear = normalizeYear(year);
    if (normalizedYear) {
      if (endpoint === "movie") {
        url.searchParams.set("year", String(normalizedYear));
      } else {
        url.searchParams.set("first_air_date_year", String(normalizedYear));
      }
    }

    try {
      const payload = await fetchTmdbJson(url.toString(), 7000, 1);
      const results = Array.isArray(payload?.results) ? payload.results : [];
      const best = results
        .filter((item) => item?.poster_path)
        .sort(
          (left, right) =>
            scorePosterSearchResult(right, { title: cleanTitle, year }) -
            scorePosterSearchResult(left, { title: cleanTitle, year })
        )[0];
      if (best?.poster_path) {
        return {
          poster_path: best.poster_path,
          poster_url: `https://image.tmdb.org/t/p/w500${best.poster_path}`,
          tmdb_id: best.id,
          title: best.title || best.name || cleanTitle,
          year: normalizeYear(best.release_date || best.first_air_date) || "",
        };
      }
    } catch (error) {
      console.log("[TMDB] poster search failed", {
        title: cleanTitle,
        endpoint,
        message: String(error?.message || error),
      });
    }
  }

  return null;
}

function mergeStringLists(...lists) {
  const output = [];
  const seen = new Set();
  for (const list of lists) {
    const values = Array.isArray(list) ? list : [list];
    for (const value of values) {
      const raw = String(value || "").trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      output.push(raw);
    }
  }
  return output;
}

function mergeNumberLists(...lists) {
  const output = [];
  const seen = new Set();
  for (const list of lists) {
    const values = Array.isArray(list) ? list : [list];
    for (const value of values) {
      const number = Number(value);
      if (!Number.isFinite(number) || seen.has(number)) continue;
      seen.add(number);
      output.push(number);
    }
  }
  return output;
}

function mergeFilmMetadata(existing, next) {
  if (!existing) return next;
  const platforms = mergeStringLists(
    existing.platforms,
    existing.platform,
    next.platforms,
    next.platform
  );
  const originCountries = mergeStringLists(existing.origin_country, next.origin_country);
  const genreIds = mergeNumberLists(existing.genre_ids, next.genre_ids);
  const genres = mergeStringLists(existing.genres, next.genres);

  return {
    ...existing,
    ...next,
    title: existing.title || next.title,
    year: existing.year || next.year,
    release_date: existing.release_date || next.release_date,
    genre_ids: genreIds,
    genres,
    genre: genres.join(", ") || existing.genre || next.genre,
    overview: existing.overview || next.overview,
    poster_path: existing.poster_path || next.poster_path,
    poster_url: existing.poster_url || next.poster_url,
    original_language: existing.original_language || next.original_language,
    origin_country: originCountries,
    country: originCountries.join(", ") || existing.country || next.country,
    platform: platforms[0] || "",
    platforms,
    certification: existing.certification || next.certification || "",
    age_restriction: existing.age_restriction || next.age_restriction || "",
    vote_average: Math.max(Number(existing.vote_average || 0), Number(next.vote_average || 0)),
    popularity: Math.max(Number(existing.popularity || 0), Number(next.popularity || 0)),
  };
}

function uniqueFilmsByTmdbId(films) {
  const byId = new Map();
  const byTitle = new Set();
  for (const film of Array.isArray(films) ? films : []) {
    const key = filmUniqueKey(film);
    const titleKey = normalizeTitleKey(film?.title);
    if (!key || key.endsWith(":")) continue;
    if (!byId.has(key) && titleKey && byTitle.has(titleKey)) continue;
    byId.set(key, mergeFilmMetadata(byId.get(key), film));
    if (titleKey) byTitle.add(titleKey);
  }
  return [...byId.values()];
}

function withFallbackContext(films, context = {}) {
  return films.map((film) => ({
    ...film,
    certification: "",
    platform: context.platform ? PLATFORM_LABELS[context.platform] || "" : "",
    age_restriction: context.ageRestriction || "",
  }));
}

function selectedAgeBucket(ageRestriction) {
  if (ageRestriction === "all") return 0;
  if (ageRestriction === "12") return 12;
  if (ageRestriction === "16") return 16;
  if (ageRestriction === "18") return 18;
  return null;
}

function certificationBucket(certification) {
  const cert = normalizeCertification(certification);
  if (!cert) return null;
  if (["ALL", "TOUT PUBLIC", "G", "PG", "TV-G", "TV-PG"].includes(cert)) return 0;
  if (["PG-13", "TV-14", "12", "12+"].includes(cert)) return 12;
  if (["R", "TV-MA", "16", "16+"].includes(cert)) return 16;
  if (["NC-17", "18", "18+"].includes(cert)) return 18;
  return null;
}

function filmAgeScore(ageRestriction, film) {
  const selected = selectedAgeBucket(ageRestriction);
  if (selected === null) return 15;
  if (selected < 18 && Boolean(film?.adult)) return 0;
  const bucket = certificationBucket(film?.certification || film?.age_restriction);
  const genreIds = Array.isArray(film?.genre_ids) ? film.genre_ids.map(Number) : [];
  const looksFamilyOrAnimation = genreIds.includes(16) || genreIds.includes(10751);

  if (ageRestriction === "16") {
    if (bucket === null) return looksFamilyOrAnimation ? 0 : 8;
    return bucket === 16 ? 15 : 0;
  }

  if (ageRestriction === "18") {
    if (bucket === null) return looksFamilyOrAnimation ? 0 : 8;
    return bucket >= 16 ? 15 : 0;
  }

  // "Tout public" must not include unknown age ratings, because unknown can hide 12+/16+/18+.
  if (bucket === null) return selected === 0 ? 0 : 8;
  return bucket <= selected ? 15 : 0;
}

function isFamilySafeFilm(film) {
  if (Boolean(film?.adult)) return false;
  return certificationBucket(film?.certification || film?.age_restriction) === 0;
}

function filmMatchesGenre(film, genre) {
  const genreId = normalizeGenreId(genre);
  if (!genreId) return true;
  return Array.isArray(film?.genre_ids) && film.genre_ids.map(String).includes(genreId);
}

function filmMatchesAnyGenre(film, genres) {
  const genreIds = Array.isArray(genres)
    ? genres.map((genre) => normalizeGenreId(genre)).filter(Boolean)
    : normalizeGenreIds(genres);
  if (!genreIds.length) return true;
  const filmGenreIds = Array.isArray(film?.genre_ids) ? film.genre_ids.map(String) : [];
  return genreIds.some((genreId) => filmGenreIds.includes(genreId));
}

function filmMatchesType(film, contentType) {
  const normalizedContentType = normalizeContentType(contentType);
  if (!normalizedContentType || normalizedContentType === "peu-importe") return true;
  if (normalizedContentType === "serie") return film?.type === "serie";
  return film?.type === "film";
}

function filmMatchesOrigin(film, origin) {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return true;
  const languages = ORIGIN_LANGUAGE_HINTS[normalizedOrigin] || [];
  const countries = ORIGIN_COUNTRY_HINTS[normalizedOrigin] || [];
  const language = String(film?.original_language || "").trim().toLowerCase();
  const filmCountries = mergeStringLists(film?.country, film?.origin_country).map((value) =>
    value.toUpperCase()
  ).flatMap((value) => splitCountryCodes(value));
  const countryMatches = filmCountries.some((country) => countries.includes(country));
  if (filmCountries.length > 0) return countryMatches;
  return Boolean(language && languages.includes(language));
}

function filmMatchesPlatform(film, platform) {
  const normalizedPlatform = normalizePlatform(platform);
  if (!normalizedPlatform) return true;
  const label = PLATFORM_LABELS[normalizedPlatform] || normalizedPlatform;
  const aliases = [normalizedPlatform, label, label.replace(/\s+/g, "-")].map((value) =>
    String(value || "").toLowerCase()
  );
  const source = mergeStringLists(film?.platform, film?.platforms).join(" ").toLowerCase();
  if (!source) return false;
  return aliases.some((alias) => alias && source.includes(alias));
}

function normalizeYear(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value || "");
  if (/^\d{4}$/.test(text)) return Number(text);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return Number(text.slice(0, 4));
  return null;
}

function qualityTieBreaker(film) {
  const voteAverage = Number(film?.vote_average || 0);
  const popularity = Number(film?.popularity || 0);
  const voteCount = Number(film?.vote_count || 0);
  const year = normalizeYear(film?.year) || normalizeYear(film?.release_date);
  const currentYear = new Date().getFullYear();
  const age = year ? Math.max(0, currentYear - year) : null;
  const rating = Number.isFinite(voteAverage)
    ? Math.max(0, Math.min(10, voteAverage)) / 10
    : 0;
  const pop = Number.isFinite(popularity)
    ? Math.max(0, Math.min(1, Math.log1p(popularity) / Math.log1p(350)))
    : 0;
  const votes = Number.isFinite(voteCount)
    ? Math.max(0, Math.min(1, Math.log1p(voteCount) / Math.log1p(15000)))
    : 0;
  const recency =
    age === null
      ? 0.35
      : age <= 1
      ? 1
      : age <= 3
      ? 0.85
      : age <= 6
      ? 0.65
      : age <= 10
      ? 0.45
      : age <= 20
      ? 0.25
      : 0.1;
  return rating * 2.4 + pop * 1.8 + recency * 1.2 + votes * 0.6;
}

function scoreFilmForBackend(film, {
  genre,
  genres,
  contentType,
  ageRestriction,
  origin,
  platform,
  animationCap = Infinity,
}) {
  const requestedGenres = normalizeGenreIds(genres);
  const activeGenres = requestedGenres.length
    ? requestedGenres
    : normalizeGenreId(genre)
    ? [normalizeGenreId(genre)]
    : [];
  if (!filmMatchesAnyGenre(film, activeGenres)) return null;
  if (activeGenres.includes("10751") && !isFamilySafeFilm(film)) return null;
  if (!filmMatchesType(film, contentType)) return null;
  const normalizedOrigin = normalizeOrigin(origin);
  if (normalizedOrigin && !filmMatchesOrigin(film, normalizedOrigin)) return null;
  const normalizedAgeRestriction = normalizeAgeRestriction(ageRestriction);
  const normalizedPlatform = normalizePlatform(platform);
  const familyWithoutAnimation = activeGenres.includes("10751") && !activeGenres.includes("16");
  const animationBlocked =
    (animationCap <= 0 || familyWithoutAnimation) && isFamilyOrAnimationFilm(film);
  if (animationBlocked) return null;

  const genreScore = activeGenres.length ? 40 : 40;
  const typeScore =
    normalizeContentType(contentType) && normalizeContentType(contentType) !== "peu-importe"
      ? 20
      : 20;
  const ageScore = filmAgeScore(ageRestriction, film);
  if (normalizedAgeRestriction && ageScore <= 0) return null;
  const originScore = normalizedOrigin ? 10 : 10;
  const platformScore = normalizedPlatform
    ? filmMatchesPlatform(film, platform)
      ? 5
      : 0
    : 5;
  const backendScore = genreScore + typeScore + ageScore + originScore + platformScore;

  return {
    ...film,
    backend_score: backendScore,
    backend_rank_score: backendScore + qualityTieBreaker(film),
  };
}

function isFamilyOrAnimationFilm(film) {
  const genreIds = Array.isArray(film?.genre_ids) ? film.genre_ids.map(Number) : [];
  const genreText = normalizeTitleKey(
    `${film?.genre || ""} ${Array.isArray(film?.genres) ? film.genres.join(" ") : ""}`
  );
  return (
    genreIds.includes(16) ||
    genreText.includes("animation") ||
    genreText.includes("dessin") ||
    genreText.includes("anime") ||
    genreText.includes("manga")
  );
}

function diversifyRankedFilms(rankedFilms, limit = 90, options = {}) {
  if (!rankedFilms.length) return [];
  const lead = rankedFilms.slice(0, Math.min(3, rankedFilms.length));
  const window = rankedFilms.slice(lead.length, Math.min(45, rankedFilms.length));
  const rest = rankedFilms.slice(Math.min(45, rankedFilms.length));
  const shuffledWindow = [...window].sort(() => Math.random() - 0.5);
  const ordered = [...lead, ...shuffledWindow, ...rest];
  const familyAnimationCap = Number.isFinite(options.familyAnimationCap)
    ? options.familyAnimationCap
    : Infinity;
  const selected = [];
  let familyAnimationCount = 0;

  for (const film of ordered) {
    if (selected.length >= limit) break;
    const familyAnimation = isFamilyOrAnimationFilm(film);
    if (familyAnimation && familyAnimationCount >= familyAnimationCap) continue;
    selected.push(film);
    if (familyAnimation) familyAnimationCount += 1;
  }

  if (selected.length < limit) {
    const selectedKeys = new Set(selected.map((film) => `${film?.type || "film"}:${film?.id}`));
    for (const film of ordered) {
      if (selected.length >= limit) break;
      const key = `${film?.type || "film"}:${film?.id}`;
      if (selectedKeys.has(key)) continue;
      const familyAnimation = isFamilyOrAnimationFilm(film);
      if (familyAnimation && familyAnimationCount >= familyAnimationCap) continue;
      selected.push(film);
      if (familyAnimation) familyAnimationCount += 1;
      selectedKeys.add(key);
    }
  }

  return selected;
}

async function fetchTmdbFilms({
  page = 1,
  language = "fr-FR",
  platform = "",
  ageRestriction = "",
  genre = "",
  contentType = "",
  origin = "",
  animationCap = Infinity,
}) {
  const normalizedPlatform = normalizePlatform(platform);
  const normalizedAgeRestriction = normalizeAgeRestriction(ageRestriction);
  const normalizedGenreId = normalizeGenreId(genre);
  const normalizedContentType = normalizeContentType(contentType);
  const normalizedOrigin = normalizeOrigin(origin);
  const mediaType = normalizedContentType === "serie" ? "tv" : "movie";
  const withGenresParam = resolveWithGenresParam(normalizedGenreId, mediaType);
  const originCountry = resolveOriginCountry(normalizedOrigin, page);

  const url = new URL(`${TMDB_BASE_URL}/discover/${mediaType}`);
  if (TMDB_API_KEY) {
    url.searchParams.set("api_key", TMDB_API_KEY);
  }
  url.searchParams.set("language", language);
  url.searchParams.set("include_adult", "false");
  if (mediaType === "movie") {
    url.searchParams.set("include_video", "false");
  }
  url.searchParams.set("sort_by", "popularity.desc");
  url.searchParams.set("page", String(page));
  url.searchParams.set("watch_region", "FR");
  url.searchParams.set("with_watch_monetization_types", "flatrate");

  if (normalizedPlatform) {
    url.searchParams.set(
      "with_watch_providers",
      PLATFORM_WATCH_PROVIDER[normalizedPlatform]
    );
  }

  if (withGenresParam) {
    url.searchParams.set("with_genres", withGenresParam);
  }

  if (originCountry) {
    url.searchParams.set("with_origin_country", originCountry);
  }

  if (mediaType === "movie" && normalizedAgeRestriction && normalizedAgeRestriction !== "18") {
    const certificationLte = AGE_CERTIFICATION_LTE[normalizedAgeRestriction];
    if (certificationLte) {
      url.searchParams.set("certification_country", "US");
      url.searchParams.set("certification.lte", certificationLte);
    }
  }
  if (mediaType === "movie" && normalizedAgeRestriction === "16") {
    url.searchParams.set("certification_country", "US");
    url.searchParams.set("certification.gte", "R");
    url.searchParams.set("certification.lte", "R");
  }
  if (mediaType === "movie" && normalizedAgeRestriction === "18") {
    url.searchParams.set("certification_country", "US");
    url.searchParams.set("certification.gte", "R");
  }

  try {
    const payload = await fetchTmdbJson(url.toString(), 10000, 1);
    const results = Array.isArray(payload?.results) ? payload.results : [];

    if (mediaType === "tv") {
      const formattedTv = results
        .map((show) =>
          formatTmdbTv(show, {
            platform: normalizedPlatform,
            ageRestriction: normalizedAgeRestriction,
            requestedGenreId: normalizedGenreId,
            originCountry,
          })
        )
        .filter(Boolean);
      return { films: formattedTv, notice: "" };
    }

    const needsStrictCertification = ["all", "12", "16", "18"].includes(
      normalizedAgeRestriction
    );
    let enrichedResults = results;

    if (needsStrictCertification) {
      enrichedResults = await Promise.all(
        results.map(async (movie) => {
          const certification = await fetchTmdbMovieCertification(movie?.id);
          console.log("certification film:", certification || "(vide)");
          return {
            ...movie,
            certification,
          };
        })
      );
    }

    const formatted = enrichedResults
      .map((movie) =>
        formatTmdbMovie(movie, {
          platform: normalizedPlatform,
          ageRestriction: normalizedAgeRestriction,
          originCountry,
        })
      )
      .filter(Boolean);

    if (!needsStrictCertification) {
      return { films: formatted, notice: "" };
    }

    const allowed = STRICT_CERTIFICATIONS[normalizedAgeRestriction] || null;
    if (!allowed) {
      return { films: formatted, notice: "" };
    }

    const strictFilms = formatted.filter((movie) =>
      allowed.has(normalizeCertification(movie?.certification))
    );

    if (strictFilms.length > 0) {
      return { films: strictFilms, notice: "" };
    }

    return {
      films: formatted,
      notice: "Aucun film ne correspond exactement, élargissement des critères",
    };
  } catch (error) {
    throw error;
  }
}

async function fetchTmdbDiscoverWidePage({
  mediaType,
  page,
  language,
  genre,
  platform = "",
  ageRestriction = "",
  originCountry = "",
}) {
  const normalizedPlatform = normalizePlatform(platform);
  const normalizedAgeRestriction = normalizeAgeRestriction(ageRestriction);
  const normalizedGenreId = normalizeGenreId(genre);
  const withGenresParam = resolveWithGenresParam(normalizedGenreId, mediaType);
  const url = new URL(`${TMDB_BASE_URL}/discover/${mediaType}`);
  if (TMDB_API_KEY) {
    url.searchParams.set("api_key", TMDB_API_KEY);
  }
  url.searchParams.set("language", language);
  url.searchParams.set("include_adult", "false");
  if (mediaType === "movie") {
    url.searchParams.set("include_video", "false");
  }
  url.searchParams.set("sort_by", "popularity.desc");
  url.searchParams.set("page", String(page));
  url.searchParams.set("watch_region", "FR");
  url.searchParams.set("with_watch_monetization_types", "flatrate");

  if (withGenresParam) {
    url.searchParams.set("with_genres", withGenresParam);
  }
  if (normalizedPlatform) {
    url.searchParams.set("with_watch_providers", PLATFORM_WATCH_PROVIDER[normalizedPlatform]);
  }
  if (originCountry) {
    url.searchParams.set("with_origin_country", originCountry);
  }
  if (mediaType === "movie" && normalizedAgeRestriction && normalizedAgeRestriction !== "18") {
    const certificationLte = AGE_CERTIFICATION_LTE[normalizedAgeRestriction];
    if (certificationLte) {
      url.searchParams.set("certification_country", "US");
      url.searchParams.set("certification.lte", certificationLte);
    }
  }
  if (mediaType === "movie" && normalizedAgeRestriction === "16") {
    url.searchParams.set("certification_country", "US");
    url.searchParams.set("certification.gte", "R");
    url.searchParams.set("certification.lte", "R");
  }

  try {
    const payload = await fetchTmdbJson(url.toString(), 10000, 1);
    const results = Array.isArray(payload?.results) ? payload.results : [];

    if (mediaType === "tv") {
      return results
        .map((show) =>
          formatTmdbTv(show, {
            platform: normalizedPlatform,
            requestedGenreId: normalizedGenreId,
            originCountry,
          })
        )
        .filter(Boolean);
    }

    return results
      .map((movie) =>
        formatTmdbMovie(movie, {
          platform: normalizedPlatform,
          ageRestriction: normalizedAgeRestriction,
          originCountry,
        })
      )
      .filter(Boolean);
  } catch (error) {
    throw error;
  }
}

async function enrichMovieCertifications(films, ageRestriction) {
  const normalizedAgeRestriction = normalizeAgeRestriction(ageRestriction);
  if (!normalizedAgeRestriction) return films;

  const movies = films.filter((film) => film?.type === "film").slice(0, 45);
  await Promise.all(
    movies.map(async (movie) => {
      if (movie.certification) return;
      const certification = await fetchTmdbMovieCertification(movie.id);
      if (certification) {
        movie.certification = certification;
        movie.age_restriction = certification;
      }
    })
  );
  return films;
}

async function fetchTmdbFilmsWide({
  page = 1,
  language = "fr-FR",
  platform = "",
  ageRestriction = "",
  genre = "",
  genres = [],
  contentType = "",
  origin = "",
  excludeIds = [],
  animationCap = Infinity,
}) {
  const normalizedPlatform = normalizePlatform(platform);
  const normalizedAgeRestriction = normalizeAgeRestriction(ageRestriction);
  const normalizedGenreId = normalizeGenreId(genre);
  const normalizedGenreIds = [
    ...new Set([...normalizeGenreIds(genres), normalizedGenreId].filter(Boolean)),
  ];
  const requestGenres = normalizedGenreIds.length ? normalizedGenreIds : [""];
  const normalizedContentType = normalizeContentType(contentType);
  const normalizedOrigin = normalizeOrigin(origin);
  const mediaTypes =
    normalizedContentType === "serie"
      ? ["tv"]
      : normalizedContentType === "peu-importe" || !normalizedContentType
      ? ["movie", "tv"]
      : ["movie"];
  const pages = Array.from({ length: 6 }, (_, index) => Math.max(1, page + index));
  const originCountry = resolveOriginCountry(normalizedOrigin, page);
  const excluded = new Set(
    (Array.isArray(excludeIds) ? excludeIds : []).map((entry) => String(entry))
  );
  const requests = [];

  for (const mediaType of mediaTypes) {
    for (const genreId of requestGenres) {
      for (const pageNumber of pages) {
        requests.push(
          fetchTmdbDiscoverWidePage({
            mediaType,
            page: pageNumber,
            language,
            genre: genreId,
            ageRestriction: normalizedAgeRestriction,
          })
        );
      }

      if (normalizedPlatform) {
        for (const pageNumber of pages.slice(0, 3)) {
          requests.push(
            fetchTmdbDiscoverWidePage({
              mediaType,
              page: pageNumber,
              language,
              genre: genreId,
              platform: normalizedPlatform,
              ageRestriction: normalizedAgeRestriction,
            })
          );
        }
      }

      if (originCountry) {
        for (const pageNumber of pages.slice(0, 3)) {
          requests.push(
            fetchTmdbDiscoverWidePage({
              mediaType,
              page: pageNumber,
              language,
              genre: genreId,
              ageRestriction: normalizedAgeRestriction,
              originCountry,
            })
          );
        }
      }

      if (normalizedPlatform && originCountry) {
        requests.push(
          fetchTmdbDiscoverWidePage({
            mediaType,
            page,
            language,
            genre: genreId,
            platform: normalizedPlatform,
            ageRestriction: normalizedAgeRestriction,
            originCountry,
          })
        );
      }
    }
  }

  const settled = await Promise.allSettled(requests);
  const pooled = settled
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value);
  const uniquePool = uniqueFilmsByTmdbId(pooled);
  await enrichMovieCertifications(uniquePool, normalizedAgeRestriction);

  const scored = uniquePool
    .filter((film) => {
      const id = String(film?.id || "");
      const typedId = `${film?.type || "film"}:${id}`;
      return !excluded.has(id) && !excluded.has(typedId);
    })
    .map((film) =>
      scoreFilmForBackend(film, {
        genre: normalizedGenreId,
        genres: normalizedGenreIds,
        contentType: normalizedContentType,
        ageRestriction: normalizedAgeRestriction,
        origin: normalizedOrigin,
        platform: normalizedPlatform,
        animationCap,
      })
    )
    .filter(Boolean)
    .sort((a, b) => Number(b.backend_rank_score || 0) - Number(a.backend_rank_score || 0));

  const familyAnimationCap =
    Number.isFinite(animationCap) ? animationCap : Infinity;
  const diversified = diversifyRankedFilms(scored, 120, { familyAnimationCap });
  const notice =
    scored.length < 5
      ? "Peu de resultats exacts: OMQ a elargi intelligemment le pool TMDB."
      : "";

  console.log("[TMDB] wide pool", {
    raw: pooled.length,
    unique: uniquePool.length,
    scored: scored.length,
    returned: diversified.length,
  });

  return { films: diversified, notice };
}

app.get("/", (_req, res) => {
  res.status(200).sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.get("/recommendations-engine.js", (_req, res) => {
  res.type("application/javascript").sendFile(FRONTEND_RECOMMENDATION_ENGINE);
});

app.get(["/privacy", "/privacy-policy"], (_req, res) => {
  res
    .status(200)
    .type("html")
    .send(`<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Politique de confidentialite - OMQ</title>
    <style>
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #181818;
        background: #ffffff;
        line-height: 1.6;
      }
      main {
        width: min(920px, calc(100% - 32px));
        margin: 0 auto;
        padding: 40px 0 64px;
      }
      h1 {
        font-size: 32px;
        line-height: 1.2;
        margin: 0 0 8px;
      }
      h2 {
        font-size: 20px;
        margin: 32px 0 8px;
      }
      p,
      li {
        font-size: 16px;
      }
      .muted {
        color: #666666;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Politique de confidentialite</h1>
      <p class="muted">Application OMQ: On mate quoi ? - Derniere mise a jour : 11 juin 2026</p>

      <h2>1. Objet de l'application</h2>
      <p>
        OMQ aide les utilisateurs a trouver des idees de films et de series selon leurs envies,
        leurs plateformes de streaming, leurs preferences de genres et leurs criteres de selection.
      </p>

      <h2>2. Donnees collectees</h2>
      <p>
        L'application ne demande pas la creation d'un compte et ne collecte pas directement le nom,
        l'adresse postale, le numero de telephone, les informations de paiement ou les contacts de
        l'utilisateur.
      </p>
      <p>
        Les choix effectues dans l'application, comme les genres, plateformes, types de contenus ou
        preferences de recommandation, peuvent etre utilises uniquement pour generer les resultats
        demandes. Certaines preferences peuvent etre conservees localement sur l'appareil afin
        d'ameliorer l'experience utilisateur.
      </p>

      <h2>3. Utilisation du serveur et de services tiers</h2>
      <p>
        Pour fournir des recommandations, l'application communique avec le serveur OMQ. Le serveur
        peut interroger des services tiers, notamment TMDB, afin d'obtenir des informations publiques
        sur les films et series, comme les titres, affiches, descriptions, notes et plateformes.
      </p>
      <p>
        Comme tout service en ligne, le serveur ou l'hebergeur peut recevoir des donnees techniques
        necessaires au fonctionnement du service, par exemple l'adresse IP, la date de la requete,
        le type d'appareil ou des journaux techniques. Ces informations servent a assurer la securite,
        diagnostiquer les erreurs et maintenir le service.
      </p>

      <h2>4. Publicite et revente des donnees</h2>
      <p>
        OMQ ne vend pas les donnees personnelles des utilisateurs. L'application n'utilise pas ces
        donnees pour etablir un profil publicitaire nominatif.
      </p>

      <h2>5. Conservation</h2>
      <p>
        Les preferences conservees localement restent sur l'appareil de l'utilisateur et peuvent etre
        supprimees en desinstallant l'application. Les journaux techniques du serveur, lorsqu'ils
        existent, sont conserves uniquement pendant la duree necessaire au fonctionnement, a la
        securite et au diagnostic du service.
      </p>

      <h2>6. Droits des utilisateurs</h2>
      <p>
        L'utilisateur peut demander des informations, une rectification ou une suppression des donnees
        le concernant lorsque cela s'applique.
      </p>

      <h2>7. Contact</h2>
      <p>
        Pour toute question relative a cette politique de confidentialite, vous pouvez contacter
        l'editeur de l'application a l'adresse suivante : virginiemal51@gmail.com.
      </p>
    </main>
  </body>
</html>`);
});

app.get("/test", (_req, res) => {
  res.status(200).send("OK");
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/poster", async (req, res) => {
  const title = String(req.query.title || "").trim();
  const type = normalizeContentType(req.query.type);
  const year = String(req.query.year || "").trim();
  const language = String(req.query.language || "fr-FR").trim() || "fr-FR";

  if (!title) {
    return res.status(400).json({ poster_url: "", error: "missing title" });
  }

  if (!hasTmdbCredentials()) {
    return res.status(200).json({ poster_url: "", poster_path: "", source: "missing-tmdb-credentials" });
  }

  try {
    const poster = await fetchTmdbPosterByTitle({ title, type, year, language });
    return res.status(200).json(
      poster || {
        poster_url: "",
        poster_path: "",
        source: "not-found",
      }
    );
  } catch (error) {
    console.error("[TMDB] /poster error:", error?.message || error);
    return res.status(200).json({ poster_url: "", poster_path: "", source: "error" });
  }
});

app.get("/films", async (req, res) => {
  const requestedPage = Number(req.query.page);
  const page =
    Number.isFinite(requestedPage) && requestedPage >= 1 && requestedPage <= 500
      ? Math.floor(requestedPage)
      : 1;
  const language = String(req.query.language || "fr-FR").trim() || "fr-FR";
  const platform = normalizePlatform(req.query.platform);
  const ageRestriction = normalizeAgeRestriction(req.query.ageRestriction);
  const genre = normalizeGenreId(req.query.genre);
  const genres = normalizeGenreIds(req.query.genres);
  const contentType = normalizeContentType(req.query.contentType);
  const origin = normalizeOrigin(req.query.origin);
  const excludeIds = normalizeExcludeIds(req.query.excludeIds);
  const animationCap = normalizeAnimationCap(req.query.animationCap);
  const fallbackCatalog = contentType === "serie" ? DEFAULT_SERIES : DEFAULT_FILMS;
  const cacheKey = buildCacheKey({
    page,
    language,
    platform,
    ageRestriction,
    genre,
    genres,
    contentType,
    origin,
    excludeIds,
    animationCap: Number.isFinite(animationCap) ? animationCap : "all",
  });
  const cachedFilms = getCachedFilms(cacheKey);

  if (cachedFilms) {
    console.log("[CACHE] hit /films", {
      page,
      language,
      platform: platform || "none",
      ageRestriction: ageRestriction || "none",
      genre: genre || "none",
      genres: genres.length ? genres.join(",") : "none",
      contentType: contentType || "none",
      origin: origin || "none",
      excluded: excludeIds.length,
      animationCap: Number.isFinite(animationCap) ? animationCap : "all",
      count: cachedFilms.length,
    });
    return res.status(200).json(cachedFilms);
  }

  console.log("[TMDB] /films called", {
    page,
    language,
    platform: platform || "none",
    ageRestriction: ageRestriction || "none",
    genre: genre || "none",
    genres: genres.length ? genres.join(",") : "none",
    contentType: contentType || "none",
    origin: origin || "none",
    excluded: excludeIds.length,
    animationCap: Number.isFinite(animationCap) ? animationCap : "all",
  });

  if (!hasTmdbCredentials()) {
    console.log("[TMDB] No credentials found. Using local fallback movies.");
    const fallback = withFallbackContext(fallbackCatalog, { platform, ageRestriction });
    setCachedFilms(cacheKey, fallback);
    return res.status(200).json(fallback);
  }

  try {
    const result = await fetchTmdbFilmsWide({
      page,
      language,
      platform,
      ageRestriction,
      genre,
      genres,
      contentType,
      origin,
      excludeIds,
      animationCap,
    });
    const films = Array.isArray(result?.films) ? result.films : [];
    const notice = String(result?.notice || "").trim();
    console.log("[TMDB] films fetched:", films.length);
    if (!films.length) {
      console.log("[TMDB] Empty TMDB response for active filters.");
      const emptyPayload = {
        value: [],
        notice:
          "Aucun film ne correspond exactement a ces criteres. OMQ conseille de relancer avec un filtre moins strict.",
      };
      setCachedFilms(cacheKey, emptyPayload);
      return res.status(200).json(emptyPayload);
    }
    const payload = films.slice(0, 120);
    setCachedFilms(cacheKey, payload);
    if (notice) {
      return res.status(200).json({
        value: payload,
        notice,
      });
    }
    return res.status(200).json(payload);
  } catch (error) {
    console.error("[TMDB] Error while fetching films:", error?.message || error);
    const fallback = withFallbackContext(fallbackCatalog, { platform, ageRestriction });
    setCachedFilms(cacheKey, fallback);
    return res.status(200).json(fallback);
  }
});

console.log(`[BOOT] About to call app.listen on 0.0.0.0:${PORT}`);
if (hasTmdbCredentials()) {
  console.log("[BOOT] TMDB credentials detected.");
} else {
  console.log("[BOOT] TMDB credentials missing (TMDB_API_KEY / TMDB_BEARER_TOKEN).");
}

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server started on port ${PORT}`);
  console.log(`[BOOT] Backend started from server.js`);
  console.log(`[BOOT] API started on http://0.0.0.0:${PORT}`);
  console.log(`[BOOT] Test endpoint: http://localhost:${PORT}/test`);
});

server.on("error", (error) => {
  if (error && error.code === "EADDRINUSE") {
    console.error(
      `[BOOT][ERROR] Port ${PORT} is already in use. Stop the other process and restart this server.`
    );
  } else {
    console.error("[BOOT][ERROR] Server failed to start:", error);
  }
  process.exit(1);
});
