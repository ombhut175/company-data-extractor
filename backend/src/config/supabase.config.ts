import { ENV } from "../common/constants/string-const";

export const supabaseConfig = {
  url: process.env[ENV.SUPABASE_URL],
  anonKey: process.env[ENV.SUPABASE_ANON_KEY],
  serviceRoleKey: process.env[ENV.SUPABASE_SERVICE_ROLE_KEY],
};
