# 💭 Espace de Travail v2 — Idées et Réflexions

> **Carnet mobile-friendly pour affiner le plan v2 au fil de l'eau**  
> Dernière mise à jour : 2026-10-04

---

## 🎯 Orientation Confirmée

✅ **Architecture retenue : Supabase**
- Auth Google via Supabase Auth
- Base de données Postgres (tier gratuit)
- Acceptable de réactiver le projet via dashboard après inactivité
- Alternative Cloudflare Workers/D1 écartée pour l'instant

---

## 💡 Idées en cours

### Clarifications du 2026-10-04

**Auth Google = Backoffice uniquement**
- ✅ L'authentification Google ne concerne que l'interface de curation (Studio/backoffice)
- ✅ Un seul utilisateur (propriétaire) pour le moment
- ✅ Le site public reste accessible sans authentification
- Simplifie l'architecture : pas de gestion multi-users, pas de rôles complexes

**Synchronisation automatique des playlists Spotify**
- ✅ **Usage clarifié** : Ajout titres Spotify quasi-quotidien, travail Studio 2-3x/jour max
- 🎯 **Stratégie retenue** :
  - **v2.0 (P0)** : Refresh manuel via bouton "Ré-importer" (PKCE comme v1)
  - **v2.1+ (P2)** : Cron automatique tous les matins (ex: 8h) avec refresh token
- 🔧 Options techniques identifiées :
  - **Vercel Cron** (1 job gratuit sur Hobby) - recommandé
  - **Supabase pg_cron** (plusieurs jobs possibles) - alternative
- 🔑 **Requis pour auto-sync** :
  - Stocker refresh token Spotify (Authorization Code Flow)
  - Table `spotify_credentials` avec token chiffré
  - Champs `auto_sync`, `last_synced_at`, `spotify_snapshot_id` dans `playlists`
- 📋 **Flow cible v2.1** : Cron 8h → Fetch Spotify → Detect changes → Merge → Notif email → Vous commentez direct
- ✨ **Features** : Checkbox "auto-sync" par playlist, notification "X nouveaux titres"
- 🎯 **Bénéfice** : Titres déjà en BDD à l'ouverture du Studio, focus 100% sur la curation

### Prochaines réflexions à développer

- [ ] Préciser le flow exact de publication (bouton → snapshot → build → confirmation)
- [ ] Définir la structure exacte des tables (champs, index, contraintes)
- [ ] Détailler le mécanisme de résolution de conflits d'édition
- [ ] Spécifier le format d'export/restore JSON
- [ ] Décider si cron sync Spotify en v2.0 ou v2.1

---

## 🔧 Décisions à Prendre

### Court terme
- [ ] Confirmer l'orientation Supabase dans `doc/decisions.md`
- [ ] Définir le schéma exact des 4 tables (playlists, playlist_items, releases, activity_events)
- [ ] Spécifier le comportement exact des commentaires (attachés à une entrée de playlist)

### Moyen terme
- [ ] Détailler le flow de publication (immutable snapshots)
- [ ] Définir la stratégie backup/restore avant migration
- [ ] Planifier la procédure de bascule v1→v2

---

## 📝 Notes de Session

### 2026-10-04 (matin)
- Orientation Supabase confirmée
- Création de cet espace de travail pour itérations mobiles
- Plan général en place, passage en phase d'affinage avant implémentation

### 2026-10-04 (10h)
- Clarification : Auth Google = backoffice only, utilisateur unique (propriétaire)
- Exploration : Sync automatique playlists Spotify via cron
- Options : Vercel Cron (1 gratuit) ou Supabase pg_cron (plusieurs)
- Décision : refresh token nécessaire (Authorization Code Flow vs PKCE actuel)
- Recommandation : v2.0 = update manuelle, v2.1 = ajout cron optionnel

### 2026-10-04 (11h)
- **Usage clarifié** : Ajout titres Spotify quasi-quotidien, travail Studio 2-3x/jour
- **Décision confirmée** : 
  - v2.0 = Refresh manuel via bouton (PKCE suffit) ✅
  - v2.1+ = Cron automatique tous les matins (ex: 8h) avec refresh token
- **Séquence cible** : Cron sync le matin → titres déjà en BDD → vous commentez direct
- **Gain** : Plus besoin de cliquer "Ré-importer", focus sur la curation

---

## 🔗 Liens Rapides

- **Plan complet** : [`v2-plan.dm`](v2-plan.dm)
- **Documentation** : [`doc/README.md`](doc/README.md)
- **Architecture** : [`doc/architecture.md`](doc/architecture.md)
- **Décisions** : [`doc/decisions.md`](doc/decisions.md)
- **Backlog** : [`doc/backlog.md`](doc/backlog.md)
- **Statut actuel** : [`doc/status.md`](doc/status.md)

---

## 🚀 Quand je serai prêt à lancer v2

1. Mettre à jour `doc/decisions.md` avec Supabase confirmé
2. Finaliser le schéma de données dans `doc/architecture.md`
3. Créer les projets Google OAuth + Supabase
4. Commencer l'implémentation avec V2-002 (Foundation)
