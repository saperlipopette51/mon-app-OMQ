# Ce soir on mate quoi ?

Application Expo / React Native de recommandations de films et series.

Elle permet de :

- repondre a un quiz multi-utilisateur
- trouver 5 recommandations de films ou series
- filtrer les resultats par genre, age, type, origine et plateformes
- utiliser un backend Node.js securise pour appeler TMDB

## Structure

- `frontend/` : application mobile Expo
- `backend/` : API Node.js / Express
- `render.yaml` : configuration de deploiement Render

## Backend local

```bash
cd backend
npm install
npm start
```

Tests :

```text
http://localhost:3000/test
http://localhost:3000/health
http://localhost:3000/films
```

## Frontend local

```bash
cd frontend
npm install
npx expo start
```

## Publication

Pour publier l'application, le backend doit etre disponible via une URL publique HTTPS.

Dans `frontend/.env`, renseigner :

```env
PROD_API_URL=https://ton-backend-public
EXPO_PUBLIC_PROD_API_URL=https://ton-backend-public
```

Les cles TMDB doivent rester uniquement cote backend.
