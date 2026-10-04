# Project status

Updated: 2026-09-29.

## Current state

- Phase: v2 architecture and documentation.
- Active development branch: `codex/v2-online-studio`, based on `master` at `be6c045`.
- Stable code: `master`; current local Studio and static public site remain v1.
- Online v2: not implemented or deployed; no database or auth project provisioned.
- New infrastructure spend: none incurred by this work.
- Production hosting settings and active browser-only content: not yet inspected.

## Completed in this session

- Created the v2 branch while preserving the existing documentation edits.
- Established `doc/` as the home for project documentation without GSD.
- Replaced the local-only proposal with an online Studio/database proposal.
- Recorded accepted user constraints separately from proposed provider and implementation choices.
- Confirmed personal Google login, superseding the earlier GitHub choice in D009; Spotify remains a separate import connection. Recorded personal ownership, minimal scopes, account selection, and curator-only authorization requirements.
- Documented a small logging contract, prioritized backlog, migration, and cutover approach.
- Researched current official free-tier documentation; citations are in the architecture document.
- Added the requested root [`v2-plan.dm`](../v2-plan.dm) recap on 2026-09-29, distinguishing accepted decisions, recommendations, and remaining framing questions.

## Next

V2-002: decide whether Supabase's inactivity behavior is acceptable, then record the selected stack and confirm personal ownership of the required projects. Personal Google login is confirmed. First implementation target: log in on an isolated URL, save one comment to the database, and read it from another device.

## Open decisions

1. Database: Supabase recommended for combined auth/data services; consider Cloudflare D1 if occasional dashboard resume after inactivity is unacceptable.
2. Publication mechanism: confirm a free hosted trigger/build/status path with immutable release IDs before selecting its exact API.

## Working rules

Use the [backlog](backlog.md) for work, [decisions](decisions.md) for rationale, and this page for the current handoff. Keep production changes separate from v2 experiments. Do not treat documentation plans as shipped capabilities. No GSD state or milestone files.

## Validation and limitations

This session changes documentation and the active Git branch only. File/link consistency and Git state are checked; no application tests, live Spotify authentication, database access tests, migration, or deployment have been run.
