# Cutover lacurio.site → v2 (handoff)

Updated: 2026-10-09.

This page is the **repository copy** of the cutover runbook so any developer or agent can resume without Cursor Project context.

## Current status

| Step | Status |
|------|--------|
| Merge [PR #2](https://github.com/hlourdin/curation-studio/pull/2) into `master` | Done (`7da1ef4`) |
| Point `lacurio.site` / `www` to **curation-studio-v2-public** | Done (2026-10-09) |
| Set **curation-studio** (v1) production branch to `v1-freeze` | Done (2026-10-09) |

**Cutover completed 2026-10-09.** Public domains serve **curation-studio-v2-public**; legacy **curation-studio** production tracks **`v1-freeze`** (`27886ab`).

## Verify quickly

```bash
curl -sL https://lacurio.site | grep -o '<title>[^<]*</title>'
# Target: Le Son de la Curiosité · Audio Curation
# Bad:    Studio · Le Son de la Curiosité

curl -sL https://curation-studio-v2-public.vercel.app | grep -o '<title>[^<]*</title>'
# Should already match the target public title
```

## Vercel UI (team `hlo5`)

1. **curation-studio** → Settings → Domains → remove `lacurio.site` and `www.lacurio.site`.
2. **curation-studio-v2-public** → Settings → Domains → add both domains (redirect `www` to apex if offered).
3. **curation-studio** → Settings → Git → Production Branch → `v1-freeze` → save and redeploy if needed.

Dashboard links:

- [curation-studio domains](https://vercel.com/hlo5/curation-studio/settings/domains)
- [curation-studio-v2-public domains](https://vercel.com/hlo5/curation-studio-v2-public/settings/domains)
- [curation-studio git](https://vercel.com/hlo5/curation-studio/settings/git)

## Rollback (domains only)

Re-attach domains to **curation-studio**, set production branch to `v1-freeze`, redeploy. Does not revert the Git merge on `master`.

## Related docs

- [setup-v2.md](setup-v2.md) — provisioning and env vars
- v1 freeze ref: branch and tag `v1-freeze` at commit `be6c045`

After cutover, update [status.md](status.md) to record production on v2 public + frozen v1 project.
