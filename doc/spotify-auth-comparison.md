# Spotify Authentication Comparison

Reference for separating the browser connection flow from server-side token custody.

## TL;DR Decision

- **v2.0**: keep PKCE (as in v1) and the manual refresh button; the browser stores and refreshes its own tokens.
- **v2.1+**: keep PKCE as a valid connection flow, but transfer the resulting refresh token to secure server-side custody so a daily cron can run without a browser.

## PKCE (Proof Key for Code Exchange)

**What it is** : Browser-based OAuth flow without client secret

**How it works** :
1. User clicks "Connect Spotify" in browser
2. Spotify redirects back with authorization code
3. Browser exchanges the code for an access token (about one hour) and a refresh token
4. Browser renews the access token with the refresh token and `client_id`
5. Reauthorization is needed if the refresh token is absent, revoked, expired, or rejected

**Pros** :
- ✅ No client secret in the browser
- ✅ Simpler implementation
- ✅ No server-side secret management
- ✅ Perfect for client-side apps

**Cons** :
- ⚠️ v1 stores the refresh token in browser local storage
- ❌ A cron cannot use a token that exists only in a browser
- ❌ Background sync therefore needs a server-side token vault and expiry/revocation handling

**Use case** : Manual "Re-import" button in Studio

## Server-side token custody

**What it is**: secure server-side storage and refresh. The initial connection may remain PKCE or use a confidential-server Authorization Code exchange.

**How it works** :
1. User clicks "Connect Spotify"
2. Spotify returns an authorization code
3. The exchange returns an access token and refresh token
4. The refresh token is stored outside the browser, encrypted or protected by a server-side vault
5. A server job renews access as needed; reauthorization remains possible after expiry or revocation

**Pros** :
- ✅ **Cron jobs can refresh automatically**
- ✅ Seamless background syncing
- ✅ User normally reconnects only after revocation or token expiry
- ✅ Perfect for server-side automation

**Cons** :
- ⚠️ Requires storing refresh token securely (encrypted in DB)
- ⚠️ A confidential-server exchange needs a client secret; PKCE refresh can use the client ID without exposing a secret
- ⚠️ Slightly more complex implementation

**Use case** : Daily automated sync at 8am via Vercel Cron

## Token refresh flow

```javascript
// Initial connection (user clicks "Connect Spotify")
const initialTokens = await exchangeCodeForTokens(authCode);
// {
//   access_token: "BQD...xyz",    // Valid 1 hour
//   refresh_token: "AQC...abc",   // Long-lived; handle expiry/revocation
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
      // Confidential-client variant. PKCE refresh sends client_id in the body.
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

### Browser-only PKCE
- No client secret to protect
- Access and refresh tokens currently live in local storage in v1
- Access tokens expire after about one hour and are refreshed by the client
- Browser token theft remains a risk; cron execution is impossible while the token remains browser-only

### Server-side custody
- **Critical**: refresh token must be encrypted in database
- **Critical**: client secret must stay in environment variables (server-side)
- **Never** expose refresh token or client secret to browser
- Implement row-level security (RLS) on credentials table
- Handle Spotify token expiry, revocation, `invalid_grant`, and reconnection explicitly

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

### Phase 2 (v2.1+) - Add server-side token custody

```typescript
// Step 1: One-time setup - store a refresh token obtained through
// PKCE or a confidential-server Authorization Code exchange.
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
    "schedule": "0 8 * * *"  // Daily in UTC; Hobby execution may occur within the hour
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

1. **v2.0 Launch**: Keep PKCE and the manual refresh button
2. **After stabilization**: Add server-side refresh-token custody and cron endpoint
3. **User migration**: Show “Enable automatic sync” and reconnect once to place credentials server-side
4. **Gradual rollout** : Keep manual button available as fallback
5. **Monitor** : Track sync success rate, email notifications effectiveness
6. **Full deployment** : Cron becomes primary, manual button stays for troubleshooting

## References

- [Spotify Authorization Guide](https://developer.spotify.com/documentation/web-api/concepts/authorization)
- [PKCE Flow](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)
- [Authorization Code Flow](https://developer.spotify.com/documentation/web-api/tutorials/code-flow)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
