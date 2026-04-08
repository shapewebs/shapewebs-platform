import { createClient } from "@supabase/supabase-js";
import type { Database } from "../generated/database.types";
import { getServiceSupabaseConfig } from "./shared";

export function createAdminSupabaseClient() {
  const config = getServiceSupabaseConfig();

  if (!config) {
    return null;
  }

  return createClient<Database>(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
