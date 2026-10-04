# Provisioning the isolated v2

The repository is ready for two separate Vercel projects backed by one personal Supabase project. Do not attach `lacurio.site` or modify the v1 project during the trial.

## 1. Supabase

1. Create a personal Free project.
2. Apply `supabase/migrations/20261004120000_initial_v2.sql` with the Supabase CLI or SQL editor.
3. In Authentication → Providers, enable Google with a personal Google OAuth client.
4. Configure the Google consent screen with `openid`, `email`, and `profile` only.
5. Add the Supabase callback URL shown by the provider configuration to Google.
6. Add local and hosted v2 Studio URLs to Supabase redirect URLs.
7. Copy the project URL, publishable key, and service-role key into the corresponding Vercel environments. The service-role key is server-only.
8. Sign in to the Studio once, then run:

   ```bash
   npm run curator:enroll -- owner@example.com
   ```

   This explicit enrollment is the authorization boundary. The first Google user is never automatically trusted.

## 2. Vercel Studio project

Create a personal Hobby project from `codex/v2-online-studio`.

- Build command: `npm run build:v2`
- Output directory: `dist`
- Do not define `RELEASE_ID`.
- Add the public Vite variables and all server variables from `.env.example`.
- Set `CRON_SECRET`; Vercel sends it as a Bearer token to the configured daily cron.
- Use an isolated hostname such as `studio-v2-<name>.vercel.app`.

This project serves the private Studio and `/api/*` functions.

## 3. Vercel public-v2 project

Create a second personal Hobby project from the same branch.

- Build command: `npm run build:v2`
- Output directory: `dist`
- Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as production build variables.
- Set the project ID in the Studio project as `VERCEL_PROJECT_ID`.
- Create a Vercel API token scoped to the personal account and store it only in the Studio project as `VERCEL_API_TOKEN`.
- Do not attach `lacurio.site` during the trial.

At publication time, the Studio sets the public project’s encrypted `RELEASE_ID`, starts a production deployment, and polls its exact deployment ID. The build reads one immutable release payload.

## 4. Spotify

1. Add local and hosted Studio callback URLs in the Spotify dashboard.
2. Set `VITE_SPOTIFY_CLIENT_ID` and `VITE_SPOTIFY_REDIRECT_URI` in the Studio project.
3. Manual v2.0 refresh continues using browser PKCE.
4. To enable daily sync, reconnect once and send the refresh token through the authenticated `/api/spotify/connection` endpoint. It is encrypted with AES-256-GCM before database storage.
5. Generate the encryption key with:

   ```bash
   openssl rand -base64 32
   ```

## 5. Migration and recovery

```bash
# Compare repository data only
npm run migrate:v1

# Compare with a JSON export from the active v1 browser
npm run migrate:v1 -- --browser /path/to/browser-export.json

# Apply only after reviewing a conflict-free report
npm run migrate:v1 -- --browser /path/to/browser-export.json --apply

# Export and dry-run a restore
npm run backup:export
npm run backup:restore -- /path/to/backup.json
npm run backup:restore -- /path/to/backup.json --apply
```

Keep the exported files outside the repository. Never commit tokens, backups, browser exports, or `.env`.

## 6. Acceptance checks

- The authorized Google account opens the Studio.
- Anonymous, work, and unrelated Google accounts cannot read any draft table.
- A comment saved in one browser appears in another.
- A stale edit returns a conflict without overwriting the latest comment.
- A partial Spotify response does not replace a complete playlist.
- A release build contains no owner IDs, tokens, or secrets.
- A failed deployment leaves the prior public deployment live.
- Backup export and restore counts match.
