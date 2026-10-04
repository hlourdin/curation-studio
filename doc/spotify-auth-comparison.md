# Spotify Authentication Comparison

Quick reference for choosing between PKCE and Authorization Code Flow for the Studio.

## TL;DR Decision

- **v2.0** : Use PKCE (like v1) for manual refresh button
- **v2.1+** : Migrate to Authorization Code Flow for automated daily cron sync

## PKCE (Proof Key for Code Exchange)

**What it is** : Browser-based OAuth flow without client secret

**How it works** :
1. User clicks "Connect Spotify" in browser
2. Spotify redirects back with authorization code
3. Browser exchanges code for access token (1 hour validity)
4. No refresh token provided
5. After expiry → user must reconnect manually

**Pros** :
- ✅ More secure (no long-lived token stored)
- ✅ Simpler implementation
- ✅ No server-side secret management
- ✅ Perfect for client-side apps

**Cons** :
- ❌ Cannot refresh automatically
- ❌ User must reconnect every hour if working continuously
- ❌ **Cron jobs cannot use it** (no way to auto-refresh)

**Use case** : Manual "Re-import" button in Studio

## Authorization Code Flow (with Refresh Token)

**What it is** : Server-based OAuth flow with long-lived refresh capability

**How it works** :
1. User clicks "Connect Spotify" in browser (one-time setup)
2. Spotify redirects back with authorization code
3. **Server** exchanges code for TWO tokens:
   - Access token (1 hour) → for API calls
   - Refresh token (indefinite) → stored securely server-side
4. When access token expires → server automatically gets new one using refresh token
5. User never needs to reconnect (unless they revoke access)

**Pros** :
- ✅ **Cron jobs can refresh automatically**
- ✅ Seamless background syncing
- ✅ User connects once, works forever
- ✅ Perfect for server-side automation

**Cons** :
- ⚠️ Requires storing refresh token securely (encrypted in DB)
- ⚠️ Needs client secret (must stay server-side)
- ⚠️ Slightly more complex implementation

**Use case** : Daily automated sync at 8am via Vercel Cron

## Token Refresh Flow (Authorization Code)

```javascript
// Initial connection (user clicks "Connect Spotify")
const initialTokens = await exchangeCodeForTokens(authCode);
// {
//   access_token: "BQD...xyz",    // Valid 1 hour
//   refresh_token: "AQC...abc",   // Valid indefinitely
//   expires_in: 3600
// }

// Store refresh token securely
await supabase.from('spotify_credentials').upsert({
  user_id: currentUserId,
  refresh_token: encrypt(initialTokens.refresh_token),
  created_at: new Date()
});

// Later: Cron runs at 8am every day
async function dailySync() {
  // 1. Get stored refresh token
  const { refresh_token } = await getStoredCredentials();
  
  // 2. Get fresh access token
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${base64(clientId + ':' + clientSecret)}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    })
  });
  
  const { access_token } = await response.json();
  // Fresh token valid for 1 hour
  
  // 3. Fetch playlists from Spotify
  const playlists = await fetchSpotifyPlaylists(access_token);
  
  // 4. Detect and merge new tracks
  await mergeNewTracks(playlists);
}
```

## Security Considerations

### PKCE
- No secrets to protect
- Token only lives in browser memory/session
- Expires after 1 hour
- Risk: low (short-lived, client-side only)

### Authorization Code Flow
- **Critical**: refresh token must be encrypted in database
- **Critical**: client secret must stay in environment variables (server-side)
- **Never** expose refresh token or client secret to browser
- Implement row-level security (RLS) on credentials table
- Consider token rotation every 30-60 days

## Implementation Plan

### Phase 1 (v2.0) - PKCE

```typescript
// src/utils/spotify.js - keep existing PKCE implementation
export async function connectSpotify() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  // Redirect to Spotify
  window.location.href = `https://accounts.spotify.com/authorize?${new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: 'playlist-read-private',
    code_challenge_method: 'S256',
    code_challenge: codeChallenge
  })}`;
}

// User clicks "Re-import" button → uses current access token
```

### Phase 2 (v2.1+) - Migration to Authorization Code Flow

```typescript
// Step 1: One-time setup - store refresh token
// api/spotify/callback.ts (new Vercel function)
export default async function handler(req, res) {
  const { code } = req.query;
  
  const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${base64(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET)}`
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI
    })
  });
  
  const tokens = await tokenResponse.json();
  
  // Store refresh token (encrypted)
  await supabase.from('spotify_credentials').upsert({
    user_id: getCurrentUserId(),
    refresh_token: encrypt(tokens.refresh_token)
  });
  
  res.redirect('/studio?connected=true');
}

// Step 2: Daily cron
// api/cron/sync-playlists.ts (new)
export default async function handler(req, res) {
  // Verify cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const accessToken = await refreshAccessToken();
  const changes = await syncAllPlaylists(accessToken);
  
  if (changes.length > 0) {
    await sendNotificationEmail(changes);
  }
  
  res.json({ synced: changes.length });
}

// Step 3: Vercel cron configuration
// vercel.json
{
  "crons": [{
    "path": "/api/cron/sync-playlists",
    "schedule": "0 8 * * *"  // 8am daily
  }]
}
```

## Database Schema Addition (v2.1+)

```sql
-- Credentials table (one row per user)
CREATE TABLE spotify_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  refresh_token TEXT NOT NULL,          -- Encrypted!
  created_at TIMESTAMP DEFAULT NOW(),
  last_refreshed_at TIMESTAMP,
  CONSTRAINT one_credential_per_user UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE spotify_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can read own credentials"
  ON spotify_credentials FOR SELECT
  USING (user_id = auth.uid());

-- Add sync metadata to playlists
ALTER TABLE playlists 
  ADD COLUMN auto_sync BOOLEAN DEFAULT false,
  ADD COLUMN last_synced_at TIMESTAMP,
  ADD COLUMN spotify_snapshot_id TEXT;  -- Spotify's version identifier

CREATE INDEX idx_playlists_auto_sync ON playlists(auto_sync) WHERE auto_sync = true;
```

## Migration Path

1. **v2.0 Launch** : Keep PKCE, manual refresh button works
2. **After stabilization** : Add Authorization Code endpoint (doesn't affect existing users)
3. **User migration** : Show banner "Enable automatic sync" → one-time reconnection
4. **Gradual rollout** : Keep manual button available as fallback
5. **Monitor** : Track sync success rate, email notifications effectiveness
6. **Full deployment** : Cron becomes primary, manual button stays for troubleshooting

## References

- [Spotify Authorization Guide](https://developer.spotify.com/documentation/web-api/concepts/authorization)
- [PKCE Flow](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)
- [Authorization Code Flow](https://developer.spotify.com/documentation/web-api/tutorials/code-flow)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
