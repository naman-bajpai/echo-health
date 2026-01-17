// Supabase Client for Frontend
// Uses anon key for read operations

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Warning: Supabase environment variables not set");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
