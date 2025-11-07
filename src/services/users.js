import supabase from '../db/supabase.js';

export async function findByEmail(email) {
  const { data, error } = await supabase
    .from('users')
    .select('id,email,password_hash,role,is_active')
    .eq('email', email.toLowerCase())
    .limit(1).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function findById(id) {
  const { data, error } = await supabase
    .from('users').select('id,email,role,is_active').eq('id', id).limit(1).single();
  if (error) throw error;
  return data;
}
