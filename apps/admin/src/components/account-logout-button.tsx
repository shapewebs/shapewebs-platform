"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminAuthClient } from "@shapewebs/auth/client";
import { Buttons } from "@shapewebs/ui";

export function AccountLogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Buttons.Button
      kind="ghost"
      pending={isPending}
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
      Sign out
    </Buttons.Button>
  );
}
