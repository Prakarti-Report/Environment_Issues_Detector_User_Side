import { supabase } from '../lib/supabase';

export const signIn = async (email: string) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
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
