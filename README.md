# Ce soir on mate quoi ?

Application Expo/React Native pour recommander un film ou une serie selon le groupe, l'humeur et les plateformes disponibles.

## Ce qui est pret

- app mobile Expo pour Android et iOS
- backend Node minimal securise dans `backend/server.js`
- configuration Expo dynamique via `app.config.js`
- profils EAS `preview` et `production`
- mode mock pour tester sans cle IA

## 1. Backend securise

Le mobile ne doit plus appeler directement un fournisseur IA avec une cle exposee.

Le backend fourni ici expose :

- `GET /health`
- `POST /recommendations`

Payload attendu :

```json
{
  "prompt": "..."
}
```

Reponse :

```json
{
  "results": [
    {
      "title": "Dune",
      "year": 2021,
      "type": "film",
      "genres": ["SF", "Aventure"],
      "synopsis": "Deux phrases courtes.",
      "rating": 4.5,
      "platforms": ["Netflix"],
      "why": "Pourquoi ce choix colle au groupe.",
      "match": 92,
      "where": "Disponible sur Netflix"
    }
  ]
}
```

## 2. Configuration Expo / EAS

`app.config.js` lit maintenant :

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_EAS_PROJECT_ID`

Tu peux garder `app.json` comme base visuelle, et injecter les vraies valeurs via `.env`.

## 3. Build Android

Profils disponibles :

- `preview` : APK interne pour test
- `production` : AAB pour Google Play

Commandes :

```bash
npm.cmd run start:server
npm.cmd run start:app
npm.cmd run build:preview
npm.cmd run build:android
```

## Mise en route locale

1. Cree ton fichier `.env` depuis `.env.example`
2. Pour un test sans IA reelle, tu peux temporairement mettre `MOCK_RECOMMENDATIONS=true`
3. Lance le backend :

```bash
npm.cmd run start:server
```

4. Lance l'app Expo :

```bash
npm.cmd run start:app
```

## Passage en vrai backend IA

Quand tu es pret :

- mets `MOCK_RECOMMENDATIONS=false`
- renseigne `ANTHROPIC_API_KEY`
- garde `EXPO_PUBLIC_API_BASE_URL` vers ton backend deploye

## Build Google Play

Avant de lancer le build store :

- `EXPO_PUBLIC_API_BASE_URL` doit pointer vers ton backend public
- `MOCK_RECOMMENDATIONS` doit etre a `false`
- `ANTHROPIC_API_KEY` doit etre definie sur le backend, pas dans l'app publique

Commande :

```bash
npm.cmd run build:android
```

Le resultat sera un `.aab` pour Google Play.

## Icônes actuelles

L'application utilise maintenant le visuel `assets/playstore-icon-poster-512.png` comme base d'icone pour les tests et les builds suivants.

## Etape EAS a faire une fois

```bash
npx eas login
npx eas init
```

Puis recopie le `projectId` obtenu dans `.env` :

```bash
EXPO_PUBLIC_EAS_PROJECT_ID=ton-vrai-project-id
```

## Publication conseillee

1. Sortir un APK `preview` pour test
2. Corriger les derniers details produit
3. Generer un AAB `production`
4. Publier sur Google Play
5. Ensuite ouvrir iOS avec le meme backend

## Limites restantes

- la publication store finale demande encore un compte Expo connecte
- Google Play et App Store demandent captures, fiche store et politique de confidentialite
- pour un build cloud reel, il faudra remplacer les placeholders par les vraies valeurs
