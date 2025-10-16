import { createClient } from '@supabase/supabase-js';

export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Return null if environment variables are missing (for development without backend)
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase service role client not configured - admin backend features will be unavailable');
    return null as any; // Return null but typed to satisfy TypeScript
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
