import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY chưa được cấu hình. Các API phụ thuộc Supabase sẽ không hoạt động."
  );
}

export const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

