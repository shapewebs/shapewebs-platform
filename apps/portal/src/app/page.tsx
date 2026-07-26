import { connection } from "next/server";

export default async function PortalFoundationPage() {
  // Nonce-based CSP requires request rendering; authenticated portal pages
  // must never regress to shared static output when identity is enabled.
  await connection();

  return (
    <main>
      <h1>Shapewebs customer portal</h1>
      <p>Customer identity is not available yet.</p>
    </main>
  );
}
