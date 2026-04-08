import { cookies } from "next/headers";
import {
  createServerSupabaseClient,
  getAdminSupabaseConfig,
  type SupabaseCookieAdapter,
} from "@shapewebs/db";

export function hasAdminSupabaseConfig() {
  return getAdminSupabaseConfig() !== null;
}

export async function createAdminCookieAdapter(): Promise<SupabaseCookieAdapter> {
  const cookieStore = await cookies();

  return {
    getAll() {
      return cookieStore.getAll().map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
      }));
    },
  };
}

export async function getAdminServerSupabaseClient() {
  const adapter = await createAdminCookieAdapter();
  return createServerSupabaseClient(adapter);
}
