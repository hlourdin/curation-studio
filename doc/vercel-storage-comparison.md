# Vercel Storage Options Comparison (2026)

Quick guide to the role of Vercel storage in Curation Studio v2. D005 selected Supabase. “Vercel Postgres” is no longer offered to new projects; Postgres providers such as Neon are available through the Vercel Marketplace.

## 🎯 TL;DR

| Service | Type | For Curation Studio? | Why |
|---------|------|---------------------|-----|
| **Marketplace Postgres (for example Neon)** | SQL Database | ✅ Viable alternative | Database only; auth/API still required |
| **Vercel Blob** | Object storage (files) | ❌ **Wrong tool** | Not a database |
| **Vercel KV** | Key-value store | ❌ **Too simple** | No relations, no SQL |
| **Supabase** | SQL + Auth + API | ✅ **Also perfect** | All-in-one |
| **Neon direct** | SQL Database | ✅ Viable alternative | Database-only service |

## What is Vercel Blob?

**Vercel Blob = AWS S3 / Cloudflare R2 equivalent**

It's for storing **files** (not structured data):
- ✅ Images (album covers, user avatars)
- ✅ Audio files (track previews)
- ✅ PDFs, videos, documents
- ✅ Backups (JSON exports)

**NOT for:**
- ❌ Playlists metadata
- ❌ Track comments
- ❌ User data
- ❌ Relational data

### Example (what Blob is for):

```javascript
// ✅ GOOD use of Vercel Blob
import { put } from '@vercel/blob';

// Upload a playlist cover image
const blob = await put('covers/curious-xxvi.jpg', file, {
  access: 'public',
});
// Returns: https://xyz.public.blob.vercel-storage.com/covers/curious-xxvi.jpg

// Upload a JSON backup
const backup = await put('backups/2024-10-04.json', jsonData, {
  access: 'private',
});
```

### What you CANNOT do with Blob:

```javascript
// ❌ BAD - Blob has no SQL, no queries, no relations
await blob.query('SELECT * FROM playlists WHERE owner_id = ?');  // Doesn't exist!

// ❌ BAD - No structured data
await blob.insert('playlists', { name: 'CuriOus XXVI' });  // Doesn't exist!

// ❌ BAD - No filtering
const tracks = await blob.filter(track => track.comment !== null);  // Doesn't exist!
```

## Marketplace Postgres vs Vercel Blob

### Marketplace Postgres (for example Neon)

```javascript
import { neon } from '@neondatabase/serverless';

// ✅ Store structured data
const sql = neon(process.env.DATABASE_URL);
await sql`
  INSERT INTO playlists (name, owner_id, spotify_id)
  VALUES (${name}, ${userId}, ${spotifyId})
`;

// ✅ Query with relations
const result = await sql`
  SELECT 
    p.name as playlist_name,
    pi.title as track_title,
    pi.comment
  FROM playlists p
  JOIN playlist_items pi ON pi.playlist_id = p.id
  WHERE p.owner_id = ${userId}
  ORDER BY pi.position
`;

// ✅ Row-level security
// ✅ Transactions
// ✅ Indexes, constraints, triggers
```

Vercel now exposes database integrations through its Marketplace. Provisioning Neon there can inject environment variables into a Vercel project, but the database remains a Neon service.

### Vercel Blob (Object Storage)

```javascript
import { put, list } from '@vercel/blob';

// ✅ Store files
const url = await put('file.jpg', fileBuffer, { access: 'public' });

// ✅ List files
const { blobs } = await list();

// ✅ Delete files
await del(url);

// That's it! No SQL, no relations, no queries.
```

## 📊 Complete Storage Comparison

| Feature | Marketplace Neon | Vercel Blob | Supabase | Neon Direct |
|---------|----------------|-------------|----------|-------------|
| **Type** | SQL Database | File Storage | SQL + Auth + More | SQL Database |
| **Provider** | Neon (white-label) | Vercel | Supabase | Neon |
| **Structured data** | ✅ | ❌ | ✅ | ✅ |
| **Relations/Joins** | ✅ | ❌ | ✅ | ✅ |
| **SQL queries** | ✅ | ❌ | ✅ | ✅ |
| **File storage** | ❌ | ✅ | ✅ (separate) | ❌ |
| **Authentication** | ❌ | ❌ | ✅ Built-in | ❌ |
| **Auto API** | ❌ | ❌ | ✅ | ❌ |
| **Free tier DB** | Current Neon allowance | N/A | 500 MB | 1 GB/project at last verification |
| **Free tier storage** | N/A | Hobby includes limited Blob allowances; verify current quotas | 1 GB | N/A |
| **Inactivity behavior** | Neon compute scales to zero | N/A | May pause after low activity | Compute scales to zero |

## 🎯 For Your Curation Studio

### What you need to store:

**Structured data (needs SQL database):**
- ✅ Playlists (id, name, description, order, spotify_id)
- ✅ Playlist items (track metadata, position, comment)
- ✅ Releases (publication snapshots)
- ✅ Activity events (sync logs)
- ✅ User session/auth

**Files (could use Blob, but not needed initially):**
- ❌ Album covers → already URLs from Spotify
- ❌ Track previews → already URLs from Spotify/iTunes
- ❌ JSON backups → could use Blob, but download works fine

### Verdict:

```
❌ Vercel Blob = WRONG TOOL (it's for files, not data)
✅ Marketplace Postgres = viable database alternative
✅ Supabase = GOOD OPTION (Postgres + Auth + API)
✅ Neon direct = viable database alternative
```

## Vercel Marketplace and Neon

The legacy Vercel Postgres product was retired for new provisioning. A Neon integration can now be installed from the Marketplace and linked to a Vercel project.

**Differences from Neon direct:**

| Aspect | Marketplace Neon | Neon Direct |
|--------|----------------|-------------|
| **Underlying tech** | Neon | Neon |
| **Provisioning** | Installed from Vercel Marketplace | Created directly in Neon |
| **Dashboard** | Vercel integration plus provider dashboard | Neon |
| **Allowances** | Governed by the provider plan | Governed by the provider plan |
| **Branching/history** | Governed by the provider plan | Governed by the provider plan |
| **Integration** | Environment variables linked to Vercel | Standalone setup |

## Should You Use Marketplace Postgres Instead?

### Pros:
- ✅ Everything in Vercel dashboard (simpler)
- ✅ Environment variables auto-injected
- ✅ Environment variables linked to the Vercel project

### Cons:
- ⚠️ Still need separate auth (Supabase or NextAuth)

### For Your Case:

**Marketplace Neon would make sense IF:**
- You choose Neon over Supabase
- You want everything in one dashboard
- You accept a separate authentication and API layer

**But you'd still need:**
- NextAuth.js (or similar) for Google authentication
- API routes for data access
- Same complexity as "Neon direct"

**So the real choice is still:**
```
Option A: Supabase (DB + Auth + API all-in-one)
        vs
Option B: Neon through Marketplace or direct + an auth service + API routes
```

## 🎨 When You WOULD Use Vercel Blob

Later in v2.1+ or v2.2+, you might add:

### Feature: User-uploaded playlist covers

```javascript
// User uploads custom cover image
const coverBlob = await put(
  `covers/${playlistSlug}.jpg`, 
  imageFile,
  { access: 'public' }
);

// Store URL in Postgres
await sql`
  UPDATE playlists 
  SET custom_cover_url = ${coverBlob.url}
  WHERE id = ${playlistId}
`;
```

### Feature: JSON backups to cloud

```javascript
// Export backup to Blob instead of download
const backup = await put(
  `backups/${userId}/backup-${timestamp}.json`,
  JSON.stringify(playlists),
  { access: 'private' }
);

// Keep record in DB
await sql`
  INSERT INTO backups (user_id, blob_url, created_at)
  VALUES (${userId}, ${backup.url}, NOW())
`;
```

### Feature: Audio preview caching

If Spotify/iTunes URLs become unreliable, cache previews:

```javascript
// Download and re-upload to your Blob
const preview = await fetch(spotifyPreviewUrl);
const cached = await put(
  `previews/${trackId}.mp3`,
  await preview.arrayBuffer(),
  { access: 'public' }
);
```

But these are **future optimizations**, not v2.0 requirements.

## 📋 Final Recommendation

**For v2.0:**

```
Database Choice:
  ├─ Option A: Supabase (DB + Auth + API)  ← Recommended for speed
  └─ Option B: Neon + authentication + API routes

File Storage:
  └─ Nothing needed (use Spotify/iTunes URLs)

Future (v2.1+):
  └─ Add Vercel Blob if you need user uploads or backup storage
```

**Do NOT use Vercel Blob as your primary datastore.** It cannot replace a database.

## 🎯 Updated Stack Options

### Option A (Current D005): Simplest

```
Frontend:  Vercel
Database:  Supabase Postgres
Auth:      Supabase Auth
API:       Supabase Auto API
Storage:   (not needed yet)
```

### Option B: Vercel-first

```
Frontend:  Vercel
Database:  Neon through Vercel Marketplace
Auth:      NextAuth.js
API:       Vercel API routes
Storage:   (not needed yet)
```

### Option C: Best of both

```
Frontend:  Vercel
Database:  Neon (direct)
Auth:      Supabase Auth only
API:       Mix of Supabase + Vercel routes
Storage:   (not needed yet)
```

Option A is still the fastest to v2.0.

## 🔗 References

- [Vercel Marketplace Storage](https://vercel.com/marketplace?category=storage)
- [Vercel Blob Docs](https://vercel.com/docs/storage/vercel-blob)
- [Neon Vercel integration](https://vercel.com/marketplace/neon)
- [When to use Blob vs Postgres](https://vercel.com/docs/storage/vercel-blob#when-to-use-vercel-blob)
