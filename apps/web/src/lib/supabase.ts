import { cookies } from "next/headers";
import {
  createServerSupabaseClient,
  type SupabaseCookieAdapter,
} from "@shapewebs/db";

export async function createWebCookieAdapter(): Promise<SupabaseCookieAdapter> {
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

export async function getWebServerSupabaseClient() {
  const adapter = await createWebCookieAdapter();
  return createServerSupabaseClient(adapter);
}
