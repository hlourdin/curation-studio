import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CURATOR_USER_ID } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !CURATOR_USER_ID) {
  throw new Error('BACKUP_CONFIGURATION_MISSING');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const { data: playlists, error } = await supabase
  .from('playlists')
  .select('*, playlist_items(*)')
  .eq('owner_id', CURATOR_USER_ID)
  .order('display_order');
if (error) throw error;

const backup = {
  schemaVersion: 1,
  exportedAt: new Date().toISOString(),
  ownerId: CURATOR_USER_ID,
  playlists
};

const outputArg = process.argv.indexOf('--output');
const output = outputArg >= 0
  ? path.resolve(process.argv[outputArg + 1])
  : path.resolve(`backup-v2-${backup.exportedAt.replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(output, JSON.stringify(backup, null, 2), { mode: 0o600 });
console.log(output);
