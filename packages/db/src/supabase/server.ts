import { createServerClient } from "@supabase/ssr";
import type { Database } from "../generated/database.types";
import {
  getAdminSupabaseConfig,
  type SupabaseCookie,
  type SupabaseCookieAdapter,
} from "./shared";

export function createServerSupabaseClient(cookieAdapter: SupabaseCookieAdapter) {
  const config = getAdminSupabaseConfig();

  if (!config) {
    return null;
  }

  return createServerClient<Database>(
    config.supabaseUrl,
    config.supabaseAnonKey,
    {
      cookies: cookieAdapter.setAll
        ? {
            getAll() {
              return cookieAdapter.getAll();
            },
            setAll(cookiesToSet: SupabaseCookie[]) {
              cookieAdapter.setAll?.(cookiesToSet);
            },
          }
        : {
            getAll() {
              return cookieAdapter.getAll();
            },
          },
    },
  );
}
