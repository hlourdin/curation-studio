# Database Comparison: Supabase vs Neon (decision rationale)

Evaluation for Curation Studio v2. Updated 2026-10-04. D005 selected Supabase; this document preserves the rationale rather than reopening the decision. Provider limits change and must be rechecked before provisioning.

## TL;DR Comparison

| Aspect | Supabase Free | Neon Free |
|--------|---------------|-----------|
| **Database** | Postgres 15+ | Postgres 16+ (serverless) |
| **Storage** | 500 MB | 1 GB per project on the Free plan at last verification |
| **Egress** | 5 GB/month | 5 GB/month |
| **Inactivity behavior** | Project may pause after roughly one week of low database activity | Compute scales to zero after idle and wakes on demand |
| **Authentication** | ✅ Built-in (Google, etc.) | ❌ Not included |
| **Auto API** | ✅ REST; GraphQL available through an extension when enabled | ❌ Need own API layer |
| **Row-Level Security** | ✅ Native Postgres RLS | ✅ Native Postgres RLS |
| **Realtime** | ✅ Built-in subscriptions | ❌ Not included |
| **Dashboard** | ✅ Full-featured | ✅ Simple, focused |
| **Backups** | ❌ No automatic backups on Free | Short restore history on Free; verify current allowance |
| **Branching** | ❌ Not available | ✅ Git-like DB branches |
| **Compute** | Shared | Autoscaling (0.25 CU) |

## Detailed Analysis

### 🏗️ Architecture Philosophy

**Supabase = "Backend-as-a-Service"**
- All-in-one platform: DB + Auth + Storage + Realtime + Functions
- Opinionated stack that works together
- Less glue code needed
- Single dashboard for everything

**Neon = "Serverless Postgres"**
- Best-in-class Postgres, nothing else
- You bring your own auth, API, storage
- More flexibility, more assembly required
- Specialized in database performance

### ⏸️ Inactivity Behavior (Critical Difference)

**Supabase Free** ⚠️
```
After roughly one week of low database activity:
  → Project paused automatically
  → Dashboard shows "Project Paused"
  → Must click "Resume" before accessing
  → Takes ~30-60 seconds to wake up
  → Public site unaffected (static)
  → Studio unusable until resumed
```

**Impact for your usage (2-3 sessions/week):**
- ✅ Week with sessions: stays active
- ⚠️ Vacation/break >7 days: must resume manually
- ✅ Acceptable if you check dashboard before opening Studio

**Neon Free**
```
The project remains available while compute autoscales to zero:
  → First query after idle: ~100-500ms cold start
  → Subsequent queries: normal speed
  → Completely transparent (no manual resume)
  → Always accessible
```

**Impact for your usage:**
- ✅ Always accessible, even after months
- ✅ Tiny delay on first connection (not noticeable in practice)
- ✅ No dashboard babysitting

### 🔐 Authentication

**Supabase** ✅
```javascript
// Built-in Google auth (zero config)
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'https://your-studio.vercel.app/auth/callback',
    queryParams: {
      access_type: 'offline',
      prompt: 'select_account'
    }
  }
});

// Session management automatic
const session = await supabase.auth.getSession();
// RLS policies enforce user = session.user.id
```

**Pros:**
- ✅ Google OAuth configured in dashboard (2 minutes)
- ✅ Session refresh automatic
- ✅ RLS policies integrate seamlessly with auth.uid()
- ✅ No custom auth code needed

**Neon** ❌ (Auth not included)
```javascript
// Need to implement separately, options:

// Option A: NextAuth.js
import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  ],
  // Store sessions in Neon
  adapter: PostgresAdapter(neonPool)
})

// Option B: Clerk (paid after 10k MAU)
// Option C: Auth0 (complex setup)
// Option D: Roll your own (not recommended)
```

**Cons:**
- ⚠️ Additional service/code to manage
- ⚠️ More configuration steps
- ⚠️ Potential cost if using Clerk/Auth0
- ⚠️ More surface area for bugs

### 📊 Data API

**Supabase** ✅
```javascript
// Auto-generated REST/GraphQL API from tables
// No backend code needed

// Insert
const { data, error } = await supabase
  .from('playlists')
  .insert({ name: 'CuriOus XXVI', owner_id: userId })
  .select();

// Query with RLS automatic
const { data } = await supabase
  .from('playlist_items')
  .select('*, playlists(*)')
  .eq('playlist_id', playlistId);

// Realtime subscriptions
supabase
  .channel('playlist-changes')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'playlist_items' },
    (payload) => console.log('New track added:', payload)
  )
  .subscribe();
```

**Neon** ❌ (Need own API)
```javascript
// Must create Vercel API routes manually

// api/playlists.ts
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL);
  
  // Manual auth check
  const userId = await getUserFromSession(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  // Manual query
  const playlists = await sql`
    SELECT * FROM playlists 
    WHERE owner_id = ${userId}
  `;
  
  res.json(playlists);
}

// Must repeat for every endpoint
// No realtime without additional setup (Pusher, Socket.io, etc.)
```

### 💾 Backups & Recovery

**Supabase Free** ❌
- No automatic backups on free tier
- Manual export via pg_dump
- Point-in-time recovery not available
- Your responsibility: export JSON regularly

**Neon Free**
- Short restore history is available; verify the current Free-plan window before relying on it
- Branch-based recovery (copy production to test branch)
- Better experimentation ergonomics, but not a substitute for an external export

### 🌿 Database Branching (Neon exclusive)

```bash
# Create a branch from production (like Git)
neonctl branches create --parent main --name test-migration

# Test schema changes safely
psql $TEST_BRANCH_URL < migration.sql

# If good, apply to main
# If bad, delete branch
neonctl branches delete test-migration
```

**Use cases:**
- Test migrations before production
- Create staging environment instantly
- Experiment with schema changes
- Debug production issues safely

**Supabase alternative:**
- Create second free project for staging (manual)
- Or just YOLO migrations on production 😅

### 💰 Cost Projection (if you hit limits)

**Supabase Pro: $25/month**
- 8 GB database
- 50 GB egress
- Daily backups
- No pause
- Email support

**Neon paid plans**
- Usage-based pricing and allowances evolve
- Recheck storage, compute, restore history, and branch limits before any upgrade

## 🎯 Recommendation by Scenario

### Scenario A: Use Supabase if...

✅ You want the simplest, fastest v2.0 launch
✅ You value all-in-one convenience
✅ You'll open the Studio at least once per week (no pause)
✅ Manual resume after vacation is acceptable
✅ You want realtime features later
✅ You prefer less custom code

**Stack:**
```
Vercel (frontend) → Supabase (DB + Auth + API)
```

**Implementation impact:** built-in authentication and generated REST access reduce custom plumbing.

### Scenario B: Use Neon if...

✅ Inactivity pause is a dealbreaker
✅ You value database reliability over convenience
✅ You want better backup/recovery
✅ You're comfortable building auth + API layer
✅ Database branching appeals to you
✅ You may go weeks without opening Studio

**Stack:**
```
Vercel (frontend + API routes) → NextAuth.js (auth) → Neon (DB)
```

**Implementation impact:** authentication and API endpoints must be added and maintained separately.

### Scenario C: Hybrid (Future consideration)

```
Vercel → Supabase Auth → Neon DB
```

Use Supabase for auth only, Neon for database. Best of both worlds but more complexity.

## 🔍 Your Specific Context

**Current decision:** Supabase (D005)
**Reason given:** Combined auth + DB in one service

**Your usage pattern:**
- Studio sessions: 2-3x/week
- Spotify adds: daily
- Longest gap: potentially 7+ days on vacation

**Evaluation:**

| Concern | Supabase | Neon |
|---------|----------|------|
| Inactivity pause risk | ⚠️ Medium (vacation) | ✅ None |
| Auth complexity | ✅ Simple | ⚠️ More work |
| Backup safety | ⚠️ Manual export required on Free | Short restore history plus external export |
| Time to launch | ✅ Faster | ⚠️ Slower |
| Learning curve | ✅ Gentler | ⚠️ Steeper |
| Long-term flexibility | ⚠️ Locked-in | ✅ More portable |

## 🤔 Decision Framework

Ask yourself:

1. **Is 7-day inactivity pause acceptable?**
   - If NO → strongly consider Neon
   - If YES with manual resume → Supabase is fine

2. **How important is fastest v2.0 launch?**
   - If critical → Supabase (built-in auth saves days)
   - If can wait → Neon (more robust foundation)

3. **Comfortable building auth layer?**
   - If NO → Supabase
   - If YES → Neon is fine

4. **Value data safety (backups)?**
   - If HIGH → Neon (point-in-time recovery)
   - If OK with manual exports → Supabase

5. **Want to experiment with schema/data?**
   - If YES → Neon (branching is magic)
   - If NO → doesn't matter

## 📋 Migration Difficulty

If you start with Supabase and later want Neon:
- Schema migration: Easy (standard Postgres)
- Auth migration: **Hard** (different session systems)
- API migration: Medium (rewrite all queries)

If you start with Neon and later want Supabase:
- Schema migration: Easy
- Auth migration: **Hard** (already using NextAuth)
- API migration: Medium (but Supabase API is better)

**Conclusion:** Auth choice is the sticky decision. Database is easier to migrate.

## 💡 My Honest Recommendation

**For v2.0:** Start with **Supabase**
- ✅ Fastest path to working Studio
- ✅ Less code to write and maintain
- ✅ Your 2-3x/week usage keeps it active (no pause)
- ⚠️ Set calendar reminder after long breaks to check dashboard

**Operating procedure for pause concern:**
1. Bookmark Supabase dashboard
2. Accept manual resume after a long break
3. Do not rely on synthetic pings unless Supabase explicitly confirms that they count as qualifying database activity

**If pause is dealbreaker:** Start with **Neon + NextAuth**
- More initial work but rock-solid foundation
- Never worry about pauses
- Better backup story
- Worth it if you value peace of mind

**Later optimization:** Can always add Supabase Realtime to Neon (use both)

## 📚 Resources

- [Supabase Pricing](https://supabase.com/pricing)
- [Neon Pricing](https://neon.tech/pricing)
- [Supabase Inactivity Docs](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Neon Autoscaling](https://neon.tech/docs/introduction/autoscaling)
- [NextAuth.js Docs](https://next-auth.js.org/)
- [Postgres Adapter for NextAuth](https://authjs.dev/reference/adapter/pg)

## Decision

D005 accepted Supabase because this mono-user Studio benefits more from integrated Google authentication, RLS, Postgres, and the data API than from Neon’s database-only ergonomics. Revisit only if observed operational limits make the selected stack unsuitable.
