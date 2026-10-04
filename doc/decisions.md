# Decision record

Small append-only record of consequential choices. Update a status when superseded and link the replacement; preserve the original reasoning. A proposed choice is not permission to provision infrastructure.

## D001 — Plain Markdown project management

- Date: 2026-09-27
- Status: accepted — user instruction
- Decision: use root `doc/` for architecture, backlog, decisions, logging, and project status. Stop using GSD.
- Reason: a small, understandable structure that can evolve collaboratively.
- Consequence: update the relevant documents during work; do not create GSD state, milestones, or generated plans.

## D002 — Hosted Studio and persistent database

- Date: 2026-09-27
- Status: accepted — user instruction
- Decision: v2 supports online login and stores comments/editorial work in a database.
- Reason: curate from a browser without running the app on a laptop.
- Supersedes: the earlier local-only v2 storage proposal.
- Consequence: design authentication, authorization, recovery, and remote publication before cutover. The current v1 implementation is retained during development.

## D003 — Separate v2 development and deliberate cutover

- Date: 2026-09-27
- Status: accepted — user instruction
- Decision: develop on `codex/v2-online-studio`; preserve `master` and the active v1 service until the owner is happy to switch.
- Reason: keep curating with the current version during development.
- Consequence: isolate deployment configuration and database as well as code. Plan final data reconciliation and rollback. Branch creation alone does not isolate hosted resources.

## D004 — Zero infrastructure budget

- Date: 2026-09-27
- Status: accepted — user instruction
- Decision: use free tiers and incur no new infrastructure charges at this stage.
- Reason: early personal project.
- Consequence: document quotas and operational limitations; do not upgrade plans or add paid services without a new explicit decision. Existing domain costs are outside this proposed new-infrastructure budget.

## D005 — Vercel plus Supabase

- Date: 2026-09-27
- Status: proposed
- Decision: reuse Vercel hosting; add Supabase Free for Postgres, authentication, and the data API.
- Reason: one new managed service provides most of the missing online capabilities.
- Alternative: Cloudflare Workers/D1 with an authentication layer. Consider if database inactivity pauses are unacceptable.
- Consequence: Supabase's free inactivity and backup limitations require a resume/export procedure. Keep SQL migrations and versioned exports portable.
- Evidence and limits: [architecture](architecture.md#free-tier-tradeoffs).

## D006 — Studio identity separate from Spotify

- Date: 2026-09-27
- Status: superseded by [D009](#d009--personal-google-login-and-project-ownership); originally accepted with GitHub login
- Decision: use GitHub to sign in to the Studio; connect Spotify separately for imports. The managed authentication service remains part of proposed D005.
- Reason: comments should remain editable when a Spotify session expires.
- Consequence: enforce the curator identity in database policies and server functions; other signed-in accounts receive no content permissions.

## D007 — Static public releases from database snapshots

- Date: 2026-09-27
- Status: proposed
- Decision: publish immutable database snapshots through a hosted static build; visitors read the deployed files.
- Reason: retain the existing public delivery model and keep it independent of database availability and per-visit query usage.
- Alternative: serve public content directly from the database; easier instant updates, but adds a runtime dependency and usage for every visitor.
- Consequence: implement an authenticated publish trigger, exact release binding, deployment confirmation, and rollback. The transport must be validated against free-tier capabilities before implementation is finalized.

## D008 — Small diagnostic contract

- Date: 2026-09-27
- Status: proposed
- Decision: structured console logs plus bounded private activity history; no additional logging service.
- Reason: enough evidence to diagnose import/save/publish failures with little maintenance or storage.
- Consequence: logs exclude editorial content and secrets; exports provide recoverability separately. See [logging](logging.md).

## D009 — Personal Google login and project ownership

- Date: 2026-09-27
- Status: accepted — user approved the change to personal Google login
- Decision: use the owner's personal Google account for Studio login. Connect Spotify separately for imports. Keep OAuth, hosting, and database projects personally owned and outside employer organizations.
- Supersedes: [D006](#d006--studio-identity-separate-from-spotify). Its separation between Studio identity and Spotify remains part of this decision.
- Reason: the owner uses the same GitHub handle for work and personal projects and wants personal curation access separated from work.
- Consequence: request only identity/email/basic profile scopes; show Google's account chooser; explicitly provision the authorized personal identity and enforce its stable user ID in database policies and privileged functions. Other accounts receive no editorial access. GitHub repository access grants no Studio permissions.
- Scope: login and ownership choice only. The managed auth/database service remains proposed under D005; no cloud resources have been configured.
