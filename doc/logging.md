# Logging and troubleshooting

Status: proposed contract for v2. No logger or remote collection is implemented yet.

## Purpose

Answer four questions: what operation ran, whether it succeeded, which item it affected, and what the user can do after a failure. Use one small logging helper and the infrastructure already selected.

## Two destinations

| Destination | Content | Lifetime |
|---|---|---|
| Browser/server console | Structured diagnostics, errors, duration, correlation ID | Browser session or provider's included retention; do not assume durable history |
| Private `activity_events` table | Import, restore, release, and significant failure outcomes | Proposed maximum 30 days or 500 most recent events, whichever is smaller |

Do not store a database event for each keystroke, successful autosave, playback tick, or visitor page view. Row revisions and `updated_at` cover ordinary saves. A failed save is visible in the editor even when the database is unreachable; diagnostic logging must not be needed for the save path to complete.

Apply activity retention on successful maintenance-capable operations such as import or publication, plus an explicit cleanup action. At low activity, expired records may remain until the next such operation; this is not a strict timed-deletion guarantee. Add a scheduler only if a real requirement appears.

## Event shape

```json
{
  "timestamp": "2026-09-27T12:00:00Z",
  "level": "error",
  "event": "comment.save_failed",
  "operation_id": "random-correlation-id",
  "entity_type": "playlist_item",
  "entity_id": "opaque-entry-id",
  "outcome": "failed",
  "duration_ms": 240,
  "error_code": "REVISION_CONFLICT",
  "release_id": null
}
```

Use `debug`, `info`, `warn`, and `error`. Debug is disabled in hosted production. Generate an operation ID at the start of a save, import, or publish flow and carry it through requests. Validate any client-supplied correlation value and keep it length-bounded.

Log safe codes such as `AUTH_REQUIRED`, `ACCESS_DENIED`, `REVISION_CONFLICT`, `IMPORT_INCOMPLETE`, `DATABASE_UNAVAILABLE`, and `DEPLOY_FAILED`. Display a short actionable message and a copyable diagnostic ID. An unavailable database alone does not prove the provider paused it; suggest checking provider status rather than claiming a cause we have not established.

Never log comment bodies, playlist descriptions, emails, passwords, access/refresh tokens, cookies, authorization headers, callback query strings, deployment hooks, or raw provider responses. Redact at the logging boundary. Restrict stack traces to sanitized developer diagnostics. Restrict the activity table to the curator; do not accept arbitrary public event writes.

## Failure behavior

- Auth failure: retain the unsaved draft, offer sign-in, retry only after reconciling revisions.
- Save failure/conflict: keep the editor text, show retry or comparison, never mark it saved.
- Partial import: report failure and retain the complete saved playlist.
- Publish failure: retain the active release and allow retry of the same snapshot.
- Preview failure: explain unavailability and retain the external listening link.
- Logging failure: emit a minimal safe console fallback; do not recursively log or fail the user's successful operation.

## Operations

The Studio should expose a small diagnostics view: app version, last successful save/import, latest release status, and recent failed operation IDs. Allow the owner to copy a sanitized diagnostic report. Use provider dashboards for usage and service status.

Activity logs are not backups or a complete audit history. Provide a versioned JSON export of editorial content and verify restore before cutover. Keep exports in an owner-controlled location outside the public site and Git repository. A documented manual export is acceptable initially; automatic backup can be added after the hosted editing flow is proven.

No separate observability service, tracing collector, analytics pipeline, or always-on monitoring process is proposed.
