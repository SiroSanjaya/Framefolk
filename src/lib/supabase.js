import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const validUrl = (() => {
  try {
    const url = new URL(supabaseUrl);
    return url.protocol === "https:" || (
      url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)
    );
  } catch {
    return false;
  }
})();

export const isSupabaseConfigured = Boolean(validUrl && supabaseAnonKey);
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null;
