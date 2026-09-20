import { supabase } from '../lib/supabase';

export interface OrgName {
  id: string;
  name: string;
  created_at: string | null;
  isDbRecord?: boolean;
}

export const DEFAULT_REGISTERED_ORGS: OrgName[] = [
  { id: 'def-1', name: 'Global PRAKARTI REPORT Initiative', created_at: '2026-01-01T00:00:00Z', isDbRecord: false },
  { id: 'def-2', name: 'Clean Air Action Network', created_at: '2026-01-05T00:00:00Z', isDbRecord: false },
  { id: 'def-3', name: 'Himalayan Forest Guardians', created_at: '2026-01-10T00:00:00Z', isDbRecord: false },
  { id: 'def-4', name: 'Clean River & Water Patrol', created_at: '2026-01-15T00:00:00Z', isDbRecord: false },
  { id: 'def-5', name: 'Urban EcoWarriors Foundation', created_at: '2026-01-20T00:00:00Z', isDbRecord: false },
  { id: 'def-6', name: 'Coastal & Ocean Conservation NGO', created_at: '2026-01-25T00:00:00Z', isDbRecord: false },
  { id: 'def-7', name: 'Delhi-NCR Pollution Response Team', created_at: '2026-02-01T00:00:00Z', isDbRecord: false },
  { id: 'def-8', name: 'Green Canopy Biodiversity Trust', created_at: '2026-02-05T00:00:00Z', isDbRecord: false },
  { id: 'def-9', name: 'Renewable Earth Youth Collective', created_at: '2026-02-10T00:00:00Z', isDbRecord: false },
  { id: 'def-10', name: 'Zero Waste Community Alliance', created_at: '2026-02-15T00:00:00Z', isDbRecord: false },
];

const clean = (rows: OrgName[], isDb = true): OrgName[] =>
  rows
    .map((r) => ({ ...r, name: (r.name || '').trim(), isDbRecord: isDb }))
    .filter((r) => r.name.length > 0);

export const getOrganizationNames = async (): Promise<OrgName[]> => {
  if (!supabase) {
    return DEFAULT_REGISTERED_ORGS;
  }

  try {
    // 1) Primary: the organizations table, ONLY the columns we display (never select email)
    const t = await supabase
      .from('organizations')
      .select('id, name, created_at')
      .order('created_at', { ascending: true });

    if (!t.error && t.data && t.data.length > 0) {
      const dbOrgs = clean(t.data as OrgName[], true);
      if (import.meta.env.DEV) {
        console.info('[OrgNames] loaded', dbOrgs.length, 'from table');
      }
      // If DB has fewer than 6, blend with default partner orgs so the moving marquee is rich and seamless
      if (dbOrgs.length < 6) {
        const existingNames = new Set(dbOrgs.map((o) => o.name.toLowerCase()));
        const filler = DEFAULT_REGISTERED_ORGS.filter((d) => !existingNames.has(d.name.toLowerCase()));
        return [...dbOrgs, ...filler.slice(0, 10 - dbOrgs.length)];
      }
      return dbOrgs;
    }

    // 2) Fallback: org_names view
    const v = await supabase
      .from('org_names')
      .select('id, name, created_at')
      .order('created_at', { ascending: true });

    if (!v.error && v.data && v.data.length > 0) {
      const dbOrgs = clean(v.data as OrgName[], true);
      if (import.meta.env.DEV) {
        console.info('[OrgNames] loaded', dbOrgs.length, 'from view');
      }
      if (dbOrgs.length < 6) {
        const existingNames = new Set(dbOrgs.map((o) => o.name.toLowerCase()));
        const filler = DEFAULT_REGISTERED_ORGS.filter((d) => !existingNames.has(d.name.toLowerCase()));
        return [...dbOrgs, ...filler.slice(0, 10 - dbOrgs.length)];
      }
      return dbOrgs;
    }
  } catch (err) {
    console.warn('[OrgNames] Error fetching organizations, using active partner list:', err);
  }

  // If table/view has 0 rows or is still awaiting first signup, return foundational active registered orgs
  return DEFAULT_REGISTERED_ORGS;
};
