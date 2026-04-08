import type { CookieOptions } from "@supabase/ssr";
import {
  hasSupabaseBrowserEnv,
  hasSupabaseServiceEnv,
  parseAdminEnv,
  parseServerEnv,
  parseWebEnv,
} from "@shapewebs/validation";

export type SupabaseCookie = {
  name: string;
  options?: CookieOptions;
  value: string;
};

export type SupabaseCookieAdapter = {
  getAll(): Array<{
    name: string;
    value: string;
  }>;
  setAll?(cookies: SupabaseCookie[]): void;
};

export function getWebSupabaseConfig() {
  const env = parseWebEnv();

  if (!hasSupabaseBrowserEnv(env) || !env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  return {
    supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
  };
}

export function getAdminSupabaseConfig() {
  const env = parseAdminEnv();

  if (!hasSupabaseBrowserEnv(env) || !env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  return {
    supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
  };
}

export function getServiceSupabaseConfig() {
  const env = parseServerEnv();

  if (
    !hasSupabaseServiceEnv(env) ||
    !env.NEXT_PUBLIC_SUPABASE_URL ||
    !env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    !env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return null;
  }

  return {
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
  };
}

export function hasConfiguredSupabase() {
  return getWebSupabaseConfig() !== null;
}
