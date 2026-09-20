import { supabase } from '../lib/supabase';

export interface RegisterOrganizationParams {
  name: string;
  email: string;
  password: string;
  memberCount: number;
}

export const isOrganizationNameAvailable = async (name: string): Promise<boolean> => {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const trimmed = name.trim();
  if (!trimmed) return false;

  const { data, error } = await supabase.rpc('is_organization_name_available', {
    p_name: trimmed,
  });

  if (error) {
    console.error('[Organizations] Availability check failed:', error);
    throw error;
  }

  return Boolean(data);
};

export const registerOrganization = async (p: RegisterOrganizationParams) => {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  // Never log passwords or the full payload
  const { data, error } = await supabase.auth.signUp({
    email: p.email.trim().toLowerCase(),
    password: p.password,
    options: {
      data: {
        account_type: 'organization',
        organization_name: p.name.trim(),
        member_count: p.memberCount,
        full_name: p.name.trim(),
      },
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) throw error;
  return data;
};

export const friendlyOrgRegisterError = (err: any): string => {
  const msg = err?.message || String(err || '');

  if (msg.toLowerCase().includes('user already registered') || msg.toLowerCase().includes('already exists')) {
    return 'An account with this email already exists.';
  }
  if (
    msg.toLowerCase().includes('database error saving new user') ||
    msg.toLowerCase().includes('organization name is required') ||
    msg.toLowerCase().includes('unique constraint')
  ) {
    return 'This organization name is already registered.';
  }
  if (msg.toLowerCase().includes('rate limit')) {
    return 'Too many registration emails were sent. Please try again in a few minutes.';
  }
  if (msg.toLowerCase().includes('password should be at least')) {
    return msg;
  }

  return msg || 'Registration failed. Please try again.';
};
