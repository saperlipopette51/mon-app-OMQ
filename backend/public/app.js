import { buildRecommendations, filmKey as engineFilmKey } from "/recommendations-engine.js";

const appRoot = document.querySelector("#omq-app");

const OPTIONS = {
  platforms: [
    { value: "netflix", label: "Netflix", icon: "🔴" },
    { value: "prime-video", label: "Prime Video", icon: "🔵" },
    { value: "apple-tv", label: "Apple TV", icon: "🍎" },
    { value: "disney-plus", label: "Disney+", icon: "🟡" },
    { value: "hbo-max", label: "HBO", icon: "🟣" },
  ],
  ages: [
    { value: "all", label: "Tout public", icon: "👪" },
    { value: "12", label: "Interdit aux moins de 12 ans", icon: "🚫" },
    { value: "16", label: "Interdit aux moins de 16 ans", icon: "🛑" },
    { value: "18", label: "Interdit aux moins de 18 ans", icon: "⛔" },
  ],
  contentTypes: [
    { value: "film", label: "Film", icon: "🎬" },
    { value: "serie", label: "Serie", icon: "📺" },
    { value: "peu-importe", label: "Peu importe", icon: "🍿" },
  ],
  genres: [
    { value: "28", label: "Action", icon: "💥" },
    { value: "12", label: "Adventure", icon: "🌍" },
    { value: "16", label: "Animation", icon: "🎨" },
    { value: "35", label: "Comedy", icon: "😂" },
    { value: "99", label: "Documentary", icon: "📹" },
    { value: "18", label: "Drama", icon: "🎭" },
    { value: "10751", label: "Family", icon: "👪" },
    { value: "27", label: "Horror", icon: "👻" },
    { value: "10402", label: "Music", icon: "🎵" },
    { value: "10749", label: "Romance", icon: "❤️" },
    { value: "878", label: "Science Fiction", icon: "🚀" },
    { value: "37", label: "Western", icon: "🤠" },
  ],
  origins: [
    { value: "us", label: "US", icon: "🇺🇸" },
    { value: "asie", label: "Film asiatique", icon: "🌏" },
    { value: "europe", label: "Europe", icon: "🇪🇺" },
    { value: "peu-importe", label: "Peu importe", icon: "🌍" },
  ],
};

const STORAGE_KEY = "omq-web-favorites-v1";
const SEEN_STORAGE_KEY = "omq-web-seen-v1";
const LIKED_STORAGE_KEY = "omq-web-liked-v1";
const DISLIKED_STORAGE_KEY = "omq-web-disliked-v1";
const RESULT_LIMIT = 5;
const RESULT_POOL_TARGET = 36;
const SURPRISE_LIMIT = 3;
const FAVORITE_ADD_LIMIT = 2;
const posterLookupCache = new Map();

const WEB_FALLBACK_ITEMS = [
  {
    id: "web-deepestbreath",
    title: "The Deepest Breath",
    year: 2023,
    type: "film",
    genre: "Documentaire",
    genre_ids: [99],
    origin: "europe",
    age_bucket: 12,
    vote_average: 7.5,
    discovery: true,
    overview:
      "Un documentaire recent, intense et tres immersif sur l'apnee, parfait pour une decouverte forte.",
  },
  {
    id: "web-fireoflove",
    title: "Fire of Love",
    year: 2022,
    type: "film",
    genre: "Documentaire, Romance",
    genre_ids: [99, 10749],
    origin: "us",
    age_bucket: 0,
    vote_average: 7.6,
    discovery: true,
    overview:
      "Une pepite documentaire sur deux volcanologues, a la fois spectaculaire, intime et tres accessible.",
  },
  {
    id: "web-octopusteacher",
    title: "My Octopus Teacher",
    year: 2020,
    type: "film",
    genre: "Documentaire",
    genre_ids: [99],
    origin: "europe",
    age_bucket: 0,
    vote_average: 8.0,
    discovery: true,
    overview:
      "Un documentaire sensible et surprenant, parfait pour une soiree calme avec une vraie decouverte.",
  },
  {
    id: "web-lifeonplanet",
    title: "David Attenborough: A Life on Our Planet",
    year: 2020,
    type: "film",
    genre: "Documentaire",
    genre_ids: [99],
    origin: "europe",
    age_bucket: 0,
    vote_average: 8.5,
    discovery: true,
    overview:
      "Un documentaire nature recent, clair et marquant, facile a proposer a un groupe tout public.",
  },
  {
    id: "web-elephantqueen",
    title: "The Elephant Queen",
    year: 2019,
    type: "film",
    genre: "Documentaire, Famille",
    genre_ids: [99, 10751],
    origin: "europe",
    age_bucket: 0,
    vote_average: 7.7,
    discovery: true,
    overview:
      "Un documentaire familial visuel et accessible, bon choix pour decouvrir sans tension.",
  },
  {
    id: "web-biggestlittlefarm",
    title: "The Biggest Little Farm",
    year: 2018,
    type: "film",
    genre: "Documentaire, Famille",
    genre_ids: [99, 10751],
    origin: "us",
    age_bucket: 0,
    vote_average: 7.8,
    discovery: true,
    overview:
      "Un documentaire nature optimiste et tres accessible, parfait pour completer une selection tout public.",
  },
  {
    id: "web-neighbor",
    title: "Won't You Be My Neighbor?",
    year: 2018,
    type: "film",
    genre: "Documentaire",
    genre_ids: [99],
    origin: "us",
    age_bucket: 0,
    vote_average: 8.0,
    discovery: true,
    overview:
      "Un documentaire americain doux et humain, parfait quand on veut une decouverte positive.",
  },
  {
    id: "web-apollo11",
    title: "Apollo 11",
    year: 2019,
    type: "film",
    genre: "Documentaire, Historique",
    genre_ids: [99, 36],
    origin: "us",
    age_bucket: 0,
    vote_average: 7.8,
    discovery: true,
    overview:
      "Un documentaire americain spectaculaire sur la mission Apollo, tendu comme un vrai film d'aventure.",
  },
  {
    id: "web-jirodreams",
    title: "Jiro Dreams of Sushi",
    year: 2011,
    type: "film",
    genre: "Documentaire",
    genre_ids: [99],
    origin: "us",
    age_bucket: 0,
    vote_average: 7.8,
    discovery: true,
    overview:
      "Un documentaire americain elegant et calme autour de l'excellence culinaire japonaise.",
  },
  {
    id: "web-hoopdreams",
    title: "Hoop Dreams",
    year: 1994,
    type: "film",
    genre: "Documentaire",
    genre_ids: [99],
    origin: "us",
    age_bucket: 0,
    vote_average: 8.0,
    discovery: true,
    overview:
      "Un grand documentaire americain sur deux jeunes basketteurs, humain, prenant et toujours fort.",
  },
  {
    id: "web-sugar-man",
    title: "Searching for Sugar Man",
    year: 2012,
    type: "film",
    genre: "Documentaire, Musique",
    genre_ids: [99, 10402],
    origin: "us",
    age_bucket: 0,
    vote_average: 7.9,
    discovery: true,
    overview:
      "Un documentaire musical americain plein de mystere, excellent pour une vraie decouverte.",
  },
  {
    id: "web-summer-soul",
    title: "Summer of Soul",
    year: 2021,
    type: "film",
    genre: "Documentaire, Musique",
    genre_ids: [99, 10402],
    origin: "us",
    age_bucket: 0,
    vote_average: 7.7,
    discovery: true,
    overview:
      "Un documentaire americain recent, musical et solaire, parfait pour une soiree plus vivante.",
  },
  {
    id: "web-rbg",
    title: "RBG",
    year: 2018,
    type: "film",
    genre: "Documentaire",
    genre_ids: [99],
    origin: "us",
    age_bucket: 0,
    vote_average: 7.5,
    discovery: true,
    overview:
      "Un documentaire americain clair et inspirant autour d'une figure marquante de la justice.",
  },
  {
    id: "web-dawnwall",
    title: "The Dawn Wall",
    year: 2017,
    type: "film",
    genre: "Documentaire, Aventure",
    genre_ids: [99, 12],
    origin: "us",
    age_bucket: 12,
    vote_average: 8.0,
    discovery: true,
    overview:
      "Un documentaire americain d'escalade, intense et humain, tres efficace en soiree.",
  },
  {
    id: "web-mindinggap",
    title: "Minding the Gap",
    year: 2018,
    type: "film",
    genre: "Documentaire",
    genre_ids: [99],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.8,
    discovery: true,
    overview:
      "Un documentaire americain intime et puissant, ideal pour une decouverte moins evidente.",
  },
  {
    id: "web-three-identical",
    title: "Three Identical Strangers",
    year: 2018,
    type: "film",
    genre: "Documentaire, Mystere",
    genre_ids: [99, 9648],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.4,
    discovery: true,
    overview:
      "Un documentaire americain construit comme une enquete, accrocheur des les premieres minutes.",
  },
  {
    id: "web-therescue",
    title: "The Rescue",
    year: 2021,
    type: "film",
    genre: "Documentaire",
    genre_ids: [99],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.9,
    discovery: true,
    overview:
      "Un documentaire americain recent, nerveux et haletant, parfait pour une soiree documentaire intense.",
  },
  {
    id: "web-free-solo",
    title: "Free Solo",
    year: 2018,
    type: "film",
    genre: "Documentaire, Aventure",
    genre_ids: [99, 12],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.9,
    discovery: true,
    overview:
      "Un documentaire de tension pure autour d'une ascension hors norme, ideal si le groupe veut etre accroche.",
  },
  {
    id: "web-navalny",
    title: "Navalny",
    year: 2022,
    type: "film",
    genre: "Documentaire, Thriller",
    genre_ids: [99, 53],
    origin: "europe",
    age_bucket: 12,
    vote_average: 7.3,
    discovery: true,
    overview:
      "Un documentaire politique recent, construit comme une enquete tendue, pour une soiree plus serieuse.",
  },
  {
    id: "web-13th",
    title: "13th",
    year: 2016,
    type: "film",
    genre: "Documentaire",
    genre_ids: [99],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.9,
    discovery: true,
    overview:
      "Un documentaire clair et puissant, a choisir quand le groupe veut comprendre un sujet de fond.",
  },
  {
    id: "web-ourplanet2",
    title: "Notre planete II",
    year: 2023,
    type: "serie",
    genre: "Documentaire",
    genre_ids: [99],
    origin: "europe",
    age_bucket: 0,
    vote_average: 8.3,
    discovery: true,
    overview:
      "Une serie documentaire recente, spectaculaire et facile a regarder par episodes.",
  },
  {
    id: "web-blueplanet2",
    title: "Blue Planet II",
    year: 2017,
    type: "serie",
    genre: "Documentaire, Famille",
    genre_ids: [99, 10751],
    origin: "europe",
    age_bucket: 0,
    vote_average: 8.6,
    discovery: true,
    overview:
      "Une serie documentaire marine spectaculaire, parfaite quand il faut une valeur sure tout public.",
  },
  {
    id: "web-prehistoricplanet",
    title: "Prehistoric Planet",
    year: 2022,
    type: "serie",
    genre: "Documentaire, Famille",
    genre_ids: [99, 10751],
    origin: "europe",
    age_bucket: 0,
    vote_average: 8.3,
    discovery: true,
    overview:
      "Une serie documentaire moderne et visuelle, parfaite pour une decouverte tout public.",
  },
  {
    id: "web-lastdance",
    title: "The Last Dance",
    year: 2020,
    type: "serie",
    genre: "Documentaire",
    genre_ids: [99],
    origin: "us",
    age_bucket: 12,
    vote_average: 8.2,
    discovery: true,
    overview:
      "Une serie documentaire sportive tres prenante, meme pour ceux qui ne suivent pas le basket.",
  },
  {
    id: "web-chefstable",
    title: "Chef's Table",
    year: 2015,
    type: "serie",
    genre: "Documentaire",
    genre_ids: [99],
    origin: "us",
    age_bucket: 0,
    vote_average: 8.0,
    discovery: true,
    overview:
      "Une serie documentaire culinaire elegante, ideale pour une soiree calme et inspirante.",
  },
  {
    id: "web-imagineering",
    title: "The Imagineering Story",
    year: 2019,
    type: "serie",
    genre: "Documentaire",
    genre_ids: [99],
    origin: "us",
    age_bucket: 0,
    vote_average: 8.1,
    discovery: true,
    overview:
      "Une serie documentaire americaine sur les coulisses de Disney, accessible et pleine d'idees.",
  },
  {
    id: "web-nationalparks",
    title: "Our Great National Parks",
    year: 2022,
    type: "serie",
    genre: "Documentaire, Famille",
    genre_ids: [99, 10751],
    origin: "us",
    age_bucket: 0,
    vote_average: 8.0,
    discovery: true,
    overview:
      "Une serie documentaire americaine recente, visuelle et tout public, parfaite pour explorer sans tension.",
  },
  {
    id: "web-welcome-wrexham",
    title: "Welcome to Wrexham",
    year: 2022,
    type: "serie",
    genre: "Documentaire",
    genre_ids: [99],
    origin: "us",
    age_bucket: 12,
    vote_average: 8.2,
    discovery: true,
    overview:
      "Une serie documentaire americaine sportive et humaine, facile a suivre meme sans aimer le football.",
  },
  {
    id: "web-abstract-design",
    title: "Abstract: The Art of Design",
    year: 2017,
    type: "serie",
    genre: "Documentaire",
    genre_ids: [99],
    origin: "us",
    age_bucket: 0,
    vote_average: 8.3,
    discovery: true,
    overview:
      "Une serie documentaire americaine sur la creation et le design, ideale pour une soiree inspirante.",
  },
  {
    id: "web-high-score",
    title: "High Score",
    year: 2020,
    type: "serie",
    genre: "Documentaire",
    genre_ids: [99],
    origin: "us",
    age_bucket: 0,
    vote_average: 7.4,
    discovery: true,
    overview:
      "Une serie documentaire americaine sur l'histoire du jeu video, courte et facile a lancer.",
  },
  {
    id: "web-movies-made-us",
    title: "The Movies That Made Us",
    year: 2019,
    type: "serie",
    genre: "Documentaire",
    genre_ids: [99],
    origin: "us",
    age_bucket: 0,
    vote_average: 7.6,
    discovery: true,
    overview:
      "Une serie documentaire americaine sur les coulisses de films cultes, parfaite pour les curieux de cinema.",
  },
  {
    id: "web-toys-made-us",
    title: "The Toys That Made Us",
    year: 2017,
    type: "serie",
    genre: "Documentaire",
    genre_ids: [99],
    origin: "us",
    age_bucket: 0,
    vote_average: 7.9,
    discovery: true,
    overview:
      "Une serie documentaire americaine pop et nostalgique, simple a regarder en plusieurs episodes.",
  },
  {
    id: "web-explained",
    title: "Explained",
    year: 2018,
    type: "serie",
    genre: "Documentaire",
    genre_ids: [99],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.7,
    discovery: true,
    overview:
      "Une serie documentaire americaine avec des episodes courts pour picorer plein de sujets.",
  },
  {
    id: "web-hostile-planet",
    title: "Hostile Planet",
    year: 2019,
    type: "serie",
    genre: "Documentaire, Famille",
    genre_ids: [99, 10751],
    origin: "us",
    age_bucket: 0,
    vote_average: 8.0,
    discovery: true,
    overview:
      "Une serie documentaire americaine spectaculaire sur la nature extreme, accessible et immersive.",
  },
  {
    id: "web-drivetosurvive",
    title: "Formula 1: Drive to Survive",
    year: 2019,
    type: "serie",
    genre: "Documentaire",
    genre_ids: [99],
    origin: "europe",
    age_bucket: 12,
    vote_average: 8.1,
    discovery: true,
    overview:
      "Une serie documentaire sportive rythmee, parfaite quand on veut du reel avec du suspense.",
  },
  {
    id: "web-topgun-maverick",
    title: "Top Gun: Maverick",
    year: 2022,
    type: "film",
    genre: "Action, Drame",
    genre_ids: [28, 18],
    origin: "us",
    age_bucket: 12,
    vote_average: 8.2,
    discovery: true,
    overview:
      "Un film d'action recent, spectaculaire et tres accessible, parfait quand le groupe veut du grand cinema efficace.",
  },
  {
    id: "web-mission-impossible-fallout",
    title: "Mission: Impossible - Fallout",
    year: 2018,
    type: "film",
    genre: "Action, Aventure",
    genre_ids: [28, 12],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.4,
    discovery: true,
    overview:
      "Un action movie nerveux et clair, ideal pour une soiree spectaculaire sans prise de tete.",
  },
  {
    id: "web-dungeons-dragons",
    title: "Dungeons & Dragons: Honor Among Thieves",
    year: 2023,
    type: "film",
    genre: "Action, Aventure, Comedie",
    genre_ids: [28, 12, 35],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.3,
    discovery: true,
    overview:
      "Une aventure recente, drole et rythmee, bonne option quand action et legerete doivent cohabiter.",
  },
  {
    id: "web-thebatman",
    title: "The Batman",
    year: 2022,
    type: "film",
    genre: "Action, Crime, Drame",
    genre_ids: [28, 80, 18],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.7,
    discovery: true,
    overview:
      "Une proposition sombre mais grand public, entre enquete et action, pour une soiree plus intense.",
  },
  {
    id: "web-blackpanther",
    title: "Black Panther",
    year: 2018,
    type: "film",
    genre: "Action, Aventure, Science-fiction",
    genre_ids: [28, 12, 878],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.4,
    discovery: true,
    overview:
      "Une aventure super-heroique solide, efficace quand le groupe veut action, univers fort et rythme.",
  },
  {
    id: "web-edgetomorrow",
    title: "Edge of Tomorrow",
    year: 2014,
    type: "film",
    genre: "Action, Science-fiction",
    genre_ids: [28, 878],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.6,
    discovery: true,
    overview:
      "Un film d'action SF malin et tres rejouable, parfait pour une soiree dynamique.",
  },
  {
    id: "web-sourcecode",
    title: "Source Code",
    year: 2011,
    type: "film",
    genre: "Action, Science-fiction, Thriller",
    genre_ids: [28, 878, 53],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.3,
    discovery: true,
    overview:
      "Un thriller SF court et efficace, pratique quand on veut de l'action sans y passer toute la nuit.",
  },
  {
    id: "web-into-spiderverse",
    title: "Spider-Man: Into the Spider-Verse",
    year: 2018,
    type: "film",
    genre: "Action, Animation, Aventure",
    genre_ids: [28, 16, 12],
    origin: "us",
    age_bucket: 0,
    vote_average: 8.4,
    discovery: true,
    overview:
      "Une aventure animee inventive et energique, tout public sans etre fade.",
  },
  {
    id: "web-across-spiderverse",
    title: "Spider-Man: Across the Spider-Verse",
    year: 2023,
    type: "film",
    genre: "Action, Animation, Aventure",
    genre_ids: [28, 16, 12],
    origin: "us",
    age_bucket: 0,
    vote_average: 8.5,
    discovery: true,
    overview:
      "Une suite recente, visuelle et nerveuse, parfaite pour action, animation et aventure.",
  },
  {
    id: "web-the-old-guard",
    title: "The Old Guard",
    year: 2020,
    type: "film",
    genre: "Action, Fantastique",
    genre_ids: [28, 14],
    origin: "us",
    age_bucket: 16,
    vote_average: 6.9,
    discovery: true,
    overview:
      "Un film d'action fantastique moderne, bon choix quand le groupe accepte une ambiance plus musclee.",
  },
  {
    id: "web-reacher",
    title: "Reacher",
    year: 2022,
    type: "serie",
    genre: "Action, Crime",
    genre_ids: [28, 80],
    origin: "us",
    age_bucket: 16,
    vote_average: 8.1,
    discovery: true,
    overview:
      "Une serie d'action directe et efficace, ideale quand on veut des episodes qui avancent vite.",
  },
  {
    id: "web-alias",
    title: "Alias",
    year: 2001,
    type: "serie",
    genre: "Action, Aventure, Drame",
    genre_ids: [28, 12, 18],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.6,
    discovery: true,
    overview:
      "Une serie d'espionnage nerveuse, utile pour une selection action en format episodique.",
  },
  {
    id: "web-jackryan",
    title: "Tom Clancy's Jack Ryan",
    year: 2018,
    type: "serie",
    genre: "Action, Thriller",
    genre_ids: [28, 53],
    origin: "us",
    age_bucket: 16,
    vote_average: 7.7,
    discovery: true,
    overview:
      "Une serie d'action geopolitique, a proposer quand le groupe veut une tension plus adulte.",
  },
  {
    id: "web-arrival",
    title: "Arrival",
    year: 2016,
    type: "film",
    genre: "Science-fiction, Drame",
    genre_ids: [878, 18],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.6,
    discovery: true,
    overview:
      "Une science-fiction elegante et emotionnelle, parfaite pour une soiree plus intelligente.",
  },
  {
    id: "web-themartian",
    title: "The Martian",
    year: 2015,
    type: "film",
    genre: "Science-fiction, Aventure, Drame",
    genre_ids: [878, 12, 18],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.7,
    discovery: true,
    overview:
      "Une aventure spatiale positive et accessible, bon compromis entre SF et divertissement.",
  },
  {
    id: "web-dune",
    title: "Dune",
    year: 2021,
    type: "film",
    genre: "Science-fiction, Aventure",
    genre_ids: [878, 12],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.8,
    discovery: true,
    overview:
      "Une grande fresque SF moderne, visuelle et immersive, pour une soiree ambitieuse.",
  },
  {
    id: "web-dune-part-two",
    title: "Dune: Part Two",
    year: 2024,
    type: "film",
    genre: "Science-fiction, Aventure",
    genre_ids: [878, 12],
    origin: "us",
    age_bucket: 12,
    vote_average: 8.3,
    discovery: true,
    overview:
      "Une suite recente et spectaculaire, parfaite si le groupe veut de la SF epique.",
  },
  {
    id: "web-ready-player-one",
    title: "Ready Player One",
    year: 2018,
    type: "film",
    genre: "Science-fiction, Aventure, Action",
    genre_ids: [878, 12, 28],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.6,
    discovery: true,
    overview:
      "Une aventure SF pop et ludique, efficace quand le groupe veut quelque chose de fun.",
  },
  {
    id: "web-thecreator",
    title: "The Creator",
    year: 2023,
    type: "film",
    genre: "Science-fiction, Action",
    genre_ids: [878, 28],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.1,
    discovery: true,
    overview:
      "Une SF recente et visuelle, bonne option pour sortir des franchises habituelles.",
  },
  {
    id: "web-ad-astra",
    title: "Ad Astra",
    year: 2019,
    type: "film",
    genre: "Science-fiction, Drame, Aventure",
    genre_ids: [878, 18, 12],
    origin: "us",
    age_bucket: 12,
    vote_average: 6.8,
    discovery: true,
    overview:
      "Une science-fiction contemplative, pour une soiree spatiale plus calme et adulte.",
  },
  {
    id: "web-severance",
    title: "Severance",
    year: 2022,
    type: "serie",
    genre: "Science-fiction, Drame, Mystere",
    genre_ids: [878, 18, 9648],
    origin: "us",
    age_bucket: 16,
    vote_average: 8.7,
    discovery: true,
    overview:
      "Une serie SF recente, etrange et tres prenante, ideale pour une vraie decouverte.",
  },
  {
    id: "web-foundation",
    title: "Foundation",
    year: 2021,
    type: "serie",
    genre: "Science-fiction, Drame",
    genre_ids: [878, 18],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.6,
    discovery: true,
    overview:
      "Une serie SF ambitieuse et ample, pour les soirees ou le groupe veut un univers riche.",
  },
  {
    id: "web-silo",
    title: "Silo",
    year: 2023,
    type: "serie",
    genre: "Science-fiction, Drame",
    genre_ids: [878, 18],
    origin: "us",
    age_bucket: 16,
    vote_average: 8.1,
    discovery: true,
    overview:
      "Une serie SF recente et mysterieuse, parfaite pour accrocher un groupe sur plusieurs episodes.",
  },
  {
    id: "web-past-lives",
    title: "Past Lives",
    year: 2023,
    type: "film",
    genre: "Romance, Drame",
    genre_ids: [10749, 18],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.8,
    discovery: true,
    overview:
      "Une romance recente, fine et melancolique, parfaite pour une soiree douce sans cliche.",
  },
  {
    id: "web-before-sunrise",
    title: "Before Sunrise",
    year: 1995,
    type: "film",
    genre: "Romance, Drame",
    genre_ids: [10749, 18],
    origin: "us",
    age_bucket: 12,
    vote_average: 8.0,
    discovery: true,
    overview:
      "Une romance de conversation, simple et touchante, parfaite pour une soiree intime.",
  },
  {
    id: "web-about-time",
    title: "About Time",
    year: 2013,
    type: "film",
    genre: "Romance, Comedie, Drame",
    genre_ids: [10749, 35, 18],
    origin: "europe",
    age_bucket: 12,
    vote_average: 7.9,
    discovery: true,
    overview:
      "Une romance chaleureuse avec une idee fantastique, bon choix quand on veut du coeur.",
  },
  {
    id: "web-the-big-sick",
    title: "The Big Sick",
    year: 2017,
    type: "film",
    genre: "Romance, Comedie, Drame",
    genre_ids: [10749, 35, 18],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.5,
    discovery: true,
    overview:
      "Une comedie romantique moderne et sincere, moins automatique que les classiques du genre.",
  },
  {
    id: "web-crazy-rich-asians",
    title: "Crazy Rich Asians",
    year: 2018,
    type: "film",
    genre: "Romance, Comedie",
    genre_ids: [10749, 35],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.1,
    discovery: true,
    overview:
      "Une romance pop, lumineuse et facile a partager en groupe.",
  },
  {
    id: "web-brooklyn",
    title: "Brooklyn",
    year: 2015,
    type: "film",
    genre: "Romance, Drame",
    genre_ids: [10749, 18],
    origin: "europe",
    age_bucket: 12,
    vote_average: 7.5,
    discovery: true,
    overview:
      "Une romance douce et elegante, parfaite quand le groupe veut une emotion calme.",
  },
  {
    id: "web-your-name",
    title: "Your Name",
    year: 2016,
    type: "film",
    genre: "Romance, Animation, Drame",
    genre_ids: [10749, 16, 18],
    origin: "asie",
    age_bucket: 0,
    vote_average: 8.5,
    discovery: true,
    overview:
      "Une romance animee japonaise, belle et accessible, ideale pour decouvrir autre chose.",
  },
  {
    id: "web-heartstopper",
    title: "Heartstopper",
    year: 2022,
    type: "serie",
    genre: "Romance, Drame",
    genre_ids: [10749, 18],
    origin: "europe",
    age_bucket: 0,
    vote_average: 8.5,
    discovery: true,
    overview:
      "Une serie romantique douce et recente, facile a regarder quand on veut quelque chose de tendre.",
  },
  {
    id: "web-normal-people",
    title: "Normal People",
    year: 2020,
    type: "serie",
    genre: "Romance, Drame",
    genre_ids: [10749, 18],
    origin: "europe",
    age_bucket: 16,
    vote_average: 8.1,
    discovery: true,
    overview:
      "Une romance dramatique intense, a garder pour une soiree plus adulte.",
  },
  {
    id: "web-sing-street",
    title: "Sing Street",
    year: 2016,
    type: "film",
    genre: "Musique, Romance, Comedie",
    genre_ids: [10402, 10749, 35],
    origin: "europe",
    age_bucket: 12,
    vote_average: 7.9,
    discovery: true,
    overview:
      "Un film musical lumineux et attachant, excellent pour une soiree feel-good.",
  },
  {
    id: "web-begin-again",
    title: "Begin Again",
    year: 2013,
    type: "film",
    genre: "Musique, Romance, Comedie",
    genre_ids: [10402, 10749, 35],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.2,
    discovery: true,
    overview:
      "Une comedie musicale moderne et douce, facile a proposer quand on veut du leger.",
  },
  {
    id: "web-once",
    title: "Once",
    year: 2007,
    type: "film",
    genre: "Musique, Romance, Drame",
    genre_ids: [10402, 10749, 18],
    origin: "europe",
    age_bucket: 0,
    vote_average: 7.4,
    discovery: true,
    overview:
      "Un petit film musical intime, parfait pour une decouverte simple et sincere.",
  },
  {
    id: "web-coda",
    title: "CODA",
    year: 2021,
    type: "film",
    genre: "Musique, Drame, Famille",
    genre_ids: [10402, 18, 10751],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.9,
    discovery: true,
    overview:
      "Un drame familial musical recent, chaleureux et tres accessible.",
  },
  {
    id: "web-yesterday",
    title: "Yesterday",
    year: 2019,
    type: "film",
    genre: "Musique, Comedie, Romance",
    genre_ids: [10402, 35, 10749],
    origin: "europe",
    age_bucket: 0,
    vote_average: 6.8,
    discovery: true,
    overview:
      "Une comedie musicale pop, parfaite quand le groupe veut quelque chose de leger.",
  },
  {
    id: "web-greatest-showman",
    title: "The Greatest Showman",
    year: 2017,
    type: "film",
    genre: "Musique, Drame, Famille",
    genre_ids: [10402, 18, 10751],
    origin: "us",
    age_bucket: 0,
    vote_average: 7.9,
    discovery: true,
    overview:
      "Un musical grand public, energique et simple a partager.",
  },
  {
    id: "web-school-of-rock",
    title: "School of Rock",
    year: 2003,
    type: "film",
    genre: "Musique, Comedie, Famille",
    genre_ids: [10402, 35, 10751],
    origin: "us",
    age_bucket: 0,
    vote_average: 7.1,
    discovery: true,
    overview:
      "Une comedie musicale tres accessible, parfaite pour une soiree familiale et drole.",
  },
  {
    id: "web-tick-tick-boom",
    title: "Tick, Tick... Boom!",
    year: 2021,
    type: "film",
    genre: "Musique, Drame",
    genre_ids: [10402, 18],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.6,
    discovery: true,
    overview:
      "Un film musical recent, rythme et sensible, pour une soiree plus creative.",
  },
  {
    id: "web-flora-and-son",
    title: "Flora and Son",
    year: 2023,
    type: "film",
    genre: "Musique, Drame, Comedie",
    genre_ids: [10402, 18, 35],
    origin: "europe",
    age_bucket: 12,
    vote_average: 7.0,
    discovery: true,
    overview:
      "Une petite pepite musicale recente, humaine et facile a aimer.",
  },
  {
    id: "web-daisy-jones",
    title: "Daisy Jones & The Six",
    year: 2023,
    type: "serie",
    genre: "Musique, Drame",
    genre_ids: [10402, 18],
    origin: "us",
    age_bucket: 16,
    vote_average: 8.1,
    discovery: true,
    overview:
      "Une serie musicale recente, parfaite si le groupe veut une ambiance rock et drama.",
  },
  {
    id: "web-a-quiet-place",
    title: "A Quiet Place",
    year: 2018,
    type: "film",
    genre: "Horreur, Thriller, Science-fiction",
    genre_ids: [27, 53, 878],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.4,
    discovery: true,
    overview:
      "Un film d'horreur tendu mais accessible, excellent quand le groupe veut du suspense.",
  },
  {
    id: "web-the-others",
    title: "The Others",
    year: 2001,
    type: "film",
    genre: "Horreur, Mystere, Thriller",
    genre_ids: [27, 9648, 53],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.6,
    discovery: true,
    overview:
      "Une horreur elegante et atmospherique, plus inquietante que gore.",
  },
  {
    id: "web-sixth-sense",
    title: "The Sixth Sense",
    year: 1999,
    type: "film",
    genre: "Horreur, Mystere, Drame",
    genre_ids: [27, 9648, 18],
    origin: "us",
    age_bucket: 12,
    vote_average: 8.0,
    discovery: true,
    overview:
      "Un classique du fantastique horrifique, parfait pour une soiree tension sans exces.",
  },
  {
    id: "web-m3gan",
    title: "M3GAN",
    year: 2022,
    type: "film",
    genre: "Horreur, Science-fiction, Thriller",
    genre_ids: [27, 878, 53],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.1,
    discovery: true,
    overview:
      "Une horreur recente, pop et efficace, bonne option pour une soiree fun.",
  },
  {
    id: "web-happy-death-day",
    title: "Happy Death Day",
    year: 2017,
    type: "film",
    genre: "Horreur, Comedie, Mystere",
    genre_ids: [27, 35, 9648],
    origin: "us",
    age_bucket: 12,
    vote_average: 6.6,
    discovery: true,
    overview:
      "Une horreur fun en boucle temporelle, parfaite si le groupe veut rire et frissonner.",
  },
  {
    id: "web-scary-stories",
    title: "Scary Stories to Tell in the Dark",
    year: 2019,
    type: "film",
    genre: "Horreur, Mystere",
    genre_ids: [27, 9648],
    origin: "us",
    age_bucket: 12,
    vote_average: 6.5,
    discovery: true,
    overview:
      "Une horreur accessible et visuelle, adaptee a une soiree frissons moderee.",
  },
  {
    id: "web-signs",
    title: "Signs",
    year: 2002,
    type: "film",
    genre: "Horreur, Science-fiction, Thriller",
    genre_ids: [27, 878, 53],
    origin: "us",
    age_bucket: 12,
    vote_average: 6.8,
    discovery: true,
    overview:
      "Un thriller horrifique sobre et efficace, ideal pour une tension progressive.",
  },
  {
    id: "web-10-cloverfield-lane",
    title: "10 Cloverfield Lane",
    year: 2016,
    type: "film",
    genre: "Horreur, Thriller, Science-fiction",
    genre_ids: [27, 53, 878],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.0,
    discovery: true,
    overview:
      "Un huis clos tendu, parfait pour une soiree suspense avec une touche horrifique.",
  },
  {
    id: "web-the-village",
    title: "The Village",
    year: 2004,
    type: "film",
    genre: "Horreur, Mystere, Drame",
    genre_ids: [27, 9648, 18],
    origin: "us",
    age_bucket: 12,
    vote_average: 6.5,
    discovery: true,
    overview:
      "Une ambiance mysterieux-horrifique lente et soignee, pour une soiree plus calme.",
  },
  {
    id: "web-lockwood",
    title: "Lockwood & Co.",
    year: 2023,
    type: "serie",
    genre: "Horreur, Fantastique, Aventure",
    genre_ids: [27, 14, 12],
    origin: "europe",
    age_bucket: 12,
    vote_average: 7.4,
    discovery: true,
    overview:
      "Une serie fantastique a fantomes, plus aventure que gore, pratique pour une soiree frissons.",
  },
  {
    id: "web-coraline",
    title: "Coraline",
    year: 2009,
    type: "film",
    genre: "Horreur, Animation, Famille",
    genre_ids: [27, 16, 10751],
    origin: "us",
    age_bucket: 0,
    vote_average: 7.9,
    discovery: true,
    overview:
      "Une aventure animee sombre et fascinante, parfaite pour des frissons tout public.",
  },
  {
    id: "web-paranorman",
    title: "ParaNorman",
    year: 2012,
    type: "film",
    genre: "Horreur, Animation, Comedie",
    genre_ids: [27, 16, 35],
    origin: "us",
    age_bucket: 0,
    vote_average: 7.0,
    discovery: true,
    overview:
      "Une horreur animee drole et accessible, bonne option pour frissonner sans aller trop loin.",
  },
  {
    id: "web-goosebumps",
    title: "Goosebumps",
    year: 2015,
    type: "film",
    genre: "Horreur, Comedie, Aventure",
    genre_ids: [27, 35, 12],
    origin: "us",
    age_bucket: 0,
    vote_average: 6.3,
    discovery: true,
    overview:
      "Une option horreur-aventure tres accessible, pensee pour des frissons legers.",
  },
  {
    id: "web-haunted-house-kr",
    title: "The Haunted House",
    year: 2016,
    type: "serie",
    genre: "Horreur, Fantastique, Famille",
    genre_ids: [27, 14, 10751],
    origin: "asie",
    age_bucket: 0,
    vote_average: 8.0,
    discovery: true,
    is_animation: true,
    soft_horror_fallback: true,
    overview:
      "Une serie coreenne de fantomes et de petites enquetes surnaturelles, pensee pour des frissons accessibles.",
  },
  {
    id: "web-gegege-kitaro",
    title: "GeGeGe no Kitaro",
    year: 2018,
    type: "serie",
    genre: "Horreur, Fantastique, Famille",
    genre_ids: [27, 14, 10751],
    origin: "asie",
    age_bucket: 0,
    vote_average: 7.8,
    discovery: true,
    is_animation: true,
    soft_horror_fallback: true,
    overview:
      "Une aventure japonaise autour des yokai, ideale quand on veut une ambiance surnaturelle sans viser l'horreur adulte.",
  },
  {
    id: "web-natsume-book",
    title: "Natsume's Book of Friends",
    year: 2008,
    type: "serie",
    genre: "Horreur, Fantastique, Drame",
    genre_ids: [27, 14, 18],
    origin: "asie",
    age_bucket: 0,
    vote_average: 8.1,
    discovery: true,
    is_animation: true,
    soft_horror_fallback: true,
    overview:
      "Une serie japonaise de rencontres avec des esprits, douce, mysterieuse et parfaite pour un frisson tout public.",
  },
  {
    id: "web-mushishi",
    title: "Mushishi",
    year: 2005,
    type: "serie",
    genre: "Horreur, Fantastique, Mystere",
    genre_ids: [27, 14, 9648],
    origin: "asie",
    age_bucket: 0,
    vote_average: 8.4,
    discovery: true,
    is_animation: true,
    soft_horror_fallback: true,
    overview:
      "Une serie japonaise etrange et contemplative autour de phenomenes surnaturels, plus envoutante que terrifiante.",
  },
  {
    id: "web-morose-mononokean",
    title: "The Morose Mononokean",
    year: 2016,
    type: "serie",
    genre: "Horreur, Fantastique, Comedie",
    genre_ids: [27, 14, 35],
    origin: "asie",
    age_bucket: 0,
    vote_average: 7.2,
    discovery: true,
    is_animation: true,
    soft_horror_fallback: true,
    overview:
      "Une serie japonaise avec esprits et yokai, legere et accessible pour garder l'ambiance horreur sans depasser le tout public.",
  },
  {
    id: "web-hotel-del-luna",
    title: "Hotel del Luna",
    year: 2019,
    type: "serie",
    genre: "Horreur, Fantastique, Romance",
    genre_ids: [27, 14, 10749],
    origin: "asie",
    age_bucket: 0,
    vote_average: 8.3,
    discovery: true,
    soft_horror_fallback: true,
    overview:
      "Une serie coreenne live action avec fantomes, humour et romance, parfaite pour garder le frisson sans basculer dans l'horreur adulte.",
  },
  {
    id: "web-bring-it-on-ghost",
    title: "Bring It On, Ghost",
    year: 2016,
    type: "serie",
    genre: "Horreur, Fantastique, Comedie",
    genre_ids: [27, 14, 35],
    origin: "asie",
    age_bucket: 0,
    vote_average: 7.6,
    discovery: true,
    soft_horror_fallback: true,
    overview:
      "Une serie coreenne live action de chasse aux fantomes, plus fun et surnaturelle que vraiment effrayante.",
  },
  {
    id: "web-school-nurse-files",
    title: "The School Nurse Files",
    year: 2020,
    type: "serie",
    genre: "Horreur, Fantastique, Comedie",
    genre_ids: [27, 14, 35],
    origin: "asie",
    age_bucket: 0,
    vote_average: 7.0,
    discovery: true,
    soft_horror_fallback: true,
    overview:
      "Une serie coreenne live action etrange et coloree, avec monstres invisibles et ambiance fantastique tres accessible.",
  },
  {
    id: "web-mystic-popup-bar",
    title: "Mystic Pop-up Bar",
    year: 2020,
    type: "serie",
    genre: "Horreur, Fantastique, Comedie",
    genre_ids: [27, 14, 35],
    origin: "asie",
    age_bucket: 0,
    vote_average: 8.0,
    discovery: true,
    soft_horror_fallback: true,
    overview:
      "Une serie coreenne live action surnaturelle, douce et drole, utile quand on veut des esprits sans dessin anime.",
  },
  {
    id: "web-uncanny-counter",
    title: "The Uncanny Counter",
    year: 2020,
    type: "serie",
    genre: "Horreur, Fantastique, Action",
    genre_ids: [27, 14, 28],
    origin: "asie",
    age_bucket: 0,
    vote_average: 8.4,
    discovery: true,
    soft_horror_fallback: true,
    overview:
      "Une serie coreenne live action avec demons et pouvoirs, plus aventure surnaturelle que gore.",
  },
  {
    id: "web-masters-sun",
    title: "The Master's Sun",
    year: 2013,
    type: "serie",
    genre: "Horreur, Fantastique, Romance",
    genre_ids: [27, 14, 10749],
    origin: "asie",
    age_bucket: 0,
    vote_average: 8.0,
    discovery: true,
    soft_horror_fallback: true,
    overview:
      "Une serie coreenne live action avec fantomes et romance, parfaite pour un frisson leger sans dessin anime.",
  },
  {
    id: "web-sell-haunted-house",
    title: "Sell Your Haunted House",
    year: 2021,
    type: "serie",
    genre: "Horreur, Fantastique, Mystere",
    genre_ids: [27, 14, 9648],
    origin: "asie",
    age_bucket: 0,
    vote_average: 7.6,
    discovery: true,
    soft_horror_fallback: true,
    overview:
      "Une serie coreenne live action de maisons hantees, avec enquete surnaturelle et ambiance accessible.",
  },
  {
    id: "web-missing-other-side",
    title: "Missing: The Other Side",
    year: 2020,
    type: "serie",
    genre: "Horreur, Fantastique, Mystere",
    genre_ids: [27, 14, 9648],
    origin: "asie",
    age_bucket: 0,
    vote_average: 7.7,
    discovery: true,
    soft_horror_fallback: true,
    overview:
      "Une serie coreenne live action autour d'un village d'esprits, plus mysterieuse qu'effrayante.",
  },
  {
    id: "web-arang-magistrate",
    title: "Arang and the Magistrate",
    year: 2012,
    type: "serie",
    genre: "Horreur, Fantastique, Romance",
    genre_ids: [27, 14, 10749],
    origin: "asie",
    age_bucket: 0,
    vote_average: 7.5,
    discovery: true,
    soft_horror_fallback: true,
    overview:
      "Une serie coreenne live action avec fantome, folklore et romance, bonne alternative tout public.",
  },
  {
    id: "web-oh-my-ghost",
    title: "Oh My Ghost",
    year: 2015,
    type: "serie",
    genre: "Horreur, Fantastique, Comedie",
    genre_ids: [27, 14, 35],
    origin: "asie",
    age_bucket: 0,
    vote_average: 8.1,
    discovery: true,
    soft_horror_fallback: true,
    overview:
      "Une serie coreenne live action de possession gentille et comedie romantique, avec un frisson tres leger.",
  },
  {
    id: "web-spirited-away-horror-soft",
    title: "Le Voyage de Chihiro",
    year: 2001,
    type: "film",
    genre: "Horreur, Fantastique, Famille",
    genre_ids: [27, 14, 10751],
    origin: "asie",
    age_bucket: 0,
    vote_average: 8.5,
    discovery: true,
    is_animation: true,
    soft_horror_fallback: true,
    overview:
      "Une pepite japonaise avec des creatures inquietantes et une vraie atmosphere de conte sombre, mais accessible.",
  },
  {
    id: "web-house-lost-cape",
    title: "The House of the Lost on the Cape",
    year: 2021,
    type: "film",
    genre: "Horreur, Fantastique, Famille",
    genre_ids: [27, 14, 10751],
    origin: "asie",
    age_bucket: 0,
    vote_average: 6.8,
    discovery: true,
    is_animation: true,
    soft_horror_fallback: true,
    overview:
      "Un film japonais surnaturel et apaisant, plus mystere que peur pure, utile pour une soiree tout public.",
  },
  {
    id: "web-wednesday",
    title: "Wednesday",
    year: 2022,
    type: "serie",
    genre: "Horreur, Comedie, Mystere",
    genre_ids: [27, 35, 9648],
    origin: "us",
    age_bucket: 12,
    vote_average: 8.4,
    discovery: true,
    overview:
      "Une serie gothique recente, entre mystere et humour noir, facile a lancer en groupe.",
  },
  {
    id: "web-true-grit",
    title: "True Grit",
    year: 2010,
    type: "film",
    genre: "Western, Aventure, Drame",
    genre_ids: [37, 12, 18],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.3,
    discovery: true,
    overview:
      "Un western moderne, solide et accessible, parfait pour une soiree aventure plus seche.",
  },
  {
    id: "web-news-of-the-world",
    title: "News of the World",
    year: 2020,
    type: "film",
    genre: "Western, Drame, Aventure",
    genre_ids: [37, 18, 12],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.0,
    discovery: true,
    overview:
      "Un western recent, calme et humain, pour une soiree plus posee.",
  },
  {
    id: "web-rango",
    title: "Rango",
    year: 2011,
    type: "film",
    genre: "Western, Animation, Comedie",
    genre_ids: [37, 16, 35],
    origin: "us",
    age_bucket: 0,
    vote_average: 7.2,
    discovery: true,
    overview:
      "Un western anime drole et etrange, parfait pour une option tout public mais originale.",
  },
  {
    id: "web-magnificent-seven",
    title: "The Magnificent Seven",
    year: 2016,
    type: "film",
    genre: "Western, Action, Aventure",
    genre_ids: [37, 28, 12],
    origin: "us",
    age_bucket: 12,
    vote_average: 6.4,
    discovery: true,
    overview:
      "Un western d'action simple et efficace, pratique quand le groupe veut du mouvement.",
  },
  {
    id: "web-the-rider",
    title: "The Rider",
    year: 2017,
    type: "film",
    genre: "Western, Drame",
    genre_ids: [37, 18],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.4,
    discovery: true,
    overview:
      "Un western contemporain sensible, pour une decouverte plus intime.",
  },
  {
    id: "web-meeks-cutoff",
    title: "Meek's Cutoff",
    year: 2010,
    type: "film",
    genre: "Western, Drame",
    genre_ids: [37, 18],
    origin: "us",
    age_bucket: 12,
    vote_average: 6.5,
    discovery: true,
    overview:
      "Un western lent et tendu, a choisir pour une soiree plus contemplative.",
  },
  {
    id: "web-slow-west",
    title: "Slow West",
    year: 2015,
    type: "film",
    genre: "Western, Drame, Thriller",
    genre_ids: [37, 18, 53],
    origin: "europe",
    age_bucket: 12,
    vote_average: 6.9,
    discovery: true,
    overview:
      "Un western court et singulier, parfait pour une pepite moins evidente.",
  },
  {
    id: "web-sisters-brothers",
    title: "The Sisters Brothers",
    year: 2018,
    type: "film",
    genre: "Western, Drame, Comedie",
    genre_ids: [37, 18, 35],
    origin: "europe",
    age_bucket: 12,
    vote_average: 6.9,
    discovery: true,
    overview:
      "Un western sombre et decale, bon choix pour changer des classiques.",
  },
  {
    id: "web-godless",
    title: "Godless",
    year: 2017,
    type: "serie",
    genre: "Western, Drame",
    genre_ids: [37, 18],
    origin: "us",
    age_bucket: 16,
    vote_average: 8.2,
    discovery: true,
    overview:
      "Une mini-serie western intense et elegante, parfaite pour un format serie plus adulte.",
  },
  {
    id: "web-english",
    title: "The English",
    year: 2022,
    type: "serie",
    genre: "Western, Drame",
    genre_ids: [37, 18],
    origin: "europe",
    age_bucket: 16,
    vote_average: 7.8,
    discovery: true,
    overview:
      "Une serie western recente et stylisee, excellente pour une decouverte plus forte.",
  },
  {
    id: "web-lucky-luke",
    title: "Lucky Luke",
    year: 2009,
    type: "serie",
    genre: "Western, Animation, Famille",
    genre_ids: [37, 16, 10751],
    origin: "europe",
    origin_country: ["FR"],
    age_bucket: 0,
    vote_average: 6.8,
    discovery: true,
    overview:
      "Une option western europeenne et familiale, utile quand il faut respecter le genre sans aller vers l'adulte.",
  },
  {
    id: "web-zorro-europe",
    title: "Zorro",
    year: 2024,
    type: "serie",
    genre: "Western, Aventure, Action",
    genre_ids: [37, 12, 28],
    origin: "europe",
    origin_country: ["FR", "ES"],
    age_bucket: 12,
    vote_average: 6.9,
    discovery: true,
    overview:
      "Une serie d'aventure western europeenne, pratique pour garder le choix dans l'origine demandee.",
  },
  {
    id: "web-django-serie",
    title: "Django",
    year: 2023,
    type: "serie",
    genre: "Western, Drame",
    genre_ids: [37, 18],
    origin: "europe",
    origin_country: ["FR", "IT"],
    age_bucket: 16,
    vote_average: 6.5,
    discovery: true,
    overview:
      "Une serie western europeenne plus adulte, a garder pour une soiree sombre et dramatique.",
  },
  {
    id: "web-dirty-black-bag",
    title: "That Dirty Black Bag",
    year: 2022,
    type: "serie",
    genre: "Western, Drame",
    genre_ids: [37, 18],
    origin: "europe",
    origin_country: ["IT"],
    age_bucket: 16,
    vote_average: 6.9,
    discovery: true,
    overview:
      "Une serie western europeenne rugueuse, pour completer les choix quand le filtre est tres precis.",
  },
  {
    id: "web-lone-ranger",
    title: "The Lone Ranger",
    year: 2013,
    type: "film",
    genre: "Western, Action, Aventure",
    genre_ids: [37, 28, 12],
    origin: "us",
    age_bucket: 12,
    vote_average: 6.1,
    discovery: true,
    overview:
      "Un western d'aventure spectaculaire, utile quand le groupe veut un choix plus grand public.",
  },
  {
    id: "web-hidalgo",
    title: "Hidalgo",
    year: 2004,
    type: "film",
    genre: "Western, Aventure, Drame",
    genre_ids: [37, 12, 18],
    origin: "us",
    age_bucket: 12,
    vote_average: 6.8,
    discovery: true,
    overview:
      "Une aventure western accessible, avec un souffle de voyage et de defi.",
  },
  {
    id: "web-maverick-1994",
    title: "Maverick",
    year: 1994,
    type: "film",
    genre: "Western, Comedie, Aventure",
    genre_ids: [37, 35, 12],
    origin: "us",
    age_bucket: 0,
    vote_average: 7.0,
    discovery: true,
    overview:
      "Un western leger et joueur, parfait quand on veut le genre sans ambiance trop lourde.",
  },
  {
    id: "web-spirit",
    title: "Spirit: Stallion of the Cimarron",
    year: 2002,
    type: "film",
    genre: "Western, Animation, Famille",
    genre_ids: [37, 16, 10751],
    origin: "us",
    age_bucket: 0,
    vote_average: 7.7,
    discovery: true,
    overview:
      "Un western anime familial, pratique pour couvrir le genre en tout public.",
  },
  {
    id: "web-longmire",
    title: "Longmire",
    year: 2012,
    type: "serie",
    genre: "Western, Crime, Drame",
    genre_ids: [37, 80, 18],
    origin: "us",
    age_bucket: 12,
    vote_average: 8.3,
    discovery: true,
    overview:
      "Une serie western policiere, solide pour ceux qui veulent une option episodique.",
  },
  {
    id: "web-paddington-series",
    title: "Les aventures de Paddington",
    year: 2019,
    type: "serie",
    genre: "Famille, Animation, Aventure",
    genre_ids: [10751, 16, 12],
    origin: "europe",
    origin_country: ["GB", "FR"],
    age_bucket: 0,
    vote_average: 7.7,
    discovery: true,
    overview:
      "Une serie familiale europeenne douce et accessible, parfaite pour une selection tout public.",
  },
  {
    id: "web-shaun-sheep",
    title: "Shaun le mouton",
    year: 2007,
    type: "serie",
    genre: "Famille, Animation, Comedie",
    genre_ids: [10751, 16, 35],
    origin: "europe",
    origin_country: ["GB"],
    age_bucket: 0,
    vote_average: 8.1,
    discovery: true,
    overview:
      "Une serie familiale europeenne, courte et drole, ideale quand il faut une valeur sure.",
  },
  {
    id: "web-worst-witch",
    title: "The Worst Witch",
    year: 2017,
    type: "serie",
    genre: "Famille, Aventure",
    genre_ids: [10751, 12],
    origin: "europe",
    origin_country: ["GB", "DE"],
    age_bucket: 0,
    vote_average: 7.5,
    discovery: true,
    overview:
      "Une serie europeenne familiale et magique, bonne option quand le filtre famille est choisi.",
  },
  {
    id: "web-merlin",
    title: "Merlin",
    year: 2008,
    type: "serie",
    genre: "Famille, Aventure, Drame",
    genre_ids: [10751, 12, 18],
    origin: "europe",
    origin_country: ["GB"],
    age_bucket: 12,
    vote_average: 7.9,
    discovery: true,
    overview:
      "Une serie europeenne d'aventure familiale, parfaite pour un match entre fantasy et tout public.",
  },
  {
    id: "web-ryelane",
    title: "Rye Lane",
    year: 2023,
    type: "film",
    genre: "Comedie, Romance",
    genre_ids: [35, 10749],
    origin: "europe",
    age_bucket: 12,
    vote_average: 7.2,
    discovery: true,
    overview:
      "Une comedie romantique anglaise vive, coloree et moins vue que les classiques du genre.",
  },
  {
    id: "web-theholdovers",
    title: "The Holdovers",
    year: 2023,
    type: "film",
    genre: "Comedie, Drame",
    genre_ids: [35, 18],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.7,
    discovery: true,
    overview:
      "Une comedie dramatique recente, chaleureuse et tres bien notee, parfaite quand on veut une pepite humaine.",
  },
  {
    id: "web-theatercamp",
    title: "Theater Camp",
    year: 2023,
    type: "film",
    genre: "Comedie",
    genre_ids: [35],
    origin: "us",
    age_bucket: 12,
    vote_average: 6.7,
    discovery: true,
    overview:
      "Une petite comedie recente, absurde et attachante, pour sortir des recommandations habituelles.",
  },
  {
    id: "web-palmsprings",
    title: "Palm Springs",
    year: 2020,
    type: "film",
    genre: "Comedie, Romance, Science-fiction",
    genre_ids: [35, 10749, 878],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.3,
    discovery: true,
    overview:
      "Une boucle temporelle drole et romantique, assez recente et ideale pour une soiree sans prise de tete.",
  },
  {
    id: "web-marcel",
    title: "Marcel the Shell with Shoes On",
    year: 2021,
    type: "film",
    genre: "Animation, Comedie, Famille",
    genre_ids: [16, 35, 10751],
    origin: "us",
    age_bucket: 0,
    vote_average: 7.7,
    discovery: true,
    overview:
      "Une petite merveille d'animation, drole et tendre, parfaite pour decouvrir autre chose qu'un blockbuster.",
  },
  {
    id: "web-leo",
    title: "Leo",
    year: 2023,
    type: "film",
    genre: "Animation, Comedie, Famille",
    genre_ids: [16, 35, 10751],
    origin: "us",
    age_bucket: 0,
    vote_average: 7.4,
    discovery: true,
    overview:
      "Une comedie animee recente, facile a lancer en famille et plus fraiche qu'un vieux classique deja vu.",
  },
  {
    id: "web-migration",
    title: "Migration",
    year: 2023,
    type: "film",
    genre: "Animation, Comedie, Famille, Aventure",
    genre_ids: [16, 35, 10751, 12],
    origin: "us",
    age_bucket: 0,
    vote_average: 7.4,
    discovery: true,
    overview:
      "Une aventure familiale recente, simple et dynamique, pratique quand tout le monde veut quelque chose de leger.",
  },
  {
    id: "web-klaus",
    title: "Klaus",
    year: 2019,
    type: "film",
    genre: "Animation, Comedie, Famille",
    genre_ids: [16, 35, 10751],
    origin: "europe",
    age_bucket: 0,
    vote_average: 8.2,
    discovery: true,
    overview:
      "Une pepite d'animation moderne, belle et drole, qui fonctionne tres bien en choix tout public.",
  },
  {
    id: "web-afteryang",
    title: "After Yang",
    year: 2021,
    type: "film",
    genre: "Science-fiction, Drame",
    genre_ids: [878, 18],
    origin: "us",
    age_bucket: 12,
    vote_average: 6.8,
    discovery: true,
    overview:
      "Une science-fiction calme et sensible, parfaite pour decouvrir une proposition moins evidente.",
  },
  {
    id: "web-prospect",
    title: "Prospect",
    year: 2018,
    type: "film",
    genre: "Science-fiction, Aventure",
    genre_ids: [878, 12],
    origin: "us",
    age_bucket: 12,
    vote_average: 6.2,
    discovery: true,
    overview:
      "Une aventure SF compacte et atmospherique, pour changer des grandes franchises deja vues.",
  },
  {
    id: "web-missing",
    title: "Missing",
    year: 2023,
    type: "film",
    genre: "Thriller, Mystere",
    genre_ids: [53, 9648],
    origin: "us",
    age_bucket: 12,
    vote_average: 7.4,
    discovery: true,
    overview:
      "Un thriller recent et efficace, construit autour des ecrans, bon choix quand on veut du suspense moderne.",
  },
  {
    id: "web-decisiontoleave",
    title: "Decision to Leave",
    year: 2022,
    type: "film",
    genre: "Thriller, Romance, Drame",
    genre_ids: [53, 10749, 18],
    origin: "asie",
    age_bucket: 12,
    vote_average: 7.4,
    discovery: true,
    overview:
      "Un thriller romantique coreen elegant, parfait si le groupe veut une vraie decouverte.",
  },
  {
    id: "web-abbott",
    title: "Abbott Elementary",
    year: 2021,
    type: "serie",
    genre: "Comedie",
    genre_ids: [35],
    origin: "us",
    age_bucket: 0,
    vote_average: 8.1,
    discovery: true,
    overview:
      "Une sitcom recente, drole et lumineuse, ideale pour eviter de retomber sur les memes series cultes.",
  },
  {
    id: "web-ghosts",
    title: "Ghosts",
    year: 2021,
    type: "serie",
    genre: "Comedie, Fantastique",
    genre_ids: [35],
    origin: "us",
    age_bucket: 0,
    vote_average: 7.9,
    discovery: true,
    overview:
      "Une comedie recente a episodes courts, legere et facile a partager en groupe.",
  },
  {
    id: "web-shrinking",
    title: "Shrinking",
    year: 2023,
    type: "serie",
    genre: "Comedie, Drame",
    genre_ids: [35, 18],
    origin: "us",
    age_bucket: 12,
    vote_average: 8.0,
    discovery: true,
    overview:
      "Une comedie dramatique recente, touchante et rythmee, pour une soiree plus moderne.",
  },
  {
    id: "web-intouchables",
    title: "Intouchables",
    year: 2011,
    type: "film",
    genre: "Comedie, Drame",
    genre_ids: [35, 18],
    age_bucket: 0,
    vote_average: 8.2,
    overview:
      "Une rencontre improbable entre deux hommes que tout oppose, portee par beaucoup d'humour et d'emotion.",
    poster_url: "https://image.tmdb.org/t/p/w500/323BP0itpxTsO0skTwdnVmf7YC9.jpg",
  },
  {
    id: "web-inception",
    title: "Inception",
    year: 2010,
    type: "film",
    genre: "Science-fiction, Thriller",
    genre_ids: [878, 53],
    age_bucket: 12,
    vote_average: 8.0,
    overview:
      "Un thriller de science-fiction ideal quand le groupe veut un film spectaculaire avec une vraie idee forte.",
    poster_url: "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
  },
  {
    id: "web-parasite",
    title: "Parasite",
    year: 2019,
    type: "film",
    genre: "Drame, Thriller",
    genre_ids: [18, 53],
    age_bucket: 16,
    vote_average: 8.5,
    overview:
      "Un film tendu, malin et surprenant, parfait pour une soiree ou chacun veut quelque chose de fort.",
    poster_url: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
  },
  {
    id: "web-interstellar",
    title: "Interstellar",
    year: 2014,
    type: "film",
    genre: "Science-fiction, Drame",
    genre_ids: [878, 18],
    age_bucket: 12,
    vote_average: 8.4,
    overview:
      "Un grand voyage spatial, emotionnel et spectaculaire, efficace quand le groupe veut un film ambitieux.",
    poster_url: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  },
  {
    id: "web-amelie",
    title: "Le Fabuleux Destin d'Amelie Poulain",
    year: 2001,
    type: "film",
    genre: "Comedie, Romance",
    genre_ids: [35, 10749],
    age_bucket: 0,
    vote_average: 7.9,
    overview:
      "Une comedie romantique douce et singuliere, facile a proposer quand il faut une ambiance lumineuse.",
    poster_url: "https://image.tmdb.org/t/p/w500/tdXtLG6L1QMwrv0MNdW6B9IwC8B.jpg",
  },
  {
    id: "web-lalaland",
    title: "La La Land",
    year: 2016,
    type: "film",
    genre: "Musique, Romance",
    genre_ids: [10402, 10749],
    age_bucket: 0,
    vote_average: 7.9,
    overview:
      "Un choix musical et romantique, avec assez d'energie pour plaire a une soiree calme mais pas molle.",
    poster_url: "https://image.tmdb.org/t/p/w500/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg",
  },
  {
    id: "web-toystory",
    title: "Toy Story",
    year: 1995,
    type: "film",
    genre: "Animation, Famille",
    genre_ids: [16, 10751],
    age_bucket: 0,
    vote_average: 8.0,
    overview:
      "Une valeur sure familiale, courte, drole et parfaite quand le groupe veut une option tout public.",
    poster_url: "https://image.tmdb.org/t/p/w500/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg",
  },
  {
    id: "web-socialnetwork",
    title: "The Social Network",
    year: 2010,
    type: "film",
    genre: "Drame",
    genre_ids: [18],
    age_bucket: 12,
    vote_average: 7.7,
    overview:
      "Un drame moderne, rythme et bavard juste ce qu'il faut, interessant quand on veut un film intelligent.",
    poster_url: "https://image.tmdb.org/t/p/w500/n0ybibhJtQ5icDqTp8eRytcIHJx.jpg",
  },
  {
    id: "web-shutterisland",
    title: "Shutter Island",
    year: 2010,
    type: "film",
    genre: "Thriller, Mystere",
    genre_ids: [53, 9648],
    age_bucket: 16,
    vote_average: 8.2,
    overview:
      "Un thriller sombre et prenant, a garder pour une soiree ou le groupe accepte une ambiance plus tendue.",
    poster_url: "https://image.tmdb.org/t/p/w500/4GDy0PHYX3VRXUtwK5ysFbg3kEx.jpg",
  },
  {
    id: "web-coco",
    title: "Coco",
    year: 2017,
    type: "film",
    genre: "Animation, Famille, Musique",
    genre_ids: [16, 10751, 10402],
    age_bucket: 0,
    vote_average: 8.2,
    overview:
      "Une option familiale, musicale et tres accessible, utile quand il faut rassembler tout le monde.",
    poster_url: "https://image.tmdb.org/t/p/w500/gGEsBPAijhVUFoiNpgZXqRVWJt2.jpg",
  },
  {
    id: "web-paddington",
    title: "Paddington 2",
    year: 2017,
    type: "film",
    genre: "Comedie, Famille, Aventure",
    genre_ids: [35, 10751, 12],
    origin: "europe",
    age_bucket: 0,
    vote_average: 7.8,
    overview:
      "Une comedie familiale tres chaleureuse, ideale quand il faut un film leger et vraiment tout public.",
  },
  {
    id: "web-retourverslefutur",
    title: "Retour vers le futur",
    year: 1985,
    type: "film",
    genre: "Comedie, Science-fiction, Aventure",
    genre_ids: [35, 878, 12],
    origin: "us",
    age_bucket: 0,
    vote_average: 8.3,
    overview:
      "Un classique fun, rapide et accessible, qui fonctionne bien quand le groupe veut rire sans prise de tete.",
  },
  {
    id: "web-truman",
    title: "The Truman Show",
    year: 1998,
    type: "film",
    genre: "Comedie, Drame",
    genre_ids: [35, 18],
    origin: "us",
    age_bucket: 0,
    vote_average: 8.1,
    overview:
      "Une comedie intelligente avec une vraie idee, parfaite si tu veux quelque chose de drole mais pas vide.",
  },
  {
    id: "web-princessbride",
    title: "Princess Bride",
    year: 1987,
    type: "film",
    genre: "Aventure, Comedie, Romance",
    genre_ids: [12, 35, 10749],
    origin: "us",
    age_bucket: 0,
    vote_average: 7.7,
    overview:
      "Une aventure drole et romantique, facile a lancer quand les envies du groupe sont melangees.",
  },
  {
    id: "web-mitchells",
    title: "Les Mitchell contre les machines",
    year: 2021,
    type: "film",
    genre: "Animation, Comedie, Famille",
    genre_ids: [16, 35, 10751],
    origin: "us",
    age_bucket: 0,
    vote_average: 7.9,
    overview:
      "Une option animee, nerveuse et familiale qui garde l'esprit comedie sans sortir du tout public.",
  },
  {
    id: "web-theoffice",
    title: "The Office",
    year: 2005,
    type: "serie",
    genre: "Comedie",
    genre_ids: [35],
    origin: "us",
    age_bucket: 12,
    vote_average: 8.5,
    overview:
      "Une serie comique culte, efficace quand le groupe veut des episodes courts et une ambiance absurde.",
  },
  {
    id: "web-brooklyn99",
    title: "Brooklyn Nine-Nine",
    year: 2013,
    type: "serie",
    genre: "Comedie, Crime",
    genre_ids: [35, 80],
    origin: "us",
    age_bucket: 12,
    vote_average: 8.2,
    overview:
      "Une comedie policiere tres accessible, parfaite pour une soiree ou personne ne veut trop reflechir.",
  },
  {
    id: "web-friends",
    title: "Friends",
    year: 1994,
    type: "serie",
    genre: "Comedie, Romance",
    genre_ids: [35, 10749],
    origin: "us",
    age_bucket: 0,
    vote_average: 8.4,
    overview:
      "Une valeur sure sitcom, simple a lancer quand tu veux une ambiance confortable et connue.",
  },
  {
    id: "web-dixpourcent",
    title: "Dix pour cent",
    year: 2015,
    type: "serie",
    genre: "Comedie, Drame",
    genre_ids: [35, 18],
    origin: "europe",
    age_bucket: 12,
    vote_average: 8.0,
    overview:
      "Une serie francaise vive et drole, bonne option si tu veux une comedie avec du caractere.",
  },
  {
    id: "web-malcolminthemiddle",
    title: "Malcolm",
    year: 2000,
    type: "serie",
    genre: "Comedie, Famille",
    genre_ids: [35, 10751],
    origin: "us",
    age_bucket: 0,
    vote_average: 8.1,
    overview:
      "Une comedie familiale rythmee, pratique quand il faut une serie accessible et vraiment drole.",
  },
  {
    id: "web-modernfamily",
    title: "Modern Family",
    year: 2009,
    type: "serie",
    genre: "Comedie, Famille",
    genre_ids: [35, 10751],
    origin: "us",
    age_bucket: 0,
    vote_average: 8.0,
    overview:
      "Une comedie familiale tres simple a lancer, avec des episodes courts et une ambiance legere.",
  },
  {
    id: "web-parks",
    title: "Parks and Recreation",
    year: 2009,
    type: "serie",
    genre: "Comedie",
    genre_ids: [35],
    origin: "us",
    age_bucket: 0,
    vote_average: 8.1,
    overview:
      "Une sitcom bienveillante et absurde, parfaite quand tu veux rire sans changer de ton toutes les dix minutes.",
  },
  {
    id: "web-tedlasso",
    title: "Ted Lasso",
    year: 2020,
    type: "serie",
    genre: "Comedie, Drame",
    genre_ids: [35, 18],
    origin: "us",
    age_bucket: 12,
    vote_average: 8.3,
    overview:
      "Une comedie feel-good avec du coeur, bonne option si le groupe veut quelque chose de positif.",
  },
  {
    id: "web-hilda",
    title: "Hilda",
    year: 2018,
    type: "serie",
    genre: "Animation, Famille, Aventure",
    genre_ids: [16, 10751, 12],
    origin: "europe",
    age_bucket: 0,
    vote_average: 8.4,
    overview:
      "Une serie d'animation douce et aventureuse, ideale pour une soiree familiale ou tranquille.",
  },
  {
    id: "web-simpsons",
    title: "Les Simpson",
    year: 1989,
    type: "serie",
    genre: "Animation, Comedie",
    genre_ids: [16, 35],
    origin: "us",
    age_bucket: 0,
    vote_average: 8.0,
    overview:
      "Une comedie animee culte, facile a regarder par episodes quand le groupe veut quelque chose de rapide.",
  },
  {
    id: "web-breakingbad",
    title: "Breaking Bad",
    year: 2008,
    type: "serie",
    genre: "Drame, Crime, Thriller",
    genre_ids: [18, 80, 53],
    origin: "us",
    age_bucket: 16,
    vote_average: 9.0,
    overview:
      "Un drame intense et culte, a choisir si le groupe veut une serie sombre et addictive.",
  },
  {
    id: "web-planetearth",
    title: "Planete Terre",
    year: 2006,
    type: "serie",
    genre: "Documentaire",
    genre_ids: [99],
    origin: "europe",
    age_bucket: 0,
    vote_average: 8.9,
    overview:
      "Un documentaire spectaculaire et calme, parfait quand tu veux voir quelque chose de beau sans fiction.",
  },
];

const state = {
  stepIndex: 0,
  participantCount: 1,
  global: {
    platforms: [],
    ageRestriction: "",
  },
  users: [createUser()],
  loading: false,
  results: [],
  candidatePool: [],
  displayLimit: RESULT_LIMIT,
  skippedKeys: [],
  notice: "",
  error: "",
  seenKeys: loadSeenKeys(),
  likedKeys: loadStoredList(LIKED_STORAGE_KEY),
  dislikedKeys: loadStoredList(DISLIKED_STORAGE_KEY),
  favorites: loadFavorites(),
  surpriseUses: 0,
  favoriteAdds: 0,
};

function createUser() {
  return {
    firstName: "",
    contentType: "",
    genre: "",
    origin: "",
  };
}

function loadFavorites() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveFavorites() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.favorites.slice(0, 50)));
}

function loadSeenKeys() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function loadStoredList(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function saveStoredList(key, values) {
  localStorage.setItem(key, JSON.stringify(uniqueStrings(values).slice(-300)));
}

function saveSeenKeys() {
  localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(uniqueStrings(state.seenKeys).slice(-300)));
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || "")).filter(Boolean))];
}

function resetUsageLimits() {
  state.surpriseUses = 0;
  state.favoriteAdds = 0;
}

function getSurpriseRemaining() {
  return Math.max(0, SURPRISE_LIMIT - state.surpriseUses);
}

function getFavoriteAddsRemaining() {
  return Math.max(0, FAVORITE_ADD_LIMIT - state.favoriteAdds);
}

function getSteps() {
  const steps = [
    { type: "participants" },
    { type: "platforms" },
    { type: "age" },
  ];

  state.users.forEach((_, index) => {
    steps.push({ type: "name", userIndex: index });
    steps.push({ type: "contentType", userIndex: index });
    steps.push({ type: "genre", userIndex: index });
    steps.push({ type: "origin", userIndex: index });
  });

  steps.push({ type: "summary" });
  return steps;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function findLabel(list, value) {
  return list.find((item) => item.value === value)?.label || value || "-";
}

function getCurrentStep() {
  const steps = getSteps();
  return steps[Math.min(state.stepIndex, steps.length - 1)];
}

function setParticipantCount(count) {
  const nextCount = Math.max(1, Math.min(6, Number(count) || 1));
  state.participantCount = nextCount;
  state.users = Array.from({ length: nextCount }, (_, index) => state.users[index] || createUser());
  render();
}

function togglePlatform(value) {
  const exists = state.global.platforms.includes(value);
  state.global.platforms = exists
    ? state.global.platforms.filter((item) => item !== value)
    : [...state.global.platforms, value];
  render();
}

function updateUser(index, key, value, shouldRender = true) {
  state.users[index] = {
    ...state.users[index],
    [key]: value,
  };
  if (shouldRender) render();
}

function canContinue(step) {
  if (step.type === "participants") return state.participantCount >= 1;
  if (step.type === "platforms") return state.global.platforms.length > 0;
  if (step.type === "age") return Boolean(state.global.ageRestriction);
  if (step.type === "summary") return true;
  const user = state.users[step.userIndex] || {};
  if (step.type === "name") return Boolean(user.firstName.trim());
  return Boolean(user[step.type]);
}

function goNext() {
  const step = getCurrentStep();
  if (!canContinue(step)) return;
  if (step.type === "summary") {
    fetchRecommendations();
    return;
  }
  state.stepIndex = Math.min(state.stepIndex + 1, getSteps().length - 1);
  render();
}

function goBack() {
  state.error = "";
  state.notice = "";
  state.results = [];
  state.stepIndex = Math.max(0, state.stepIndex - 1);
  render();
}

function restart() {
  state.stepIndex = 0;
  state.results = [];
  state.candidatePool = [];
  state.displayLimit = RESULT_LIMIT;
  state.skippedKeys = [];
  resetUsageLimits();
  state.notice = "";
  state.error = "";
  state.loading = false;
  render();
}

function optionButton({ option, active, onClick, wide = false }) {
  return `
    <button class="option ${active ? "active" : ""}" type="button" data-action="${onClick}" data-value="${escapeHtml(option.value)}">
      <span class="icon">${escapeHtml(option.icon)}</span>
      <strong>${escapeHtml(option.label)}</strong>
    </button>
  `;
}

function renderParticipants() {
  return `
    <h2 class="question">Combien de personnes regardent ?</h2>
    <p class="hint">Seul, en couple ou en groupe : OMQ cherche un choix qui colle a la soiree.</p>
    <div class="option-grid columns">
      ${[1, 2, 3, 4, 5, 6]
        .map((count) =>
          optionButton({
            option: { value: count, label: `${count} personne${count > 1 ? "s" : ""}`, icon: String(count) },
            active: state.participantCount === count,
            onClick: "participant",
          })
        )
        .join("")}
    </div>
  `;
}

function renderPlatforms() {
  return `
    <h2 class="question">Quelles plateformes ?</h2>
    <p class="hint">Tu peux en choisir plusieurs. OMQ ira chercher dans ton univers de streaming.</p>
    <div class="option-grid columns">
      ${OPTIONS.platforms
        .map((option) =>
          optionButton({
            option,
            active: state.global.platforms.includes(option.value),
            onClick: "platform",
          })
        )
        .join("")}
    </div>
  `;
}

function renderAge() {
  return renderChoiceStep({
    title: "Quel age pour la soiree ?",
    hint: "On filtre pour eviter les mauvaises surprises.",
    options: OPTIONS.ages,
    activeValue: state.global.ageRestriction,
    action: "age",
  });
}

function renderChoiceStep({ title, hint, options, activeValue, action }) {
  return `
    <h2 class="question">${escapeHtml(title)}</h2>
    <p class="hint">${escapeHtml(hint)}</p>
    <div class="option-grid columns">
      ${options
        .map((option) =>
          optionButton({
            option,
            active: activeValue === option.value,
            onClick: action,
          })
        )
        .join("")}
    </div>
  `;
}

function renderUserStep(step) {
  const user = state.users[step.userIndex] || createUser();
  const label = user.firstName.trim() || `Participant ${step.userIndex + 1}`;

  if (step.type === "name") {
    return `
      <h2 class="question">Qui participe ?</h2>
      <p class="hint">Participant ${step.userIndex + 1}/${state.participantCount}</p>
      <input class="input" data-input="firstName" data-user="${step.userIndex}" value="${escapeHtml(user.firstName)}" placeholder="Prenom ou surnom" autocomplete="off" />
    `;
  }

  if (step.type === "contentType") {
    return renderChoiceStep({
      title: `${label}, tu veux quoi ?`,
      hint: "Film, serie ou peu importe.",
      options: OPTIONS.contentTypes,
      activeValue: user.contentType,
      action: "contentType",
    });
  }

  if (step.type === "genre") {
    return renderChoiceStep({
      title: `${label}, quel genre ?`,
      hint: "Choisis l'ambiance principale.",
      options: OPTIONS.genres,
      activeValue: user.genre,
      action: "genre",
    });
  }

  return renderChoiceStep({
    title: `${label}, une origine preferee ?`,
    hint: "Tu peux rester flexible.",
    options: OPTIONS.origins,
    activeValue: user.origin,
    action: "origin",
  });
}

function renderSummary() {
  const platforms = state.global.platforms.map((item) => findLabel(OPTIONS.platforms, item)).join(", ");
  const users = state.users
    .map((user) => {
      const name = user.firstName.trim();
      return `
        <div class="summary-row">
          <span>${escapeHtml(name)}</span>
          <strong>${escapeHtml(findLabel(OPTIONS.contentTypes, user.contentType))} - ${escapeHtml(findLabel(OPTIONS.genres, user.genre))}</strong>
        </div>
      `;
    })
    .join("");

  return `
    <h2 class="question">Pret pour la selection ?</h2>
    <p class="hint">OMQ va croiser les envies et sortir quelques pistes a regarder maintenant.</p>
    <div class="summary-list">
      <div class="summary-row"><span>Plateformes</span><strong>${escapeHtml(platforms)}</strong></div>
      <div class="summary-row"><span>Age</span><strong>${escapeHtml(findLabel(OPTIONS.ages, state.global.ageRestriction))}</strong></div>
      ${users}
    </div>
  `;
}

function renderLoading() {
  appRoot.innerHTML = `
    <div class="loading">
      <div>
        <div class="loader-mark"></div>
        <h2>OMQ cherche le bon match...</h2>
        <p class="hint">Pop propose, Corn juge, le backend chauffe doucement.</p>
      </div>
    </div>
  `;
}

function renderResults() {
  const cards = state.results.length
    ? state.results.map(renderResultCard).join("")
    : "";
  const surpriseRemaining = getSurpriseRemaining();
  const surpriseDisabled = surpriseRemaining <= 0 ? "disabled" : "";

  appRoot.innerHTML = `
    <div class="panel-body">
      <h2 class="question">Selection OMQ</h2>
      <p class="hint">${getResultsHeading()}</p>
      ${state.notice ? `<div class="notice">${escapeHtml(state.notice)}</div>` : ""}
      ${
        !state.results.length && !state.notice
          ? `<div class="notice">OMQ n'a pas encore assez de stock compatible pour ce combo. Essaie de retirer un seul filtre, ou clique sur Refaire le quiz.</div>`
          : ""
      }
      <div class="results">${cards}</div>
      <div class="actions">
        <button class="button primary" type="button" data-action="again" ${surpriseDisabled}>🎲 Surprends-moi (${surpriseRemaining})</button>
        <button class="button secondary" type="button" data-action="restart">Refaire le quiz</button>
        ${
          state.seenKeys.length
            ? `<button class="button secondary" type="button" data-action="clearSeen">👁️ Reinitialiser les deja vus</button>`
            : ""
        }
      </div>
    </div>
  `;
}

function getResultsHeading() {
  if (!state.results.length) {
    return "OMQ n'a pas trouve de piste assez solide pour cette soiree.";
  }
  return `Voici les ${state.results.length} pistes les plus coherentes pour ta soiree.`;
}

function renderResultCard(item) {
  const key = getFilmKey(item);
  const isFavorite = state.favorites.some((favorite) => favorite.key === key);
  const favoriteRemaining = getFavoriteAddsRemaining();
  const favoriteDisabled = !isFavorite && favoriteRemaining <= 0 ? "disabled" : "";
  const isLiked = state.likedKeys.includes(key);
  const isDisliked = state.dislikedKeys.includes(key);
  const platformLabel = getPlatformLabel(item);
  const ratingLabel = getRatingLabel(item);
  const matchScore = getMatchScore(item);
  const why = item.why || getMatchSummary(item, platformLabel, ratingLabel, matchScore);
  const poster = item.poster_url || item.posterUri || item.poster_path || "";
  const posterHtml = poster
    ? `<img class="poster" src="${escapeHtml(normalizePosterUrl(poster))}" alt="" loading="lazy" />`
    : `<div class="poster poster-fallback">OMQ</div>`;

  return `
    <article class="result-card">
      ${posterHtml}
      <div>
        <h3 class="result-title">${escapeHtml(item.title || item.name || "Titre inconnu")}</h3>
        <div class="meta">
          <span class="tag tag-match">Match ${matchScore}%</span>
          ${item.discovery ? `<span class="tag tag-discovery">Pepite</span>` : ""}
          ${isRecentItem(item) ? `<span class="tag tag-recent">Recent</span>` : ""}
          <span class="tag">${escapeHtml(getItemYear(item) || "Annee inconnue")}</span>
          <span class="tag">${escapeHtml(item.genre || item.genres?.join(", ") || "Genre")}</span>
          ${ratingLabel ? `<span class="tag">${escapeHtml(ratingLabel)}</span>` : ""}
          ${platformLabel ? `<span class="tag">${escapeHtml(platformLabel)}</span>` : ""}
        </div>
        <div class="result-section">
          <strong>Resume</strong>
          <p>${escapeHtml(item.overview || item.summary || "Resume indisponible.")}</p>
        </div>
        <div class="result-section">
          <strong>Pourquoi ce match ?</strong>
          <p>${escapeHtml(why)}</p>
        </div>
        <div class="actions result-actions">
          <button class="button secondary ${isLiked ? "active" : ""}" type="button" data-action="like" data-key="${escapeHtml(key)}">
            👍
          </button>
          <button class="button secondary ${isDisliked ? "active" : ""}" type="button" data-action="dislike" data-key="${escapeHtml(key)}">
            👎
          </button>
          <button class="button secondary" type="button" data-action="seen" data-key="${escapeHtml(key)}">
            👁️ Deja vu
          </button>
          <button class="button secondary" type="button" data-action="favorite" data-key="${escapeHtml(key)}" ${favoriteDisabled}>
            ${isFavorite ? "⭐ Favori ajoute" : `⭐ Favori (${favoriteRemaining})`}
          </button>
        </div>
      </div>
    </article>
  `;
}

function getRatingLabel(item) {
  const rating = Number(item.vote_average || item.rating || 0);
  if (!Number.isFinite(rating) || rating <= 0) return "";
  const count = formatVoteCount(item.vote_count || item.raw?.vote_count);
  return count ? `⭐ ${rating.toFixed(1)}/10 - ${count} votes` : `⭐ ${rating.toFixed(1)}/10`;
}

function getPlatformLabel(item) {
  const platform = String(item.platform || item.provider || item.watch_provider || "").trim();
  if (platform) return `${getPlatformVisual(platform)} Plateforme : ${platform}`;
  const fallbackPlatform = String(item.platform_hint || "").trim();
  if (fallbackPlatform) return `${getPlatformVisual(fallbackPlatform)} A verifier : ${fallbackPlatform}`;
  const selected = state.global.platforms.map((value) => findLabel(OPTIONS.platforms, value)).filter(Boolean);
  return selected.length ? `🎬 A verifier : ${selected.join(", ")}` : "";
}

function getPlatformVisual(platform) {
  const normalized = String(platform || "").toLowerCase();
  if (normalized.includes("netflix")) return "🔴";
  if (normalized.includes("prime")) return "🔵";
  if (normalized.includes("apple")) return "🍎";
  if (normalized.includes("disney")) return "🟡";
  if (normalized.includes("hbo") || normalized.includes("max")) return "🟣";
  return "🎬";
}

function formatVoteCount(value) {
  const count = Number(value || 0);
  if (!Number.isFinite(count) || count <= 0) return "";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${Math.round(count / 100) / 10}k`;
  return String(Math.round(count));
}

function getMatchScore(item) {
  const backendScore = Number(item.backend_rank_score || item.score || 0);
  const rating = Number(item.vote_average || 0);
  if (Number.isFinite(backendScore) && backendScore > 0) {
    return Math.max(8, Math.min(100, Math.round(backendScore)));
  }
  if (Number.isFinite(rating) && rating > 0) {
    return Math.max(72, Math.min(96, Math.round(rating * 10 + 8)));
  }
  return item.is_web_fallback ? 78 : 82;
}

function getMatchSummary(item, platformLabel, ratingLabel, matchScore) {
  const requestedGenres = [...new Set(state.users.map((user) => user.genre).filter(Boolean))]
    .map((genre) => findLabel(OPTIONS.genres, genre))
    .join(", ");
  const requestedType = [...new Set(state.users.map((user) => user.contentType).filter((value) => value && value !== "peu-importe"))]
    .map((type) => findLabel(OPTIONS.contentTypes, type))
    .join(", ");
  const parts = [];
  if (requestedGenres) parts.push(`genre demande: ${requestedGenres}`);
  if (requestedType) parts.push(`format: ${requestedType}`);
  if (platformLabel) parts.push(platformLabel.toLowerCase());
  if (ratingLabel) parts.push(ratingLabel.toLowerCase());
  if (item.discovery) parts.push("pepite recente ou moins evidente");
  if (item.is_web_fallback) parts.push("complete la selection quand le catalogue exact est trop court");
  if (item.is_close_match) parts.push("proposition proche, gardee pour atteindre 5 choix compatibles");
  if (!parts.length) parts.push("proposition equilibree pour la soiree");
  return `Match ${matchScore}%: ${parts.join(", ")}.`;
}

function getYear(value) {
  const text = String(value || "");
  return /^\d{4}/.test(text) ? text.slice(0, 4) : "";
}

function getItemYear(item) {
  const direct = Number(item.year);
  if (Number.isFinite(direct) && direct > 1900) return direct;
  const fromDate = Number(getYear(item.release_date || item.first_air_date || item.date));
  return Number.isFinite(fromDate) && fromDate > 1900 ? fromDate : "";
}

function isRecentItem(item) {
  const year = Number(getItemYear(item));
  if (!Number.isFinite(year)) return false;
  return new Date().getFullYear() - year <= 6;
}

function normalizePosterUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  if (text.startsWith("/")) return `https://image.tmdb.org/t/p/w500${text}`;
  return text;
}

function itemHasPoster(item) {
  return Boolean(item?.poster_url || item?.posterUri || item?.poster_path);
}

function getPosterLookupKey(item) {
  return normalizeTitle(`${item?.type || item?.media_type || ""}-${item?.title || item?.name || ""}-${getItemYear(item) || ""}`);
}

async function fetchPosterForItem(item) {
  if (!item || itemHasPoster(item)) return "";
  const title = String(item.title || item.name || "").trim();
  if (!title) return "";
  const key = getPosterLookupKey(item);
  if (posterLookupCache.has(key)) return posterLookupCache.get(key);

  const params = new URLSearchParams();
  params.set("title", title);
  params.set("type", String(item.type || item.media_type || ""));
  const year = getItemYear(item);
  if (year) params.set("year", String(year));
  params.set("language", "fr-FR");

  try {
    const response = await fetch(`/poster?${params.toString()}`);
    if (!response.ok) throw new Error("Poster lookup failed");
    const payload = await response.json();
    const poster = normalizePosterUrl(payload?.poster_url || payload?.poster_path || "");
    posterLookupCache.set(key, poster);
    return poster;
  } catch {
    posterLookupCache.set(key, "");
    return "";
  }
}

async function hydrateMissingPosters(items) {
  const targets = (Array.isArray(items) ? items : []).filter((item) => !itemHasPoster(item));
  if (!targets.length) return;
  await Promise.all(
    targets.map(async (item) => {
      const poster = await fetchPosterForItem(item);
      if (poster) item.poster_url = poster;
    })
  );
}

function getFilmKey(item) {
  return String(item.id || `${item.title || item.name}-${item.release_date || item.year || ""}`);
}

function getFilmMemoryKeys(item) {
  const key = getFilmKey(item);
  const titleKey = normalizeTitle(item?.title || item?.name || "");
  const type = String(item?.type || item?.media_type || "").toLowerCase();
  return uniqueStrings([
    key,
    key ? `id:${type}:${key}` : "",
    titleKey ? `title:${titleKey}` : "",
  ]);
}

function itemHasBlockedKey(item, keys) {
  const blocked = new Set(keys);
  return getFilmMemoryKeys(item).some((key) => blocked.has(key));
}

function aggregateQuery() {
  const genres = [...new Set(state.users.map((user) => user.genre).filter(Boolean))];
  const contentTypes = [...new Set(state.users.map((user) => user.contentType).filter((value) => value && value !== "peu-importe"))];
  const origins = [...new Set(state.users.map((user) => user.origin).filter((value) => value && value !== "peu-importe"))];
  const animationRequests = state.users.filter((user) => user.genre === "16").length;

  return {
    ageRestriction: state.global.ageRestriction,
    genres: genres.join(","),
    contentType: contentTypes.length === 1 ? contentTypes[0] : "",
    origin: origins.length === 1 && origins.length === state.users.length ? origins[0] : "",
    animationCap: animationRequests === 0 ? "0" : animationRequests === state.users.length ? "all" : "1",
  };
}

function getRequestedGenreIds() {
  return [
    ...new Set(
      state.users
        .map((user) => Number(user.genre))
        .filter((value) => Number.isFinite(value))
    ),
  ];
}

function getRequestedContentTypes() {
  return [
    ...new Set(
      state.users
        .map((user) => user.contentType)
        .filter((value) => value && value !== "peu-importe")
    ),
  ];
}

function getSelectedAgeBucket() {
  return parseAgeBucket(state.global.ageRestriction);
}

function getItemAgeBucket(item) {
  if (Number.isFinite(Number(item.age_bucket))) return Number(item.age_bucket);
  const raw = String(item.age_restriction || item.certification || "").toLowerCase();
  if (!raw || raw === "all" || raw.includes("tout public") || raw === "g" || raw === "pg") {
    return 0;
  }
  if (raw.includes("18") || raw.includes("nc-17")) return 18;
  if (raw.includes("16") || raw.includes("tv-ma")) return 16;
  if (raw.includes("13") || raw.includes("12") || raw.includes("pg-13") || raw.includes("tv-14")) {
    return 12;
  }
  return 0;
}

function itemMatchesPreferences(
  item,
  { allowGenreRelax = false, allowOriginRelax = false, allowTypeRelax = false } = {}
) {
  const requestedTypes = getRequestedContentTypes();
  const itemType = String(item.type || item.media_type || "").toLowerCase();
  if (!allowTypeRelax && requestedTypes.length && itemType && !requestedTypes.includes(itemType)) return false;

  const selectedAge = getSelectedAgeBucket();
  if (selectedAge !== null && getItemAgeBucket(item) > selectedAge) return false;

  const requestedGenres = getRequestedGenreIds();
  if (!allowGenreRelax && requestedGenres.length) {
    const itemGenres = getItemGenreIds(item);
    const hasMatch = requestedGenres.some((genre) => itemGenres.includes(genre));
    if (!hasMatch) return false;
  }

  const requestedOrigin = aggregateQuery().origin;
  if (!allowOriginRelax && requestedOrigin && !itemMatchesOrigin(item, requestedOrigin)) return false;

  return true;
}

function getItemGenreIds(item) {
  const ids = Array.isArray(item.genre_ids)
    ? item.genre_ids.map((value) => Number(value)).filter((value) => Number.isFinite(value))
    : [];
  if (ids.length) return ids;

  const text = normalizeTitle(`${item.genre || ""} ${(item.genres || []).join(" ")}`);
  return OPTIONS.genres
    .filter((genre) => text.includes(normalizeTitle(genre.label)))
    .map((genre) => Number(genre.value))
    .filter((value) => Number.isFinite(value));
}

function itemMatchesOrigin(item, origin) {
  const itemOrigin = String(item.origin || "").toLowerCase();
  if (itemOrigin === origin) return true;

  const countryCodes = getItemCountryCodes(item);
  if (countryCodes.length) {
    if (origin === "us") return countryCodes.includes("US");
    if (origin === "europe") {
      return countryCodes.some((country) =>
        [
          "FR",
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
          "GB",
          "UK",
          "PT",
          "AT",
          "CH",
        ].includes(country)
      );
    }
    if (origin === "asie") {
      return ["KR", "JP", "CN", "HK", "TW", "IN", "TH", "ID", "PH", "VN", "MY", "SG"].some(
        (country) => countryCodes.includes(country)
      );
    }
  }

  const language = String(item.original_language || "").toLowerCase();
  if (origin === "us") return language === "en" || itemOrigin === "us";
  if (origin === "europe") {
    return ["fr", "de", "it", "es", "sv", "da", "no", "fi", "nl", "pl", "pt"].includes(language);
  }
  if (origin === "asie") return ["ko", "ja", "zh", "hi", "th", "id", "vi"].includes(language);
  return false;
}

function getItemCountryCodes(item) {
  const values = [
    ...(Array.isArray(item?.origin_country) ? item.origin_country : [item?.origin_country]),
    ...(Array.isArray(item?.country) ? item.country : [item?.country]),
  ];
  return values
    .flatMap((value) => String(value || "").split(/[|,\s/]+/))
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
}

function buildFilmsUrl(platform, overrides = {}, page = 1) {
  const params = new URLSearchParams();
  const query = {
    ...aggregateQuery(),
    ...overrides,
  };
  params.set("page", String(page));
  params.set("language", "fr-FR");
  if (platform) params.set("platform", platform);
  Object.entries(query).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return `/films?${params.toString()}`;
}

function tagPayloadWithPlatform(payload, platform) {
  const platformLabel = platform ? findLabel(OPTIONS.platforms, platform) : "";
  if (!platformLabel) return payload;

  const tagItem = (item) => ({
    ...item,
    platform: item?.platform || platformLabel,
    platform_hint: item?.platform_hint || platformLabel,
  });

  if (Array.isArray(payload)) return payload.map(tagItem);
  if (Array.isArray(payload?.value)) {
    return {
      ...payload,
      value: payload.value.map(tagItem),
    };
  }
  return payload;
}

async function fetchRecommendations() {
  state.loading = true;
  state.error = "";
  state.notice = "";
  state.displayLimit = RESULT_LIMIT;
  state.skippedKeys = [];
  resetUsageLimits();
  renderLoading();

  try {
    const platforms = state.global.platforms.length ? state.global.platforms : [""];
    const responses = await fetchRecommendationStages(platforms);
    const merged = responses.flatMap((payload) => {
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.value)) {
        if (payload.notice) state.notice = payload.notice;
        return payload.value;
      }
      return [];
    });
    const exactBackendItems = uniqueFilms(merged.filter((item) => itemMatchesPreferences(item)));
    const fallbackItems = exactBackendItems.length < RESULT_POOL_TARGET ? buildWebFallbackItems() : [];
    state.candidatePool = uniqueFilms([...exactBackendItems, ...fallbackItems]);
    state.results = pickVisibleResults(state.candidatePool);
    const usedSeenRescue = !state.results.length && state.candidatePool.length > 0;
    if (usedSeenRescue) {
      state.results = pickVisibleResults(state.candidatePool, RESULT_LIMIT, [], { ignoreSeen: true });
    }
    await hydrateMissingPosters(state.results);
    const closeMatches = state.results.filter((item) => item.is_close_match).length;
    if (!state.results.length) {
      state.notice =
        "OMQ n'a pas encore assez de stock compatible pour ce combo. Retire un seul filtre pour ouvrir la selection.";
    } else if (usedSeenRescue) {
      state.notice =
        "OMQ a fait le tour des titres non vus avec ces filtres. Voici les meilleurs choix du stock, meme si certains ont deja ete marques vus.";
    } else if (state.results.some((item) => item.soft_horror_fallback)) {
      state.notice = userRequestsAnimation()
        ? "Horreur asiatique + tout public est tres rare : OMQ propose donc des frissons asiatiques accessibles, plus fantastiques que gores."
        : "Horreur asiatique + tout public est tres rare : OMQ propose donc des frissons asiatiques accessibles en live action, sans dessin anime.";
    } else if (state.results.length < RESULT_LIMIT) {
      state.notice =
        `OMQ a trouve ${state.results.length} proposition${state.results.length > 1 ? "s" : ""} compatible${state.results.length > 1 ? "s" : ""}. Elargis un filtre pour plus de choix.`;
    } else if (state.results.length > exactBackendItems.length || closeMatches) {
      state.notice =
        "OMQ a elargi legerement la selection pour eviter l'ecran vide, tout en gardant les criteres principaux.";
    } else {
      state.notice = "";
    }
  } catch (error) {
    state.error = error.message || "Impossible de charger la selection.";
    state.results = [];
  } finally {
    state.loading = false;
    renderResults();
    if (state.error) {
      appRoot.querySelector(".results").insertAdjacentHTML("beforebegin", `<div class="notice">${escapeHtml(state.error)}</div>`);
    }
  }
}

async function fetchRecommendationStages(platforms) {
  const pages = Array.from({ length: 8 }, (_, index) => index + 1);
  const targetCount = RESULT_POOL_TARGET + Math.min(state.seenKeys.length, 12);
  const stages = [
    {},
    { origin: "" },
    { origin: "", genres: aggregateQuery().genres },
    { origin: "", genres: "", contentType: aggregateQuery().contentType },
  ];
  const payloads = [];

  for (const stage of stages) {
    const responses = await Promise.all(
      platforms.flatMap((platform) =>
        pages.map(async (page) => {
          const response = await fetch(buildFilmsUrl(platform, stage, page));
          if (!response.ok) throw new Error("Backend indisponible");
          return tagPayloadWithPlatform(await response.json(), platform);
        })
      )
    );
    payloads.push(...responses);
    const candidateCount = uniqueFilms(
      payloads.flatMap(extractFilmsFromPayload).filter((item) => itemMatchesPreferences(item))
    ).length;
    if (candidateCount >= targetCount) break;
  }

  return payloads;
}

function extractFilmsFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.value)) return payload.value;
  return [];
}

function userRequestsAnimation() {
  return state.users.some((user) => String(user?.genre || "") === "16");
}

function itemLooksAnimatedForWeb(item) {
  const genreIds = Array.isArray(item?.genre_ids) ? item.genre_ids.map(Number) : [];
  const genreText = normalizeTitle(
    `${item?.genre || ""} ${Array.isArray(item?.genres) ? item.genres.join(" ") : ""}`
  );
  return Boolean(
    item?.is_animation ||
      item?.animated ||
      genreIds.includes(16) ||
      genreText.includes("animation") ||
      genreText.includes("dessin") ||
      genreText.includes("anime") ||
      genreText.includes("manga")
  );
}

function itemAllowedByAnimationChoice(item) {
  return userRequestsAnimation() || !itemLooksAnimatedForWeb(item);
}

function buildWebFallbackItems() {
  const platformHint = state.global.platforms
    .map((value) => findLabel(OPTIONS.platforms, value))
    .filter(Boolean)
    .join(", ");

  const allowedFallbacks = WEB_FALLBACK_ITEMS.filter(itemAllowedByAnimationChoice);
  const strict = allowedFallbacks.filter((item) => itemMatchesPreferences(item));
  const rescueTiers = [
    { allowGenreRelax: true },
    { allowOriginRelax: true },
    { allowGenreRelax: true, allowOriginRelax: true },
    { allowGenreRelax: true, allowOriginRelax: true, allowTypeRelax: true },
  ];
  const close = [];

  for (const tier of rescueTiers) {
    if (strict.length + close.length >= RESULT_POOL_TARGET) break;
    const tierItems = allowedFallbacks.filter((item) => {
      if (strict.includes(item) || close.includes(item)) return false;
      return itemMatchesPreferences(item, tier);
    });
    close.push(...tierItems);
  }

  return [...strict, ...close].map((item) => ({
    ...item,
    is_web_fallback: true,
    is_close_match: !strict.includes(item),
    platform_hint: platformHint,
  }));
}

function uniqueUserValues(key, { ignoreFlexible = false } = {}) {
  const values = state.users
    .map((user) => String(user?.[key] || "").trim())
    .filter(Boolean)
    .filter((value) => !ignoreFlexible || value !== "peu-importe");
  return [...new Set(values)];
}

function singleUserValue(key, options = {}) {
  const values = uniqueUserValues(key, options);
  return values.length === 1 ? values[0] : "";
}

function buildQuizPayloadForEngine() {
  const platforms = state.global.platforms
    .map((value) => findLabel(OPTIONS.platforms, value))
    .filter(Boolean);

  return {
    users: state.users.map((user, index) => ({
      firstName: user.firstName?.trim() || `participant ${index + 1}`,
      genre: user.genre || "",
      contentType: user.contentType || "",
      origin: user.origin || "",
    })),
    globalAnswers: {
      ageRestriction: state.global.ageRestriction || "",
      platform: "",
      platforms,
    },
    aggregatedAnswers: {
      genre: singleUserValue("genre"),
      contentType: singleUserValue("contentType", { ignoreFlexible: true }),
      origin: singleUserValue("origin", { ignoreFlexible: true }),
      ageRestriction: state.global.ageRestriction || "",
      platform: "",
      platforms,
    },
  };
}

function prepareFilmForEngine(item) {
  const title = item.title || item.name || "Titre inconnu";
  const year = getItemYear(item);
  const genreText = item.genre || (Array.isArray(item.genres) ? item.genres.join(", ") : "");
  const poster = item.poster_url || item.posterUri || item.poster_path || "";

  return {
    ...item,
    id: item.id ?? getFilmKey(item),
    title,
    year,
    release_date: item.release_date || item.first_air_date || (year ? `${year}-01-01` : ""),
    type: String(item.type || item.media_type || "").toLowerCase() || "",
    genre: genreText,
    genres: Array.isArray(item.genres) ? item.genres : genreText ? genreText.split(",").map((value) => value.trim()) : [],
    overview: item.overview || item.summary || item.description || "",
    poster_url: normalizePosterUrl(poster),
    poster_path: item.poster_path || "",
    posterUri: normalizePosterUrl(poster),
    vote_average: Number(item.vote_average || item.rating || 0),
    vote_count: Number(item.vote_count || 0),
    popularity: Number(item.popularity || item.backend_rank_score || item.score || 0),
    original_language: item.original_language || item.language || "",
    origin_country: item.origin_country || item.country || "",
    platform: item.platform || item.provider || item.watch_provider || item.platform_hint || "",
    age_restriction: item.age_restriction || item.certification || ageBucketToRestriction(item.age_bucket),
    raw: item.raw || item,
  };
}

function ageBucketToRestriction(value) {
  const bucket = Number(value);
  if (!Number.isFinite(bucket)) return "";
  if (bucket <= 0) return "all";
  return String(bucket);
}

function normalizeEngineResult(item, sourceItems) {
  const raw = item?.raw || item?.film || {};
  const rawKey = safeEngineFilmKey(raw);
  const source =
    sourceItems.find((candidate) => safeEngineFilmKey(candidate) === rawKey) ||
    sourceItems.find((candidate) => normalizeTitle(candidate.title || candidate.name) === normalizeTitle(item?.title)) ||
    raw;

  return {
    ...source,
    title: item?.title || source.title || source.name || "Titre inconnu",
    year: item?.year || source.year || getItemYear(source),
    genre: item?.genre || source.genre || (Array.isArray(source.genres) ? source.genres.join(", ") : ""),
    overview: item?.summary || source.overview || source.summary || "Resume indisponible pour ce titre.",
    summary: item?.summary || source.summary || source.overview || "Resume indisponible pour ce titre.",
    why: item?.why || source.why || "",
    score: Number(item?.score || source.score || source.backend_rank_score || 0),
    backend_rank_score: Number(item?.score || source.backend_rank_score || source.score || 0),
    posterUri: item?.posterUri || source.posterUri || normalizePosterUrl(source.poster_url || source.poster_path || ""),
    poster_url: item?.posterUri || source.poster_url || normalizePosterUrl(source.poster_path || ""),
    raw: source,
  };
}

function safeEngineFilmKey(item) {
  try {
    return String(engineFilmKey(item));
  } catch {
    return getFilmKey(item);
  }
}

function parseAgeBucket(value) {
  if (value === "all") return 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function pickVisibleResults(pool, limit = state.displayLimit, extraBlockedKeys = [], options = {}) {
  const blockedKeys = options.ignoreSeen
    ? uniqueStrings(extraBlockedKeys)
    : uniqueStrings([...state.seenKeys, ...state.skippedKeys, ...extraBlockedKeys]);
  const visiblePool = uniqueFilms(pool)
    .filter((item) => !itemHasBlockedKey(item, blockedKeys))
    .filter(itemAllowedByAnimationChoice)
    .map(prepareFilmForEngine);

  const engineResults = buildRecommendations({
    films: visiblePool,
    quizPayload: buildQuizPayloadForEngine(),
    answers: buildQuizPayloadForEngine().aggregatedAnswers,
    max: limit,
    randomize: state.skippedKeys.length > 0,
  });

  if (engineResults.length) {
    return engineResults.map((item) => normalizeEngineResult(item, visiblePool)).slice(0, limit);
  }

  return visiblePool
    .sort((left, right) => candidateDiscoveryScore(right) - candidateDiscoveryScore(left))
    .slice(0, limit);
}

function pickSingleReplacement(excludedResults = []) {
  const extraBlockedKeys = excludedResults.flatMap((item) => getFilmMemoryKeys(item));
  return pickVisibleResults(state.candidatePool, 1, extraBlockedKeys)[0] || null;
}

function candidateDiscoveryScore(item) {
  let score = item.is_close_match ? 8 : 34;
  const requestedGenres = getRequestedGenreIds();
  const itemGenres = getItemGenreIds(item);
  const genreMatches = requestedGenres.filter((genre) => itemGenres.includes(genre)).length;
  score += genreMatches * 18;

  const requestedTypes = getRequestedContentTypes();
  const itemType = String(item.type || item.media_type || "").toLowerCase();
  if (!requestedTypes.length || requestedTypes.includes(itemType)) score += 12;

  const year = Number(getItemYear(item));
  if (Number.isFinite(year)) {
    const age = Math.max(0, new Date().getFullYear() - year);
    if (age <= 1) score += 28;
    else if (age <= 3) score += 24;
    else if (age <= 6) score += 18;
    else if (age <= 10) score += 10;
    else if (age <= 15) score += 3;
    else score -= 12;
    if (age >= 25) score -= 12;
  }

  const rating = Number(item.vote_average || item.rating || 0);
  if (Number.isFinite(rating) && rating > 0) score += Math.min(18, rating * 2);

  if (item.discovery) score += 22;
  if (item.is_web_fallback && !item.discovery) score -= 5;

  const backendScore = Number(item.backend_rank_score || item.score || 0);
  if (Number.isFinite(backendScore) && backendScore > 0) score += Math.min(12, backendScore / 10);

  return score;
}

function uniqueFilms(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = getFilmKey(item);
    const titleKey = normalizeTitle(item.title || item.name || "");
    const uniqueKey = titleKey || key;
    if (seen.has(key) || seen.has(uniqueKey)) return false;
    seen.add(key);
    seen.add(uniqueKey);
    return true;
  });
}

function normalizeTitle(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function markSeen(key) {
  if (!key) return;
  const itemIndex = state.results.findIndex((candidate) => getFilmMemoryKeys(candidate).includes(key) || getFilmKey(candidate) === key);
  const item = itemIndex >= 0 ? state.results[itemIndex] : null;
  const keys = item ? getFilmMemoryKeys(item) : [key];
  state.seenKeys = uniqueStrings([...state.seenKeys, ...keys]);
  state.skippedKeys = uniqueStrings([...state.skippedKeys, ...keys]);
  saveSeenKeys();

  const keptResults = state.results.filter((_, index) => index !== itemIndex);
  const replacement = pickSingleReplacement(keptResults);

  if (itemIndex >= 0 && replacement) {
    state.results = state.results.map((candidate, index) => (index === itemIndex ? replacement : candidate));
    await hydrateMissingPosters([replacement]);
    state.notice = "Titre retire. Seule cette proposition a ete remplacee.";
  } else if (itemIndex >= 0) {
    state.results = keptResults;
    state.notice = "Titre retire. OMQ n'a pas trouve de remplacant compatible dans ce stock.";
  } else {
    state.results = pickVisibleResults(state.candidatePool);
    await hydrateMissingPosters(state.results);
    state.notice = state.results.length
      ? "Titre retire. OMQ te propose un autre match compatible."
      : "Tout ce stock est marque comme deja vu. Relance le quiz pour repartir proprement.";
  }
  renderResults();
}

async function rerollSelection() {
  if (getSurpriseRemaining() <= 0) {
    state.notice = "Tu as utilise tes 3 surprises pour ce quiz. Refais le quiz pour repartir a zero.";
    renderResults();
    return;
  }

  if (!state.candidatePool.length) {
    await fetchRecommendations();
    return;
  }

  state.surpriseUses += 1;
  const currentKeys = state.results.flatMap((item) => getFilmMemoryKeys(item));
  state.skippedKeys = uniqueStrings([...state.skippedKeys, ...currentKeys]);
  state.results = pickVisibleResults(state.candidatePool);
  await hydrateMissingPosters(state.results);

  if (!state.results.length) {
    state.skippedKeys = [];
    state.results = pickVisibleResults(state.candidatePool);
    await hydrateMissingPosters(state.results);
    state.notice = "OMQ a fait le tour des matchs disponibles. Voici a nouveau les meilleurs choix.";
  } else {
    const remaining = getSurpriseRemaining();
    state.notice = remaining
      ? `OMQ te propose 5 autres matchs compatibles. Il te reste ${remaining} surprise${remaining > 1 ? "s" : ""}.`
      : "Derniere surprise utilisee pour ce quiz.";
  }

  renderResults();
}

async function clearSeenKeys() {
  state.seenKeys = [];
  state.skippedKeys = [];
  saveSeenKeys();
  state.results = pickVisibleResults(state.candidatePool);
  await hydrateMissingPosters(state.results);
  state.notice = "Les titres marques comme deja vus ont ete reinitialises.";
  renderResults();
}

function toggleFavorite(key) {
  const item = state.results.find((candidate) => getFilmKey(candidate) === key);
  if (!item) return;
  const exists = state.favorites.some((favorite) => favorite.key === key);
  if (!exists && getFavoriteAddsRemaining() <= 0) {
    state.notice = "Tu as deja ajoute 2 favoris pour ce quiz. Refais le quiz pour repartir a zero.";
    renderResults();
    return;
  }

  if (exists) {
    state.favorites = state.favorites.filter((favorite) => favorite.key !== key);
    state.notice = "Favori retire.";
  } else {
    state.favoriteAdds += 1;
    state.favorites = [{ key, title: item.title || item.name || "Titre inconnu" }, ...state.favorites];
    const remaining = getFavoriteAddsRemaining();
    state.notice = remaining
      ? `Favori ajoute. Il te reste ${remaining} ajout favori pour ce quiz.`
      : "Deux favoris ajoutes pour ce quiz.";
  }
  saveFavorites();
  renderResults();
}

function toggleReaction(key, type) {
  if (!key) return;
  const targetKey = String(key);
  const liked = state.likedKeys.includes(targetKey);
  const disliked = state.dislikedKeys.includes(targetKey);

  if (type === "like") {
    state.likedKeys = liked
      ? state.likedKeys.filter((item) => item !== targetKey)
      : uniqueStrings([targetKey, ...state.likedKeys]);
    state.dislikedKeys = state.dislikedKeys.filter((item) => item !== targetKey);
  }

  if (type === "dislike") {
    state.dislikedKeys = disliked
      ? state.dislikedKeys.filter((item) => item !== targetKey)
      : uniqueStrings([targetKey, ...state.dislikedKeys]);
    state.likedKeys = state.likedKeys.filter((item) => item !== targetKey);
  }

  saveStoredList(LIKED_STORAGE_KEY, state.likedKeys);
  saveStoredList(DISLIKED_STORAGE_KEY, state.dislikedKeys);
  renderResults();
}

function render() {
  if (state.loading) {
    renderLoading();
    return;
  }

  if (state.results.length || state.error) {
    renderResults();
    return;
  }

  const steps = getSteps();
  const step = getCurrentStep();
  const progress = Math.round((state.stepIndex / Math.max(1, steps.length - 1)) * 100);
  const body =
    step.type === "participants"
      ? renderParticipants()
      : step.type === "platforms"
      ? renderPlatforms()
      : step.type === "age"
      ? renderAge()
      : step.type === "summary"
      ? renderSummary()
      : renderUserStep(step);

  appRoot.style.setProperty("--progress", `${progress}%`);
  appRoot.innerHTML = `
    <div class="panel-head">
      <span class="step-count">Etape ${Math.min(state.stepIndex + 1, steps.length)}/${steps.length}</span>
      <span class="step-count">${state.participantCount} participant${state.participantCount > 1 ? "s" : ""}</span>
    </div>
    <div class="progress"><span></span></div>
    <div class="panel-body">
      ${body}
      <div class="actions">
        <button class="button ghost" type="button" data-action="back" ${state.stepIndex === 0 ? "disabled" : ""}>Retour</button>
        <button class="button primary" type="button" data-action="next" ${canContinue(step) ? "" : "disabled"}>
          ${step.type === "summary" ? "Lancer OMQ" : "Continuer"}
        </button>
      </div>
    </div>
  `;
}

appRoot.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  const value = target.dataset.value;
  const step = getCurrentStep();

  if (action === "participant") setParticipantCount(value);
  if (action === "platform") togglePlatform(value);
  if (action === "age") {
    state.global.ageRestriction = value;
    render();
  }
  if (["contentType", "genre", "origin"].includes(action) && step.userIndex !== undefined) {
    updateUser(step.userIndex, action, value);
  }
  if (action === "back") goBack();
  if (action === "next") goNext();
  if (action === "restart") restart();
  if (action === "again") rerollSelection();
  if (action === "like") toggleReaction(target.dataset.key, "like");
  if (action === "dislike") toggleReaction(target.dataset.key, "dislike");
  if (action === "favorite") toggleFavorite(target.dataset.key);
  if (action === "seen") markSeen(target.dataset.key);
  if (action === "clearSeen") clearSeenKeys();
});

appRoot.addEventListener("input", (event) => {
  const target = event.target;
  if (!target.matches("[data-input]")) return;
  updateUser(Number(target.dataset.user), target.dataset.input, target.value, false);
  const nextButton = appRoot.querySelector('[data-action="next"]');
  if (nextButton) {
    nextButton.disabled = !canContinue(getCurrentStep());
  }
});

render();
