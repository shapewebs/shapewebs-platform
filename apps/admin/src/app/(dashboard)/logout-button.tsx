"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminAuthClient } from "@shapewebs/auth/client";
import { Buttons } from "@shapewebs/ui";
import styles from "./layout.module.css";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Buttons.Button
      className={styles.logoutButtonU7m3q1}
      kind="ghost"
      onClick={() => {
        startTransition(async () => {
          await adminAuthClient.signOut();

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
