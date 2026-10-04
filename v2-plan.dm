# Curation Studio v2 — Decisions and remaining framing

Recap dated 2026-09-29. This file summarizes the conversation and the current project documents. It distinguishes accepted decisions from recommendations and open questions. The detailed, evolving records remain in [`doc/`](doc/README.md).

## 1. What we are building

An online version of Le Son de la Curiosité where the owner can open the Studio in a browser, sign in with a personal Google account, import Spotify playlists, write comments, and publish selections without running the application on a laptop. Editorial content will live in a database and be available across devices.

The next version covers both the private Studio workflow and the public discovery/listening experience. The recommended first increment is deliberately small: sign in online, save a comment, and retrieve it from another browser or device.

## 2. Accepted decisions

| Topic | Decision | Implication |
|---|---|---|
| Product scope | Improve both the Studio and the public site | Prioritize online editing first, then publishing and public experience improvements |
| Online access | The Studio will run online | Ordinary curation must not depend on a locally running Vite server |
| Persistent content | Use a database for comments and editorial work | Browser storage will no longer be the sole durable copy |
| Login | Use the owner's personal Google account | The earlier GitHub login decision is superseded |
| Personal/work separation | Keep OAuth, hosting, and database projects personally owned, outside employer organizations | Shared GitHub repository access must not grant Studio access |
| Google permissions | Request identity, email, and basic profile only; show an account chooser | Make personal-account selection explicit and restrict editorial access to the approved identity |
| Spotify | Connect separately for playlist imports | Saved comments remain editable when Spotify is disconnected |
| Infrastructure budget | No new infrastructure spending at this stage | Use free tiers; do not activate paid plans or add-ons without a new decision |
| Development isolation | Work on `codex/v2-online-studio` and retain v1 on `master` | Keep the current version usable while developing and trying v2 |
| Production switch | Switch only when the owner is satisfied | Plan an isolated trial, final data reconciliation, and rollback |
| Project management | Use lightweight Markdown documents in root `doc/`; stop using GSD | No GSD workflows, state files, or milestone machinery |
| Agent instructions | `AGENTS.md` is canonical; `GEMINI.md` links to it | Maintain one instruction source |

Google authentication must be accompanied by server/database authorization. A successful login from a work account or another Google account must not grant access to private content. The authorized owner is explicitly provisioned; the first person to sign in does not automatically become the owner.

The accepted decisions are recorded in [the decision log](doc/decisions.md), particularly D001–D004 and D009. D006 retains the historical GitHub choice and is marked superseded.

## 3. Recommended architecture — not yet accepted in full

| Component | Current recommendation | Why |
|---|---|---|
| Studio hosting | Vercel Hobby with the existing Vite/JavaScript frontend | Reuse the current code and hosting familiarity |
| Authentication service | Supabase Auth configured for Google | Managed login with little custom authentication code |
| Database | Supabase Free Postgres | Combine database, authentication, and data API in one additional service |
| Privileged operations | A small number of hosted functions | Keep publishing credentials and privileged actions outside the browser |
| Public delivery | Static pages generated from an immutable release snapshot | Visitors can browse without a live dependency on the editing database |
| Logging | Structured console events plus bounded private activity history | Useful diagnostics without another paid service |

These are proposals D005, D007, and D008. Google as the login provider is accepted; Supabase as the service implementing it is still proposed.

The provider research recorded on 2026-09-27 identified two relevant Supabase Free limitations: projects can pause after low activity, and automatic backups are not included. We need to decide whether occasional dashboard resumption is acceptable and define export/restore. Current limits and sources are documented in [architecture](doc/architecture.md#free-tier-tradeoffs) and should be rechecked before provisioning.

Cloudflare Workers/D1 remains an alternative if the Supabase inactivity behavior is unacceptable. Its complete authentication and hosting integration would need to be compared before selecting it.

The proposed public publishing flow is:

1. Save private drafts to the database.
2. Preview them inside the authenticated Studio.
3. On Publish, create an immutable snapshot containing selected public content.
4. Start a hosted build bound to that exact release ID.
5. Confirm successful deployment before displaying “published”; preserve the previous release if it fails.

The precise deployment trigger, release-ID transport, status confirmation, and retry implementation remain to be framed. The owner should not need a laptop or Git command for ordinary content publication.

## 4. Data and editing behavior to specify

The current proposal has four application tables: `playlists`, `playlist_items`, `releases`, and `activity_events`, alongside managed authentication and the owner authorization setting. This is a starting model, not a finalized schema.

Recommended behavior:

- Keep Spotify metadata separate from editorial overrides, so refreshing a playlist does not replace a custom description or note.
- Use stable internal IDs and public slugs; a renamed playlist should retain its URL.
- Initially attach a comment to a playlist entry, allowing different notes for the same song in different playlists. Confirm this before finalizing the schema.
- Preserve notes for tracks removed from Spotify until the owner explicitly discards them.
- Save individual edits with visible saving/saved/failed/conflict states and revision checks to avoid silently overwriting another device's changes.
- Reject partial imports rather than replacing a complete playlist with incomplete data.
- Keep a recoverable copy of unsaved text and provide versioned export/restore.

Still specify: duplicate track occurrences, matching across reimports, comment scope, conflict resolution, deletion/archive semantics, and which editorial fields belong in the first release.

## 5. Logging and operational simplicity

The requested direction is lightweight, useful logging. The proposed implementation is one small logging helper with operation IDs, outcome, safe error code, affected entity ID, and duration.

Use browser/server consoles for diagnostics and a small private table for significant import, restore, publish, and failure events. The suggested activity-history limit is 30 days or the latest 500 events, with cleanup during maintenance-capable operations; the exact policy is not accepted yet.

Do not record comment text, credentials, tokens, emails, or raw provider responses. Avoid logging every keystroke, successful autosave, or playback tick. Logs must not become a dependency of successful saving. Diagnostic history is separate from backups.

The initial recovery recommendation is a versioned JSON export kept in an owner-controlled location, with a proven restore path. Backup frequency, destination, and eventual automation remain open. See [logging](doc/logging.md).

## 6. Keeping v1 usable and moving to v2

The branch exists, but code isolation alone does not isolate hosting settings or data. The proposed development setup uses a separate v2 URL/project and a separate database. Current production settings have not yet been inspected.

Before migration, export the active v1 browser data and back up the repository JSON. Compare and reconcile them: browser-only edits may be newer than the file. Preserve comments, playlist order, and existing URLs. Repeated import must be safe.

During the trial, the proposed rule is to keep v1 as the editorial source of record and avoid editing the same content independently in both versions. Before switching, briefly freeze edits, reconcile the final delta and any intentional v2 trial changes, export both versions, validate the release, then change production routing. Keep the previous deployment and a recovery export available.

The exact trial workflow, final merge rules, switch procedure, and rollback rehearsal still need to be agreed. Returning to an older frontend must not overwrite newer database content.

## 7. What still needs framing

| Question | Current direction | When to resolve |
|---|---|---|
| Which hosting/database/auth service do we select? | Vercel + Supabase recommended; evaluate inactivity tolerance | Before creating cloud resources |
| Where are the personally owned projects and isolated v2 URL? | Inspect ownership, free-plan eligibility, and existing production settings | Before provisioning/deployment |
| How is the authorized personal identity enrolled and recovered? | Explicit owner authorization, minimal scopes, account chooser; no public editorial access | Before implementing auth |
| What exactly is a comment attached to? | A playlist entry, with stable identity and preserved removed-track notes | Before schema and migration |
| How are stale saves and conflicting browser/disk data handled? | Revisions and explicit comparison; preserve originals | Before migrating real content |
| What does Publish include, and how is success established? | Immutable snapshot, authenticated hosted trigger, confirmed deployment | Investigate early, before committing to the publication architecture |
| What backup is sufficient on a free tier? | Manual versioned export/restore first | Before relying on v2 for original work |
| What logging/history is actually useful? | Small event vocabulary and bounded activity history | Alongside the first hosted editing flow |
| Which editorial and visitor improvements ship first? | Search, edition metadata, featured selection, mobile/keyboard polish, clear preview states, sharing | After the core hosted flow works |
| What visual baseline do we keep? | Existing Lookbook recommended; older guide wording conflicts with current code | Before UI changes |
| What can the actual Spotify app import today? | Check real account permissions, callbacks, pagination, and preview behavior | Before expanding import features |
| What counts as readiness to switch? | Owner trial, reconciled content, access checks, restore and rollback evidence | Before production cutover |

Choices to defer unless needed: portable ZIP export, uninterrupted audio across page navigation, and automated external backups. Multi-user collaboration, listener accounts, full-track streaming, subscriptions, and a framework rewrite are outside the proposed initial scope.

## 8. Proposed delivery sequence

| Stage | Outcome | Backlog references |
|---|---|---|
| Foundation | Accept service choices, establish personally owned isolated hosting, configure Google login and database permissions | V2-002–V2-004 |
| First usable hosted Studio | Migrate content safely; edit a comment from one device and read it from another; export and restore | V2-005–V2-007 |
| Online import and publication | Refresh Spotify safely, preview privately, and publish from the browser | V2-008–V2-010 |
| Product improvements | Better editorial tools, discovery, sharing, and listening controls | V2-011–V2-012 |
| Owner-approved switch | Reconcile final data and move production with a rehearsed recovery path | V2-013 |

Investigate publication feasibility early, even though full publishing follows hosted editing. No delivery date is committed. Detailed completion criteria are in [the backlog](doc/backlog.md).

The first hosted increment is complete when the owner can sign in, edit migrated content, retrieve it from another device, recover from a failed/conflicting save, and export/restore content. Anonymous and unrelated authenticated clients must be denied access to private content. The existing public site must remain usable throughout.

## 9. Current state and documentation

As of this recap:

- `codex/v2-online-studio` is the active branch, based on `master` at `be6c045`.
- The documentation structure, accepted decisions, proposed architecture, logging contract, and backlog exist.
- v2 application features are not implemented or deployed. No database or Google OAuth project has been configured by this work.
- No infrastructure spending has been incurred by this work.
- Documentation changes remain local and uncommitted.
- The baseline catalogue inspected on 2026-09-27 contained 9 playlists, 260 track entries, and 9 nonempty comments. Active browser storage has not been inventoried.

| File | Role |
|---|---|
| [`doc/README.md`](doc/README.md) | Documentation entry point and product intent |
| [`doc/architecture.md`](doc/architecture.md) | Current system, proposed online architecture, and migration |
| [`doc/backlog.md`](doc/backlog.md) | Ordered work and completion criteria |
| [`doc/decisions.md`](doc/decisions.md) | Accepted, proposed, and superseded decisions |
| [`doc/status.md`](doc/status.md) | Current handoff and next action |
| [`doc/logging.md`](doc/logging.md) | Proposed logging and troubleshooting contract |
| [`AGENTS.md`](AGENTS.md) | Agent instructions; `GEMINI.md` is its symlink |

Next framing conversation: decide whether the proposed Supabase free-tier tradeoffs fit this project's usage, then settle personal project ownership and the minimum data/save/recovery contract before implementing the first hosted increment.
