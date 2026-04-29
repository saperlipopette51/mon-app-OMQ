# Deployer le backend OMQ sur Render

## Configuration Render

- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/health`

## Variables d'environnement a ajouter dans Render

```env
NODE_ENV=production
TMDB_API_KEY=ta_cle_tmdb
TMDB_BEARER_TOKEN=ton_token_bearer_tmdb
FILMS_CACHE_TTL_MS=600000
FILMS_CACHE_MAX_ENTRIES=150
```

## Tests apres deployement

Remplace `TON_URL_RENDER` par l'URL donnee par Render.

```text
https://TON_URL_RENDER.onrender.com/test
https://TON_URL_RENDER.onrender.com/health
https://TON_URL_RENDER.onrender.com/films?language=fr-FR&page=1&genres=35&contentType=film
```

Resultat attendu:

- `/test` repond `OK`
- `/health` repond `{ "status": "ok" }`
- `/films` renvoie une liste de films

## Brancher l'APK sur Render

Dans `frontend/.env`, remplace:

```env
PROD_API_URL=https://TON_URL_RENDER.onrender.com
EXPO_PUBLIC_PROD_API_URL=https://TON_URL_RENDER.onrender.com
```

Puis regenere l'APK ou l'AAB.
