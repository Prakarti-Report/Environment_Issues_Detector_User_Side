import { supabase } from '../lib/supabase';

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  gender: string;
}

export const signUp = async (p: SignUpParams) => {
  const { data, error } = await supabase.auth.signUp({
    email: p.email.trim(),
    password: p.password,
    options: {
      data: {
        full_name: p.fullName.trim(),
        gender: p.gender,
      },
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  });
  if (error) throw error;
  return data;
};

export const logIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
};

export const friendlyAuthError = (err: any): string => {
  const rawMsg = err?.message || (typeof err === 'string' ? err : '');
  const lower = rawMsg.toLowerCase();

  if (lower.includes('invalid login credentials')) {
    return 'Incorrect email or password.';
  }
  if (lower.includes('user already registered')) {
    return 'An account with this email already exists. Please log in.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email first, then log in.';
  }
  if (lower.includes('email rate limit exceeded')) {
    return 'Too many emails sent. Please wait a few minutes and try again.';
  }
  if (lower.includes('password should be at least 6 characters')) {
    return 'Password should be at least 6 characters.';
  }
  return rawMsg || 'An error occurred during authentication.';
};
