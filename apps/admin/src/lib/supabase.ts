import "server-only";

import { cookies } from "next/headers";
import {
  createServerSupabaseClient,
  type SupabaseCookieAdapter,
} from "@shapewebs/db";

async function createAdminCookieAdapter(): Promise<SupabaseCookieAdapter> {
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

export async function getTransitionalAdminSupabaseClient() {
  const adapter = await createAdminCookieAdapter();
  return createServerSupabaseClient(adapter);
}
