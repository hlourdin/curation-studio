# Backlog

One ordered list. IDs remain stable if priorities change. `P0` is needed for the first hosted editing increment; `P1` completes online publishing and product improvements; `P2` can wait. Entries below are proposed work, not implemented features.

| ID | Priority | Status | Work | Done when |
|---|---|---|---|---|
| V2-001 | P0 | done | Establish branch and documentation | v2 branch exists; `doc/` records scope, architecture, decisions, logging, backlog, and status; superseded root proposals are consolidated |
| V2-002 | P0 | blocked | Settle hosting and auth service | Stack is accepted and documented; provider ownership/settings inspection requires the owner's Supabase, Google, Spotify, and Vercel access |
| V2-003 | P0 | blocked | Create isolated hosted skeleton | Repository configuration is ready; creating the personal projects and URL requires provider credentials |
| V2-004 | P0 | in progress | Define schema, auth, and permissions | SQL, RLS, Google auth client, server authorization, and enrollment tooling are versioned; live policy denial tests remain |
| V2-005 | P0 | blocked | Reconcile and migrate v1 data | Dry-run passes for disk data (9 playlists, 260 tracks, 9 comments); active browser export and live database are unavailable here |
| V2-006 | P0 | blocked | Prove hosted comment editing | Revision-aware saves and local recovery are implemented; two-device proof requires the hosted database |
| V2-007 | P0 | in progress | Add export/restore and diagnostics | Versioned export/restore and bounded activity code exist; restore against an isolated live database remains |
| V2-008 | P1 | in progress | Make Spotify refresh safe online | Complete-pagination rejection, transactional merge, retained removals, and token refresh are implemented; real account validation remains |
| V2-009 | P1 | in progress | Prove hosted publication path | Exact release binding, idempotency, status confirmation, and prior-deployment retention are implemented; live Vercel proof remains |
| V2-010 | P1 | in progress | Deliver private preview and Publish | Authenticated Publish and status UI exist; hosted preview and owner acceptance remain |
| V2-011 | P1 | todo | Improve the editorial workspace | Search finds playlists/tracks/artists; metadata and featured-selection editing persist; shared preview rendering matches public output |
| V2-012 | P1 | todo | Improve public discovery and listening | Mobile/keyboard flows work; search excludes drafts; preview failures and rapid track changes have correct states; share links/metadata resolve |
| V2-013 | P1 | todo | Cut over after owner trial | Owner accepts v2; final content delta reconciled; restore and rollback rehearsed; production routing changed deliberately; existing playlist URLs remain valid |
| V2-014 | P2 | in progress | Automated Spotify playlist sync | Encrypted server token custody, per-playlist opt-in, locking, idempotent daily cron, and activity events are implemented; live cron and token-expiry validation remain |
| V2-015 | P2 | deferred | Decide portable ZIP export | Keep it with shared rendering or retire it based on actual need |
| V2-016 | P2 | deferred | Playback across page navigation | Establish whether uninterrupted listening justifies a navigation architecture change |
| V2-017 | P2 | deferred | Automated external backups | Add only after export/restore works and a free destination/retention policy is agreed |

## Delivery order

First usable increment: V2-002 through V2-007 — log in online, migrate existing content, save a comment safely, and retrieve it elsewhere.

Next: V2-008 through V2-010 — import and publish entirely from the browser. Investigate V2-009 early enough to adjust architecture before committing to a provider-specific implementation.

Then V2-011 and V2-012 improve both product surfaces. V2-013 is the owner-controlled release gate. There is no committed delivery date yet.

## Evidence

- V2-001, 2026-09-27: created `codex/v2-online-studio` from the existing `master` baseline; added the documentation set and updated its entry points. Application implementation and hosted resources remain unchanged. See [status](status.md).
- Foundation implementation, 2026-10-04: commits `f163658`, `c512c99`, and `e9bca4d` add the schema/RLS, hosted Studio adapters, migration/recovery tooling, safe Spotify flows, publication pipeline, cron, and tests. Local evidence: 7 tests pass; v2 and v1 builds pass; migration dry-run reports 9 playlists, 260 tracks, 9 comments, and no conflicts; dependency audit reports zero vulnerabilities.

For later completed work, append a short verification result or link to the commit/PR that contains it. Do not mark a hosted feature done based only on a local unit test.
