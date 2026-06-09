import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { WIRELESS_SUPABASE_PUBLISHABLE_KEY, WIRELESS_SUPABASE_URL } from './config.js';

const SUPABASE_URL = WIRELESS_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = WIRELESS_SUPABASE_PUBLISHABLE_KEY || '';

const hasPlaceholderConfig =
  SUPABASE_URL.includes('your-project.supabase.co')
  || SUPABASE_PUBLISHABLE_KEY.includes('your-supabase-publishable-key');

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL
  && SUPABASE_PUBLISHABLE_KEY
  && !hasPlaceholderConfig,
);

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_PUBLISHABLE_KEY || 'placeholder-publishable-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  },
);
