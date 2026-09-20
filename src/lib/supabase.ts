import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/env';

const missingVars: string[] = [];
if (!SUPABASE_URL) missingVars.push('VITE_SUPABASE_URL');
if (!SUPABASE_ANON_KEY) missingVars.push('VITE_SUPABASE_ANON_KEY');

export const isSupabaseConfigured = missingVars.length === 0;

if (!isSupabaseConfigured) {
  console.error(
    `[Supabase] Missing required environment variable(s): ${missingVars.join(
      ', '
    )}. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel -> Project -> Settings -> Environment Variables, then redeploy.`
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : (null as unknown as ReturnType<typeof createClient>);
