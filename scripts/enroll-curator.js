import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const email = process.argv[2] || process.env.CURATOR_EMAIL;
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!email || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Usage: npm run curator:enroll -- owner@example.com');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

let page = 1;
let user = null;
while (!user) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
  if (error) throw error;
  user = data.users.find(candidate => candidate.email?.toLowerCase() === email.toLowerCase());
  if (user || data.users.length < 100) break;
  page += 1;
}

if (!user) {
  throw new Error('CURATOR_USER_NOT_FOUND: connectez-vous une première fois avec Google, puis relancez cette commande.');
}

const { error } = await supabase
  .from('curators')
  .upsert({ user_id: user.id, active: true });
if (error) throw error;

console.log(JSON.stringify({ enrolled: true, userId: user.id, email: user.email }));
