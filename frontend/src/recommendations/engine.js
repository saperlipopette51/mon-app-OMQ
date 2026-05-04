const GENRE_BY_ID = {
  12: "adventure",
  14: "fantasy",
  16: "animation",
  18: "drama",
  27: "horror",
  28: "action",
  35: "comedy",
  36: "history",
  37: "western",
  53: "thriller",
  80: "crime",
  99: "documentary",
  878: "science-fiction",
  9648: "mystery",
  10402: "music",
  10751: "family",
  10752: "war",
  10770: "tv-movie",
  10749: "romance",
  10759: "action",
  10762: "family",
  10763: "documentary",
  10764: "documentary",
  10765: "science-fiction",
  10766: "drama",
  10767: "music",
  10768: "war",
};

const ORIGIN_HINTS = {
  us: ["en", "us", "usa", "american", "hollywood"],
  asie: ["ko", "ja", "zh", "cn", "jp", "kr", "hk", "tw", "korea", "coree", "japan", "china"],
  coree: ["ko", "ja", "zh", "cn", "jp", "kr", "hk", "tw", "korea", "coree", "japan", "china"],
  europe: [
    "fr",
    "de",
    "it",
    "es",
    "ie",
    "be",
    "ch",
    "sv",
    "da",
    "no",
    "fi",
    "nl",
    "pl",
    "europe",
    "europeen",
  ],
};

const PLATFORM_ALIASES = {
  netflix: ["netflix"],
  "prime-video": ["prime", "prime video", "amazon"],
  "apple-tv": ["apple", "apple tv", "apple tv+"],
  "disney-plus": ["disney", "disney+"],
  "hbo-max": ["hbo", "max", "hbo max"],
};

const PLATFORM_LABELS = {
  netflix: "Netflix",
  "prime-video": "Prime Video",
  "apple-tv": "Apple TV",
  "disney-plus": "Disney+",
  "hbo-max": "HBO",
};

const AGE_LABELS = {
  all: "tout public",
  12: "12+",
  16: "16+",
  18: "18+",
};

const READABLE_LABELS = {
  action: "action",
  adventure: "aventure",
  animation: "dessin anime",
  comedy: "comedie",
  documentary: "documentaire",
  drama: "drame",
  family: "famille",
  horror: "horreur",
  music: "musique",
  romance: "romance",
  "science-fiction": "science-fiction",
  western: "western",
  film: "film",
  serie: "serie",
};

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function uniqueStrings(items) {
  return [...new Set(items.filter(Boolean))];
}

function extraGenresForId(id) {
  const numericId = Number(id);
  if (numericId === 10759) return ["action", "adventure"];
  if (numericId === 10765) return ["science-fiction", "fantasy"];
  return [];
}

function normalizeGenreToken(value) {
  const text = normalizeText(value);
  if (!text) return "";
  if (/^\d+$/.test(text)) {
    const mapped = GENRE_BY_ID[Number(text)];
    return mapped ? normalizeGenreToken(mapped) : text;
  }
  if (text.includes("science") && (text.includes("fiction") || text.includes("sci"))) {
    return "science-fiction";
  }
  if (text.includes("roman") || text.includes("romant")) return "romance";
  if (text.includes("comed")) return "comedy";
  if (text.includes("thriller") || text.includes("suspens")) return "thriller";
  if (text.includes("myster")) return "mystery";
  if (text.includes("horr") || text.includes("epouv") || text.includes("fear")) return "horror";
  if (text.includes("action")) return "action";
  if (text.includes("drame") || text.includes("quotidien")) return "drama";
  if (text.includes("crime")) return "crime";
  if (text.includes("aventure")) return "adventure";
  if (text.includes("document")) return "documentary";
  if (text.includes("music") || text.includes("musique")) return "music";
  if (text.includes("western")) return "western";
  if (text.includes("history") || text.includes("histor")) return "history";
  if (text.includes("war") || text.includes("guerre")) return "war";
  if (text.includes("tv movie") || text.includes("telefilm") || text.includes("tv-movie")) {
    return "tv-movie";
  }
  if (text.includes("family") || text.includes("familial")) return "family";
  if (text.includes("anim") || text.includes("dessin") || text.includes("manga")) return "animation";
  if (text.includes("fantast")) return "fantasy";
  return text;
}

function extractGenres(film) {
  const stringGenres = String(film.genre || "")
    .split(/[,\-|/]/)
    .map((token) => normalizeGenreToken(token));

  const arrayGenres = Array.isArray(film.genres)
    ? film.genres.map((genre) =>
        typeof genre === "string"
          ? normalizeGenreToken(genre)
          : normalizeGenreToken(genre?.name)
      )
    : [];

  const idGenres = Array.isArray(film.genre_ids)
    ? film.genre_ids.flatMap((id) => {
        const base = normalizeGenreToken(GENRE_BY_ID[id]);
        const extras = extraGenresForId(id).map((token) => normalizeGenreToken(token));
        return [base, ...extras];
      })
    : [];

  return uniqueStrings([...stringGenres, ...arrayGenres, ...idGenres]);
}

function inferContentType(film) {
  const type = normalizeText(film.type || film.media_type || "");
  if (type === "tv" || type.includes("serie")) return "serie";
  return "film";
}

function normalizeYear(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value || "");
  if (/^\d{4}$/.test(text)) return Number(text);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return Number(text.slice(0, 4));
  return null;
}

function toTmdbPosterUrl(path) {
  const value = String(path || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  return `https://image.tmdb.org/t/p/w500${normalizedPath}`;
}

function resolvePosterUri(film) {
  const posterPath = film?.poster_path || film?.posterPath || "";
  const directCandidates = [
    film?.image,
    film?.imageUrl,
    film?.poster,
    film?.posterUrl,
    film?.poster_url,
    film?.posterURI,
  ];

  let imageUrl = "";
  for (const candidate of directCandidates) {
    const raw = String(candidate || "").trim();
    if (!raw) continue;
    if (/^https?:\/\//i.test(raw)) {
      imageUrl = raw;
      break;
    }
    if (raw.includes("image.tmdb.org")) {
      imageUrl = raw.startsWith("http") ? raw : `https://${raw.replace(/^\/+/, "")}`;
      break;
    }
    if (raw.startsWith("/")) {
      imageUrl = toTmdbPosterUrl(raw);
      break;
    }
  }

  if (!imageUrl) {
    imageUrl = toTmdbPosterUrl(posterPath);
  }

  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.log("poster_path:", posterPath);
    console.log("imageUrl:", imageUrl);
  }

  return imageUrl;
}

function createFallbackWhyLine({ globalAnswers, primaryGenre, contentType }) {
  const details = [];
  if (primaryGenre) details.push(`le ton ${toReadable(primaryGenre)}`);
  if (contentType && contentType !== "peu-importe") {
    details.push(`le format ${toReadable(contentType)}`);
  }
  if (globalAnswers.platform) {
    details.push(
      `la plateforme ${
        PLATFORM_LABELS[globalAnswers.platform] || toReadable(globalAnswers.platform)
      }`
    );
  }
  if (globalAnswers.ageRestriction) {
    details.push(
      `l'age ${AGE_LABELS[globalAnswers.ageRestriction] || globalAnswers.ageRestriction}`
    );
  }
  if (!details.length) {
    return "Choix de secours coherent: pas parfait, mais assez proche pour sauver la soiree.";
  }
  return `Choix de secours coherent: il garde ${humanJoin(details.slice(0, 3))}.`;
}

function buildFallbackScoredItem({ film, strictTargets, globalAnswers }) {
  const filmGenres = extractGenres(film);
  const primaryGenre = filmGenres[0] || normalizeGenreToken(film.genre || "");
  const contentType = inferContentType(film);
  const ageInfo = ageMatchInfo(globalAnswers.ageRestriction, film);
  if (ageInfo.unsafe) return null;

  const genreMatched = !strictTargets.genre || filmGenres.includes(strictTargets.genre);
  const typeRequested =
    strictTargets.contentType && strictTargets.contentType !== "peu-importe";
  const typeMatched = !typeRequested || contentType === strictTargets.contentType;
  const originRequested = strictTargets.origin && strictTargets.origin !== "peu-importe";
  const originMatch = originRequested ? originMatches(strictTargets.origin, film) : null;
  const platformInfo = platformMatchInfo(globalAnswers.platform, film);
  const genreTargets = uniqueStrings([strictTargets.genre]);
  const overloadPenalty = familyAnimationOverloadPenalty({
    selectedAge: globalAnswers.ageRestriction,
    film,
    filmGenres,
    genreTargets,
  });

  const score =
    (genreMatched ? 40 : 0) +
    (typeMatched ? 20 : 0) +
    (ageInfo.requested ? (ageInfo.known ? 15 : 10) : 15) +
    (originRequested ? (originMatch === true ? 15 : originMatch === null ? 7 : 0) : 15) +
    (platformInfo.requested
      ? platformInfo.matched
        ? platformInfo.known
          ? 10
          : 6
        : 0
      : 10) -
    overloadPenalty;

  return {
    key: filmKeyOf(film),
    film,
    score: Math.max(8, Math.min(100, Math.round(score))),
    rankingScore:
      Math.max(8, Math.min(100, Math.round(score))) +
      qualityBonus(film) * 4 -
      overloadPenalty * 0.5,
    primaryGenre,
    contentType,
    matchedUsersCount: 0,
    matchedGenreCount: genreMatched ? 1 : 0,
    why: createFallbackWhyLine({ globalAnswers, primaryGenre, contentType }),
    posterUri: resolvePosterUri(film),
  };
}

function filmKeyOf(film) {
  if (film.id !== undefined && film.id !== null) return String(film.id);
  return `${normalizeText(film.title)}-${normalizeText(film.release_date || film.year)}`;
}

function parseAgeBucket(value) {
  const text = normalizeText(value);
  if (!text) return null;
  if (text === "all" || text.includes("tout public")) return 0;
  if (text.includes("18") || text.includes("nc-17")) return 18;
  if (text.includes("16") || text.includes("15") || text.includes("tv-ma")) return 16;
  if (text.includes("13") || text.includes("12") || text.includes("pg-13") || text.includes("tv-14")) return 12;
  if (text.includes("g") || text.includes("pg")) return 0;
  return null;
}

function parseSelectedAgeBucket(value) {
  const text = normalizeText(value);
  if (!text) return null;
  // "Tout public" means no age restriction: not 12+, not 16+, not 18+.
  if (text === "all" || text.includes("tout public")) return 0;
  return parseAgeBucket(value);
}

function isMatureAgeRequest(value) {
  const text = normalizeText(value);
  return text === "16" || text === "18" || text.includes("16") || text.includes("18");
}

function isToutPublicRequest(value) {
  const text = normalizeText(value);
  return text === "all" || text.includes("tout public");
}

function looksFamilyOrAnimation(film) {
  const genreIds = Array.isArray(film?.genre_ids) ? film.genre_ids.map(Number) : [];
  const genreText = normalizeText(
    `${film?.genre || ""} ${Array.isArray(film?.genres) ? film.genres.join(" ") : ""}`
  );
  return (
    genreIds.includes(16) ||
    genreIds.includes(10751) ||
    genreText.includes("animation") ||
    genreText.includes("dessin") ||
    genreText.includes("famil")
  );
}

function looksAnimated(film) {
  const genreIds = Array.isArray(film?.genre_ids) ? film.genre_ids.map(Number) : [];
  const genreText = normalizeText(
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

function wantsFamilyOrAnimation(genreTargets = []) {
  return genreTargets.some((genre) => genre === "animation" || genre === "family");
}

function wantsAnimation(genreTargets = []) {
  return genreTargets.some((genre) => genre === "animation");
}

function disneyIsRequested(globalAnswers = {}) {
  const platforms = Array.isArray(globalAnswers.platforms)
    ? globalAnswers.platforms
    : [globalAnswers.platform];
  return platforms.map((platform) => normalizeText(platform)).some((platform) => {
    const aliases = PLATFORM_ALIASES[platform] || [platform];
    return platform === "disney-plus" || aliases.some((alias) => normalizeText(alias).includes("disney"));
  });
}

function shouldBlockAnimation({ globalAnswers, genreTargets, film }) {
  return (
    isToutPublicRequest(globalAnswers?.ageRestriction) &&
    !wantsAnimation(genreTargets) &&
    !disneyIsRequested(globalAnswers) &&
    looksAnimated(film)
  );
}

function familyAnimationOverloadPenalty({ selectedAge, film, filmGenres, genreTargets }) {
  if (!isToutPublicRequest(selectedAge)) return 0;
  if (wantsFamilyOrAnimation(genreTargets)) return 0;
  const hasFamilyOrAnimationGenre =
    filmGenres.includes("animation") || filmGenres.includes("family");
  return hasFamilyOrAnimationGenre || looksFamilyOrAnimation(film) ? 18 : 0;
}

function ageMatches(selectedAge, film) {
  const selectedBucket = parseSelectedAgeBucket(selectedAge);
  if (selectedBucket === null) return true;
  if (selectedBucket < 18 && Boolean(film.adult)) return false;

  const filmBucket = parseAgeBucket(
    film.age_restriction || film.certification || film.age || ""
  );
  if (isMatureAgeRequest(selectedAge)) {
    if (filmBucket === null) return !looksFamilyOrAnimation(film);
    return selectedBucket >= 18 ? filmBucket >= 16 : filmBucket === 16;
  }
  if (filmBucket === null) return selectedBucket > 0;
  return filmBucket <= selectedBucket;
}

function platformMatches(selectedPlatform, film) {
  const platform = normalizeText(selectedPlatform);
  if (!platform) return true;
  const aliases = PLATFORM_ALIASES[platform] || [platform];
  const source = normalizeText(
    `${film.platform || ""} ${
      Array.isArray(film.platforms) ? film.platforms.join(" ") : ""
    }`
  );
  if (!source) return false;
  return aliases.some((alias) => source.includes(alias));
}

function platformMatchInfo(selectedPlatform, film) {
  const platform = normalizeText(selectedPlatform);
  if (!platform) return { requested: false, matched: true, known: true };
  const aliases = PLATFORM_ALIASES[platform] || [platform];
  const source = normalizeText(
    `${film.platform || ""} ${
      Array.isArray(film.platforms) ? film.platforms.join(" ") : ""
    }`
  );
  if (!source) return { requested: true, matched: false, known: false };
  return {
    requested: true,
    matched: aliases.some((alias) => source.includes(alias)),
    known: true,
  };
}

function originMatches(origin, film) {
  const normalizedOrigin = normalizeText(origin);
  if (!normalizedOrigin || normalizedOrigin === "peu-importe") return null;
  const hints = ORIGIN_HINTS[normalizedOrigin] || [normalizedOrigin];
  const source = normalizeText(
    `${film.origin || ""} ${film.country || ""} ${
      Array.isArray(film.origin_country) ? film.origin_country.join(" ") : ""
    } ${film.language || ""} ${film.original_language || ""}`
  );
  if (!source) return null;
  return hints.some((hint) => source.includes(hint));
}

function ageMatchInfo(selectedAge, film) {
  const selectedBucket = parseSelectedAgeBucket(selectedAge);
  if (selectedBucket === null) {
    return { requested: false, matched: true, known: true, unsafe: false };
  }
  if (selectedBucket < 18 && Boolean(film.adult)) {
    return { requested: true, matched: false, known: true, unsafe: true };
  }

  const filmBucket = parseAgeBucket(
    film.age_restriction || film.certification || film.age || ""
  );
  if (isMatureAgeRequest(selectedAge)) {
    if (filmBucket === null) {
      const unsafe = looksFamilyOrAnimation(film);
      return { requested: true, matched: !unsafe, known: false, unsafe };
    }
    const matched = selectedBucket >= 18 ? filmBucket >= 16 : filmBucket === 16;
    return {
      requested: true,
      matched,
      known: true,
      unsafe: !matched,
    };
  }
  if (filmBucket === null) {
    const unsafe = selectedBucket === 0;
    return { requested: true, matched: !unsafe, known: false, unsafe };
  }
  return {
    requested: true,
    matched: filmBucket <= selectedBucket,
    known: true,
    unsafe: filmBucket > selectedBucket,
  };
}

function normalizeUser(user = {}) {
  return {
    firstName: String(user.firstName || "").trim(),
    contentType: normalizeText(user.contentType),
    genre: normalizeGenreToken(user.genre),
    origin: normalizeText(user.origin),
  };
}

function scoreForSingleUser({ film, filmGenres, overview, user }) {
  const inferredType = inferContentType(film);

  let matchedWeight = 0;
  let possibleWeight = 0;
  let matchedSignals = 0;
  let genreMatched = false;
  let hasStrictMismatch = false;

  if (user.contentType && user.contentType !== "peu-importe") {
    possibleWeight += 30;
    if (inferredType === user.contentType) {
      matchedWeight += 30;
      matchedSignals += 1;
    } else {
      hasStrictMismatch = true;
    }
  }

  if (user.genre) {
    possibleWeight += 60;
    const match = filmGenres.includes(user.genre);
    genreMatched = match;
    if (match) {
      matchedWeight += 60;
      matchedSignals += 1;
    } else {
      hasStrictMismatch = true;
    }
  }

  if (user.origin && user.origin !== "peu-importe") {
    possibleWeight += 10;
    const match = originMatches(user.origin, film);
    if (match === true) {
      matchedWeight += 10;
      matchedSignals += 1;
    }
  }

  const possible = Math.max(1, possibleWeight);
  const ratio = Math.max(0, Math.min(1, matchedWeight / possible));

  return {
    ratio,
    weightedScore: matchedWeight,
    weightedPossible: possible,
    matchedSignals,
    genreMatched,
    hasStrictMismatch,
  };
}

function buildUserList(quizPayload, answers) {
  if (quizPayload && Array.isArray(quizPayload.users) && quizPayload.users.length > 0) {
    return quizPayload.users.map(normalizeUser);
  }
  return [normalizeUser(answers || {})];
}

function buildGlobalAnswers(quizPayload, answers) {
  const fromGlobal = quizPayload?.globalAnswers || {};
  const platforms = Array.isArray(fromGlobal.platforms)
    ? fromGlobal.platforms
    : [fromGlobal.platform || answers?.platform || ""].filter(Boolean);
  return {
    ageRestriction: normalizeText(fromGlobal.ageRestriction || answers?.ageRestriction || ""),
    platform: normalizeText(fromGlobal.platform || answers?.platform || ""),
    platforms,
  };
}

function buildStrictTargets(quizPayload, answers) {
  const aggregated = quizPayload?.aggregatedAnswers || {};
  return {
    genre: normalizeGenreToken(aggregated.genre || answers?.genre || ""),
    contentType: normalizeText(aggregated.contentType || answers?.contentType || ""),
    origin: normalizeText(aggregated.origin || answers?.origin || ""),
  };
}

function filterByStrictTargets(films, globalAnswers, targets, options = {}) {
  const withGenre = options.withGenre !== false;
  const withType = options.withType !== false;
  const withOrigin = options.withOrigin !== false;
  const safeFilms = Array.isArray(films) ? films : [];

  return safeFilms.filter((film) => {
    if (!ageMatches(globalAnswers.ageRestriction, film)) return false;
    if (!platformMatches(globalAnswers.platform, film)) return false;

    const filmGenres = extractGenres(film);
    const inferredType = inferContentType(film);

    if (withGenre && targets.genre && !filmGenres.includes(targets.genre)) return false;
    if (
      withType &&
      targets.contentType &&
      targets.contentType !== "peu-importe" &&
      inferredType !== targets.contentType
    ) {
      return false;
    }
    if (withOrigin && targets.origin && targets.origin !== "peu-importe") {
      const originMatch = originMatches(targets.origin, film);
      if (originMatch !== true) return false;
    }
    return true;
  });
}

function toReadable(value) {
  const normalized = normalizeText(value);
  if (READABLE_LABELS[normalized]) return READABLE_LABELS[normalized];
  return String(value || "")
    .replace(/-/g, " ")
    .trim();
}

function humanJoin(list) {
  if (!Array.isArray(list) || list.length === 0) return "";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} et ${list[1]}`;
  return `${list.slice(0, -1).join(", ")} et ${list[list.length - 1]}`;
}

function qualityBonus(film) {
  const voteAverage = Number(film.vote_average || 0);
  const popularity = Number(film.popularity || 0);
  const ratingFactor = Number.isFinite(voteAverage)
    ? Math.max(0, Math.min(1, voteAverage / 10))
    : 0;
  const popularityFactor = Number.isFinite(popularity)
    ? Math.max(0, Math.min(1, Math.log1p(popularity) / Math.log1p(350)))
    : 0;
  return ratingFactor * 0.75 + popularityFactor * 0.25;
}

function createWhyLine({ users, globalAnswers, primaryGenre, contentType, matchDetails }) {
  const matchedUsers = matchDetails.genreMatchedUsers || 0;
  const totalUsers = Math.max(1, users.length || 1);
  const names = users
    .map((user, index) => ({ ...user, fallbackName: `participant ${index + 1}` }))
    .filter((user) => user.genre)
    .filter((user) => matchDetails.matchedGenreTokens.includes(user.genre))
    .map((user) => user.firstName || user.fallbackName)
    .slice(0, 3);

  const who = humanJoin(names);
  const details = [];
  if (matchDetails.genre) details.push(`le genre ${toReadable(primaryGenre)}`);
  if (matchDetails.type && contentType && contentType !== "peu-importe") {
    details.push(`le format ${toReadable(contentType)}`);
  }
  if (matchDetails.age && globalAnswers.ageRestriction) {
    details.push(`l'age ${AGE_LABELS[globalAnswers.ageRestriction] || globalAnswers.ageRestriction}`);
  }
  if (matchDetails.origin) details.push("l'origine demandee");
  if (matchDetails.platform && globalAnswers.platform) {
    details.push(`la plateforme ${PLATFORM_LABELS[globalAnswers.platform] || toReadable(globalAnswers.platform)}`);
  }

  const intro = who
    ? matchedUsers >= totalUsers
      ? `Recommande pour ${who}`
      : `Compromis malin pour ${who}`
    : matchedUsers >= totalUsers
    ? "Recommande pour le groupe"
    : "Compromis malin pour le groupe";

  if (!details.length) {
    return `${intro}: proche de vos envies sans forcer un faux match.`;
  }

  const conclusion =
    matchedUsers >= totalUsers
      ? "C'est le genre de choix qui peut mettre tout le monde d'accord."
      : "Il sert de terrain d'entente sans trop trahir les preferences.";

  return `${intro}: il respecte ${humanJoin(details.slice(0, 4))}. ${conclusion}`;
}

function scoreFilm(film, context) {
  const { users, globalAnswers, strictTargets } = context;
  const filmGenres = extractGenres(film);
  const contentType = inferContentType(film);

  const ageInfo = ageMatchInfo(globalAnswers.ageRestriction, film);
  // L'age reste une securite: si TMDB indique clairement que c'est trop adulte, on retire.
  if (ageInfo.unsafe) return null;

  const usersWithGenre = users.filter((user) => Boolean(user.genre));
  const genreTargets = uniqueStrings([
    ...usersWithGenre.map((user) => user.genre),
    strictTargets.genre,
  ]);
  const matchedGenreTokens = genreTargets.filter((genre) => filmGenres.includes(genre));
  const primaryGenre =
    matchedGenreTokens[0] || filmGenres[0] || normalizeGenreToken(film.genre || "");
  const genreRatio = genreTargets.length
    ? matchedGenreTokens.length / Math.max(1, genreTargets.length)
    : 1;
  const genreMatchedUsers = usersWithGenre.filter((user) => filmGenres.includes(user.genre)).length;

  const requestedType = strictTargets.contentType;
  const typeRequested = Boolean(requestedType && requestedType !== "peu-importe");
  const typeMatched = !typeRequested || contentType === requestedType;

  const requestedOrigin = strictTargets.origin;
  const originRequested = Boolean(requestedOrigin && requestedOrigin !== "peu-importe");
  const originMatch = originRequested ? originMatches(requestedOrigin, film) : null;

  const platformInfo = platformMatchInfo(globalAnswers.platform, film);

  const scoreParts = {
    genre: genreTargets.length ? Math.round(40 * genreRatio) : 40,
    type: typeRequested ? (typeMatched ? 20 : 0) : 20,
    age: ageInfo.requested ? (ageInfo.known ? 15 : 10) : 15,
    origin: originRequested ? (originMatch === true ? 15 : originMatch === null ? 7 : 0) : 15,
    platform: platformInfo.requested
      ? platformInfo.matched
        ? platformInfo.known
          ? 10
          : 6
        : 0
      : 10,
  };

  let score =
    scoreParts.genre +
    scoreParts.type +
    scoreParts.age +
    scoreParts.origin +
    scoreParts.platform;
  const overloadPenalty = familyAnimationOverloadPenalty({
    selectedAge: globalAnswers.ageRestriction,
    film,
    filmGenres,
    genreTargets,
  });
  score -= overloadPenalty;

  // Tiny tie-breaker only for ordering; displayed score stays capped at 100.
  const rankingScore = score + qualityBonus(film) * 4 - overloadPenalty * 0.5;
  const boundedPercent = Math.max(8, Math.min(100, Math.round(score)));

  const matchDetails = {
    genre: scoreParts.genre > 0,
    type: scoreParts.type === 20,
    age: scoreParts.age >= 10,
    origin: !originRequested || originMatch === true,
    platform: !platformInfo.requested || platformInfo.matched,
    matchedGenreTokens,
    genreMatchedUsers,
    genreRatio,
    typeMatched,
    originMatch,
    platformInfo,
  };

  return {
    key: filmKeyOf(film),
    film,
    score: boundedPercent,
    rankingScore,
    primaryGenre,
    contentType,
    matchedUsersCount: genreMatchedUsers,
    matchedGenreCount: matchedGenreTokens.length,
    matchDetails,
    why: createWhyLine({
      users,
      globalAnswers,
      primaryGenre,
      contentType,
      matchDetails,
    }),
    posterUri: resolvePosterUri(film),
  };
}

function shuffle(items) {
  const cloned = [...items];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

function dedupeByTitle(scoredItems) {
  const seenIds = new Set();
  const seenTitles = new Set();
  const output = [];
  for (const item of scoredItems) {
    const idKey = String(item?.film?.id ?? item?.key ?? "");
    const titleKey = normalizeText(item?.film?.title);
    if (idKey && seenIds.has(idKey)) continue;
    if (!idKey && !titleKey) continue;
    if (titleKey && seenTitles.has(titleKey)) continue;
    if (idKey) seenIds.add(idKey);
    if (titleKey) seenTitles.add(titleKey);
    output.push(item);
  }
  return output;
}

function dedupeFilmPool(films) {
  const seenIds = new Set();
  const seenTitles = new Set();
  const output = [];

  for (const film of Array.isArray(films) ? films : []) {
    const idKey = String(film?.id ?? "");
    const titleKey = normalizeText(film?.title);
    if (idKey && seenIds.has(idKey)) continue;
    if (titleKey && seenTitles.has(titleKey)) continue;
    if (!idKey && !titleKey) continue;
    if (idKey) seenIds.add(idKey);
    if (titleKey) seenTitles.add(titleKey);
    output.push(film);
  }

  return output;
}

function itemLooksFamilyOrAnimation(item) {
  const film = item?.film || item?.raw || item || {};
  const genres = extractGenres(film);
  return (
    item?.primaryGenre === "animation" ||
    item?.primaryGenre === "family" ||
    genres.includes("animation") ||
    genres.includes("family") ||
    looksFamilyOrAnimation(film)
  );
}

function itemLooksAnimated(item) {
  const film = item?.film || item?.raw || item || {};
  const genres = extractGenres(film);
  return item?.primaryGenre === "animation" || genres.includes("animation") || looksAnimated(film);
}

function itemMatchesGenreTargets(item, genreTargets = []) {
  if (!Array.isArray(genreTargets) || genreTargets.length === 0) return true;
  const film = item?.film || item?.raw || item || {};
  const genres = extractGenres(film);
  return genreTargets.some((genre) => genres.includes(genre));
}

function itemYear(item) {
  const film = item?.film || item?.raw || item || {};
  return normalizeYear(film.year) || normalizeYear(film.release_date) || 0;
}

function itemIsRecent(item, minRecentYear = 2020) {
  const year = itemYear(item);
  return year >= minRecentYear;
}

function selectDiverse(scoredItems, max, options = {}) {
  const selected = [];
  const genreCounts = new Map();
  const familyAnimationCap = Number.isFinite(options.familyAnimationCap)
    ? options.familyAnimationCap
    : Infinity;
  const minRecentItems = Math.min(
    max,
    Number.isFinite(options.minRecentItems) ? options.minRecentItems : 0
  );
  const minRecentYear = Number.isFinite(options.minRecentYear)
    ? options.minRecentYear
    : 2020;
  const minimumUsefulResults = Math.min(max, 5);
  let familyAnimationCount = 0;

  function alreadySelected(item) {
    return selected.some((candidate) => candidate.key === item.key);
  }

  function canTakeFamilyAnimation(item, enforceCap) {
    if (!enforceCap) return true;
    if (!itemLooksAnimated(item)) return true;
    return familyAnimationCount < familyAnimationCap;
  }

  function take(item) {
    selected.push(item);
    if (itemLooksAnimated(item)) familyAnimationCount += 1;
  }

  function tryTake(item) {
    if (alreadySelected(item)) return false;
    if (!canTakeFamilyAnimation(item, true)) return false;
    take(item);
    return true;
  }

  function takeFrom(items, { enforceFamilyCap = true } = {}) {
    for (const item of items) {
      if (selected.length >= max) break;
      if (alreadySelected(item)) continue;
      if (enforceFamilyCap && !canTakeFamilyAnimation(item, true)) continue;
      take(item);
    }
  }

  if (minRecentItems > 0) {
    for (const item of scoredItems) {
      if (selected.length >= max) break;
      if (selected.filter((candidate) => itemIsRecent(candidate, minRecentYear)).length >= minRecentItems) {
        break;
      }
      if (!itemIsRecent(item, minRecentYear)) continue;
      tryTake(item);
    }
  }

  for (const item of scoredItems) {
    if (selected.length >= max) break;
    if (alreadySelected(item)) continue;
    if (!canTakeFamilyAnimation(item, true)) continue;
    const genre = item.primaryGenre || "autre";
    const count = genreCounts.get(genre) || 0;
    if (count >= 2 && selected.length < max - 1) continue;
    take(item);
    genreCounts.set(genre, count + 1);
  }

  if (selected.length < max) {
    takeFrom(scoredItems, { enforceFamilyCap: true });
  }

  // If the pool is genuinely too small, fill the list rather than returning too few.
  // Once 5 coherent choices exist, keep the family/animation cap instead of padding with cartoons.
  if (selected.length < max) {
    takeFrom(
      scoredItems.filter((item) => !itemLooksAnimated(item)),
      { enforceFamilyCap: false }
    );
  }

  if (selected.length < max && selected.length < minimumUsefulResults) {
    takeFrom(scoredItems, { enforceFamilyCap: false });
  }

  return selected;
}

function buildRandomizedOrder(items) {
  if (!items.length) return [];
  const best = items[0].score || 0;
  const coherentPool = items.filter((item) => item.score >= Math.max(40, best - 20));
  const rest = items.filter((item) => !coherentPool.includes(item));
  return [...shuffle(coherentPool), ...rest];
}

function buildVariedOrder(items) {
  if (!items.length) return [];
  const leadSize = Math.min(2, items.length);
  const topWindowSize = Math.min(24, Math.max(0, items.length - leadSize));
  const lead = items.slice(0, leadSize);
  const topWindow = shuffle(items.slice(leadSize, leadSize + topWindowSize));
  const rest = items.slice(leadSize + topWindowSize);
  return [...lead, ...topWindow, ...rest];
}

function enrichItem(item) {
  const raw = item.film || {};
  const summarySource = raw.overview || raw.description || raw.summary || raw.synopsis || "";
  const summary = String(summarySource || "").trim();
  const year = normalizeYear(raw.year) || normalizeYear(raw.release_date) || "";

  return {
    key: item.key,
    id: raw.id ?? item.key,
    title: raw.title || "Titre inconnu",
    year,
    genre: raw.genre || (Array.isArray(raw.genres) ? raw.genres.join(", ") : ""),
    score: item.score,
    why: item.why,
    posterUri: item.posterUri,
    summary: summary || "Resume indisponible pour ce titre.",
    raw,
  };
}

export function buildRecommendations({
  films,
  answers,
  quizPayload,
  max = 5,
  randomize = false,
  excludedKeys = [],
  avoidTitles = [],
}) {
  if (!Array.isArray(films) || films.length === 0) return [];

  const users = buildUserList(quizPayload, answers);
  const globalAnswers = buildGlobalAnswers(quizPayload, answers);
  const strictTargets = buildStrictTargets(quizPayload, answers);
  const requestedGenreTargets = uniqueStrings([
    strictTargets.genre,
    ...users.map((user) => user.genre),
  ]);
  const familyAnimationCap =
    isToutPublicRequest(globalAnswers.ageRestriction) &&
    !wantsAnimation(requestedGenreTargets) &&
    !disneyIsRequested(globalAnswers)
      ? 0
      : Infinity;
  const excluded = new Set(excludedKeys.map((key) => String(key)));
  const avoided = new Set(avoidTitles.map((title) => normalizeText(title)));

  const candidateFilms = dedupeFilmPool(films);

  const scored = candidateFilms
    .map((film) => scoreFilm(film, { users, globalAnswers, strictTargets }))
    .filter(Boolean)
    .filter((item) =>
      shouldBlockAnimation({
        globalAnswers,
        genreTargets: requestedGenreTargets,
        film: item?.film,
      })
        ? false
        : true
    );

  let unique = dedupeByTitle(scored).filter((item) => {
    if (excluded.has(item.key)) return false;
    if (avoided.has(normalizeText(item.film.title))) return false;
    return true;
  });

  const hasGenreTarget = Boolean(
    strictTargets.genre || users.some((user) => Boolean(user.genre))
  );
  const genrePreferred = hasGenreTarget
    ? unique.filter((item) => Number(item?.matchDetails?.genreRatio || 0) > 0)
    : unique;
  const typePreferred =
    strictTargets.contentType && strictTargets.contentType !== "peu-importe"
      ? genrePreferred.filter((item) => item?.matchDetails?.typeMatched === true)
      : genrePreferred;
  const originPreferred =
    strictTargets.origin && strictTargets.origin !== "peu-importe"
      ? typePreferred.filter((item) => item?.matchDetails?.originMatch === true)
      : typePreferred;

  // On privilegie les criteres importants, sans bloquer si le pool est trop petit.
  if (originPreferred.length >= Math.min(max, 3)) {
    unique = originPreferred;
  } else if (typePreferred.length >= Math.min(max, 3)) {
    unique = typePreferred;
  } else if (genrePreferred.length >= Math.min(max, 3)) {
    unique = genrePreferred;
  }

  if (unique.length < max) {
    const currentKeys = new Set(unique.map((item) => item.key));
    const currentTitles = new Set(unique.map((item) => normalizeText(item?.film?.title)));

    const rescue = candidateFilms
      .map((film) => {
        const key = filmKeyOf(film);
        const titleKey = normalizeText(film?.title);
        if (currentKeys.has(key)) return null;
        if (titleKey && currentTitles.has(titleKey)) return null;
        if (excluded.has(key)) return null;
        if (titleKey && avoided.has(titleKey)) return null;
        if (shouldBlockAnimation({ globalAnswers, genreTargets: requestedGenreTargets, film })) {
          return null;
        }
        if (!itemMatchesGenreTargets(film, requestedGenreTargets)) {
          return null;
        }
        return buildFallbackScoredItem({ film, strictTargets, globalAnswers });
      })
      .filter(Boolean);

    unique = dedupeByTitle([...unique, ...rescue]).filter((item) => {
      if (excluded.has(item.key)) return false;
      if (avoided.has(normalizeText(item.film.title))) return false;
      return true;
    });
  }

  if (!unique.length) {
    const emergency = dedupeFilmPool(Array.isArray(films) ? films : [])
      .filter(
        (film) =>
          !shouldBlockAnimation({ globalAnswers, genreTargets: requestedGenreTargets, film }) &&
          itemMatchesGenreTargets(film, requestedGenreTargets)
      )
      .map((film) => buildFallbackScoredItem({ film, strictTargets, globalAnswers }))
      .filter(Boolean);
    unique = dedupeByTitle(emergency);
  }

  if (!unique.length) return [];

  const ranked = unique.sort(
    (a, b) => (b.rankingScore || b.score || 0) - (a.rankingScore || a.score || 0)
  );
  const minScore = users.length > 1 ? 54 : 48;
  const filteredRanked = ranked.filter((item) => item.score >= minScore);
  const baseRanked = filteredRanked.length >= max ? filteredRanked : ranked;
  const ordered = randomize ? buildRandomizedOrder(baseRanked) : buildVariedOrder(baseRanked);
  const diverse = selectDiverse(ordered, max, {
    familyAnimationCap,
    minRecentItems: 2,
    minRecentYear: 2020,
  });

  if (diverse.length >= max) {
    return diverse
      .filter((item) => itemMatchesGenreTargets(item, requestedGenreTargets))
      .slice(0, max)
      .map(enrichItem);
  }

  const firstFallbackSource = (randomize ? shuffle(baseRanked) : baseRanked).filter((item) => {
    if (diverse.some((candidate) => candidate.key === item.key)) return false;
    if (!itemMatchesGenreTargets(item, requestedGenreTargets)) return false;
    if (!Number.isFinite(familyAnimationCap) || !itemLooksAnimated(item)) return true;
    return false;
  });
  let finalItems = [...diverse, ...firstFallbackSource].slice(0, max);

  if (finalItems.length < Math.min(max, 4)) {
    const relaxedFallback = (randomize ? shuffle(baseRanked) : baseRanked).filter(
      (item) =>
        !finalItems.some((candidate) => candidate.key === item.key) &&
        itemMatchesGenreTargets(item, requestedGenreTargets)
    );
    finalItems = [...finalItems, ...relaxedFallback].slice(0, max);
  }

  if (finalItems.length < max) {
    const selectedKeys = new Set(finalItems.map((item) => item.key));
    const selectedTitles = new Set(
      finalItems.map((item) => normalizeText(item?.film?.title))
    );

    const emergency = (Array.isArray(films) ? films : [])
      .map((film) => {
        const key = filmKeyOf(film);
        const titleKey = normalizeText(film?.title);
        if (selectedKeys.has(key)) return null;
        if (titleKey && selectedTitles.has(titleKey)) return null;
        if (shouldBlockAnimation({ globalAnswers, genreTargets: requestedGenreTargets, film })) {
          return null;
        }
        if (!itemMatchesGenreTargets(film, requestedGenreTargets)) {
          return null;
        }
        return buildFallbackScoredItem({ film, strictTargets, globalAnswers });
      })
      .filter(Boolean);

    finalItems = selectDiverse(dedupeByTitle([...finalItems, ...emergency]), max, {
      familyAnimationCap,
      minRecentItems: 0,
      minRecentYear: 2020,
    });
  }

  return finalItems
    .filter((item) => itemMatchesGenreTargets(item, requestedGenreTargets))
    .map(enrichItem);
}

export function filmKey(item) {
  return filmKeyOf(item.raw || item);
}
