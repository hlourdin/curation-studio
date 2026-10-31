# Project status

Updated: 2026-10-31.

## Current state

- Phase: v2 implementation foundation.
- Single branch: `master` (v2 merged). `codex/v2-online-studio` still exists only because Vercel deploys it until the switch below is verified.
- Production: `lacurio.site` serves `curation-studio-v2-public`; the Studio runs at `curation-studio-v2-studio.vercel.app` (Supabase project `cplkymfifwejxxfmvoiz`).
- Online v2: repository implementation exists; deployment and provider validation are blocked until personal Supabase, Google, Spotify, and Vercel credentials are supplied.
- New infrastructure spend: none incurred by this work.
- Production hosting settings and active browser-only content: not yet inspected.

## Completed work

**Session 2026-09-27 to 2026-09-29:**
- Created the v2 branch while preserving the existing documentation edits.
- Established `doc/` as the home for project documentation without GSD.
- Replaced the local-only proposal with an online Studio/database proposal.
- Recorded accepted user constraints separately from proposed provider and implementation choices.
- Confirmed personal Google login, superseding the earlier GitHub choice in D009; Spotify remains a separate import connection.
- Documented a small logging contract, prioritized backlog, migration, and cutover approach.
- Researched current official free-tier documentation; citations are in the architecture document.
- Added the requested root [`v2-plan.dm`](../v2-plan.dm) recap, distinguishing accepted decisions, recommendations, and remaining framing questions.

**Session 2026-10-04:**
- Confirmed Supabase as the selected architecture (D005 now accepted).
- Created [`WORKING.md`](../WORKING.md) as a mobile-friendly space to capture ideas and refine the plan iteratively.
- Corrected Spotify OAuth documentation: PKCE already yields refresh tokens; scheduled sync requires server-side token custody.
- Consolidated current Supabase, Neon, Vercel Marketplace, Blob, and Cron constraints.
- Started implementation while preserving v1 on `master`.
- Added Supabase migrations/RLS, Google backoffice authentication, revision-aware saves, migration and recovery scripts, safe Spotify sync, encrypted server token custody, daily cron, immutable release builds, and Vercel publication/status functions.
- Added seven automated tests; v2 build, v1 static export, migration dry-run, JavaScript syntax checks, and dependency audit pass.
- Manually validated the local fallback UI, catalogue, playlists, themes, and separate Spotify connection.

**Session 2026-10-31:**
- Fast-forwarded local `master` to the merged v2; deleted, then recreated `codex/v2-online-studio` after publication failed with `INTERNAL_ERROR` (the public project's Production Branch still pointed to it).
- Resumed the Supabase project after a free-tier inactivity pause; Google login and publication work again.
- Code, `.env.example`, setup guide, and tests now default the deployment ref to `master` (`34ca8b6`). No `VERCEL_GIT_REF` variable exists; the ref comes from the public project's Production Branch.
- Added V2-018 (Batch web push) and V2-019 (manual Instagram) to the backlog.

## Next (todo)

1. **Switch Vercel to `master`:** set Production Branch to `master` on `curation-studio-v2-public` and `curation-studio-v2-studio`, redeploy the Studio, publish once, and check that the public deployment shows branch `master`. Then delete `codex/v2-online-studio`. Until then, keep it equal to `master` (`git push origin master:codex/v2-online-studio`).
2. **Diagnose the daily cron:** in `curation-studio-v2-studio` → Settings → Cron Jobs, click Run, then View Logs. 200 = fine; 401 = add `CRON_SECRET` (`openssl rand -hex 32`, Production) and redeploy; 500 = read the error. Suspected reason the Supabase project still paused despite the daily cron.
3. **Disable the duplicate cron** on `curation-studio-v2-public` if it shows `/api/cron/sync-playlists` (same `vercel.json`).
4. **Auto sync (optional):** reconnect Spotify once so the server stores the refresh token (`/api/spotify/connection`), then enable "Sync auto" per playlist.
5. **Backup:** run `npm run backup:export` (needs `SUPABASE_URL` and the server key in `.env`); keep the file outside the repo.
6. **Leftover stash:** port D010/D011, the `AGENTS.md` rule, and the `v2-plan.dm` 2026-10-09 section from `stash@{0}` as described in `BATCH_WEB_PUSH_PLAN.md`, then drop the stash.

## Open decisions

1. ~~Database: Supabase recommended~~ → **ACCEPTED** (D005)
2. Publication mechanism: confirm a free hosted trigger/build/status path with immutable release IDs before selecting its exact API.
3. Exact schema details: finalize table structures, indexes, RLS policies.

## Working rules

Use the [backlog](backlog.md) for work, [decisions](decisions.md) for rationale, and this page for the current handoff. Keep production changes separate from v2 experiments. Do not treat documentation plans as shipped capabilities. No GSD state or milestone files.

## Validation and limitations

The repository implementation is locally verified. No live Supabase migration, Google/Spotify OAuth exchange, hosted migration, Vercel deployment, owner trial, or production cutover has been run because this environment has no provider credentials. Production v1 remains unchanged.
