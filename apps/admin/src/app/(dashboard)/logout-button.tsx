"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Buttons } from "@shapewebs/ui";
import { createBrowserSupabaseClient } from "@shapewebs/db";
import styles from "./layout.module.css";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Buttons.Button
      className={styles.logoutButtonU7m3q1}
      kind="ghost"
      onClick={() => {
        const supabase = createBrowserSupabaseClient();

        startTransition(async () => {
          if (supabase) {
            await supabase.auth.signOut();
          }

          router.replace("/login");
          router.refresh();
        });
      }}
      size="small"
      type="button"
    >
      {isPending ? "Signing out..." : "Sign out"}
    </Buttons.Button>
  );
}
