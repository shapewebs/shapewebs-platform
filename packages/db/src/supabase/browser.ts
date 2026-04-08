"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../generated/database.types";

function getBrowserSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return {
    supabaseAnonKey,
    supabaseUrl,
  };
}

export function createBrowserSupabaseClient() {
  const config = getBrowserSupabaseConfig();

  if (!config) {
    return null;
  }

  return createBrowserClient<Database>(
    config.supabaseUrl,
    config.supabaseAnonKey,
  );
}
