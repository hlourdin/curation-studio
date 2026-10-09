import { createClient } from '@supabase/supabase-js';
import { buildStaticSite } from './export-site.js';

const releaseId = process.env.RELEASE_ID;
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const missingConfiguration = [
  ['RELEASE_ID', releaseId],
  ['SUPABASE_URL', supabaseUrl],
  ['SUPABASE_SECRET_KEY_OR_SERVICE_ROLE_KEY', serviceRoleKey]
].filter(([, value]) => !value).map(([key]) => key);

if (missingConfiguration.length) {
  throw new Error(
    `RELEASE_BUILD_CONFIGURATION_MISSING:${missingConfiguration.join(',')}`
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const { data: release, error } = await supabase
  .from('releases')
  .select('id, payload, payload_sha256, status')
  .eq('id', releaseId)
  .single();

if (error || !release) {
  throw new Error(`RELEASE_NOT_FOUND:${releaseId}`);
}

const result = buildStaticSite({
  playlistsData: release.payload,
  outDir: process.env.VERCEL_OUTPUT_DIR || new URL('../dist', import.meta.url).pathname
});

console.log(
  JSON.stringify({
    event: 'release_build_succeeded',
    releaseId: release.id,
    payloadSha256: release.payload_sha256,
    playlistCount: result.slugs.length
  })
);
