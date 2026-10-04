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

### Prochaines réflexions à développer

*[Ajoutez vos idées ici au fil de l'eau]*

**Exemple :**
- [ ] Préciser le flow exact de publication (bouton → snapshot → build → confirmation)
- [ ] Définir la structure exacte des tables (champs, index, contraintes)
- [ ] Détailler le mécanisme de résolution de conflits d'édition
- [ ] Spécifier le format d'export/restore JSON

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
