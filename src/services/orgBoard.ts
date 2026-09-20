import { supabase } from '../lib/supabase';

export interface OrgName {
  id: string;
  name: string;
  created_at: string | null;
}

const clean = (rows: OrgName[]): OrgName[] =>
  rows
    .map((r) => ({ ...r, name: (r.name || '').trim() }))
    .filter((r) => r.name.length > 0);

export const getOrganizationNames = async (): Promise<OrgName[]> => {
  if (!supabase) {
    const error = new Error('Supabase client is not configured.');
    console.error('[OrgNames] initialization failed', { message: error.message });
    throw error;
  }

  // 1) Primary: the organizations table, ONLY the columns we display (never select email)
  const t = await supabase
    .from('organizations')
    .select('id, name, created_at')
    .order('created_at', { ascending: true });

  if (t.error) {
    console.error('[OrgNames] organizations query failed', {
      code: t.error.code,
      message: t.error.message,
      details: t.error.details,
      hint: t.error.hint,
    });
  }

  if (!t.error && t.data && t.data.length > 0) {
    if (import.meta.env.DEV) {
      console.info('[OrgNames] loaded', t.data.length, 'from table');
    }
    return clean(t.data as OrgName[]);
  }

  // 2) Fallback (RLS silently returning []): the safe view, which reads with owner rights
  const v = await supabase
    .from('org_names')
    .select('id, name, created_at')
    .order('created_at', { ascending: true });

  if (v.error) {
    console.warn('[OrgNames] org_names view unavailable', v.error.code, v.error.message);
  }

  if (!v.error && v.data && v.data.length > 0) {
    if (import.meta.env.DEV) {
      console.info('[OrgNames] loaded', v.data.length, 'from view');
    }
    return clean(v.data as OrgName[]);
  }

  if (t.error && v.error) {
    throw t.error; // both failed → real error card
  }

  return []; // both succeeded but empty → genuine empty state
};
