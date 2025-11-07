import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // 僅在後端使用！可繞過 RLS
  { auth: { persistSession: false } }
);

export default supabase;
