import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

let supabaseClient: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn(
    "[supabase] NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY chưa được cấu hình."
  );
}

export const supabaseBrowser = supabaseClient;
