# Project documentation

Curation Studio / Le Son de la Curiosité. Start here for product direction and current work. These are ordinary Markdown files: no GSD, generated milestones, or task orchestration framework.

For the consolidated recap of accepted decisions, recommendations, and open framing questions, see [`v2-plan.dm`](../v2-plan.dm) at the repository root (snapshot dated 2026-09-29).

## Where to look

| Document | Purpose | Update when |
|---|---|---|
| [Status](status.md) | What exists, current work, next step, and open questions | A work session changes the project state |
| [Architecture](architecture.md) | Current system and proposed online system, including data and publishing | A technical boundary changes |
| [Backlog](backlog.md) | Prioritized work with stable IDs and completion criteria | Work is added, started, completed, or reprioritized |
| [Decisions](decisions.md) | Dated decisions, their reasons, and superseded choices | We agree on a consequential choice |
| [Logging](logging.md) | Small diagnostic and activity logging contract | An operation or failure needs new visibility |
| [Spotify authentication](spotify-auth-comparison.md) | Browser PKCE, server token custody, and scheduled sync | Spotify auth or sync behavior changes |
| [Database comparison](database-comparison.md) | Historical rationale for the accepted Supabase decision | Provider limits materially change |
| [Vercel storage](vercel-storage-comparison.md) | Why Blob is not the application database | Storage requirements change |

Keep each fact in its owning document and link to it elsewhere. Status summarizes; backlog tracks work; decisions explain why. Use `proposed`, `accepted`, and `superseded` for decisions. Use `todo`, `in progress`, `blocked`, `done`, and `deferred` for backlog items. Mark work done only with recorded evidence. Add another document only when an existing one has become difficult to use.

## Product direction

The curator should open a URL, sign in, import playlists, write comments, and publish from a browser without running the Studio on a laptop. Saved editorial content should be available from another device. Visitors should discover playlists and listen to previews without an account.

Confirmed constraints:

- Improve both the Studio workflow and the public listening experience.
- Use a database for comments and editorial content.
- Use the owner's personal Google account to sign in to the Studio; connect Spotify separately for imports. Keep project ownership outside employer accounts and organizations.
- Keep infrastructure spending at $0 for this early personal project.
- Develop v2 separately while the current version remains usable. Switch only when the owner is satisfied.
- Keep documentation and project management in this folder; do not use GSD.

Initial scope: one authorized curator, online login, safe saving, export/restore, Spotify import, private draft preview, deliberate publication, then public discovery and listening improvements. Initial exclusions: collaborative editing, listener accounts, subscriptions, full-track streaming, and a framework rewrite. These are scope recommendations, not permanent restrictions.

## Current baseline

Repository inspection on 2026-09-27 found 9 playlists, 260 track entries, and 9 nonempty track comments in the checked-in catalogue. Browser storage may contain additional edits and has not been inspected.

The current Studio runs locally; public pages are generated for Vercel. Inspection found browser/disk persistence divergence, reimport that can replace an edited description, generation paths that do not consistently report failures, and duplicated export/player logic. These are code findings, not results of browser testing.

The current code uses the Lookbook typography and theme in both surfaces despite older branch-specific wording in the guide. Confirm this visual baseline before UI work.

The earlier root-level `NEXT-VERSION` documents have been consolidated here. Their proposed local-only v2 storage has been superseded by the requested hosted Studio and database.
