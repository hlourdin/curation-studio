# Backlog

One ordered list. IDs remain stable if priorities change. `P0` is needed for the first hosted editing increment; `P1` completes online publishing and product improvements; `P2` can wait. Entries below are proposed work, not implemented features.

| ID | Priority | Status | Work | Done when |
|---|---|---|---|---|
| V2-001 | P0 | done | Establish branch and documentation | v2 branch exists; `doc/` records scope, architecture, decisions, logging, backlog, and status; superseded root proposals are consolidated |
| V2-002 | P0 | todo | Settle hosting and auth service | Personal Google login is confirmed; accept free database tradeoffs and auth service; record decisions; inspect hosting settings and personal project ownership without changing production |
| V2-003 | P0 | todo | Create isolated hosted skeleton | Owner can open a separate v2 URL on a free plan; production v1 is unchanged; OAuth/hosting/database resources are personally owned; secrets and callbacks belong to v2 |
| V2-004 | P0 | todo | Define schema, auth, and permissions | Google account chooser and minimal identity scopes work; only the provisioned personal identity can access drafts; anonymous, work, and unrelated signed-in accounts are denied by database/server permissions; SQL is versioned and secrets stay out of client output |
| V2-005 | P0 | todo | Reconcile and migrate v1 data | Disk and active browser exports are backed up and compared; repeated import is safe; IDs, slugs, order, and every retained comment match the reconciliation report |
| V2-006 | P0 | todo | Prove hosted comment editing | Authorized curator edits and reads the saved comment from a second browser/device; failed and stale saves stay recoverable; browser storage is no longer the authority |
| V2-007 | P0 | todo | Add export/restore and diagnostics | Versioned export restores correctly in isolation; save errors carry safe operation IDs; private bounded activity history follows the logging contract |
| V2-008 | P1 | todo | Make Spotify refresh safe online | Hosted callbacks work; real account access is checked; partial pagination cannot replace complete data; editorial overrides and removed-track notes survive change review |
| V2-009 | P1 | todo | Prove hosted publication path | A small investigation demonstrates a free hosted build tied to one immutable release ID, idempotent trigger, status confirmation, and failure preserving the prior deployment |
| V2-010 | P1 | todo | Deliver private preview and Publish | Draft preview requires login; Publish produces only selected public content; no laptop/Git command is needed for ordinary content publication; retry and rollback are visible |
| V2-011 | P1 | todo | Improve the editorial workspace | Search finds playlists/tracks/artists; metadata and featured-selection editing persist; shared preview rendering matches public output |
| V2-012 | P1 | todo | Improve public discovery and listening | Mobile/keyboard flows work; search excludes drafts; preview failures and rapid track changes have correct states; share links/metadata resolve |
| V2-013 | P1 | todo | Cut over after owner trial | Owner accepts v2; final content delta reconciled; restore and rollback rehearsed; production routing changed deliberately; existing playlist URLs remain valid |
| V2-014 | P2 | deferred | Automated Spotify playlist sync | Optional per-playlist daily sync via Vercel Cron; requires server-side custody of a Spotify refresh token obtained through PKCE or a confidential-server exchange; detects new tracks via `spotify_snapshot_id`; preserves comments; notifications remain optional. Defer until the core is stable. The owner adds tracks nearly daily and works in Studio 2–3x/week, so manual refresh is acceptable initially but auto-sync is valuable. |
| V2-015 | P2 | deferred | Decide portable ZIP export | Keep it with shared rendering or retire it based on actual need |
| V2-016 | P2 | deferred | Playback across page navigation | Establish whether uninterrupted listening justifies a navigation architecture change |
| V2-017 | P2 | deferred | Automated external backups | Add only after export/restore works and a free destination/retention policy is agreed |

## Delivery order

First usable increment: V2-002 through V2-007 — log in online, migrate existing content, save a comment safely, and retrieve it elsewhere.

Next: V2-008 through V2-010 — import and publish entirely from the browser. Investigate V2-009 early enough to adjust architecture before committing to a provider-specific implementation.

Then V2-011 and V2-012 improve both product surfaces. V2-013 is the owner-controlled release gate. There is no committed delivery date yet.

## Evidence

- V2-001, 2026-09-27: created `codex/v2-online-studio` from the existing `master` baseline; added the documentation set and updated its entry points. Application implementation and hosted resources remain unchanged. See [status](status.md).

For later completed work, append a short verification result or link to the commit/PR that contains it. Do not mark a hosted feature done based only on a local unit test.
