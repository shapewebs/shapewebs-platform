"use client";

import { createAuthClient } from "better-auth/react";
import { passkeyClient } from "@better-auth/passkey/client";
import { twoFactorClient } from "better-auth/client/plugins";

export const adminAuthClient = createAuthClient({
  plugins: [passkeyClient(), twoFactorClient()],
});
