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
  asie: [
    "ko",
    "ja",
    "zh",
    "hi",
    "ta",
    "te",
    "th",
    "id",
    "vi",
    "ms",
    "cn",
    "jp",
    "kr",
    "hk",
    "tw",
    "in",
    "thailand",
    "indonesia",
    "vietnam",
    "malaysia",
    "singapore",
    "philippines",
    "korea",
    "coree",
    "japan",
    "china",
    "india",
    "inde",
  ],
  coree: [
    "ko",
    "ja",
    "zh",
    "hi",
    "ta",
    "te",
    "th",
    "id",
    "vi",
    "ms",
    "cn",
    "jp",
    "kr",
    "hk",
    "tw",
    "in",
    "thailand",
    "indonesia",
    "vietnam",
    "malaysia",
    "singapore",
    "philippines",
    "korea",
    "coree",
    "japan",
    "china",
    "india",
    "inde",
  ],
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
  if (shouldBlockFamilyUnsafe({ genreTargets, film })) return null;
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

function isFamilySafeFilm(film) {
  if (Boolean(film?.adult)) return false;
  const bucket = getFilmAgeBucket(film);
  return bucket === 0;
}

function parseSelectedAgeBucket(value) {
  const text = normalizeText(value);
  if (!text) return null;
  // "Tout public" means no age restriction: not 12+, not 16+, not 18+.
  if (text === "all" || text.includes("tout public")) return 0;
  return parseAgeBucket(value);
}

function getFilmAgeBucket(film) {
  const numericBucket = Number(film?.age_bucket);
  if (Number.isFinite(numericBucket)) return numericBucket;
  return parseAgeBucket(film?.age_restriction || film?.certification || film?.age || "");
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

function looksHorror(film) {
  const genreIds = Array.isArray(film?.genre_ids) ? film.genre_ids.map(Number) : [];
  const genreText = normalizeText(
    `${film?.genre || ""} ${Array.isArray(film?.genres) ? film.genres.join(" ") : ""}`
  );
  return genreIds.includes(27) || genreText.includes("horreur") || genreText.includes("horror");
}

function wantsAnimation(genreTargets = []) {
  return genreTargets.some((genre) => genre === "animation");
}

function wantsFamily(genreTargets = []) {
  return genreTargets.some((genre) => genre === "family");
}

function wantsHorror(genreTargets = []) {
  return genreTargets.some((genre) => genre === "horror");
}

function animationPreferenceForGroup(users = [], strictTargets = {}) {
  const safeUsers = Array.isArray(users) ? users : [];
  const participantCount = Math.max(1, safeUsers.length || 1);
  const animationRequests = safeUsers.filter((user) => user?.genre === "animation").length;
  const fallbackAnimationRequest =
    !safeUsers.length && strictTargets?.genre === "animation" ? 1 : 0;
  const requestedCount = animationRequests || fallbackAnimationRequest;

  if (requestedCount <= 0) {
    return { requestedCount: 0, participantCount, cap: 0, everyone: false };
  }

  const everyone = requestedCount >= participantCount;
  return {
    requestedCount,
    participantCount,
    cap: everyone ? Infinity : 1,
    everyone,
  };
}

function shouldBlockAnimation({ animationCap, film }) {
  return animationCap <= 0 && looksAnimated(film);
}

function shouldBlockFamilyUnsafe({ genreTargets, film }) {
  return wantsFamily(genreTargets) && !isFamilySafeFilm(film);
}

function shouldBlockToutPublicHorror({ selectedAge, genreTargets, film }) {
  return isToutPublicRequest(selectedAge) && !wantsHorror(genreTargets) && looksHorror(film);
}

function familyAnimationOverloadPenalty({ selectedAge, film, filmGenres, genreTargets }) {
  if (!isToutPublicRequest(selectedAge)) return 0;
  if (wantsAnimation(genreTargets)) return 0;
  const hasAnimationGenre = filmGenres.includes("animation");
  return hasAnimationGenre || looksAnimated(film) ? 18 : 0;
}

function ageMatches(selectedAge, film) {
  const selectedBucket = parseSelectedAgeBucket(selectedAge);
  if (selectedBucket === null) return true;
  if (selectedBucket < 18 && Boolean(film.adult)) return false;

  const filmBucket = getFilmAgeBucket(film);
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

  const filmBucket = getFilmAgeBucket(film);
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
  const voteCount = Number(film.vote_count || 0);
  const year = normalizeYear(film.year) || normalizeYear(film.release_date);
  const currentYear = new Date().getFullYear();
  const age = year ? Math.max(0, currentYear - year) : null;
  const ratingFactor = Number.isFinite(voteAverage)
    ? Math.max(0, Math.min(1, voteAverage / 10))
    : 0;
  const popularityFactor = Number.isFinite(popularity)
    ? Math.max(0, Math.min(1, Math.log1p(popularity) / Math.log1p(350)))
    : 0;
  const voteCountFactor = Number.isFinite(voteCount)
    ? Math.max(0, Math.min(1, Math.log1p(voteCount) / Math.log1p(15000)))
    : 0;
  const recencyFactor =
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
  const discoveryFactor =
    popularity <= 0
      ? 0.25
      : popularity <= 25
      ? 0.95
      : popularity <= 90
      ? 1
      : popularity <= 180
      ? 0.65
      : 0.25;
  return (
    ratingFactor * 0.38 +
    recencyFactor * 0.28 +
    discoveryFactor * 0.22 +
    voteCountFactor * 0.08 +
    popularityFactor * 0.04
  );
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
    return `${intro}: une proposition proche de vos envies, gardee pour ouvrir une piste sans forcer le match.`;
  }

  const respected = humanJoin(details.slice(0, 4));
  const conclusion =
    matchedUsers >= totalUsers
      ? "Bon potentiel pour mettre le groupe d'accord sans partir trop loin du quiz."
      : "C'est un compromis propre: il garde l'essentiel et evite le choix trop aleatoire.";

  return `${intro}: ${respected} est bien pris en compte. ${conclusion}`;
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
  if (shouldBlockFamilyUnsafe({ genreTargets, film })) return null;
  const matchedGenreTokens = genreTargets.filter((genre) => filmGenres.includes(genre));
  const primaryGenre =
    matchedGenreTokens[0] || filmGenres[0] || normalizeGenreToken(film.genre || "");
  const genreRatio = genreTargets.length
    ? matchedGenreTokens.length / Math.max(1, genreTargets.length)
    : 1;
  const genreMatchedUsers = usersWithGenre.filter((user) => filmGenres.includes(user.genre)).length;

  const usersWithType = users.filter(
    (user) => Boolean(user.contentType) && user.contentType !== "peu-importe"
  );
  const typeTargets = uniqueStrings([
    ...usersWithType.map((user) => user.contentType),
    strictTargets.contentType && strictTargets.contentType !== "peu-importe"
      ? strictTargets.contentType
      : "",
  ]);
  const matchedTypeTokens = typeTargets.filter((type) => contentType === type);
  const typeRatio = typeTargets.length
    ? matchedTypeTokens.length / Math.max(1, typeTargets.length)
    : 1;
  const typeMatched = !typeTargets.length || matchedTypeTokens.length > 0;

  const usersWithOrigin = users.filter(
    (user) => Boolean(user.origin) && user.origin !== "peu-importe"
  );
  const originTargets = uniqueStrings([
    ...usersWithOrigin.map((user) => user.origin),
    strictTargets.origin && strictTargets.origin !== "peu-importe"
      ? strictTargets.origin
      : "",
  ]);
  const originMatchesByTarget = originTargets.map((origin) => originMatches(origin, film));
  const matchedOriginCount = originMatchesByTarget.filter((match) => match === true).length;
  const hasUnknownOrigin = originMatchesByTarget.some((match) => match === null);
  const originRatio = originTargets.length
    ? matchedOriginCount / Math.max(1, originTargets.length)
    : 1;
  const originMatch = originTargets.length
    ? matchedOriginCount > 0
      ? true
      : hasUnknownOrigin
      ? null
      : false
    : null;

  const platformInfo = platformMatchInfo(globalAnswers.platform, film);

  const scoreParts = {
    genre: genreTargets.length ? Math.round(40 * genreRatio) : 40,
    type: typeTargets.length ? Math.round(20 * typeRatio) : 20,
    age: ageInfo.requested ? (ageInfo.known ? 15 : 10) : 15,
    origin: originTargets.length
      ? Math.round(15 * originRatio) || (hasUnknownOrigin ? 7 : 0)
      : 15,
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
    type: scoreParts.type > 0,
    age: scoreParts.age >= 10,
    origin: !originTargets.length || originMatch === true,
    platform: !platformInfo.requested || platformInfo.matched,
    matchedGenreTokens,
    genreMatchedUsers,
    genreRatio,
    matchedTypeTokens,
    typeRatio,
    typeMatched,
    originTargets,
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

function itemMatchesSingleGenre(item, genreTarget = "") {
  const target = normalizeGenreToken(genreTarget);
  if (!target) return false;
  const film = item?.film || item?.raw || item || {};
  const genres = extractGenres(film);
  return genres.includes(target);
}

function itemCanRepresentGenreTarget(item, genreTarget = "") {
  const target = normalizeGenreToken(genreTarget);
  if (!target || !itemMatchesSingleGenre(item, target)) return false;
  if (target !== "family") return true;
  const film = item?.film || item?.raw || item || {};
  return !itemLooksAnimated(item) && isFamilySafeFilm(film);
}

function itemMatchesContentType(item, contentType = "") {
  const requestedType = normalizeText(contentType);
  if (!requestedType || requestedType === "peu-importe") return true;
  const film = item?.film || item?.raw || item || {};
  return inferContentType(film) === requestedType;
}

function itemMatchesSingleContentType(item, contentType = "") {
  const requestedType = normalizeText(contentType);
  if (!requestedType || requestedType === "peu-importe") return false;
  const film = item?.film || item?.raw || item || {};
  return inferContentType(film) === requestedType;
}

function itemMatchesSingleOrigin(item, origin = "") {
  const requestedOrigin = normalizeText(origin);
  if (!requestedOrigin || requestedOrigin === "peu-importe") return false;
  const film = item?.film || item?.raw || item || {};
  return originMatches(requestedOrigin, film) === true;
}

function itemMatchesAnyOriginTarget(item, originTargets = []) {
  const targets = uniqueStrings(
    (Array.isArray(originTargets) ? originTargets : [])
      .map((origin) => normalizeText(origin))
      .filter((origin) => origin && origin !== "peu-importe")
  );
  if (!targets.length) return true;
  return targets.some((origin) => itemMatchesSingleOrigin(item, origin));
}

function itemYear(item) {
  const film = item?.film || item?.raw || item || {};
  return normalizeYear(film.year) || normalizeYear(film.release_date) || 0;
}

function itemIsRecent(item, minRecentYear = 2020) {
  const year = itemYear(item);
  return year >= minRecentYear;
}

function currentRecentYearFloor() {
  return Math.max(2020, new Date().getFullYear() - 5);
}

function selectDiverse(scoredItems, max, options = {}) {
  const selected = [];
  const genreCounts = new Map();
  const animationCap = Number.isFinite(options.animationCap)
    ? options.animationCap
    : Infinity;
  const requiredGenreTargets = uniqueStrings(
    Array.isArray(options.requiredGenreTargets)
      ? options.requiredGenreTargets.map((genre) => normalizeGenreToken(genre))
      : []
  );
  const requiredContentTypeTargets = uniqueStrings(
    Array.isArray(options.requiredContentTypeTargets)
      ? options.requiredContentTypeTargets
          .map((contentType) => normalizeText(contentType))
          .filter((contentType) => contentType && contentType !== "peu-importe")
      : []
  );
  const requiredOriginTargets = uniqueStrings(
    Array.isArray(options.requiredOriginTargets)
      ? options.requiredOriginTargets
          .map((origin) => normalizeText(origin))
          .filter((origin) => origin && origin !== "peu-importe")
      : []
  );
  const minRecentItems = Math.min(
    max,
    Number.isFinite(options.minRecentItems) ? options.minRecentItems : 0
  );
  const minRecentYear = Number.isFinite(options.minRecentYear)
    ? options.minRecentYear
    : currentRecentYearFloor();
  const minOlderItems = Math.min(
    max,
    Number.isFinite(options.minOlderItems) ? options.minOlderItems : 0
  );
  const minimumUsefulResults = Math.min(max, 5);
  let animationCount = 0;

  function alreadySelected(item) {
    return selected.some((candidate) => candidate.key === item.key);
  }

  function canTakeAnimation(item, enforceCap) {
    if (!enforceCap) return true;
    if (!itemLooksAnimated(item)) return true;
    return animationCount < animationCap;
  }

  function take(item) {
    selected.push(item);
    if (itemLooksAnimated(item)) animationCount += 1;
  }

  function tryTake(item) {
    if (alreadySelected(item)) return false;
    if (!canTakeAnimation(item, true)) return false;
    take(item);
    return true;
  }

  function takeFrom(items, { enforceAnimationCap = true } = {}) {
    for (const item of items) {
      if (selected.length >= max) break;
      if (alreadySelected(item)) continue;
      if (enforceAnimationCap && !canTakeAnimation(item, true)) continue;
      take(item);
    }
  }

  // In a group, every selected genre deserves a seat at the table when the pool allows it.
  // Example: Action + Romance should not become "five action titles" just because action is more popular.
  for (const genreTarget of requiredGenreTargets) {
    if (selected.length >= max) break;
    if (selected.some((item) => itemCanRepresentGenreTarget(item, genreTarget))) continue;
    const representative = scoredItems.find(
      (item) => itemCanRepresentGenreTarget(item, genreTarget) && canTakeAnimation(item, true)
    );
    if (representative) {
      take(representative);
    }
  }

  for (const contentTypeTarget of requiredContentTypeTargets) {
    if (selected.length >= max) break;
    if (selected.some((item) => itemMatchesSingleContentType(item, contentTypeTarget))) continue;
    const representative = scoredItems.find(
      (item) =>
        itemMatchesSingleContentType(item, contentTypeTarget) &&
        canTakeAnimation(item, true)
    );
    if (representative) {
      take(representative);
    }
  }

  for (const originTarget of requiredOriginTargets) {
    if (selected.length >= max) break;
    if (selected.some((item) => itemMatchesSingleOrigin(item, originTarget))) continue;
    const representative = scoredItems.find(
      (item) => itemMatchesSingleOrigin(item, originTarget) && canTakeAnimation(item, true)
    );
    if (representative) {
      take(representative);
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

  if (minOlderItems > 0) {
    for (const item of scoredItems) {
      if (selected.length >= max) break;
      if (
        selected.filter((candidate) => !itemIsRecent(candidate, minRecentYear)).length >=
        minOlderItems
      ) {
        break;
      }
      if (itemIsRecent(item, minRecentYear)) continue;
      tryTake(item);
    }
  }

  for (const item of scoredItems) {
    if (selected.length >= max) break;
    if (alreadySelected(item)) continue;
    if (!canTakeAnimation(item, true)) continue;
    const genre = item.primaryGenre || "autre";
    const count = genreCounts.get(genre) || 0;
    if (count >= 2 && selected.length < max - 1) continue;
    take(item);
    genreCounts.set(genre, count + 1);
  }

  if (selected.length < max) {
    takeFrom(scoredItems, { enforceAnimationCap: true });
  }

  // If the pool is genuinely too small, fill the list rather than returning too few.
  // Once 5 coherent choices exist, keep the animation cap instead of padding with cartoons.
  if (selected.length < max) {
    takeFrom(
      scoredItems.filter((item) => !itemLooksAnimated(item)),
      { enforceAnimationCap: false }
    );
  }

  if (
    selected.length < max &&
    selected.length < minimumUsefulResults &&
    !Number.isFinite(animationCap)
  ) {
    takeFrom(scoredItems, { enforceAnimationCap: false });
  }

  return selected;
}

function buildRandomizedOrder(items) {
  if (!items.length) return [];
  const best = items[0].score || 0;
  const coherentPool = items.filter((item) => item.score >= Math.max(45, best - 24));
  const rest = items.filter((item) => !coherentPool.includes(item));
  return [...shuffle(coherentPool), ...rest];
}

function buildVariedOrder(items) {
  if (!items.length) return [];
  const bestScore = items[0].score || 0;
  const bestRanking = items[0].rankingScore || bestScore;
  const windowSize = Math.min(36, items.length);
  const topWindow = items.slice(0, windowSize);
  const coherentWindow = topWindow.filter((item) => {
    const score = item.score || 0;
    const rankingScore = item.rankingScore || score;
    return score >= Math.max(48, bestScore - 18) || rankingScore >= bestRanking - 5;
  });
  const varied = shuffle(coherentWindow.length >= 5 ? coherentWindow : topWindow);
  const variedKeys = new Set(varied.map((item) => item.key));
  const rest = items.filter((item) => !variedKeys.has(item.key));
  return [...varied, ...rest];
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
  const requestedContentTypeTargets = uniqueStrings([
    strictTargets.contentType && strictTargets.contentType !== "peu-importe"
      ? strictTargets.contentType
      : "",
    ...users
      .map((user) => user.contentType)
      .filter((contentType) => contentType && contentType !== "peu-importe"),
  ]);
  const requestedOriginTargets = uniqueStrings([
    strictTargets.origin && strictTargets.origin !== "peu-importe" ? strictTargets.origin : "",
    ...users
      .map((user) => user.origin)
      .filter((origin) => origin && origin !== "peu-importe"),
  ]);
  const animationPreference = animationPreferenceForGroup(users, strictTargets);
  const animationCap = animationPreference.cap;
  const excluded = new Set(excludedKeys.map((key) => String(key)));
  const avoided = new Set(avoidTitles.map((title) => normalizeText(title)));

  const candidateFilms = dedupeFilmPool(films);

  const scored = candidateFilms
    .map((film) => scoreFilm(film, { users, globalAnswers, strictTargets }))
    .filter(Boolean)
    .filter((item) => itemMatchesContentType(item, strictTargets.contentType))
    .filter((item) =>
      shouldBlockAnimation({
        animationCap,
        film: item?.film,
      })
        ? false
        : true
    );

  let unique = dedupeByTitle(scored).filter((item) => {
    if (excluded.has(item.key)) return false;
    if (avoided.has(normalizeText(item.film.title))) return false;
    if (
      shouldBlockToutPublicHorror({
        selectedAge: globalAnswers.ageRestriction,
        genreTargets: requestedGenreTargets,
        film: item.film,
      })
    ) {
      return false;
    }
    return true;
  });
  const originRestrictionActive = requestedOriginTargets.length > 0;
  if (originRestrictionActive) {
    unique = unique.filter((item) => itemMatchesAnyOriginTarget(item, requestedOriginTargets));
  }

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
    requestedOriginTargets.length > 0
      ? typePreferred.filter((item) => itemMatchesAnyOriginTarget(item, requestedOriginTargets))
      : typePreferred;

  // On privilegie les criteres importants. L'origine demandee reste stricte
  // des qu'un resultat exact existe, meme si le pool exact est petit.
  if (requestedOriginTargets.length > 0 && originPreferred.length > 0) {
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
        if (shouldBlockAnimation({ animationCap, film })) {
          return null;
        }
        if (shouldBlockFamilyUnsafe({ genreTargets: requestedGenreTargets, film })) {
          return null;
        }
        if (
          shouldBlockToutPublicHorror({
            selectedAge: globalAnswers.ageRestriction,
            genreTargets: requestedGenreTargets,
            film,
          })
        ) {
          return null;
        }
        if (!itemMatchesContentType(film, strictTargets.contentType)) {
          return null;
        }
        if (!itemMatchesGenreTargets(film, requestedGenreTargets)) {
          return null;
        }
        const fallbackItem = buildFallbackScoredItem({ film, strictTargets, globalAnswers });
        if (
          originRestrictionActive &&
          !itemMatchesAnyOriginTarget(fallbackItem, requestedOriginTargets)
        ) {
          return null;
        }
        return fallbackItem;
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
          !shouldBlockAnimation({ animationCap, film }) &&
          !shouldBlockFamilyUnsafe({ genreTargets: requestedGenreTargets, film }) &&
          !shouldBlockToutPublicHorror({
            selectedAge: globalAnswers.ageRestriction,
            genreTargets: requestedGenreTargets,
            film,
          }) &&
          itemMatchesContentType(film, strictTargets.contentType) &&
          itemMatchesGenreTargets(film, requestedGenreTargets) &&
          (!originRestrictionActive || itemMatchesAnyOriginTarget(film, requestedOriginTargets))
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
    animationCap,
    requiredGenreTargets: requestedGenreTargets,
    requiredContentTypeTargets: requestedContentTypeTargets,
    requiredOriginTargets: requestedOriginTargets,
    minRecentItems: 3,
    minRecentYear: currentRecentYearFloor(),
    minOlderItems: 1,
  });

  if (diverse.length >= max) {
    return diverse
      .filter((item) => itemMatchesGenreTargets(item, requestedGenreTargets))
      .filter((item) => itemMatchesContentType(item, strictTargets.contentType))
      .filter((item) => !originRestrictionActive || itemMatchesAnyOriginTarget(item, requestedOriginTargets))
      .slice(0, max)
      .map(enrichItem);
  }

  let fallbackAnimationCount = diverse.filter((item) => itemLooksAnimated(item)).length;
  const firstFallbackSource = (randomize ? shuffle(baseRanked) : baseRanked).filter((item) => {
    if (diverse.some((candidate) => candidate.key === item.key)) return false;
    if (!itemMatchesGenreTargets(item, requestedGenreTargets)) return false;
    if (!itemMatchesContentType(item, strictTargets.contentType)) return false;
    if (originRestrictionActive && !itemMatchesAnyOriginTarget(item, requestedOriginTargets)) return false;
    if (!Number.isFinite(animationCap) || !itemLooksAnimated(item)) return true;
    if (fallbackAnimationCount >= animationCap) return false;
    fallbackAnimationCount += 1;
    return true;
  });
  let finalItems = [...diverse, ...firstFallbackSource].slice(0, max);

  if (finalItems.length < Math.min(max, 4)) {
    const relaxedFallback = (randomize ? shuffle(baseRanked) : baseRanked).filter(
      (item) =>
        !finalItems.some((candidate) => candidate.key === item.key) &&
        itemMatchesContentType(item, strictTargets.contentType) &&
        itemMatchesGenreTargets(item, requestedGenreTargets) &&
        (!originRestrictionActive || itemMatchesAnyOriginTarget(item, requestedOriginTargets))
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
        if (shouldBlockAnimation({ animationCap, film })) {
          return null;
        }
        if (shouldBlockFamilyUnsafe({ genreTargets: requestedGenreTargets, film })) {
          return null;
        }
        if (
          shouldBlockToutPublicHorror({
            selectedAge: globalAnswers.ageRestriction,
            genreTargets: requestedGenreTargets,
            film,
          })
        ) {
          return null;
        }
        if (!itemMatchesContentType(film, strictTargets.contentType)) {
          return null;
        }
        if (!itemMatchesGenreTargets(film, requestedGenreTargets)) {
          return null;
        }
        const fallbackItem = buildFallbackScoredItem({ film, strictTargets, globalAnswers });
        if (
          originRestrictionActive &&
          !itemMatchesAnyOriginTarget(fallbackItem, requestedOriginTargets)
        ) {
          return null;
        }
        return fallbackItem;
      })
      .filter(Boolean);

    finalItems = selectDiverse(dedupeByTitle([...finalItems, ...emergency]), max, {
      animationCap,
      requiredGenreTargets: requestedGenreTargets,
      requiredContentTypeTargets: requestedContentTypeTargets,
      requiredOriginTargets: requestedOriginTargets,
      minRecentItems: 0,
      minRecentYear: currentRecentYearFloor(),
      minOlderItems: 0,
    });
  }

  return finalItems
    .filter((item) => itemMatchesGenreTargets(item, requestedGenreTargets))
    .filter((item) => itemMatchesContentType(item, strictTargets.contentType))
    .filter((item) => !originRestrictionActive || itemMatchesAnyOriginTarget(item, requestedOriginTargets))
    .map(enrichItem);
}

export function filmKey(item) {
  return filmKeyOf(item.raw || item);
}
