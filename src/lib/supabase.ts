import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (process.env as any).VITE_SUPABASE_URL || 'https://stkqkozyvyvibxvobajk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (process.env as any).VITE_SUPABASE_ANON_KEY || 'sb_publishable_p_9RO5RgqSqOswKopdBpdQ_ddF4sP2e';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn('Supabase configuration is missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your secrets.');
}

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as any);

export type Tables = {
  profiles: {
    id: string;
    full_name: string;
    role: 'admin' | 'staff';
    created_at: string;
  };
  // Add other table types here as needed
};
