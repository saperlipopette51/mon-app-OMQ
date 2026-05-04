import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import HomeScreen from "./src/screens/HomeScreen";
import FilmsScreen from "./src/screens/FilmsScreen";
import QuizScreen from "./src/screens/QuizScreen";
import RecommendationsScreen from "./src/screens/RecommendationsScreen";
import FavoritesScreen from "./src/screens/FavoritesScreen";
import { buildRecommendations, filmKey } from "./src/recommendations/engine";
import {
  createInitialPremiumState,
  getPremiumFeatureAccess,
} from "./src/premium/premiumConfig";

function normalizeApiBaseUrl(input) {
  let value = String(input || "").trim();
  if (!value) return "";

  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    value = `http://${value}`;
  }

  value = value.replace(/\/+$/, "");
  return value;
}

function isPrivateApiBaseUrl(input) {
  try {
    const parsed = new URL(normalizeApiBaseUrl(input));
    const host = String(parsed.hostname || "").toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    );
  } catch {
    return false;
  }
}

function getRuntimeMode() {
  return typeof __DEV__ !== "undefined" && __DEV__ ? "development" : "release";
}

function resolveApiBaseUrl() {
  const runtime = getRuntimeMode();
  const expoExtra = Constants?.expoConfig?.extra || {};
  const manifestExtra = Constants?.manifest?.extra || {};
  const productionCandidates = [
    { label: "env:EXPO_PUBLIC_PROD_API_URL", value: process.env.EXPO_PUBLIC_PROD_API_URL },
    { label: "env:EXPO_PUBLIC_PROD_API_BASE_URL", value: process.env.EXPO_PUBLIC_PROD_API_BASE_URL },
    { label: "extra:prodApiUrl", value: expoExtra.prodApiUrl },
    { label: "extra:prodApiBaseUrl", value: expoExtra.prodApiBaseUrl },
    { label: "manifest:prodApiUrl", value: manifestExtra.prodApiUrl },
    { label: "manifest:prodApiBaseUrl", value: manifestExtra.prodApiBaseUrl },
  ];
  const developmentCandidates = [
    { label: "env:EXPO_PUBLIC_API_URL", value: process.env.EXPO_PUBLIC_API_URL },
    { label: "env:EXPO_PUBLIC_API_BASE_URL", value: process.env.EXPO_PUBLIC_API_BASE_URL },
    { label: "extra:apiUrl", value: expoExtra.apiUrl },
    { label: "extra:apiBaseUrl", value: expoExtra.apiBaseUrl },
    { label: "manifest:apiUrl", value: manifestExtra.apiUrl },
    { label: "manifest:apiBaseUrl", value: manifestExtra.apiBaseUrl },
  ];
  const candidates =
    runtime === "release"
      ? [...productionCandidates, ...developmentCandidates]
      : [...developmentCandidates, ...productionCandidates];

  let hasInvalidCandidate = false;

  for (const candidate of candidates) {
    const raw = String(candidate.value || "").trim();
    if (!raw) continue;

    const normalized = normalizeApiBaseUrl(raw);
    try {
      const parsed = new URL(normalized);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        hasInvalidCandidate = true;
        continue;
      }
      return {
        value: `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(/\/+$/, ""),
        status: "ok",
        source: candidate.label,
        runtime,
        isPrivateLan: isPrivateApiBaseUrl(normalized),
      };
    } catch {
      hasInvalidCandidate = true;
    }
  }

  return {
    value: "",
    status: hasInvalidCandidate ? "bad_url" : "missing",
    source: "",
    runtime,
    isPrivateLan: false,
  };
}

const API_CONFIG = resolveApiBaseUrl();
const API_URL = API_CONFIG.value;
const API_URL_STATUS = API_CONFIG.status;
const API_RUNTIME_MODE = API_CONFIG.runtime;
const API_UNAVAILABLE_MESSAGE =
  "Backend indisponible. Lance le backend ou configure API_URL avec une URL publique HTTPS.";

const PREFERENCE_STORAGE_KEY = "@omq/preference-memory/v1";
const FAVORITES_STORAGE_KEY = "@omq/favorites/v1";
const NO_MATCH_MESSAGE =
  "OMQ a fouille sous tous les coussins du canape, mais rien ne matche vraiment. On refait le quiz avec des criteres un peu moins corses ?";
const PLATFORM_CANONICAL_MAP = {
  netflix: "netflix",
  "prime-video": "prime-video",
  "prime video": "prime-video",
  primevideo: "prime-video",
  amazon: "prime-video",
  "apple-tv": "apple-tv",
  "apple tv": "apple-tv",
  "apple tv+": "apple-tv",
  appletv: "apple-tv",
  "disney-plus": "disney-plus",
  "disney+": "disney-plus",
  "disney plus": "disney-plus",
  disney: "disney-plus",
  "hbo-max": "hbo-max",
  "hbo max": "hbo-max",
  hbomax: "hbo-max",
  hbo: "hbo-max",
  max: "hbo-max",
};

const PLATFORM_DISPLAY_LABELS = {
  netflix: "Netflix",
  "prime-video": "Prime Video",
  "apple-tv": "Apple TV",
  "disney-plus": "Disney+",
  "hbo-max": "HBO",
};

const LOCAL_FALLBACK_FILMS = [
  {
    id: 101,
    title: "Inception",
    year: 2010,
    release_date: "2010-07-16",
    type: "film",
    genre: "Science-fiction, Thriller",
    genres: ["Science-fiction", "Thriller"],
    genre_ids: [878, 53],
    overview: "Un voleur specialise dans l'infiltration des reves prend une mission impossible.",
    poster_path: "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
    poster_url: "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
    vote_average: 8.0,
    popularity: 78,
    original_language: "en",
  },
  {
    id: 102,
    title: "Parasite",
    year: 2019,
    release_date: "2019-05-30",
    type: "film",
    genre: "Drame, Thriller",
    genres: ["Drame", "Thriller"],
    genre_ids: [18, 53],
    overview: "Deux familles opposees se croisent dans une histoire aussi brillante qu'imprevisible.",
    poster_path: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    poster_url: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    vote_average: 8.5,
    popularity: 72,
    original_language: "ko",
  },
  {
    id: 103,
    title: "The Dark Knight",
    year: 2008,
    release_date: "2008-07-16",
    type: "film",
    genre: "Action, Crime, Thriller",
    genres: ["Action", "Crime", "Thriller"],
    genre_ids: [28, 80, 53],
    overview: "Batman affronte un ennemi chaotique qui fait vaciller Gotham.",
    poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    poster_url: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    vote_average: 8.5,
    popularity: 74,
    original_language: "en",
  },
  {
    id: 104,
    title: "Interstellar",
    year: 2014,
    release_date: "2014-11-05",
    type: "film",
    genre: "Aventure, Drame, Science-fiction",
    genres: ["Aventure", "Drame", "Science-fiction"],
    genre_ids: [12, 18, 878],
    overview: "Une mission spatiale desesperee pour offrir un futur a l'humanite.",
    poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    poster_url: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    vote_average: 8.4,
    popularity: 70,
    original_language: "en",
  },
  {
    id: 105,
    title: "Le Voyage de Chihiro",
    year: 2001,
    release_date: "2001-07-20",
    type: "film",
    genre: "Animation, Fantastique, Familial",
    genres: ["Animation", "Fantastique", "Familial"],
    genre_ids: [16, 14, 10751],
    overview: "Une jeune fille traverse un monde magique pour sauver ses parents.",
    poster_path: "/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
    poster_url: "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
    vote_average: 8.5,
    popularity: 66,
    original_language: "ja",
  },
  {
    id: 106,
    title: "Intouchables",
    year: 2011,
    release_date: "2011-11-02",
    type: "film",
    genre: "Comedie, Drame",
    genres: ["Comedie", "Drame"],
    genre_ids: [35, 18],
    overview: "Une rencontre improbable qui devient une amitie inoubliable.",
    poster_path: "/323BP0itpxTsO0skTwdnVmf7YC9.jpg",
    poster_url: "https://image.tmdb.org/t/p/w500/323BP0itpxTsO0skTwdnVmf7YC9.jpg",
    vote_average: 8.2,
    popularity: 60,
    original_language: "fr",
  },
  {
    id: 107,
    title: "Se7en",
    year: 1995,
    release_date: "1995-09-22",
    type: "film",
    genre: "Thriller, Crime, Mystere",
    genres: ["Thriller", "Crime", "Mystere"],
    genre_ids: [53, 80, 9648],
    overview: "Deux inspecteurs traquent un tueur qui rejoue les sept peches capitaux.",
    poster_path: "/6yoghtyTpznpBik8EngEmJskVUO.jpg",
    poster_url: "https://image.tmdb.org/t/p/w500/6yoghtyTpznpBik8EngEmJskVUO.jpg",
    vote_average: 8.3,
    popularity: 65,
    original_language: "en",
  },
  {
    id: 108,
    title: "Eternal Sunshine of the Spotless Mind",
    year: 2004,
    release_date: "2004-03-19",
    type: "film",
    genre: "Romantique, Drame, Science-fiction",
    genres: ["Romantique", "Drame", "Science-fiction"],
    genre_ids: [10749, 18, 878],
    overview: "Une histoire d'amour bouleversante a travers des souvenirs effaces.",
    poster_path: "/5MwkWH9tYHv3mV9OdYTMR5qreIz.jpg",
    poster_url: "https://image.tmdb.org/t/p/w500/5MwkWH9tYHv3mV9OdYTMR5qreIz.jpg",
    vote_average: 8.1,
    popularity: 58,
    original_language: "en",
  },
  {
    id: 201,
    title: "Breaking Bad",
    year: 2008,
    release_date: "2008-01-20",
    type: "serie",
    genre: "Drame, Crime, Thriller",
    genres: ["Drame", "Crime", "Thriller"],
    genre_ids: [18, 80, 53],
    overview: "Un prof de chimie bascule dans le crime apres un diagnostic choc.",
    poster_path: "/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg",
    poster_url: "https://image.tmdb.org/t/p/w500/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg",
    vote_average: 8.9,
    popularity: 89,
    original_language: "en",
  },
  {
    id: 202,
    title: "Stranger Things",
    year: 2016,
    release_date: "2016-07-15",
    type: "serie",
    genre: "Science-fiction, Drame, Horreur",
    genres: ["Science-fiction", "Drame", "Horreur"],
    genre_ids: [878, 18, 27],
    overview: "Des ados affrontent des evenements surnaturels dans une petite ville.",
    poster_path: "/x2LSRK2Cm7MZhjluni1msVJ3wDF.jpg",
    poster_url: "https://image.tmdb.org/t/p/w500/x2LSRK2Cm7MZhjluni1msVJ3wDF.jpg",
    vote_average: 8.6,
    popularity: 85,
    original_language: "en",
  },
  {
    id: 203,
    title: "Dark",
    year: 2017,
    release_date: "2017-12-01",
    type: "serie",
    genre: "Mystere, Drame, Science-fiction",
    genres: ["Mystere", "Drame", "Science-fiction"],
    genre_ids: [9648, 18, 878],
    overview: "Une disparition revele des secrets temporels dans une ville allemande.",
    poster_path: "/5Lo5rSl5Nq7ft8VYW6eFqIQZ1SB.jpg",
    poster_url: "https://image.tmdb.org/t/p/w500/5Lo5rSl5Nq7ft8VYW6eFqIQZ1SB.jpg",
    vote_average: 8.4,
    popularity: 76,
    original_language: "de",
  },
  {
    id: 204,
    title: "Arcane",
    year: 2021,
    release_date: "2021-11-06",
    type: "serie",
    genre: "Animation, Action, Drame",
    genres: ["Animation", "Action", "Drame"],
    genre_ids: [16, 28, 18],
    overview: "Deux soeurs opposent leurs destins entre magie, science et revolution.",
    poster_path: "/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg",
    poster_url: "https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg",
    vote_average: 8.7,
    popularity: 73,
    original_language: "en",
  },
  {
    id: 205,
    title: "The Bear",
    year: 2022,
    release_date: "2022-06-23",
    type: "serie",
    genre: "Comedie, Drame",
    genres: ["Comedie", "Drame"],
    genre_ids: [35, 18],
    overview: "Un chef de retour a Chicago tente de sauver la sandwicherie familiale.",
    poster_path: "/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg",
    poster_url: "https://image.tmdb.org/t/p/w500/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg",
    vote_average: 8.4,
    popularity: 68,
    original_language: "en",
  },
  {
    id: 206,
    title: "Blue Eye Samurai",
    year: 2023,
    release_date: "2023-11-03",
    type: "serie",
    genre: "Animation, Aventure, Action",
    genres: ["Animation", "Aventure", "Action"],
    genre_ids: [16, 12, 28],
    overview: "Une guerriere en quete de vengeance traverse un Japon impitoyable.",
    poster_path: "/xM2vDqXf43G2YDK4o5jR7fV2nQ3.jpg",
    poster_url: "https://image.tmdb.org/t/p/w500/xM2vDqXf43G2YDK4o5jR7fV2nQ3.jpg",
    vote_average: 8.8,
    popularity: 62,
    original_language: "en",
  },
  {
    id: 207,
    title: "Planet Earth",
    year: 2006,
    release_date: "2006-03-05",
    type: "serie",
    genre: "Documentary",
    genres: ["Documentary"],
    genre_ids: [99],
    overview: "Une exploration spectaculaire de la nature sur toute la planete.",
    poster_path: "/sK7dERW2Nw6Q6UN0k4u1QdXWg8Q.jpg",
    poster_url: "https://image.tmdb.org/t/p/w500/sK7dERW2Nw6Q6UN0k4u1QdXWg8Q.jpg",
    vote_average: 9.2,
    popularity: 54,
    original_language: "en",
  },
  {
    id: 208,
    title: "Heartstopper",
    year: 2022,
    release_date: "2022-04-22",
    type: "serie",
    genre: "Romance, Drame",
    genres: ["Romance", "Drame"],
    genre_ids: [10749, 18],
    overview: "Deux lyceens se rapprochent dans un recit tendre et lumineux.",
    poster_path: "/p3mRga4Rfj8Qjv6vGP3hR8dLQzV.jpg",
    poster_url: "https://image.tmdb.org/t/p/w500/p3mRga4Rfj8Qjv6vGP3hR8dLQzV.jpg",
    vote_average: 8.5,
    popularity: 57,
    original_language: "en",
  },
  {
    id: 209,
    title: "The Last of Us",
    year: 2023,
    release_date: "2023-01-15",
    type: "serie",
    genre: "Drame, Horreur, Aventure",
    genres: ["Drame", "Horreur", "Aventure"],
    genre_ids: [18, 27, 12],
    overview: "Deux survivants traversent une Amerique devastee par une pandemie.",
    poster_path: "/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg",
    poster_url: "https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg",
    vote_average: 8.6,
    popularity: 88,
    original_language: "en",
  },
  {
    id: 210,
    title: "Yellowstone",
    year: 2018,
    release_date: "2018-06-20",
    type: "serie",
    genre: "Western, Drame",
    genres: ["Western", "Drame"],
    genre_ids: [37, 18],
    overview: "Un patriarche defend son ranch contre des forces qui veulent le controler.",
    poster_path: "/43nVxM1QqfCk6k5Qqf1mBb7Y5QO.jpg",
    poster_url: "https://image.tmdb.org/t/p/w500/43nVxM1QqfCk6k5Qqf1mBb7Y5QO.jpg",
    vote_average: 8.2,
    popularity: 64,
    original_language: "en",
  },
  {
    id: 211,
    title: "Bluey",
    year: 2018,
    release_date: "2018-10-01",
    type: "serie",
    genre: "Family, Animation",
    genres: ["Family", "Animation"],
    genre_ids: [10751, 16],
    overview: "Une famille de chiens vit de petites aventures pleines d'humour et de tendresse.",
    poster_path: "/7M0I65xWKF2iKMrxw9A6xJxVnW5.jpg",
    poster_url: "https://image.tmdb.org/t/p/w500/7M0I65xWKF2iKMrxw9A6xJxVnW5.jpg",
    vote_average: 8.7,
    popularity: 61,
    original_language: "en",
  },
  {
    id: 212,
    title: "Glee",
    year: 2009,
    release_date: "2009-05-19",
    type: "serie",
    genre: "Music, Comedy, Drama",
    genres: ["Music", "Comedy", "Drama"],
    genre_ids: [10402, 35, 18],
    overview: "Des eleves montent une chorale et transforment leur lycee en scene musicale.",
    poster_path: "/9M4h9i0L7sRKqzZo4PMBVXgS5aX.jpg",
    poster_url: "https://image.tmdb.org/t/p/w500/9M4h9i0L7sRKqzZo4PMBVXgS5aX.jpg",
    vote_average: 7.2,
    popularity: 49,
    original_language: "en",
  },
];

function normalizeFilmsPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.value)) return payload.value;
  return [];
}

function toTmdbPosterUrl(path) {
  const value = String(path || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  return `https://image.tmdb.org/t/p/w500${normalizedPath}`;
}

function resolvePosterUri(film) {
  const directCandidates = [
    film?.poster_url,
    film?.posterUrl,
    film?.imageUrl,
    film?.image,
    film?.poster,
    film?.posterURI,
  ];

  for (const candidate of directCandidates) {
    const raw = String(candidate || "").trim();
    if (!raw) continue;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith("/")) return toTmdbPosterUrl(raw);
    if (raw.includes("image.tmdb.org")) {
      return raw.startsWith("http") ? raw : `https://${raw.replace(/^\/+/, "")}`;
    }
  }

  return toTmdbPosterUrl(film?.poster_path || film?.posterPath);
}

function pickRandomFromList(items = []) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)] || null;
}

function filmMatchesRequiredGenre(film, requiredGenre = "") {
  const targetGenre = String(requiredGenre || "").trim();
  if (!targetGenre) return true;
  const ids = Array.isArray(film?.genre_ids) ? film.genre_ids.map(String) : [];
  return ids.includes(targetGenre);
}

function recommendationMatchesRequiredGenre(item, requiredGenre = "") {
  const raw = item?.raw || item;
  return filmMatchesRequiredGenre(raw, requiredGenre);
}

function getRequestedGenres(quizPayload = {}) {
  const values = [
    quizPayload?.aggregatedAnswers?.genre,
    ...(Array.isArray(quizPayload?.users)
      ? quizPayload.users.map((user) => user?.genre)
      : []),
  ];
  return [
    ...new Set(
      values
        .map((value) => String(value || "").trim())
        .filter((value) => /^\d+$/.test(value))
    ),
  ];
}

function filmMatchesAnyRequiredGenre(film, requiredGenres = []) {
  const targets = Array.isArray(requiredGenres)
    ? requiredGenres.map((genre) => String(genre || "").trim()).filter(Boolean)
    : [String(requiredGenres || "").trim()].filter(Boolean);
  if (!targets.length) return true;
  const ids = Array.isArray(film?.genre_ids) ? film.genre_ids.map(String) : [];
  return targets.some((genre) => ids.includes(genre));
}

function recommendationMatchesAnyRequiredGenre(item, requiredGenres = []) {
  return filmMatchesAnyRequiredGenre(item?.raw || item, requiredGenres);
}

function filmMatchesRequiredType(film, requiredType = "") {
  const targetType = String(requiredType || "").trim();
  if (!targetType || targetType === "peu-importe") return true;
  const rawType = String(film?.type || film?.media_type || "")
    .toLowerCase()
    .trim();
  if (targetType === "serie") return rawType === "serie" || rawType === "tv";
  return rawType === "film" || rawType === "movie";
}

const ORIGIN_COUNTRY_HINTS = {
  us: ["US"],
  asie: ["KR", "JP", "CN", "HK", "TW"],
  coree: ["KR", "JP", "CN", "HK", "TW"],
  europe: ["FR", "DE", "IT", "ES", "BE", "NL", "SE", "DK", "NO", "FI", "PL", "IE"],
};

const ORIGIN_LANGUAGE_HINTS = {
  us: ["en"],
  asie: ["ko", "ja", "zh"],
  coree: ["ko", "ja", "zh"],
  europe: ["fr", "de", "it", "es", "sv", "da", "no", "fi", "nl", "pl"],
};

function normalizeOriginChoice(value = "") {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!raw || raw === "peu-importe" || raw === "peu importe") return "";
  if (["asie", "asian", "asiatique", "film asiatique", "coree", "korea", "kr", "japon", "japan", "jp", "chine", "china", "cn"].includes(raw)) return "asie";
  if (["us", "usa", "americain", "american"].includes(raw)) return "us";
  if (["europe", "europeen", "eu"].includes(raw)) return "europe";
  return raw;
}

function filmMatchesRequiredOrigin(film, requiredOrigin = "") {
  const targetOrigin = normalizeOriginChoice(requiredOrigin);
  if (!targetOrigin) return true;

  const allowedLanguages = ORIGIN_LANGUAGE_HINTS[targetOrigin] || [targetOrigin];
  const allowedCountries = ORIGIN_COUNTRY_HINTS[targetOrigin] || [targetOrigin.toUpperCase()];
  const language = String(film?.original_language || film?.language || "")
    .trim()
    .toLowerCase();
  const rawCountries = [
    film?.country,
    film?.origin,
    ...(Array.isArray(film?.origin_country) ? film.origin_country : []),
  ]
    .flatMap((value) => String(value || "").split(/[,\s|/]+/))
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);

  return (
    (language && allowedLanguages.includes(language)) ||
    rawCountries.some((country) => allowedCountries.includes(country))
  );
}

function recommendationMatchesRequiredOrigin(item, requiredOrigin = "") {
  return filmMatchesRequiredOrigin(item?.raw || item, requiredOrigin);
}

function toRecommendationItemFromFilm(film, fallbackScore = 70) {
  const title = String(film?.title || "Titre inconnu").trim();
  const releaseDate = String(film?.release_date || "").trim();
  const releaseYear =
    Number(film?.year) ||
    (/^\d{4}/.test(releaseDate) ? Number(releaseDate.slice(0, 4)) : "");
  const genres = Array.isArray(film?.genres) ? film.genres.filter(Boolean).join(", ") : "";

  return {
    key: String(film?.id ?? `${title}-${releaseDate || "na"}`),
    id: film?.id ?? title,
    title,
    year: releaseYear,
    genre: String(film?.genre || genres || "Genre non precise").trim(),
    score: Number(film?.score || fallbackScore),
    why: "Alternative coherente selon vos choix du quiz.",
    posterUri: resolvePosterUri(film),
    summary: String(
      film?.overview || film?.description || film?.summary || "Resume indisponible pour ce titre."
    ).trim(),
    raw: {
      ...(film || {}),
    },
  };
}

function pickFirstDifferentFilm({
  films,
  excludedKeys = [],
  excludedTitles = [],
  requiredGenre = "",
  requiredGenres = [],
  requiredContentType = "",
  requiredOrigin = "",
}) {
  const keySet = new Set((excludedKeys || []).map((key) => String(key)));
  const titleSet = new Set((excludedTitles || []).map((title) => normalizeTitle(title)));
  const candidates = [];

  for (const film of Array.isArray(films) ? films : []) {
    const key = String(film?.id ?? "");
    const titleKey = normalizeTitle(film?.title);
    if (key && keySet.has(key)) continue;
    if (titleKey && titleSet.has(titleKey)) continue;
    if (!filmMatchesRequiredType(film, requiredContentType)) continue;
    if (!filmMatchesAnyRequiredGenre(film, requiredGenres.length ? requiredGenres : requiredGenre)) {
      continue;
    }
    if (!filmMatchesRequiredOrigin(film, requiredOrigin)) continue;
    candidates.push(film);
  }

  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)] || null;
}

async function fetchJsonWithTimeout(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  console.log("[API] request", { url, timeoutMs });
  try {
    const response = await fetch(url, { signal: controller.signal });
    const rawBody = await response.text();
    const parsedBody = safeParseJson(rawBody, {});
    const itemCount = Array.isArray(parsedBody)
      ? parsedBody.length
      : Array.isArray(parsedBody?.value)
      ? parsedBody.value.length
      : 0;
    console.log("[API] response", {
      url,
      status: response.status,
      ok: response.ok,
      ms: Date.now() - startedAt,
      itemCount,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${rawBody.slice(0, 160)}`);
    }
    return parsedBody;
  } catch (error) {
    console.log("[API] error", {
      url,
      ms: Date.now() - startedAt,
      message: String(error?.message || error),
    });
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function checkBackendHealth(apiBaseUrl, timeoutMs = 2500) {
  if (!apiBaseUrl) {
    return { ok: false, reason: "missing_url" };
  }

  const endpoints = [`${apiBaseUrl}/test`, `${apiBaseUrl}/health`];

  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      console.log("[API] health:request", { endpoint, timeoutMs });
      const response = await fetch(endpoint, { signal: controller.signal });
      console.log("[API] health:response", {
        endpoint,
        status: response.status,
        ok: response.ok,
      });
      if (response.ok) {
        return { ok: true, endpoint };
      }
    } catch (error) {
      console.log("[API] health:error", {
        endpoint,
        message: String(error?.message || error),
      });
      // try next endpoint
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return { ok: false, reason: "unreachable" };
}

function normalizeTitle(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function safeParseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeUserKey(name, index) {
  const normalized = normalizeTitle(name);
  if (normalized) return normalized;
  return `participant_${index + 1}`;
}

function getQuizUserKeys(quizPayload) {
  const users = Array.isArray(quizPayload?.users) ? quizPayload.users : [];
  const keys = users.map((user, index) => normalizeUserKey(user?.firstName, index));
  return [...new Set(keys)];
}

function getMemoryBucket(memory, userKey) {
  const bucket = memory?.[userKey];
  return {
    liked: { ...(bucket?.liked || {}) },
    disliked: { ...(bucket?.disliked || {}) },
    seen: { ...(bucket?.seen || {}) },
  };
}

function updateMemoryForUsers(memory, userKeys, updateBucket) {
  if (!Array.isArray(userKeys) || userKeys.length === 0) return memory;
  const next = { ...(memory || {}) };
  for (const key of userKeys) {
    const bucket = getMemoryBucket(next, key);
    const updated = updateBucket(bucket) || bucket;
    next[key] = {
      liked: { ...(updated.liked || {}) },
      disliked: { ...(updated.disliked || {}) },
      seen: { ...(updated.seen || {}) },
    };
  }
  return next;
}

function collectMemoryAvoidTitles(memory, userKeys) {
  if (!Array.isArray(userKeys) || userKeys.length === 0) return [];
  const avoided = new Set();
  for (const key of userKeys) {
    const bucket = memory?.[key];
    Object.keys(bucket?.disliked || {}).forEach((title) => avoided.add(title));
    Object.keys(bucket?.seen || {}).forEach((title) => avoided.add(title));
  }
  return [...avoided];
}

function canonicalizePlatform(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  const compact = raw.replace(/[_\s]+/g, " ").trim();
  const dashed = compact.replace(/\s+/g, "-");
  if (PLATFORM_CANONICAL_MAP[raw]) return PLATFORM_CANONICAL_MAP[raw];
  if (PLATFORM_CANONICAL_MAP[compact]) return PLATFORM_CANONICAL_MAP[compact];
  if (PLATFORM_CANONICAL_MAP[dashed]) return PLATFORM_CANONICAL_MAP[dashed];
  if (compact.includes("disney")) return "disney-plus";
  if (compact.includes("hbo") || compact.includes("max")) return "hbo-max";
  return raw;
}

function toPlatformLabel(value) {
  const canonical = canonicalizePlatform(value);
  return PLATFORM_DISPLAY_LABELS[canonical] || String(value || "").trim();
}

function withItemPlatform(item, platformValue) {
  const label = toPlatformLabel(platformValue);
  if (!label) return item;
  return {
    ...item,
    raw: {
      ...(item?.raw || {}),
      platform: label,
    },
  };
}

function normalizePlatformList(value) {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  const cleaned = raw
    .map((entry) => canonicalizePlatform(entry))
    .filter(Boolean);
  return [...new Set(cleaned)];
}

function getSelectedPlatforms(globalAnswers = {}) {
  const platforms = normalizePlatformList(globalAnswers.platforms);
  if (platforms.length > 0) return platforms;
  return normalizePlatformList(globalAnswers.platform);
}

function withScopedPlatform(quizPayload, platform) {
  const base = quizPayload || {};
  const selectedPlatforms = getSelectedPlatforms(base.globalAnswers || {});
  return {
    ...base,
    globalAnswers: {
      ...(base.globalAnswers || {}),
      platform: platform || "",
      platforms: selectedPlatforms,
    },
  };
}

function uniqueRecommendations(items) {
  const byKey = new Set();
  const byTitle = new Set();
  const unique = [];

  for (const item of Array.isArray(items) ? items : []) {
    const key = String(filmKey(item));
    const titleKey = normalizeTitle(item?.title);
    if (byKey.has(key)) continue;
    if (titleKey && byTitle.has(titleKey)) continue;
    byKey.add(key);
    if (titleKey) byTitle.add(titleKey);
    unique.push(item);
  }

  return unique;
}

function uniqueFilms(items) {
  const byKey = new Set();
  const byTitle = new Set();
  const unique = [];

  for (const item of Array.isArray(items) ? items : []) {
    const key = String(item?.id ?? "");
    const titleKey = normalizeTitle(item?.title);
    if (key && byKey.has(key)) continue;
    if (titleKey && byTitle.has(titleKey)) continue;
    if (key) byKey.add(key);
    if (titleKey) byTitle.add(titleKey);
    unique.push(item);
  }
  return unique;
}

function pickCandidatePages() {
  const base = 1 + Math.floor(Math.random() * 4);
  const pages = [base, base + 1].map((page) => ((page - 1) % 8) + 1);
  return [...new Set(pages)];
}

function pickWidePages() {
  return [1, 2, 3, 4];
}

function buildFilmsUrl(baseUrl, query = {}) {
  const params = new URLSearchParams();
  if (query.language) params.set("language", query.language);
  if (query.page) params.set("page", String(query.page));
  if (query.platform) params.set("platform", String(query.platform));
  if (query.ageRestriction) {
    params.set("ageRestriction", String(query.ageRestriction));
  }
  if (query.genre) params.set("genre", String(query.genre));
  if (query.genres) params.set("genres", String(query.genres));
  if (query.contentType) params.set("contentType", String(query.contentType));
  if (query.origin) params.set("origin", String(query.origin));

  const suffix = params.toString();
  return suffix ? `${baseUrl}?${suffix}` : baseUrl;
}

function buildRelaxedQuizPayload(
  quizPayload,
  { relaxPlatform = false, relaxOrigin = false, relaxAge = false } = {}
) {
  const base = normalizeQuizPayload(quizPayload || {});
  const selectedPlatforms = getSelectedPlatforms(base.globalAnswers || {});
  const keptPlatform = selectedPlatforms[0] || base.globalAnswers?.platform || "";

  return {
    ...base,
    globalAnswers: {
      ...(base.globalAnswers || {}),
      platform: relaxPlatform ? "" : keptPlatform,
      platforms: relaxPlatform ? [] : selectedPlatforms,
      ageRestriction: relaxAge ? "" : base.globalAnswers?.ageRestriction || "",
    },
    aggregatedAnswers: {
      ...(base.aggregatedAnswers || {}),
      platform: relaxPlatform ? "" : keptPlatform,
      origin: relaxOrigin ? "peu-importe" : base.aggregatedAnswers?.origin || "",
      ageRestriction: relaxAge
        ? ""
        : base.aggregatedAnswers?.ageRestriction || base.globalAnswers?.ageRestriction || "",
    },
  };
}

function buildRecommendationsExactForPayload({
  films,
  quizPayload,
  answers,
  max,
  randomize,
  excludedKeys,
  avoidTitles,
}) {
  const selectedPlatforms = getSelectedPlatforms(quizPayload?.globalAnswers || {});

  if (selectedPlatforms.length <= 1) {
    const fallbackPlatform =
      selectedPlatforms[0] ||
      canonicalizePlatform(answers?.platform || quizPayload?.globalAnswers?.platform);

    const single = buildRecommendations({
      films,
      answers: answers || {},
      quizPayload,
      max,
      randomize,
      excludedKeys,
      avoidTitles,
    });
    return single.map((item) =>
      item?.raw?.platform ? item : withItemPlatform(item, fallbackPlatform)
    );
  }

  const perPlatformLimit = Math.max(2, Math.ceil(max / selectedPlatforms.length) + 1);
  const perPlatformResults = [];

  for (const platform of selectedPlatforms) {
    const scopedQuizPayload = withScopedPlatform(quizPayload, platform);
    const scopedAnswers = { ...(answers || {}), platform };
    const scoped = buildRecommendations({
      films,
      answers: scopedAnswers,
      quizPayload: scopedQuizPayload,
      max: perPlatformLimit,
      randomize,
      excludedKeys,
      avoidTitles,
    });
    const scopedWithPlatform = scoped.map((item) =>
      item?.raw?.platform ? item : withItemPlatform(item, platform)
    );
    perPlatformResults.push({ platform, items: scopedWithPlatform });
  }

  const merged = perPlatformResults.flatMap((entry) => entry.items);
  const ordered = randomize
    ? [...merged].sort(() => Math.random() - 0.5)
    : [...merged].sort((a, b) => Number(b?.score || 0) - Number(a?.score || 0));
  const uniqueOrdered = uniqueRecommendations(ordered);

  const selected = [];
  const usedKeys = new Set();
  const usedTitles = new Set();
  const platformCounts = new Map();
  const maxPerPlatform = Math.max(
    2,
    Math.ceil(max / Math.max(1, selectedPlatforms.length)) + 1
  );

  const getItemPlatformKey = (item) => {
    const rawPlatform =
      item?.raw?.platform || item?.platform || item?.raw?.provider || "";
    return canonicalizePlatform(rawPlatform);
  };

  const tryPush = (item, withPlatformCap = false) => {
    if (!item) return false;
    const itemKey = String(filmKey(item));
    const titleKey = normalizeTitle(item?.title);
    if (usedKeys.has(itemKey)) return false;
    if (titleKey && usedTitles.has(titleKey)) return false;
    const platformKey = getItemPlatformKey(item);
    if (withPlatformCap && platformKey) {
      const count = platformCounts.get(platformKey) || 0;
      if (count >= maxPerPlatform) return false;
    }
    selected.push(item);
    usedKeys.add(itemKey);
    if (titleKey) usedTitles.add(titleKey);
    if (platformKey) {
      platformCounts.set(platformKey, (platformCounts.get(platformKey) || 0) + 1);
    }
    return true;
  };

  for (const entry of perPlatformResults) {
    const candidate = randomize
      ? entry.items[Math.floor(Math.random() * entry.items.length)]
      : entry.items[0];
    tryPush(candidate);
    if (selected.length >= max) break;
  }

  if (selected.length < max) {
    for (const item of uniqueOrdered) {
      if (selected.length >= max) break;
      tryPush(item, true);
    }
  }

  if (selected.length < max) {
    for (const item of uniqueOrdered) {
      if (selected.length >= max) break;
      tryPush(item, false);
    }
  }

  return selected.slice(0, max);
}

function buildRecommendationsForPlatforms({
  films,
  quizPayload,
  answers,
  max,
  randomize,
  excludedKeys,
  avoidTitles,
}) {
  const stages = [
    {
      key: "strict",
      relaxPlatform: false,
      relaxOrigin: false,
      relaxAge: false,
    },
    {
      key: "relax_platform",
      relaxPlatform: true,
      relaxOrigin: false,
      relaxAge: false,
    },
    {
      key: "relax_country",
      relaxPlatform: true,
      relaxOrigin: true,
      relaxAge: false,
    },
    {
      key: "relax_age",
      relaxPlatform: true,
      relaxOrigin: true,
      relaxAge: true,
    },
  ];

  let merged = [];
  for (const stage of stages) {
    if (merged.length >= max) break;

    const relaxedQuizPayload = buildRelaxedQuizPayload(quizPayload, stage);
    const relaxedAnswers = {
      ...(answers || {}),
      platform: relaxedQuizPayload?.aggregatedAnswers?.platform || "",
      ageRestriction: relaxedQuizPayload?.globalAnswers?.ageRestriction || "",
      origin: relaxedQuizPayload?.aggregatedAnswers?.origin || "",
    };

    const stageItems = buildRecommendationsExactForPayload({
      films,
      quizPayload: relaxedQuizPayload,
      answers: relaxedAnswers,
      max,
      randomize: randomize || stage.key !== "strict",
      excludedKeys,
      avoidTitles,
    });

    if (stageItems.length > 0) {
      merged = uniqueRecommendations([...merged, ...stageItems]).slice(0, max);
    }
  }

  return merged.slice(0, max);
}

function pickMajority(values) {
  const counts = new Map();
  for (const value of values) {
    const key = String(value || "").trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[0] || "";
}

function normalizeQuizPayload(payload) {
  if (payload && Array.isArray(payload.users)) {
    const users = payload.users;
    const platforms = getSelectedPlatforms(payload?.globalAnswers || {});
    const primaryPlatform = platforms[0] || "";
    const globalAnswers = {
      ageRestriction: payload?.globalAnswers?.ageRestriction || "",
      platform: primaryPlatform,
      platforms,
    };
    return {
      participantCount: Number(payload.participantCount || users.length || 1),
      globalAnswers,
      users,
      aggregatedAnswers: {
        firstName: users.map((u) => u?.firstName).filter(Boolean).join(", "),
        ageRestriction: globalAnswers.ageRestriction,
        platform: primaryPlatform,
        contentType: pickMajority(users.map((u) => u?.contentType)),
        genre: pickMajority(users.map((u) => u?.genre)),
        origin: pickMajority(users.map((u) => u?.origin)),
      },
    };
  }

  const fallback = payload || {};
  const platforms = getSelectedPlatforms(fallback);
  const primaryPlatform = platforms[0] || fallback.platform || "";
  return {
    participantCount: 1,
    globalAnswers: {
      ageRestriction: fallback.ageRestriction || "",
      platform: primaryPlatform,
      platforms,
    },
    users: [fallback],
    aggregatedAnswers: {
      firstName: fallback.firstName || "",
      ageRestriction: fallback.ageRestriction || "",
      platform: primaryPlatform,
      contentType: fallback.contentType || "",
      genre: fallback.genre || "",
      origin: fallback.origin || "",
    },
  };
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [premiumState] = useState(createInitialPremiumState);
  const VALID_SCREENS = ["home", "films", "quiz", "recommendations", "favorites"];

  const [filmsState, setFilmsState] = useState({
    loading: false,
    error: "",
    items: [],
  });

  const [recommendationState, setRecommendationState] = useState({
    loading: false,
    error: "",
    notice: "",
    items: [],
    answers: null,
    quizPayload: null,
  });

  const [likedMap, setLikedMap] = useState({});
  const [dislikedMap, setDislikedMap] = useState({});
  const [seenMap, setSeenMap] = useState({});
  const [favoriteMap, setFavoriteMap] = useState({});
  const [usedTitleMap, setUsedTitleMap] = useState({});
  const [activeUserKeys, setActiveUserKeys] = useState([]);
  const [preferenceMemory, setPreferenceMemory] = useState({});
  const [memoryHydrated, setMemoryHydrated] = useState(false);
  const [favoritesHydrated, setFavoritesHydrated] = useState(false);
  const premiumFeatureAccess = useMemo(
    () => getPremiumFeatureAccess(premiumState),
    [premiumState]
  );
  void premiumFeatureAccess;

  useEffect(() => {
    if (!VALID_SCREENS.includes(screen)) {
      console.log("[APP] ecran invalide detecte, retour home", { screen });
      setScreen("home");
    }
  }, [screen]);

  const hasApiUrl = API_URL_STATUS === "ok" && Boolean(API_URL);
  const apiFilmsUrl = useMemo(() => (API_URL ? `${API_URL}/films` : ""), []);

  const resolveBackendAvailability = useCallback(async () => {
    console.log("[API] config", {
      status: API_URL_STATUS,
      runtime: API_RUNTIME_MODE,
      source: API_CONFIG.source || "(none)",
      apiUrl: API_URL || "(vide)",
      isPrivateLan: Boolean(API_CONFIG.isPrivateLan),
    });
    if (API_URL_STATUS === "bad_url") {
      return { ok: false, reason: "bad_url" };
    }
    if (!hasApiUrl) {
      return { ok: false, reason: "missing_url" };
    }
    return checkBackendHealth(API_URL, 2500);
  }, [hasApiUrl]);

  useEffect(() => {
    console.log("[APP] demarrage", {
      apiUrlStatus: API_URL_STATUS,
      apiUrl: API_URL || "(vide)",
      apiRuntime: API_RUNTIME_MODE,
      apiSource: API_CONFIG.source || "(none)",
      apiIsPrivateLan: Boolean(API_CONFIG.isPrivateLan),
    });
  }, []);

  useEffect(() => {
    console.log("[APP] render principal", {
      screen,
      filmsLoading: filmsState.loading,
      recoLoading: recommendationState.loading,
      filmsCount: Array.isArray(filmsState.items) ? filmsState.items.length : 0,
      recoCount: Array.isArray(recommendationState.items)
        ? recommendationState.items.length
        : 0,
    });
  }, [
    screen,
    filmsState.loading,
    filmsState.items,
    recommendationState.loading,
    recommendationState.items,
  ]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PREFERENCE_STORAGE_KEY);
        const parsed = raw ? safeParseJson(raw, {}) : {};
        if (mounted && parsed && typeof parsed === "object") {
          setPreferenceMemory(parsed);
        }
      } catch (error) {
        console.log("[MEMORY] impossible de charger les preferences", error);
      } finally {
        if (mounted) setMemoryHydrated(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
        const parsed = raw ? safeParseJson(raw, {}) : {};
        if (mounted && parsed && typeof parsed === "object") {
          setFavoriteMap(parsed);
        }
      } catch (error) {
        console.log("[FAVORITES] impossible de charger les favoris", error);
      } finally {
        if (mounted) setFavoritesHydrated(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!memoryHydrated) return;
    AsyncStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(preferenceMemory)).catch(
      (error) => {
        console.log("[MEMORY] impossible de sauvegarder les preferences", error);
      }
    );
  }, [memoryHydrated, preferenceMemory]);

  useEffect(() => {
    if (!favoritesHydrated) return;
    AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteMap)).catch((error) => {
      console.log("[FAVORITES] impossible de sauvegarder les favoris", error);
    });
  }, [favoriteMap, favoritesHydrated]);

  const registerUsedTitles = useCallback((items) => {
    setUsedTitleMap((prev) => {
      const next = { ...prev };
      for (const item of Array.isArray(items) ? items : []) {
        const titleKey = normalizeTitle(item?.title);
        if (!titleKey) continue;
        next[titleKey] = true;
      }
      return next;
    });
  }, []);

  const refreshFilms = useCallback(async () => {
    console.log("[FETCH] refreshFilms:start", { hasApiUrl, apiFilmsUrl });
    if (!hasApiUrl) {
      setFilmsState({
        loading: false,
        error: "API_URL introuvable. Configure une URL API valide.",
        items: [],
      });
      console.log("[FETCH] refreshFilms:skip missing api url");
      return;
    }

    setFilmsState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const data = await fetchJsonWithTimeout(
        buildFilmsUrl(apiFilmsUrl, {
          language: "fr-FR",
          page: 1,
        })
      );
      setFilmsState({
        loading: false,
        error: "",
        items: normalizeFilmsPayload(data),
      });
      console.log("[FETCH] refreshFilms:success");
    } catch (error) {
      console.log("[FETCH] refreshFilms:error", error);
      setFilmsState({
        loading: false,
        error: String(error?.message || "Erreur reseau"),
        items: [],
      });
    }
  }, [apiFilmsUrl, hasApiUrl]);

  const buildAndSetRecommendations = useCallback(
    (quizPayload, films, randomize = false, notice = "") => {
      try {
        const safeFilms = Array.isArray(films) ? films : [];
        console.log("[RECO] appel fonction recommandation", {
          randomize,
          filmsCount: safeFilms.length,
        });

        const previousItems = Array.isArray(recommendationState.items)
          ? recommendationState.items
          : [];
        const previousKeys = previousItems.map((item) => String(filmKey(item)));
        const seenKeys = Object.keys(seenMap).filter((key) => seenMap[key]);
        const dislikedKeys = Object.keys(dislikedMap).filter((key) => dislikedMap[key]);
        const historicalTitles = Object.keys(usedTitleMap);
        const currentTitles = previousItems.map((item) => item.title);
        const scopedUserKeys = getQuizUserKeys(quizPayload);
        const memoryUserKeys = scopedUserKeys.length ? scopedUserKeys : activeUserKeys;
        const memoryAvoidTitles = collectMemoryAvoidTitles(preferenceMemory, memoryUserKeys);

        const recommendations = buildRecommendationsForPlatforms({
          films,
          quizPayload,
          answers: quizPayload?.aggregatedAnswers || {},
          max: 5,
          randomize,
          excludedKeys: [...seenKeys, ...dislikedKeys],
          avoidTitles: [
            ...historicalTitles,
            ...memoryAvoidTitles,
            ...(randomize ? currentTitles : []),
          ],
        });

        let uniqueItems = uniqueRecommendations(recommendations).slice(0, 5);

        if (uniqueItems.length < 5) {
          const fallback = buildRecommendationsForPlatforms({
            films: safeFilms,
            quizPayload,
            answers: quizPayload?.aggregatedAnswers || {},
            max: 5,
            randomize: true,
            excludedKeys: [...seenKeys, ...dislikedKeys],
            avoidTitles: [
              ...memoryAvoidTitles,
              ...(randomize ? currentTitles : []),
            ],
          });
          uniqueItems = uniqueRecommendations([...uniqueItems, ...fallback]).slice(0, 5);
        }

        if (uniqueItems.length < 5) {
          const relaxed = buildRecommendationsForPlatforms({
            films: safeFilms,
            quizPayload,
            answers: quizPayload?.aggregatedAnswers || {},
            max: 5,
            randomize: true,
            excludedKeys: [...seenKeys, ...dislikedKeys],
            avoidTitles: [],
          });
          uniqueItems = uniqueRecommendations([...uniqueItems, ...relaxed]).slice(0, 5);
        }

        if (randomize && uniqueItems.length > 0 && previousKeys.length > 0) {
          const nextKeys = uniqueItems.map((item) => String(filmKey(item)));
          const unchanged =
            nextKeys.length === previousKeys.length &&
            nextKeys.every((key, index) => key === previousKeys[index]);

          if (unchanged) {
            const reroll = buildRecommendationsForPlatforms({
              films: safeFilms,
              quizPayload,
              answers: quizPayload?.aggregatedAnswers || {},
              max: 5,
              randomize: true,
              excludedKeys: [...seenKeys, ...dislikedKeys, ...nextKeys],
              avoidTitles: [...historicalTitles, ...memoryAvoidTitles],
            });
            if (reroll.length > 0) {
              uniqueItems = uniqueRecommendations([...reroll, ...uniqueItems]).slice(0, 5);
            }
          }
        }

        if (uniqueItems.length < 5) {
          const targetGenres = getRequestedGenres(quizPayload);
          const targetType = String(quizPayload?.aggregatedAnswers?.contentType || "").trim();
          const targetOrigin = String(quizPayload?.aggregatedAnswers?.origin || "").trim();
          const currentKeys = new Set(uniqueItems.map((item) => String(filmKey(item))));
          const currentTitles = new Set(uniqueItems.map((item) => normalizeTitle(item?.title)));

          const inferFilmType = (film) => {
            const t = String(film?.type || film?.media_type || "")
              .toLowerCase()
              .trim();
            if (t === "tv" || t.includes("serie")) return "serie";
            return "film";
          };

          const genreStrictPool = safeFilms.filter((film) => {
            const idKey = String(film?.id ?? "");
            const titleKey = normalizeTitle(film?.title);
            if ((idKey && currentKeys.has(idKey)) || (titleKey && currentTitles.has(titleKey))) {
              return false;
            }
            if (targetType && targetType !== "peu-importe" && inferFilmType(film) !== targetType) {
              return false;
            }
            if (!filmMatchesRequiredOrigin(film, targetOrigin)) {
              return false;
            }
            return filmMatchesAnyRequiredGenre(film, targetGenres);
          });

          for (const film of genreStrictPool) {
            if (uniqueItems.length >= 5) break;
            const item = toRecommendationItemFromFilm(film, 62);
            const key = String(filmKey(item));
            const titleKey = normalizeTitle(item?.title);
            if (currentKeys.has(key) || (titleKey && currentTitles.has(titleKey))) continue;
            uniqueItems.push(item);
            currentKeys.add(key);
            if (titleKey) currentTitles.add(titleKey);
          }

          if (uniqueItems.length < 5 && !targetGenres.length) {
            const typeOnlyPool = safeFilms.filter((film) => {
              const idKey = String(film?.id ?? "");
              const titleKey = normalizeTitle(film?.title);
              if ((idKey && currentKeys.has(idKey)) || (titleKey && currentTitles.has(titleKey))) {
                return false;
              }
              if (targetType && targetType !== "peu-importe" && inferFilmType(film) !== targetType) {
                return false;
              }
              if (!filmMatchesRequiredOrigin(film, targetOrigin)) {
                return false;
              }
              return true;
            });

            for (const film of typeOnlyPool) {
              if (uniqueItems.length >= 5) break;
              const item = toRecommendationItemFromFilm(film, 58);
              const key = String(filmKey(item));
              const titleKey = normalizeTitle(item?.title);
              if (currentKeys.has(key) || (titleKey && currentTitles.has(titleKey))) continue;
              uniqueItems.push(item);
              currentKeys.add(key);
              if (titleKey) currentTitles.add(titleKey);
            }
          } else if (uniqueItems.length < 5 && targetGenres.length) {
            console.log("[RECO] complement arrete: genre obligatoire conserve", {
              targetGenres,
              count: uniqueItems.length,
            });
          }
        }

        const requiredGenres = getRequestedGenres(quizPayload);
        if (requiredGenres.length) {
          const beforeGenreGuard = uniqueItems.length;
          uniqueItems = uniqueItems.filter((item) =>
            recommendationMatchesAnyRequiredGenre(item, requiredGenres)
          );
          if (beforeGenreGuard !== uniqueItems.length) {
            console.log("[RECO] garde finale genre: elements hors genre retires", {
              requiredGenres,
              before: beforeGenreGuard,
              after: uniqueItems.length,
            });
          }
        }

        const requiredOrigin = String(quizPayload?.aggregatedAnswers?.origin || "").trim();
        if (normalizeOriginChoice(requiredOrigin)) {
          const beforeOriginGuard = uniqueItems.length;
          uniqueItems = uniqueItems.filter((item) =>
            recommendationMatchesRequiredOrigin(item, requiredOrigin)
          );
          if (beforeOriginGuard !== uniqueItems.length) {
            console.log("[RECO] garde finale origine: elements hors origine retires", {
              requiredOrigin,
              before: beforeOriginGuard,
              after: uniqueItems.length,
            });
          }
        }

        registerUsedTitles(uniqueItems);
        console.log("[RECO] resultat final genere", uniqueItems);

        setRecommendationState({
          loading: false,
          error: uniqueItems.length === 0 ? NO_MATCH_MESSAGE : "",
          notice: uniqueItems.length > 0 ? notice : "",
          items: uniqueItems,
          answers: quizPayload?.aggregatedAnswers || null,
          quizPayload,
        });
        setScreen("recommendations");
        return uniqueItems;
      } catch (error) {
        console.log("[RECO] erreur buildAndSetRecommendations", error);
        setRecommendationState((prev) => ({
          ...prev,
          loading: false,
          error: NO_MATCH_MESSAGE,
          notice: prev.notice || "Mode stable actif.",
          items: Array.isArray(prev.items) ? prev.items : [],
          answers: quizPayload?.aggregatedAnswers || prev.answers || null,
          quizPayload: quizPayload || prev.quizPayload || null,
        }));
        setScreen("recommendations");
        return [];
      }
    },
    [
      activeUserKeys,
      dislikedMap,
      preferenceMemory,
      recommendationState.items,
      registerUsedTitles,
      seenMap,
      usedTitleMap,
    ]
  );

  const handleQuizComplete = useCallback(
    async (quizPayloadInput) => {
      try {
      const quizPayload = normalizeQuizPayload(quizPayloadInput);
      const quizUserKeys = getQuizUserKeys(quizPayload);
      setActiveUserKeys(quizUserKeys);
      console.log("[QUIZ] nombre d'utilisateurs", quizPayload.participantCount);
      console.log("[QUIZ] reponses globales", quizPayload.globalAnswers);
      console.log("[QUIZ] reponses stockees", quizPayload.users);
      console.log("[MEMORY] utilisateurs actifs", quizUserKeys);
      setLikedMap({});
      setDislikedMap({});
      setSeenMap({});

      setScreen("recommendations");
      setRecommendationState((prev) => ({
        ...prev,
        loading: true,
        error: "",
        notice: "",
        answers: quizPayload.aggregatedAnswers,
        quizPayload,
      }));

      let films = [];
      let notice = "";
      const backendAvailability = await resolveBackendAvailability();

      if (!backendAvailability.ok) {
        notice =
          backendAvailability.reason === "bad_url"
            ? "API_URL invalide. Configure une URL API valide."
            : API_UNAVAILABLE_MESSAGE;
        setFilmsState((prev) => ({
          ...prev,
          loading: false,
          error: notice,
          items: [],
        }));
        setRecommendationState((prev) => ({
          ...prev,
          loading: false,
          error: notice,
          notice: "",
          items: [],
          answers: quizPayload.aggregatedAnswers,
          quizPayload,
        }));
        console.log("[RECO] API indisponible: recommandations bloquees", backendAvailability);
        return;
      } else {
        try {
          const selectedPlatforms = getSelectedPlatforms(quizPayload.globalAnswers || {});
          const requestedGenres = getRequestedGenres(quizPayload);
          const requestedOrigin = String(quizPayload?.aggregatedAnswers?.origin || "").trim();
          const hasRequestedOrigin = Boolean(normalizeOriginChoice(requestedOrigin));
          const fetchStages = [
            {
              key: "strict",
              usePlatform: true,
              useOrigin: true,
              useAge: true,
            },
            {
              key: "relax_platform",
              usePlatform: false,
              useOrigin: true,
              useAge: true,
            },
            {
              key: "relax_country",
              usePlatform: false,
              useOrigin: false,
              useAge: true,
            },
            {
              key: "relax_age",
              usePlatform: false,
              useOrigin: false,
              useAge: false,
            },
          ];

          let pooledFilms = [];
          let usedRelaxationStage = "";

          for (const stage of fetchStages) {
            const pagesForStage = pickCandidatePages();
            const requestPlatforms =
              stage.usePlatform && selectedPlatforms.length > 0 ? selectedPlatforms : [""];
            const responses = await Promise.allSettled(
              requestPlatforms.flatMap((platform) =>
                pagesForStage.map(async (page) => {
                  const filmsUrl = buildFilmsUrl(apiFilmsUrl, {
                    language: "fr-FR",
                    page,
                    platform,
                    ageRestriction: stage.useAge
                      ? quizPayload.globalAnswers.ageRestriction
                      : "",
                    genre: quizPayload?.aggregatedAnswers?.genre || "",
                    genres: requestedGenres.join(","),
                    contentType: quizPayload?.aggregatedAnswers?.contentType || "",
                    origin: stage.useOrigin || hasRequestedOrigin ? requestedOrigin : "",
                  });
                  const data = await fetchJsonWithTimeout(filmsUrl);
                  return {
                    films: normalizeFilmsPayload(data),
                    notice: String(data?.notice || "").trim(),
                  };
                })
              )
            );

            const fulfilledPayloads = responses
              .filter((result) => result.status === "fulfilled")
              .map((result) => result.value);
            const stageFilms = uniqueFilms(fulfilledPayloads.flatMap((entry) => entry.films || []));
            pooledFilms = uniqueFilms([...pooledFilms, ...stageFilms]);

            if (!notice) {
              notice =
                fulfilledPayloads.find((entry) => String(entry?.notice || "").trim())?.notice || "";
            }

            console.log("[RECO] stage fetch", {
              stage: stage.key,
              stageCount: stageFilms.length,
              pooledCount: pooledFilms.length,
            });

            if (!usedRelaxationStage && stage.key !== "strict" && stageFilms.length > 0) {
              usedRelaxationStage = stage.key;
            }

            if (pooledFilms.length >= 80) break;
          }

          if (pooledFilms.length < 35) {
            const boosterPages = pickWidePages();
            const boosterOrigin = String(quizPayload?.aggregatedAnswers?.origin || "").trim();
            const boosterResponses = await Promise.allSettled(
              boosterPages.map(async (page) => {
                const filmsUrl = buildFilmsUrl(apiFilmsUrl, {
                  language: "fr-FR",
                  page,
                  platform: "",
                  ageRestriction: "",
                  genre: quizPayload?.aggregatedAnswers?.genre || "",
                  genres: requestedGenres.join(","),
                  contentType: quizPayload?.aggregatedAnswers?.contentType || "",
                  origin: normalizeOriginChoice(boosterOrigin) ? boosterOrigin : "",
                });
                const data = await fetchJsonWithTimeout(filmsUrl);
                return {
                  films: normalizeFilmsPayload(data),
                  notice: String(data?.notice || "").trim(),
                };
              })
            );

            const boosterPayloads = boosterResponses
              .filter((result) => result.status === "fulfilled")
              .map((result) => result.value);
            const boosterFilms = uniqueFilms(boosterPayloads.flatMap((entry) => entry.films || []));
            pooledFilms = uniqueFilms([...pooledFilms, ...boosterFilms]);

            console.log("[RECO] stage fetch booster", {
              boosterCount: boosterFilms.length,
              pooledCount: pooledFilms.length,
            });
          }

          films = uniqueFilms(pooledFilms);

          if (!notice && usedRelaxationStage === "relax_platform") {
            notice = "Filtres elargis automatiquement: plateforme.";
          } else if (!notice && usedRelaxationStage === "relax_country") {
            notice = hasRequestedOrigin
              ? "Filtres elargis automatiquement: plateforme."
              : "Filtres elargis automatiquement: plateforme puis pays.";
          } else if (!notice && usedRelaxationStage === "relax_age") {
            notice = hasRequestedOrigin
              ? "Filtres elargis automatiquement: plateforme puis age."
              : "Filtres elargis automatiquement: plateforme, pays puis age.";
          }
          if (films.length === 0) {
            notice =
              notice ||
              "OMQ a fouille tout le catalogue, mais rien ne matche vraiment ces filtres.";
          }
          setFilmsState({
            loading: false,
            error: "",
            items: films,
          });
          console.log("[RECO] films recuperes depuis API", films);
        } catch (error) {
          console.log("[RECO] erreur recuperation films API", error);
          films = [];
          notice = API_UNAVAILABLE_MESSAGE;
          setFilmsState((prev) => ({
            ...prev,
            loading: false,
            error: notice,
            items: films,
          }));
          setRecommendationState((prev) => ({
            ...prev,
            loading: false,
            error: notice,
            notice: "",
            items: [],
            answers: quizPayload.aggregatedAnswers,
            quizPayload,
          }));
          return;
        }
      }

      if (films && films.length > 0) {
        console.log("[RECO] films utilises pour recommandation", films);
      }

      buildAndSetRecommendations(quizPayload, films, false, notice);
      } catch (error) {
        console.log("[QUIZ] erreur inattendue handleQuizComplete", error);
        setFilmsState((prev) => ({
          ...prev,
          loading: false,
          error: API_UNAVAILABLE_MESSAGE,
          items: [],
        }));
        setRecommendationState((prev) => ({
          ...prev,
          loading: false,
          error: API_UNAVAILABLE_MESSAGE,
          notice: "",
          items: [],
        }));
      }
    },
    [
      apiFilmsUrl,
      buildAndSetRecommendations,
      resolveBackendAvailability,
    ]
  );

  const handleSurprise = useCallback(() => {
    if (!recommendationState.quizPayload) return;
    console.log("[RECO] bouton Surprends-moi");

    setRecommendationState((prev) => ({ ...prev, loading: true, error: "" }));
    const hasCurrentPool = Array.isArray(filmsState.items) && filmsState.items.length > 0;
    if (!hasCurrentPool) {
      setRecommendationState((prev) => ({
        ...prev,
        loading: false,
        error: API_UNAVAILABLE_MESSAGE,
        notice: "",
      }));
      return;
    }
    const pool = filmsState.items;
    const notice = "";

    buildAndSetRecommendations(
      recommendationState.quizPayload,
      pool,
      true,
      notice
    );
  }, [
    buildAndSetRecommendations,
    filmsState.items,
    recommendationState.quizPayload,
  ]);

  const replaceRecommendationItem = useCallback(
    async (item, source = "manual") => {
      const targetKey = String(filmKey(item));
      const currentItems = Array.isArray(recommendationState.items)
        ? recommendationState.items
        : [];
      const candidatePool = Array.isArray(filmsState.items) ? filmsState.items : [];
      if (!candidatePool.length) {
        setRecommendationState((prev) => ({
          ...prev,
          loading: false,
          error: API_UNAVAILABLE_MESSAGE,
          notice: "",
        }));
        return;
      }

      if (!recommendationState.quizPayload || !currentItems.length || !candidatePool.length) {
        registerUsedTitles([item]);
        return;
      }

      const targetIndex = currentItems.findIndex(
        (candidate) => String(filmKey(candidate)) === targetKey
      );
      if (targetIndex < 0) {
        registerUsedTitles([item]);
        return;
      }

      const currentSeenKeys = Object.keys(seenMap).filter((key) => seenMap[key]);
      const currentDislikedKeys = Object.keys(dislikedMap).filter((key) => dislikedMap[key]);
      const siblingItems = currentItems.filter((_, index) => index !== targetIndex);
      const siblingKeys = siblingItems.map((candidate) => String(filmKey(candidate)));
      const siblingTitles = siblingItems.map((candidate) => candidate?.title);
      const historicalTitles = Object.keys(usedTitleMap);
      const memoryAvoidTitles = collectMemoryAvoidTitles(preferenceMemory, activeUserKeys);
      const requiredGenres = getRequestedGenres(recommendationState.quizPayload);
      const requiredContentType = String(
        recommendationState.quizPayload?.aggregatedAnswers?.contentType || ""
      ).trim();
      const requiredOrigin = String(
        recommendationState.quizPayload?.aggregatedAnswers?.origin || ""
      ).trim();
      const scopedCandidatePool = candidatePool.filter(
        (film) =>
          filmMatchesAnyRequiredGenre(film, requiredGenres) &&
          filmMatchesRequiredType(film, requiredContentType) &&
          filmMatchesRequiredOrigin(film, requiredOrigin)
      );

      if (!scopedCandidatePool.length) {
        registerUsedTitles([item]);
        setRecommendationState((prev) => ({
          ...prev,
          loading: false,
          notice: "Aucun autre titre ne respecte ces filtres pour le moment.",
        }));
        console.log("[RECO] remplacement bloque par filtres stricts", {
          source,
          removed: item?.title,
          requiredGenres,
          requiredContentType,
          requiredOrigin,
        });
        return;
      }

      const baseExcludedKeys = [
        ...currentSeenKeys,
        ...currentDislikedKeys,
        targetKey,
        ...siblingKeys,
      ];
      const baseAvoidTitles = [
        ...historicalTitles,
        ...memoryAvoidTitles,
        ...siblingTitles,
        item?.title,
      ];

      const strictCandidates = buildRecommendationsForPlatforms({
        films: scopedCandidatePool,
        quizPayload: recommendationState.quizPayload,
        answers: recommendationState.answers || {},
        max: 4,
        randomize: false,
        excludedKeys: baseExcludedKeys,
        avoidTitles: baseAvoidTitles,
      });

      const fallbackCandidates = strictCandidates.length
        ? []
        : buildRecommendationsForPlatforms({
            films: scopedCandidatePool,
            quizPayload: recommendationState.quizPayload,
            answers: recommendationState.answers || {},
            max: 6,
            randomize: true,
            excludedKeys: baseExcludedKeys,
            avoidTitles: baseAvoidTitles,
          });

      const replacement = [...strictCandidates, ...fallbackCandidates][0];

      if (!replacement) {
        const emergencyFilm = pickFirstDifferentFilm({
          films: scopedCandidatePool,
          excludedKeys: [...baseExcludedKeys, ...siblingKeys],
          excludedTitles: [...baseAvoidTitles, ...siblingTitles],
          requiredGenres,
          requiredContentType,
          requiredOrigin,
        });

        if (!emergencyFilm) {
          registerUsedTitles([item]);
          setRecommendationState((prev) => ({
            ...prev,
            loading: false,
            notice: "Aucun autre titre ne respecte ces filtres pour le moment.",
          }));
          console.log("[RECO] aucun remplacement disponible avec les filtres initiaux", {
            source,
            removed: item?.title,
            requiredGenres,
            requiredContentType,
            requiredOrigin,
          });
          return;
        }

        const emergencyReplacement = toRecommendationItemFromFilm(emergencyFilm, 66);
        const nextItems = [...currentItems];
        nextItems[targetIndex] = emergencyReplacement;
        const finalItems = uniqueRecommendations(nextItems).slice(0, 5);

        setRecommendationState((prev) => ({
          ...prev,
          items: finalItems,
        }));
        registerUsedTitles([item, emergencyReplacement]);

        console.log("[RECO] remplacement carte", {
          source,
          removed: item?.title,
          replacement: emergencyReplacement?.title,
          mode: "emergency-fallback",
        });
        return;
      }

      const nextItems = [...currentItems];
      nextItems[targetIndex] = replacement;
      const finalItems = uniqueRecommendations(nextItems).slice(0, 5);

      setRecommendationState((prev) => ({
        ...prev,
        items: finalItems,
      }));
      registerUsedTitles([item, replacement]);

      console.log("[RECO] remplacement carte", {
        source,
        removed: item?.title,
        replacement: replacement?.title,
        mode: strictCandidates.length ? "strict-quiz-match" : "fallback-randomized",
      });
    },
    [
      activeUserKeys,
      dislikedMap,
      filmsState.items,
      preferenceMemory,
      recommendationState.answers,
      recommendationState.items,
      recommendationState.quizPayload,
      registerUsedTitles,
      seenMap,
      usedTitleMap,
    ]
  );

  const handleSurpriseAction = useCallback(() => {
    try {
      if (!recommendationState.quizPayload) return;
      console.log("[RECO] bouton Surprends-moi (fast)");

      setRecommendationState((prev) => ({ ...prev, loading: true, error: "" }));

      const hasCurrentPool = Array.isArray(filmsState.items) && filmsState.items.length > 0;
      if (!hasCurrentPool) {
        setRecommendationState((prev) => ({
          ...prev,
          loading: false,
          error: API_UNAVAILABLE_MESSAGE,
          notice: "",
        }));
        return;
      }
      const pool = filmsState.items;
      const notice = recommendationState.notice || "";

      buildAndSetRecommendations(
        recommendationState.quizPayload,
        pool,
        true,
        notice
      );
    } catch (error) {
      console.log("[RECO] erreur Surprends-moi", error);
      setRecommendationState((prev) => ({ ...prev, loading: false }));
    }
  }, [
    buildAndSetRecommendations,
    filmsState.items,
    recommendationState.notice,
    recommendationState.quizPayload,
  ]);

  const replaceRecommendationItemAction = useCallback(
    (item, source = "manual") => {
      try {
        const targetKey = String(filmKey(item));
        const currentItems = Array.isArray(recommendationState.items)
          ? recommendationState.items
          : [];

        const hasCurrentPool = Array.isArray(filmsState.items) && filmsState.items.length > 0;
        if (!hasCurrentPool) {
          setRecommendationState((prev) => ({
            ...prev,
            loading: false,
            error: API_UNAVAILABLE_MESSAGE,
            notice: "",
          }));
          return;
        }
        const candidatePool = filmsState.items;

        if (!recommendationState.quizPayload || !currentItems.length || !candidatePool.length) {
          registerUsedTitles([item]);
          return;
        }

        const targetIndex = currentItems.findIndex(
          (candidate) => String(filmKey(candidate)) === targetKey
        );
        if (targetIndex < 0) {
          registerUsedTitles([item]);
          return;
        }

        const currentSeenKeys = Object.keys(seenMap).filter((key) => seenMap[key]);
        const currentDislikedKeys = Object.keys(dislikedMap).filter((key) => dislikedMap[key]);
        const siblingItems = currentItems.filter((_, index) => index !== targetIndex);
        const siblingKeys = siblingItems.map((candidate) => String(filmKey(candidate)));
        const siblingTitles = siblingItems.map((candidate) => candidate?.title);
        const historicalTitles = Object.keys(usedTitleMap);
        const memoryAvoidTitles = collectMemoryAvoidTitles(preferenceMemory, activeUserKeys);
        const requiredGenres = getRequestedGenres(recommendationState.quizPayload);
        const requiredContentType = String(
          recommendationState.quizPayload?.aggregatedAnswers?.contentType || ""
        ).trim();
        const requiredOrigin = String(
          recommendationState.quizPayload?.aggregatedAnswers?.origin || ""
        ).trim();
        const scopedCandidatePool = candidatePool.filter(
          (film) =>
            filmMatchesAnyRequiredGenre(film, requiredGenres) &&
            filmMatchesRequiredType(film, requiredContentType) &&
            filmMatchesRequiredOrigin(film, requiredOrigin)
        );

        if (!scopedCandidatePool.length) {
          registerUsedTitles([item]);
          setRecommendationState((prev) => ({
            ...prev,
            loading: false,
            notice: "Aucun autre titre ne respecte ces filtres pour le moment.",
          }));
          console.log("[RECO] remplacement bloque par filtres stricts", {
            source,
            removed: item?.title,
            requiredGenres,
            requiredContentType,
            requiredOrigin,
          });
          return;
        }

        const baseExcludedKeys = [
          ...currentSeenKeys,
          ...currentDislikedKeys,
          targetKey,
          ...siblingKeys,
        ];
        const baseAvoidTitles = [
          ...historicalTitles,
          ...memoryAvoidTitles,
          ...siblingTitles,
          item?.title,
        ];

        const strictCandidates = buildRecommendationsForPlatforms({
          films: scopedCandidatePool,
          quizPayload: recommendationState.quizPayload,
          answers: recommendationState.answers || {},
          max: 4,
          randomize: true,
          excludedKeys: baseExcludedKeys,
          avoidTitles: baseAvoidTitles,
        });

        const fallbackCandidates = strictCandidates.length
          ? []
          : buildRecommendationsForPlatforms({
              films: scopedCandidatePool,
              quizPayload: recommendationState.quizPayload,
              answers: recommendationState.answers || {},
              max: 6,
              randomize: true,
              excludedKeys: baseExcludedKeys,
              avoidTitles: baseAvoidTitles,
            });

        let replacement = strictCandidates.length
          ? pickRandomFromList(strictCandidates)
          : pickRandomFromList(fallbackCandidates);
        if (!replacement) {
          const emergencyFilm = pickFirstDifferentFilm({
            films: scopedCandidatePool,
            excludedKeys: [...baseExcludedKeys, ...siblingKeys],
            excludedTitles: [...baseAvoidTitles, ...siblingTitles],
            requiredGenres,
            requiredContentType,
            requiredOrigin,
          });
          if (emergencyFilm) {
            replacement = toRecommendationItemFromFilm(emergencyFilm, 66);
          }
        }

        if (!replacement) {
          registerUsedTitles([item]);
          setRecommendationState((prev) => ({
            ...prev,
            loading: false,
            notice: "Aucun autre titre ne respecte ces filtres pour le moment.",
          }));
          console.log("[RECO] aucun remplacement disponible avec les filtres initiaux", {
            source,
            removed: item?.title,
            requiredGenres,
            requiredContentType,
            requiredOrigin,
          });
          return;
        }

        const nextItems = [...currentItems];
        nextItems[targetIndex] = replacement;
        const finalItems = uniqueRecommendations(nextItems).slice(0, 5);

        setRecommendationState((prev) => ({
          ...prev,
          items: finalItems,
          loading: false,
        }));
        registerUsedTitles([item, replacement]);

        console.log("[RECO] remplacement carte", {
          source,
          removed: item?.title,
          replacement: replacement?.title,
          mode: strictCandidates.length ? "strict-quiz-match" : "fallback-randomized",
        });
      } catch (error) {
        console.log("[RECO] erreur remplacement carte", error);
        setRecommendationState((prev) => ({ ...prev, loading: false }));
      }
    },
    [
      activeUserKeys,
      dislikedMap,
      filmsState.items,
      preferenceMemory,
      recommendationState.answers,
      recommendationState.items,
      recommendationState.quizPayload,
      registerUsedTitles,
      seenMap,
      usedTitleMap,
    ]
  );

  const handleToggleLike = useCallback(
    (item) => {
      if (!item) return;
      const key = String(filmKey(item));
      const titleKey = normalizeTitle(item?.title);

      setLikedMap((prev) => {
        const next = { ...prev };
        const willBeLiked = !next[key];

        if (willBeLiked) {
          next[key] = true;
        } else {
          delete next[key];
        }

        if (willBeLiked) {
          setDislikedMap((prevDisliked) => {
            const nextDisliked = { ...prevDisliked };
            delete nextDisliked[key];
            return nextDisliked;
          });
        }

        setPreferenceMemory((prevMemory) =>
          updateMemoryForUsers(prevMemory, activeUserKeys, (bucket) => {
            if (willBeLiked) {
              if (titleKey) {
                bucket.liked[titleKey] = true;
                delete bucket.disliked[titleKey];
              }
            } else if (titleKey) {
              delete bucket.liked[titleKey];
            }
            return bucket;
          })
        );

        return next;
      });
    },
    [activeUserKeys]
  );

  const handleToggleDislike = useCallback(
    (item) => {
      if (!item) return;
      const key = String(filmKey(item));
      const titleKey = normalizeTitle(item?.title);

      setDislikedMap((prev) => ({ ...prev, [key]: true }));
      setLikedMap((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setFavoriteMap((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });

      setPreferenceMemory((prevMemory) =>
        updateMemoryForUsers(prevMemory, activeUserKeys, (bucket) => {
          if (titleKey) {
            bucket.disliked[titleKey] = true;
            delete bucket.liked[titleKey];
          }
          return bucket;
        })
      );

      console.log("[MEMORY] film dislike memorise sans remplacement", {
        id: key,
        title: item?.title,
      });
    },
    [activeUserKeys]
  );

  const handleToggleSeen = useCallback(
    (item) => {
      if (!item) return;
      const targetKey = String(filmKey(item));
      const titleKey = normalizeTitle(item?.title);

      setSeenMap((prev) => ({ ...prev, [targetKey]: true }));
      setPreferenceMemory((prevMemory) =>
        updateMemoryForUsers(prevMemory, activeUserKeys, (bucket) => {
          if (titleKey) {
            bucket.seen[titleKey] = true;
          }
          return bucket;
        })
      );

      replaceRecommendationItemAction(item, "seen");
    },
    [activeUserKeys, replaceRecommendationItemAction]
  );

  const handleToggleFavorite = useCallback((item) => {
    if (!item) return;
    const key = String(filmKey(item));
    setFavoriteMap((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = item;
      }
      return next;
    });
    setDislikedMap((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const favoriteItems = useMemo(() => Object.values(favoriteMap), [favoriteMap]);

  return (
    <>
      <StatusBar style="light" />
      {screen === "home" && (
        <HomeScreen
          onStartQuiz={() => setScreen("quiz")}
        />
      )}
      {screen === "films" && (
        <FilmsScreen
          films={filmsState.items}
          loading={filmsState.loading}
          error={filmsState.error}
          onBack={() => setScreen("home")}
          onRefresh={refreshFilms}
        />
      )}
      {screen === "quiz" && (
        <QuizScreen onBack={() => setScreen("home")} onComplete={handleQuizComplete} />
      )}
      {screen === "recommendations" && (
        <RecommendationsScreen
          items={recommendationState.items}
          loading={recommendationState.loading}
          error={recommendationState.error}
          notice={recommendationState.notice}
          onBack={() => setScreen("home")}
          onRestartQuiz={() => setScreen("quiz")}
          onSurprise={handleSurpriseAction}
          onOpenFavorites={() => setScreen("favorites")}
          likedMap={likedMap}
          dislikedMap={dislikedMap}
          seenMap={seenMap}
          favoriteMap={favoriteMap}
          onToggleLike={handleToggleLike}
          onToggleDislike={handleToggleDislike}
          onToggleSeen={handleToggleSeen}
          onToggleFavorite={handleToggleFavorite}
        />
      )}
      {screen === "favorites" && (
        <FavoritesScreen favorites={favoriteItems} onBack={() => setScreen("recommendations")} />
      )}
    </>
  );
}
