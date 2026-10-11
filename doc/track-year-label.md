# Année et label des morceaux

## Symptôme

Le site public montre le bon layout (ligne album) mais **aucune année ni label** : le CSS est déployé, les champs ne sont pas encore en base / dans le payload de release.

## Correctif

1. Appliquer la migration Supabase  
   `supabase/migrations/20261011160000_playlist_item_year_label.sql`  
   (SQL Editor du projet, ou `supabase db push`).
2. Déployer le Studio sur le tip `master` / `codex/v2-online-studio`.
3. Dans le Studio : **connecter Spotify**, puis **Générer Site**.  
   La publication enrichit tous les morceaux via l’API Spotify, persiste `year` / `label`, puis crée une release.

## Colonnes

| Colonne DB | Champ JSON / Studio |
|------------|---------------------|
| `playlist_items.release_year` | `year` |
| `playlist_items.record_label` | `label` |

## Labels Spotify (Dev Mode, mars 2026)

Ce n’est **pas** un bug d’affichage. En *Development Mode*, Spotify a retiré :

- le fetch batch `GET /v1/albums?ids=…`
- le champ `album.label`

L’année reste disponible via `album.release_date` sur les morceaux.  
Le Studio récupère donc le label via `GET /v1/albums/{id}` puis, si `label` est absent, un fallback sur `copyrights` (texte ℗/© nettoyé).

Pour retrouver le vrai champ `label` Spotify : passer l’app en **Extended Quota Mode** sur le dashboard développeur.
