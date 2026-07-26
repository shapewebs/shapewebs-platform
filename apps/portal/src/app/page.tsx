import { redirect } from "next/navigation";
import { connection } from "next/server";

export default async function PortalFoundationPage() {
  // Nonce-based CSP requires request rendering; authenticated portal pages
  // must never regress to shared static output when identity is enabled.
  await connection();

  redirect("/dashboard");
}
