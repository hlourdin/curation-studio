# 🎧 Mélomanie : Partage de Découvertes Musicales

Ce projet vous permet de générer automatiquement un site web statique premium pour présenter vos sélections semestrielles de découvertes musicales à partir de vos playlists Spotify.

L'interface est moderne (style Spotify sombre, glassmorphism, animations fluides) et intègre un **mini-lecteur audio** pour écouter des extraits de 30 secondes directement sur la page, ainsi qu'un espace pour afficher vos **commentaires personnalisés** sur chaque morceau.

---

## 🚀 Démarrage Rapide

### 1. Installation
Installez les dépendances du projet :
```bash
npm install
```

### 2. Aperçu du site (Mode Démo)
Si vous n'avez pas encore de clés d'API Spotify, vous pouvez tester le site immédiatement avec des données de démonstration :
```bash
# Génère les données de démo
npm run fetch

# Lance le serveur de développement local
npm run dev
```
Ouvrez ensuite [http://localhost:5173](http://localhost:5173) pour voir le résultat.

---

## 🔑 Configuration de l'API Spotify (Gratuit)

Pour charger vos propres playlists, vous devez configurer vos identifiants Spotify :

1. Allez sur le **[Spotify Developer Dashboard](https://developer.spotify.com/dashboard)** et connectez-vous avec votre compte Spotify.
2. Cliquez sur **Create app**.
3. Remplissez les informations de base :
   - *App name* : Mélomanie
   - *App description* : Site de partage de playlists.
   - *Redirect URI* : `http://localhost:5173` (non utilisé par notre script, mais obligatoire).
4. Cochez la case pour accepter les conditions d'utilisation et cliquez sur **Save**.
5. Sur la page de votre application, cliquez sur **Settings** pour afficher vos identifiants.
6. Copiez le **Client ID** et le **Client Secret**.
7. Créez un fichier nommé `.env` à la racine de ce projet et collez-y vos identifiants :
   ```env
   SPOTIFY_CLIENT_ID=votre_client_id_ici
   SPOTIFY_CLIENT_SECRET=votre_client_secret_ici
   ```

---

## 🔄 Flux d'Utilisation : Ajouter une nouvelle playlist

### Étape 1 : Récupérer les morceaux de la playlist
Pour importer une nouvelle playlist, copiez son lien de partage depuis Spotify (ex: `https://open.spotify.com/playlist/37i9dQZF1DXcBWIGgo3IvF?si=...`) et lancez :
```bash
npm run fetch <URL_OU_ID_DE_LA_PLAYLIST>
```
Le script va :
1. Contacter Spotify pour récupérer le titre, la description, les pochettes d'albums et les extraits audio de tous les morceaux.
2. Enregistrer la playlist dans le fichier de configuration `src/data/config.json`.
3. Écrire les morceaux dans le fichier `src/data/playlists-data.json`.

*Note : Si vous lancez simplement `npm run fetch` sans argument, le script mettra à jour toutes les playlists actuellement configurées.*

### Étape 2 : Ajouter vos commentaires
Ouvrez le fichier `src/data/playlists-data.json`. Pour chaque morceau, vous trouverez une propriété `"comment"` vide :
```json
{
  "id": "track_id_1",
  "title": "Nom de la chanson",
  "artist": "Nom de l'artiste",
  "album": "Nom de l'album",
  "image": "https://...",
  "url": "https://...",
  "previewUrl": "https://...",
  "comment": "Écrivez vos quelques mots ici !"
}
```
Ajoutez simplement vos textes sous ce champ.

> [!TIP]
> **Fusion intelligente** : Si vous relancez le script `npm run fetch` plus tard (par exemple si vous rajoutez des morceaux à votre playlist sur Spotify), **le script conservera tous vos commentaires déjà saisis**. Vous ne perdrez aucun mot !

### Étape 3 : Visualiser et valider
Lancez le serveur local pour vérifier le rendu de votre site :
```bash
npm run dev
```

---

## 🌐 Déploiement

Le site étant entièrement statique (généré dans le dossier `/dist`), vous pouvez l'héberger gratuitement et très facilement :

### Option A : Déploiement sur GitHub Pages (Automatisé)
1. Créez un dépôt sur GitHub et poussez votre code.
2. Allez dans les **Settings** de votre dépôt GitHub > **Pages**.
3. Dans la section **Build and deployment**, sous *Source*, sélectionnez **GitHub Actions**.
4. Vous pouvez utiliser une action standard pour déployer un projet Vite statique.

### Option B : Déploiement par glisser-déposer sur Netlify (Sans Git)
1. Générez les fichiers de production :
   ```bash
   npm run build
   ```
2. Connectez-vous sur **[Netlify](https://www.netlify.com/)**.
3. Allez dans la section **Sites** et glissez-déposez le dossier `dist/` nouvellement créé.
4. Votre site est en ligne en 10 secondes !
