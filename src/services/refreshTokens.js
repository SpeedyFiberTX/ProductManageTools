import supabase from '../db/supabase.js';
import { sha256hex } from './crypto.js';

export async function saveSingle({ user_id, token, user_agent, days = 30 }) {
  const token_hash = sha256hex(token);
  const expires_at = new Date(Date.now() + days*24*60*60*1000).toISOString();

  // 先刪掉這個使用者的所有舊 token（單一裝置策略核心）
  {
    const { error: delErr } = await supabase
      .from('refresh_tokens')
      .delete()
      .eq('user_id', user_id);
    if (delErr) throw delErr;
  }

  // 寫入新的 token
  {
    const { error: insErr } = await supabase
      .from('refresh_tokens')
      .insert({ user_id, token_hash, user_agent, expires_at });
    if (insErr) throw insErr;
  }
}

export async function isValid(token) {
  const token_hash = sha256hex(token);
  const { data, error } = await supabase
    .from('refresh_tokens')
    .select('id')
    .eq('token_hash', token_hash)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function revoke(token) {
  const token_hash = sha256hex(token);
  const { error } = await supabase
    .from('refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token_hash', token_hash);
  if (error) throw error;
}
