// Supabase Admin Client (service role)
// Used by Edge Functions for database operations
//
// Required Supabase secrets (auto-set by Supabase for hosted functions):
//   SUPABASE_URL - Your project URL
//   SUPABASE_SERVICE_ROLE_KEY - Service role key (has full DB access)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!supabaseUrl) {
  console.error("❌ SUPABASE_URL not set! This should be auto-set by Supabase.");
}
if (!supabaseServiceKey) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY not set! This should be auto-set by Supabase.");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default supabaseAdmin;
