# Project status

Updated: 2026-10-04.

## Current state

- Phase: v2 implementation foundation.
- Active development branch: `codex/v2-online-studio`, based on `master` at `be6c045`.
- Stable code: `master`; current local Studio and static public site remain v1.
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

## Next

Provision the personal Supabase and two isolated Vercel projects using [the setup guide](setup-v2.md). Apply the migration, enroll the owner, and run the live access, multi-device, Spotify, publication, restore, and rollback acceptance checks.

## Open decisions

1. ~~Database: Supabase recommended~~ → **ACCEPTED** (D005)
2. Publication mechanism: confirm a free hosted trigger/build/status path with immutable release IDs before selecting its exact API.
3. Exact schema details: finalize table structures, indexes, RLS policies.

## Working rules

Use the [backlog](backlog.md) for work, [decisions](decisions.md) for rationale, and this page for the current handoff. Keep production changes separate from v2 experiments. Do not treat documentation plans as shipped capabilities. No GSD state or milestone files.

## Validation and limitations

The repository implementation is locally verified. No live Supabase migration, Google/Spotify OAuth exchange, hosted migration, Vercel deployment, owner trial, or production cutover has been run because this environment has no provider credentials. Production v1 remains unchanged.
