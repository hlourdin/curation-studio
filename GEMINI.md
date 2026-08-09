# Le Son de la Curiosité — Documentation Technique & Guide Projet (`GEMINI.md`)

Ce document centralise l'architecture, les workflows, les règles de design et les procédures de déploiement du projet **Curation Studio** (`curation-studio`). Il permet à tout agent IA ou développeur de reprendre immédiatement le travail depuis **agy CLI** ou **Antigravity IDE**.

---

## 🌐 1. Identité du Projet & Hébergement

- **Nom du Projet :** Le Son de la Curiosité (AUDIO CURATION).
- **Nom du Répertoire / Paquet :** `curation-studio`.
- **Site Public Vercel :** [https://lacurio.site](https://lacurio.site)
- **Dépôt GitHub Distant :** [https://github.com/hlourdin/curation-studio](https://github.com/hlourdin/curation-studio)
- **Stack Technologique :**
  - **Core :** HTML5, Vanilla JavaScript (ES Modules), Vanilla CSS.
  - **Bundler / Dev Server :** Vite 5 (`vite.config.js`) en HTTPS local (`https://127.0.0.1:5173/`).
  - **Générateur Statique (SSG) :** Node.js script (`scripts/export-site.js`).
  - **Stockage Données :** `window.localStorage` + `src/data/playlists-data.json` (Aucune base de données externe requise).

---

## 📁 2. Structure du Codebase

```
curation-studio/
├── GEMINI.md                        # Ce guide référentiel
├── index.html                       # Application Studio Web (UI principale)
├── vercel.json                      # Configuration de déploiement Vercel (output: "site")
├── vite.config.js                   # Middleware API local POST /api/export-site & HTTPS
├── package.json                     # Scripts & dépendances (vite, dotenv, jszip)
├── .env                             # Identifiants Spotify (SPOTIFY_CLIENT_ID / SECRET)
│
├── src/                             # Code Source du Studio
│   ├── main.js                      # Logique Studio, authentification, Vues, réorganisation
│   ├── style.css                    # Système de design (Tokens, Double-Bezel, 0px radius)
│   ├── data/
│   │   └── playlists-data.json      # Base locale des playlists et commentaires
│   └── utils/
│       ├── spotify.js               # OAuth PKCE Spotify (Redirect URI: https://127.0.0.1:5173)
│       └── exporter.js              # Export ZIP de secours côté client
│
├── scripts/
│   └── export-site.js               # Script SSG Node.js de génération du site Vercel
│
└── site/                            # RÉPERTOIRE EXPORTÉ POUR VERCEL (publié sur lacurio.site)
    ├── index.html                   # Page d'accueil catalogue globale du site public
    ├── playlists/                   # Pages HTML statiques individuelles
    │   ├── curious-xxvi-s-s.html
    │   └── ...
    └── assets/
        ├── style.css                # Styles unifiés du site public
        └── player.js                # Moteur audio unifié du lecteur public
```

---

## 🧪 2 bis. Direction alternative « Lookbook » (branche `new-design`)

> Cette section ne s'applique qu'à la branche `new-design`. Sur `master`, la charte de la section 3 reste seule en vigueur.

Le **site public uniquement** (`site/`) y explore une direction éditoriale de type catalogue de collection saisonnière. Le Studio (`index.html`, `src/style.css`, `src/main.js`) est inchangé.

**Lecture du brief :** les playlists sont nommées comme des collections de mode (`XXV F/W`, `XXVI S/S`). Le site est donc traité en lookbook imprimé plutôt qu'en clone de Spotify.

| | `master` | `new-design` |
|---|---|---|
| Fond par défaut | Sombre imposé | Clair (papier), thème système respecté, bascule conservée |
| Titrage | Syne | Playfair Display (didone) |
| Texte courant | Plus Jakarta Sans | Archivo |
| Métadonnées | JetBrains Mono | JetBrains Mono (conservé) |
| Accent | Émeraude Spotify | Vermillon d'imprimerie |
| Matière | Glassmorphism, double-bezel | Encre sur papier, filets 1px |
| Angles | 0px | 0px (règle conservée) |
| Catalogue | Grille de cartes égales | Planche asymétrique 6 colonnes / index numéroté |
| Polices | `@import` Google Fonts | Auto-hébergées (240 Ko, 0 requête tierce) |

**Points d'implémentation :**
- Le sélecteur de vue devient **Planche / Index** : même DOM, deux mises en page radicalement différentes (`.list-view`).
- La note de curation (7 morceaux sur 242) est traitée en citation d'appareil, Playfair italique avec filet vermillon, et non comme une colonne réservée toujours vide.
- L'en-tête de collection recadre la pochette en bandeau 16:7 : la composition ne dépend pas de la longueur de la description, souvent absente.
- Apparition au défilement via `IntersectionObserver` uniquement, désactivée sous `prefers-reduced-motion`. Sans JavaScript, tout le contenu reste visible.
- Le thème est posé par un script inline dans le `<head>` pour éviter le flash au chargement.
- Tous les identifiants et classes dont dépend `player.js` sont préservés à l'identique, ainsi que les URLs, l'arborescence et les clés `localStorage`.
- Toutes les paires de couleurs passent le contraste WCAG AA (4.5:1) dans les deux thèmes.

---

## 🎨 3. Charte Graphique & Règles Strictes de Design

1. **Stricte Règle 0px (Zero Rounded Corners) :**
   - Tous les éléments (boutons, pochettes, cartes bento, modales, lecteur audio) doivent utiliser un angle droit strict à 90° (`border-radius: 0 !important`). Aucun arrondi n'est toléré.
2. **Limite Typographique (Max 3 Polices) :**
   - `Syne` : Titres d'en-tête, titres de playlists et grands nombres.
   - `Plus Jakarta Sans` : Corps de texte, commentaires et notes de curation.
   - `JetBrains Mono` : Badges, chronomètres, labels techniques et métadonnées.
3. **Architecture Double-Bezel (Châssis à Double Biseau) :**
   - Implémentée sur les conteneurs clés (`.double-bezel-shell` / `.double-bezel-core`) pour un rendu visuel premium.
4. **Picto Hover Spotify Combiné :**
   - Survol des pochettes avec logo Spotify superposé d'un badge triangle Play.
5. **Lien Externe Inline :**
   - Flèche discrète (`↗`) alignée strictement sur la même ligne que le titre avec infobulle Spotify.

---

## 🛠️ 4. Fonctionnalités Clés & Logique Interne

### A. Authentification & Importation Spotify PKCE
- Utilise le flux Spotify Authorization Code with PKCE via `src/utils/spotify.js`.
- URL de redirection locale obligatoire : `https://127.0.0.1:5173`.
- Recherche automatique des extraits audio de 30s via l'API iTunes Search (`https://itunes.apple.com/search?term=...`) si la propriété Spotify `preview_url` est nulle.

### B. Vues du Studio & Réorganisation des Playlists
- **Vue Détail (`#single-playlist-view`) :** Affiche les morceaux et les notes de curation de la playlist active.
- **Vue Catalogue Globale (`#catalog-view`) :** Accessible au clic sur le logo **"Le Son de la Curiosité"** dans l'en-tête. Affiche toutes les playlists sous forme de cartes bento avec leur pochette 16:9, leur description et leur nombre de morceaux.
- **Réorganisation des Playlists :** Les flèches $\uparrow$ / $\downarrow$ sur les cartes ou dans la modale d'en-tête modifient la propriété `playlists[slug].order`, mettent à jour le `localStorage` et déclenchent la mise à jour immédiate du répertoire `site/`.

### C. Génération Statique Directe sur le Disque (Pas de téléchargement ZIP)
- Le fichier `vite.config.js` inclut le middleware `exportSiteApiPlugin` interceptant `POST /api/export-site`.
- Un clic sur **"Générer Site"** ou toute réorganisation écrit directement les fichiers mis à jour dans le répertoire local `site/` sur le disque dur sans pop-up ni téléchargement navigateur.

### D. Lecteur Audio Unifié (Studio & Site Public)
- Le lecteur du Studio et du site public est **100% identique** :
  - Lecteur flottant Double-Bezel avec image de pochette.
  - Égaliseur audio animé en temps réel (`.player-equalizer-bars`).
  - Slider de volume interactif (`#volume-slider` / `#volume-fill`).
  - Barre de progression avec lueur (`.progress-glow-head`) et recherche au clic.
  - Boutons Suivant ($\gg$) et Précédent ($\ll$) naviguant séquentiellement dans la playlist globale.

---

## 🖥️ 5. Commandes de Développement & Déploiement

### Démarrer le Serveur Local (Studio)
```bash
npm run dev
# Ouvre l'application Studio HTTPS sur https://127.0.0.1:5173/
```

### Générer le Site Statique Manuellement (SSG)
```bash
npm run export-site
# Lit src/data/playlists-data.json et génère site/index.html & site/playlists/*.html
```

### Tester le Build de Production
```bash
npm run build
# Compile l'application Studio dans dist/ via Vite
```

### Publier sur GitHub & Vercel (`lacurio.site`)
```bash
git add .
git commit -m "feat: description des modifications"
git push
```
*(Le push déclenche automatiquement le build Vercel via `vercel.json` et déploie le dossier `site/` sur `https://lacurio.site`)*.

---

## ⚡ 6. Aide-Mémoire pour la Reprise de Projet (AGY CLI & IDE)

- **Fichier de configuration Vercel :** `vercel.json` (`"buildCommand": "npm run export-site"`, `"outputDirectory": "site"`).
- **Pour ajouter une nouvelle playlist :** Importez-la depuis le Studio sur `https://127.0.0.1:5173/` ou éditez `src/data/playlists-data.json`.
- **Pour modifier la description d'une playlist :** Cliquez directement sur le texte de description dans le Studio pour l'éditer en ligne.
- **En cas de modification CSS :** Appliquez les modifications à la fois dans `src/style.css` (pour le Studio) et dans `site/assets/style.css` (pour le site public).
